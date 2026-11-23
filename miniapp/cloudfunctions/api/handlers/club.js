const { getDoc, listAll, getByIds, randomCode } = require('../lib/db');
const { aggregate } = require('../lib/stats');
const {
  fail,
  newRatingBlock,
  usersMap,
  memberId,
  getMember,
  isAdminRole,
  requireAdmin,
  str,
  int,
  checkText,
} = require('./common');

const CURRENCIES = ['A$', '¥', 'RM', 'S$', '₫', '$'];
// VIP：premium 为 true 且未过期（premiumUntil 为空表示长期有效）；
// 或者 openid 在云函数环境变量 VIP_OPENIDS（逗号分隔）里——用于创始人等永久 VIP
const vipOpenids = () => (process.env.VIP_OPENIDS || '').split(',').map((x) => x.trim()).filter(Boolean);
const isVip = (u, now) => vipOpenids().includes(u._id) || (!!u.premium && (!u.premiumUntil || u.premiumUntil > now));

const DEFAULT_SETTINGS = { winPoints: 3, lossPoints: 1, currency: 'A$' };

async function addMember(ctx, clubId, userId, role) {
  await ctx.db
    .collection('members')
    .doc(memberId(clubId, userId))
    .set({ data: { clubId, userId, role, joinedAt: ctx.now() } });
  await ctx.db.collection('clubs').doc(clubId).update({ data: { memberCount: ctx._.inc(1) } });
}

async function createClub(ctx, { name, intro, city }) {
  const { db } = ctx;
  const data = {
    name: str(name, 30, 'clubName', true),
    intro: str(intro, 300, 'intro'),
    city: str(city, 20, 'city'),
    ownerId: ctx.openid,
    inviteCode: randomCode(),
    memberCount: 0,
    settings: { ...DEFAULT_SETTINGS },
    createdAt: ctx.now(),
  };
  await checkText(ctx, { clubName: data.name, intro: data.intro, city: data.city });
  // 先校验填写内容，再查数量上限：普通用户 1 个，VIP 3 个（见 PRODUCT_RULES.md）
  const me = await getDoc(db, 'users', ctx.openid);
  const limit = me && isVip(me, ctx.now()) ? 3 : 1;
  const owned = await db.collection('clubs').where({ ownerId: ctx.openid }).count();
  if (owned.total >= limit) fail('clubLimit', { n: limit });
  const { _id } = await db.collection('clubs').add({ data });
  await addMember(ctx, _id, ctx.openid, 'owner');
  return { clubId: _id };
}

async function updateClub(ctx, { clubId, name, intro, city, winPoints, lossPoints, currency }) {
  await requireAdmin(ctx, clubId);
  const data = {};
  if (name != null) data.name = str(name, 30, 'clubName', true);
  if (intro != null) data.intro = str(intro, 300, 'intro');
  if (city != null) data.city = str(city, 20, 'city');
  if (winPoints != null) data['settings.winPoints'] = int(winPoints, 0, 10, 'winPoints');
  if (lossPoints != null) data['settings.lossPoints'] = int(lossPoints, 0, 10, 'lossPoints');
  if (currency != null) {
    if (!CURRENCIES.includes(currency)) fail('invalidCurrency');
    data['settings.currency'] = currency;
  }
  await checkText(ctx, { clubName: data.name, intro: data.intro, city: data.city });
  await ctx.db.collection('clubs').doc(clubId).update({ data });
  return {};
}

