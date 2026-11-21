// 匹克球助手 · 网页交互预览
// 评分 / 对阵 / 积分榜 / 多语言 / 格式化 都直接用小程序的真实代码（构建时打包进来），
// 这里只负责模拟页面和本地数据。数据存在浏览器 localStorage，不连云端。
const R = __req('rating');
const S = __req('schedule');
const { aggregate } = __req('stats');
const i18n = __req('i18n');
const fmt = __req('fmt');
const { predict } = __req('predict');
const PR = __req('profileRules');

const ME = 'me';
const STORE = 'pp_state_v19';
const DAY = 86400000;

// 预览专用文案
const PX = {
  banner: ['预览版 · 演示数据只存在这个浏览器里', 'Preview · demo data stays in this browser', 'Bản xem trước · dữ liệu mẫu chỉ lưu trong trình duyệt này', 'Pratonton · data demo disimpan dalam pelayar ini'],
  reset: ['重置', 'Reset', 'Đặt lại', 'Set semula'],
  notInPreview: ['预览版暂不支持这个操作', 'Not available in the preview', 'Bản xem trước chưa hỗ trợ thao tác này', 'Tidak tersedia dalam pratonton'],
  resetDone: ['已恢复演示数据', 'Demo data restored', 'Đã khôi phục dữ liệu mẫu', 'Data demo dipulihkan'],
};
const px = (k) => PX[k][i18n.LANGS.indexOf(i18n.getLang())];
const f = (s, ...a) => i18n.format(s, a);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------------- 演示数据 ----------------
// [id, 昵称, 真实水平(用于模拟比分), 自评起始水平, 临时球员]
const PEOPLE = [
  [ME, 'Victor', 3.6, 3.5],
  ['wei', '张伟', 4.3, 4.0],
  ['lin', '小林', 3.2, 3.0],
  ['alice', 'Alice', 3.9, 4.0],
  ['ben', 'Ben', 3.4, 3.5],
  ['minh', 'Minh Trần', 4.0, 4.0],
  ['linh', 'Linh Nguyễn', 3.3, 3.0],
  ['aiman', 'Aiman', 3.8, 3.5],
  ['nurul', 'Nurul', 3.0, 3.0],
  ['emily', 'Emily', 3.5, 3.5],
  ['chen', '陈老师', 4.6, 4.5, true],
  ['sarah', 'Sarah', 2.8, 2.5, true],
  ['tom', 'Tom', 3.5, 3.5],
  ['huong', 'Hương', 3.2, 3.0],
];
const FEMALE = ['alice', 'linh', 'nurul', 'emily', 'sarah', 'huong'];
const NON_MEMBERS = ['tom', 'huong']; // 只来过公开比赛的球友
const COLORS = ['#216b43', '#b95c30', '#3c6e9c', '#7b5aa6', '#a0722a', '#2f8a83', '#a64b6b', '#58753a'];

function seed() {
  const rand = S.mulberry32(20261121);
  const truth = {};
  const now = Date.now();
  const st = { users: {}, clubs: [], members: [], events: [], signups: [], matches: [], history: [], invites: [], seq: 1 };
  PEOPLE.forEach(([id, name, real, lv, guest], i) => {
    truth[id] = real;
    const blk = () => ({ rating: lv, games: 0, wins: 0, losses: 0 });
    const PB = { [ME]: { type: 'self', value: 3.5 }, minh: { type: 'dupr', value: 4.052 }, chen: { type: 'dupr', value: 4.618 }, wei: { type: 'self', value: 4.0 }, alice: { type: 'dupr', value: 3.874 }, lin: { type: 'self', value: 3.0 }, aiman: { type: 'self', value: 3.5 }, sarah: { type: 'self', value: 2.5 } };
    const pbLevel = PB[id] || null;
    st.users[id] = { _id: id, pbLevel, nickName: name, gender: FEMALE.includes(id) ? 'f' : 'm', avatarUrl: '', guest: !!guest, color: COLORS[i % COLORS.length], doubles: blk(), singles: blk() };
  });
  st.clubs.push(
    { _id: 'c1', name: 'North Ryde Pickleball', city: 'Sydney', inviteCode: 'NR7K2P', intro: '每周六上午 Tennis World North Ryde · Saturday mornings, all levels welcome', venue: { name: 'Tennis World North Ryde', city: 'Sydney' }, payId: 'treasurer@example.com', settings: { winPoints: 3, lossPoints: 1, currency: 'A$' } },
    { _id: 'c3', name: 'Ryde Elite 内部队', city: 'Sydney', inviteCode: 'RE3X9Q', intro: '4.0+ 内部训练和对抗，仅会员可见 · Members-only training for 4.0+', venue: { name: 'Ryde Leisure Centre', city: 'Sydney' }, private: true, settings: { winPoints: 3, lossPoints: 1, currency: 'A$' } },
    { _id: 'c2', name: 'Macquarie Park 夜场', city: 'Sydney', inviteCode: 'MQ4H8D', intro: '', settings: { winPoints: 3, lossPoints: 1, currency: 'A$' } }
  );
  PEOPLE.filter(([id]) => !NON_MEMBERS.includes(id)).forEach(([id]) => st.members.push({ clubId: 'c1', userId: id, role: id === ME ? 'owner' : id === 'wei' ? 'admin' : 'member' }));
  st.members.forEach((m, i) => (m.joinedAt = now - (720 - i * 47) * DAY));
  Object.assign(st.clubs.find((c) => c._id === 'c2'), { adminPerms: { money: false, certify: false }, joinMode: 'review', applications: [{ userId: 'nurul', at: now - 3 * DAY }] });
  Object.assign(st.users.chen, { premium: true, premiumUntil: now + 200 * DAY });
  st.clubs.find((c) => c._id === 'c3').shopEnabled = true;
  Object.assign(st.clubs[0], { shopEnabled: false, short: 'NRP', joinMode: 'review', inviteWho: 'admins', views: 267, visitors: 36, notice: '本周六 9 点开打，请提前 10 分钟到场热身 · Warm up 10 min before 9am', applications: [{ userId: 'tom', at: now - 2 * DAY }, { userId: 'huong', at: now - DAY }] });
  const CERT = { wei: 4.0, chen: 4.5, lin: 3.0, ben: 3.5 };
  st.members.filter((m) => m.clubId === 'c1' && CERT[m.userId]).forEach((m) => (m.cert = { value: CERT[m.userId], by: ME, at: now - 60 * DAY }));
  ['chen', 'wei', 'minh'].forEach((id, i) => st.members.push({ clubId: 'c3', userId: id, role: i === 0 ? 'owner' : 'member', joinedAt: now - 300 * DAY }));
  [ME, 'alice', 'ben', 'aiman', 'emily'].forEach((id) => st.members.push({ clubId: 'c2', userId: id, role: id === 'alice' ? 'owner' : id === ME ? 'admin' : 'member', joinedAt: now - 200 * DAY }));

  const at9 = (ts) => {
    const d = new Date(ts);
    d.setHours(9, 0, 0, 0);
    return d.getTime();
  };
  const daysToSat = (6 - new Date(now).getDay() + 7) % 7 || 7;
  const nextSat = at9(now + daysToSat * DAY);

  // 过去 8 个周六：每次 6 轮 × 2 片场，比分按真实水平逐分模拟
  for (let k = 8; k >= 1; k--) {
    const start = nextSat - 7 * k * DAY;
    const ev = newEvent(st, start, 'finished', k % 3 === 0 ? 'wei' : ME);
    ev.visibility = k === 1 ? 'public' : 'club';
    const players = Object.keys(st.users).filter((id) => (k === 1 || !NON_MEMBERS.includes(id)) && rand() > 0.12);
    players.forEach((p, i) => st.signups.push({ eventId: ev._id, userId: p, status: 'joined', createdAt: start - DAY + i }));
    ev.joinedCount = players.length;
    const plan = S.rotation(players, { courts: 2, rounds: 6, seed: 100 + k });
    for (const r of plan.rounds) {
      for (const g of r.games) {
        const m = addMatchDoc(st, ev, r.round, g.court, g.teamA, g.teamB);
        const pa = R.expectedShare(avg(g.teamA.map((p) => truth[p])), avg(g.teamB.map((p) => truth[p])));
        let a = 0;
        let b = 0;
        while (!((a >= 11 || b >= 11) && Math.abs(a - b) >= 2)) rand() < pa ? a++ : b++;
        applyScore(st, m, a, b, start + (r.round - 1) * 18 * 60000, r.rest.includes(ME) && rand() < 0.7 ? ME : g.teamA[0]);
      }
    }
  }
  // 过去的活动都已 AA 收款并付清
  st.events.filter((e) => e.status === 'finished').forEach((e) => {
    const ids = st.signups.filter((x) => x.eventId === e._id && x.status === 'joined').map((x) => x.userId);
    const total = 120;
    const per = Math.round((total / ids.length) * 100) / 100;
    e.bill = { mode: 'aa', total, payId: 'treasurer@example.com', sentAt: e.endTime, amounts: Object.fromEntries(ids.map((id) => [id, per])), items: Object.fromEntries(ids.map((id) => [id, 'paid'])) };
  });
  // 下周六：报名中，9 人已报，你还没报
  const up = newEvent(st, nextSat, 'open');
  Object.keys(st.users)
    .filter((id) => id !== ME && !['nurul', 'sarah'].includes(id))
    .forEach((id, i) => st.signups.push({ eventId: up._id, userId: id, status: 'joined', createdAt: now - DAY + i }));
  up.visibility = 'public';
  up.joinedCount = st.signups.filter((x) => x.eventId === up._id).length;
  const notes = { wei: '#attack', lin: '#casual', alice: '#defend', minh: '#attack', linh: '#late', emily: '#casual' };
  st.signups.filter((x) => x.eventId === up._id && notes[x.userId]).forEach((x) => (x.note = notes[x.userId]));
  // 积分商城（俱乐部内部）：演示商品
  st.mall = {
    c1: [
      { id: 'i1', key: 'item_balls', icon: 'pickleball', pts: 50, stock: 12 },
      { id: 'i2', key: 'item_grip', icon: 'paddle', pts: 30, stock: 20 },
      { id: 'i3', key: 'item_edge', icon: 'paddle', pts: 40, stock: 8 },
      { id: 'i4', key: 'item_bottle', icon: 'club', pts: 80, stock: 6 },
      { id: 'i5', key: 'item_tee', icon: 'trophy', pts: 150, stock: 10 },
      { id: 'i6', key: 'item_paddle', icon: 'paddle', pts: 600, stock: 2 },
    ],
  };
  st.redemptions = [
    { id: 'r1', clubId: 'c1', userId: 'wei', itemId: 'i2', pts: 30, at: now - 20 * DAY, status: 'done' },
    { id: 'r2', clubId: 'c1', userId: 'lin', itemId: 'i1', pts: 50, at: now - 5 * DAY, status: 'pending' },
  ];
  return st;
}

function newEvent(st, start, status, creatorId) {
  const ev = {
    creatorId: creatorId || ME,
    views: 40 + ((start / 60000) % 260),
    mode: status === 'open' ? '' : 'rotation',
    target: 11,
    _id: 'e' + st.seq++,
    clubId: 'c1',
    title: 'Saturday Doubles 周六双打',
    location: 'Tennis World North Ryde · Ct5–6',
    courtNote: 'Ct5–6',
    note: 'Bring water 自带水 · AA via PayID',
    startTime: start,
    endTime: start + 2 * 3600000,
    courts: 2,
    capacity: 12,
    fee: 0,
    feeMode: 'aa',
    visibility: 'club',
    allowGuests: true,
    autoUmpire: true,
    status,
    joinedCount: 0,
  };
  st.events.push(ev);
  return ev;
}

function addMatchDoc(st, ev, round, court, teamA, teamB) {
  const m = {
    _id: 'm' + st.seq++,
    eventId: ev._id,
    clubId: ev.clubId,
    round,
    court,
    type: teamA.length === 1 ? 'singles' : 'doubles',
    teamA,
    teamB,
    players: [...teamA, ...teamB],
    status: 'pending',
  };
  st.matches.push(m);
  return m;
}

const avg = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const clampR = (v) => Math.min(R.MAX_RATING, Math.max(R.MIN_RATING, v));

// 与云函数 submitScore / deleteMatch 相同：已完赛的先回滚再重算
function revert(st, m) {
  const aWon = m.scoreA > m.scoreB;
  for (const c of m.ratingChanges || []) {
    const b = st.users[c.id][m.type];
    const won = m.teamA.includes(c.id) ? aWon : !aWon;
    b.rating = R.round3(clampR(b.rating - c.delta));
    b.games = Math.max(0, b.games - 1);
    if (won) b.wins = Math.max(0, b.wins - 1);
    else b.losses = Math.max(0, b.losses - 1);
  }
  st.history = st.history.filter((h) => h.matchId !== m._id);
}

function applyScore(st, m, a, b, at, by) {
  if (m.status === 'done') revert(st, m);
  const side = (team) => team.map((id) => ({ id, rating: st.users[id][m.type].rating, games: st.users[id][m.type].games }));
  const r = R.rateMatch({ teamA: side(m.teamA), teamB: side(m.teamB), scoreA: a, scoreB: b });
  for (const c of r.changes) {
    const blk = st.users[c.id][m.type];
    const won = m.teamA.includes(c.id) ? a > b : b > a;
    blk.rating = c.after;
    blk.games++;
    if (won) blk.wins++;
    else blk.losses++;
  }
  const when = m.playedAt || at || Date.now();
  Object.assign(m, { scoreA: a, scoreB: b, status: 'done', ratingChanges: r.changes, playedAt: when, recordedBy: by || ME });
  r.changes.forEach((c) => st.history.push({ userId: c.id, matchId: m._id, type: m.type, before: c.before, after: c.after, delta: c.delta, at: when }));
  return r;
}

// ---------------- 状态 ----------------
let st;
try {
  st = JSON.parse(localStorage.getItem(STORE));
} catch (e) {}
if (!st || !st.users) st = seed();
const save = () => {
  try {
    localStorage.setItem(STORE, JSON.stringify(st));
  } catch (e) {}
};

const ui = { tab: 'home', stack: [], clubTab: 'events', period: 'all', eventTab: null, ptype: 'doubles', sheet: null };
const top = () => ui.stack[ui.stack.length - 1];
const go = (v) => {
  ui.stack.push(v);
  render();
};

const memberOf = (clubId, uid) => st.members.find((m) => m.clubId === clubId && m.userId === uid);
const isAdmin = (clubId) => ['owner', 'admin'].includes((memberOf(clubId, ME) || {}).role);
// VIP：¥99/年；只有会长是 VIP 才能为俱乐部开通积分商城；普通用户最多建 1 个俱乐部，VIP 最多 3 个
const isVip = (u) => !!u.premium && (!u.premiumUntil || u.premiumUntil > Date.now());
const shopOn = (clubId) => !!(clubOf(clubId) || {}).shopEnabled;
const isOwner = (clubId) => (memberOf(clubId, ME) || {}).role === 'owner';
// 权限：会长全部；副会长按俱乐部设置的「副会长权限」（默认全开）
const PERMS = ['events', 'scores', 'members', 'certify', 'money', 'shop'];
const can = (clubId, perm) => {
  const role = (memberOf(clubId, ME) || {}).role;
  if (role === 'owner') return true;
  if (role !== 'admin') return false;
  const ap = (clubOf(clubId) || {}).adminPerms || {};
  return ap[perm] !== false;
};
// 俱乐部头像：有 Logo 用 Logo，否则用首字
function clubAvatar(c, cls = '') {
  if (c.logo) return `<div class="avatar ${cls}"><img src="${c.logo}" alt=""></div>`;
  return `<div class="avatar ${cls}" style="background:var(--btn)">${esc(c.name[0])}</div>`;
}
const clubOf = (id) => st.clubs.find((c) => c._id === id);
const eventOf = (id) => st.events.find((e) => e._id === id);
const joinedOf = (eid) => st.signups.filter((s) => s.eventId === eid && s.status === 'joined').sort((a, b) => a.createdAt - b.createdAt);
const waitOf = (eid) => st.signups.filter((s) => s.eventId === eid && s.status === 'waitlist').sort((a, b) => a.createdAt - b.createdAt);
const currency = (clubId) => (clubOf(clubId).settings.currency || 'A$');

function avatar(u, cls = '') {
  if (u.avatarUrl) return `<div class="avatar ${cls}"><img src="${u.avatarUrl}" alt=""></div>`;
  return `<div class="avatar ${cls}" style="background:${u.color}">${esc(u.nickName[0])}</div>`;
}

