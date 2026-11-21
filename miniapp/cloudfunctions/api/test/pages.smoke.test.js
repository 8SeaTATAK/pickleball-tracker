// 前端页面冒烟测试：用假的 wx / Page / App 全局跑真实页面代码，
// wx.cloud.callFunction 直接接到云函数 router + 内存数据库。
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { createMockDb } = require('./mockdb');
const { dispatch } = require('../router');

const MP = path.join(__dirname, '../../../miniprogram');

function setupEnv() {
  const db = createMockDb();
  const env = { openid: 'o_owner', nav: [], toasts: [], modalConfirm: true, sheetIndex: 0 };
  let t = Date.now();
  global.wx = {
    cloud: {
      init() {},
      callFunction: async ({ data }) => ({
        result: await dispatch({ db, _: db.command, openid: env.openid, now: () => (t += 1000) }, data),
      }),
      uploadFile: async () => ({ fileID: 'cloud://avatar.jpg' }),
    },
    showToast: (o) => env.toasts.push(o.title),
    showLoading() {},
    hideLoading() {},
    stopPullDownRefresh() {},
    setNavigationBarTitle() {},
    setClipboardData() {},
    navigateTo: (o) => env.nav.push(o.url),
    redirectTo: (o) => env.nav.push(o.url),
    switchTab: (o) => env.nav.push(o.url),
    navigateBack: () => env.nav.push('back'),
    showModal: (o) => o.success && o.success({ confirm: env.modalConfirm }),
    showActionSheet: (o) => o.success && o.success({ tapIndex: env.sheetIndex }),
    nextTick: (fn) => fn(),
    createSelectorQuery: () => ({ in() { return this; }, select() { return this; }, fields() { return this; }, exec: (cb) => cb([null]) }),
  };
  let appInst;
  global.App = (cfg) => (appInst = cfg);
  global.getApp = () => appInst;
  delete require.cache[require.resolve(path.join(MP, 'app.js'))];
  require(path.join(MP, 'app.js'));
  appInst.onLaunch();

  const setPath = (obj, p, v) => {
    const keys = p.replace(/\[(\d+)\]/g, '.$1').split('.');
    let o = obj;
    keys.slice(0, -1).forEach((k) => (o = o[k]));
    o[keys[keys.length - 1]] = v;
  };
  const open = (page, query = {}) => {
    let cfg;
    global.Page = (c) => (cfg = c);
    const file = path.join(MP, page + '.js');
    Object.keys(require.cache).filter((k) => k.startsWith(path.join(MP, 'pages'))).forEach((k) => delete require.cache[k]);
    require(file);
    const inst = Object.create(cfg);
    inst.data = JSON.parse(JSON.stringify(cfg.data || {}));
    inst.setData = function (patch, cb) {
      Object.entries(patch).forEach(([k, v]) => setPath(this.data, k, v));
      if (cb) cb();
    };
    inst.query = query;
    return inst;
  };
  const as = (openid) => {
    env.openid = openid;
    appInst.globalData.user = null;
    appInst._login = null;
  };
  // 等异步回调里的 promise（showModal success 是 async）跑完
  const flush = () => new Promise((r) => setTimeout(r, 20));
  return { db, env, open, as, flush, app: appInst };
}

const ev = (dataset, value) => ({ currentTarget: { dataset }, detail: { value } });

