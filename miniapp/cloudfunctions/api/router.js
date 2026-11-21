const { AppError } = require('./handlers/common');
const user = require('./handlers/user');
const club = require('./handlers/club');
const event = require('./handlers/event');
const match = require('./handlers/match');

const actions = {
  login: user.login,
  updateProfile: user.updateProfile,
  getPlayer: user.getPlayer,

  createClub: club.createClub,
  updateClub: club.updateClub,
  myClubs: club.myClubs,
  getClub: club.getClub,
  joinClub: club.joinClub,
  leaveClub: club.leaveClub,
  setRole: club.setRole,
  removeMember: club.removeMember,
  addGuest: club.addGuest,
  leaderboard: club.leaderboard,

  createEvent: event.createEvent,
  updateEvent: event.updateEvent,
  deleteEvent: event.deleteEvent,
  listEvents: event.listEvents,
  upcomingEvents: event.upcomingEvents,
  getEvent: event.getEvent,
  signup: event.signup,
  cancelSignup: event.cancelSignup,

  generateSchedule: match.generateSchedule,
  addMatch: match.addMatch,
  submitScore: match.submitScore,
  deleteMatch: match.deleteMatch,
};

// 返回 { ok: true, data } 或 { ok: false, error }
async function dispatch(ctx, payload) {
  const { action, ...params } = payload || {};
  const fn = actions[action];
  if (!fn) return { ok: false, error: '未知操作: ' + action };
  if (!ctx.openid) return { ok: false, error: '未登录' };
  try {
    return { ok: true, data: await fn(ctx, params) };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    // rateMatch 等纯函数抛出的普通 Error 也是用户可读的提示
    console.error(action, e);
    return { ok: false, error: e.message || '服务器错误' };
  }
}

module.exports = { dispatch, actions };
