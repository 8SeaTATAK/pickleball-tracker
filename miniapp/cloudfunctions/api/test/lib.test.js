const test = require('node:test');
const assert = require('node:assert');
const R = require('../lib/rating');
const { rotation, roundRobin } = require('../lib/schedule');
const { aggregate } = require('../lib/stats');

const P = (id, rating, games = 0) => ({ id, rating, games });

test('期望得分率：同分 50%，高分方更高', () => {
  assert.strictEqual(R.expectedShare(3.5, 3.5), 0.5);
  const e = R.expectedShare(4.5, 3.5);
  assert.ok(e > 0.65 && e < 0.72, String(e));
});

test('同水平 11:5 胜：胜方涨分、负方等量掉分（同可靠度）', () => {
  const r = R.rateMatch({ teamA: [P('a', 3.5), P('b', 3.5)], teamB: [P('c', 3.5), P('d', 3.5)], scoreA: 11, scoreB: 5 });
  const d = Object.fromEntries(r.changes.map((c) => [c.id, c.delta]));
  assert.ok(d.a > 0 && d.b > 0);
  assert.strictEqual(d.a, -d.c);
  assert.ok(d.a < 0.2, '单场涨幅合理');
});

test('强队险胜也会掉分（看比分不看输赢）', () => {
  const r = R.rateMatch({ teamA: [P('a', 4.5, 30)], teamB: [P('b', 3.0, 30)], scoreA: 11, scoreB: 9 });
  assert.ok(r.changes[0].delta < 0);
  assert.ok(r.changes[1].delta > 0);
});

test('新球员波动大于老球员', () => {
  const r = R.rateMatch({ teamA: [P('new', 3.5, 0), P('old', 3.5, 50)], teamB: [P('c', 3.5, 10), P('d', 3.5, 10)], scoreA: 11, scoreB: 3 });
  const d = Object.fromEntries(r.changes.map((c) => [c.id, c.delta]));
  assert.ok(d.new > d.old * 3);
});

test('评分限制在 2.0–8.0，比分校验', () => {
  const r = R.rateMatch({ teamA: [P('a', 7.99)], teamB: [P('b', 2.0)], scoreA: 11, scoreB: 0 });
  assert.ok(r.changes[0].after <= 8 && r.changes[1].after >= 2);
  assert.throws(() => R.rateMatch({ teamA: [P('a', 3)], teamB: [P('b', 3)], scoreA: 5, scoreB: 5 }));
  assert.throws(() => R.rateMatch({ teamA: [P('a', 3)], teamB: [P('b', 3)], scoreA: 5.5, scoreB: 2 }));
  assert.deepStrictEqual(R.predictScore(3.5, 3.5), [11, 11]);
});

test('长期模拟：评分收敛到真实水平的排序', () => {
  const truth = { a: 5.0, b: 4.2, c: 3.6, d: 3.0, e: 2.6, f: 4.6, g: 3.3, h: 3.9 };
  const cur = Object.fromEntries(Object.keys(truth).map((k) => [k, { rating: 3.5, games: 0 }]));
  const rand = require('../lib/schedule').mulberry32(7);
  const ids = Object.keys(truth);
  for (let i = 0; i < 1500; i++) {
    const s = ids.slice().sort(() => rand() - 0.5).slice(0, 4);
    const ta = (truth[s[0]] + truth[s[1]]) / 2;
    const tb = (truth[s[2]] + truth[s[3]]) / 2;
    const p = R.expectedShare(ta, tb);
    // 逐分模拟到 11 分
    let a = 0, b = 0;
    while (a < 11 && b < 11) rand() < p ? a++ : b++;
    const res = R.rateMatch({
      teamA: [s[0], s[1]].map((id) => ({ id, ...cur[id] })),
      teamB: [s[2], s[3]].map((id) => ({ id, ...cur[id] })),
      scoreA: a,
      scoreB: b,
    });
    res.changes.forEach((c) => {
      cur[c.id].rating = c.after;
      cur[c.id].games++;
    });
  }
  const byTruth = ids.slice().sort((x, y) => truth[y] - truth[x]);
  const byRating = ids.slice().sort((x, y) => cur[y].rating - cur[x].rating);
  assert.strictEqual(byRating[0], byTruth[0]);
  assert.strictEqual(byRating[ids.length - 1], byTruth[ids.length - 1]);
  for (const id of ids) assert.ok(Math.abs(cur[id].rating - truth[id]) < 0.6, `${id} ${cur[id].rating} vs ${truth[id]}`);
});

test('轮转：8 人 2 场 7 轮，人人每轮上场，搭档不重复', () => {
  const ids = 'abcdefgh'.split('');
  const { rounds } = rotation(ids, { courts: 2, rounds: 7, seed: 1 });
  const pairs = new Set();
  for (const r of rounds) {
    assert.strictEqual(r.games.length, 2);
    assert.strictEqual(r.rest.length, 0);
    const on = r.games.flatMap((g) => [...g.teamA, ...g.teamB]);
    assert.strictEqual(new Set(on).size, 8);
    for (const g of r.games) for (const t of [g.teamA, g.teamB]) pairs.add([...t].sort().join());
  }
  assert.strictEqual(pairs.size, 28, '7 轮 28 对搭档全不相同');
});

test('轮转：10 人 2 场，上场次数差不超过 1，不会连续轮空', () => {
  const ids = Array.from({ length: 10 }, (_, i) => 'p' + i);
  const { rounds } = rotation(ids, { courts: 2, rounds: 10, seed: 3 });
  const n = Object.fromEntries(ids.map((i) => [i, 0]));
  let prevRest = new Set();
  rounds.forEach((r) => {
    r.games.forEach((g) => [...g.teamA, ...g.teamB].forEach((p) => n[p]++));
    r.rest.forEach((p) => assert.ok(!prevRest.has(p), '连续轮空 ' + p));
    prevRest = new Set(r.rest);
  });
  const v = Object.values(n);
  assert.ok(Math.max(...v) - Math.min(...v) <= 1, JSON.stringify(n));
});

