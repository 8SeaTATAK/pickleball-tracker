// 与 cloudfunctions/api/lib/selfTest.js 完全相同（测试会检查），改的时候两份一起改。
// 匹克球水平自测：10 个维度，每个维度 5 档（1–5 分）。
// 结果只给到《评分与级别规则 v1》里自评的四个起始分：2.5 / 3.0 / 3.5 / 4.0。更高的水平要在比赛里打出来。
// 题目和选项文字在 miniprogram/utils/i18n.js（st_d1 … st_d10，选项 st_d1_1 … st_d10_5）。

const DIMS = 10;
const OPTIONS = 5;

// 平均分 → 起始分：<2 → 2.5，<3 → 3.0，<4 → 3.5，≥4 → 4.0
const BANDS = [
  [2, 2.5],
  [3, 3.0],
  [4, 3.5],
];
const TOP = 4.0;

// answers：长度 10 的数组，每项 1–5。不完整或越界返回 null。
function score(answers) {
  if (!Array.isArray(answers) || answers.length !== DIMS) return null;
  if (!answers.every((a) => Number.isInteger(a) && a >= 1 && a <= OPTIONS)) return null;
  const avg = answers.reduce((s, a) => s + a, 0) / DIMS;
  const band = BANDS.find(([limit]) => avg < limit);
  return { avg: Math.round(avg * 100) / 100, rating: band ? band[1] : TOP };
}

// 最需要提升的维度（下标从 0 开始）：分最低的优先，同分按题目顺序；已在最高档的不列
function weakest(answers, n = 2) {
  return answers
    .map((a, i) => ({ a, i }))
    .filter((x) => x.a < OPTIONS)
    .sort((x, y) => x.a - y.a || x.i - y.i)
    .slice(0, n)
    .map((x) => x.i);
}

module.exports = { DIMS, OPTIONS, score, weakest };
