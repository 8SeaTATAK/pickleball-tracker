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
const STORE = 'pp_state_v4';
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
];
const FEMALE = ['alice', 'linh', 'nurul', 'emily', 'sarah'];
const COLORS = ['#216b43', '#b95c30', '#3c6e9c', '#7b5aa6', '#a0722a', '#2f8a83', '#a64b6b', '#58753a'];

function seed() {
  const rand = S.mulberry32(20261121);
  const truth = {};
  const st = { users: {}, clubs: [], members: [], events: [], signups: [], matches: [], history: [], seq: 1 };
  PEOPLE.forEach(([id, name, real, lv, guest], i) => {
    truth[id] = real;
    const blk = () => ({ rating: lv, games: 0, wins: 0, losses: 0 });
    const pbLevel = id === ME ? { type: 'self', value: 3.5 } : id === 'minh' ? { type: 'dupr', value: 4.052 } : id === 'chen' ? { type: 'dupr', value: 4.618 } : null;
    st.users[id] = { _id: id, pbLevel, nickName: name, gender: FEMALE.includes(id) ? 'f' : 'm', avatarUrl: '', guest: !!guest, color: COLORS[i % COLORS.length], doubles: blk(), singles: blk() };
  });
  st.clubs.push(
    { _id: 'c1', name: 'North Ryde Pickleball', city: 'Sydney', inviteCode: 'NR7K2P', intro: '每周六上午 Tennis World North Ryde · Saturday mornings, all levels welcome', settings: { winPoints: 3, lossPoints: 1, currency: 'A$' } },
    { _id: 'c2', name: 'Macquarie Park 夜场', city: 'Sydney', inviteCode: 'MQ4H8D', intro: '', settings: { winPoints: 3, lossPoints: 1, currency: 'A$' } }
  );
  PEOPLE.forEach(([id]) => st.members.push({ clubId: 'c1', userId: id, role: id === ME ? 'owner' : id === 'wei' ? 'admin' : 'member' }));
  [ME, 'alice', 'ben', 'aiman', 'emily'].forEach((id) => st.members.push({ clubId: 'c2', userId: id, role: id === 'alice' ? 'owner' : 'member' }));

  const now = Date.now();
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
    const ev = newEvent(st, start, 'finished');
    const players = Object.keys(st.users).filter(() => rand() > 0.12);
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
  // 下周六：报名中，9 人已报，你还没报
  const up = newEvent(st, nextSat, 'open');
  Object.keys(st.users)
    .filter((id) => id !== ME && !['nurul', 'sarah'].includes(id))
    .forEach((id, i) => st.signups.push({ eventId: up._id, userId: id, status: 'joined', createdAt: now - DAY + i }));
  up.joinedCount = 9;
  return st;
}