test('轮转：均衡模式两队评分差更小', () => {
  const ids = 'abcdefgh'.split('');
  const ratings = { a: 5, b: 4.8, c: 4.5, d: 4, e: 3.5, f: 3, g: 2.8, h: 2.5 };
  const gap = (plan) =>
    plan.rounds.flatMap((r) => r.games).reduce((s, g) => {
      const av = (t) => (ratings[t[0]] + ratings[t[1]]) / 2;
      return s + Math.abs(av(g.teamA) - av(g.teamB));
    }, 0);
  const plain = gap(rotation(ids, { courts: 2, rounds: 4, seed: 5 }));
  const bal = gap(rotation(ids, { courts: 2, rounds: 4, seed: 5, balance: true, ratings }));
  assert.ok(bal < plain, `${bal} < ${plain}`);
});

test('轮转：单打与人数不足', () => {
  const { rounds } = rotation(['a', 'b', 'c'], { courts: 2, rounds: 3, teamSize: 1, seed: 1 });
  rounds.forEach((r) => {
    assert.strictEqual(r.games.length, 1);
    assert.strictEqual(r.rest.length, 1);
  });
  assert.throws(() => rotation(['a', 'b', 'c'], { courts: 1, rounds: 1 }));
});

test('单循环：5 队每两队恰好交手一次', () => {
  const teams = [['a1', 'a2'], ['b1', 'b2'], ['c1', 'c2'], ['d1', 'd2'], ['e1', 'e2']];
  const { rounds } = roundRobin(teams, { courts: 1 });
  const seen = new Set();
  rounds.forEach((r) => r.games.forEach((g) => seen.add([g.teamA[0], g.teamB[0]].sort().join())));
  assert.strictEqual(seen.size, 10);
  assert.strictEqual(rounds.length, 10);
});

test('积分榜：积分/胜率/净胜分', () => {
  const m = (A, B, a, b) => ({ status: 'done', teamA: A, teamB: B, scoreA: a, scoreB: b });
  const rows = aggregate([m(['x', 'y'], ['z', 'w'], 11, 4), m(['x', 'z'], ['y', 'w'], 11, 9), { status: 'pending', teamA: ['x'], teamB: ['y'] }]);
  const x = rows.find((r) => r.userId === 'x');
  assert.deepStrictEqual([x.rank, x.wins, x.score, x.diff, x.winRate], [1, 2, 6, 9, 100]);
  assert.strictEqual(rows[rows.length - 1].userId, 'w');
});

test('头像/昵称修改规则', () => {
  const { checkChange, nextChangeAt, COOLDOWN } = require('../lib/profileRules');
  const now = 1e12;
  assert.ok(checkChange({ guest: true, nickNameFirstSet: true, nickNameChangedAt: now }, 'nickName', now).allowed);
  assert.deepStrictEqual(checkChange({}, 'nickName', now), { allowed: true, data: { nickNameFirstSet: true } });
  const u = { nickNameFirstSet: true, nickNameChangedAt: now - COOLDOWN + 1 };
  assert.deepStrictEqual(checkChange(u, 'nickName', now), { allowed: false, nextAt: now + 1 });
  assert.strictEqual(nextChangeAt(u, 'nickName', now), now + 1);
  assert.ok(checkChange(u, 'nickName', now + 1).allowed, '满 30 天可改');
  assert.ok(checkChange({ ...u, premium: true }, 'nickName', now).allowed);
  const c = checkChange({ ...u, changeCredits: { nickName: 2 } }, 'nickName', now);
  assert.strictEqual(c.data['changeCredits.nickName'], 1);
  assert.ok(checkChange({ ...u, avatarFirstSet: true }, 'avatar', now).allowed, '头像单独计时');
  // 匹克球等级同样 30 天一次，首次不计
  assert.deepStrictEqual(checkChange({}, 'pbLevel', now), { allowed: true, data: { pbLevelFirstSet: true } });
  assert.strictEqual(nextChangeAt({ pbLevelFirstSet: true, pbLevelChangedAt: now - 1000 }, 'pbLevel', now), now - 1000 + COOLDOWN);
});

test('水平自测：平均分换算起始分，最高 4.0', () => {
  const ST = require('../lib/selfTest');
  const all = (v) => Array(10).fill(v);
  assert.strictEqual(ST.score(all(1)).rating, 2.5);
  assert.strictEqual(ST.score([1, 1, 1, 1, 1, 2, 2, 2, 2, 2]).rating, 2.5); // 平均 1.5
  assert.strictEqual(ST.score(all(2)).rating, 3.0);
  assert.strictEqual(ST.score(all(3)).rating, 3.5);
  assert.strictEqual(ST.score([3, 3, 3, 3, 3, 3, 3, 3, 3, 4]).rating, 3.5); // 平均 3.1
  assert.strictEqual(ST.score(all(4)).rating, 4.0);
  assert.strictEqual(ST.score(all(5)).rating, 4.0);
  assert.strictEqual(ST.score(all(5).slice(1)), null);
  assert.strictEqual(ST.score([0, 1, 1, 1, 1, 1, 1, 1, 1, 1]), null);
  assert.deepStrictEqual(ST.weakest([3, 1, 5, 1, 2, 5, 5, 5, 5, 5]), [1, 3]);
  assert.deepStrictEqual(ST.weakest(all(5)), []);
});
