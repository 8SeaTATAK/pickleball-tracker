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

// 返回 { ok: true, data } 或 { ok: false, error: 错误代码, params }
async function dispatch(ctx, payload) {
  const { action, ...params } = payload || {};
  const fn = actions[action];
  if (!fn) return { ok: false, error: 'unknownAction', params: { action } };
  if (!ctx.openid) return { ok: false, error: 'notLoggedIn' };
  try {
    return { ok: true, data: await fn(ctx, params) };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message, params: e.params };
    // rateMatch / rotation 抛出的 Error 的 message 也是错误代码；数据库等意外错误原样返回
    console.error(action, e);
    return { ok: false, error: e.message || 'serverError', params: e.params || {} };
  }
}

module.exports = { dispatch, actions };
