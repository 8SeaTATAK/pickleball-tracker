const { getDoc, listAll, getByIds } = require('../lib/db');
const { rateMatch, validateScore, round3, MIN_RATING, MAX_RATING } = require('../lib/rating');
const { rotation, roundRobin } = require('../lib/schedule');
const { fail, getMember, isAdminRole, requireAdmin, int } = require('./common');
const { loadEvent } = require('./event');

const MODES = ['rotation', 'balanced', 'fixed', 'singles', 'singlesRR'];
const typeOf = (team) => (team.length === 1 ? 'singles' : 'doubles');
const clamp = (v) => Math.min(MAX_RATING, Math.max(MIN_RATING, v));

async function insertMatches(ctx, docs) {
  for (let i = 0; i < docs.length; i += 10) {
    await Promise.all(docs.slice(i, i + 10).map((data) => ctx.db.collection('matches').add({ data })));
  }
}

function matchDoc(ctx, ev, round, court, teamA, teamB) {
  return {
    eventId: ev._id,
    clubId: ev.clubId,
    round,
    court,
    type: typeOf(teamA),
    teamA,
    teamB,
    players: [...teamA, ...teamB],
    status: 'pending',
    createdAt: ctx.now(),
  };
}

async function generateSchedule(ctx, p) {
  const { db, _ } = ctx;
  const ev = await loadEvent(ctx, p.eventId);
  await requireAdmin(ctx, ev.clubId);
  const mode = p.mode || 'rotation';
  if (!MODES.includes(mode)) fail('invalidMode');
  const courts = int(p.courts == null ? ev.courts : p.courts, 1, 30, 'courts');
  const rounds = int(p.rounds == null ? 6 : p.rounds, 1, 30, 'rounds');

  let players = p.playerIds;
  if (!players || !players.length) {
    const s = await listAll(db.collection('signups').where({ eventId: ev._id, status: 'joined' }), 1000);
    players = s.sort((a, b) => a.createdAt - b.createdAt).map((x) => x.userId);
  }
  players = Array.from(new Set(players));
  const users = await getByIds(db, _, 'users', players);
  if (users.length !== players.length) fail('playerNotFound');

  const existing = await listAll(db.collection('matches').where({ eventId: ev._id }), 2000);
  const replace = p.replace !== false;
  if (replace) await db.collection('matches').where({ eventId: ev._id, status: 'pending' }).remove();
  const kept = replace ? existing.filter((m) => m.status === 'done') : existing;
  const startRound = kept.reduce((mx, m) => Math.max(mx, m.round), 0);

  const singles = mode === 'singles' || mode === 'singlesRR';
  const ratings = {};
  users.forEach((u) => (ratings[u._id] = (singles ? u.singles : u.doubles).rating));
  const history = kept.filter((m) => (m.type === 'singles') === singles);

  let plan;
  if (mode === 'rotation' || mode === 'balanced' || mode === 'singles') {
    plan = rotation(players, {
      courts,
      rounds,
      teamSize: singles ? 1 : 2,
      balance: mode === 'balanced',
      ratings,
      history,
      seed: p.seed,
    });
  } else if (mode === 'fixed') {
    if (players.length % 2) fail('fixedNeedsEven');
    const teams = [];
    for (let i = 0; i < players.length; i += 2) teams.push([players[i], players[i + 1]]);
    plan = roundRobin(teams, { courts });
  } else {
    plan = roundRobin(players.map((x) => [x]), { courts });
  }

  const docs = [];
  for (const r of plan.rounds) {
    for (const g of r.games) docs.push(matchDoc(ctx, ev, startRound + r.round, g.court, g.teamA, g.teamB));
  }
  await insertMatches(ctx, docs);
  if (ev.status === 'open') await db.collection('events').doc(ev._id).update({ data: { status: 'playing' } });
  return { count: docs.length, rounds: plan.rounds.length };
}

async function addMatch(ctx, { eventId, teamA, teamB, round, court }) {
  const { db, _ } = ctx;
  const ev = await loadEvent(ctx, eventId);
  await requireAdmin(ctx, ev.clubId);
  if (!Array.isArray(teamA) || !Array.isArray(teamB)) fail('selectPlayers');
  if (!(teamA.length === teamB.length && (teamA.length === 1 || teamA.length === 2))) fail('teamSize');
  const all = [...teamA, ...teamB];
  if (new Set(all).size !== all.length) fail('duplicatePlayer');
  const users = await getByIds(db, _, 'users', all);
  if (users.length !== all.length) fail('playerNotFound');

  let r = round;
  if (r == null) {
    const existing = await listAll(db.collection('matches').where({ eventId }), 2000);
    r = existing.reduce((mx, m) => Math.max(mx, m.round), 0) + 1;
  }
  const doc = matchDoc(ctx, ev, int(r, 1, 999, 'round'), int(court == null ? 1 : court, 1, 30, 'court'), teamA, teamB);
  const { _id } = await db.collection('matches').add({ data: doc });
  return { matchId: _id };
}