test('页面冒烟：首页 → 建俱乐部 → 发活动 → 报名 → 生成对阵 → 录分 → 个人页', async () => {
  const { env, open, as, flush } = setupEnv();

  // 首页（空状态）
  let home = open('pages/index/index');
  await home.load();
  assert.strictEqual(home.data.clubs.length, 0);
  assert.ok(home.data.user.doublesText.startsWith('3.500'));

  // 建俱乐部
  const ce = open('pages/club/edit/edit');
  await ce.onLoad({});
  ce.onInput(ev({ k: 'name' }, '测试俱乐部'));
  await ce.save();
  const clubUrl = env.nav.pop();
  const clubId = clubUrl.split('id=')[1];
  assert.ok(clubId);

  // 俱乐部页：加 7 个临时球员
  const cd = open('pages/club/detail/detail');
  cd.onLoad({ id: clubId });
  await cd.load();
  assert.strictEqual(cd.data.myRole, 'owner');
  for (let i = 0; i < 7; i++) {
    cd.openGuest();
    cd.onGuestName(ev({}, '球友' + i));
    cd.onGuestLevel(ev({}, String(1 + (i % 6))));
    await cd.addGuest();
  }
  await cd.load();
  assert.strictEqual(cd.data.members.length, 8);

  // 设置页：修改积分规则
  const se = open('pages/club/edit/edit');
  await se.onLoad({ id: clubId });
  se.onInput(ev({ k: 'winPoints' }, '2'));
  await se.save();
  assert.strictEqual(env.nav.pop(), 'back');

  // 发活动
  cd.newEvent();
  const ee = open('pages/event/edit/edit');
  await ee.onLoad({ clubId });
  ee.onInput(ev({ k: 'title' }, '周六局'));
  ee.onInput(ev({ k: 'capacity' }, '8'));
  await ee.save();
  const eventId = env.nav.pop().split('id=')[1];

  // 活动页：本人报名 + 代报名 7 人
  const ed = open('pages/event/detail/detail');
  ed.onLoad({ id: eventId });
  await ed.load();
  await ed.signup();
  for (let i = 0; i < 7; i++) {
    await ed.proxySignup();
    await ed.confirmProxy();
  }
  await ed.load();
  assert.strictEqual(ed.data.joined.length, 8);

  // 生成对阵（均衡模式，2 场 4 轮）
  ed.openGen();
  ed.pickMode(ev({ i: 1 }));
  ed.onGenInput(ev({ k: 'genRounds' }, '4'));
  await ed.generate();
  await ed.load();
  assert.strictEqual(ed.data.totalCount, 8);
  assert.strictEqual(ed.data.rounds.length, 4);
  assert.strictEqual(ed.data.tab, 'matches');
  assert.match(ed.data.rounds[0].matches[0].prediction, /^\d+:\d+$/);

  // 录分
  ed.openScore(ev({ r: '0', m: '0' }));
  assert.ok(ed.data.showScore);
  ed.quick(ev({ k: 'scoreA' }));
  ed.onScore(ev({ k: 'scoreB' }, '6'));
  ed.step(ev({ k: 'scoreB', d: '1' }));
  assert.strictEqual(ed.data.scoreB, '7');
  await ed.submitScore();
  await ed.load();
  const m0 = ed.data.rounds[0].matches[0];
  assert.strictEqual(m0.status, 'done');
  assert.strictEqual(m0.scoreA, 11);
  assert.ok(m0.teamA[0].deltaText.startsWith('+'));
  assert.strictEqual(ed.data.doneCount, 1);
  assert.strictEqual(ed.data.standings[0].score, 2, '胜场分已改为 2');

  // 重新生成：已完赛保留
  ed.openGen();
  ed.pickMode(ev({ i: 0 }));
  await ed.generate();
  await flush();
  await ed.load();
  assert.strictEqual(ed.data.doneCount, 1);
  assert.ok(ed.data.totalCount > 1);

  // 手动加单打
  ed.openAdd();
  ed.setAddType(ev({ t: 'singles' }));
  ed.onPick(ev({ i: '1' }, '3'));
  await ed.addMatch();
  await ed.load();

  // 积分榜
  await cd.load();
  cd.switchPeriod(ev({ p: 'week' }));
  await flush();
  assert.ok(cd.data.board.length === 4);

  // 个人页：设置水平失败（已有比赛）—— 本人参赛了吗？用新用户测
  const me = open('pages/profile/profile');
  me.onLoad({});
  await me.load();
  assert.ok(me.data.self);
  me.switchTab(ev({ tab: 'singles' }));
  await me.saveName({ detail: { value: '新名字' } });
  assert.strictEqual(me.data.user.nickName, '新名字');
  await me.onChooseAvatar({ detail: { avatarUrl: '/tmp/a.jpg' } });
  assert.strictEqual(me.data.user.avatarUrl, 'cloud://avatar.jpg');

  // 新用户：从分享进入活动页 → 一键加入俱乐部并报名（满员进候补）
  as('o_new');
  const ed2 = open('pages/event/detail/detail');
  ed2.onLoad({ id: eventId });
  await ed2.load();
  assert.strictEqual(ed2.data.myRole, null);
  await ed2.signup();
  await ed2.load();
  assert.strictEqual(ed2.data.mySignup, 'waitlist');

  const p2 = open('pages/profile/profile');
  await p2.load();
  assert.ok(p2.data.canLevel);
  await p2.onLevel(ev({}, '4'));
  assert.strictEqual(p2.data.blocks.doubles.ratingText, '4.000');

  // 查看他人
  const pl = open('pages/player/player');
  pl.onLoad({ id: m0.teamA[0]._id });
  await pl.load();
  assert.ok(!pl.data.self);
  assert.strictEqual(pl.data.matches.length, 1);
  assert.ok(pl.data.matches[0].won);

  // 规则页
  const rules = open('pages/rules/rules');
  assert.strictEqual(rules.data.rows[0].score, '11:11');

  // 首页（新用户）
  home = open('pages/index/index');
  await home.load();
  assert.strictEqual(home.data.clubs.length, 1);
  assert.strictEqual(home.data.events[0].signText, '候补中');

  // 删除活动应因有完赛记录被拒绝
  as('o_owner');
  const ed3 = open('pages/event/detail/detail');
  ed3.onLoad({ id: eventId });
  await ed3.load();
  env.toasts.length = 0;
  ed3.removeEvent();
  await flush();
  assert.ok(env.toasts.some((x) => /不能删除/.test(x)), env.toasts.join());
});
