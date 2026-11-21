const { expectedShare } = require('../../utils/predict');

// 示例表：评分差 → 期望得分率 → 11 分制预测比分
const rows = [0, 0.25, 0.5, 1, 1.5, 2].map((d) => {
  const e = expectedShare(3.5 + d, 3.5);
  return {
    diff: d.toFixed(2),
    share: Math.round(e * 100) + '%',
    score: `11:${Math.round((11 * (1 - e)) / e)}`,
  };
});

Page({
  data: { rows },
  onShareAppMessage() {
    return { title: '匹克球助手 · 评分规则', path: '/pages/rules/rules' };
  },
});
