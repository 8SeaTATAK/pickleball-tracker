const api = require('../../utils/api');
const fmt = require('../../utils/fmt');
const i18n = require('../../utils/i18n');
const app = getApp();

// 水平描述的词典键：2.0 → level_2，2.5 → level_25
const levelKey = (l) => 'level_' + String(l).replace('.', '').replace(/0$/, '');

module.exports = () => ({
  data: {
    t: {},
    langNames: i18n.LANG_NAMES,
    langIdx: 0,
    self: true,
    userId: '',
    user: null,
    tab: 'doubles',
    blocks: {},
    matches: [],
    historyCount: 0,
    levels: [],
    levelNames: [],
    levelIdx: 3,
    canLevel: false,
    editingName: false,
  },

  onLoad(q) {
    this.setData({ t: i18n.dict(), langIdx: i18n.LANGS.indexOf(i18n.getLang()) });
    if (q.id) this.setData({ userId: q.id });
  },

  onShow() {
    if (!this.data.userId) {
      wx.setNavigationBarTitle({ title: i18n.t('tabMe') });
      i18n.applyTabBar();
    }
    this.load().catch(() => {});
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  async load() {
    const me = await app.ensureLogin();
    const userId = this.data.userId || me._id;
    const self = userId === me._id;
    const r = await api.call('getPlayer', { userId });
    if (!self) wx.setNavigationBarTitle({ title: r.user.nickName });
    const block = (b) => ({
      ...b,
      ratingText: fmt.rating(b.rating),
      winRate: b.games ? Math.round((b.wins / b.games) * 100) : 0,
      provisional: b.games < 6,
    });
    const sep = i18n.getLang() === 'zh' ? '、' : ', ';
    this._history = r.history;
    this.setData({
      self,
      user: r.user,
      blocks: { doubles: block(r.user.doubles), singles: block(r.user.singles) },
      canLevel: self && !r.user.doubles.games && !r.user.singles.games,
      levels: r.levels,
      levelNames: r.levels.map((l) => `${l.toFixed(1)}  ${i18n.t(levelKey(l))}`),
      levelIdx: Math.max(0, r.levels.indexOf(r.user.doubles.rating)),
      matches: r.matches.map((m) => {
        const won = m.mySide === 'A' ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
        const mine = m.mySide === 'A' ? m.teamA : m.teamB;
        const opp = m.mySide === 'A' ? m.teamB : m.teamA;
        return {
          _id: m._id,
          won,
          type: m.type,
          partner: mine.filter((p) => p._id !== userId).map((p) => p.nickName).join(sep),
          opp: opp.map((p) => p.nickName).join(sep),
          score: m.mySide === 'A' ? `${m.scoreA}:${m.scoreB}` : `${m.scoreB}:${m.scoreA}`,
          delta: m.myDelta,
          deltaText: fmt.delta(m.myDelta),
          day: fmt.shortDate(m.playedAt),
        };
      }),
    });
    this.drawChart();
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab }, () => this.drawChart());
  },

  // 评分走势：canvas 2d 折线
  drawChart() {
    const type = this.data.tab;
    const pts = (this._history || []).filter((h) => h.type === type);
    this.setData({ historyCount: pts.length });
    if (pts.length < 2) return;
    wx.nextTick(() => {
      wx.createSelectorQuery()
        .in(this)
        .select('#chart')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) return;
          const canvas = res[0].node;
          const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio;
          const W = res[0].width;
          const H = res[0].height;
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          const ctx = canvas.getContext('2d');
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, W, H);

          const vals = [pts[0].before, ...pts.map((p) => p.after)];
          let lo = Math.min(...vals);
          let hi = Math.max(...vals);
          if (hi - lo < 0.2) {
            lo -= 0.1;
            hi += 0.1;
          }
          const pad = { l: 40, r: 10, t: 12, b: 16 };
          const x = (i) => pad.l + ((W - pad.l - pad.r) * i) / (vals.length - 1);
          const y = (v) => pad.t + ((H - pad.t - pad.b) * (hi - v)) / (hi - lo);

          ctx.strokeStyle = '#e2e0d8';
          ctx.fillStyle = '#71776f';
          ctx.font = '10px sans-serif';
          ctx.lineWidth = 1;
          [hi, (hi + lo) / 2, lo].forEach((v) => {
            ctx.beginPath();
            ctx.moveTo(pad.l, y(v));
            ctx.lineTo(W - pad.r, y(v));
            ctx.stroke();
            ctx.fillText(v.toFixed(2), 2, y(v) + 3);
          });

          ctx.strokeStyle = '#216b43';
          ctx.lineWidth = 2;
          ctx.beginPath();
          vals.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
          ctx.stroke();
          ctx.fillStyle = '#216b43';
          ctx.beginPath();
          ctx.arc(x(vals.length - 1), y(vals[vals.length - 1]), 3, 0, Math.PI * 2);
          ctx.fill();
        });
    });
  },

  // ---------- 编辑资料（仅本人） ----------
  async onChooseAvatar(e) {
    const tmp = e.detail.avatarUrl;
    wx.showLoading({ title: i18n.t('uploading'), mask: true });
    try {
      const up = await wx.cloud.uploadFile({
        cloudPath: `avatars/${this.data.user._id}-${Date.now()}.jpg`,
        filePath: tmp,
      });
      await api.call('updateProfile', { avatarUrl: up.fileID });
      await app.ensureLogin(true);
      await this.load();
    } finally {
      wx.hideLoading();
    }
  },

  editName() {
    this.setData({ editingName: true });
  },
  async saveName(e) {
    const name = (e.detail.value || '').trim();
    this.setData({ editingName: false });
    if (!name || name === this.data.user.nickName) return;
    await api.call('updateProfile', { nickName: name }, { loading: 'saving' });
    await app.ensureLogin(true);
    await this.load();
  },

  async onLevel(e) {
    const lv = this.data.levels[Number(e.detail.value)];
    await api.call('updateProfile', { level: lv }, { loading: 'saving' });
    await app.ensureLogin(true);
    wx.showToast({ title: i18n.t('startRatingSet', lv.toFixed(3)), icon: 'none' });
    await this.load();
  },

  // 切换语言：保存后重启到首页，所有页面和 tab 栏按新语言重新渲染
  onLang(e) {
    const lang = i18n.LANGS[Number(e.detail.value)];
    if (lang === i18n.getLang()) return;
    i18n.setLang(lang);
    wx.reLaunch({ url: '/pages/index/index' });
  },

  goRules() {
    wx.navigateTo({ url: '/pages/rules/rules' });
  },

  onShareAppMessage() {
    const u = this.data.user;
    return {
      title: u ? i18n.t('shareProfile', u.nickName, fmt.rating(u.doubles.rating)) : i18n.t('appName'),
      path: '/pages/player/player?id=' + (u ? u._id : ''),
    };
  },
});
