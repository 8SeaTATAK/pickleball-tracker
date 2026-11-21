const pad = (n) => (n < 10 ? '0' + n : '' + n);
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function date(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function time(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 11/23 周六 09:00–11:00
function range(start, end) {
  const d = new Date(start);
  return `${d.getMonth() + 1}/${d.getDate()} 周${WEEK[d.getDay()]} ${time(start)}–${time(end)}`;
}

function rating(r) {
  return typeof r === 'number' ? r.toFixed(3) : '-';
}

function delta(d) {
  if (!d) return '±0.000';
  return (d > 0 ? '+' : '') + d.toFixed(3);
}

// 可靠度 < 30% 显示“暂定”
function ratingLabel(block) {
  if (!block) return '-';
  return rating(block.rating) + (block.games < 6 ? ' 暂定' : '');
}

// 'YYYY-MM-DD' + 'HH:mm' → 时间戳（按手机本地时区）
function toTs(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}

const STATUS = { open: '报名中', playing: '进行中', finished: '已结束' };
const ROLE = { owner: '创建者', admin: '管理员', member: '成员' };

module.exports = { date, time, range, rating, delta, ratingLabel, toTs, STATUS, ROLE };
