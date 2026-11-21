// 与云函数 lib/rating.js 的期望公式保持一致，只用于前端显示预测比分
const SCALE = 2.8;

function expectedShare(ra, rb) {
  return 1 / (1 + Math.pow(10, -(ra - rb) / SCALE));
}

function teamRating(team, type) {
  return team.reduce((s, p) => s + ((p[type] && p[type].rating) || 3.5), 0) / team.length;
}

// 返回 '11:7' 这样的 11 分制预测比分
function predict(teamA, teamB, type) {
  const e = expectedShare(teamRating(teamA, type), teamRating(teamB, type));
  if (e >= 0.5) return `11:${Math.round((11 * (1 - e)) / e)}`;
  return `${Math.round((11 * e) / (1 - e))}:11`;
}

module.exports = { expectedShare, predict };
