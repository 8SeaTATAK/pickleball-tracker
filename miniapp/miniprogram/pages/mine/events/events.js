// 我的活动：报过名的活动
const api = require('../../../utils/api');
const fmt = require('../../../utils/fmt');
const i18n = require('../../../utils/i18n');
const app = getApp();

Page({
  data: { t: {}, list: [], loaded: false },

  onLoad() {
    this.setData({ t: i18n.dict() });
    wx.setNavigationBarTitle({ title: i18n.t('menu_events') });
  },

  onShow() {
    this.load().catch(() => {});
  },

  onPullDownRefresh() {
    this.load()
      .catch(() => {})
      .finally(() => wx.stopPullDownRefresh());
  },

  async load() {
    await app.ensureLogin();
    const list = await api.call('myEvents');
    this.setData({
      loaded: true,
      list: list.map((e) => ({
        ...e,
        when: fmt.range(e.startTime, e.endTime),
        statusText: fmt.status(e.status),
        signText: i18n.t('signed_' + e.mySignup),
      })),
    });
  },

  goEvent(e) {
    wx.navigateTo({ url: '/pages/event/detail/detail?id=' + e.currentTarget.dataset.id });
  },
});
