const i18n = require('./i18n');

const pad = (n) => (n < 10 ? '0' + n : '' + n);

function date(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function time(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 中文：11/23 周六 09:00–11:00；其他语言按澳洲/东南亚习惯日在前：Sat 23/11 09:00–11:00
function range(start, end) {
  const d = new Date(start);
  const wd = i18n.weekday(d.getDay());
  const t = `${time(start)}–${time(end)}`;
  if (i18n.getLang() === 'zh') return `${d.getMonth() + 1}/${d.getDate()} ${wd} ${t}`;
  return `${wd} ${d.getDate()}/${d.getMonth() + 1} ${t}`;
}

// 11/23（中文）或 23/11
function shortDate(ts) {
  const d = new Date(ts);
  return i18n.getLang() === 'zh' ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getDate()}/${d.getMonth() + 1}`;
}

function rating(r) {
  return typeof r === 'number' ? r.toFixed(3) : '-';
}

function delta(d) {
  if (!d) return '±0.000';
  return (d > 0 ? '+' : '') + d.toFixed(3);
}

// 打满 6 场前标“暂定”
function ratingLabel(block) {
  if (!block) return '-';
  return rating(block.rating) + (block.games < 6 ? ' ' + i18n.t('provisional') : '');
}

// 'YYYY-MM-DD' + 'HH:mm' → 时间戳（按手机本地时区）
function toTs(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}

const status = (s) => i18n.t('status_' + s);
const role = (r) => i18n.t('role_' + r);

module.exports = { date, time, range, shortDate, rating, delta, ratingLabel, toTs, status, role };
