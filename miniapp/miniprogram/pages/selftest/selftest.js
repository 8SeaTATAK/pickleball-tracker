// 匹克球水平自测：10 个维度一屏一题，保存后显示结果（独立保存，不改评分）
const api = require('../../utils/api');
const i18n = require('../../utils/i18n');
const ST = require('../../utils/selfTest');
const app = getApp();

const levelKey = (l) => 'level_' + String(l).replace('.', '').replace(/0$/, '');
const title = (r) => i18n.t(r >= 4 ? 'lv_4' : r >= 3.5 ? 'lv_3' : r >= 3 ? 'lv_2' : 'lv_1');

Page({
  data: { t: {}, mode: 'quiz', step: 0, total: ST.DIMS, ans: [], q: null, res: null, canApply: false, saving: false },

  async onLoad(query) {
    const t = i18n.dict();
    this.setData({ t });
    wx.setNavigationBarTitle({ title: t.st_title });
    const u = await app.ensureLogin().catch(() => null);
    // 做过自测的直接看结果，可以重新测试
    if (u && u.selfTest && query.retake !== '1') this.showResult(u);
    else this.startQuiz();
  },

  startQuiz() {
    this.setData({ mode: 'quiz', step: 0, ans: Array(ST.DIMS).fill(0) });
    this.renderQ();
  },

  renderQ() {
    const t = this.data.t;
    const d = this.data.step + 1;
    this.setData({
      q: {
        title: t['st_d' + d],
        options: [1, 2, 3, 4, 5].map((o) => ({ o, text: t['st_d' + d + '_' + o] })),
        pct: (d / ST.DIMS) * 100,
      },
    });
  },

  pick(e) {
    this.setData({ ['ans[' + this.data.step + ']']: Number(e.currentTarget.dataset.o) });
  },

  prev() {
    if (!this.data.step) return;
    this.setData({ step: this.data.step - 1 });
    this.renderQ();
  },

  async next() {
    const d = this.data;
    if (!d.ans[d.step] || d.saving) return;
    if (d.step < ST.DIMS - 1) {
      this.setData({ step: d.step + 1 });
      this.renderQ();
      wx.pageScrollTo && wx.pageScrollTo({ scrollTop: 0, duration: 0 });
      return;
    }
    this.setData({ saving: true });
    try {
      const u = await api.call('saveSelfTest', { answers: d.ans }, { loading: 'saving' });
      app.globalData.user = u;
      this.showResult(u);
    } catch (e) {
      // 错误已提示
    } finally {
      this.setData({ saving: false });
    }
  },

  showResult(u) {
    const t = this.data.t;
    const r = u.selfTest;
    const weak = ST.weakest(r.answers).map((i) => ({ name: t['st_d' + (i + 1)], goal: t['st_d' + (i + 1) + '_' + (r.answers[i] + 1)] }));
    const fresh = !u.doubles.games && !u.singles.games;
    this.setData({
      mode: 'result',
      canApply: fresh && !(u.leveled && u.doubles.rating === r.rating),
      res: {
        rating: r.rating.toFixed(1),
        title: title(r.rating) + ' · ' + t[levelKey(r.rating)],
        avgLine: i18n.t('st_avg', r.avg.toFixed(1), i18n.t('st_last', i18n.dayMonth(r.at))),
        dims: r.answers.map((a, i) => ({ name: t['st_d' + (i + 1)], a, pct: a * 20 })),
        weak,
        applyText: i18n.t('st_apply', r.rating.toFixed(1)),
      },
    });
    wx.pageScrollTo && wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  // 还没打过比赛：把结果设为起始水平
  async apply() {
    const u = app.globalData.user;
    if (!u || !u.selfTest) return;
    try {
      const nu = await api.call('saveSelfTest', { answers: u.selfTest.answers, apply: true }, { loading: 'saving' });
      app.globalData.user = nu;
      wx.showToast({ title: i18n.t('st_applied'), icon: 'none' });
      this.showResult(nu);
    } catch (e) {
      // 错误已提示
    }
  },

  retake() {
    this.startQuiz();
  },

  goLevels() {
    wx.navigateTo({ url: '/pages/guide/guide?topic=levels' });
  },

  onShareAppMessage() {
    return { title: i18n.t('st_title'), path: '/pages/selftest/selftest' };
  },
});
