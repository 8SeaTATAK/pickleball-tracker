const api = require('../../../utils/api');
const fmt = require('../../../utils/fmt');
const { predict } = require('../../../utils/predict');
const i18n = require('../../../utils/i18n');
const app = getApp();

const MODE_KEYS = ['rotation', 'balanced', 'fixed', 'singles', 'singlesRR'];
const modes = () => MODE_KEYS.map((key) => ({ key, name: i18n.t('mode_' + key), desc: i18n.t('mode_' + key + '_d') }));

// 系统弹窗按钮文字跟随小程序语言
const modal = (o) => wx.showModal({ confirmText: i18n.t('ok'), cancelText: i18n.t('cancel'), ...o });

Page({
  data: {
    t: {},
    currency: 'A$',
    id: '',
    tab: 'players',
    loaded: false,
    event: null,
    club: null,
    myRole: null,
    isAdmin: false,
    mySignup: null,
    joined: [],
    waitlist: [],
    rounds: [],
    standings: [],
    doneCount: 0,
    totalCount: 0,
    showProxy: false,
    proxyIdx: 0,
    candidateNames: [],
    when: '',
    statusText: '',
    // 生成对阵
    showGen: false,
    modes: [],
    modeIdx: 0,
    genRounds: '6',
    genCourts: '2',
    // 录分
    showScore: false,
    scoring: null,
    scoreA: '',
    scoreB: '',
    // 手动加局
    showAdd: false,
    addType: 'doubles',
    names: [],
    pick: [0, 1, 2, 3],
    // 代报名
    candidates: [],
  },

  onLoad(q) {
    this.setData({ id: q.id, t: i18n.dict(), modes: modes() });
  },

  onShow() {
    this.load().catch(() => {});
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  async load() {
    const me = await app.ensureLogin();
    const r = await api.call('getEvent', { eventId: this.data.id });
    const uid = me._id;
    const byRound = {};
    r.matches.forEach((m) => {
      const ch = {};
      (m.ratingChanges || []).forEach((c) => (ch[c.id] = c.delta));
      const side = (team) =>
        team.map((p) => ({ _id: p._id, nickName: p.nickName, delta: ch[p._id], deltaText: m.status === 'done' ? fmt.delta(ch[p._id]) : '' }));
      const view = {
        _id: m._id,
        round: m.round,
        court: m.court,
        type: m.type,
        status: m.status,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        teamA: side(m.teamA),
        teamB: side(m.teamB),
        rawA: m.teamA,
        rawB: m.teamB,
        mine: m.players.includes(uid),
        canScore: r.isAdmin || (m.players.includes(uid) && m.status !== 'done'),
        prediction: predict(m.teamA, m.teamB, m.type),
      };
      (byRound[m.round] = byRound[m.round] || []).push(view);
    });
    const rounds = Object.keys(byRound)
      .map(Number)
      .sort((a, b) => a - b)
      .map((n) => ({ round: n, matches: byRound[n], done: byRound[n].every((m) => m.status === 'done') }));

    wx.setNavigationBarTitle({ title: r.event.title });
    this.setData({
      loaded: true,
      event: r.event,
      club: r.club,
      myRole: r.myRole,
      isAdmin: r.isAdmin,
      mySignup: r.mySignup,
      joined: r.joined.map((p) => ({ ...p, ratingText: fmt.ratingLabel(p.doubles) })),
      waitlist: r.waitlist,
      rounds,
      standings: r.standings,
      doneCount: r.matches.filter((m) => m.status === 'done').length,
      totalCount: r.matches.length,
      when: fmt.range(r.event.startTime, r.event.endTime),
      statusText: fmt.status(r.event.status),
      currency: (r.club && r.club.settings && r.club.settings.currency) || 'A$',
      genCourts: String(r.event.courts),
      names: r.joined.map((p) => p.nickName),
      tab: this.data.tab === 'players' && r.matches.length && !this._tabTouched ? 'matches' : this.data.tab,
    });
  },

  switchTab(e) {
    this._tabTouched = true;
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  noop() {},

  goClub() {
    wx.navigateTo({ url: '/pages/club/detail/detail?id=' + this.data.event.clubId });
  },

  goPlayer(e) {
    wx.navigateTo({ url: '/pages/player/player?id=' + e.currentTarget.dataset.id });
  },

  // ---------- 报名 ----------
  async signup() {
    if (!this.data.myRole) {
      await api.call('joinClub', { clubId: this.data.event.clubId }, { loading: 'joiningClub' });
    }
    const { status } = await api.call('signup', { eventId: this.data.id }, { loading: 'signingUp' });
    wx.showToast({ title: i18n.t(status === 'joined' ? 'signupOk' : 'signupFull'), icon: status === 'joined' ? 'success' : 'none' });
    await this.load();
  },

  cancel() {
    modal({
      title: i18n.t('cancelSignup'),
      content: i18n.t('cancelConfirm'),
      success: api.safe(async (r) => {
        if (!r.confirm) return;
        await api.call('cancelSignup', { eventId: this.data.id }, { loading: 'processing' });
        this.load();
      }),
    });
  },

  tapPlayer(e) {
    const { id, name } = e.currentTarget.dataset;
    if (!this.data.isAdmin) return wx.navigateTo({ url: '/pages/player/player?id=' + id });
    wx.showActionSheet({
      itemList: [i18n.t('viewProfile'), i18n.t('cancelPlayer')],
      success: (r) => {
        if (r.tapIndex === 0) return wx.navigateTo({ url: '/pages/player/player?id=' + id });
        modal({
          title: i18n.t('cancelSignup'),
          content: i18n.t('cancelPlayerConfirm', name),
          success: api.safe(async (m) => {
            if (!m.confirm) return;
            await api.call('cancelSignup', { eventId: this.data.id, userId: id }, { loading: 'processing' });
            this.load();
          }),
        });
      },
    });
  },

  // 管理员代报名：从俱乐部成员里选
  async proxySignup() {
    const { members } = await api.call('getClub', { clubId: this.data.event.clubId }, { loading: 'loadingMembers' });
    const taken = new Set([...this.data.joined, ...this.data.waitlist].map((p) => p._id));
    const candidates = members.filter((m) => !taken.has(m._id));
    if (!candidates.length) return wx.showToast({ title: i18n.t('allSigned'), icon: 'none' });
    this.setData({ candidates });
    // showActionSheet 最多 6 项，用 picker 弹层更通用
    this.setData({ showProxy: true, proxyIdx: 0, candidateNames: candidates.map((c) => c.nickName) });
  },
  onProxyPick(e) {
    this.setData({ proxyIdx: Number(e.detail.value) });
  },
  closeProxy() {
    this.setData({ showProxy: false });
  },
  async confirmProxy() {
    const c = this.data.candidates[this.data.proxyIdx];
    if (!c) return;
    const { status } = await api.call('signup', { eventId: this.data.id, userId: c._id }, { loading: 'signingUp' });
    wx.showToast({ title: i18n.t(status === 'joined' ? 'signedFor' : 'waitlistedFor', c.nickName), icon: 'none' });
    // 从候选里去掉刚报名的人，方便连续代报名
    const candidates = this.data.candidates.filter((x) => x._id !== c._id);
    this.setData({
      candidates,
      candidateNames: candidates.map((x) => x.nickName),
      proxyIdx: 0,
      showProxy: candidates.length > 0,
    });
    await this.load();
  },

  // ---------- 生成对阵 ----------
  openGen() {
    if (this.data.joined.length < 2) return wx.showToast({ title: i18n.t('notEnough'), icon: 'none' });
    this.setData({ showGen: true });
  },
  closeGen() {
    this.setData({ showGen: false });
  },
  pickMode(e) {
    this.setData({ modeIdx: Number(e.currentTarget.dataset.i) });
  },
  onGenInput(e) {
    this.setData({ [e.currentTarget.dataset.k]: e.detail.value });
  },
  generate() {
    const pending = this.data.rounds.some((r) => r.matches.some((m) => m.status !== 'done'));
    const run = async () => {
      const mode = MODE_KEYS[this.data.modeIdx];
      const res = await api.call(
        'generateSchedule',
        { eventId: this.data.id, mode, rounds: Number(this.data.genRounds), courts: Number(this.data.genCourts) },
        { loading: 'generating' }
      );
      this.setData({ showGen: false, tab: 'matches' });
      wx.showToast({ title: i18n.t('generatedN', res.count), icon: 'none' });
      await this.load();
    };
    if (!pending) return run();
    modal({
      title: i18n.t('regenTitle'),
      content: i18n.t('regenConfirm'),
      success: (r) => r.confirm && run().catch(() => {}),
    });
  },

  // ---------- 手动加一局 ----------
  openAdd() {
    if (this.data.joined.length < 2) return wx.showToast({ title: i18n.t('notEnough'), icon: 'none' });
    this.setData({ showAdd: true, addType: this.data.joined.length >= 4 ? 'doubles' : 'singles', pick: [0, 1, 2, 3] });
  },
  closeAdd() {
    this.setData({ showAdd: false });
  },
  setAddType(e) {
    this.setData({ addType: e.currentTarget.dataset.t });
  },
  onPick(e) {
    this.setData({ [`pick[${e.currentTarget.dataset.i}]`]: Number(e.detail.value) });
  },
  async addMatch() {
    const ids = this.data.joined.map((p) => p._id);
    const p = this.data.pick;
    const doubles = this.data.addType === 'doubles';
    const teamA = doubles ? [ids[p[0]], ids[p[1]]] : [ids[p[0]]];
    const teamB = doubles ? [ids[p[2]], ids[p[3]]] : [ids[p[1]]];
    await api.call('addMatch', { eventId: this.data.id, teamA, teamB }, { loading: 'adding' });
    this.setData({ showAdd: false, tab: 'matches' });
    await this.load();
  },

  // ---------- 录分 ----------
  openScore(e) {
    const { r, m } = e.currentTarget.dataset;
    const match = this.data.rounds[r].matches[m];
    if (!match.canScore) return;
    this.setData({
      showScore: true,
      scoring: match,
      scoreA: match.status === 'done' ? String(match.scoreA) : '',
      scoreB: match.status === 'done' ? String(match.scoreB) : '',
    });
  },
  closeScore() {
    this.setData({ showScore: false });
  },
  onScore(e) {
    this.setData({ [e.currentTarget.dataset.k]: e.detail.value });
  },
  step(e) {
    const { k, d } = e.currentTarget.dataset;
    const v = Math.max(0, Math.min(99, (Number(this.data[k]) || 0) + Number(d)));
    this.setData({ [k]: String(v) });
  },
  quick(e) {
    // 一键 11 分：给另一方留着手填
    this.setData({ [e.currentTarget.dataset.k]: '11' });
  },
  async submitScore() {
    const a = Number(this.data.scoreA);
    const b = Number(this.data.scoreB);
    if (this.data.scoreA === '' || this.data.scoreB === '') return wx.showToast({ title: i18n.t('fillBoth'), icon: 'none' });
    if (a === b) return wx.showToast({ title: i18n.t('err_scoreTie'), icon: 'none' });
    const res = await api.call('submitScore', { matchId: this.data.scoring._id, scoreA: a, scoreB: b }, { loading: 'submitting' });
    this.setData({ showScore: false });
    const uid = app.globalData.user._id;
    const mine = res.changes.find((c) => c.id === uid);
    wx.showToast({ title: mine ? i18n.t('ratingChange', fmt.delta(mine.delta)) : i18n.t('recorded'), icon: 'none' });
    await this.load();
  },
  deleteMatch() {
    const m = this.data.scoring;
    modal({
      title: i18n.t('deleteMatchTitle'),
      content: i18n.t(m.status === 'done' ? 'deleteDone' : 'deletePending'),
      success: api.safe(async (r) => {
        if (!r.confirm) return;
        await api.call('deleteMatch', { matchId: m._id }, { loading: 'deleting' });
        this.setData({ showScore: false });
        this.load();
      }),
    });
  },

  // ---------- 活动管理 ----------
  manage() {
    const ev = this.data.event;
    const items = [
      { text: i18n.t('editEvent'), fn: () => wx.navigateTo({ url: '/pages/event/edit/edit?id=' + ev._id }) },
      { text: i18n.t('proxyTitle'), fn: () => this.proxySignup() },
      ev.status === 'finished'
        ? { text: i18n.t('reopen'), fn: () => this.setStatus('playing') }
        : { text: i18n.t('finishEvent'), fn: () => this.setStatus('finished') },
      { text: i18n.t('deleteEvent'), fn: () => this.removeEvent() },
    ];
    wx.showActionSheet({ itemList: items.map((i) => i.text), success: (r) => items[r.tapIndex].fn() });
  },
  async setStatus(status) {
    await api.call('updateEvent', { eventId: this.data.id, status }, { loading: 'processing' });
    await this.load();
  },
  removeEvent() {
    modal({
      title: i18n.t('deleteEvent'),
      content: i18n.t('deleteEventConfirm'),
      success: api.safe(async (r) => {
        if (!r.confirm) return;
        await api.call('deleteEvent', { eventId: this.data.id }, { loading: 'deleting' });
        wx.navigateBack();
      }),
    });
  },

  onShareAppMessage() {
    const e = this.data.event;
    return {
      title: e ? i18n.t('shareEvent', e.title, this.data.when) : i18n.t('eventFallback'),
      path: '/pages/event/detail/detail?id=' + this.data.id,
    };
  },
});
