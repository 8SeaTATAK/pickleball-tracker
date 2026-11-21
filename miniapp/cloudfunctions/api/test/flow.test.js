const test = require('node:test');
const assert = require('node:assert');
const { createMockDb } = require('./mockdb');
const { dispatch } = require('../router');

function setup() {
  const db = createMockDb();
  let t = 1_700_000_000_000;
  const as = (openid) => async (action, params = {}) => {
    t += 1000;
    const res = await dispatch({ db, _: db.command, openid, now: () => t }, { action, ...params });
    return res;
  };
  const ok = (call) => async (action, params) => {
    const res = await call(action, params);
    assert.ok(res.ok, `${action}: ${res.error}`);
    return res.data;
  };
  return { db, as, ok, advance: (ms) => (t += ms) };
}

test('完整流程：建俱乐部 → 报名 → 生成对阵 → 录分 → 积分榜 → 改分/删分回滚', async () => {
  const { db, as, ok } = setup();
  const owner = as('o_owner');
  const O = ok(owner);
  const users = ['u1', 'u2', 'u3', 'u4', 'u5'].map((id) => ({ id, call: as(id), ok: ok(as(id)) }));

  const me = await O('login');
  assert.strictEqual(me.doubles.rating, 3.5);
  await O('updateProfile', { nickName: 'Victor', level: 4.0 });
  assert.strictEqual((await O('login')).doubles.rating, 4.0);

  const { clubId } = await O('createClub', { name: '北瑞德匹克球', city: '悉尼' });
  const club = await O('getClub', { clubId });
  assert.strictEqual(club.myRole, 'owner');
  const code = club.club.inviteCode;

  for (const u of users) {
    await u.ok('login');
    const res = await u.call('createEvent', { clubId, title: 'x', startTime: 1, endTime: 2, courts: 1, capacity: 4, fee: 0 });
    assert.ok(!res.ok, '非成员不能建活动');
    await u.ok('joinClub', { inviteCode: code.toLowerCase() });
  }
  const { userId: guest } = await O('addGuest', { clubId, name: '老王', level: 3.0 });
  const c2 = await O('getClub', { clubId });
  assert.strictEqual(c2.members.length, 7);
  assert.strictEqual(c2.club.memberCount, 7);
  assert.strictEqual((await users[0].ok('getClub', { clubId })).myRole, 'member');
  assert.ok(!(await users[0].call('addGuest', { clubId, name: 'x' })).ok, '普通成员不能加临时球员');

  const start = Date.now() + 3600e3;
  const { eventId } = await O('createEvent', {
    clubId, title: '周六上午局', location: 'Ct5-6', startTime: start, endTime: start + 7200e3, courts: 1, capacity: 6, fee: 15,
  });

  assert.deepStrictEqual(await O('signup', { eventId }), { status: 'joined' });
  for (const u of users) await u.ok('signup', { eventId });
  await O('signup', { eventId, userId: guest });
  let ev = await O('getEvent', { eventId });
  assert.strictEqual(ev.joined.length, 6);
  assert.strictEqual(ev.waitlist.length, 1, '第 7 人进候补');
  assert.strictEqual(ev.waitlist[0]._id, guest);
  assert.strictEqual(ev.event.joinedCount, 6);

  // 取消后候补递补，joinedCount 不变
  await users[4].ok('cancelSignup', { eventId });
  ev = await O('getEvent', { eventId });
  assert.strictEqual(ev.joined.length, 6);
  assert.strictEqual(ev.waitlist.length, 0);
  assert.ok(ev.joined.some((p) => p._id === guest));
  assert.strictEqual(ev.event.joinedCount, 6);
  // 再报名进候补
  assert.deepStrictEqual(await users[4].ok('signup', { eventId }), { status: 'waitlist' });

  const gen = await O('generateSchedule', { eventId, mode: 'balanced', rounds: 3, seed: 42 });
  assert.strictEqual(gen.count, 3);
  ev = await O('getEvent', { eventId });
  assert.strictEqual(ev.event.status, 'playing');
  assert.strictEqual(ev.matches.length, 3);
  assert.ok(ev.matches.every((m) => m.players.length === 4 && m.status === 'pending'));

  // 重新生成会替换未完赛对局
  await O('generateSchedule', { eventId, mode: 'rotation', rounds: 4, seed: 1 });
  ev = await O('getEvent', { eventId });
  assert.strictEqual(ev.matches.length, 4);

  // 非本场球员不能录分
  const m1 = ev.matches[0];
  const outsider = users.find((u) => !m1.players.includes(u.id) && u.id !== 'u5');
  if (outsider) assert.ok(!(await outsider.call('submitScore', { matchId: m1._id, scoreA: 11, scoreB: 3 })).ok);

  // 本场球员录分
  const player = users.find((u) => m1.players.includes(u.id));
  const caller = player ? player.ok : O;
  const r1 = await caller('submitScore', { matchId: m1._id, scoreA: 11, scoreB: 3 });
  assert.strictEqual(r1.changes.length, 4);
  const winnersUp = r1.changes.filter((c) => m1.players.indexOf(c.id) < 2).every((c) => c.delta > 0);
  assert.ok(winnersUp);
  if (player) assert.ok(!(await player.call('submitScore', { matchId: m1._id, scoreA: 11, scoreB: 5 })).ok, '已录入后普通球员不能改');

  const snapshot = () => Object.fromEntries(db._dump('users').map((u) => [u._id, u.doubles]));
  const before = snapshot();

  // 管理员改分：先回滚再重算
  await O('submitScore', { matchId: m1._id, scoreA: 3, scoreB: 11 });
  const after = snapshot();
  for (const id of m1.players.slice(0, 2)) assert.ok(after[id].rating < before[id].rating);
  for (const id of m1.players) assert.strictEqual(after[id].games, 1);
  assert.strictEqual(db._dump('ratingHistory').length, 4, '改分不重复写评分记录');

  // 再录两场
  await O('submitScore', { matchId: ev.matches[1]._id, scoreA: 11, scoreB: 9 });
  await O('submitScore', { matchId: ev.matches[2]._id, scoreA: 7, scoreB: 11 });

  const board = await O('leaderboard', { clubId, period: 'all' });
  assert.ok(board.rows.length >= 4);
  assert.ok(board.rows[0].user.nickName);
  const totalGames = board.rows.reduce((s, r) => s + r.games, 0);
  assert.strictEqual(totalGames, 12);

  ev = await O('getEvent', { eventId });
  assert.strictEqual(ev.standings.reduce((s, r) => s + r.wins, 0), 6);

  // 删除已完赛对局：评分回到删除前的状态（扣掉该局影响）
  const pre = snapshot();
  const m3 = ev.matches[2];
  await O('deleteMatch', { matchId: m3._id });
  const post = snapshot();
  for (const c of m3.ratingChanges) {
    assert.ok(Math.abs(post[c.id].rating - (pre[c.id].rating - c.delta)) < 1e-9);
    assert.strictEqual(post[c.id].games, pre[c.id].games - 1);
  }
  assert.strictEqual(db._dump('ratingHistory').length, 8);

  const prof = await O('getPlayer', { userId: m1.players[0] });
  assert.ok(prof.matches.length >= 1);
  assert.ok(prof.history.length >= 1);
  assert.ok(prof.user.doubles.reliability > 0);

  // 已有比赛的人不能再改自评
  const p0 = users.find((u) => u.id === m1.players[0]);
  if (p0) assert.ok(!(await p0.call('updateProfile', { level: 5.0 })).ok);

  // 有完赛记录的活动不能删
  assert.ok(!(await owner('deleteEvent', { eventId })).ok);

  // 首页
  const up = await users[0].ok('upcomingEvents');
  assert.strictEqual(up.length, 1);
  assert.strictEqual(up[0].clubName, '北瑞德匹克球');
  assert.strictEqual((await users[0].ok('myClubs')).length, 1);

  // 手动加单打
  const single = await O('addMatch', { eventId, teamA: ['u1'], teamB: ['u2'] });
  const sr = await O('submitScore', { matchId: single.matchId, scoreA: 11, scoreB: 6 });
  assert.strictEqual(sr.changes.length, 2);
  const u1 = db._dump('users').find((u) => u._id === 'u1');
  assert.strictEqual(u1.singles.games, 1);
  assert.strictEqual(u1.singles.wins, 1);

  // 权限：设置管理员
  await O('setRole', { clubId, userId: 'u1', role: 'admin' });
  assert.ok((await users[0].call('addGuest', { clubId, name: '小李' })).ok);
  assert.ok(!(await users[0].call('setRole', { clubId, userId: 'u2', role: 'admin' })).ok);
  assert.ok(!(await owner('leaveClub', { clubId })).ok);
  await users[1].ok('leaveClub', { clubId });
  assert.strictEqual((await O('getClub', { clubId })).club.memberCount, 7);
});

