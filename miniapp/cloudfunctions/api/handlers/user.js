const { getDoc, listAll, getByIds } = require('../lib/db');
const { MIN_RATING, reliability } = require('../lib/rating');
const { checkChange, nextChangeAt } = require('../lib/profileRules');
const selfTest = require('../lib/selfTest');
const { fail, newRatingBlock, publicUser, usersMap, str, checkText } = require('./common');

// 自评起始水平（参考 DUPR / USAP 自评描述），只在还没打过比赛时可设置
const LEVELS = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

// 新用户默认昵称按语言
const DEFAULT_NAME = { zh: '球友', en: 'Player ', vi: 'Người chơi ', ms: 'Pemain ' };

async function login(ctx, params = {}) {
  const { db, openid } = ctx;
  let u = await getDoc(db, 'users', openid);
  if (!u) {
    u = {
      _id: openid,
      nickName: (DEFAULT_NAME[params.lang] || DEFAULT_NAME.en) + openid.slice(-4),
      avatarUrl: '',
      guest: false,
      leveled: false,
      doubles: newRatingBlock(),
      singles: newRatingBlock(),
      createdAt: ctx.now(),
    };
    const { _id, ...data } = u;
    await db.collection('users').doc(openid).set({ data });
  }
  const now = ctx.now();
  return {
    ...publicUser(u),
    leveled: !!u.leveled,
    selfTest: u.selfTest || null,
    nextNameChangeAt: nextChangeAt(u, 'nickName', now),
    nextAvatarChangeAt: nextChangeAt(u, 'avatar', now),
  };
}

async function updateProfile(ctx, { nickName, avatarUrl, gender, level }) {
  const { db, openid } = ctx;
  const u = await getDoc(db, 'users', openid);
  if (!u) fail('notLoggedIn');
  const data = {};
  // 昵称、头像：内容有变化才算一次修改，并受 30 天规则限制
  const limited = [
    ['nickName', nickName == null ? null : str(nickName, 20, 'nickName', true), u.nickName, 'nameChangeLimit'],
    ['avatar', avatarUrl == null ? null : str(avatarUrl, 500, 'avatar'), u.avatarUrl || '', 'avatarChangeLimit'],
  ];
  for (const [field, value, current, err] of limited) {
    if (value == null || value === current) continue;
    const r = checkChange(u, field, ctx.now());
    if (!r.allowed) fail(err, { at: r.nextAt });
    Object.assign(data, r.data, { [field === 'avatar' ? 'avatarUrl' : 'nickName']: value });
  }
  if (data.nickName) await checkText(ctx, { nickName: data.nickName }, 1);
  // 头像：异步送审（结果由微信推送，违规的在后台处理），不阻塞保存
  if (data.avatarUrl && ctx.secCheckImage) ctx.secCheckImage(data.avatarUrl).catch(() => {});
  if (gender != null) {
    if (!['', 'm', 'f'].includes(gender)) fail('invalidGender');
    data.gender = gender;
  }
  if (level != null) {
    const lv = Number(level);
    if (!LEVELS.includes(lv)) fail('invalidLevel');
    if (u.doubles.games || u.singles.games) fail('levelLocked');
    data.doubles = newRatingBlock(lv);
    data.singles = newRatingBlock(lv);
    data.leveled = true;
  }
  if (Object.keys(data).length) await db.collection('users').doc(openid).update({ data });
  return login(ctx);
}

// 水平自测：结果独立保存，不改评分。apply = true 且还没打过比赛时，把结果设为起始水平。
async function saveSelfTest(ctx, { answers, apply }) {
  const { db, openid } = ctx;
  const u = await getDoc(db, 'users', openid);
  if (!u) fail('notLoggedIn');
  const ans = Array.isArray(answers) ? answers.map(Number) : null;
  const r = selfTest.score(ans);
  if (!r) fail('invalidSelfTest');
  const data = { selfTest: { answers: ans, rating: r.rating, avg: r.avg, at: ctx.now() } };
  if (apply) {
    if (u.doubles.games || u.singles.games) fail('levelLocked');
    data.doubles = newRatingBlock(r.rating);
    data.singles = newRatingBlock(r.rating);
    data.leveled = true;
  }
  await db.collection('users').doc(openid).update({ data });
  return login(ctx);
}