async function myClubs(ctx) {
  const { db, _ } = ctx;
  const mine = await listAll(db.collection('members').where({ userId: ctx.openid }), 200);
  const clubs = await getByIds(db, _, 'clubs', mine.map((m) => m.clubId));
  const role = {};
  mine.forEach((m) => (role[m.clubId] = m.role));
  return clubs
    .map((c) => ({ _id: c._id, name: c.name, city: c.city, memberCount: c.memberCount, myRole: role[c._id] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function getClub(ctx, { clubId, inviteCode }) {
  const { db } = ctx;
  let club = clubId ? await getDoc(db, 'clubs', clubId) : null;
  if (!club && inviteCode) {
    const res = await db.collection('clubs').where({ inviteCode: String(inviteCode).toUpperCase() }).limit(1).get();
    club = res.data[0] || null;
  }
  if (!club) fail('clubNotFound');

  const me = await getMember(ctx, club._id);
  const members = await listAll(db.collection('members').where({ clubId: club._id }), 2000);
  const people = await usersMap(ctx, members.map((m) => m.userId));
  const order = { owner: 0, admin: 1, member: 2 };
  const list = members
    .map((m) => ({ ...(people[m.userId] || { _id: m.userId, nickName: '?' }), role: m.role, joinedAt: m.joinedAt }))
    .sort((a, b) => order[a.role] - order[b.role] || (b.doubles ? b.doubles.rating : 0) - (a.doubles ? a.doubles.rating : 0));

  return {
    club: {
      ...club,
      // 非成员看不到邀请码
      inviteCode: me ? club.inviteCode : undefined,
    },
    myRole: me ? me.role : null,
    members: list,
  };
}

async function joinClub(ctx, { clubId, inviteCode }) {
  const { db } = ctx;
  let club = null;
  if (inviteCode) {
    const res = await db.collection('clubs').where({ inviteCode: String(inviteCode).trim().toUpperCase() }).limit(1).get();
    club = res.data[0] || null;
    if (!club) fail('badInviteCode');
  } else {
    club = await getDoc(db, 'clubs', clubId);
    if (!club) fail('clubNotFound');
  }
  if (!(await getMember(ctx, club._id))) await addMember(ctx, club._id, ctx.openid, 'member');
  return { clubId: club._id };
}

async function leaveClub(ctx, { clubId }) {
  const m = await getMember(ctx, clubId);
  if (!m) return {};
  if (m.role === 'owner') fail('ownerCannotLeave');
  await ctx.db.collection('members').doc(memberId(clubId, ctx.openid)).remove();
  await ctx.db.collection('clubs').doc(clubId).update({ data: { memberCount: ctx._.inc(-1) } });
  return {};
}

async function setRole(ctx, { clubId, userId, role }) {
  const me = await getMember(ctx, clubId);
  if (!me || me.role !== 'owner') fail('ownerOnly');
  if (!['admin', 'member'].includes(role)) fail('invalidRole');
  const m = await getMember(ctx, clubId, userId);
  if (!m || m.role === 'owner') fail('cannotModifyMember');
  await ctx.db.collection('members').doc(memberId(clubId, userId)).update({ data: { role } });
  return {};
}

async function removeMember(ctx, { clubId, userId }) {
  const me = await requireAdmin(ctx, clubId);
  const m = await getMember(ctx, clubId, userId);
  if (!m) return {};
  if (m.role === 'owner' || (m.role === 'admin' && me.role !== 'owner')) fail('cannotRemoveMember');
  await ctx.db.collection('members').doc(memberId(clubId, userId)).remove();
  await ctx.db.collection('clubs').doc(clubId).update({ data: { memberCount: ctx._.inc(-1) } });
  return {};
}

// 临时球员：没有微信/不用小程序的球友，由管理员代为登记，同样计分和评分
async function addGuest(ctx, { clubId, name, level }) {
  await requireAdmin(ctx, clubId);
  const lv = level == null ? undefined : Number(level);
  const id = 'guest_' + randomCode(10).toLowerCase();
  const nickName = str(name, 20, 'name', true);
  await checkText(ctx, { name: nickName }, 1);
  await ctx.db.collection('users').doc(id).set({
    data: {
      nickName,
      avatarUrl: '',
      guest: true,
      createdBy: ctx.openid,
      leveled: lv != null,
      doubles: newRatingBlock(lv),
      singles: newRatingBlock(lv),
      createdAt: ctx.now(),
    },
  });
  await addMember(ctx, clubId, id, 'member');
  return { userId: id };
}

const DAY = 24 * 3600 * 1000;

async function leaderboard(ctx, { clubId, period = 'all' }) {
  const { db, _ } = ctx;
  const club = await getDoc(db, 'clubs', clubId);
  if (!club) fail('clubNotFound');
  const where = { clubId, status: 'done' };
  const now = ctx.now();
  if (period === 'week') where.playedAt = _.gte(now - 7 * DAY);
  else if (period === 'month') where.playedAt = _.gte(now - 30 * DAY);
  const matches = await listAll(db.collection('matches').where(where), 10000);
  const rows = aggregate(matches, club.settings);
  const people = await usersMap(ctx, rows.map((r) => r.userId));
  return {
    settings: club.settings,
    rows: rows.map((r) => ({ ...r, user: people[r.userId] || { _id: r.userId, nickName: '?' } })),
  };
}

module.exports = {
  createClub,
  updateClub,
  myClubs,
  getClub,
  joinClub,
  leaveClub,
  setRole,
  removeMember,
  addGuest,
  leaderboard,
  isAdminRole,
  CURRENCIES,
  isVip,
};