test('固定搭档与单打循环、未知 action', async () => {
  const { as, ok } = setup();
  const O = ok(as('own'));
  await O('login');
  const { clubId } = await O('createClub', { name: 'C' });
  const ids = [];
  for (let i = 0; i < 6; i++) ids.push((await O('addGuest', { clubId, name: 'g' + i })).userId);
  const { eventId } = await O('createEvent', { clubId, title: 'T', startTime: 10, endTime: 20, courts: 2, capacity: 20, fee: 0 });
  for (const id of ids) await O('signup', { eventId, userId: id });

  const f = await O('generateSchedule', { eventId, mode: 'fixed' });
  assert.strictEqual(f.count, 3, '3 队单循环 3 场');
  const s = await O('generateSchedule', { eventId, mode: 'singlesRR' });
  assert.strictEqual(s.count, 15, '6 人单打循环 15 场');

  const res = await as('own')('nope');
  assert.ok(!res.ok);
  const bad = await as('own')('createEvent', { clubId, title: 'T', startTime: 20, endTime: 10, courts: 1, capacity: 4, fee: 0 });
  assert.strictEqual(bad.error, 'endBeforeStart');
  const tooLong = await as('own')('createClub', { name: 'x'.repeat(31) });
  assert.deepStrictEqual([tooLong.error, tooLong.params], ['tooLong', { field: 'clubName', max: 30 }]);
  const few = await as('own')('generateSchedule', { eventId, mode: 'rotation', playerIds: [ids[0], ids[1]] });
  assert.deepStrictEqual([few.error, few.params], ['needPlayers', { n: 4 }]);
});

