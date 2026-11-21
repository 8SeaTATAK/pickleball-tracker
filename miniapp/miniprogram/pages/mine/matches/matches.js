// 我的比赛：待开赛 + 已完赛（分页）
const api = require('../../../utils/api');
const fmt = require('../../../utils/fmt');
const i18n = require('../../../utils/i18n');
const app = getApp();

Page({
  data: { t: {}, pending: [], done: [], hasMore: false, loaded: false },

  onLoad() {
    this.setData({ t: i18n.dict() });
    wx.setNavigationBarTitle({ title: i18n.t('menu_matches') });
  },

  onShow() {
    this.load().catch(() => {});
  },

  onPullDownRefresh() {
    this.load()
      .catch(() => {})
      .finally(() => wx.stopPullDownRefresh());
  },

  view(m, me) {
    const a = m.teamA.some((p) => p._id === me);
    const sep = i18n.getLang() === 'zh' ? '、' : ', ';
    const names = (team) => team.map((p) => p.nickName).join(sep);
    const done = m.status === 'done';
    const delta = (m.ratingChanges.find((c) => c.id === me) || {}).delta || 0;
    return {
      _id: m._id,
      eventId: m.eventId,
      done,
      won: done && (a ? m.scoreA > m.scoreB : m.scoreB > m.scoreA),
      round: m.round,
      mine: names(a ? m.teamA : m.teamB),
      opp: names(a ? m.teamB : m.teamA),
      score: done ? (a ? `${m.scoreA}:${m.scoreB}` : `${m.scoreB}:${m.scoreA}`) : '',
      delta,
      deltaText: fmt.delta(delta),
      sub: [m.event ? fmt.shortDate(m.event.startTime) : '', i18n.t('roundN', m.round), i18n.t('courtN', m.court)].filter(Boolean).join(' · '),
    };
  },

  async load() {
    const me = await app.ensureLogin();
    const r = await api.call('myMatches', {});
    this.setData({
      loaded: true,
      pending: r.pending.map((m) => this.view(m, me._id)),
      done: r.done.map((m) => this.view(m, me._id)),
      hasMore: r.hasMore,
    });
  },

  async more() {
    const me = app.globalData.user;
    const r = await api.call('myMatches', { skip: this.data.done.length }, { loading: 'loading' });
    this.setData({ done: this.data.done.concat(r.done.map((m) => this.view(m, me._id))), hasMore: r.hasMore });
  },

  goEvent(e) {
    wx.navigateTo({ url: '/pages/event/detail/detail?id=' + e.currentTarget.dataset.id });
  },
});
