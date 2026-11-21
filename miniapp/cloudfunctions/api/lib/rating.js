// 模拟 DUPR 评分算法
//
// DUPR 的公开原则：评分区间 2.000–8.000；看的是比分而不只是输赢；
// 双打按队伍平均分计算；新球员评分波动大、老球员稳定（可靠度）。
// 具体公式 DUPR 未公开，这里用一套 Elo 式的近似实现：
//
//   期望得分率  E = 1 / (1 + 10^(-(Ra - Rb) / SCALE))
//   实际得分率  A = 本队得分 / 总得分
//   评分变化    Δ = K(可靠度) × W(局长) × (A − E)
//
// 也就是说：强队赢得不够多也可能掉分，弱队输得够少也可能涨分。

const MIN_RATING = 2.0;
const MAX_RATING = 8.0;
const DEFAULT_RATING = 3.5;
const SCALE = 2.8; // 差 1.0 分 → 期望得分率约 69%（约 11:5）
const K_MAX = 0.5; // 新球员
const K_MIN = 0.12; // 可靠度 100% 的球员
const RELIABLE_GAMES = 20; // 打满多少场可靠度到 100%

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round3 = (v) => Math.round(v * 1000) / 1000;

function expectedShare(ra, rb) {
  return 1 / (1 + Math.pow(10, -(ra - rb) / SCALE));
}

function reliability(games) {
  return clamp((games || 0) / RELIABLE_GAMES, 0, 1);
}

function kFactor(games) {
  return K_MAX - (K_MAX - K_MIN) * reliability(games);
}

// 打到 11 分的一局 ≈ 1；15/21 分局信息量更大，短局更小
function gameWeight(scoreA, scoreB) {
  return clamp((scoreA + scoreB) / 18, 0.5, 1.25);
}

function teamRating(players) {
  return players.reduce((s, p) => s + p.rating, 0) / players.length;
}

function validateScore(scoreA, scoreB) {
  const ok = (n) => Number.isInteger(n) && n >= 0 && n <= 99;
  if (!ok(scoreA) || !ok(scoreB)) return '比分须为 0–99 的整数';
  if (scoreA === scoreB) return '比分不能打平';
  return null;
}

/**
 * @param teamA/teamB  [{ id, rating, games }]（单打 1 人，双打 2 人）
 * @returns { expectedA, actualA, changes: [{ id, before, after, delta }] }
 */
function rateMatch({ teamA, teamB, scoreA, scoreB }) {
  const err = validateScore(scoreA, scoreB);
  if (err) throw new Error(err);
  if (!teamA.length || teamA.length !== teamB.length) throw new Error('双方人数不一致');

  const ra = teamRating(teamA);
  const rb = teamRating(teamB);
  const expectedA = expectedShare(ra, rb);
  const actualA = scoreA / (scoreA + scoreB);
  const w = gameWeight(scoreA, scoreB);

  const change = (p, diff) => {
    const before = p.rating;
    const after = round3(clamp(before + kFactor(p.games) * w * diff, MIN_RATING, MAX_RATING));
    return { id: p.id, before, after, delta: round3(after - before) };
  };

  return {
    expectedA: round3(expectedA),
    actualA: round3(actualA),
    changes: [
      ...teamA.map((p) => change(p, actualA - expectedA)),
      ...teamB.map((p) => change(p, expectedA - actualA)),
    ],
  };
}

// 预测：给定双方评分，期望 11 分制比分（用于对阵预览）
function predictScore(ra, rb, target = 11) {
  const e = expectedShare(ra, rb);
  if (e >= 0.5) return [target, Math.round((target * (1 - e)) / e)];
  return [Math.round((target * e) / (1 - e)), target];
}

module.exports = {
  MIN_RATING,
  MAX_RATING,
  DEFAULT_RATING,
  RELIABLE_GAMES,
  expectedShare,
  reliability,
  kFactor,
  gameWeight,
  validateScore,
  rateMatch,
  predictScore,
  round3,
};
