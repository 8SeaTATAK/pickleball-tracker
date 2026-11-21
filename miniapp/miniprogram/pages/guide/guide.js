// 指南：等级标准（levels）/ 赛制介绍（formats）/ 新手指南（start）
const i18n = require('../../utils/i18n');

const LEVELS = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
const levelKey = (l) => 'level_' + String(l).replace('.', '').replace(/0$/, '');
const TITLES = { levels: 'menu_levels', formats: 'menu_formats', start: 'menu_guide' };

Page({
  data: { t: {}, topic: 'start', levels: [], titles: [], modes: [], steps: [] },

  onLoad(q) {
    const t = i18n.dict();
    const topic = TITLES[q.topic] ? q.topic : 'start';
    wx.setNavigationBarTitle({ title: t[TITLES[topic]] });
    this.setData({
      t,
      topic,
      levels: LEVELS.map((l) => ({ lv: l.toFixed(1), desc: t[levelKey(l)] })),
      titles: [
        ['lv_newbie', '< 6 ' + t.games],
        ['lv_1', '< 3.0'],
        ['lv_2', '3.0+'],
        ['lv_3', '3.5+'],
        ['lv_4', '4.0+'],
        ['lv_5', '4.5+'],
      ].map(([k, range]) => ({ name: t[k], range })),
      modes: ['rotation', 'balanced', 'fixed', 'singles', 'singlesRR'].map((k) => ({ name: t['mode_' + k], desc: t['mode_' + k + '_d'] })),
      steps: [1, 2, 3, 4, 5].map((n) => t['g_' + n]),
    });
  },

  onShareAppMessage() {
    return { title: i18n.t('appName'), path: '/pages/guide/guide?topic=' + this.data.topic };
  },
});