// ---------------- 页面 ----------------
// 首页：比赛 / 活动 / 俱乐部
function viewHome(t) {
  const tab = ui.homeTab || 'comps';
  const tabs = `<div class="tabs line">${[['comps', t.statGames], ['sessions', t.tabEvents], ['clubs', t.homeTabClubs]]
    .map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="homeTab" data-k="${k}">${l}</button>`)
    .join('')}</div>`;
  const mine = (e) => e.creatorId === ME || st.signups.some((x) => x.eventId === e._id && x.userId === ME && x.status !== 'cancelled');
  if (tab === 'comps') {
    const comps = st.events
      .filter((e) => st.matches.some((m) => m.eventId === e._id) && (mine(e) || st.matches.some((m) => m.eventId === e._id && (m.players.includes(ME) || m.recordedBy === ME))))
      .sort((a, b) => b.startTime - a.startTime);
    return `${tabs}
    <div class="row between" style="padding:0 4px"><span class="bold">${t.recentComps}</span><button class="link muted" data-act="myMatches">${f(t.historyComps, comps.length)}</button></div>
    <div class="card row" data-act="formats" data-mode="rotation" role="button" tabindex="0" style="cursor:pointer;gap:10px"><span class="mall-ic sm">${ICONS.formats}</span><span class="grow">${t.featureNew} <span class="hi" style="font-size:12px">new</span></span><span class="arrow">›</span></div>
    ${comps.length ? comps.slice(0, 3).map((e) => eventCard(t, e)).join('') : `<div class="card empty">${t.noMyMatchEvents}</div>`}`;
  }
  if (tab === 'sessions') {
    const evs = st.events.filter(mine).sort((a, b) => (b.endTime >= Date.now()) - (a.endTime >= Date.now()) || (a.endTime >= Date.now() ? a.startTime - b.startTime : b.startTime - a.startTime));
    if (!evs.length) {
      return `${tabs}<div class="card empty-big">
        <div class="muted">${t.noMySessions}</div>
        <button class="btn" data-act="launch">${t.launchSession}</button>
        <div class="divider-label"><span>${t.features}</span></div>
        <ol class="feat">${[1, 2, 3, 4].map((n) => `<li>${t['feat_' + n]}</li>`).join('')}</ol>
        <div class="lv-links"><button class="link" data-act="homeTab" data-k="clubs">${t.linkClubSessions}</button><button class="link" data-act="guide" data-topic="start">${t.menu_guide}</button></div>
      </div>`;
    }
    return `${tabs}${evs.slice(0, 8).map((e) => eventCard(t, e)).join('')}
    <button class="link center" data-act="myEvents" style="width:100%">${f(t.historySessions, evs.length)}</button>`;
  }
  const myClubs = st.members.filter((m) => m.userId === ME).map((m) => ({ c: clubOf(m.clubId), role: m.role })).filter((x) => x.c);
  const card = ({ c, role }) => {
    const ownerM = st.members.find((m) => m.clubId === c._id && m.role === 'owner');
    const owner = ownerM && st.users[ownerM.userId];
    const mem = st.members.filter((m) => m.clubId === c._id).map((m) => st.users[m.userId]).filter(Boolean);
    const men = mem.filter((u) => u.gender !== 'f').length;
    return `<div class="card club-card" data-act="club" data-id="${c._id}" role="button" tabindex="0">
      <div class="club-owner">${owner ? avatar(owner, 'sm') : clubAvatar(c, 'sm')}<span class="muted">${fmt.role('owner')}</span><span class="ellipsis">${owner ? esc(owner.nickName) : ''}</span></div>
      <div class="grow" style="min-width:0">
        <div class="ellipsis"><span class="bold">${esc(c.name)}</span>${role ? `<span class="tag">${fmt.role(role)}</span>` : ''}${c.private ? ` <span class="tag gray">🔒</span>` : ''}</div>
        ${c.venue ? `<div class="muted ellipsis">📍 ${esc(c.venue.name)}</div>` : ''}
        <div class="muted num"><span class="sex m">♂</span> ${men}　<span class="sex f">♀</span> ${mem.length - men}</div>
      </div></div>`;
  };
  const others = st.clubs.filter((c) => !memberOf(c._id, ME));
  return `${tabs}${myClubs.length ? myClubs.map(card).join('') : `<div class="card empty">${t.noClubs}</div>`}
  ${others.length ? `<div class="section-title">${t.otherClubs}</div>${others.map((c) => card({ c, role: null })).join('')}` : ''}
  <div class="btn-row"><button class="btn" data-act="createClubTry">${t.createClub}</button><button class="btn ghost" data-act="na">${t.joinByCode}</button></div>`;
}

// 付费特权（功能对比；价格待定，暂不开放）
function viewPremium(t) {
  const u = st.users[ME];
  const vip = isVip(u);
  const mark = (v) => (v === true ? '<span class="ok">✓</span>' : v === false ? '<span class="muted">×</span>' : `<span>${v}</span>`);
  const rows = [
    ['pf_basic', true, true],
    ['pf_clubs', f(t.clubsN, 1), f(t.clubsN, 3)],
    ['pf_shop', false, true],
    ['pf_stats', false, true],
    ['pf_formats', false, true],
    ['pf_edit', false, true],
    ['pf_noLimit', false, true],
  ];
  return `<div class="card center"><span>${esc(f(t.currentPlan, ''))}</span><b class="hi">${vip ? 'VIP' : t.planFree}</b>
    ${vip ? `<div class="muted">${esc(f(t.vipActive, fmt.date(u.premiumUntil)))}</div>` : `<div style="margin-top:10px"><button class="btn" data-act="becomeVip">${t.upgradeSim}</button></div>`}</div>
  <div class="card"><div class="table">
    <div class="tr th"><span class="name">${t.colFeature}</span><span class="c w">${t.planFree}</span><span class="c w">VIP</span></div>
    ${rows.map(([k, a, b]) => `<div class="tr" style="cursor:default"><span class="name" style="white-space:normal">${t[k]}</span><span class="c w">${mark(a)}</span><span class="c w">${mark(b)}</span></div>`).join('')}
    <div class="tr" style="cursor:default"><span class="name muted">…</span><span class="muted" style="flex:1;text-align:center">${t.pf_more}</span></div>
    <div class="tr" style="cursor:default"><span class="name">${t.priceRow}</span><span class="c w">${t.feeFree}</span><span class="c w hi">${t.priceVip}</span></div>
  </div><div class="muted" style="margin-top:10px">${t.vipNote}</div></div>`;
}

// 反馈（小程序里用微信自带的反馈页）
function viewFeedback(t) {
  const type = ui.fbType;
  if (!type)
    return `<div class="card flush">${['bug', 'idea'].map((k) => `<button class="li" data-act="fbType" data-k="${k}"><span class="grow"><div class="bold">${t['fb_' + k]}</div><div class="muted">${t['fb_' + k + '_d']}</div></span><span class="arrow">›</span></button>`).join('')}</div>
    <div class="muted" style="padding:0 4px">${t.fbNote}</div>`;
  return `<div class="card"><div class="bold">${t['fb_' + type]}</div><textarea id="fbText" class="note-input" rows="6" maxlength="200" placeholder="${t.fbPh}" style="width:100%;margin-top:10px"></textarea></div>
  <button class="btn" data-act="fbSend">${t.submit}</button>`;
}

// ---------------- 俱乐部：主页 / 动态 / 排行榜 / 我 ----------------
function clubEvents(id) {
  return st.events.filter((e) => e.clubId === id).sort((a, b) => b.startTime - a.startTime);
}
// 活跃度：每参加一次活动 / 比赛 +10
function activityScores(id, since, membersOnly) {
  const ids = new Set(clubEvents(id).filter((e) => e.startTime >= since && e.startTime <= Date.now()).map((e) => e._id));
  const sc = {};
  st.signups.filter((x) => ids.has(x.eventId) && x.status === 'joined').forEach((x) => (sc[x.userId] = (sc[x.userId] || 0) + 10));
  return Object.entries(sc)
    .filter(([u]) => st.users[u] && (!membersOnly || memberOf(id, u)))
    .map(([u, v]) => ({ u, v }))
    .sort((a, b) => b.v - a.v);
}

// 实力：DUPR 优先，其次俱乐部比赛评分（打满 6 局），最后自评
function strengthOf(u, clubId) {
  const pb = u.pbLevel;
  const m = clubId && memberOf(clubId, u._id);
  const cert = m && m.cert ? { type: 'cert', value: Number(m.cert.value) } : null;
  const club = u.doubles.games >= 6 ? { type: 'club', value: u.doubles.rating } : null;
  const dupr = pb && pb.type === 'dupr' ? { type: 'dupr', value: Number(pb.value) } : null;
  const self = pb && pb.type === 'self' ? { type: 'self', value: Number(pb.value) } : null;
  return { main: cert || dupr || club || self, all: [cert, dupr, club, self].filter(Boolean) };
}
function strengthTag(t, x) {
  const label = { cert: t.tagCert, dupr: 'DUPR', club: t.tagClubRating, self: t.pbSelf }[x.type];
  const digits = x.type === 'self' || x.type === 'cert' ? 1 : 3;
  return `<span class="num bold">${x.value.toFixed(digits)}</span><span class="tag ${x.type === 'cert' ? 'cert' : x.type === 'dupr' ? '' : x.type === 'club' ? 'clay' : 'gray'}">${label}</span>`;
}

function clubHome(t, c, role, admin) {
  const hidden = c.private && !role;
  const mem = st.members.filter((m) => m.clubId === c._id).map((m) => st.users[m.userId]).filter(Boolean);
  const evs = clubEvents(c._id);
  const comps = evs.filter((e) => st.matches.some((m) => m.eventId === e._id));
  const active = activityScores(c._id, 0, false).reduce((x, y) => x + y.v, 0);
  const owner = st.users[(st.members.find((m) => m.clubId === c._id && m.role === 'owner') || {}).userId];
  const men = mem.filter((u) => u.gender !== 'f').length;
  const v = c.venue;
  const map = v ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([v.name, v.city].filter(Boolean).join(' ')) : '';
  const iAmOwner = isOwner(c._id);
  const stat = (label, val, act) => `<button class="stat" ${act ? `data-act="${act}"` : 'disabled'}><span class="muted">${label}</span><b class="num">${val}</b></button>`;
  return `
  ${c.notice && !hidden ? `<div class="notice">📢 ${esc(c.notice)}</div>` : ''}
  <div class="card info-card">
    <div class="row between"><div class="row" style="gap:10px">${clubAvatar(c)}<div class="bold ev-title">${esc(c.name)}${c.private ? ` <span class="tag gray">🔒 ${t.privateClub}</span>` : ''}</div></div><div class="row" style="gap:6px">${isAdmin(c._id) ? `<button class="btn mini" data-act="clubAdmin">🛠 ${t.manage}</button>` : ''}<button class="qr-btn" data-act="clubQr" aria-label="${t.linkQr}">${QR_ICON}</button></div></div>
    ${v ? `<a class="irow" href="${map}" target="_blank" rel="noopener"><span class="ii">📍</span><span class="grow">${esc(f(t.venueLine, v.name))}</span><span class="arrow">›</span></a>` : ''}
    <div class="irow"><span class="ii">👁</span><span class="grow">${esc(f(t.viewsLineClub, c.visitors || 1, c.views || 1))}</span></div>
    <div class="irow"><span class="ii">ℹ️</span><span class="grow">${esc(f(t.introLine, c.intro || t.noIntroYet))}</span>${iAmOwner ? `<button class="link" data-act="clubSettings" aria-label="${t.clubSettings}">✎</button>` : ''}</div>
    ${c.phone || c.wechat ? `<div class="irow"><span class="ii">☎️</span><span class="grow">${esc(f(t.contactLine, [c.phone, c.wechat ? 'WeChat ' + c.wechat : ''].filter(Boolean).join(' · ')))}</span></div>` : ''}
    <div class="divider-h"></div>
    <div class="stats4">
      ${stat(t.statMembers, hidden ? f(t.unitPeople, '**') : f(t.unitPeople, mem.length), hidden ? '' : 'clubMembers')}
      ${stat(t.statSessions, hidden ? f(t.unitTimes, '**') : f(t.unitTimes, evs.length), hidden ? '' : 'clubSessions')}
      ${stat(t.statGames, hidden ? f(t.unitTimes, '**') : f(t.unitTimes, comps.length), hidden ? '' : 'clubComps')}
      ${stat(t.statActive, hidden ? '***' : active, '')}
    </div>
    ${hidden ? `<div class="muted center" style="margin-top:8px">🔒 ${t.privateNote}</div>` : ''}
  </div>
  ${hidden ? '' : `
  <div class="card" data-act="clubMembers" role="button" tabindex="0" style="cursor:pointer">
    <div class="row between"><div class="bold">${esc(f(t.genderCount, men, mem.length - men))}</div><span class="arrow">›</span></div>
    <div class="faces-row big">${mem.slice(0, 10).map((u) => avatar(u)).join('')}</div>
  </div>`}
  ${owner ? `<div class="card item" data-act="player" data-id="${owner._id}" role="button" tabindex="0" style="padding:12px 16px">${avatar(owner)}<span class="grow">${esc(owner.nickName)}<span class="muted">（${fmt.role('owner')}）</span></span><span class="arrow">›</span></div>` : ''}
  ${shopOn(c._id) && !hidden ? `<div class="card row" data-act="openMall" role="button" tabindex="0" style="cursor:pointer;gap:10px"><span class="mall-ic sm">${ICONS.shop}</span><span class="grow bold">${t.mall}</span><span class="muted">${esc(f(t.myClubPts, mallPoints(c._id, ME).left))}</span><span class="arrow">›</span></div>` : ''}
  ${can(c._id, 'events') ? `<button class="btn" data-act="newEventNa">${t.newEvent}</button>` : ''}`;
}

function clubFeed(t, c) {
  const evs = clubEvents(c._id);
  const comps = evs.filter((e) => st.matches.some((m) => m.eventId === e._id));
  const recent = evs.slice(0, 6);
  return `${
    recent.length
      ? recent
          .map((e) => {
            const by = st.users[e.creatorId] || st.users[ME];
            return `<div class="feed-row"><div class="feed-who" data-act="player" data-id="${by._id}" role="button" tabindex="0">${avatar(by, 'sm')}<span class="ellipsis">${esc(by.nickName)}</span></div><div class="grow">${eventCard(t, e)}</div></div>`;
          })
          .join('')
      : `<div class="card empty">${t.feed_empty}</div>`
  }
  <div class="row between" style="padding:0 4px"><button class="link" data-act="clubSessions">${f(t.historySessions, evs.length)}</button><button class="link" data-act="clubComps">${f(t.historyComps, comps.length)}</button></div>`;
}

function clubRank(t, c) {
  const kind = ui.rankKind || 'active';
  const since = { week: Date.now() - 7 * DAY, month: Date.now() - 30 * DAY, q: Date.now() - 90 * DAY, half: Date.now() - 180 * DAY, all: 0 }[ui.period] || 0;
  const only = ui.membersOnly;
  const type = ui.rankType || 'all';
  const tabs = `<div class="chips">${['active', 'points', 'pairs', 'rating', 'joined'].map((k) => `<button class="${kind === k ? 'on' : ''}" data-act="rankKind" data-k="${k}">${t['rk_' + k]}</button>`).join('')}</div>`;
  const periods = ['week', 'month', 'q', 'half', 'all'].map((p) => `<button class="${ui.period === p ? 'on' : ''}" data-act="period" data-p="${p}">${t[{ week: 'last7', month: 'last30', q: 'last90', half: 'last180', all: 'allTime' }[p]]}</button>`).join('');
  const types = ['all', 'doubles', 'singles'].map((k) => `<button class="${type === k ? 'on' : ''}" data-act="rankType" data-k="${k}">${k === 'all' ? t.typeAll : t[k]}</button>`).join('');
  const onlyBtn = `<button class="${only ? 'on' : ''}" data-act="toggleMembersOnly">👤 ${t.membersOnly}</button>`;
  const filters =
    kind === 'joined'
      ? `<div class="rank-filters"><button class="on" data-act="toggleJoinOrder">${ui.newFirst ? t.newFirst : t.oldFirst} ⇅</button></div>`
      : kind === 'rating'
      ? ''
      : `<div class="rank-filters">${onlyBtn}${periods}</div>${kind === 'points' || kind === 'pairs' ? `<div class="rank-filters">${types}</div>` : ''}`;
  const medal = (i) => `<span class="rank ${i < 3 ? 'top' : ''}">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>`;
  const who = (u, extra = '') => `${avatar(u, 'sm')}<span class="grow ellipsis">${esc(u.nickName)} ${u.gender === 'f' ? '<span class="sex f">♀</span>' : '<span class="sex m">♂</span>'}${extra}<div class="muted" style="font-size:11px">${esc(i18n.levelTitle(u.doubles))}</div></span>`;
  const keep = (u) => st.users[u] && (!only || memberOf(c._id, u));
  const games = st.matches.filter((m) => m.clubId === c._id && m.status === 'done' && m.playedAt >= since && (type === 'all' || m.type === type));
  const head3 = `<div class="tr th"><span class="rank">#</span><span class="name">${t.colPlayer}</span><span class="c">${t.colPoints}</span><span class="c">${t.colDiff}</span><span class="c">${t.colWinRate}</span></div>`;
  const sign = (n) => (n > 0 ? '+' : '') + n;
  let rows = [];
  let note = '';
  let head = '';
  if (kind === 'active') {
    rows = activityScores(c._id, since, only).map(({ u, v }, i) => `<div class="tr" data-act="player" data-id="${u}" role="button" tabindex="0">${medal(i)}<span class="name row" style="gap:8px">${who(st.users[u])}</span><span class="c w bold num">${i < 5 ? '🔥 ' : ''}${v}</span></div>`);
    note = t.activeRule;
  } else if (kind === 'points') {
    head = head3;
    rows = aggregate(games, c.settings)
      .filter((r) => keep(r.userId))
      .map((r, i) => `<div class="tr" data-act="player" data-id="${r.userId}" role="button" tabindex="0">${medal(i)}<span class="name row" style="gap:8px">${who(st.users[r.userId])}</span><span class="c bold">${r.score}</span><span class="c ${r.diff > 0 ? 'up' : r.diff < 0 ? 'down' : ''}">${sign(r.diff)}</span><span class="c">${Math.round(r.winRate)}%</span></div>`);
    note = f(t.boardRule, c.settings.winPoints, c.settings.lossPoints);
  } else if (kind === 'pairs') {
    head = head3;
    const pairs = new Map();
    games.filter((m) => m.type === 'doubles').forEach((m) => {
      [[m.teamA, m.scoreA, m.scoreB], [m.teamB, m.scoreB, m.scoreA]].forEach(([team, own, opp]) => {
        if (!team.every(keep)) return;
        const k = team.slice().sort().join('|');
        const g = pairs.get(k) || { team: team.slice().sort(), w: 0, l: 0, diff: 0 };
        own > opp ? g.w++ : g.l++;
        g.diff += own - opp;
        pairs.set(k, g);
      });
    });
    rows = [...pairs.values()]
      .filter((g) => g.w + g.l >= 3)
      .map((g) => ({ ...g, pts: g.w * c.settings.winPoints + g.l * c.settings.lossPoints, rate: g.w / (g.w + g.l) }))
      .sort((a, b) => b.pts - a.pts || b.rate - a.rate || b.diff - a.diff)
      .slice(0, 30)
      .map((g, i) => `<div class="tr" style="cursor:default">${medal(i)}<span class="name pair-col">${g.team.map((u) => `<span class="row" style="gap:6px" data-act="player" data-id="${u}">${who(st.users[u])}</span>`).join('')}</span><span class="c bold">${g.pts}</span><span class="c ${g.diff > 0 ? 'up' : g.diff < 0 ? 'down' : ''}">${sign(g.diff)}</span><span class="c">${Math.round(g.rate * 100)}%</span></div>`);
    note = f(t.pairMin, 3);
  } else if (kind === 'rating') {
    rows = st.members
      .filter((m) => m.clubId === c._id)
      .map((m) => st.users[m.userId])
      .filter(Boolean)
      .map((u) => ({ u, s: strengthOf(u, c._id) }))
      .sort((a, b) => (b.s.main ? b.s.main.value : -1) - (a.s.main ? a.s.main.value : -1))
      .map(({ u, s: x }, i) => {
        const others = x.all.filter((y) => y !== x.main).map((y) => `${{ cert: t.tagCert, dupr: 'DUPR', club: t.tagClubRating, self: t.pbSelf }[y.type]} ${y.value.toFixed(y.type === 'self' || y.type === 'cert' ? 1 : 3)}`);
        return `<div class="tr" data-act="player" data-id="${u._id}" role="button" tabindex="0">${medal(i)}<span class="name row" style="gap:8px">${who(u)}</span>
          <span class="strength">${x.main ? strengthTag(t, x.main) : `<span class="muted">${t.notRated}</span>`}${others.length ? `<span class="muted others">${esc(others.join(' · '))}</span>` : ''}</span></div>`;
      });
    note = t.strengthNote;
  } else {
    const roleTag = (r) => (r === 'member' ? '' : ` <span class="tag">${fmt.role(r)}</span>`);
    rows = st.members
      .filter((m) => m.clubId === c._id && st.users[m.userId])
      .sort((a, b) => (ui.newFirst ? (b.joinedAt || 0) - (a.joinedAt || 0) : (a.joinedAt || 0) - (b.joinedAt || 0)))
      .map((m, i) => `<div class="tr" data-act="player" data-id="${m.userId}" role="button" tabindex="0">${medal(i)}<span class="name row" style="gap:8px">${who(st.users[m.userId], roleTag(m.role))}</span><span class="c w muted num">${m.joinedAt ? fmt.date(m.joinedAt).replace(/-/g, '/') : ''}</span></div>`);
  }
  return `${tabs}${filters}<div class="card">${rows.length ? `<div class="table">${head}${rows.join('')}</div>` : `<div class="empty">${t.noBoard}</div>`}${note ? `<div class="muted" style="margin-top:10px">${esc(note)}</div>` : ''}</div>`;
}

function clubMe(t, c, role) {
  if (!role) return `<div class="card empty"><div style="font-size:40px">${ICONS.club}</div><div>${t.notMemberYet}</div><button class="link" data-act="applyJoin">${c.applied ? t.applyPending : t.wantJoin}</button></div>`;
  const m = st.members.find((x) => x.clubId === c._id && x.userId === ME);
  const evIds = new Set(clubEvents(c._id).map((e) => e._id));
  const sessions = st.signups.filter((x) => evIds.has(x.eventId) && x.userId === ME && x.status === 'joined').length;
  const games = st.matches.filter((g) => evIds.has(g.eventId) && g.status === 'done' && g.players.includes(ME));
  const wins = games.filter((g) => (g.teamA.includes(ME) ? g.scoreA > g.scoreB : g.scoreB > g.scoreA)).length;
  const act = activityScores(c._id, 0, false);
  const idx = act.findIndex((x) => x.u === ME);
  return `${playerHeader(t, ME)}
  <div class="card">
    <div class="irow"><span class="ii">🏷️</span><span class="grow">${t.myClubRole}：${fmt.role(role)}${m && m.joinedAt ? ` · ${esc(f(t.joinedOn, fmt.date(m.joinedAt)))}` : ''}</span></div>
    <div class="irow"><span class="ii">📊</span><span class="grow">${esc(f(t.myClubStats, sessions, games.length, games.length ? Math.round((wins / games.length) * 100) : 0))}</span></div>
    ${idx >= 0 ? `<div class="irow"><span class="ii">🔥</span><span class="grow">${esc(f(t.myActiveRank, act[idx].v, idx + 1))}</span></div>` : ''}
    ${shopOn(c._id) ? '' : '<!--'}<div class="irow" data-act="openMall" role="button" tabindex="0" style="cursor:pointer"><span class="ii">🎁</span><span class="grow">${t.mall}：<b class="num" style="color:var(--clay)">${mallPoints(c._id, ME).left}</b> ${t.mallBalance}</span><span class="arrow">›</span></div>${shopOn(c._id) ? '' : '-->'}
    <div class="irow"><span class="ii">✅</span><span class="grow">${t.certifiedLevel}：${m && m.cert ? `<b class="num">${Number(m.cert.value).toFixed(1)}</b> <span class="tag cert">${t.tagCert}</span>` : `<span class="muted">${t.notRated}</span>`}</span></div>
  </div>`;
}

function viewClub(t, id) {
  const c = clubOf(id);
  const role = (memberOf(id, ME) || {}).role;
  const admin = isAdmin(id);
  const tab = c.private && !role && ui.clubTab !== 'me' ? 'home' : ui.clubTab || 'home';
  const tabs = `<div class="tabs line">${[['home', t.clubTabHome], ['feed', t.clubTabFeed], ['rank', t.clubTabRank], ['me', t.tabMe]]
    .map(([k, label]) => `<button class="${tab === k ? 'on' : ''}" data-act="clubTab" data-k="${k}">${label}</button>`)
    .join('')}</div>`;
  const body = tab === 'feed' ? clubFeed(t, c) : tab === 'rank' ? clubRank(t, c) : tab === 'me' ? clubMe(t, c, role) : clubHome(t, c, role, admin);
  return tabs + body;
}

// 俱乐部底部操作栏：入会申请 / 邀请球友 / 认证等级 + 设置、二维码、会员管理、VIP 会费
function clubActionBar(t, id) {
  const c = clubOf(id);
  const role = (memberOf(id, ME) || {}).role;
  if (!role) {
    const mode = c.joinMode || 'review';
    if (mode === 'invite') return `<div class="actionbar club-bar"><button class="pill done" disabled>${t.inviteOnlyNote}</button></div>`;
    if (mode === 'open') return `<div class="actionbar club-bar"><button class="pill go" data-act="joinNow">${t.joinClub}</button></div>`;
    return `<div class="actionbar club-bar"><button class="pill go" data-act="applyJoin" ${c.applied ? 'disabled' : ''}>${c.applied ? t.applyPending : t.applyJoin}</button></div>`;
  }
  const canInvite = (c.inviteWho || 'admins') === 'all' || isAdmin(id);
  return `<div class="actionbar club-bar">
    <div class="btn-row">
      ${canInvite ? `<button class="pill share" data-act="clubInvite">${t.btnInviteFriends}</button>` : ''}
      ${isAdmin(id) ? `<button class="pill blue" data-act="clubAdmin">🛠 ${t.adminConsole}</button>` : ''}
    </div>
    <div class="club-links">
      ${isOwner(id) ? `<button class="link" data-act="clubSettings">${t.linkSettings}</button>` : ''}
      ${shopOn(id) ? `<button class="link" data-act="openMall">🎁 ${t.mall}</button>` : ''}
      <button class="link" data-act="clubQr">${t.linkQr}</button>
      <button class="link" data-act="clubMembers">${t.linkMembers}</button>
      <button class="link muted" data-act="vipTbd">${t.linkVip}</button>
    </div>
  </div>`;
}

