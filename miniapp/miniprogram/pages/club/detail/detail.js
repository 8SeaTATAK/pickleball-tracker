const api = require('../../../utils/api');
const fmt = require('../../../utils/fmt');
const i18n = require('../../../utils/i18n');
const app = getApp();

const LEVELS = [null, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

Page({
  data: {
    t: {},
    id: '',
    tab: 'events',
    club: null,
    myRole: null,
    roleText: '',
    isAdmin: false,
    members: [],
    events: [],
    period: 'all',
    board: [],
    settings: null,
    showGuest: false,
    guestName: '',
    guestLevel: 0,
    levels: [],
  },

  onLoad(q) {
    this.setData({
      t: i18n.dict(),
      id: q.id,
      tab: q.tab || 'events',
      levels: LEVELS.map((l) => (l == null ? i18n.t('levelDefault') : l.toFixed(1))),
    });
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
    const res = await api.call('getClub', { clubId: this.data.id });
    wx.setNavigationBarTitle({ title: res.club.name });
    this.setData({
      club: res.club,
      myRole: res.myRole,
      roleText: res.myRole && res.myRole !== 'member' ? fmt.role(res.myRole) : '',
      isAdmin: res.myRole === 'owner' || res.myRole === 'admin',
      members: res.members.map((m) => ({
        ...m,
        roleText: m.role === 'member' ? '' : fmt.role(m.role),
        ratingText: fmt.ratingLabel(m.doubles),
      })),
    });
    if (res.myRole) {
      await Promise.all([this.loadEvents(), this.loadBoard()]);
    }
  },

  async loadEvents() {
    const list = await api.call('listEvents', { clubId: this.data.id });
    this.setData({
      events: list.map((e) => ({ ...e, when: fmt.range(e.startTime, e.endTime), statusText: fmt.status(e.status) })),
    });
  },

  async loadBoard() {
    const res = await api.call('leaderboard', { clubId: this.data.id, period: this.data.period });
    this.setData({ board: res.rows, settings: res.settings });
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  switchPeriod(e) {
    this.setData({ period: e.currentTarget.dataset.p }, () => this.loadBoard().catch(() => {}));
  },

  async join() {
    await api.call('joinClub', { clubId: this.data.id }, { loading: 'joining' });
    wx.showToast({ title: i18n.t('joined') });
    await this.load();
  },

  leave() {
    wx.showModal({
      title: i18n.t('leaveClub'),
      content: i18n.t('leaveConfirm'),
      confirmText: i18n.t('ok'),
      cancelText: i18n.t('cancel'),
      success: api.safe(async (r) => {
        if (!r.confirm) return;
        await api.call('leaveClub', { clubId: this.data.id }, { loading: 'processing' });
        wx.navigateBack();
      }),
    });
  },

  copyCode() {
    wx.setClipboardData({ data: this.data.club.inviteCode });
  },

  newEvent() {
    wx.navigateTo({ url: '/pages/event/edit/edit?clubId=' + this.data.id });
  },

  settingsPage() {
    wx.navigateTo({ url: '/pages/club/edit/edit?id=' + this.data.id });
  },

  goEvent(e) {
    wx.navigateTo({ url: '/pages/event/detail/detail?id=' + e.currentTarget.dataset.id });
  },

  goPlayer(id) {
    wx.navigateTo({ url: '/pages/player/player?id=' + id });
  },

  tapBoard(e) {
    this.goPlayer(e.currentTarget.dataset.id);
  },

  tapMember(e) {
    const m = this.data.members[e.currentTarget.dataset.i];
    const me = app.globalData.user;
    const actions = [{ text: i18n.t('viewProfile'), fn: () => this.goPlayer(m._id) }];
    if (this.data.myRole === 'owner' && m.role !== 'owner') {
      actions.push(
        m.role === 'admin'
          ? { text: i18n.t('removeAdmin'), fn: () => this.setRole(m, 'member') }
          : { text: i18n.t('makeAdmin'), fn: () => this.setRole(m, 'admin') }
      );
    }
    const canRemove =
      this.data.isAdmin && m.role !== 'owner' && m._id !== me._id && (m.role !== 'admin' || this.data.myRole === 'owner');
    if (canRemove) actions.push({ text: i18n.t('removeFromClub'), fn: () => this.removeMember(m) });
    if (actions.length === 1) return actions[0].fn();
    wx.showActionSheet({
      itemList: actions.map((a) => a.text),
      success: (r) => actions[r.tapIndex].fn(),
    });
  },

  async setRole(m, role) {
    await api.call('setRole', { clubId: this.data.id, userId: m._id, role }, { loading: 'processing' }).catch(() => null);
    await this.load().catch(() => {});
  },

  removeMember(m) {
    wx.showModal({
      title: i18n.t('removeMemberTitle'),
      content: i18n.t('removeMemberConfirm', m.nickName),
      confirmText: i18n.t('ok'),
      cancelText: i18n.t('cancel'),
      success: api.safe(async (r) => {
        if (!r.confirm) return;
        await api.call('removeMember', { clubId: this.data.id, userId: m._id }, { loading: 'processing' });
        await this.load();
      }),
    });
  },

  openGuest() {
    this.setData({ showGuest: true, guestName: '', guestLevel: 0 });
  },
  closeGuest() {
    this.setData({ showGuest: false });
  },
  noop() {},
  onGuestName(e) {
    this.setData({ guestName: e.detail.value });
  },
  onGuestLevel(e) {
    this.setData({ guestLevel: Number(e.detail.value) });
  },
  async addGuest() {
    const name = this.data.guestName.trim();
    if (!name) return;
    const level = LEVELS[this.data.guestLevel];
    await api.call('addGuest', { clubId: this.data.id, name, level: level == null ? undefined : level }, { loading: 'adding' });
    this.setData({ showGuest: false });
    wx.showToast({ title: i18n.t('added') });
    await this.load();
  },

  onShareAppMessage() {
    const c = this.data.club;
    return {
      title: c ? i18n.t('shareClub', c.name) : i18n.t('clubFallback'),
      path: '/pages/club/detail/detail?id=' + this.data.id,
    };
  },
});
