const { getDoc, getByIds } = require('../lib/db');
const { DEFAULT_RATING } = require('../lib/rating');

// 业务错误只返回错误代码 + 参数，文案由前端按用户语言显示（miniprogram/utils/i18n.js 的 err_*）
class AppError extends Error {
  constructor(code, params) {
    super(code);
    this.params = params || {};
  }
}
const fail = (code, params) => {
  throw new AppError(code, params);
};

const newRatingBlock = (r = DEFAULT_RATING) => ({ rating: r, games: 0, wins: 0, losses: 0 });

function publicUser(u) {
  if (!u) return null;
  return {
    _id: u._id,
    nickName: u.nickName,
    avatarUrl: u.avatarUrl || '',
    gender: u.gender || '',
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
  if (!m || !isAdminRole(m.role)) fail('needAdmin');
  return m;
}

async function requireMember(ctx, clubId) {
  const m = await getMember(ctx, clubId);
  if (!m) fail('joinFirst');
  return m;
}

function str(v, max, name, required = false) {
  const s = (v == null ? '' : String(v)).trim();
  if (required && !s) fail('required', { field: name });
  if (s.length > max) fail('tooLong', { field: name, max });
  return s;
}

function int(v, lo, hi, name) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) fail('intRange', { field: name, lo, hi });
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