// 撤销一场已完赛对局对评分的影响（就地修改 users 里的评分块）
function revert(match, users) {
  const type = match.type;
  const aWon = match.scoreA > match.scoreB;
  for (const c of match.ratingChanges || []) {
    const b = users[c.id][type];
    const won = match.teamA.includes(c.id) ? aWon : !aWon;
    b.rating = round3(clamp(b.rating - c.delta));
    b.games = Math.max(0, b.games - 1);
    if (won) b.wins = Math.max(0, b.wins - 1);
    else b.losses = Math.max(0, b.losses - 1);
  }
}

async function writeUsers(t, type, users, ids) {
  for (const id of ids) {
    const b = users[id][type];
    await t.collection('users').doc(id).update({
      data: {
        [`${type}.rating`]: b.rating,
        [`${type}.games`]: b.games,
        [`${type}.wins`]: b.wins,
        [`${type}.losses`]: b.losses,
      },
    });
  }
}

async function loadForEdit(ctx, matchId) {
  const m = await getDoc(ctx.db, 'matches', matchId);
  if (!m) fail('matchNotFound');
  const me = await getMember(ctx, m.clubId);
  return { m, admin: !!me && isAdminRole(me.role) };
}

async function writeHistory(ctx, match, changes) {
  const { db } = ctx;
  await db.collection('ratingHistory').where({ matchId: match._id }).remove();
  for (const c of changes) {
    await db.collection('ratingHistory').add({
      data: {
        userId: c.id,
        matchId: match._id,
        type: match.type,
        before: c.before,
        after: c.after,
        delta: c.delta,
        at: ctx.now(),
      },
    });
  }
}

async function submitScore(ctx, { matchId, scoreA, scoreB }) {
  const { db } = ctx;
  const { m, admin } = await loadForEdit(ctx, matchId);
  if (!admin && !m.players.includes(ctx.openid)) fail('scorePermission');
  if (m.status === 'done' && !admin) fail('scoreLocked');
  const a = Number(scoreA);
  const b = Number(scoreB);
  const err = validateScore(a, b);
  if (err) fail(err);

  const result = await db.runTransaction(async (t) => {
    const cur = (await t.collection('matches').doc(matchId).get()).data;
    const users = {};
    for (const id of cur.players) users[id] = (await t.collection('users').doc(id).get()).data;
    if (cur.status === 'done') revert(cur, users);

    const side = (team) => team.map((id) => ({ id, rating: users[id][cur.type].rating, games: users[id][cur.type].games }));
    const r = rateMatch({ teamA: side(cur.teamA), teamB: side(cur.teamB), scoreA: a, scoreB: b });
    for (const c of r.changes) {
      const blk = users[c.id][cur.type];
      const won = cur.teamA.includes(c.id) ? a > b : b > a;
      blk.rating = c.after;
      blk.games += 1;
      if (won) blk.wins += 1;
      else blk.losses += 1;
    }
    await writeUsers(t, cur.type, users, cur.players);
    await t.collection('matches').doc(matchId).update({
      data: {
        scoreA: a,
        scoreB: b,
        status: 'done',
        winner: a > b ? 'A' : 'B',
        expectedA: r.expectedA,
        ratingChanges: r.changes,
        recordedBy: ctx.openid,
        playedAt: cur.playedAt || ctx.now(),
        updatedAt: ctx.now(),
      },
    });
    return r;
  });

  await writeHistory(ctx, m, result.changes);
  return { changes: result.changes, expectedA: result.expectedA };
}

async function deleteMatch(ctx, { matchId }) {
  const { db } = ctx;
  const { m, admin } = await loadForEdit(ctx, matchId);
  if (!admin) fail('needAdmin');
  if (m.status === 'done') {
    await db.runTransaction(async (t) => {
      const cur = (await t.collection('matches').doc(matchId).get()).data;
      const users = {};
      for (const id of cur.players) users[id] = (await t.collection('users').doc(id).get()).data;
      revert(cur, users);
      await writeUsers(t, cur.type, users, cur.players);
      await t.collection('matches').doc(matchId).remove();
    });
    await db.collection('ratingHistory').where({ matchId }).remove();
  } else {
    await db.collection('matches').doc(matchId).remove();
  }
  return {};
}

module.exports = { generateSchedule, addMatch, submitScore, deleteMatch, MODES };
