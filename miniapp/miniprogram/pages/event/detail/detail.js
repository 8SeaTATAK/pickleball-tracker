const api = require('../../../utils/api');
const fmt = require('../../../utils/fmt');
const { predict } = require('../../../utils/predict');
const app = getApp();

const MODES = [
  { key: 'rotation', name: '双打轮转', desc: '上场次数平均，搭档和对手尽量不重复' },
  { key: 'balanced', name: '双打均衡', desc: '在轮转基础上，让两队评分尽量接近' },
  { key: 'fixed', name: '固定搭档循环', desc: '按报名顺序两两组队，队与队单循环' },
  { key: 'singles', name: '单打轮转', desc: '1v1，上场次数平均，对手尽量不重复' },
  { key: 'singlesRR', name: '单打循环', desc: '每两人之间打一场' },
];

Page({
  data: {
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
    modes: MODES,
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
    this.setData({ id: q.id });
  },

  onShow() {
    this.load();
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
      statusText: fmt.STATUS[r.event.status],
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
      await api.call('joinClub', { clubId: this.data.event.clubId }, { loading: '加入俱乐部' });
    }
    const { status } = await api.call('signup', { eventId: this.data.id }, { loading: '报名中' });
    wx.showToast({ title: status === 'joined' ? '报名成功' : '已满员，进入候补', icon: status === 'joined' ? 'success' : 'none' });
    await this.load();
  },

  cancel() {
    wx.showModal({
      title: '取消报名',
      content: '确定取消？候补的球友会自动递补。',
      success: api.safe(async (r) => {
        if (!r.confirm) return;
        await api.call('cancelSignup', { eventId: this.data.id }, { loading: '处理中' });
        this.load();
      }),
    });
  },

  tapPlayer(e) {
    const { id, name } = e.currentTarget.dataset;
    if (!this.data.isAdmin) return wx.navigateTo({ url: '/pages/player/player?id=' + id });
    wx.showActionSheet({
      itemList: ['查看资料', '取消该球员报名'],
      success: (r) => {
        if (r.tapIndex === 0) return wx.navigateTo({ url: '/pages/player/player?id=' + id });
        wx.showModal({
          title: '取消报名',
          content: `取消「${name}」的报名？`,
          success: api.safe(async (m) => {
            if (!m.confirm) return;
            await api.call('cancelSignup', { eventId: this.data.id, userId: id }, { loading: '处理中' });
            this.load();
          }),
        });
      },
    });
  },

  // 管理员代报名：从俱乐部成员里选
  async proxySignup() {
    const { members } = await api.call('getClub', { clubId: this.data.event.clubId }, { loading: '加载成员' });
    const taken = new Set([...this.data.joined, ...this.data.waitlist].map((p) => p._id));
    const candidates = members.filter((m) => !taken.has(m._id));
    if (!candidates.length) return wx.showToast({ title: '成员都已报名', icon: 'none' });
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
    const { status } = await api.call('signup', { eventId: this.data.id, userId: c._id }, { loading: '报名中' });
    wx.showToast({ title: status === 'joined' ? `已为${c.nickName}报名` : `${c.nickName}进入候补`, icon: 'none' });
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
    if (this.data.joined.length < 2) return wx.showToast({ title: '报名人数不足', icon: 'none' });
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
      const mode = MODES[this.data.modeIdx].key;
      const res = await api.call(
        'generateSchedule',
        { eventId: this.data.id, mode, rounds: Number(this.data.genRounds), courts: Number(this.data.genCourts) },
        { loading: '生成中' }
      );
      this.setData({ showGen: false, tab: 'matches' });
      wx.showToast({ title: `已生成 ${res.count} 场`, icon: 'none' });
      await this.load();
    };
    if (!pending) return run();
    wx.showModal({
      title: '重新生成',
      content: '未录入比分的对局会被替换，已完赛的保留。继续？',
      success: (r) => r.confirm && run().catch(() => {}),
    });
  },

  // ---------- 手动加一局 ----------
  openAdd() {
    if (this.data.joined.length < 2) return wx.showToast({ title: '报名人数不足', icon: 'none' });
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
    await api.call('addMatch', { eventId: this.data.id, teamA, teamB }, { loading: '添加中' });
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
    if (this.data.scoreA === '' || this.data.scoreB === '') return wx.showToast({ title: '请填写双方比分', icon: 'none' });
    if (a === b) return wx.showToast({ title: '比分不能打平', icon: 'none' });
    const res = await api.call('submitScore', { matchId: this.data.scoring._id, scoreA: a, scoreB: b }, { loading: '提交中' });
    this.setData({ showScore: false });
    const uid = app.globalData.user._id;
    const mine = res.changes.find((c) => c.id === uid);
    wx.showToast({ title: mine ? `评分 ${fmt.delta(mine.delta)}` : '已录入', icon: 'none' });
    await this.load();
  },
  deleteMatch() {
    const m = this.data.scoring;
    wx.showModal({
      title: '删除对局',
      content: m.status === 'done' ? '删除后会撤销这一局对评分的影响。确定删除？' : '确定删除这一局？',
      success: api.safe(async (r) => {
        if (!r.confirm) return;
        await api.call('deleteMatch', { matchId: m._id }, { loading: '删除中' });
        this.setData({ showScore: false });
        this.load();
      }),
    });
  },

  // ---------- 活动管理 ----------
  manage() {
    const ev = this.data.event;
    const items = [
      { text: '编辑活动', fn: () => wx.navigateTo({ url: '/pages/event/edit/edit?id=' + ev._id }) },
      { text: '代成员报名', fn: () => this.proxySignup() },
      ev.status === 'finished'
        ? { text: '重新开放', fn: () => this.setStatus('playing') }
        : { text: '结束活动', fn: () => this.setStatus('finished') },
      { text: '删除活动', fn: () => this.removeEvent() },
    ];
    wx.showActionSheet({ itemList: items.map((i) => i.text), success: (r) => items[r.tapIndex].fn() });
  },
  async setStatus(status) {
    await api.call('updateEvent', { eventId: this.data.id, status }, { loading: '处理中' });
    await this.load();
  },
  removeEvent() {
    wx.showModal({
      title: '删除活动',
      content: '报名和未完赛对局会一起删除。',
      success: api.safe(async (r) => {
        if (!r.confirm) return;
        await api.call('deleteEvent', { eventId: this.data.id }, { loading: '删除中' });
        wx.navigateBack();
      }),
    });
  },

  onShareAppMessage() {
    const e = this.data.event;
    return {
      title: e ? `${e.title} · ${this.data.when} 报名中` : '匹克球活动',
      path: '/pages/event/detail/detail?id=' + this.data.id,
    };
  },
});