async function getPlayer(ctx, { userId }) {
  const { db } = ctx;
  const id = userId || ctx.openid;
  const u = await getDoc(db, 'users', id);
  if (!u) fail('playerNotFound');

  const history = (
    await db.collection('ratingHistory').where({ userId: id }).orderBy('at', 'desc').limit(60).get()
  ).data;

  const matches = (
    await db.collection('matches').where({ players: id, status: 'done' }).orderBy('playedAt', 'desc').limit(20).get()
  ).data;
  const people = await usersMap(ctx, matches.flatMap((m) => m.players));

  // 裁判场次：本人录入比分、但自己不在场上的已完赛对局
  const umpire = {};
  for (const type of ['singles', 'doubles']) {
    const all = await db.collection('matches').where({ recordedBy: id, status: 'done', type }).count();
    const own = await db.collection('matches').where({ recordedBy: id, status: 'done', type, players: id }).count();
    umpire[type] = all.total - own.total;
  }

  const block = (b) => ({
    ...b,
    reliability: Math.round(reliability(b.games) * 100),
  });

  return {
    user: { ...publicUser(u), doubles: block(u.doubles), singles: block(u.singles), leveled: !!u.leveled },
    history: history.reverse(),
    matches: matches.map((m) => ({
      _id: m._id,
      type: m.type,
      teamA: m.teamA.map((p) => people[p] || { _id: p, nickName: '?' }),
      teamB: m.teamB.map((p) => people[p] || { _id: p, nickName: '?' }),
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      playedAt: m.playedAt,
      mySide: m.teamA.includes(id) ? 'A' : 'B',
      myDelta: ((m.ratingChanges || []).find((c) => c.id === id) || {}).delta || 0,
    })),
    umpire,
    levels: LEVELS,
    minRating: MIN_RATING,
  };
}

const matchView = (m, people) => ({
  _id: m._id,
  eventId: m.eventId,
  round: m.round,
  court: m.court,
  type: m.type,
  status: m.status,
  teamA: m.teamA.map((p) => people[p] || { _id: p, nickName: '?' }),
  teamB: m.teamB.map((p) => people[p] || { _id: p, nickName: '?' }),
  scoreA: m.scoreA,
  scoreB: m.scoreB,
  playedAt: m.playedAt,
  ratingChanges: m.ratingChanges || [],
});

// 我的比赛：待打的（未结束活动里的未录分对局）+ 已完赛（分页）
async function myMatches(ctx, { skip = 0 }) {
  const { db, _, openid } = ctx;
  const page = 30;
  const done = (
    await db.collection('matches').where({ players: openid, status: 'done' }).orderBy('playedAt', 'desc').skip(Number(skip) || 0).limit(page + 1).get()
  ).data;
  let pending = [];
  if (!skip) {
    pending = (await db.collection('matches').where({ players: openid, status: 'pending' }).orderBy('createdAt', 'desc').limit(50).get()).data;
    const evs = await getByIds(db, _, 'events', pending.map((m) => m.eventId));
    const open = new Set(evs.filter((e) => e.status !== 'finished').map((e) => e._id));
    pending = pending.filter((m) => open.has(m.eventId)).sort((a, b) => a.round - b.round || a.court - b.court);
  }
  const list = done.slice(0, page);
  const people = await usersMap(ctx, [...list, ...pending].flatMap((m) => m.players));
  const events = await getByIds(db, _, 'events', [...list, ...pending].map((m) => m.eventId));
  const titles = {};
  events.forEach((e) => (titles[e._id] = { title: e.title, startTime: e.startTime }));
  const view = (m) => ({ ...matchView(m, people), event: titles[m.eventId] || null });
  return { pending: pending.map(view), done: list.map(view), hasMore: done.length > page };
}

// 我的活动：报过名（未取消）的活动，最近的在前
async function myEvents(ctx) {
  const { db, _, openid } = ctx;
  const sign = (await listAll(db.collection('signups').where({ userId: openid }), 500)).filter((s) => s.status !== 'cancelled');
  const events = await getByIds(db, _, 'events', sign.map((s) => s.eventId));
  const clubs = await getByIds(db, _, 'clubs', events.map((e) => e.clubId));
  const names = {};
  clubs.forEach((c) => (names[c._id] = c.name));
  const st = {};
  sign.forEach((s) => (st[s.eventId] = s.status));
  return events
    .map((e) => ({ ...e, clubName: names[e.clubId] || '', mySignup: st[e._id] }))
    .sort((a, b) => b.startTime - a.startTime);
}

module.exports = { login, updateProfile, saveSelfTest, getPlayer, myMatches, myEvents, LEVELS };
