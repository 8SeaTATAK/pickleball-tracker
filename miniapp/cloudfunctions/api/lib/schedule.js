// 对阵生成
//
// rotation      双打/单打轮转：上场次数尽量平均，搭档、对手尽量不重复
//               balance=true 时还会让两队评分尽量接近
// roundRobin    固定队伍（固定搭档或单打）单循环，圆桌法排轮
//
// 输出统一格式：{ rounds: [{ round, games: [{ court, teamA, teamB }], rest: [ids] }] }

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

class Tally {
  constructor() {
    this.m = new Map();
  }
  get(k) {
    return this.m.get(k) || 0;
  }
  inc(k) {
    this.m.set(k, this.get(k) + 1);
  }
}

/**
 * @param players  [id]
 * @param opts     { courts, rounds, teamSize = 2, balance = false, ratings = {id: r},
 *                   history = [{ teamA, teamB }]（本次活动已打过的对局，用于延续公平性）,
 *                   seed, tries = 400 }
 */
function rotation(players, opts) {
  const teamSize = opts.teamSize === 1 ? 1 : 2;
  const perGame = teamSize * 2;
  const courts = Math.max(1, opts.courts | 0);
  const rounds = Math.max(1, opts.rounds | 0);
  const tries = opts.tries || 400;
  const ratings = opts.ratings || {};
  const rand = mulberry32(opts.seed == null ? Date.now() : opts.seed);
  const uniq = Array.from(new Set(players));
  if (uniq.length < perGame) {
    const e = new Error('needPlayers');
    e.params = { n: perGame };
    throw e;
  }

  const played = new Map(uniq.map((p) => [p, 0]));
  const restStreak = new Map(uniq.map((p) => [p, 0]));
  const lastRested = new Map(uniq.map((p) => [p, -1]));
  const partner = new Tally();
  const opponent = new Tally();

  const record = (g) => {
    for (const t of [g.teamA, g.teamB]) {
      t.forEach((p) => played.has(p) && played.set(p, played.get(p) + 1));
      if (t.length === 2) partner.inc(key(t[0], t[1]));
    }
    for (const a of g.teamA) for (const b of g.teamB) opponent.inc(key(a, b));
  };
  (opts.history || []).forEach(record);

  const avg = (t) => t.reduce((s, p) => s + (ratings[p] || 3.5), 0) / t.length;
  const gameCost = (A, B) => {
    let c = 0;
    if (teamSize === 2) c += 10 * (partner.get(key(A[0], A[1])) + partner.get(key(B[0], B[1])));
    for (const a of A) for (const b of B) c += 3 * opponent.get(key(a, b));
    if (opts.balance) c += 40 * Math.abs(avg(A) - avg(B));
    return c;
  };
  // 4 人组的三种分队方式里取最优；单打 2 人只有一种
  const bestSplit = (g) => {
    if (teamSize === 1) return { A: [g[0]], B: [g[1]], cost: gameCost([g[0]], [g[1]]) };
    const opts3 = [
      [[g[0], g[1]], [g[2], g[3]]],
      [[g[0], g[2]], [g[1], g[3]]],
      [[g[0], g[3]], [g[1], g[2]]],
    ];
    let best = null;
    for (const [A, B] of opts3) {
      const cost = gameCost(A, B);
      if (!best || cost < best.cost) best = { A, B, cost };
    }
    return best;
  };

  const out = [];
  const nGames = Math.min(courts, Math.floor(uniq.length / perGame));
  const nPlaying = nGames * perGame;

  for (let r = 0; r < rounds; r++) {
    // 选人：上场少的优先，其次连续轮空多的、上一轮刚轮空的，最后随机
    const order = shuffle(uniq, rand).sort(
      (a, b) =>
        played.get(a) - played.get(b) ||
        restStreak.get(b) - restStreak.get(a) ||
        lastRested.get(b) - lastRested.get(a)
    );
    const playing = order.slice(0, nPlaying);
    const rest = order.slice(nPlaying);

    let best = null;
    for (let t = 0; t < tries; t++) {
      const s = shuffle(playing, rand);
      let cost = 0;
      const games = [];
      for (let i = 0; i < s.length; i += perGame) {
        const sp = bestSplit(s.slice(i, i + perGame));
        cost += sp.cost;
        games.push(sp);
      }
      if (!best || cost < best.cost) best = { cost, games };
      if (cost === 0) break;
    }

    const games = best.games.map((g, i) => ({ court: i + 1, teamA: g.A, teamB: g.B }));
    games.forEach(record);
    rest.forEach((p) => {
      restStreak.set(p, restStreak.get(p) + 1);
      lastRested.set(p, r);
    });
    playing.forEach((p) => restStreak.set(p, 0));
    out.push({ round: r + 1, games, rest });
  }
  return { rounds: out };
}

/**
 * 单循环（圆桌法）。teams: [[id] 或 [id, id]]
 * 一轮的对局数超过场地数时，顺延成多轮。
 */
function roundRobin(teams, opts = {}) {
  const courts = Math.max(1, opts.courts | 0 || 1);
  if (teams.length < 2) throw new Error('needTeams');
  const list = teams.slice();
  if (list.length % 2) list.push(null); // 轮空占位
  const n = list.length;
  const fixed = list[0];
  let rot = list.slice(1);
  const out = [];
  let roundNo = 0;

  for (let r = 0; r < n - 1; r++) {
    const ring = [fixed, ...rot];
    const games = [];
    const rest = [];
    for (let i = 0; i < n / 2; i++) {
      const A = ring[i];
      const B = ring[n - 1 - i];
      if (A && B) games.push({ teamA: A, teamB: B });
      else rest.push(...(A || B));
    }
    for (let i = 0; i < games.length; i += courts) {
      const chunk = games.slice(i, i + courts).map((g, c) => ({ court: c + 1, ...g }));
      const onCourt = new Set(chunk.flatMap((g) => [...g.teamA, ...g.teamB]));
      const waiting = teams.flat().filter((p) => !onCourt.has(p));
      out.push({ round: ++roundNo, games: chunk, rest: waiting });
    }
    rot = [rot[rot.length - 1], ...rot.slice(0, -1)];
  }
  return { rounds: out };
}

module.exports = { rotation, roundRobin, mulberry32 };
