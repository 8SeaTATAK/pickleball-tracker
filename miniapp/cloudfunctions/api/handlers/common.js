const { getDoc, getByIds } = require('../lib/db');
const { DEFAULT_RATING } = require('../lib/rating');

class AppError extends Error {}
const fail = (msg) => {
  throw new AppError(msg);
};

const newRatingBlock = (r = DEFAULT_RATING) => ({ rating: r, games: 0, wins: 0, losses: 0 });

function publicUser(u) {
  if (!u) return null;
  return {
    _id: u._id,
    nickName: u.nickName,
    avatarUrl: u.avatarUrl || '',
    guest: !!u.guest,
    doubles: u.doubles,
    singles: u.singles,
  };
}

async function usersMap(ctx, ids) {
  const list = await getByIds(ctx.db, ctx._, 'users', ids);
  const map = {};
  list.forEach((u) => (map[u._id] = publicUser(u)));
  return map;
}

const memberId = (clubId, userId) => `${clubId}_${userId}`;

async function getMember(ctx, clubId, userId) {
  return getDoc(ctx.db, 'members', memberId(clubId, userId || ctx.openid));
}

const isAdminRole = (role) => role === 'owner' || role === 'admin';

async function requireAdmin(ctx, clubId) {
  const m = await getMember(ctx, clubId);
  if (!m || !isAdminRole(m.role)) fail('需要俱乐部管理员权限');
  return m;
}

async function requireMember(ctx, clubId) {
  const m = await getMember(ctx, clubId);
  if (!m) fail('请先加入俱乐部');
  return m;
}

function str(v, max, name, required = false) {
  const s = (v == null ? '' : String(v)).trim();
  if (required && !s) fail(`请填写${name}`);
  if (s.length > max) fail(`${name}最多 ${max} 个字`);
  return s;
}

function int(v, lo, hi, name) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) fail(`${name}须为 ${lo}–${hi} 的整数`);
  return n;
}

module.exports = {
  AppError,
  fail,
  newRatingBlock,
  publicUser,
  usersMap,
  memberId,
  getMember,
  isAdminRole,
  requireAdmin,
  requireMember,
  str,
  int,
};