function newEvent(st, start, status) {
  const ev = {
    _id: 'e' + st.seq++,
    clubId: 'c1',
    title: 'Saturday Doubles 周六双打',
    location: 'Tennis World North Ryde · Ct5–6',
    note: 'Bring water 自带水 · AA via PayID',
    startTime: start,
    endTime: start + 2 * 3600000,
    courts: 2,
    capacity: 12,
    fee: 15,
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
function viewHome(t) {
  const me = st.users[ME];
  const myClubs = st.members.filter((m) => m.userId === ME).map((m) => ({ ...clubOf(m.clubId), role: m.role }));
  const ids = myClubs.map((c) => c._id);
  const events = st.events
    .filter((e) => ids.includes(e.clubId) && e.endTime >= Date.now() - 6 * 3600000)
    .sort((a, b) => a.startTime - b.startTime);
  return `
  <div class="card hero" data-act="tab" data-tab="me" role="button" tabindex="0">
    <div class="row">${avatar(me)}<div class="grow"><div class="bold">${esc(me.nickName)}</div>
      <div class="muted">${esc(f(t.gamesSummary, me.doubles.games, me.singles.games))}</div></div></div>
    <div class="ratings">
      <div><div class="muted">${t.doublesRating}</div><div class="rating-big num">${fmt.ratingLabel(me.doubles)}</div></div>
      <div><div class="muted">${t.singlesRating}</div><div class="rating-big num">${fmt.ratingLabel(me.singles)}</div></div>
    </div>
  </div>
  <div class="section-title">${t.upcoming}</div>
  <div class="card flush">${
    events.length
      ? events
          .map((e) => {
            const mine = st.signups.find((s) => s.eventId === e._id && s.userId === ME && s.status !== 'cancelled');
            return `<div class="item" data-act="event" data-id="${e._id}" role="button" tabindex="0"><div class="grow">
          <div class="ellipsis"><span class="bold">${esc(e.title)}</span><span class="tag ${e.status === 'playing' ? 'clay' : ''}">${fmt.status(e.status)}</span>${mine ? `<span class="tag gray">${t['signed_' + mine.status]}</span>` : ''}</div>
          <div class="muted">${esc(clubOf(e.clubId).name)} · ${fmt.range(e.startTime, e.endTime)}</div>
          <div class="muted ellipsis">📍 ${esc(e.location)}</div></div>
          <div class="muted num">${joinedOf(e._id).length}/${e.capacity}</div></div>`;
          })
          .join('')
      : `<div class="empty">${t.noEvents}</div>`
  }</div>
  <div class="section-title">${t.myClubs}<button class="link" data-act="rules">${t.rulesLink}</button></div>
  <div class="card flush">${myClubs
    .map(
      (c) => `<div class="item" data-act="club" data-id="${c._id}" role="button" tabindex="0">
        <div class="avatar" style="background:var(--btn)">${esc(c.name[0])}</div>
        <div class="grow"><div class="bold ellipsis">${esc(c.name)}</div>
        <div class="muted">${esc(c.city)} · ${f(t.membersN, st.members.filter((m) => m.clubId === c._id).length)}</div></div>
        ${c.role !== 'member' ? `<span class="tag">${fmt.role(c.role)}</span>` : ''}</div>`
    )
    .join('')}</div>
  <div class="btn-row"><button class="btn" data-act="na">${t.createClub}</button><button class="btn ghost" data-act="na">${t.joinByCode}</button></div>`;
}

function viewClub(t, id) {
  const c = clubOf(id);
  const role = (memberOf(id, ME) || {}).role;
  const admin = isAdmin(id);
  const members = st.members
    .filter((m) => m.clubId === id)
    .map((m) => ({ ...st.users[m.userId], role: m.role }))
    .sort((a, b) => ({ owner: 0, admin: 1, member: 2 })[a.role] - ({ owner: 0, admin: 1, member: 2 })[b.role] || b.doubles.rating - a.doubles.rating);
  let body = '';
  if (ui.clubTab === 'events') {
    const evs = st.events.filter((e) => e.clubId === id).sort((a, b) => b.startTime - a.startTime);
    body = `${admin ? `<button class="btn" data-act="na">${t.newEvent}</button>` : ''}
    <div class="card flush">${
      evs.length
        ? evs
            .map(
              (e) => `<div class="item" data-act="event" data-id="${e._id}" role="button" tabindex="0"><div class="grow">
          <div class="ellipsis"><span class="bold">${esc(e.title)}</span><span class="tag ${e.status === 'playing' ? 'clay' : e.status === 'finished' ? 'gray' : ''}">${fmt.status(e.status)}</span></div>
          <div class="muted">${fmt.range(e.startTime, e.endTime)}</div></div><div class="muted num">${joinedOf(e._id).length}/${e.capacity}</div></div>`
            )
            .join('')
        : `<div class="empty">${t.noClubEvents}</div>`
    }</div>`;
  } else if (ui.clubTab === 'board') {
    const since = { week: Date.now() - 7 * DAY, month: Date.now() - 30 * DAY, all: 0 }[ui.period];
    const rows = aggregate(st.matches.filter((m) => m.clubId === id && m.playedAt >= since), c.settings);
    body = `<div class="tabs small">${['week', 'month', 'all']
      .map((p) => `<button class="${ui.period === p ? 'on' : ''}" data-act="period" data-p="${p}">${t[{ week: 'last7', month: 'last30', all: 'allTime' }[p]]}</button>`)
      .join('')}</div>
    <div class="card">${
      rows.length
        ? `<div class="table"><div class="tr th"><span class="rank">#</span><span class="name">${t.colPlayer}</span><span class="c">${t.colWL}</span><span class="c">${t.colWinRate}</span><span class="c">${t.colDiff}</span><span class="c">${t.colPoints}</span></div>
        ${rows
          .map(
            (r) => `<div class="tr" data-act="player" data-id="${r.userId}" role="button" tabindex="0"><span class="rank ${r.rank <= 3 ? 'top' : ''}">${r.rank}</span><span class="name">${esc(st.users[r.userId].nickName)}</span>
          <span class="c">${r.wins}-${r.losses}</span><span class="c">${Math.round(r.winRate)}%</span><span class="c ${r.diff > 0 ? 'up' : r.diff < 0 ? 'down' : ''}">${r.diff > 0 ? '+' : ''}${r.diff}</span><span class="c bold">${r.score}</span></div>`
          )
          .join('')}</div>`
        : `<div class="empty">${t.noBoard}</div>`
    }<div class="muted" style="margin-top:10px">${esc(f(t.boardRule, c.settings.winPoints, c.settings.lossPoints))}</div></div>`;
  } else {
    body = `${admin ? `<button class="btn ghost" data-act="na">${t.addGuestBtn}</button>` : ''}
    <div class="card flush">${members
      .map(
        (m) => `<div class="item" data-act="player" data-id="${m._id}" role="button" tabindex="0">${avatar(m)}
        <div class="grow"><div class="ellipsis"><span class="bold">${esc(m.nickName)}</span>${m.role !== 'member' ? `<span class="tag">${fmt.role(m.role)}</span>` : ''}${m.guest ? `<span class="tag gray">${t.guest}</span>` : ''}</div>
        <div class="muted">${esc(f(t.memberWL, m.doubles.wins, m.doubles.losses))}</div></div>
        <div class="center"><div class="bold num" style="color:var(--accent)">${fmt.ratingLabel(m.doubles)}</div><div class="muted">${t.doublesRating}</div></div></div>`
      )
      .join('')}</div>`;
  }
  return `
  <div class="card"><div class="row"><div class="avatar lg" style="background:var(--btn)">${esc(c.name[0])}</div>
    <div class="grow"><div class="bold" style="font-size:18px">${esc(c.name)}</div><div class="muted">${esc(c.city)} · ${f(t.membersN, members.length)}</div></div>
    ${role !== 'member' ? `<span class="tag">${fmt.role(role)}</span>` : ''}</div>
    ${c.intro ? `<div class="p">${esc(c.intro)}</div>` : ''}
    <div class="row between" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">
      <span class="muted">${t.inviteCode} <b style="color:var(--accent);letter-spacing:2px">${c.inviteCode}</b></span>
      <button class="btn ghost mini" data-act="na">${t.shareInvite}</button></div></div>
  <div class="tabs">${['events', 'board', 'members']
    .map((k) => `<button class="${ui.clubTab === k ? 'on' : ''}" data-act="clubTab" data-k="${k}">${t[{ events: 'tabEvents', board: 'tabBoard', members: 'tabMembers' }[k]]}</button>`)
    .join('')}</div>
  ${body}`;
}

function viewEvent(t, id) {
  const e = eventOf(id);
  const admin = isAdmin(e.clubId);
  const joined = joinedOf(id).map((s) => st.users[s.userId]);
  const wait = waitOf(id).map((s) => st.users[s.userId]);
  const mine = st.signups.find((s) => s.eventId === id && s.userId === ME && s.status !== 'cancelled');
  const matches = st.matches.filter((m) => m.eventId === id).sort((a, b) => a.round - b.round || a.court - b.court);
  const done = matches.filter((m) => m.status === 'done').length;
  const tab = ui.eventTab || (matches.length ? 'matches' : 'players');
  let body = '';
  if (tab === 'players') {
    body = `<div class="card">${
      joined.length
        ? `<div class="grid4">${joined
            .map((u, i) => `<div class="cell" data-act="player" data-id="${u._id}" role="button" tabindex="0">${avatar(u)}<div class="nm ellipsis">${i + 1}. ${esc(u.nickName)}</div><div class="muted num" style="font-size:11px">${fmt.ratingLabel(u.doubles)}</div></div>`)
            .join('')}</div>`
        : `<div class="empty">${t.noSignups}</div>`
    }</div>
    ${wait.length ? `<div class="section-title">${t.waitlist}</div><div class="card flush">${wait.map((u, i) => `<div class="item"><span class="muted">${f(t.waitNo, i + 1)}</span><span class="grow">${esc(u.nickName)}</span></div>`).join('')}</div>` : ''}`;
  } else if (tab === 'matches') {
    const rounds = [...new Set(matches.map((m) => m.round))];
    body = `${admin ? `<div class="btn-row"><button class="btn" data-act="openGen">${matches.length ? t.regenerate : t.generate}</button><button class="btn ghost" data-act="na">${t.addOne}</button></div>` : ''}
    ${!matches.length ? `<div class="card empty">${admin ? t.noMatchesAdmin : t.noMatches}</div>` : ''}
    ${rounds
      .map((rn) => {
        const ms = matches.filter((m) => m.round === rn);
        return `<div class="section-title">${f(t.roundN, rn)}${ms.every((m) => m.status === 'done') ? `<span class="muted">${t.roundDone}</span>` : ''}</div>
        ${ms.map((m) => matchCard(t, m, admin)).join('')}`;
      })
      .join('')}`;
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
    }</div>`;
  }
  const signBtn =
    e.status === 'finished'
      ? ''
      : !mine
      ? `<button class="btn" data-act="signup">${t.signup}</button>`
      : `<button class="btn warn" data-act="cancelSignup">${mine.status === 'joined' ? t.cancelSignup : t.waitlistCancel}</button>`;
  return `
  <div class="card">
    <div class="row between"><span class="bold" style="font-size:18px">${esc(e.title)}</span><span class="tag ${e.status === 'playing' ? 'clay' : e.status === 'finished' ? 'gray' : ''}">${fmt.status(e.status)}</span></div>
    <div class="p">🕘 ${fmt.range(e.startTime, e.endTime)}</div>
    <div class="p">📍 ${esc(e.location)}</div>
    <div class="p">🏓 ${f(t.courtsInfo, e.courts, joined.length, e.capacity)}${wait.length ? ' · ' + f(t.waitN, wait.length) : ''}${e.fee ? ' · ' + f(t.feePer, currency(e.clubId) + e.fee) : ''}</div>
    <div class="p"><button class="link" data-act="club" data-id="${e.clubId}">🏠 ${esc(clubOf(e.clubId).name)} ›</button></div>
    ${e.note ? `<div class="formula" style="font-family:var(--body)">${esc(e.note)}</div>` : ''}
    <div class="btn-row" style="margin-top:14px">${signBtn}<button class="btn ghost" data-act="na">${t.share}</button></div>
  </div>
  <div class="tabs">
    <button class="${tab === 'players' ? 'on' : ''}" data-act="eventTab" data-k="players">${f(t.tabPlayers, joined.length)}</button>
    <button class="${tab === 'matches' ? 'on' : ''}" data-act="eventTab" data-k="matches">${f(t.tabMatches, done, matches.length)}</button>
    <button class="${tab === 'standings' ? 'on' : ''}" data-act="eventTab" data-k="standings">${t.tabStandings}</button>
  </div>
  ${body}`;
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
  const canScore = admin || (m.players.includes(ME) && !done);
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
  <div class="card"><div class="row">${avatar(u, 'lg')}<div class="grow">
    <div class="bold" style="font-size:19px">${esc(u.nickName)}${u.guest ? `<span class="tag gray">${t.guestPlayer}</span>` : ''}</div>
    <div class="muted">${esc(i18n.levelTitle(u.doubles))}</div></div></div></div>
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
    ${cell('myEvents', BALL_SVG, 'ball', t.menu_events)}
    ${cell('myMatches', '🏓', 'o', t.menu_matches)}
    ${cell('player', '📈', 'b', t.menu_rating, `data-id="${ME}"`)}
    ${cell('guide', '🏅', 'g', t.menu_levels, 'data-topic="levels"')}
    ${cell('guide', '🔄', 'o', t.menu_formats, 'data-topic="formats"')}
    ${cell('guide', '🧭', 'b', t.menu_guide, 'data-topic="start"')}
    ${cell('tab', '🏠', 'g', t.myClubs, 'data-tab="home"')}
    ${cell('rules', '📐', 'o', t.rulesLink)}
    ${cell('na', '💬', 'b', t.menu_contact)}
  </div>
  <div class="card mlist">
    ${li('edit', '✏️', t.editProfile)}
    ${li('na', '✍️', t.menu_feedback)}
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
    <button class="erow" data-act="openLevel"><span class="ek">${t.pbLevel}${e.pb ? `<span class="muted">（${e.pb.type === 'dupr' ? 'DUPR' : t.pbSelf}）</span>` : ''}</span>
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

function viewMyEvents(t) {
  const ids = new Set(st.signups.filter((s) => s.userId === ME && s.status !== 'cancelled').map((s) => s.eventId));
  const evs = st.events.filter((e) => ids.has(e._id)).sort((a, b) => b.startTime - a.startTime);
  return `<div class="card flush">${evs.length ? evs.map((e) => eventItem(t, e)).join('') : `<div class="empty">${t.noMyEvents}</div>`}</div>`;
}

function viewMyMatches(t) {
  const mine = st.matches.filter((m) => m.players.includes(ME));
  const pending = mine.filter((m) => m.status !== 'done' && eventOf(m.eventId).status !== 'finished').sort((a, b) => a.round - b.round || a.court - b.court);
  const done = mine.filter((m) => m.status === 'done').sort((a, b) => b.playedAt - a.playedAt);
  const row = (m) => {
    const e = eventOf(m.eventId);
    const a = m.teamA.includes(ME);
    const sep = i18n.getLang() === 'zh' ? '、' : ', ';
    const names = (team) => team.map((p) => esc(st.users[p].nickName)).join(sep);
    const ok = m.status === 'done';
    const won = ok && (a ? m.scoreA > m.scoreB : m.scoreB > m.scoreA);
    const d = ((m.ratingChanges || []).find((c) => c.id === ME) || {}).delta || 0;
    return `<div class="item" data-act="event" data-id="${e._id}" role="button" tabindex="0">
      ${ok ? `<div class="wl ${won ? 'w' : 'l'}">${won ? t.winShort : t.lossShort}</div>` : `<div class="wl p">${m.round}</div>`}
      <div class="grow"><div class="ellipsis">${names(a ? m.teamA : m.teamB)} <span class="muted">vs</span> ${names(a ? m.teamB : m.teamA)}</div>
      <div class="muted ellipsis">${fmt.shortDate(e.startTime)} · ${f(t.roundN, m.round)} · ${f(t.courtN, m.court)}</div></div>
      <div class="center">${ok ? `<div class="bold num">${a ? m.scoreA + ':' + m.scoreB : m.scoreB + ':' + m.scoreA}</div><div class="d ${d > 0 ? 'up' : d < 0 ? 'down' : 'muted'}">${fmt.delta(d)}</div>` : `<span class="tag">${t.enterScore}</span>`}</div></div>`;
  };
  return `${pending.length ? `<div class="section-title">${t.upNext}</div><div class="card flush">${pending.map(row).join('')}</div>` : ''}
  <div class="section-title">${t.finishedGames}</div>
  <div class="card flush">${done.length ? done.map(row).join('') : `<div class="empty">${t.noGames}</div>`}</div>`;
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

// ---------------- 弹层 ----------------
function sheetHtml(t) {
  const s = ui.sheet;
  if (!s) return '';
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
    const modes = ['rotation', 'balanced', 'fixed', 'singles', 'singlesRR'];
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
  } else if (v.view === 'event') {
    title = eventOf(v.id).title;
    html = viewEvent(t, v.id);
  } else if (v.view === 'player') {
    title = v.id === ME ? t.menu_rating : st.users[v.id].nickName;
    html = viewProfile(t, v.id);
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
    ${ui.stack.length ? '' : `<nav class="tabbar">
      <button class="${ui.tab === 'home' ? 'on' : ''}" data-act="tab" data-tab="home">${icon('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>')}${t.tabHome}</button>
      <button class="launch" data-act="launch"><span class="plus">＋</span>${t.launch}</button>
      <button class="${ui.tab === 'me' ? 'on' : ''}" data-act="tab" data-tab="me">${icon('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>')}${t.tabMe}</button></nav>`}
    ${sheetHtml(t)}
    <div id="toast" class="toast" hidden></div>`;
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
    ui.clubTab = 'events';
    go({ view: 'club', id: d.id });
  },
  event(d) {
    ui.eventTab = null;
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
  myEvents() {
    go({ view: 'myEvents' });
  },
  myMatches() {
    go({ view: 'myMatches' });
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
    Object.assign(u, patch, { pbLevel: e.pb });
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
    rerender();
    toast(i18n.t(full ? 'signupFull' : 'signupOk'));
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
    ui.sheet = { kind: 'gen', eventId: e._id, mode: 'rotation', courts: e.courts, rounds: 6 };
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
    if (e.status === 'open') e.status = 'playing';
    ui.sheet = null;
    ui.eventTab = 'matches';
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
  if (ev.target.dataset.input === 'nick' && ui.edit) ui.edit.nickName = ev.target.value;
});

document.documentElement.lang = i18n.getLang();
save();
render();
