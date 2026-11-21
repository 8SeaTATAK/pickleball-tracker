const api = require('../../utils/api');
const fmt = require('../../utils/fmt');
const i18n = require('../../utils/i18n');
const app = getApp();

Page({
  data: { t: {}, user: null, clubs: [], events: [], loaded: false, showJoin: false, code: '' },

  onLoad() {
    this.setData({ t: i18n.dict() });
  },

  onShow() {
    wx.setNavigationBarTitle({ title: i18n.t('appName') });
    i18n.syncTabBar(this, 0);
    // 从底部「发起 → 邀请码加入」跳过来
    if (app.globalData.openJoin) {
      app.globalData.openJoin = false;
      this.openJoin();
    }
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  async load() {
    try {
      const user = await app.ensureLogin();
      const [clubs, events] = await Promise.all([api.call('myClubs'), api.call('upcomingEvents')]);
      this.setData({
        loaded: true,
        user: {
          ...user,
          doublesText: fmt.ratingLabel(user.doubles),
          singlesText: fmt.ratingLabel(user.singles),
        },
        clubs: clubs.map((c) => ({ ...c, roleText: c.myRole === 'member' ? '' : fmt.role(c.myRole) })),
        events: events.map((e) => ({
          ...e,
          when: fmt.range(e.startTime, e.endTime),
          statusText: fmt.status(e.status),
          signText: e.mySignup ? i18n.t('signed_' + e.mySignup) : '',
        })),
      });
    } catch (e) {
      this.setData({ loaded: true });
    }
  },

  goClub(e) {
    wx.navigateTo({ url: '/pages/club/detail/detail?id=' + e.currentTarget.dataset.id });
  },
  goEvent(e) {
    wx.navigateTo({ url: '/pages/event/detail/detail?id=' + e.currentTarget.dataset.id });
  },
  goCreate() {
    wx.navigateTo({ url: '/pages/club/edit/edit' });
  },
  goRules() {
    wx.navigateTo({ url: '/pages/rules/rules' });
  },
  goProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  openJoin() {
    this.setData({ showJoin: true, code: '' });
  },
  closeJoin() {
    this.setData({ showJoin: false });
  },
  noop() {},
  onCode(e) {
    this.setData({ code: e.detail.value });
  },
  async join() {
    const code = this.data.code.trim();
    if (!code) return;
    const { clubId } = await api.call('joinClub', { inviteCode: code }, { loading: 'joining' });
    this.setData({ showJoin: false });
    wx.navigateTo({ url: '/pages/club/detail/detail?id=' + clubId });
  },

  onShareAppMessage() {
    return { title: i18n.t('shareHome'), path: '/pages/index/index' };
  },
});
