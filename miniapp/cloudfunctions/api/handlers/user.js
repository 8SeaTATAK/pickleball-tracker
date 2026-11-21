const { getDoc } = require('../lib/db');
const { MIN_RATING, reliability } = require('../lib/rating');
const { fail, newRatingBlock, publicUser, usersMap, str } = require('./common');

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
  return { ...publicUser(u), leveled: !!u.leveled };
}

async function updateProfile(ctx, { nickName, avatarUrl, level }) {
  const { db, openid } = ctx;
  const u = await getDoc(db, 'users', openid);
  if (!u) fail('notLoggedIn');
  const data = {};
  if (nickName != null) data.nickName = str(nickName, 20, 'nickName', true);
  if (avatarUrl != null) data.avatarUrl = str(avatarUrl, 500, 'avatar');
  if (level != null) {
    const lv = Number(level);
    if (!LEVELS.includes(lv)) fail('invalidLevel');
    if (u.doubles.games || u.singles.games) fail('levelLocked');
    data.doubles = newRatingBlock(lv);
    data.singles = newRatingBlock(lv);
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
    levels: LEVELS,
    minRating: MIN_RATING,
  };
}

module.exports = { login, updateProfile, getPlayer, LEVELS };
