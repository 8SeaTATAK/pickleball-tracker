const { getDoc, listAll, getByIds } = require('../lib/db');
const { aggregate } = require('../lib/stats');
const { fail, usersMap, getMember, isAdminRole, requireAdmin, requireMember, str, int } = require('./common');

const signupId = (eventId, userId) => `${eventId}_${userId}`;

async function loadEvent(ctx, eventId) {
  const ev = await getDoc(ctx.db, 'events', eventId);
  if (!ev) fail('eventNotFound');
  return ev;
}

function eventFields(p, partial) {
  const d = {};
  const has = (k) => !partial || p[k] != null;
  if (has('title')) d.title = str(p.title, 40, 'title', true);
  if (has('location')) d.location = str(p.location, 60, 'location');
  if (has('note')) d.note = str(p.note, 500, 'note');
  if (has('startTime')) d.startTime = int(p.startTime, 0, 4102444800000, 'startTime');
  if (has('endTime')) d.endTime = int(p.endTime, 0, 4102444800000, 'endTime');
  if (has('courts')) d.courts = int(p.courts, 1, 30, 'courts');
  if (has('capacity')) d.capacity = int(p.capacity, 2, 200, 'capacity');
  if (has('fee')) d.fee = int(p.fee, 0, 100000, 'fee');
  if (d.startTime != null && d.endTime != null && d.endTime <= d.startTime) fail('endBeforeStart');
  return d;
}

async function createEvent(ctx, p) {
  await requireAdmin(ctx, p.clubId);
  const data = {
    clubId: p.clubId,
    ...eventFields(p, false),
    status: 'open', // open 报名中 → playing 进行中 → finished 已结束
    creatorId: ctx.openid,
    joinedCount: 0,
    createdAt: ctx.now(),
  };
  const { _id } = await ctx.db.collection('events').add({ data });
  return { eventId: _id };
}

async function updateEvent(ctx, p) {
  const ev = await loadEvent(ctx, p.eventId);
  await requireAdmin(ctx, ev.clubId);
  const data = eventFields(p, true);
  if (p.status != null) {
    if (!['open', 'playing', 'finished'].includes(p.status)) fail('invalidStatus');
    data.status = p.status;
  }
  const start = data.startTime != null ? data.startTime : ev.startTime;
  const end = data.endTime != null ? data.endTime : ev.endTime;
  if (end <= start) fail('endBeforeStart');
  await ctx.db.collection('events').doc(ev._id).update({ data });
  return {};
}

async function deleteEvent(ctx, { eventId }) {
  const { db } = ctx;
  const ev = await loadEvent(ctx, eventId);
  await requireAdmin(ctx, ev.clubId);
  const done = await db.collection('matches').where({ eventId, status: 'done' }).count();
  if (done.total) fail('eventHasResults');
  await db.collection('matches').where({ eventId }).remove();
  await db.collection('signups').where({ eventId }).remove();
  await db.collection('events').doc(eventId).remove();
  return {};
}

async function listEvents(ctx, { clubId, limit = 30 }) {
  const res = await ctx.db
    .collection('events')
    .where({ clubId })
    .orderBy('startTime', 'desc')
    .limit(Math.min(100, limit))
    .get();
  return res.data;
}

// 首页：我所在俱乐部即将开始/进行中的活动
async function upcomingEvents(ctx) {
  const { db, _ } = ctx;
  const mine = await listAll(db.collection('members').where({ userId: ctx.openid }), 200);
  if (!mine.length) return [];
  const clubIds = mine.map((m) => m.clubId);
  const res = await db
    .collection('events')
    .where({ clubId: _.in(clubIds.slice(0, 100)), endTime: _.gte(ctx.now() - 6 * 3600 * 1000) })
    .orderBy('startTime', 'asc')
    .limit(20)
    .get();
  const clubs = await getByIds(db, _, 'clubs', res.data.map((e) => e.clubId));
  const names = {};
  clubs.forEach((c) => (names[c._id] = c.name));
  const signed = await getByIds(db, _, 'signups', res.data.map((e) => signupId(e._id, ctx.openid)));
  const st = {};
  signed.forEach((s) => (st[s.eventId] = s.status));
  return res.data.map((e) => ({ ...e, clubName: names[e.clubId] || '', mySignup: st[e._id] || null }));
}

