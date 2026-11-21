const api = require('../../../utils/api');
const i18n = require('../../../utils/i18n');
const app = getApp();

const CURRENCIES = ['A$', '¥', 'RM', 'S$', '₫', '$'];

Page({
  data: {
    t: {},
    clubId: '',
    name: '',
    city: '',
    intro: '',
    winPoints: 3,
    lossPoints: 1,
    currencies: CURRENCIES,
    currencyIdx: 0,
    saving: false,
  },

  async onLoad(q) {
    this.setData({ t: i18n.dict() });
    wx.setNavigationBarTitle({ title: i18n.t(q.id ? 'clubSettings' : 'createClub') });
    await app.ensureLogin();
    if (!q.id) return;
    const { club } = await api.call('getClub', { clubId: q.id }, { loading: 'loading' });
    this.setData({
      clubId: club._id,
      name: club.name,
      city: club.city || '',
      intro: club.intro || '',
      winPoints: club.settings.winPoints,
      lossPoints: club.settings.lossPoints,
      currencyIdx: Math.max(0, CURRENCIES.indexOf(club.settings.currency || 'A$')),
    });
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.k]: e.detail.value });
  },

  onCurrency(e) {
    this.setData({ currencyIdx: Number(e.detail.value) });
  },

  async save() {
    const d = this.data;
    if (!d.name.trim()) return wx.showToast({ title: i18n.t('needClubName'), icon: 'none' });
    this.setData({ saving: true });
    try {
      const body = { name: d.name, city: d.city, intro: d.intro };
      if (d.clubId) {
        await api.call(
          'updateClub',
          {
            clubId: d.clubId,
            ...body,
            winPoints: Number(d.winPoints),
            lossPoints: Number(d.lossPoints),
            currency: CURRENCIES[d.currencyIdx],
          },
          { loading: 'saving' }
        );
        wx.navigateBack();
      } else {
        const { clubId } = await api.call('createClub', body, { loading: 'creating' });
        wx.redirectTo({ url: '/pages/club/detail/detail?id=' + clubId });
      }
    } catch (e) {
      // 错误已提示
    } finally {
      this.setData({ saving: false });
    }
  },
});
