// 「我的」：个人信息与战绩统计 + 功能宫格 + 列表
const api = require('../../utils/api');
const fmt = require('../../utils/fmt');
const i18n = require('../../utils/i18n');
const app = getApp();

const rate = (b) => (b.games ? Math.round((b.wins / b.games) * 100) : 0);

Page({
  data: { t: {}, user: null, stats: null, langNames: i18n.LANG_NAMES, langIdx: 0 },

  onLoad() {
    this.setData({ t: i18n.dict(), langIdx: i18n.LANGS.indexOf(i18n.getLang()) });
  },

  onShow() {
    wx.setNavigationBarTitle({ title: i18n.t('tabMe') });
    i18n.syncTabBar(this, 2);
    this.load().catch(() => {});
  },

  onPullDownRefresh() {
    this.load()
      .catch(() => {})
      .finally(() => wx.stopPullDownRefresh());
  },

  async load() {
    const me = await app.ensureLogin();
    const r = await api.call('getPlayer', { userId: me._id });
    const u = r.user;
    this.setData({
      user: {
        ...u,
        title: i18n.levelTitle(u.doubles),
        ratingsLine: i18n.t('ratingsLine', fmt.ratingLabel(u.doubles), fmt.ratingLabel(u.singles)),
      },
      stats: {
        singlesGames: u.singles.games,
        singlesRate: rate(u.singles),
        doublesGames: u.doubles.games,
        doublesRate: rate(u.doubles),
        umpireSingles: r.umpire.singles,
        umpireDoubles: r.umpire.doubles,
      },
    });
  },

  go(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.url });
  },

  goRating() {
    wx.navigateTo({ url: '/pages/player/player?id=' + this.data.user._id });
  },

  goClubs() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 切换语言：保存后重启到首页，所有页面和 tab 栏按新语言重新渲染
  onLang(e) {
    const lang = i18n.LANGS[Number(e.detail.value)];
    if (lang === i18n.getLang()) return;
    i18n.setLang(lang);
    wx.reLaunch({ url: '/pages/index/index' });
  },

  onShareAppMessage() {
    return { title: i18n.t('shareHome'), path: '/pages/index/index' };
  },
});