async function getEvent(ctx, { eventId }) {
  const { db } = ctx;
  const ev = await loadEvent(ctx, eventId);
  const [club, me] = await Promise.all([getDoc(db, 'clubs', ev.clubId), getMember(ctx, ev.clubId)]);
  const signups = (await listAll(db.collection('signups').where({ eventId }), 1000))
    .filter((s) => s.status !== 'cancelled')
    .sort((a, b) => a.createdAt - b.createdAt);
  const matches = (await listAll(db.collection('matches').where({ eventId }), 2000)).sort(
    (a, b) => a.round - b.round || a.court - b.court
  );
  const people = await usersMap(ctx, [...signups.map((s) => s.userId), ...matches.flatMap((m) => m.players)]);
  const who = (id) => people[id] || { _id: id, nickName: '?' };

  return {
    event: ev,
    club: club && { _id: club._id, name: club.name, settings: club.settings },
    myRole: me ? me.role : null,
    isAdmin: !!me && isAdminRole(me.role),
    mySignup: (signups.find((s) => s.userId === ctx.openid) || {}).status || null,
    joined: signups.filter((s) => s.status === 'joined').map((s) => who(s.userId)),
    waitlist: signups.filter((s) => s.status === 'waitlist').map((s) => who(s.userId)),
    matches: matches.map((m) => ({ ...m, teamA: m.teamA.map(who), teamB: m.teamB.map(who) })),
    standings: aggregate(matches, club && club.settings).map((r) => ({ ...r, user: who(r.userId) })),
  };
}

async function signup(ctx, { eventId, userId }) {
  const { db } = ctx;
  const ev = await loadEvent(ctx, eventId);
  if (ev.status === 'finished') fail('eventFinished');
  const target = userId || ctx.openid;
  if (target !== ctx.openid) await requireAdmin(ctx, ev.clubId);
  else await requireMember(ctx, ev.clubId);
  if (!(await getMember(ctx, ev.clubId, target))) fail('notClubMember');

  const id = signupId(eventId, target);
  const existing = await getDoc(db, 'signups', id);
  if (existing && existing.status !== 'cancelled') return { status: existing.status };

  // 用事务保证不超员
  const status = await db.runTransaction(async (t) => {
    const cur = (await t.collection('events').doc(eventId).get()).data;
    const full = (cur.joinedCount || 0) >= cur.capacity;
    const s = full ? 'waitlist' : 'joined';
    await t.collection('signups').doc(id).set({
      data: { eventId, clubId: ev.clubId, userId: target, status: s, createdAt: ctx.now(), by: ctx.openid },
    });
    if (!full) await t.collection('events').doc(eventId).update({ data: { joinedCount: ctx._.inc(1) } });
    return s;
  });
  return { status };
}

async function cancelSignup(ctx, { eventId, userId }) {
  const { db } = ctx;
  const ev = await loadEvent(ctx, eventId);
  const target = userId || ctx.openid;
  if (target !== ctx.openid) await requireAdmin(ctx, ev.clubId);
  const id = signupId(eventId, target);
  const s = await getDoc(db, 'signups', id);
  if (!s || s.status === 'cancelled') return {};

  await db.collection('signups').doc(id).update({ data: { status: 'cancelled', cancelledAt: ctx.now() } });
  if (s.status === 'joined') {
    // 候补递补
    const next = (
      await db.collection('signups').where({ eventId, status: 'waitlist' }).orderBy('createdAt', 'asc').limit(1).get()
    ).data[0];
    if (next) {
      await db.collection('signups').doc(next._id).update({ data: { status: 'joined', promotedAt: ctx.now() } });
    } else {
      await db.collection('events').doc(eventId).update({ data: { joinedCount: ctx._.inc(-1) } });
    }
  }
  return {};
}

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent,
  listEvents,
  upcomingEvents,
  getEvent,
  signup,
  cancelSignup,
  loadEvent,
};