// 俱乐部设置（会长）
function viewClubSettings(t, id) {
  const c = clubOf(id);
  const row = (label, val, act, k, warn) => `<button class="erow" data-act="${act}" data-k="${k}"><span class="ek">${label}</span><span class="ev ${warn ? 'warnv' : ''} ellipsis">${val}</span><span class="pen">✎</span></button>`;
  const txt = (label, k, v) => row(label, v ? esc(v) : f(t.setPrompt, label), 'editField', k, !v);
  const opt = (label, k, v) => row(label, v, 'pickOption', k);
  const ap = c.adminPerms || {};
  return `
  <div class="card elist">
    <label class="erow" for="clubLogo"><span class="ek">${t.cs_logo}</span>${clubAvatar(c, 'sm')}<span class="ev">${t.uploadPhoto}</span><span class="arrow">›</span></label>
    <input id="clubLogo" type="file" accept="image/*" data-change="clubLogo" hidden>
    ${txt(t.cs_name, 'name', c.name)}${txt(t.cs_short, 'short', c.short)}${txt(t.cs_venue, 'venueName', c.venue && c.venue.name)}
    ${txt(t.cs_notice, 'notice', c.notice)}${txt(t.intro, 'intro', c.intro)}
  </div>
  <div class="card elist">
    ${opt(t.cs_joinMode, 'joinMode', t['jm_' + (c.joinMode || 'review')])}
    ${opt(t.cs_inviteWho, 'inviteWho', t['iw_' + (c.inviteWho || 'admins')])}
    ${opt(t.cs_visible, 'visible', c.private ? t.privateClub : t.vis_all)}
  </div>
  <div class="card elist"><button class="erow" data-act="shopToggle"><span class="ek">🎁 ${t.mall}</span><span class="ev ${c.shopEnabled ? '' : 'warnv'}">${c.shopEnabled ? t.shopOn : t.shopOff}</span><span class="switch ${c.shopEnabled ? 'on' : ''}"></span></button>${c.shopEnabled ? '' : `<div class="muted ehint" style="text-align:left">${t.shopNeedVip}</div>`}</div>
  <div class="card elist">${txt(t.cs_phone, 'phone', c.phone)}${txt(t.cs_wechat, 'wechat', c.wechat)}</div>
  <div class="card elist">${txt(t.billPayId, 'payId', c.payId)}${row(t.fxRate, c.fxRate ? `1 A$ = ¥${c.fxRate}` : f(t.setPrompt, t.fxRate), 'editField', 'fxRate', !c.fxRate)}</div>
  <div class="section-title">${t.cs_adminPerms}</div>
  <div class="card elist">${PERMS.map((k) => `<button class="erow" data-act="togglePerm" data-k="${k}"><span class="ek">${t['perm_' + k]}</span><span class="switch ${ap[k] !== false ? 'on' : ''}"></span></button>`).join('')}</div>
  <div class="muted" style="padding:0 4px">${t.permHint}</div>
  <div class="card elist"><button class="erow danger" data-act="dissolveAsk"><span class="ek">${t.cs_dissolve}</span><span class="ev">${t.dissolveNote}</span></button></div>`;
}

// 会员名单（会员管理）
function viewClubMembers(t, id) {
  const c = clubOf(id);
  const canManage = isAdmin(id);
  const order = { owner: 0, admin: 1, member: 2 };
  const q = (ui.memberQ || '').trim().toLowerCase();
  const evs = clubEvents(id);
  const act = Object.fromEntries(activityScores(id, 0, false).map((x) => [x.u, x.v]));
  const list = st.members
    .filter((m) => m.clubId === id && st.users[m.userId] && (!q || st.users[m.userId].nickName.toLowerCase().includes(q)))
    .map((m) => ({ ...st.users[m.userId], role: m.role, joinedAt: m.joinedAt, note: m.note }))
    .sort((a, b) => order[a.role] - order[b.role] || b.doubles.rating - a.doubles.rating);
  const apps = can(id, 'members') ? c.applications || [] : [];
  const sub = (u) => {
    const days = u.joinedAt ? Math.max(0, Math.floor((Date.now() - u.joinedAt) / DAY)) : 0;
    const sess = evs.filter((e) => st.signups.some((x) => x.eventId === e._id && x.userId === u._id && x.status === 'joined')).length;
    const comps = evs.filter((e) => st.matches.some((m) => m.eventId === e._id && m.players.includes(u._id))).length;
    return f(t.memberSub, days, sess, comps, act[u._id] || 0);
  };
  return `<input class="search" placeholder="${t.memberSearchPh}" value="${esc(ui.memberQ || '')}" data-change="memberQ" aria-label="${t.memberSearchPh}">
  ${apps.length ? `<div class="section-title">${f(t.applicationsN, apps.length)}</div><div class="card flush">${apps
    .map((a) => `<div class="item" style="cursor:default">${avatar(st.users[a.userId], 'sm')}<div class="grow"><div class="bold">${esc(st.users[a.userId].nickName)}</div><div class="muted num">${fmt.shortDate(a.at)} · ${pbBadge(t, st.users[a.userId])}</div></div>
      <button class="btn ghost mini" data-act="rejectApp" data-id="${a.userId}">${t.reject}</button><button class="btn mini" data-act="approveApp" data-id="${a.userId}">${t.approve}</button></div>`)
    .join('')}</div>` : ''}
  <div class="card flush">${list
    .map((u) => `<div class="item" data-act="player" data-id="${u._id}" role="button" tabindex="0"><div class="av-wrap">${avatar(u)}${u._id === ME ? `<span class="me-badge">${t.meBadge}</span>` : ''}</div>
      <div class="grow"><div class="ellipsis"><span class="bold">${esc(u.nickName)}</span> ${u.gender === 'm' ? '<span class="sex m">♂</span>' : u.gender === 'f' ? '<span class="sex f">♀</span>' : ''}${u.role !== 'member' ? `<span class="tag">${fmt.role(u.role)}</span>` : ''}${u.guest ? `<span class="tag gray">${t.guest}</span>` : ''}</div>
      <div class="muted num" style="font-size:11px">${esc(sub(u))}</div>${canManage && u.note ? `<div class="note-chip">📝 ${esc(u.note)}</div>` : ''}</div>
      <div class="pb">${levelBadge(t, u, id)}</div>${canManage ? `<button class="link" data-act="memberOps" data-id="${u._id}">${t.operate}</button>` : ''}</div>`)
    .join('')}</div>`;
}

// 俱乐部名下的活动 / 比赛列表
function viewClubEvents(t, id, comps) {
  const evs = clubEvents(id).filter((e) => !comps || st.matches.some((m) => m.eventId === e._id));
  return evs.length ? evs.map((e) => eventCard(t, e)).join('') : `<div class="card empty">${t.noClubEvents}</div>`;
}

// 活动地点：跟随俱乐部的常用场地（可另写场地号）；点击用地图打开
function venueOf(e) {
  const c = clubOf(e.clubId);
  const v = e.venue || c.venue || { name: e.location };
  return { name: v.name, label: v.name + (e.courtNote ? ' · ' + e.courtNote : ''), map: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([v.name, v.city].filter(Boolean).join(' ')) };
}

function eventStats(id) {
  const matches = st.matches.filter((m) => m.eventId === id);
  const per = {};
  matches.forEach((m) => m.players.forEach((p) => (per[p] = (per[p] || 0) + 1)));
  const counts = Object.values(per);
  const each = !counts.length ? 0 : Math.min(...counts) === Math.max(...counts) ? counts[0] : `${Math.min(...counts)}–${Math.max(...counts)}`;
  return { matches, each };
}

function viewEvent(t, id) {
  const e = eventOf(id);
  const admin = can(e.clubId, 'events');
  const joined = joinedOf(id).map((s) => st.users[s.userId]);
  const wait = waitOf(id).map((s) => st.users[s.userId]);
  const { matches, each } = eventStats(id);
  const tab = ui.eventTab || 'info';
  const tabs = `<div class="tabs line">${[['info', t.tabEventInfo], ['rank', t.tabRank], ['pairs', t.tabPairs], ['umpire', t.tabUmpire]]
    .map(([k, label]) => `<button class="${tab === k ? 'on' : ''}" data-act="eventTab" data-k="${k}">${label}</button>`)
    .join('')}</div>`;
  let body = '';
  if (tab === 'info') {
    const d = new Date(e.startTime);
    const pad = (n) => String(n).padStart(2, '0');
    const day = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}（${i18n.weekday(d.getDay())}）${fmt.time(e.startTime)}–${fmt.time(e.endTime)}`;
    const v = venueOf(e);
    const comma = i18n.getLang() === 'zh' ? '，' : ', ';
    const creator = st.users[e.creatorId] || st.users[ME];
    const row = (ic, text, extra = '') => `<div class="irow">${ic}<span class="grow">${text}</span>${extra}</div>`;
    body = `
    <div class="card info-card">
      <span class="ribbon ${e.status}">${fmt.status(e.status)}</span>
      <div class="bold ev-title">${esc(e.title)}</div>
      ${row('<span class="ii">🕘</span>', `<span class="num">${day}</span>`, `<button class="qr-btn" data-act="openQr" aria-label="QR">${QR_ICON}</button>`)}
      <a class="irow" href="${v.map}" target="_blank" rel="noopener" aria-label="${t.openMap}"><span class="ii">📍</span><span class="grow">${esc(v.label)}</span><span class="arrow">›</span></a>
      ${row('<span class="ii">💲</span>', esc(f(t.feeLine, e.feeMode === 'aa' ? t.feeAA : e.fee ? currency(e.clubId) + e.fee + (i18n.getLang() === 'zh' ? '/人' : ' pp') : t.feeFree)))}
      ${e.note ? row('<span class="ii">📝</span>', esc(e.note)) : ''}
      <div class="divider-h"></div>
      ${row('<span class="ii">Ⓣ</span>', esc(f(t.typeLine, e.mode ? t['mode_' + e.mode] : t.notArranged)), e.mode ? '<button class="arrow link" data-act="formats" data-mode="' + e.mode + '">›</button>' : '')}
      ${row('<span class="ii">Ⓡ</span>', t.rankLine)}
      ${row('<span class="ii">Ⓢ</span>', esc(f(t.scoringLine, [t.bestOf1, f(t.toPoints, e.target || 11)].join(comma))))}
      ${row('<span class="ii">Ⓟ</span>', esc(matches.length ? f(t.countLine, joined.length, each, matches.length) : f(t.countLineNone, joined.length)))}
      ${row('<span class="ii">Ⓥ</span>', esc(f(t.pairLine, e.mode ? t['pair_' + e.mode] : t.notArranged)))}
      ${row('<span class="ii">🔓</span>', esc(f(t.scopeLine, t['scope_' + (e.visibility || 'club')])), admin ? `<button class="link" data-act="toggleScope">✎</button>` : '')}
      ${row('<span class="ii">⚖️</span>', esc(f(t.umpireLine, e.autoUmpire ? t.umpire_auto : t.umpire_assigned)), admin ? `<button class="link" data-act="toggleUmpire">✎</button>` : '')}
      ${row('<span class="ii">👥</span>', esc(f(t.guestsLine, e.allowGuests ? t.guestsAllowed : t.guestsSelfOnly)), admin ? `<button class="link" data-act="toggleGuests">✎</button>` : '')}
      <div class="divider-h"></div>
      ${row('<span class="ii">👁</span>', esc(f(t.viewsLine, Math.round(e.views || 0))))}
    </div>
    ${joinInviteCard(t, e, admin)}
    ${billCard(t, e, can(e.clubId, 'money'))}
    <div class="card" data-act="players" role="button" tabindex="0" style="cursor:pointer">
      <div class="row between"><div class="bold">${t.signedTitle}：<span class="hi num">${joined.length}/${e.capacity}</span></div><span class="arrow">›</span></div>
      ${joined.length ? `<div class="faces-row big">${joined.map((u) => avatar(u)).join('')}</div>` : `<div class="empty">${t.noSignups}</div>`}
      ${wait.length ? `<div class="muted" style="margin-top:8px">${t.waitlist}：${wait.map((u) => esc(u.nickName)).join(i18n.getLang() === 'zh' ? '、' : ', ')}</div>` : ''}
    </div>
    ${friendsCard(t, e)}
    <div class="card item" data-act="player" data-id="${creator._id}" role="button" tabindex="0" style="padding:12px 16px">
      ${avatar(creator)}<span class="grow">${esc(creator.nickName)}<span class="muted">${t.organizerTag}</span></span><span class="arrow">›</span>
    </div>
    <div class="card item" data-act="club" data-id="${e.clubId}" role="button" tabindex="0" style="padding:12px 16px">
      <div class="avatar" style="background:var(--btn)">${esc(clubOf(e.clubId).name[0])}</div><span class="grow">${esc(clubOf(e.clubId).name)}</span><span class="arrow">›</span>
    </div>`;
  } else if (tab === 'pairs') {
    const sorted = matches.slice().sort((a, b) => a.round - b.round || a.court - b.court);
    const rounds = [...new Set(sorted.map((m) => m.round))];
    body = `${admin ? `<div class="btn-row"><button class="btn" data-act="openGen">${matches.length ? t.regenerate : t.generate}</button><button class="btn ghost" data-act="na">${t.addOne}</button></div>` : ''}
    ${!matches.length ? `<div class="card empty">${admin ? t.noMatchesAdmin : t.noMatches}</div>` : ''}
    ${rounds
      .map((rn) => {
        const ms = sorted.filter((m) => m.round === rn);
        return `<div class="section-title">${f(t.roundN, rn)}${ms.every((m) => m.status === 'done') ? `<span class="muted">${t.roundDone}</span>` : ''}</div>
        ${ms.map((m) => matchCard(t, m, admin)).join('')}`;
      })
      .join('')}`;
  } else if (tab === 'umpire') {
    // 裁判：待录分的在前；已录的显示录分人
    const sorted = matches.slice().sort((a, b) => (a.status === 'done') - (b.status === 'done') || a.round - b.round || a.court - b.court);
    const sep = i18n.getLang() === 'zh' ? '、' : ', ';
    const names = (team) => team.map((p) => esc(st.users[p].nickName)).join(sep);
    body = `<div class="muted" style="padding:0 4px">${t.umpireHint}</div>
    <div class="card flush">${
      sorted.length
        ? sorted
            .map((m) => {
              const ok = m.status === 'done';
              const can = canScoreMatch(m, admin);
              return `<div class="item" data-act="${can ? 'openScore' : ''}" data-id="${m._id}" ${can ? 'role="button" tabindex="0"' : 'style="cursor:default"'}>
          <div class="wl ${ok ? 'w' : 'p'}">${m.round}</div>
          <div class="grow"><div class="ellipsis">${names(m.teamA)} <span class="muted">vs</span> ${names(m.teamB)}</div>
          <div class="muted ellipsis">${f(t.courtN, m.court)} · ${ok ? esc(f(t.umpiredBy, (st.users[m.recordedBy] || {}).nickName || '-')) : t.waitingScore}</div></div>
          ${ok ? `<div class="bold num">${m.scoreA}:${m.scoreB}</div>` : can ? `<span class="tag">${t.enterScore}</span>` : ''}</div>`;
            })
            .join('')
        : `<div class="empty">${t.noMatches}</div>`
    }</div>`;
  } else {
    const rows = aggregate(matches, clubOf(e.clubId).settings);
    body = `<div class="card">${
      rows.length
        ? `<div class="table"><div class="tr th"><span class="rank">#</span><span class="name">${t.colPlayer}</span><span class="c">${t.colWL}</span><span class="c w">${t.colScores}</span><span class="c">${t.colDiff}</span><span class="c">${t.colPoints}</span></div>
      ${rows
        .map(
          (r) => `<div class="tr" data-act="player" data-id="${r.userId}" role="button" tabindex="0"><span class="rank ${r.rank <= 3 ? 'top' : ''}">${r.rank}</span><span class="name">${esc(st.users[r.userId].nickName)}</span>
        <span class="c">${r.wins}-${r.losses}</span><span class="c w">${r.pointsFor}/${r.pointsAgainst}</span><span class="c ${r.diff > 0 ? 'up' : r.diff < 0 ? 'down' : ''}">${r.diff > 0 ? '+' : ''}${r.diff}</span><span class="c bold">${r.score}</span></div>`
        )
        .join('')}</div>`
        : `<div class="empty">${t.noStandings}</div>`
    }<div class="muted" style="margin-top:10px">${t.rankLine}</div></div>`;
  }
  return `${tabs}${body}`;
}

// 活动页底部操作栏：实力 / 帮助 / 赛制 + 转发 + 报名状态
function eventActionBar(t, id) {
  const e = eventOf(id);
  const mine = st.signups.find((s) => s.eventId === id && s.userId === ME && s.status !== 'cancelled');
  const main =
    e.status === 'finished'
      ? `<button class="pill done" disabled>${fmt.status('finished')}</button>`
      : !mine
      ? `<button class="pill go" data-act="signup">${t.signup}</button>`
      : `<button class="pill warn" data-act="cancelSignup">${mine.status === 'joined' ? t.cancelSignup : t.waitlistCancel}</button>`;
  const small = (act, ic, label, extra = '') => `<button class="mini-act" data-act="${act}" ${extra}><span>${ic}</span>${label}</button>`;
  return `<div class="actionbar">
    ${small('openStrength', '📊', t.btnStrength)}${small('guide', '❓', t.btnHelp, 'data-topic="start"')}${small('formats', '📖', t.btnFormats, `data-mode="${e.mode || 'rotation'}"`)}
    <button class="pill share" data-act="na">${t.share}</button>${main}
  </div>`;
}

// 赛制介绍：顶部 双打 / 单打，左侧赛制列表，右侧逐项说明
// 目前只开放双打八人转；其他赛制的算法保留，以后放开时加回这里
const FORMAT_GROUPS = { doubles: ['rotation'] };
const OPEN_MODES = ['rotation'];
// 八人转默认轮数：每人和其他人各搭档一次，总场数 A×(A−1)÷4
const rotationRounds = (n, courts) => Math.max(1, Math.ceil((n * (n - 1)) / 4 / Math.max(1, Math.min(courts, Math.floor(n / 4)))));
function viewFormats(t) {
  const cat = ui.fmtCat;
  const mode = ui.fmtMode;
  const sec = (k, text) => `<p><b class="hi">${t['fi_' + k]}</b>：${text}</p>`;
  return `<div class="tabs line">${Object.keys(FORMAT_GROUPS).map((k) => `<button class="${cat === k ? 'on' : ''}" data-act="fmtCat" data-k="${k}">${t[k]}</button>`).join('')}</div>
  <div class="fmt">
    <nav class="fmt-nav">${FORMAT_GROUPS[cat].map((m) => `<button class="${mode === m ? 'on' : ''}" data-act="fmtMode" data-k="${m}">${t['mode_' + m]}</button>`).join('')}</nav>
    <div class="fmt-body">
      ${sec('feature', esc(t['fm_' + mode + '_feature']))}
      ${sec('players', esc(t['fm_' + mode + '_players']))}
      ${sec('games', esc(t['fm_' + mode + '_games']))}
      ${sec('rank', esc(t.fm_rank))}
      ${sec('pairing', esc(t['pair_' + mode] + (i18n.getLang() === 'zh' ? '：' : ': ') + t['mode_' + mode + '_d']))}
      ${sec('best', esc(t['fm_' + mode + '_best']))}
    </div>
  </div>`;
}

function canScoreMatch(m, admin) {
  if (can(m.clubId, 'scores')) return true;
  if (m.status === 'done') return false;
  if (m.players.includes(ME)) return true;
  const e = eventOf(m.eventId);
  return !!e.autoUmpire && joinedOf(e._id).some((x) => x.userId === ME);
}

function matchCard(t, m, admin) {
  const ch = {};
  (m.ratingChanges || []).forEach((c) => (ch[c.id] = c.delta));
  const users = (team) => team.map((id) => st.users[id]);
  const done = m.status === 'done';
  const name = (u, right) => {
    const d = done ? `<span class="d ${ch[u._id] > 0 ? 'up' : 'down'}">${fmt.delta(ch[u._id])}</span>` : '';
    return `<div class="pname">${right ? d : ''}<span class="ellipsis">${esc(u.nickName)}</span>${right ? '' : d}</div>`;
  };
  const canScore = canScoreMatch(m, admin);
  return `<div class="card match ${m.players.includes(ME) ? 'mine' : ''}" data-act="${canScore ? 'openScore' : ''}" data-id="${m._id}" ${canScore ? 'role="button" tabindex="0"' : ''}>
    <div class="muted" style="margin-bottom:6px">${f(t.courtN, m.court)}${m.type === 'singles' ? ' · ' + t.singles : ''}</div>
    <div class="teams">
      <div class="team ${done && m.scoreA > m.scoreB ? 'win' : ''}">${users(m.teamA).map((u) => name(u, false)).join('')}</div>
      <div class="score">${
        done
          ? `<span class="${m.scoreA > m.scoreB ? '' : 'lose'}">${m.scoreA}</span><span class="lose">:</span><span class="${m.scoreB > m.scoreA ? '' : 'lose'}">${m.scoreB}</span>`
          : `<div class="vs">VS</div><div class="pred">${f(t.predicted, predict(users(m.teamA), users(m.teamB), m.type))}</div>${canScore ? `<span class="tag" style="margin:4px 0 0">${t.enterScore}</span>` : ''}`
      }</div>
      <div class="team right ${done && m.scoreB > m.scoreA ? 'win' : ''}">${users(m.teamB).map((u) => name(u, true)).join('')}</div>
    </div></div>`;
}

function rulesRow(t) {
  return `<div class="card mlist"><button class="li" data-act="rules"><span class="li-ic">${ICONS.rules}</span><span class="grow">${t.r_nav}</span><span class="arrow">›</span></button></div>`;
}

function viewProfile(t, uid) {
  const u = st.users[uid];
  const self = uid === ME;
  const type = ui.ptype;
  const b = u[type];
  const rel = Math.round(R.reliability(b.games) * 100);
  const hist = st.history.filter((h) => h.userId === uid && h.type === type).sort((a, c) => a.at - c.at);
  const recent = st.matches
    .filter((m) => m.status === 'done' && m.players.includes(uid))
    .sort((a, c) => c.playedAt - a.playedAt)
    .slice(0, 15);
  const sep = i18n.getLang() === 'zh' ? '、' : ', ';
  return `
  ${playerHeader(t, uid)}
  <div class="tabs">${['doubles', 'singles'].map((k) => `<button class="${type === k ? 'on' : ''}" data-act="ptype" data-k="${k}">${t[k]}</button>`).join('')}</div>
  <div class="card">
    <div class="row between"><div><div class="muted">${esc(f(t.ratingSim, type === 'doubles' ? t.doublesRating : t.singlesRating))}</div>
      <div class="row" style="gap:4px"><span class="rating-big num">${fmt.rating(b.rating)}</span>${b.games < 6 ? `<span class="tag clay">${t.provisional}</span>` : ''}</div></div>
      <button class="link" data-act="rules">${t.howCalc}</button></div>
    <div class="stats">
      <div><div class="bold num">${b.games}</div><div class="muted">${t.games}</div></div>
      <div><div class="bold num">${b.wins}-${b.losses}</div><div class="muted">${t.colWL}</div></div>
      <div><div class="bold num">${b.games ? Math.round((b.wins / b.games) * 100) : 0}%</div><div class="muted">${t.colWinRate}</div></div>
      <div><div class="bold num">${rel}%</div><div class="muted">${t.reliability}</div></div>
    </div>
    <div class="bar"><div style="width:${rel}%"></div></div>
    ${hist.length >= 2 ? chart(hist) : `<div class="empty">${t.chartEmpty}</div>`}
  </div>
  ${rulesRow(t)}
  <div class="section-title">${t.recentGames}</div>
  <div class="card flush">${
    recent.length
      ? recent
          .map((m) => {
            const a = m.teamA.includes(uid);
            const won = a ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
            const mineT = a ? m.teamA : m.teamB;
            const opp = a ? m.teamB : m.teamA;
            const partner = mineT.filter((p) => p !== uid).map((p) => st.users[p].nickName).join(sep);
            const d = ((m.ratingChanges || []).find((c) => c.id === uid) || {}).delta || 0;
            return `<div class="item" style="cursor:default"><div class="wl ${won ? 'w' : 'l'}">${won ? t.winShort : t.lossShort}</div>
          <div class="grow"><div class="ellipsis">${partner ? esc(f(t.withPartner, partner)) : ''}<span class="muted">vs</span> ${esc(opp.map((p) => st.users[p].nickName).join(sep))}</div>
          <div class="muted">${fmt.shortDate(m.playedAt)} · ${m.type === 'singles' ? t.singles : t.doubles}</div></div>
          <div class="center"><div class="bold num">${a ? m.scoreA + ':' + m.scoreB : m.scoreB + ':' + m.scoreA}</div><div class="d ${d > 0 ? 'up' : d < 0 ? 'down' : 'muted'}">${fmt.delta(d)}</div></div></div>`;
          })
          .join('')
      : `<div class="empty">${t.noGames}</div>`
  }</div>
}`;
}

// 评分走势折线（SVG，颜色取主题变量）
function chart(hist) {
  const vals = [hist[0].before, ...hist.map((h) => h.after)];
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < 0.2) {
    lo -= 0.1;
    hi += 0.1;
  }
  const W = 320;
  const H = 130;
  const P = { l: 36, r: 8, t: 10, b: 12 };
  const x = (i) => P.l + ((W - P.l - P.r) * i) / (vals.length - 1);
  const y = (v) => P.t + ((H - P.t - P.b) * (hi - v)) / (hi - lo);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const grid = [hi, (hi + lo) / 2, lo]
    .map((v) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="2" y="${y(v) + 3}" font-size="10" fill="var(--muted)">${v.toFixed(2)}</text>`)
    .join('');
  const last = vals[vals.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="rating trend">${grid}
    <polygon points="${P.l},${H - P.b} ${pts} ${x(vals.length - 1)},${H - P.b}" fill="var(--accent-soft)" opacity="0.7"/>
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${x(vals.length - 1)}" cy="${y(last)}" r="3.5" fill="var(--accent)"/></svg>`;
}

