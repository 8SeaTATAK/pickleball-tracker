const api = require('../../utils/api');
const fmt = require('../../utils/fmt');
const app = getApp();

Page({
  data: { user: null, clubs: [], events: [], loaded: false, showJoin: false, code: '' },

  onShow() {
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
        clubs,
        events: events.map((e) => ({
          ...e,
          when: fmt.range(e.startTime, e.endTime),
          statusText: fmt.STATUS[e.status],
          signText: e.mySignup === 'joined' ? '已报名' : e.mySignup === 'waitlist' ? '候补中' : '',
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
    const { clubId } = await api.call('joinClub', { inviteCode: code }, { loading: '加入中' });
    this.setData({ showJoin: false });
    wx.navigateTo({ url: '/pages/club/detail/detail?id=' + clubId });
  },

  onShareAppMessage() {
    return { title: '匹克球助手 · 俱乐部约球、计分、评分', path: '/pages/index/index' };
  },
});
