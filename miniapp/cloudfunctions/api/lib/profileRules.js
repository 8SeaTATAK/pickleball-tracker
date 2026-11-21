// 头像 / 昵称修改频率（见 miniapp/PRODUCT_RULES.md）
//
// - 距离上次修改满 30 天才能再改，昵称和头像分开算
// - 注册后第一次设置不计入
// - 临时球员不受限制
// - 付费用户不受限制（user.premium，付费功能上线后由后台写入）
// - 积分兑换：每兑换一次，user.changeCredits[field] + 1，冷却期内可以用掉一次

const DAY = 24 * 3600 * 1000;
const COOLDOWN = 30 * DAY;

const KEYS = {
  nickName: { first: 'nickNameFirstSet', at: 'nickNameChangedAt' },
  avatar: { first: 'avatarFirstSet', at: 'avatarChangedAt' },
};

/**
 * 判断这次修改是否允许，并给出要写回用户文档的字段。
 * @returns { allowed, nextAt, data }  nextAt：不允许时，下次可修改的时间戳
 */
function checkChange(user, field, now) {
  const k = KEYS[field];
  if (user.guest) return { allowed: true, data: {} };
  if (!user[k.first]) return { allowed: true, data: { [k.first]: true } };
  if (user.premium) return { allowed: true, data: { [k.at]: now } };
  const last = user[k.at] || 0;
  if (now - last >= COOLDOWN) return { allowed: true, data: { [k.at]: now } };
  const credits = (user.changeCredits && user.changeCredits[field]) || 0;
  if (credits > 0) return { allowed: true, data: { [k.at]: now, [`changeCredits.${field}`]: credits - 1 } };
  return { allowed: false, nextAt: last + COOLDOWN };
}

// 给前端显示：0 表示现在就能改，否则是下次可修改的时间戳
function nextChangeAt(user, field, now) {
  const r = checkChange(user, field, now);
  return r.allowed ? 0 : r.nextAt;
}

module.exports = { checkChange, nextChangeAt, COOLDOWN };