function viewRules(t) {
  const rows = [0, 0.25, 0.5, 1, 1.5, 2].map((d) => {
    const e = R.expectedShare(3.5 + d, 3.5);
    return `<div class="tr" style="cursor:default"><span class="name num">${d.toFixed(2)}</span><span class="c w num">${Math.round(e * 100)}%</span><span class="c w num">11:${Math.round((11 * (1 - e)) / e)}</span></div>`;
  });
  return `
  <div class="card"><div class="h">${t.r_t1}</div><div class="p">${t.r_p1}</div><div class="p">${t.r_p2}</div>
    <div class="formula">${t.r_f1}</div><div class="formula">${t.r_f2}</div><div class="formula">${t.r_f3}</div><div class="p">${t.r_p3}</div></div>
  <div class="card"><div class="h">${t.r_t2}</div><div class="table"><div class="tr th"><span class="name">${t.r_colGap}</span><span class="c w">${t.r_colShare}</span><span class="c w">${t.r_colScore}</span></div>${rows.join('')}</div>
    <div class="p muted">${t.r_p4}</div></div>
  <div class="card"><div class="h">${t.r_t3}</div><div class="p">${t.r_p5}</div><div class="p">${t.r_p6}</div></div>
  <div class="card"><div class="h">${t.r_t4}</div><div class="p">${t.r_p7}</div></div>
  <div class="card"><div class="h">${t.r_t5}</div><div class="p">${t.r_p8}</div><div class="p muted">${t.r_disclaimer}</div></div>`;
}


// ---------------- 我的（菜单页） ----------------
function viewMe(t) {
  const u = st.users[ME];
  const rate = (b) => (b.games ? Math.round((b.wins / b.games) * 100) : 0);
  const ump = (type) => st.matches.filter((m) => m.status === 'done' && m.type === type && m.recordedBy === ME && !m.players.includes(ME)).length;
  const cell = (act, ic, tone, label, extra = '') => `<button class="cell" data-act="${act}" ${extra}><span class="ic ${tone}">${ic}</span><span>${label}</span></button>`;
  const li = (act, ic, label) => `<button class="li" data-act="${act}"><span class="li-ic">${ic}</span><span class="grow">${label}</span><span class="arrow">›</span></button>`;
  return `
  <div class="card me">
    <button class="edit" data-act="edit" aria-label="${t.editProfile}">✎</button>
    <div class="who" data-act="edit" role="button" tabindex="0">
      ${avatar(u, 'xl')}
      <div class="name-row"><span class="bold name">${esc(u.nickName)}</span>${u.gender === 'm' ? '<span class="sex m">♂</span>' : u.gender === 'f' ? '<span class="sex f">♀</span>' : ''}<span class="lv">${esc(i18n.levelTitle(u.doubles))}</span></div>
      <div class="muted num">${esc(f(t.ratingsLine, fmt.ratingLabel(u.doubles), fmt.ratingLabel(u.singles)))}</div>
      ${u.pbLevel ? `<div class="muted">${t.pbLevel}: ${esc(pbText(t, u.pbLevel))}</div>` : ''}
    </div>
    <div class="mstats">
      <div class="half tap" data-act="record" data-kind="singles" role="button" tabindex="0"><div class="kv"><div class="k">${t.singles}</div><div class="v num">${f(t.gamesCount, u.singles.games)}</div></div><div class="kv"><div class="k">${t.colWinRate}</div><div class="v num">${rate(u.singles)}%</div></div></div>
      <div class="divider"></div>
      <div class="half tap" data-act="record" data-kind="doubles" role="button" tabindex="0"><div class="kv"><div class="k">${t.doubles}</div><div class="v num">${f(t.gamesCount, u.doubles.games)}</div></div><div class="kv"><div class="k">${t.colWinRate}</div><div class="v num">${rate(u.doubles)}%</div></div></div>
    </div>
    <div class="umpire"><span class="tap" data-act="record" data-kind="umpSingles" role="button" tabindex="0">${t.umpireSingles}: <b class="v num">${f(t.gamesCount, ump('singles'))}</b> ›</span><span class="tap" data-act="record" data-kind="umpDoubles" role="button" tabindex="0">${t.umpireDoubles}: <b class="v num">${f(t.gamesCount, ump('doubles'))}</b> ›</span></div>
    <div class="note">${t.finishedOnly}</div>
  </div>
  <div class="card mgrid">
    ${cell('myEvents', ICONS.pickleball, 'ball', t.menu_events)}
    ${cell('myMatches', ICONS.paddle, 'ball', t.menu_matches)}
    ${cell('player', ICONS.trophy, 'ball', t.menu_rating, `data-id="${ME}"`)}
    ${cell('levels', ICONS.levels, 'ball', t.menu_levels)}
    ${cell('formats', ICONS.formats, 'ball', t.menu_formats, 'data-mode="rotation"')}
    ${cell('guide', ICONS.guide, 'ball', t.menu_guide, 'data-topic="start"')}
    ${cell('tab', ICONS.club, 'ball', t.myClubs, 'data-tab="home"')}
    ${cell('shopHub', ICONS.shop, 'ball', t.mall)}
    ${cell('na', ICONS.contact, 'ball', t.menu_contact)}
  </div>
  <div class="card mlist">
    ${li('edit', '✏️', t.editProfile)}
    ${li('myInvites', '📨', t.myInvites)}
    ${li('premium', '⭐', t.premiumTitle)}
    ${li('feedback', '✍️', t.menu_feedback)}
    ${li('na', '🤝', t.menu_invite)}
  </div>`;
}

const SELF_LEVELS = [2.5, 3.0, 3.5, 4.0]; // 与《评分与级别规则 v1》自评问卷的四个结果一致
const levelKey = (l) => 'level_' + String(l).replace('.', '').replace(/0$/, '');
const pbText = (t, pb) => (!pb ? '' : pb.type === 'dupr' ? `DUPR ${Number(pb.value).toFixed(3)}` : `${t.pbSelf} ${Number(pb.value).toFixed(1)}`);

function viewEdit(t) {
  const e = ui.edit;
  const u = { ...st.users[ME], avatarUrl: e.avatarUrl, nickName: e.nickName || st.users[ME].nickName };
  // 与云函数相同的 30 天规则：冷却期内禁用并显示下次可修改日期
  const nameAt = PR.nextChangeAt(st.users[ME], 'nickName', Date.now());
  const avatarAt = PR.nextChangeAt(st.users[ME], 'avatar', Date.now());
  const pbAt = PR.nextChangeAt(st.users[ME], 'pbLevel', Date.now());
  const pen = '<span class="pen" aria-hidden="true">✎</span>';
  const avatarRow = avatarAt
    ? `<div class="erow"><span class="ek">${t.avatar}</span>${avatar(u, 'sm')}<span class="ev muted">${esc(f(t.nextChangeHint, i18n.dayMonth(avatarAt)))}</span></div>`
    : `<label class="erow" for="avatarFile"><span class="ek">${t.avatar}</span>${avatar(u, 'sm')}<span class="ev">${t.changeAvatar}</span><span class="arrow">›</span></label>
       <input id="avatarFile" type="file" accept="image/*" data-change="avatar" hidden>`;
  return `
  <div class="card elist">
    ${avatarRow}
    <div class="erow"><label class="ek" for="nick">${t.nickname}</label><input id="nick" class="ev-input" maxlength="20" placeholder="${t.nicknamePh}" value="${esc(e.nickName)}" data-input="nick" ${nameAt ? 'disabled' : ''}>${nameAt ? '' : pen}</div>
    ${nameAt ? `<div class="muted ehint">${esc(f(t.nextChangeHint, i18n.dayMonth(nameAt)))}</div>` : ''}
    <div class="erow"><label class="ek" for="gender">${t.gender}</label>
      <select id="gender" class="ev-input" data-change="gender">${['', 'm', 'f'].map((g) => `<option value="${g}" ${e.gender === g ? 'selected' : ''}>${t['gender_' + g]}</option>`).join('')}</select>
      ${e.gender === 'm' ? '<span class="sex m">♂</span>' : e.gender === 'f' ? '<span class="sex f">♀</span>' : pen}</div>
  </div>
  <div class="card elist">
    ${pbAt ? `<div class="erow"><span class="ek">${t.pbLevel}</span><span class="ev">${e.pb ? Number(e.pb.value).toFixed(e.pb.type === 'dupr' ? 3 : 1) : t.notFilled}</span></div><div class="muted ehint">${esc(f(t.nextChangeHint, i18n.dayMonth(pbAt)))}</div>` : ''}
    <button class="erow" data-act="openLevel" ${pbAt ? 'hidden' : ''}><span class="ek">${t.pbLevel}${e.pb ? `<span class="muted">（${e.pb.type === 'dupr' ? 'DUPR' : t.pbSelf}）</span>` : ''}</span>
      <span class="ev ${e.pb ? '' : 'muted'}">${e.pb ? Number(e.pb.value).toFixed(e.pb.type === 'dupr' ? 3 : 1) : t.notFilled}</span>${pen}</button>
  </div>
  <div class="muted" style="padding:0 4px">${t.changeRuleHint}</div>
  <button class="btn" data-act="saveEdit">${t.save}</button>`;
}

function eventItem(t, e) {
  const mine = st.signups.find((s) => s.eventId === e._id && s.userId === ME && s.status !== 'cancelled');
  return `<div class="item" data-act="event" data-id="${e._id}" role="button" tabindex="0"><div class="grow">
    <div class="ellipsis"><span class="bold">${esc(e.title)}</span><span class="tag ${e.status === 'playing' ? 'clay' : e.status === 'finished' ? 'gray' : ''}">${fmt.status(e.status)}</span>${mine ? `<span class="tag gray">${t['signed_' + mine.status]}</span>` : ''}</div>
    <div class="muted">${esc(clubOf(e.clubId).name)} · ${fmt.range(e.startTime, e.endTime)}</div></div>
    <div class="muted num">${joinedOf(e._id).length}/${e.capacity}</div></div>`;
}