test('我的页接口：性别、裁判场次、我的比赛、我的活动', async () => {
  const { as, ok } = setup();
  const O = ok(as('own'));
  await O('login');
  assert.strictEqual((await O('updateProfile', { gender: 'f' })).gender, 'f');
  assert.strictEqual((await as('own')('updateProfile', { gender: 'x' })).error, 'invalidGender');
  const { clubId } = await O('createClub', { name: 'C' });
  const ids = [];
  for (let i = 0; i < 4; i++) ids.push((await O('addGuest', { clubId, name: 'g' + i })).userId);
  const { eventId } = await O('createEvent', { clubId, title: 'T', startTime: 10, endTime: 20, courts: 1, capacity: 20, fee: 0 });
  await O('signup', { eventId });
  // 管理员不上场、只录分 → 双打裁判 1 场
  const m1 = await O('addMatch', { eventId, teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] });
  await O('submitScore', { matchId: m1.matchId, scoreA: 11, scoreB: 4 });
  // 自己上场的单打：不算裁判
  const m2 = await O('addMatch', { eventId, teamA: ['own'], teamB: [ids[0]] });
  await O('submitScore', { matchId: m2.matchId, scoreA: 11, scoreB: 7 });
  await O('addMatch', { eventId, teamA: ['own'], teamB: [ids[1]] });
  const p = await O('getPlayer', {});
  assert.deepStrictEqual(p.umpire, { singles: 0, doubles: 1 });
  const mm = await O('myMatches', {});
  assert.strictEqual(mm.done.length, 1);
  assert.strictEqual(mm.pending.length, 1);
  assert.strictEqual(mm.done[0].event.title, 'T');
  const me = await O('myEvents');
  assert.deepStrictEqual([me.length, me[0].mySignup, me[0].clubName], [1, 'joined', 'C']);
});

