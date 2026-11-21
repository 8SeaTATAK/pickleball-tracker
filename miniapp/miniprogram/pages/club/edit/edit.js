const api = require('../../../utils/api');
const app = getApp();

Page({
  data: { clubId: '', name: '', city: '', intro: '', winPoints: 3, lossPoints: 1, saving: false },

  async onLoad(q) {
    await app.ensureLogin();
    if (!q.id) return;
    wx.setNavigationBarTitle({ title: '俱乐部设置' });
    const { club } = await api.call('getClub', { clubId: q.id }, { loading: '加载中' });
    this.setData({
      clubId: club._id,
      name: club.name,
      city: club.city || '',
      intro: club.intro || '',
      winPoints: club.settings.winPoints,
      lossPoints: club.settings.lossPoints,
    });
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.k]: e.detail.value });
  },

  async save() {
    const d = this.data;
    if (!d.name.trim()) return wx.showToast({ title: '请填写俱乐部名称', icon: 'none' });
    this.setData({ saving: true });
    try {
      const body = { name: d.name, city: d.city, intro: d.intro };
      if (d.clubId) {
        await api.call(
          'updateClub',
          { clubId: d.clubId, ...body, winPoints: Number(d.winPoints), lossPoints: Number(d.lossPoints) },
          { loading: '保存中' }
        );
        wx.navigateBack();
      } else {
        const { clubId } = await api.call('createClub', body, { loading: '创建中' });
        wx.redirectTo({ url: '/pages/club/detail/detail?id=' + clubId });
      }
    } finally {
      this.setData({ saving: false });
    }
  },
});