// 活动卡片（我的活动 / 我的比赛）：标题、时间、赛制、组织者、报名、浏览、参加者头像、状态角标
function eventCard(t, e) {
  const d = new Date(e.startTime);
  const pad = (n) => String(n).padStart(2, '0');
  const day = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}（${i18n.weekday(d.getDay())}）${fmt.time(e.startTime)}–${fmt.time(e.endTime)}`;
  const joined = joinedOf(e._id).map((x) => st.users[x.userId]);
  const comma = i18n.getLang() === 'zh' ? '，' : ', ';
  const format = e.mode ? [t['mode_' + e.mode], t.bestOf1, f(t.toPoints, e.target || 11)].join(comma) : '';
  const creator = st.users[e.creatorId] || st.users[ME];
  return `<div class="card ev-card" data-act="event" data-id="${e._id}" role="button" tabindex="0">
    <span class="ribbon ${e.status}">${fmt.status(e.status)}</span>
    <div class="bold ev-title ellipsis">${esc(e.title)}</div>
    <div class="ev-line">🕘 <span class="num">${day}</span></div>
    ${format ? `<div class="ev-line">🏓 ${esc(format)}</div>` : ''}
    <div class="ev-line">${avatar(creator, 'xs')} ${esc(f(t.organizedBy, creator.nickName))}${comma}${f(t.signedN, joined.length, e.capacity)}${comma}${f(t.viewsN, Math.round(e.views || 0))}</div>
    ${joined.length ? `<div class="faces-row">${joined.slice(0, 12).map((u) => avatar(u, 'xs')).join('')}</div>` : ''}
  </div>`;
}

function tabsBar(tabs, cur) {
  return `<div class="tabs line">${tabs.map(([k, label]) => `<button class="${cur === k ? 'on' : ''}" data-act="listTab" data-k="${k}">${label}</button>`).join('')}</div>`;
}

const signedUp = (eid) => st.signups.some((s) => s.eventId === eid && s.userId === ME && s.status !== 'cancelled');
const umpired = (eid) => st.matches.some((m) => m.eventId === eid && m.status === 'done' && m.recordedBy === ME && !m.players.includes(ME));

function viewMyEvents(t) {
  const tab = ui.listTab || 'all';
  const mine = st.events.filter((e) => e.creatorId === ME || signedUp(e._id));
  const list = mine
    .filter((e) => (tab === 'created' ? e.creatorId === ME : tab === 'joined' ? signedUp(e._id) : true))
    .sort((a, b) => b.startTime - a.startTime);
  return `${tabsBar([['all', t.tabAll], ['created', t.tabCreated], ['joined', t.tabJoined]], tab)}
  ${list.length ? list.map((e) => eventCard(t, e)).join('') : `<div class="card empty">${t.noMyEvents}</div>`}`;
}

// 我的比赛：已经排了对阵的活动
function viewMyMatches(t) {
  const tab = ui.listTab || 'all';
  const hasGames = (e) => st.matches.some((m) => m.eventId === e._id);
  const played = (e) => st.matches.some((m) => m.eventId === e._id && m.players.includes(ME));
  const list = st.events
    .filter(hasGames)
    .filter((e) =>
      tab === 'created' ? e.creatorId === ME : tab === 'joined' ? played(e) : tab === 'umpire' ? umpired(e._id) : e.creatorId === ME || played(e) || umpired(e._id)
    )
    .sort((a, b) => b.startTime - a.startTime);
  return `${tabsBar([['all', t.tabAll], ['created', t.tabCreated], ['joined', t.tabJoined], ['umpire', t.tabUmpire]], tab)}
  ${list.length ? list.map((e) => eventCard(t, e)).join('') : `<div class="card empty">${t.noMyMatchEvents}</div>`}`;
}

function viewGuide(t, topic) {
  if (topic === 'levels') {
    const LV = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
    const lk = (l) => 'level_' + String(l).replace('.', '').replace(/0$/, '');
    const titles = [['lv_newbie', '< 6 ' + t.games], ['lv_1', '< 3.0'], ['lv_2', '3.0+'], ['lv_3', '3.5+'], ['lv_4', '4.0+'], ['lv_5', '4.5+']];
    return `<div class="card"><div class="p" style="margin-top:0">${t.lv_intro}</div></div>
    <div class="card flush">${LV.map((l) => `<div class="item" style="cursor:default"><span class="lvnum num">${l.toFixed(1)}</span><span class="grow">${t[lk(l)]}</span></div>`).join('')}</div>
    <div class="card"><div class="h">${t.lv_titles}</div><div class="p" style="margin-top:0">${t.lv_titles_d}</div>
      <div class="titles">${titles.map(([k, r]) => `<div><span class="lv">${t[k]}</span><span class="muted num">${r}</span></div>`).join('')}</div></div>`;
  }
  if (topic === 'formats') {
    return `<div class="card"><div class="p" style="margin-top:0">${t.f_intro}</div></div>
    <div class="card flush">${['rotation', 'balanced', 'fixed', 'singles', 'singlesRR'].map((k) => `<div class="item" style="cursor:default"><div class="grow"><div class="bold">${t['mode_' + k]}</div><div class="muted">${t['mode_' + k + '_d']}</div></div></div>`).join('')}</div>
    <div class="card"><div class="p" style="margin-top:0">💡 ${t.f_tip}</div></div>`;
  }
  return `<div class="card"><ol class="steps">${[1, 2, 3, 4, 5].map((n) => `<li>${t['g_' + n]}</li>`).join('')}</ol></div>
  <div class="card"><div class="h">${t.g_adminTitle}</div><div class="p" style="margin-top:0">${t.g_admin}</div></div>`;
}

// 头像：读本地图片，居中裁成 160×160 再存，避免撑爆浏览器存储
function readAvatar(file, done) {
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 160;
      const k = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, 160, 160);
      done(c.toDataURL('image/jpeg', 0.85));
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}


// ---------------- 胜率 / 裁判记录 ----------------
// kind: singles | doubles（我的比赛）、umpSingles | umpDoubles（我当裁判的比赛）
function recordMatches(kind) {
  const ump = kind.startsWith('ump');
  const type = kind === 'singles' || kind === 'umpSingles' ? 'singles' : 'doubles';
  const all = st.matches
    .filter((m) => m.status === 'done' && m.type === type && (ump ? m.recordedBy === ME && !m.players.includes(ME) : m.players.includes(ME)))
    .sort((a, b) => b.playedAt - a.playedAt);
  const r = ui.rec;
  if (r.filter === 'half') return all.filter((m) => m.playedAt >= Date.now() - 15 * DAY);
  if (r.filter === 'custom') {
    const from = r.from ? new Date(r.from + 'T00:00:00').getTime() : 0;
    const to = r.to ? new Date(r.to + 'T23:59:59').getTime() : Infinity;
    return all.filter((m) => m.playedAt >= from && m.playedAt <= to);
  }
  return all.slice(0, Number(r.filter));
}


// 俱乐部内的等级：有认证显示认证，否则显示本人填写的匹克球等级
function levelBadge(t, u, clubId) {
  const m = clubId && memberOf(clubId, u._id);
  if (m && m.cert) return `<span class="num bold">${Number(m.cert.value).toFixed(1)}</span><span class="tag cert">${t.tagCert}</span>`;
  return pbBadge(t, u);
}

// 匹克球等级显示：3.5 自评 / 3.812 DUPR / 未自评
function pbBadge(t, u) {
  const pb = u.pbLevel;
  if (!pb) return `<span class="muted">${t.notRated}</span>`;
  return `<span class="num bold">${Number(pb.value).toFixed(pb.type === 'dupr' ? 3 : 1)}</span><span class="tag gray">${pb.type === 'dupr' ? 'DUPR' : t.pbSelf}</span>`;
}

// 球员基本信息卡：头像、昵称、性别、称号、匹克球等级、单双打场次与胜率、裁判场次
function playerHeader(t, uid) {
  const u = st.users[uid];
  const self = uid === ME;
  const rate = (b) => (b.games ? Math.round((b.wins / b.games) * 100) : 0);
  const ump = (type) => st.matches.filter((m) => m.status === 'done' && m.type === type && m.recordedBy === uid && !m.players.includes(uid)).length;
  const tap = (kind) => (self ? `class="half tap" data-act="record" data-kind="${kind}" role="button" tabindex="0"` : 'class="half"');
  return `<div class="card me">
    <div class="who">
      ${avatar(u, 'xl')}
      <div class="name-row"><span class="bold name">${esc(u.nickName)}</span>${u.gender === 'm' ? '<span class="sex m">♂</span>' : u.gender === 'f' ? '<span class="sex f">♀</span>' : ''}<span class="lv">${esc(i18n.levelTitle(u.doubles))}</span>${u.guest ? `<span class="tag gray">${t.guestPlayer}</span>` : ''}</div>
      <div class="muted">${t.pbLevel}: ${pbBadge(t, u)}</div>
    </div>
    <div class="mstats">
      <div ${tap('singles')}><div class="kv"><div class="k">${t.singles}</div><div class="v num">${f(t.gamesCount, u.singles.games)}</div></div><div class="kv"><div class="k">${t.colWinRate}</div><div class="v num">${rate(u.singles)}%</div></div></div>
      <div class="divider"></div>
      <div ${tap('doubles')}><div class="kv"><div class="k">${t.doubles}</div><div class="v num">${f(t.gamesCount, u.doubles.games)}</div></div><div class="kv"><div class="k">${t.colWinRate}</div><div class="v num">${rate(u.doubles)}%</div></div></div>
    </div>
    <div class="umpire"><span>${t.umpireSingles}: <b class="v num">${f(t.gamesCount, ump('singles'))}</b></span><span>${t.umpireDoubles}: <b class="v num">${f(t.gamesCount, ump('doubles'))}</b></span></div>
    <div class="note">${t.finishedOnly}</div>
  </div>`;
}

// 选手名单：报名 / 候补 / 退赛
function viewPlayers(t, eid) {
  const all = st.signups.filter((x) => x.eventId === eid).sort((a, b) => a.createdAt - b.createdAt);
  const groups = { joined: all.filter((x) => x.status === 'joined'), waitlist: all.filter((x) => x.status === 'waitlist'), cancelled: all.filter((x) => x.status === 'cancelled') };
  const tab = ui.plTab || 'joined';
  const tabs = `<div class="tabs line">${[['joined', t.tabSignedN], ['waitlist', t.tabWaitN], ['cancelled', t.tabWithdrawnN]]
    .map(([k, label]) => `<button class="${tab === k ? 'on' : ''}" data-act="plTab" data-k="${k}">${f(label, groups[k].length)}</button>`)
    .join('')}</div>`;
  const list = groups[tab];
  return `${tabs}<div class="card flush">${
    list.length
      ? list
          .map((x, i) => {
            const u = st.users[x.userId];
            const time = `${fmt.shortDate(x.createdAt)} ${fmt.time(x.createdAt)}`;
            return `<div class="item" data-act="player" data-id="${u._id}" role="button" tabindex="0">
            <div class="av-wrap">${avatar(u)}${u._id === ME ? `<span class="me-badge">${t.meBadge}</span>` : ''}</div>
            <div class="grow"><div class="ellipsis">${f(t.numberN, i + 1)}${i18n.getLang() === 'zh' ? '，' : ' · '}${displayName(t, eventOf(eid), x)}${!x.broughtBy && !memberOf(eventOf(eid).clubId, u._id) ? ` <span class="tag gray">${t.nonMember}</span>` : ''} ${u.gender === 'm' ? '<span class="sex m">♂</span>' : u.gender === 'f' ? '<span class="sex f">♀</span>' : ''}</div>
            <div class="muted num">${time}${x.note ? ` <span class="note-chip">${esc(noteText(t, x.note))}</span>` : ''}</div></div>
            <div class="pb">${levelBadge(t, u, eventOf(eid).clubId)}</div></div>`;
          })
          .join('')
      : `<div class="empty">${t.listEmpty}</div>`
  }</div>`;
}

// 匹克球技术等级：标准 / 详细 / 用法
const LV_KEYS = ['10', '20', '25', '30', '35', '40', '45', '50'];
const LV_LABEL = { 10: '1.0–1.5', 20: '2.0', 25: '2.5', 30: '3.0', 35: '3.5', 40: '4.0', 45: '4.5', 50: '5.0+' };
const LV_TRAIN = { 10: 'tr_a', 20: 'tr_a', 25: 'tr_a', 30: 'tr_b', 35: 'tr_c', 40: 'tr_d', 45: 'tr_d', 50: 'tr_d' };
function viewLevels(t) {
  const tab = ui.lvTab || 'std';
  const tabs = `<div class="tabs line">${[['std', t.lvTabStd], ['detail', t.lvTabDetail], ['usage', t.lvTabUsage]]
    .map(([k, label]) => `<button class="${tab === k ? 'on' : ''}" data-act="lvTab" data-k="${k}">${label}</button>`)
    .join('')}</div>`;
  const links = `<div class="lv-links"><button class="link" data-act="selfRate">${t.linkSelfRate}</button><button class="link" data-act="lvTab" data-k="detail">${t.linkDetail}</button><button class="link" data-act="lvTab" data-k="usage">${t.linkUsage}</button></div>`;
  const colon = i18n.getLang() === 'zh' ? '：' : ': ';
  if (tab === 'std') {
    return `${tabs}<div class="card lv-std">
      <div class="p" style="margin-top:0">${t.lvStdNote}</div>
      ${LV_KEYS.map((k) => `<div class="lv-row"><div class="lv-num num">${LV_LABEL[k]}</div><div class="grow"><span class="lv">${t['lvn_' + k]}</span><div>${t['lvw_' + k]}</div></div></div>`).join('')}
      ${links}</div>`;
  }
  if (tab === 'detail') {
    return `${tabs}${LV_KEYS.map(
      (k) => `<div class="card lv-card">
      <div class="lv-head"><span class="lv-num num">${LV_LABEL[k]}</span><span class="lv">${t['lvn_' + k]}</span></div>
      <div class="p"><b class="hi">${t.lvColWhat}</b>${colon}${t['lvw_' + k]}</div>
      <div class="p"><b class="hi">${t.lvColCan}</b>${colon}</div>
      <ul class="lv-ul">${[1, 2, 3].map((i) => `<li>${t['lvc_' + k + '_' + i]}</li>`).join('')}</ul>
      <div class="p"><b class="hi">${t.lvColEx}</b>${colon}${t['lvx_' + k]}</div>
      <div class="p"><b class="hi">${t.lvColTrain}</b>${colon}${t[LV_TRAIN[k]]}</div>
    </div>`
    ).join('')}`;
  }
  const item = (title, desc, soon) => `<div class="p"><b class="hi">${title}</b>${soon ? `<span class="tag gray">${t.comingSoon}</span>` : ''}${colon}${desc}</div>`;
  return `${tabs}
  <div class="card"><div class="h">${t.sys_title}</div>
    <div class="p">${t.sys_tech}</div><div class="p">${t.sys_dupr}</div><div class="p muted">${t.sys_ours}</div></div>
  <div class="card"><div class="p" style="margin-top:0">${t.usageIntro}</div>
    ${item(t.pair_balanced, t.use_balanced_d, true)}${item(t.use_limit, t.use_limit_d, true)}</div>
  <div class="card"><div class="p" style="margin-top:0">${t.usageIntro2}</div>
    ${item(t.pbSelf, t.use_self_d, false)}${item(t.use_cert, t.use_cert_d, true)}
    ${links}</div>`;
}

// 两人头像叠在一起 + 名字「A / B」
function pairHtml(ids) {
  const us = ids.map((id) => st.users[id]);
  return `<div class="pair"><div class="faces">${us.map((u) => avatar(u, 'sm')).join('')}</div>
    <div class="pnames">${us.map((u, i) => `<div class="ellipsis">${i ? '<span class="muted">/ </span>' : ''}${esc(u.nickName)}</div>`).join('')}</div></div>`;
}

function viewRecord(t, kind) {
  const ump = kind.startsWith('ump');
  const type = kind === 'singles' || kind === 'umpSingles' ? 'singles' : 'doubles';
  const list = recordMatches(kind);
  const r = ui.rec;
  const chips = [['10', f(t.f_last, 10)], ['20', f(t.f_last, 20)], ['50', f(t.f_last, 50)], ['half', t.f_halfMonth], ['custom', t.f_custom]];
  const bar = `<div class="chips">${chips.map(([k, label]) => `<button class="${r.filter === k ? 'on' : ''}" data-act="recFilter" data-k="${k}">${label}</button>`).join('')}</div>
  ${r.filter === 'custom' ? `<div class="card"><div class="field"><label for="recFrom">${t.dateFrom}</label><input id="recFrom" type="date" value="${r.from}" data-change="recFrom"></div>
    <div class="field"><label for="recTo">${t.dateTo}</label><input id="recTo" type="date" value="${r.to}" data-change="recTo"></div></div>` : ''}`;
  const typeName = type === 'singles' ? t.singles : t.doubles;
  if (ump) {
    const cards = list.map((m) => `<div class="card vs-card" data-act="event" data-id="${m.eventId}" role="button" tabindex="0">
      ${pairHtml(m.teamA)}<div class="vs">vs</div>${pairHtml(m.teamB)}
      <div class="res"><div class="num big"><span class="${m.scoreA > m.scoreB ? 'hi' : ''}">${m.scoreA}</span> : <span class="${m.scoreB > m.scoreA ? 'hi' : ''}">${m.scoreB}</span></div><div class="muted">${fmt.shortDate(m.playedAt)}</div></div></div>`);
    return `${bar}<div class="card summary">${esc(f(t.umpSummary, list.length, typeName))}</div>${cards.length ? cards.join('') : `<div class="card empty">${t.noBoard}</div>`}`;
  }
  // 同样的「我方 vs 对方」合并成一张卡：胜:负 + 胜率
  const groups = new Map();
  let wins = 0;
  for (const m of list) {
    const a = m.teamA.includes(ME);
    const mine = (a ? m.teamA : m.teamB).slice().sort((x, y) => (x === ME ? -1 : y === ME ? 1 : 0));
    const opp = (a ? m.teamB : m.teamA).slice().sort();
    const key = mine.join() + '|' + opp.join();
    const won = a ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    wins += won ? 1 : 0;
    if (!groups.has(key)) groups.set(key, { mine, opp, w: 0, l: 0, eventId: m.eventId });
    const g = groups.get(key);
    if (won) g.w++;
    else g.l++;
  }
  const pct = list.length ? Math.round((wins / list.length) * 100) : 0;
  const cards = [...groups.values()].map((g) => `<div class="card vs-card" data-act="event" data-id="${g.eventId}" role="button" tabindex="0">
    ${pairHtml(g.mine)}<div class="vs">vs</div>${pairHtml(g.opp)}
    <div class="res"><div class="num big"><span class="hi">${g.w}</span> : ${g.l}</div><div class="muted">${f(t.cardWinRate, Math.round((g.w / (g.w + g.l)) * 100))}</div></div></div>`);
  return `${bar}<div class="card summary">${esc(f(t.recSummary, list.length, typeName))} <b class="hi">${pct}%</b></div>
  ${cards.length ? cards.join('') : `<div class="card empty">${t.noBoard}</div>`}`;
}

const QR_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3"/></svg>';



// 报名备注：快捷标签存成 #key（随语言翻译），自己输入的原样显示
const NOTE_TAGS = ['casual', 'attack', 'defend', 'maybe', 'late'];
const noteText = (t, n) => (!n ? '' : n[0] === '#' ? t['tag_' + n.slice(1)] || n : n);

// ---------------- 赛后 AA 收款 ----------------
// 金额：澳币；俱乐部设了汇率时附人民币参考价
const money = (clubId, v) => {
  const base = currency(clubId) + Number(v).toFixed(2);
  const r = Number(clubOf(clubId).fxRate) || 0;
  if (!r || currency(clubId) !== 'A$') return base;
  const cny = '≈¥' + (Number(v) * r).toFixed(2);
  return i18n.getLang() === 'zh' ? `${base}（${cny}）` : `${base} (${cny})`;
};
function billMessage(t, e, uid, amount, payId) {
  const u = st.users[uid];
  const day = fmt.shortDate(e.startTime);
  return i18n.format(t.billMsg, [{ name: u.nickName, club: clubOf(e.clubId).name, date: day, amount: money(e.clubId, amount), payId, ref: `${u.nickName} ${day}` }]);
}
// 收款单计算：组织者默认不收；AA = 总费用 ÷ 收款人数；按人收取 = 男 / 女单价
function computeBill(sh, e) {
  const ids = joinedOf(e._id).map((x) => x.userId);
  const charged = ids.filter((id) => sh.include[id]);
  const amounts = {};
  if (sh.mode === 'aa') {
    const per = charged.length ? Math.round(((Number(sh.total) || 0) / charged.length) * 100) / 100 : 0;
    charged.forEach((id) => (amounts[id] = per));
  } else {
    charged.forEach((id) => (amounts[id] = Number(st.users[id].gender === 'f' ? sh.female : sh.male) || 0));
  }
  const sum = Math.round(Object.values(amounts).reduce((x, y) => x + y, 0) * 100) / 100;
  const men = charged.filter((id) => st.users[id].gender !== 'f').length;
  return { ids, charged, amounts, sum, men, women: charged.length - men };
}

function billCard(t, e, admin) {
  if (e.feeMode !== 'aa') return '';
  const b = e.bill;
  if (!b) {
    return admin && e.status !== 'open'
      ? `<div class="card"><div class="row between"><div><div class="bold">${t.billTitle}</div><div class="muted">${t.feeAA}</div></div><button class="btn mini" data-act="openBill">${t.billMakeBill}</button></div></div>`
      : '';
  }
  const ids = Object.keys(b.items);
  const paid = ids.filter((id) => b.items[id] === 'paid').length;
  const mine = b.items[ME];
  const sum = Object.values(b.amounts).reduce((x, y) => x + y, 0);
  const head = b.mode === 'aa' ? f(t.billPer, money(e.clubId, b.amounts[ids[0]]), money(e.clubId, b.total), ids.length) : `${t.billModePer} · ${money(e.clubId, sum)}`;
  return `<div class="card bill">
    <div class="row between"><div class="bold">${t.billTitle}</div><span class="tag ${paid === ids.length ? '' : 'clay'}">${f(t.billPaidN, paid, ids.length)}</span></div>
    <div class="p">${esc(head)}</div>
    <div class="payid"><span class="muted">${t.billPayId}</span><b class="grow ellipsis">${esc(b.payId)}</b><button class="btn ghost mini" data-act="copyPayId">${t.copy}</button></div>
    ${mine ? `<div class="my-bill"><span>${esc(f(t.billMyAmount, money(e.clubId, b.amounts[ME])))}</span>${mine === 'unpaid' ? `<button class="btn mini" data-act="iPaid">${t.iPaid}</button>` : `<span class="pay ${mine}">${t['payStatus_' + mine]}</span>`}</div>` : ''}
    <div class="pay-list">${ids
      .map((id) => `<button class="pay-chip ${b.items[id]}" ${admin ? `data-act="togglePay" data-id="${id}"` : 'disabled'}>${avatar(st.users[id], 'xs')}<span class="ellipsis">${esc(st.users[id].nickName)}</span><span class="pay ${b.items[id]}">${t['payStatus_' + b.items[id]]}</span></button>`)
      .join('')}</div>
    ${admin ? `<div class="muted" style="margin-top:6px">${t.billAdminHint}</div>` : ''}
  </div>`;
}

// ---------------- 带人 / 邀请注册 / 入会邀请 ----------------
const BRING_LIMIT = 3;
// 名单里的显示名：带来的朋友显示成「Victor+1，小王」
function displayName(t, e, sgn) {
  const u = st.users[sgn.userId];
  if (!sgn.broughtBy) return esc(u.nickName);
  const mine = st.signups.filter((x) => x.eventId === e._id && x.broughtBy === sgn.broughtBy && x.status !== 'cancelled').sort((a, b) => a.createdAt - b.createdAt);
  const k = mine.indexOf(sgn) + 1;
  return `${esc(st.users[sgn.broughtBy].nickName)}+${k}${i18n.getLang() === 'zh' ? '，' : ', '}${esc(u.nickName)}`;
}

function friendsCard(t, e) {
  const mineSignup = st.signups.find((x) => x.eventId === e._id && x.userId === ME && x.status === 'joined');
  if (!mineSignup || e.status === 'finished') return '';
  const friends = st.signups.filter((x) => x.eventId === e._id && x.broughtBy === ME && x.status !== 'cancelled');
  if (!e.allowGuests) return `<div class="card muted">${t.selfOnly}</div>`;
  return `<div class="card">
    <div class="row between"><div class="bold">${t.bringFriend}</div>${friends.length < BRING_LIMIT ? `<button class="btn ghost mini" data-act="openBring">＋ ${t.bringFriend}</button>` : `<span class="muted">${f(t.bringLimit, BRING_LIMIT)}</span>`}</div>
    ${friends
      .map((x) => {
        const inv = st.invites.find((i) => i.guestId === x.userId);
        return `<div class="item" style="cursor:default">${avatar(st.users[x.userId], 'sm')}<span class="grow">${displayName(t, e, x)}</span>${
          inv && inv.status === 'registered' ? `<span class="pay paid">${t.inv_registered}</span>` : `<button class="btn mini" data-act="openInvite" data-id="${x.userId}">${t.inviteFriend}</button>`
        }</div>`;
      })
      .join('')}
  </div>`;
}

// 朋友接受邀请：+1 记录（报名、对局、评分）整体转到 TA 的新账号，并加入俱乐部
function claimInvite(inv) {
  const g = st.users[inv.guestId];
  const newId = 'u_' + inv.code.toLowerCase();
  st.users[newId] = { ...g, _id: newId, guest: false, broughtBy: undefined, invitedBy: inv.inviter };
  const swap = (id) => (id === g._id ? newId : id);
  st.signups.forEach((x) => (x.userId = swap(x.userId)));
  st.matches.forEach((m) => {
    m.teamA = m.teamA.map(swap);
    m.teamB = m.teamB.map(swap);
    m.players = m.players.map(swap);
    (m.ratingChanges || []).forEach((c) => (c.id = swap(c.id)));
    m.recordedBy = swap(m.recordedBy);
  });
  st.history.forEach((h) => (h.userId = swap(h.userId)));
  st.events.forEach((e) => {
    if (e.bill && e.bill.items[g._id]) {
      e.bill.items[newId] = e.bill.items[g._id];
      e.bill.amounts[newId] = e.bill.amounts[g._id];
      delete e.bill.items[g._id];
      delete e.bill.amounts[g._id];
    }
  });
  const clubId = eventOf(inv.eventId).clubId;
  if (!memberOf(clubId, newId)) st.members.push({ clubId, userId: newId, role: 'member' });
  delete st.users[g._id];
  Object.assign(inv, { status: 'registered', registeredAt: Date.now(), userId: newId });
}

function joinInviteCard(t, e, admin) {
  if (!admin || e.status !== 'finished' || e.visibility !== 'public') return '';
  const outsiders = [...new Set(st.matches.filter((m) => m.eventId === e._id).flatMap((m) => m.players))].filter((id) => st.users[id] && !st.users[id].guest && !memberOf(e.clubId, id));
  const inv = e.joinInvites || {};
  const joinedNow = outsiders.filter((id) => memberOf(e.clubId, id));
  const all = [...new Set([...outsiders, ...Object.keys(inv)])];
  if (!all.length) return '';
  return `<div class="card">
    <div class="row between"><div class="bold">${t.joinInviteTitle}</div>${outsiders.some((id) => !inv[id]) ? `<button class="btn mini" data-act="sendJoinInvites">${t.sendJoinInvites}</button>` : ''}</div>
    <div class="p">${esc(f(t.joinInviteDesc, all.length))}</div>
    ${all
      .map((id) => {
        const state = memberOf(e.clubId, id) ? 'joined' : inv[id] ? 'sent' : 'none';
        return `<div class="item" style="cursor:default">${avatar(st.users[id], 'sm')}<span class="grow">${esc(st.users[id].nickName)}</span>
          <span class="pay ${state === 'joined' ? 'paid' : state === 'sent' ? 'claimed' : 'unpaid'}">${t['ji_' + state]}</span>
          ${state === 'sent' ? `<button class="link" data-act="simulateJoin" data-id="${id}">${t.simulateJoin}</button>` : ''}</div>`;
      })
      .join('')}
    ${joinedNow.length ? '' : ''}
  </div>`;
}

function viewInvites(t) {
  const list = st.invites.filter((i) => i.inviter === ME).sort((a, b) => b.createdAt - a.createdAt);
  const reg = list.filter((i) => i.status === 'registered').length;
  return `<div class="card summary">${esc(f(t.invitesSummary, list.length, reg))}</div>
  <div class="card flush">${
    list.length
      ? list
          .map((i) => {
            const u = st.users[i.userId || i.guestId];
            const e = eventOf(i.eventId);
            return `<div class="item" ${u && !u.guest ? `data-act="player" data-id="${u._id}" role="button" tabindex="0"` : 'style="cursor:default"'}>${u ? avatar(u, 'sm') : ''}
            <div class="grow"><div class="ellipsis">${esc(u ? u.nickName : '?')}</div><div class="muted ellipsis">${esc(e.title)} · ${fmt.shortDate(e.startTime)} · ${esc(f(t.inviteCodeLine, i.code))}</div></div>
            ${i.status === 'registered' ? `<span class="pay paid">${t.inv_registered}</span>` : `<button class="btn mini" data-act="openInvite" data-id="${i.guestId}">${t.inviteFriend}</button>`}</div>`;
          })
          .join('')
      : `<div class="empty">${t.noInvites}</div>`
  }</div>`;
}


// ---------------- 积分商城（俱乐部内部） ----------------
// 积分 = 本俱乐部已完赛对局按积分规则累计（胜 / 负各得几分），兑换后扣除；排行榜不受影响
function mallPoints(clubId, uid) {
  const c = clubOf(clubId);
  const r = aggregate(st.matches.filter((m) => m.clubId === clubId && m.status === 'done'), c.settings).find((x) => x.userId === uid);
  const earned = r ? r.score : 0;
  const spent = (st.redemptions || []).filter((x) => x.clubId === clubId && x.userId === uid).reduce((a, b) => a + b.pts, 0);
  return { earned, spent, left: earned - spent };
}
const itemName = (t, it) => (it.key ? t[it.key] : it.name);
const itemPic = (it, cls = 'mall-ic') => (it.photo ? `<span class="${cls}"><img src="${it.photo}" alt=""></span>` : `<span class="${cls}">${ICONS[it.icon] || ICONS.shop}</span>`);

function viewMall(t, clubId) {
  const c = clubOf(clubId);
  if (!c.shopEnabled) return `<div class="card empty">${t.shopNotOpen}</div>`;
  const admin = isAdmin(clubId);
  const owner = (memberOf(clubId, ME) || {}).role === 'owner';
  const tab = ui.mallTab || 'shop';
  const tabs = `<div class="tabs line">${[['shop', t.mallTabShop], ['mine', t.myRedemptions], ...(can(clubId, 'shop') ? [['admin', t.mallAdmin]] : []), ...(owner ? [['manage', t.mallTabManage]] : [])]
    .map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="mallTab" data-k="${k}">${l}</button>`)
    .join('')}</div>`;
  const items = (st.mall && st.mall[clubId]) || [];
  const p = mallPoints(clubId, ME);
  const recRow = (r, manage) => {
    const it = items.find((x) => x.id === r.itemId) || {};
    const u = st.users[r.userId];
    return `<div class="item" style="cursor:default">${itemPic(it, 'mall-ic sm')}
      <div class="grow"><div class="ellipsis">${esc(itemName(t, it))}${manage && u ? ` · ${esc(u.nickName)}` : ''}</div><div class="muted num">${fmt.shortDate(r.at)} · ${f(t.ptsUnit, r.pts)}</div></div>
      ${manage && r.status === 'pending' ? `<button class="btn mini" data-act="markGiven" data-id="${r.id}">${t.markGiven}</button>` : `<span class="pay ${r.status === 'done' ? 'paid' : 'claimed'}">${t['rd_' + r.status]}</span>`}</div>`;
  };
  if (tab === 'manage' && owner) {
    return `${tabs}<div class="card flush">${items
      .map((it) => `<div class="item" data-act="editItem" data-id="${it.id}" role="button" tabindex="0">${itemPic(it, 'mall-ic sm')}<div class="grow"><div class="bold ellipsis">${esc(itemName(t, it))}</div><div class="muted num">${f(t.ptsUnit, it.pts)} · ${it.stock > 0 ? f(t.stockN, it.stock) : t.outOfStock}</div></div><span class="link">✎ ${t.editItem}</span></div>`)
      .join('')}</div>
    <button class="btn" data-act="editItem" data-id="">＋ ${t.addItem}</button>`;
  }
  if (tab === 'mine' || tab === 'admin') {
    const list = (st.redemptions || []).filter((r) => r.clubId === clubId && (tab === 'admin' || r.userId === ME)).sort((a, b) => (a.status === 'pending') === (b.status === 'pending') ? b.at - a.at : a.status === 'pending' ? -1 : 1);
    return `${tabs}<div class="card flush">${list.length ? list.map((r) => recRow(r, tab === 'admin')).join('') : `<div class="empty">${t.noRedemptions}</div>`}</div>`;
  }
  return `${tabs}
  <div class="card mall-head"><div class="muted">${t.mallBalance}</div><div class="rating-big num" style="color:var(--clay)">${p.left}</div>
    <div class="muted num">${esc(f(t.mallEarned, p.earned, p.spent))}</div><div class="muted" style="margin-top:6px">${esc(f(t.mallRule, c.settings.winPoints, c.settings.lossPoints))}</div></div>
  <div class="mall-grid">${items
    .map((it) => {
      const can = it.stock > 0 && p.left >= it.pts;
      return `<div class="card mall-item">${itemPic(it)}<div class="bold ellipsis">${esc(itemName(t, it))}</div>
        <div class="num" style="color:var(--clay);font-weight:700">${f(t.ptsUnit, it.pts)}</div><div class="muted">${it.stock > 0 ? f(t.stockN, it.stock) : t.outOfStock}</div>
        <button class="btn mini" data-act="redeemAsk" data-id="${it.id}" ${can ? '' : 'disabled'}>${it.stock <= 0 ? t.outOfStock : p.left < it.pts ? t.notEnoughPts : t.redeem}</button>
</div>`;
    })
    .join('')}</div>
`;
}


