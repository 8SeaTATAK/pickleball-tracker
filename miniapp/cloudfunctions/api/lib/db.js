// 数据库小工具。云数据库 doc().get() 对不存在的文档会抛错，这里统一返回 null。

async function getDoc(db, coll, id) {
  try {
    const res = await db.collection(coll).doc(id).get();
    return res.data || null;
  } catch (e) {
    return null;
  }
}

// 服务端单次最多取 1000 条，分页取全
async function listAll(query, max = 5000) {
  const out = [];
  const page = 1000;
  while (out.length < max) {
    const res = await query.skip(out.length).limit(page).get();
    out.push(...res.data);
    if (res.data.length < page) break;
  }
  return out;
}

// _.in 的数组别太长，分批查
async function getByIds(db, _, coll, ids) {
  const uniq = Array.from(new Set(ids.filter(Boolean)));
  const out = [];
  for (let i = 0; i < uniq.length; i += 100) {
    const res = await db
      .collection(coll)
      .where({ _id: _.in(uniq.slice(i, i + 100)) })
      .limit(100)
      .get();
    out.push(...res.data);
  }
  return out;
}

function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

module.exports = { getDoc, listAll, getByIds, randomCode };
