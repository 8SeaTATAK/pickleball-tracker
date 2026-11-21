const api = require('../../../utils/api');
const fmt = require('../../../utils/fmt');
const app = getApp();

const LEVELS = ['不设置（3.500）', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'];

Page({
  data: {
    id: '',
    tab: 'events',
    club: null,
    myRole: null,
    isAdmin: false,
    members: [],
    events: [],
    period: 'all',
    board: [],
    settings: null,
    showGuest: false,
    guestName: '',
    guestLevel: 0,
    levels: LEVELS,
  },

  onLoad(q) {
    this.setData({ id: q.id, tab: q.tab || 'events' });
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  async load() {
    await app.ensureLogin();
    const res = await api.call('getClub', { clubId: this.data.id });
    wx.setNavigationBarTitle({ title: res.club.name });
    this.setData({
      club: res.club,
      myRole: res.myRole,
      isAdmin: res.myRole === 'owner' || res.myRole === 'admin',
      members: res.members.map((m) => ({
        ...m,
        roleText: m.role === 'member' ? '' : fmt.ROLE[m.role],
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
      events: list.map((e) => ({ ...e, when: fmt.range(e.startTime, e.endTime), statusText: fmt.STATUS[e.status] })),
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
    this.setData({ period: e.currentTarget.dataset.p }, () => this.loadBoard());
  },

  async join() {
    await api.call('joinClub', { clubId: this.data.id }, { loading: '加入中' });
    wx.showToast({ title: '已加入' });
    await this.load();
  },

  leave() {
    wx.showModal({
      title: '退出俱乐部',
      content: '退出后历史比赛和评分会保留。确定退出？',
      success: api.safe(async (r) => {
        if (!r.confirm) return;
        await api.call('leaveClub', { clubId: this.data.id }, { loading: '处理中' });
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
    const actions = [{ text: '查看资料', fn: () => this.goPlayer(m._id) }];
    if (this.data.myRole === 'owner' && m.role !== 'owner') {
      actions.push(
        m.role === 'admin'
          ? { text: '取消管理员', fn: () => this.setRole(m, 'member') }
          : { text: '设为管理员', fn: () => this.setRole(m, 'admin') }
      );
    }
    const canRemove =
      this.data.isAdmin && m.role !== 'owner' && m._id !== me._id && (m.role !== 'admin' || this.data.myRole === 'owner');
    if (canRemove) actions.push({ text: '移出俱乐部', fn: () => this.removeMember(m) });
    if (actions.length === 1) return actions[0].fn();
    wx.showActionSheet({
      itemList: actions.map((a) => a.text),
      success: (r) => actions[r.tapIndex].fn(),
    });
  },

  async setRole(m, role) {
    await api.call('setRole', { clubId: this.data.id, userId: m._id, role }, { loading: '处理中' });
    await this.load();
  },

  removeMember(m) {
    wx.showModal({
      title: '移出成员',
      content: `确定将「${m.nickName}」移出俱乐部？`,
      success: api.safe(async (r) => {
        if (!r.confirm) return;
        await api.call('removeMember', { clubId: this.data.id, userId: m._id }, { loading: '处理中' });
        this.load();
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
    const i = this.data.guestLevel;
    await api.call(
      'addGuest',
      { clubId: this.data.id, name, level: i === 0 ? undefined : Number(LEVELS[i]) },
      { loading: '添加中' }
    );
    this.setData({ showGuest: false });
    wx.showToast({ title: '已添加' });
    await this.load();
  },

  onShareAppMessage() {
    const c = this.data.club;
    return {
      title: c ? `邀请你加入「${c.name}」匹克球俱乐部` : '匹克球俱乐部',
      path: '/pages/club/detail/detail?id=' + this.data.id,
    };
  },
});