// ---------------- 积分商城总入口：总积分商城（道具卡）+ 俱乐部商城 ----------------
// 活跃积分：每参加一次活动 / 比赛 +10（所有俱乐部合计），扣掉在总积分商城的兑换
const CARD_PRICE = 50;
function activityPoints(uid) {
  const earned = st.signups.filter((x) => x.userId === uid && x.status === 'joined' && (eventOf(x.eventId) || {}).startTime <= Date.now()).length * 10;
  const spent = (st.cardRedemptions || []).filter((r) => r.userId === uid).reduce((a, b) => a + b.pts, 0);
  return { earned, spent, left: earned - spent };
}

function viewShopHub(t) {
  const tab = ui.hubTab || 'platform';
  const tabs = `<div class="tabs line">${[['platform', t.platformShop], ['clubs', t.clubShop]].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="hubTab" data-k="${k}">${l}</button>`).join('')}</div>`;
  if (tab === 'clubs') {
    const mine = st.members.filter((m) => m.userId === ME).map((m) => clubOf(m.clubId)).filter((c) => c && c.shopEnabled);
    return `${tabs}<div class="muted" style="padding:0 4px">${t.clubPtsRule}</div>
    <div class="card flush">${mine.length ? '' : `<div class="empty">${t.noShopClubs}</div>`}${mine
      .map((c) => `<div class="item" data-act="openMallOf" data-id="${c._id}" role="button" tabindex="0">${clubAvatar(c)}
        <div class="grow"><div class="bold ellipsis">${esc(c.name)}</div><div class="muted">${esc(f(t.myClubPts, mallPoints(c._id, ME).left))}</div></div><span class="arrow">›</span></div>`)
      .join('')}</div>`;
  }
  const p = activityPoints(ME);
  const credits = st.users[ME].changeCredits || {};
  const cards = [['nickName', '✏️'], ['avatar', '🖼️'], ['pbLevel', '🏅']];
  return `${tabs}
  <div class="card mall-head"><div class="muted">${t.activityPts}</div><div class="rating-big num" style="color:var(--clay)">${p.left}</div>
    <div class="muted num">${esc(f(t.mallEarned, p.earned, p.spent))}</div><div class="muted" style="margin-top:6px">${t.activityPtsRule}</div></div>
  ${cards
    .map(([k, ic]) => `<div class="card row" style="gap:12px"><span class="card-ic">${ic}</span>
      <div class="grow"><div class="bold">${t['card_' + k]}</div><div class="muted">${t['card_' + k + '_d']}</div>
      <div class="num" style="color:var(--clay);font-weight:700">${f(t.ptsUnit, CARD_PRICE)} <span class="muted" style="font-weight:400">· ${f(t.owned, credits[k] || 0)}</span></div></div>
      <button class="btn mini" data-act="buyCard" data-k="${k}" ${p.left >= CARD_PRICE ? '' : 'disabled'}>${p.left >= CARD_PRICE ? t.redeem : t.notEnoughPts}</button></div>`)
    .join('')}`;
}


// ---------------- 管理后台（会长 / 副会长） ----------------
function viewClubAdmin(t, id) {
  const c = clubOf(id);
  const owner = isOwner(id);
  const apps = (c.applications || []).length;
  const pendingGifts = (st.redemptions || []).filter((r) => r.clubId === id && r.status === 'pending').length;
  const item = (act, ic, label, ok, badge, extra = '') =>
    `<button class="li ${ok ? '' : 'off'}" ${ok ? `data-act="${act}" ${extra}` : 'disabled'}><span class="li-ic">${ic}</span><span class="grow">${label}</span>${badge ? `<span class="tag clay">${badge}</span>` : ''}<span class="arrow">›</span></button>`;
  const daily = [
    item('newEventNa', '📣', t.newEventTitle, can(id, 'events')),
    item('clubMembers', '📝', f(t.applicationsN, apps), can(id, 'members'), apps ? f(t.pendingN, apps) : ''),
    item('clubMembers', '👥', t.linkMembers, true),
    item('clubMembers', '✅', t.btnCertify, can(id, 'certify')),
    item('admMoney', '💳', t.adm_money, can(id, 'money')),
    item('admGifts', '🎁', t.adm_shopGive, can(id, 'shop') && shopOn(id), pendingGifts && shopOn(id) ? f(t.pendingN, pendingGifts) : ''),
  ];
  const anyOff = !owner && PERMS.some((k) => !can(id, k));
  return `<div class="card row" style="gap:10px">${clubAvatar(c)}<div class="grow"><div class="bold">${esc(c.name)}</div><div class="muted">${t.myClubRole}：${fmt.role((memberOf(id, ME) || {}).role)}</div></div></div>
  <div class="section-title">${t.adminSection}</div>
  <div class="card mlist">${daily.join('')}</div>
  ${anyOff ? `<div class="muted" style="padding:0 4px">${t.permsOffNote}</div>` : ''}
  ${
    owner
      ? `<div class="section-title">${t.ownerSection}</div>
  <div class="card mlist">
    ${item('clubSettings', '⚙️', t.clubSettings, true)}
    ${item('clubSettings', '🔐', t.cs_adminPerms, true)}
    ${item('clubSettings', '🎁', `${t.mall}：${shopOn(id) ? t.shopOn : t.shopOff}`, true)}
    ${item('admShopManage', '🛍️', t.adm_shopManage, true)}
  </div>`
      : ''
  }`;
}

// 收款记录：每场 AA 的付款情况
function viewClubMoney(t, id) {
  const evs = clubEvents(id).filter((e) => e.bill);
  return `<div class="card flush">${
    evs.length
      ? evs
          .map((e) => {
            const ids = Object.keys(e.bill.items);
            const unpaid = ids.filter((u) => e.bill.items[u] !== 'paid').length;
            return `<div class="item" data-act="event" data-id="${e._id}" role="button" tabindex="0"><div class="grow"><div class="bold ellipsis">${esc(e.title)}</div><div class="muted">${fmt.shortDate(e.startTime)} · ${money(e.clubId, Object.values(e.bill.amounts).reduce((a, b) => a + b, 0))}</div></div>
            <span class="pay ${unpaid ? 'unpaid' : 'paid'}">${unpaid ? f(t.unpaidN, unpaid) : t.allPaid}</span><span class="arrow">›</span></div>`;
          })
          .join('')
      : `<div class="empty">${t.noBills}</div>`
  }</div>`;
}

// ---------------- 弹层 ----------------
function sheetHtml(t) {
  const s = ui.sheet;
  if (!s) return '';
  if (s.kind === 'note') {
    return `<div class="mask center-mask" data-act="closeSheet"><div class="dialog" data-stop="1">
      <button class="x" data-act="closeSheet" aria-label="${t.close}">×</button>
      <div class="bold center">✅ ${esc(s.title)}</div>
      <input id="noteInput" class="note-input" maxlength="10" placeholder="${t.notePh}" value="${esc(s.text)}" data-input="note">
      <div class="note-tags">${NOTE_TAGS.map((k) => `<button class="${s.text === t['tag_' + k] ? 'on' : ''}" data-act="pickNote" data-k="${k}">${t['tag_' + k]}</button>`).join('')}</div>
      <div class="btn-row"><button class="btn" data-act="saveNote">${t.addNote}</button><button class="btn ghost" data-act="closeSheet">${t.close}</button></div>
    </div></div>`;
  }
  if (s.kind === 'needVip') {
    return `<div class="mask center-mask" data-act="closeSheet"><div class="dialog" data-stop="1">
      <div class="bold center">🎁 ${t.enableShop}</div>
      <div>${t.shopNeedVip}</div>
      <div class="center hi">${t.priceVip}</div>
      <div class="btn-row"><button class="btn ghost" data-act="closeSheet">${t.cancel}</button><button class="btn" data-act="goVip">${t.goVip}</button></div>
    </div></div>`;
  }
  if (s.kind === 'editField') {
    const long = ['notice', 'intro', 'memberNote'].includes(s.key);
    const num = s.key === 'fxRate';
    return `<div class="mask" data-act="closeSheet"><div class="sheet" data-stop="1">
      <h3>${esc(s.label)}</h3>
      ${long ? `<textarea id="fieldInput" class="note-input" rows="4" maxlength="200" placeholder="${esc(s.ph || '')}">${esc(s.value)}</textarea>` : `<input id="fieldInput" class="note-input" ${num ? 'type="number" inputmode="decimal" step="0.01"' : 'maxlength="40"'} placeholder="${esc(s.ph || '')}" value="${esc(s.value)}">`}
      ${s.key === 'fxRate' ? `<div class="muted">${t.fxHint}</div>` : ''}
      <div class="btn-row"><button class="btn ghost" data-act="closeSheet">${t.cancel}</button><button class="btn" data-act="saveField">${t.save}</button></div>
    </div></div>`;
  }
  if (s.kind === 'pickOption') {
    return `<div class="mask" data-act="closeSheet"><div class="sheet" data-stop="1">
      <h3>${esc(s.label)}</h3>
      ${s.options.map(([v, l]) => `<button class="mode center ${s.value === v ? 'on' : ''}" data-act="saveOption" data-v="${v}">${l}</button>`).join('')}
      <button class="btn ghost" data-act="closeSheet">${t.cancel}</button>
    </div></div>`;
  }
  if (s.kind === 'dissolve') {
    return `<div class="mask center-mask" data-act="closeSheet"><div class="dialog" data-stop="1">
      <div class="bold center">⚠️ ${t.cs_dissolve}</div>
      <div>${esc(f(t.dissolveConfirm, clubOf(s.clubId).name))}</div>
      <div class="btn-row"><button class="btn ghost" data-act="closeSheet">${t.cancel}</button><button class="btn warn" data-act="dissolveDo">${t.cs_dissolve}</button></div>
    </div></div>`;
  }
  if (s.kind === 'clubInvite') {
    return `<div class="mask center-mask" data-act="closeSheet"><div class="dialog" data-stop="1">
      <button class="x" data-act="closeSheet" aria-label="${t.close}">×</button>
      <div class="bold center">${t.inviteShareTitle}</div>
      <div id="qrbox" class="qrbox"></div>
      <textarea id="inviteText" class="note-input" rows="4" readonly>${esc(s.message)}</textarea>
      <div class="btn-row"><button class="btn ghost" data-act="sendWechat">${t.sendToWechat}</button><button class="btn" data-act="copyInvite">${t.copyInvite}</button></div>
      <div class="muted">${t.inviteShareNote}</div>
    </div></div>`;
  }
  if (s.kind === 'item') {
    return `<div class="mask" data-act="closeSheet"><div class="sheet" data-stop="1">
      <h3>${s.id ? t.editItem : t.addItem}</h3>
      <label class="photo-pick" for="itemPhoto">${s.photo ? `<img src="${s.photo}" alt="">` : `<span>${ICONS.shop}</span>`}<span class="link">${t.uploadPhoto}</span></label>
      <input id="itemPhoto" type="file" accept="image/*" data-change="itemPhoto" hidden>
      <div class="field"><label for="itemName">${t.itemName}</label><input id="itemName" maxlength="20" value="${esc(s.name)}"></div>
      <div class="field"><label for="itemPts">${t.itemPts}</label><input id="itemPts" type="number" inputmode="numeric" value="${s.pts}"></div>
      <div class="field"><label for="itemStock">${t.itemStock}</label><input id="itemStock" type="number" inputmode="numeric" value="${s.stock}"></div>
      <div class="btn-row">${s.id ? `<button class="btn warn" data-act="deleteItem">${t.deleteItem}</button>` : `<button class="btn ghost" data-act="closeSheet">${t.cancel}</button>`}<button class="btn" data-act="saveItem">${t.save}</button></div>
    </div></div>`;
  }
  if (s.kind === 'redeem') {
    const it = st.mall[s.clubId].find((x) => x.id === s.itemId);
    return `<div class="mask center-mask" data-act="closeSheet"><div class="dialog" data-stop="1">
      ${itemPic(it, 'mall-ic center-ic')}
      <div class="bold center">${esc(f(t.redeemConfirm, it.pts, itemName(t, it)))}</div>
      <div class="btn-row"><button class="btn ghost" data-act="closeSheet">${t.cancel}</button><button class="btn" data-act="redeemDo">${t.redeem}</button></div>
    </div></div>`;
  }
  if (s.kind === 'memberOps') {
    const c = clubOf(s.clubId);
    const m = memberOf(c._id, s.userId);
    const myRole = (memberOf(c._id, ME) || {}).role;
    const u = st.users[s.userId];
    const ops = [];
    if (can(c._id, 'certify')) ops.push(['certOpen', t.btnCertify]);
    ops.push(['note', t.memberNote]);
    if (myRole === 'owner' && m.role !== 'owner') ops.push(m.role === 'admin' ? ['setMember', t.removeAdmin] : ['setAdmin', t.makeAdmin]);
    if (can(c._id, 'members') && m.role !== 'owner' && u._id !== ME && (m.role !== 'admin' || myRole === 'owner')) ops.push(['kick', t.removeFromClub]);
    if (myRole === 'owner' && m.role !== 'owner' && !u.guest) ops.push(['transfer', t.transferOwner]);
    return `<div class="mask" data-act="closeSheet"><div class="sheet" data-stop="1">
      <h3>${esc(u.nickName)}</h3>
      ${ops.map(([k, l]) => `<button class="mode center ${k === 'kick' ? 'danger' : ''}" data-act="memberOp" data-k="${k}">${l}</button>`).join('')}
      <button class="btn ghost" data-act="closeSheet">${t.cancel}</button>
    </div></div>`;
  }
  if (s.kind === 'cert') {
    const u = st.users[s.userId];
    const m = memberOf(s.clubId, s.userId);
    const LV = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5];
    return `<div class="mask center-mask" data-act="closeSheet"><div class="dialog" data-stop="1">
      <button class="x" data-act="closeSheet" aria-label="${t.close}">×</button>
      <div class="bold center">${esc(f(t.certTitle, u.nickName))}</div>
      <div class="muted center">${t.pbLevel}: ${pbBadge(t, u)}</div>
      <div class="lv-grid">${LV.map((l) => `<button class="${m.cert && m.cert.value === l ? 'on' : ''}" data-act="certPick" data-l="${l}">${l.toFixed(1)}${l === 5.5 ? '+' : ''}</button>`).join('')}</div>
      <div class="muted">${t.certNote}</div>
      ${m.cert ? `<button class="link" data-act="certClear">${t.certClear}</button>` : ''}
      <button class="link center" data-act="levels">${t.levelGuideLink}</button>
    </div></div>`;
  }
  if (s.kind === 'bill') {
    const e = eventOf(s.eventId);
    const c = computeBill(s, e);
    const sample = c.charged.find((id) => id !== ME) || c.charged[0];
    const gl = (g) => (g === 'f' ? '<span class="sex f">♀</span>' : '<span class="sex m">♂</span>');
    return `<div class="mask" data-act="closeSheet"><div class="sheet" data-stop="1">
      <h3>${t.billMakeBill}</h3>
      <div class="tabs">${[['per', t.billModePer], ['aa', t.billOpen]].map(([k, l]) => `<button class="${s.mode === k ? 'on' : ''}" data-act="billMode" data-k="${k}">${l}</button>`).join('')}</div>
      ${
        s.mode === 'aa'
          ? `<div class="field"><label for="billTotal">${t.billTotal}</label><input id="billTotal" type="number" inputmode="decimal" step="0.01" value="${s.total}" data-change="billTotal"></div>`
          : `<div class="field"><label for="billMale">${t.gender_m} ♂</label><input id="billMale" type="number" inputmode="decimal" step="0.01" value="${s.male}" data-change="billMale"><span class="muted">${currency(e.clubId)}</span></div>
             <div class="field"><label for="billFemale">${t.gender_f} ♀</label><input id="billFemale" type="number" inputmode="decimal" step="0.01" value="${s.female}" data-change="billFemale"><span class="muted">${currency(e.clubId)}</span></div>`
      }
      <div class="field"><label for="billPayId">${t.billPayId}</label><input id="billPayId" placeholder="${t.billPayIdPh}" value="${esc(s.payId)}" data-change="billPayId"></div>
      <div class="bill-rows">${c.ids
        .map((id) => {
          const u = st.users[id];
          const on = s.include[id];
          return `<button class="bill-row" data-act="toggleInclude" data-id="${id}">${avatar(u, 'xs')}<span class="grow ellipsis">${esc(u.nickName)} ${gl(u.gender)}${id === e.creatorId ? `<span class="muted">${t.organizerTag}</span>` : ''}</span>
            <span class="num ${on ? 'bold' : 'muted'}">${on ? money(e.clubId, c.amounts[id]) : t.notCharged}</span><span class="check ${on ? 'on' : ''}">✓</span></button>`;
        })
        .join('')}</div>
      <div class="bold num">${esc(f(t.billSummary, c.charged.length, c.men, c.women, money(e.clubId, c.sum)))}</div>
      <div class="muted">${t.billMsgTitle}</div>
      <div class="msg-preview">${sample && c.amounts[sample] ? esc(billMessage(t, e, sample, c.amounts[sample], s.payId || '—')) : '—'}</div>
      <div class="muted">${t.billNotifyHint}</div>
      <div class="btn-row"><button class="btn ghost" data-act="closeSheet">${t.cancel}</button><button class="btn" data-act="sendBill">${t.billSend}</button></div>
    </div></div>`;
  }
  if (s.kind === 'paySettings') {
    const c = clubOf(s.clubId);
    return `<div class="mask" data-act="closeSheet"><div class="sheet" data-stop="1">
      <h3>${t.clubPaySettings}</h3>
      <div class="field"><label for="psPayId">${t.billPayId}</label><input id="psPayId" placeholder="${t.billPayIdPh}" value="${esc(c.payId || '')}"></div>
      <div class="field"><label for="psFx">${t.fxRate}</label><span class="muted">1 A$ = ¥</span><input id="psFx" type="number" inputmode="decimal" step="0.01" placeholder="${t.fxRatePh}" value="${c.fxRate || ''}"></div>
      <div class="muted">${t.fxHint}</div>
      <div class="btn-row"><button class="btn ghost" data-act="closeSheet">${t.cancel}</button><button class="btn" data-act="savePaySettings">${t.save}</button></div>
    </div></div>`;
  }
  if (s.kind === 'bring') {
    return `<div class="mask center-mask" data-act="closeSheet"><div class="dialog" data-stop="1">
      <button class="x" data-act="closeSheet" aria-label="${t.close}">×</button>
      <div class="bold center">${t.bringTitle}</div>
      <div class="field"><label>${t.gender}</label>${['m', 'f'].map((g) => `<button class="radio ${s.gender === g ? 'on' : ''}" data-act="bringGender" data-k="${g}">${t['gender_' + g]} ${g === 'm' ? '♂' : '♀'}</button>`).join('')}</div>
      <div class="field"><label for="friendName">${t.nickname}</label><input id="friendName" maxlength="8" placeholder="${t.friendNamePh}" value="${esc(s.name)}" data-input="friendName"></div>
      <button class="btn" data-act="confirmBring">${t.confirmBring}</button>
    </div></div>`;
  }
  if (s.kind === 'invite') {
    const inv = st.invites.find((i) => i.guestId === s.guestId);
    return `<div class="mask center-mask" data-act="closeSheet"><div class="dialog" data-stop="1">
      <button class="x" data-act="closeSheet" aria-label="${t.close}">×</button>
      <div class="bold center">${t.inviteTitle} · ${esc(st.users[s.guestId].nickName)}</div>
      <div id="qrbox" class="qrbox"></div>
      <div class="center bold num">${esc(f(t.inviteCodeLine, inv.code))}</div>
      <div class="muted">${t.inviteDesc}</div>
      <div class="btn-row"><button class="btn ghost" data-act="na">${t.shareInvite}</button><button class="btn" data-act="simulateAccept">${t.simulateAccept}</button></div>
    </div></div>`;
  }
  if (s.kind === 'qr') {
    return `<div class="mask center-mask" data-act="closeSheet"><div class="dialog" data-stop="1">
      <button class="x" data-act="closeSheet" aria-label="${t.cancel}">×</button>
      <div class="bold center">${esc(s.title || t.qrTitle)}</div>
      <div id="qrbox" class="qrbox"></div>
      ${s.note ? `<div class="center bold num">${esc(s.note)}</div>` : ''}
      <div class="muted center">${t.qrPreviewNote}</div>
    </div></div>`;
  }
  if (s.kind === 'strength') {
    // 实力：按匹克球等级（自评或 DUPR）排序，未填写的排最后
    const lv = (u) => (u.pbLevel ? Number(u.pbLevel.value) : -1);
    const list = joinedOf(s.eventId).map((x) => st.users[x.userId]).sort((a, b) => lv(b) - lv(a));
    const rated = list.filter((u) => u.pbLevel);
    const avgL = rated.length ? avg(rated.map(lv)) : 0;
    return `<div class="mask" data-act="closeSheet"><div class="sheet" data-stop="1">
      <h3>${t.strengthTitle}</h3>
      <div class="muted center num">${rated.length ? f(t.avgLevel, avgL.toFixed(2), rated.length) : t.notRated}</div>
      <div>${list.map((u, i) => `<div class="item" data-act="player" data-id="${u._id}" role="button" tabindex="0"><span class="rank-n num">${i + 1}</span>${avatar(u, 'sm')}<span class="grow ellipsis">${esc(u.nickName)}</span>${pbBadge(t, u)}</div>`).join('')}</div>
      <div class="row between"><button class="link" data-act="levels">${t.levelGuideLink}</button><button class="btn ghost mini" data-act="closeSheet">${t.done}</button></div>
    </div></div>`;
  }
  if (s.kind === 'level') {
    const tab = s.type;
    return `<div class="mask" data-act="closeSheet"><div class="sheet" data-stop="1">
      <h3>${t.pbLevel}</h3>
      <div class="tabs">${['self', 'dupr'].map((k) => `<button class="${tab === k ? 'on' : ''}" data-act="levelTab" data-k="${k}">${k === 'self' ? t.pbSelf : t.pbDupr}</button>`).join('')}</div>
      ${
        tab === 'self'
          ? SELF_LEVELS.map((l) => `<button class="mode ${s.self === l ? 'on' : ''}" data-act="pickSelf" data-l="${l}"><div class="bold num">${l.toFixed(1)}</div><div class="muted">${t[levelKey(l)]}</div></button>`).join('')
          : `<div class="field"><label for="dupr">${t.pbDupr}</label><input id="dupr" type="number" inputmode="decimal" step="0.001" min="2" max="8" placeholder="${t.duprPh}" value="${s.dupr}"></div>
             <div class="muted">${t.duprHint}</div>`
      }
      ${!st.users[ME].doubles.games && !st.users[ME].singles.games ? `<div class="muted">${t.pbSeedHint}</div>` : ''}
      <div class="btn-row"><button class="btn ghost" data-act="closeSheet">${t.cancel}</button><button class="btn" data-act="confirmLevel">${t.ok}</button></div>
    </div></div>`;
  }
  if (s.kind === 'launch') {
    const opt = (ic, label) => `<button class="mode row" data-act="na"><span class="li-ic">${ic}</span><span class="bold">${label}</span></button>`;
    return `<div class="mask" data-act="closeSheet"><div class="sheet" data-stop="1">
      <h3>${t.launch}</h3>${opt('📣', t.newEventTitle)}${opt('🏠', t.createClub)}${opt('🔑', t.joinByCode)}
      <button class="btn ghost" data-act="closeSheet">${t.cancel}</button></div></div>`;
  }
  if (s.kind === 'gen') {
    const e = eventOf(s.eventId);
    const modes = OPEN_MODES;
    const rr = ['fixed', 'singlesRR'].includes(s.mode);
    return `<div class="mask" data-act="closeSheet"><div class="sheet" data-stop="1">
      <h3>${f(t.genTitle, joinedOf(e._id).length)}</h3>
      ${modes.map((k) => `<button class="mode ${s.mode === k ? 'on' : ''}" data-act="pickMode" data-k="${k}"><div class="bold">${t['mode_' + k]}</div><div class="muted">${t['mode_' + k + '_d']}</div></button>`).join('')}
      <div class="field"><label for="genCourts">${t.courts}</label><input id="genCourts" type="number" inputmode="numeric" value="${s.courts}"></div>
      ${rr ? `<div class="muted">${t.rrNote}</div>` : `<div class="field"><label for="genRounds">${t.rounds}</label><input id="genRounds" type="number" inputmode="numeric" value="${s.rounds}"></div>`}
      <div class="btn-row"><button class="btn ghost" data-act="closeSheet">${t.cancel}</button><button class="btn" data-act="generate">${t.generateBtn}</button></div>
    </div></div>`;
  }
  if (s.kind === 'score') {
    const m = st.matches.find((x) => x._id === s.matchId);
    const admin = isAdmin(m.clubId);
    const names = (team) => team.map((id) => `<div class="ellipsis">${esc(st.users[id].nickName)}</div>`).join('');
    const side = (k, team) => `<div class="side"><div class="names">${names(team)}</div>
      <div class="stepper"><button class="st" data-act="step" data-k="${k}" data-d="-1" aria-label="-1">−</button>
      <input id="${k}" type="number" inputmode="numeric" min="0" max="99" value="${s[k]}"><button class="st" data-act="step" data-k="${k}" data-d="1" aria-label="+1">＋</button></div>
      <button class="quick" data-act="quick" data-k="${k}">11</button></div>`;
    const pred = predict(m.teamA.map((id) => st.users[id]), m.teamB.map((id) => st.users[id]), m.type);
    return `<div class="mask" data-act="closeSheet"><div class="sheet" data-stop="1">
      <h3>${f(t.scoreTitle, m.round, m.court)}</h3>
      <div class="score-edit">${side('scoreA', m.teamA)}<div class="colon">:</div>${side('scoreB', m.teamB)}</div>
      <div class="muted center">${esc(f(t.scoreHint, pred))}</div>
      <div class="btn-row">${admin ? `<button class="btn warn" data-act="deleteMatch">${t.delete}</button>` : ''}<button class="btn" data-act="submitScore">${m.status === 'done' ? t.updateScore : t.submit}</button></div>
    </div></div>`;
  }
  return '';
}

// ---------------- 渲染 ----------------
function render() {
  const t = i18n.dict();
  const v = top();
  let title = t.appName;
  let html;
  if (!v) {
    if (ui.tab === 'home') html = viewHome(t);
    else {
      title = t.tabMe;
      html = viewMe(t);
    }
  } else if (v.view === 'club') {
    title = clubOf(v.id).name;
    html = viewClub(t, v.id);
  } else if (v.view === 'premium') {
    title = t.premiumTitle;
    html = viewPremium(t);
  } else if (v.view === 'feedback') {
    title = t.fbTitle;
    html = viewFeedback(t);
  } else if (v.view === 'clubAdmin') {
    title = t.adminConsole;
    html = viewClubAdmin(t, v.id);
  } else if (v.view === 'clubMoney') {
    title = t.adm_money;
    html = viewClubMoney(t, v.id);
  } else if (v.view === 'clubSettings') {
    title = t.clubSettings;
    html = viewClubSettings(t, v.id);
  } else if (v.view === 'shopHub') {
    title = t.mall;
    html = viewShopHub(t);
  } else if (v.view === 'mall') {
    title = `${clubOf(v.id).name} · ${t.mall}`;
    html = viewMall(t, v.id);
  } else if (v.view === 'clubMembers') {
    title = `${clubOf(v.id).name} · ${t.statMembers}`;
    html = viewClubMembers(t, v.id);
  } else if (v.view === 'clubEvents') {
    title = `${clubOf(v.id).name} · ${v.comps ? t.statGames : t.statSessions}`;
    html = viewClubEvents(t, v.id, v.comps);
  } else if (v.view === 'event') {
    title = eventOf(v.id).title;
    html = viewEvent(t, v.id);
  } else if (v.view === 'player') {
    title = v.id === ME ? t.menu_rating : st.users[v.id].nickName;
    html = viewProfile(t, v.id);
  } else if (v.view === 'invites') {
    title = t.myInvites;
    html = viewInvites(t);
  } else if (v.view === 'players') {
    title = t.playerList;
    html = viewPlayers(t, v.id);
  } else if (v.view === 'levels') {
    title = t.lvPageTitle;
    html = viewLevels(t);
  } else if (v.view === 'formats') {
    title = t.menu_formats;
    html = viewFormats(t);
  } else if (v.view === 'record') {
    title = t['rec_' + v.kind];
    html = viewRecord(t, v.kind);
  } else if (v.view === 'edit') {
    title = t.editProfile;
    html = viewEdit(t);
  } else if (v.view === 'myEvents') {
    title = t.menu_events;
    html = viewMyEvents(t);
  } else if (v.view === 'myMatches') {
    title = t.menu_matches;
    html = viewMyMatches(t);
  } else if (v.view === 'guide') {
    title = t[{ levels: 'menu_levels', formats: 'menu_formats', start: 'menu_guide' }[v.topic]];
    html = viewGuide(t, v.topic);
  } else {
    title = t.r_nav;
    html = viewRules(t);
  }
  const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  document.getElementById('app').innerHTML = `
    <div class="banner"><span>${px('banner')}</span><button data-act="reset">${px('reset')}</button></div>
    <div class="nav">${ui.stack.length ? `<button class="back" data-act="back" aria-label="Back">‹</button>` : '<span></span>'}<div class="title">${esc(title)}</div><div class="langsw" role="group" aria-label="Language">${[['zh', '中'], ['en', 'EN']].map(([l, n]) => `<button class="${i18n.getLang() === l ? 'on' : ''}" data-act="lang" data-l="${l}">${n}</button>`).join('')}</div></div>
    <div class="scroll" id="scroll"><div class="page">${html}</div></div>
    ${v && v.view === 'event' ? eventActionBar(t, v.id) : ''}
    ${v && v.view === 'club' ? clubActionBar(t, v.id) : ''}
    ${ui.stack.length ? '' : `<nav class="tabbar">
      <button class="${ui.tab === 'home' ? 'on' : ''}" data-act="tab" data-tab="home">${icon('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>')}${t.tabHome}</button>
      <button class="launch" data-act="launch"><span class="plus">＋</span>${t.launch}</button>
      <button class="${ui.tab === 'me' ? 'on' : ''}" data-act="tab" data-tab="me">${icon('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>')}${t.tabMe}</button></nav>`}
    ${sheetHtml(t)}
    <div id="toast" class="toast" hidden></div>`;
  drawQr();
}

// 二维码：预览里指向本页面；正式版用云函数生成小程序码
function drawQr() {
  const box = document.getElementById('qrbox');
  if (!box) return;
  const sh = ui.sheet;
  const inv = sh.kind === 'invite' && st.invites.find((i) => i.guestId === sh.guestId);
  const text = sh.qrText || sh.text || 'https://claude.ai/artifact/R3D2paBetipAPpUdmAGtww#' + (inv ? 'invite-' + inv.code : 'event-' + sh.eventId);
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    box.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2 });
  } catch (err) {
    box.textContent = text;
  }
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2200);
}

// 保持滚动位置的重绘（弹层开关、录分等）
function rerender(keepScroll = true) {
  const y = keepScroll && document.getElementById('scroll') ? document.getElementById('scroll').scrollTop : 0;
  render();
  if (keepScroll) document.getElementById('scroll').scrollTop = y;
}

// ---------------- 交互 ----------------
const num = (id) => {
  const el = document.getElementById(id);
  return el ? el.value : '';
};

const actions = {
  back() {
    ui.stack.pop();
    ui.sheet = null;
    render();
  },
  tab(d) {
    ui.stack = [];
    ui.tab = d.tab;
    render();
  },
  club(d) {
    const cv = clubOf(d.id);
    cv.views = (cv.views || 0) + 1;
    save();
    ui.memberQ = '';
    ui.clubTab = 'home';
    ui.rankKind = 'active';
    ui.period = 'all';
    go({ view: 'club', id: d.id });
  },
  event(d) {
    ui.eventTab = null;
    const ev = eventOf(d.id);
    ev.views = (ev.views || 0) + 1;
    save();
    go({ view: 'event', id: d.id });
  },
  player(d) {
    ui.ptype = 'doubles';
    go({ view: 'player', id: d.id });
  },
  rules() {
    go({ view: 'rules' });
  },
  lang(d) {
    i18n.setLang(d.l);
    document.documentElement.lang = d.l;
    rerender();
  },
  launch() {
    ui.sheet = { kind: 'launch' };
    rerender();
  },
  record(d) {
    ui.rec = { filter: '10', from: '', to: '' };
    go({ view: 'record', kind: d.kind });
  },
  recFilter(d) {
    ui.rec.filter = d.k;
    if (d.k === 'custom' && !ui.rec.from) {
      ui.rec.to = fmt.date(Date.now());
      ui.rec.from = fmt.date(Date.now() - 30 * DAY);
    }
    rerender();
  },
  pickNote(d) {
    ui.sheet.tag = d.k;
    ui.sheet.text = i18n.t('tag_' + d.k);
    rerender();
  },
  saveNote() {
    const s = ui.sheet;
    const typed = (num('noteInput') || '').trim().slice(0, 10);
    const mine = st.signups.find((x) => x.eventId === s.eventId && x.userId === ME && x.status !== 'cancelled');
    if (mine) mine.note = s.tag && typed === i18n.t('tag_' + s.tag) ? '#' + s.tag : typed;
    ui.sheet = null;
    save();
    rerender();
    toast(i18n.t('saved'));
  },
  openBill() {
    const e = eventOf(top().id);
    const include = {};
    joinedOf(e._id).forEach((x) => (include[x.userId] = x.userId !== e.creatorId));
    ui.sheet = { kind: 'bill', eventId: e._id, mode: 'aa', total: '', male: '', female: '', payId: clubOf(e.clubId).payId || '', include };
    rerender();
  },
  billMode(d) {
    ui.sheet.mode = d.k;
    rerender();
  },
  toggleInclude(d) {
    ui.sheet.include[d.id] = !ui.sheet.include[d.id];
    rerender();
  },
  sendBill() {
    const s = ui.sheet;
    const e = eventOf(s.eventId);
    const c = computeBill(s, e);
    if (!(c.sum > 0)) return toast(i18n.t('err_billTotal'));
    if (!String(s.payId).trim()) return toast(i18n.t('err_billPayId'));
    e.bill = { mode: s.mode, total: c.sum, payId: s.payId.trim(), sentAt: Date.now(), amounts: c.amounts, items: Object.fromEntries(c.charged.map((id) => [id, 'unpaid'])) };
    clubOf(e.clubId).payId = e.bill.payId;
    ui.sheet = null;
    save();
    rerender();
    toast(i18n.t('billSent', c.charged.length));
  },
  openPaySettings() {
    ui.sheet = { kind: 'paySettings', clubId: top().id };
    rerender();
  },
  savePaySettings() {
    const c = clubOf(ui.sheet.clubId);
    const fxv = num('psFx').trim();
    if (fxv && !(Number(fxv) > 0)) return toast(i18n.t('err_fxRate'));
    c.payId = num('psPayId').trim();
    c.fxRate = fxv ? Number(fxv) : 0;
    ui.sheet = null;
    save();
    rerender();
    toast(i18n.t('saved'));
  },
  toggleScope() {
    const e = eventOf(top().id);
    e.visibility = e.visibility === 'public' ? 'club' : 'public';
    save();
    rerender();
  },
  toggleUmpire() {
    const e = eventOf(top().id);
    e.autoUmpire = !e.autoUmpire;
    save();
    rerender();
  },
  toggleGuests() {
    const e = eventOf(top().id);
    e.allowGuests = !e.allowGuests;
    save();
    rerender();
  },
  openBring() {
    ui.sheet = { kind: 'bring', eventId: top().id, gender: 'm', name: '' };
    rerender();
  },
  bringGender(d) {
    ui.sheet.gender = d.k;
    rerender();
  },
  confirmBring() {
    const s = ui.sheet;
    const name = (s.name || '').trim().slice(0, 8);
    if (!name) return toast(i18n.t('err_friendName'));
    const e = eventOf(s.eventId);
    if (st.signups.filter((x) => x.eventId === e._id && x.broughtBy === ME && x.status !== 'cancelled').length >= BRING_LIMIT) return toast(i18n.t('bringLimit', BRING_LIMIT));
    const id = 'f' + st.seq++;
    st.users[id] = { _id: id, nickName: name, gender: s.gender, guest: true, broughtBy: ME, avatarUrl: '', pbLevel: null, color: COLORS[st.seq % COLORS.length], doubles: { rating: 3.0, games: 0, wins: 0, losses: 0 }, singles: { rating: 3.0, games: 0, wins: 0, losses: 0 } };
    const full = joinedOf(e._id).length >= e.capacity;
    st.signups.push({ eventId: e._id, userId: id, status: full ? 'waitlist' : 'joined', createdAt: Date.now(), broughtBy: ME });
    st.invites.push({ code: Math.random().toString(36).slice(2, 8).toUpperCase(), inviter: ME, guestId: id, eventId: e._id, createdAt: Date.now(), status: 'pending' });
    ui.sheet = null;
    save();
    rerender();
    toast(i18n.t(full ? 'signupFull' : 'signupOk'));
  },
  openInvite(d) {
    ui.sheet = { kind: 'invite', guestId: d.id };
    rerender();
  },
  simulateAccept() {
    const inv = st.invites.find((i) => i.guestId === ui.sheet.guestId);
    const name = st.users[inv.guestId].nickName;
    claimInvite(inv);
    ui.sheet = null;
    save();
    rerender();
    toast(i18n.t('inviteAccepted', name));
  },
  myInvites() {
    go({ view: 'invites' });
  },
  sendJoinInvites() {
    const e = eventOf(top().id);
    const outsiders = [...new Set(st.matches.filter((m) => m.eventId === e._id).flatMap((m) => m.players))].filter((id) => st.users[id] && !st.users[id].guest && !memberOf(e.clubId, id));
    e.joinInvites = e.joinInvites || {};
    outsiders.forEach((id) => (e.joinInvites[id] = 'sent'));
    save();
    rerender();
    toast(i18n.t('joinInvitesSent', outsiders.length));
  },
  simulateJoin(d) {
    const e = eventOf(top().id);
    if (!memberOf(e.clubId, d.id)) st.members.push({ clubId: e.clubId, userId: d.id, role: 'member' });
    e.joinInvites[d.id] = 'joined';
    save();
    rerender();
  },
  togglePay(d) {
    const b = eventOf(top().id).bill;
    b.items[d.id] = b.items[d.id] === 'paid' ? 'unpaid' : 'paid';
    save();
    rerender();
  },
  iPaid() {
    eventOf(top().id).bill.items[ME] = 'claimed';
    save();
    rerender();
  },
  copyPayId() {
    const v = eventOf(top().id).bill.payId;
    const ok = () => toast(i18n.t('copied'));
    try {
      navigator.clipboard.writeText(v).then(ok, () => toast(v));
    } catch (err) {
      toast(v);
    }
  },
  openQr() {
    ui.sheet = { kind: 'qr', eventId: top().id };
    rerender();
  },
  players() {
    ui.plTab = 'joined';
    go({ view: 'players', id: top().id });
  },
  plTab(d) {
    ui.plTab = d.k;
    rerender();
  },
  levels() {
    ui.sheet = null;
    ui.lvTab = 'std';
    go({ view: 'levels' });
  },
  lvTab(d) {
    ui.lvTab = d.k;
    rerender(false);
  },
  selfRate() {
    actions.edit();
    if (!PR.nextChangeAt(st.users[ME], 'pbLevel', Date.now())) actions.openLevel();
  },
  clubMembers() {
    go({ view: 'clubMembers', id: top().id });
  },
  clubSessions() {
    go({ view: 'clubEvents', id: top().id, comps: false });
  },
  clubComps() {
    go({ view: 'clubEvents', id: top().id, comps: true });
  },
  clubAdmin() {
    go({ view: 'clubAdmin', id: top().id });
  },
  admMoney() {
    go({ view: 'clubMoney', id: top().id });
  },
  admGifts() {
    ui.mallTab = 'admin';
    go({ view: 'mall', id: top().id });
  },
  admShopManage() {
    if (!shopOn(top().id)) return toast(i18n.t('adm_shopNeedOn'));
    ui.mallTab = 'manage';
    go({ view: 'mall', id: top().id });
  },
  becomeVip() {
    Object.assign(st.users[ME], { premium: true, premiumUntil: Date.now() + 365 * DAY });
    save();
    rerender();
    toast(i18n.t('vipDone'));
  },
  shopToggle() {
    const c = clubOf(top().id);
    if (c.shopEnabled) {
      c.shopEnabled = false;
    } else {
      if (!isVip(st.users[ME])) {
        ui.sheet = { kind: 'needVip' };
        return rerender();
      }
      c.shopEnabled = true;
    }
    save();
    rerender();
    if (c.shopEnabled) toast(i18n.t('shopEnabledToast'));
  },
  goVip() {
    ui.sheet = null;
    go({ view: 'premium' });
  },
  createClubTry() {
    const owned = st.clubs.filter((c) => (st.members.find((m) => m.clubId === c._id && m.role === 'owner') || {}).userId === ME).length;
    const limit = isVip(st.users[ME]) ? 3 : 1;
    if (owned >= limit) return toast(i18n.errMsg('clubLimit', { n: limit }));
    toast(px('notInPreview'));
  },
  homeTab(d) {
    ui.homeTab = d.k;
    rerender(false);
  },
  premium() {
    go({ view: 'premium' });
  },
  feedback() {
    ui.fbType = '';
    go({ view: 'feedback' });
  },
  fbType(d) {
    ui.fbType = d.k;
    rerender();
  },
  fbSend() {
    const v = num('fbText').trim();
    if (!v) return toast(i18n.t('fbEmpty'));
    st.feedback = st.feedback || [];
    st.feedback.push({ type: ui.fbType, text: v.slice(0, 200), at: Date.now() });
    save();
    ui.stack.pop();
    render();
    toast(i18n.t('fbSent'));
  },
  clubSettings() {
    go({ view: 'clubSettings', id: top().id });
  },
  editField(d) {
    const c = clubOf(top().id);
    const labels = { name: 'cs_name', short: 'cs_short', venueName: 'cs_venue', notice: 'cs_notice', intro: 'intro', phone: 'cs_phone', wechat: 'cs_wechat', payId: 'billPayId', fxRate: 'fxRate' };
    const value = d.k === 'venueName' ? (c.venue || {}).name || '' : c[d.k] || '';
    ui.sheet = { kind: 'editField', clubId: c._id, key: d.k, label: i18n.t(labels[d.k]), value: String(value), ph: d.k === 'payId' ? i18n.t('billPayIdPh') : d.k === 'fxRate' ? i18n.t('fxRatePh') : '' };
    rerender();
  },
  saveField() {
    const s = ui.sheet;
    const v = num('fieldInput').trim();
    const c = clubOf(s.clubId);
    if (s.key === 'memberNote') memberOf(s.clubId, s.userId).note = v.slice(0, 40);
    else if (s.key === 'venueName') c.venue = { ...(c.venue || {}), name: v, city: (c.venue || {}).city || c.city };
    else if (s.key === 'fxRate') {
      if (v && !(Number(v) > 0)) return toast(i18n.t('err_fxRate'));
      c.fxRate = v ? Number(v) : 0;
    } else if (s.key === 'name') {
      if (!v) return toast(i18n.errMsg('required', { field: 'clubName' }));
      c.name = v.slice(0, 30);
    } else c[s.key] = v;
    ui.sheet = null;
    save();
    rerender();
    toast(i18n.t('saved'));
  },
  pickOption(d) {
    const c = clubOf(top().id);
    const t = i18n.dict();
    const defs = {
      joinMode: [t.cs_joinMode, c.joinMode || 'review', ['open', 'review', 'invite'].map((k) => [k, t['jm_' + k]])],
      inviteWho: [t.cs_inviteWho, c.inviteWho || 'admins', ['admins', 'all'].map((k) => [k, t['iw_' + k]])],
      visible: [t.cs_visible, c.private ? 'members' : 'all', [['all', t.vis_all], ['members', t.privateClub]]],
    };
    const [label, value, options] = defs[d.k];
    ui.sheet = { kind: 'pickOption', clubId: c._id, key: d.k, label, value, options };
    rerender();
  },
  saveOption(d) {
    const s = ui.sheet;
    const c = clubOf(s.clubId);
    if (s.key === 'visible') c.private = d.v === 'members';
    else c[s.key] = d.v;
    ui.sheet = null;
    save();
    rerender();
  },
  togglePerm(d) {
    const c = clubOf(top().id);
    c.adminPerms = c.adminPerms || {};
    c.adminPerms[d.k] = c.adminPerms[d.k] === false;
    save();
    rerender();
  },
  dissolveAsk() {
    ui.sheet = { kind: 'dissolve', clubId: top().id };
    rerender();
  },
  dissolveDo() {
    const id = ui.sheet.clubId;
    const evIds = new Set(st.events.filter((e) => e.clubId === id).map((e) => e._id));
    st.events = st.events.filter((e) => e.clubId !== id);
    st.signups = st.signups.filter((x) => !evIds.has(x.eventId));
    st.matches = st.matches.filter((m) => m.clubId !== id);
    st.members = st.members.filter((m) => m.clubId !== id);
    st.clubs = st.clubs.filter((c) => c._id !== id);
    ui.sheet = null;
    ui.stack = [];
    ui.tab = 'home';
    save();
    render();
    toast(i18n.t('dissolved'));
  },
  clubInvite() {
    const c = clubOf(top().id);
    const link = 'https://claude.ai/artifact/R3D2paBetipAPpUdmAGtww#club-' + c.inviteCode;
    ui.sheet = { kind: 'clubInvite', clubId: c._id, qrText: link, message: i18n.t('inviteMsg', st.users[ME].nickName, c.name, c.inviteCode, link) };
    rerender();
  },
  copyInvite() {
    const el = document.getElementById('inviteText');
    const fallback = () => {
      el.focus();
      el.select();
      toast(i18n.t('copyFailed'));
    };
    try {
      navigator.clipboard.writeText(el.value).then(() => toast(i18n.t('copied')), fallback);
    } catch (err) {
      fallback();
    }
  },
  sendWechat() {
    toast(i18n.t('inviteShareNote'));
  },
  approveApp(d) {
    const c = clubOf(top().id);
    c.applications = (c.applications || []).filter((a) => a.userId !== d.id);
    if (!memberOf(c._id, d.id)) st.members.push({ clubId: c._id, userId: d.id, role: 'member', joinedAt: Date.now() });
    save();
    rerender();
  },
  rejectApp(d) {
    const c = clubOf(top().id);
    c.applications = (c.applications || []).filter((a) => a.userId !== d.id);
    save();
    rerender();
  },
  joinNow() {
    const c = clubOf(top().id);
    st.members.push({ clubId: c._id, userId: ME, role: 'member', joinedAt: Date.now() });
    save();
    rerender();
    toast(i18n.t('joinedClubNow'));
  },
  editItem(d) {
    const clubId = top().id;
    const it = d.id ? st.mall[clubId].find((x) => x.id === d.id) : null;
    const t = i18n.dict();
    ui.sheet = { kind: 'item', clubId, id: it ? it.id : '', name: it ? itemName(t, it) : '', pts: it ? it.pts : '', stock: it ? it.stock : 10, photo: it ? it.photo || '' : '' };
    rerender();
  },
  saveItem() {
    const s = ui.sheet;
    const name = num('itemName').trim();
    const pts = Number(num('itemPts'));
    const stock = Number(num('itemStock'));
    if (!name) return toast(i18n.t('err_itemName'));
    if (!Number.isInteger(pts) || pts <= 0) return toast(i18n.t('err_itemPts'));
    if (!Number.isInteger(stock) || stock < 0) return toast(i18n.t('err_itemStock'));
    st.mall[s.clubId] = st.mall[s.clubId] || [];
    const list = st.mall[s.clubId];
    let it = s.id && list.find((x) => x.id === s.id);
    if (!it) {
      it = { id: 'i' + st.seq++, icon: 'shop' };
      list.push(it);
    }
    // 改过名字的预置商品不再跟随语言翻译
    if (!it.key || name !== i18n.t(it.key)) {
      delete it.key;
      it.name = name;
    }
    Object.assign(it, { pts, stock, photo: s.photo || it.photo || '' });
    ui.sheet = null;
    save();
    rerender();
    toast(i18n.t('saved'));
  },
  deleteItem() {
    const s = ui.sheet;
    st.mall[s.clubId] = st.mall[s.clubId].filter((x) => x.id !== s.id);
    ui.sheet = null;
    save();
    rerender();
  },
  clubQr() {
    const c = clubOf(top().id);
    ui.sheet = { kind: 'qr', title: i18n.t('clubQrTitle'), text: 'https://claude.ai/artifact/R3D2paBetipAPpUdmAGtww#club-' + c.inviteCode, note: f(i18n.t('inviteCodeLine'), c.inviteCode) };
    rerender();
  },
  shopHub() {
    ui.hubTab = 'platform';
    go({ view: 'shopHub' });
  },
  hubTab(d) {
    ui.hubTab = d.k;
    rerender();
  },
  openMallOf(d) {
    ui.mallTab = 'shop';
    go({ view: 'mall', id: d.id });
  },
  buyCard(d) {
    if (activityPoints(ME).left < CARD_PRICE) return toast(i18n.t('notEnoughPts'));
    const u = st.users[ME];
    u.changeCredits = u.changeCredits || {};
    u.changeCredits[d.k] = (u.changeCredits[d.k] || 0) + 1;
    st.cardRedemptions = st.cardRedemptions || [];
    st.cardRedemptions.push({ userId: ME, card: d.k, pts: CARD_PRICE, at: Date.now() });
    save();
    rerender();
    toast(i18n.t('cardRedeemed'));
  },
  openMall() {
    ui.mallTab = 'shop';
    go({ view: 'mall', id: top().id });
  },
  mallTab(d) {
    ui.mallTab = d.k;
    rerender();
  },
  redeemAsk(d) {
    ui.sheet = { kind: 'redeem', clubId: top().id, itemId: d.id };
    rerender();
  },
  redeemDo() {
    const s = ui.sheet;
    const it = st.mall[s.clubId].find((x) => x.id === s.itemId);
    if (it.stock <= 0) return toast(i18n.t('outOfStock'));
    if (mallPoints(s.clubId, ME).left < it.pts) return toast(i18n.t('notEnoughPts'));
    it.stock -= 1;
    st.redemptions.push({ id: 'r' + st.seq++, clubId: s.clubId, userId: ME, itemId: it.id, pts: it.pts, at: Date.now(), status: 'pending' });
    ui.sheet = null;
    save();
    rerender();
    toast(i18n.t('redeemed'));
  },
  markGiven(d) {
    st.redemptions.find((r) => r.id === d.id).status = 'done';
    save();
    rerender();
  },
  restock(d) {
    st.mall[top().id].find((x) => x.id === d.id).stock += 5;
    save();
    rerender();
  },
  vipTbd() {
    toast(i18n.t('vipTbd'));
  },
  memberOps(d) {
    ui.sheet = { kind: 'memberOps', clubId: top().id, userId: d.id };
    rerender();
  },
  memberOp(d) {
    const s = ui.sheet;
    const m = memberOf(s.clubId, s.userId);
    if (d.k === 'certOpen') ui.sheet = { kind: 'cert', clubId: s.clubId, userId: s.userId };
    else if (d.k === 'note') ui.sheet = { kind: 'editField', clubId: s.clubId, key: 'memberNote', userId: s.userId, label: i18n.t('memberNote'), value: m.note || '', ph: i18n.t('memberNotePh') };
    else {
      if (d.k === 'setAdmin') m.role = 'admin';
      if (d.k === 'setMember') m.role = 'member';
      if (d.k === 'kick') st.members = st.members.filter((x) => x !== m);
      if (d.k === 'transfer') {
        memberOf(s.clubId, ME).role = 'admin';
        m.role = 'owner';
      }
      ui.sheet = null;
      save();
      toast(i18n.t('saved'));
    }
    rerender();
  },
  certPick(d) {
    const s = ui.sheet;
    memberOf(s.clubId, s.userId).cert = { value: Number(d.l), by: ME, at: Date.now() };
    ui.sheet = null;
    save();
    rerender();
    toast(i18n.t('certified'));
  },
  certClear() {
    const s = ui.sheet;
    delete memberOf(s.clubId, s.userId).cert;
    ui.sheet = null;
    save();
    rerender();
  },
  rankType(d) {
    ui.rankType = d.k;
    rerender();
  },
  toggleJoinOrder() {
    ui.newFirst = !ui.newFirst;
    rerender();
  },
  applyJoin() {
    const c = clubOf(top().id);
    c.applied = true;
    save();
    rerender();
    toast(i18n.t('applySent'));
  },
  rankKind(d) {
    ui.rankKind = d.k;
    rerender();
  },
  toggleMembersOnly() {
    ui.membersOnly = !ui.membersOnly;
    rerender();
  },
  soon() {
    toast(i18n.t('comingSoon'));
  },
  newEventNa() {
    toast(px('notInPreview'));
  },
  openStrength() {
    ui.sheet = { kind: 'strength', eventId: top().id };
    rerender();
  },
  formats(d) {
    const mode = d.mode || 'rotation';
    ui.fmtMode = mode;
    ui.fmtMode = OPEN_MODES.includes(mode) ? mode : OPEN_MODES[0];
    ui.fmtCat = 'doubles';
    go({ view: 'formats' });
  },
  fmtCat(d) {
    ui.fmtCat = d.k;
    ui.fmtMode = FORMAT_GROUPS[d.k][0];
    rerender();
  },
  fmtMode(d) {
    ui.fmtMode = d.k;
    rerender();
  },
  myEvents() {
    ui.listTab = 'all';
    go({ view: 'myEvents' });
  },
  myMatches() {
    ui.listTab = 'all';
    go({ view: 'myMatches' });
  },
  listTab(d) {
    ui.listTab = d.k;
    rerender();
  },
  guide(d) {
    go({ view: 'guide', topic: d.topic });
  },
  edit() {
    const u = st.users[ME];
    ui.edit = { avatarUrl: u.avatarUrl || '', nickName: u.nickName, gender: u.gender || '', pb: u.pbLevel || null };
    go({ view: 'edit' });
  },
  openLevel() {
    const pb = ui.edit.pb;
    ui.sheet = { kind: 'level', type: pb ? pb.type : 'self', self: pb && pb.type === 'self' ? pb.value : 3.0, dupr: pb && pb.type === 'dupr' ? pb.value : '' };
    rerender();
  },
  levelTab(d) {
    if (document.getElementById('dupr')) ui.sheet.dupr = num('dupr');
    ui.sheet.type = d.k;
    rerender();
  },
  pickSelf(d) {
    ui.sheet.self = Number(d.l);
    rerender();
  },
  confirmLevel() {
    const s = ui.sheet;
    if (s.type === 'dupr') {
      const v = Number(num('dupr'));
      if (!(v >= 2 && v <= 8)) return toast(i18n.errMsg('duprRange'));
      ui.edit.pb = { type: 'dupr', value: R.round3(v) };
    } else {
      ui.edit.pb = { type: 'self', value: s.self };
    }
    ui.sheet = null;
    rerender();
  },
  saveEdit() {
    const e = ui.edit;
    const name = (e.nickName || '').trim();
    if (!name) return toast(i18n.errMsg('required', { field: 'nickName' }));
    const u = st.users[ME];
    const patch = { gender: e.gender };
    for (const [field, key, value] of [['nickName', 'nickName', name.slice(0, 20)], ['avatar', 'avatarUrl', e.avatarUrl]]) {
      if (value === (u[key] || '')) continue;
      const r = PR.checkChange(u, field, Date.now());
      if (!r.allowed) return toast(i18n.errMsg(field === 'avatar' ? 'avatarChangeLimit' : 'nameChangeLimit', { at: r.nextAt }));
      Object.assign(patch, r.data, { [key]: value });
    }
    const same = (a, b) => (!a && !b) || (a && b && a.type === b.type && a.value === b.value);
    if (!same(e.pb, u.pbLevel)) {
      const r = PR.checkChange(u, 'pbLevel', Date.now());
      if (!r.allowed) return toast(i18n.errMsg('pbLevelChangeLimit', { at: r.nextAt }));
      Object.assign(patch, r.data, { pbLevel: e.pb });
    }
    // 规则模块返回的是云数据库的点路径写法（如 changeCredits.nickName），这里按路径写回
    Object.entries(patch).forEach(([k, v]) => {
      const ks = k.split('.');
      let o = u;
      ks.slice(0, -1).forEach((x) => (o = o[x] = o[x] || {}));
      o[ks[ks.length - 1]] = v;
    });
    // 还没打过比赛：等级作为起始评分
    if (e.pb && !u.doubles.games && !u.singles.games) {
      u.doubles.rating = e.pb.value;
      u.singles.rating = e.pb.value;
    }
    save();
    ui.stack.pop();
    render();
    toast(i18n.t('saved'));
  },
  na() {
    toast(px('notInPreview'));
  },
  reset() {
    st = seed();
    save();
    ui.stack = [];
    ui.tab = 'home';
    ui.sheet = null;
    render();
    toast(px('resetDone'));
  },
  clubTab(d) {
    ui.clubTab = d.k;
    rerender();
  },
  period(d) {
    ui.period = d.p;
    rerender();
  },
  eventTab(d) {
    ui.eventTab = d.k;
    rerender();
  },
  ptype(d) {
    ui.ptype = d.k;
    rerender();
  },
  signup() {
    const e = eventOf(top().id);
    const full = joinedOf(e._id).length >= e.capacity;
    st.signups = st.signups.filter((s) => !(s.eventId === e._id && s.userId === ME));
    st.signups.push({ eventId: e._id, userId: ME, status: full ? 'waitlist' : 'joined', createdAt: Date.now() });
    save();
    ui.sheet = { kind: 'note', eventId: e._id, title: i18n.t(full ? 'signupFull' : 'signupOk'), text: '', tag: '' };
    rerender();
  },
  cancelSignup() {
    const e = eventOf(top().id);
    const s = st.signups.find((x) => x.eventId === e._id && x.userId === ME && x.status !== 'cancelled');
    if (!s) return;
    const was = s.status;
    s.status = 'cancelled';
    if (was === 'joined') {
      const next = waitOf(e._id)[0];
      if (next) next.status = 'joined';
    }
    save();
    rerender();
  },
  openGen() {
    const e = eventOf(top().id);
    if (joinedOf(e._id).length < 2) return toast(i18n.t('notEnough'));
    ui.sheet = { kind: 'gen', eventId: e._id, mode: 'rotation', courts: e.courts, rounds: rotationRounds(joinedOf(e._id).length, e.courts) };
    rerender();
  },
  pickMode(d) {
    ui.sheet.courts = num('genCourts') || ui.sheet.courts;
    if (document.getElementById('genRounds')) ui.sheet.rounds = num('genRounds');
    ui.sheet.mode = d.k;
    rerender();
  },
  closeSheet() {
    ui.sheet = null;
    rerender();
  },
  generate() {
    const s = ui.sheet;
    const e = eventOf(s.eventId);
    const courts = Number(num('genCourts'));
    const rounds = Number(num('genRounds') || s.rounds);
    if (!Number.isInteger(courts) || courts < 1 || courts > 30) return toast(i18n.errMsg('intRange', { field: 'courts', lo: 1, hi: 30 }));
    if (!Number.isInteger(rounds) || rounds < 1 || rounds > 30) return toast(i18n.errMsg('intRange', { field: 'rounds', lo: 1, hi: 30 }));
    const players = joinedOf(e._id).map((x) => x.userId);
    const singles = s.mode === 'singles' || s.mode === 'singlesRR';
    const kept = st.matches.filter((m) => m.eventId === e._id && m.status === 'done');
    const ratings = {};
    players.forEach((p) => (ratings[p] = st.users[p][singles ? 'singles' : 'doubles'].rating));
    let plan;
    try {
      if (s.mode === 'fixed') {
        if (players.length % 2) return toast(i18n.errMsg('fixedNeedsEven'));
        const teams = [];
        for (let i = 0; i < players.length; i += 2) teams.push([players[i], players[i + 1]]);
        plan = S.roundRobin(teams, { courts });
      } else if (s.mode === 'singlesRR') {
        plan = S.roundRobin(players.map((p) => [p]), { courts });
      } else {
        plan = S.rotation(players, {
          courts,
          rounds,
          teamSize: singles ? 1 : 2,
          balance: s.mode === 'balanced',
          ratings,
          history: kept.filter((m) => (m.type === 'singles') === singles),
        });
      }
    } catch (err) {
      return toast(i18n.errMsg(err.message, err.params));
    }
    st.matches = st.matches.filter((m) => !(m.eventId === e._id && m.status !== 'done'));
    const start = kept.reduce((mx, m) => Math.max(mx, m.round), 0);
    let n = 0;
    plan.rounds.forEach((r) => r.games.forEach((g) => (addMatchDoc(st, e, start + r.round, g.court, g.teamA, g.teamB), n++)));
    e.mode = s.mode;
    if (e.status === 'open') e.status = 'playing';
    ui.sheet = null;
    ui.eventTab = 'pairs';
    save();
    rerender(false);
    toast(i18n.t('generatedN', n));
  },
  openScore(d) {
    const m = st.matches.find((x) => x._id === d.id);
    ui.sheet = { kind: 'score', matchId: m._id, scoreA: m.status === 'done' ? m.scoreA : '', scoreB: m.status === 'done' ? m.scoreB : '' };
    rerender();
  },
  step(d) {
    ui.sheet.scoreA = num('scoreA');
    ui.sheet.scoreB = num('scoreB');
    ui.sheet[d.k] = String(Math.max(0, Math.min(99, (Number(ui.sheet[d.k]) || 0) + Number(d.d))));
    rerender();
  },
  quick(d) {
    ui.sheet.scoreA = num('scoreA');
    ui.sheet.scoreB = num('scoreB');
    ui.sheet[d.k] = '11';
    rerender();
  },
  submitScore() {
    const ra = num('scoreA');
    const rb = num('scoreB');
    if (ra === '' || rb === '') return toast(i18n.t('fillBoth'));
    const a = Number(ra);
    const b = Number(rb);
    const err = R.validateScore(a, b);
    if (err) return toast(i18n.errMsg(err));
    const m = st.matches.find((x) => x._id === ui.sheet.matchId);
    const r = applyScore(st, m, a, b, Date.now(), ME);
    const mine = r.changes.find((c) => c.id === ME);
    ui.sheet = null;
    save();
    rerender();
    toast(mine ? i18n.t('ratingChange', fmt.delta(mine.delta)) : i18n.t('recorded'));
  },
  deleteMatch() {
    const m = st.matches.find((x) => x._id === ui.sheet.matchId);
    if (m.status === 'done') revert(st, m);
    st.matches = st.matches.filter((x) => x !== m);
    ui.sheet = null;
    save();
    rerender();
  },
};

const app = document.getElementById('app');
app.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || !el.dataset.act) return;
  // 点弹层内部不关闭
  if (el.dataset.act === 'closeSheet' && el.classList.contains('mask') && ev.target.closest('[data-stop]')) return;
  const fn = actions[el.dataset.act];
  if (fn) fn(el.dataset);
});
app.addEventListener('keydown', (ev) => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[role="button"][data-act]')) {
    ev.preventDefault();
    ev.target.click();
  }
});
app.addEventListener('change', (ev) => {
  const k = ev.target.dataset.change;
  if (k === 'memberQ') {
    ui.memberQ = ev.target.value;
    return rerender();
  }
  if ((k === 'clubLogo' || k === 'itemPhoto') && ev.target.files && ev.target.files[0]) {
    readAvatar(ev.target.files[0], (url) => {
      if (k === 'clubLogo') {
        clubOf(top().id).logo = url;
        save();
      } else ui.sheet.photo = url;
      rerender();
    });
    return;
  }
  if (ui.sheet && ui.sheet.kind === 'bill' && ['billTotal', 'billMale', 'billFemale', 'billPayId'].includes(k)) {
    ui.sheet[{ billTotal: 'total', billMale: 'male', billFemale: 'female', billPayId: 'payId' }[k]] = ev.target.value;
    return rerender();
  }
  if (k === 'recFrom' || k === 'recTo') {
    ui.rec[k === 'recFrom' ? 'from' : 'to'] = ev.target.value;
    return rerender();
  }
  if (!k || !ui.edit) return;
  if (k === 'gender') ui.edit.gender = ev.target.value;
  if (k === 'avatar' && ev.target.files && ev.target.files[0]) {
    readAvatar(ev.target.files[0], (url) => {
      ui.edit.avatarUrl = url;
      rerender();
    });
  }
});
app.addEventListener('input', (ev) => {
  const k = ev.target.dataset.input;
  if (k === 'note' && ui.sheet && ui.sheet.kind === 'note') {
    ui.sheet.text = ev.target.value;
    ui.sheet.tag = '';
    return;
  }
  if (k === 'friendName' && ui.sheet && ui.sheet.kind === 'bring') {
    ui.sheet.name = ev.target.value;
    return;
  }
  if (ev.target.dataset.input === 'nick' && ui.edit) ui.edit.nickName = ev.target.value;
});

document.documentElement.lang = i18n.getLang();
save();
render();