test('头像/昵称：首次不计、30 天一次、内容不变不算、临时球员不限', async () => {
  const { as, ok, advance, db } = setup();
  const call = as('u');
  const U = ok(call);
  await U('login');
  await U('updateProfile', { nickName: 'A', avatarUrl: 'cloud://1' }); // 首次设置，不计
  await U('updateProfile', { nickName: 'B', avatarUrl: 'cloud://2' }); // 第一次正式修改
  let me = await U('login');
  assert.ok(me.nextNameChangeAt > 0 && me.nextAvatarChangeAt > 0);
  let r = await call('updateProfile', { nickName: 'C' });
  assert.strictEqual(r.error, 'nameChangeLimit');
  assert.strictEqual(r.params.at, me.nextNameChangeAt);
  r = await call('updateProfile', { avatarUrl: 'cloud://3' });
  assert.strictEqual(r.error, 'avatarChangeLimit');
  // 内容没变、只改性别：不算修改
  await U('updateProfile', { nickName: 'B', avatarUrl: 'cloud://2', gender: 'm' });
  // 被拒时整次更新都不生效
  r = await call('updateProfile', { nickName: 'C', gender: 'f' });
  assert.strictEqual(r.error, 'nameChangeLimit');
  assert.strictEqual((await U('login')).gender, 'm');
  // 30 天后可以再改
  advance(30 * 24 * 3600 * 1000);
  me = await U('updateProfile', { nickName: 'C' });
  assert.strictEqual(me.nickName, 'C');
  assert.ok(me.nextNameChangeAt > 0);
  assert.strictEqual(me.nextAvatarChangeAt, 0, '头像单独计时，仍可修改');
  // 积分兑换的额外机会 / 付费用户
  await db.collection('users').doc('u').update({ data: { 'changeCredits.nickName': 1 } });
  me = await U('updateProfile', { nickName: 'D' });
  assert.strictEqual(me.nickName, 'D');
  assert.strictEqual((await call('updateProfile', { nickName: 'E' })).error, 'nameChangeLimit');
  await db.collection('users').doc('u').update({ data: { premium: true } });
  assert.strictEqual((await U('updateProfile', { nickName: 'E' })).nickName, 'E');
});

test('创建俱乐部上限：普通用户 1 个，VIP 3 个', async () => {
  const { as, ok, db } = setup();
  const call = as('c');
  const C = ok(call);
  await C('login');
  await C('createClub', { name: 'A' });
  let r = await call('createClub', { name: 'B' });
  assert.deepStrictEqual([r.error, r.params], ['clubLimit', { n: 1 }]);
  await db.collection('users').doc('c').update({ data: { premium: true, premiumUntil: 1_900_000_000_000 } });
  await C('createClub', { name: 'B' });
  await C('createClub', { name: 'C' });
  r = await call('createClub', { name: 'D' });
  assert.deepStrictEqual([r.error, r.params], ['clubLimit', { n: 3 }]);
  // VIP 过期后按普通用户算
  await db.collection('users').doc('c').update({ data: { premiumUntil: 1 } });
  r = await call('createClub', { name: 'E' });
  assert.deepStrictEqual(r.params, { n: 1 });
});
