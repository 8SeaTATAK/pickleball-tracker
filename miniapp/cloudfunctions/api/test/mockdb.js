// 内存版云数据库，只实现云函数用到的那部分 API，语义尽量贴近 wx-server-sdk：
// doc().get() 不存在时抛错；get() 默认 100 条、最多 1000 条；数组字段等值匹配=包含；
// update 支持点路径与 _.inc，嵌套对象按字段合并。

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const OP = Symbol('op');
const cmd = (op, v) => ({ [OP]: op, v });

const command = {
  in: (v) => cmd('in', v),
  gte: (v) => cmd('gte', v),
  gt: (v) => cmd('gt', v),
  lte: (v) => cmd('lte', v),
  lt: (v) => cmd('lt', v),
  neq: (v) => cmd('neq', v),
  inc: (v) => cmd('inc', v),
};

function matchValue(val, cond) {
  if (cond && cond[OP]) {
    const { v } = cond;
    switch (cond[OP]) {
      case 'in':
        return Array.isArray(val) ? val.some((x) => v.includes(x)) : v.includes(val);
      case 'gte':
        return val >= v;
      case 'gt':
        return val > v;
      case 'lte':
        return val <= v;
      case 'lt':
        return val < v;
      case 'neq':
        return val !== v;
    }
    throw new Error('unsupported op');
  }
  if (Array.isArray(val) && !Array.isArray(cond)) return val.includes(cond);
  return val === cond;
}

const getPath = (o, p) => p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);

function setPath(o, p, v) {
  const ks = p.split('.');
  let x = o;
  ks.slice(0, -1).forEach((k) => {
    if (x[k] == null || typeof x[k] !== 'object') x[k] = {};
    x = x[k];
  });
  const last = ks[ks.length - 1];
  if (v && v[OP] === 'inc') x[last] = (x[last] || 0) + v.v;
  else x[last] = clone(v);
}

function applyUpdate(doc, data, prefix = '') {
  for (const [k, v] of Object.entries(data)) {
    const p = prefix + k;
    if (v && typeof v === 'object' && !v[OP] && !Array.isArray(v)) applyUpdate(doc, v, p + '.');
    else setPath(doc, p, v);
  }
}

let seq = 0;

class Query {
  constructor(store, where = [], order = [], skipN = 0, limitN = null) {
    Object.assign(this, { store, w: where, o: order, s: skipN, l: limitN });
  }
  where(cond) {
    return new Query(this.store, [...this.w, cond], this.o, this.s, this.l);
  }
  orderBy(f, dir) {
    return new Query(this.store, this.w, [...this.o, [f, dir]], this.s, this.l);
  }
  skip(n) {
    return new Query(this.store, this.w, this.o, n, this.l);
  }
  limit(n) {
    return new Query(this.store, this.w, this.o, this.s, n);
  }
  _rows() {
    let rows = Array.from(this.store.values()).filter((d) =>
      this.w.every((c) => Object.entries(c).every(([k, v]) => matchValue(getPath(d, k), v)))
    );
    for (const [f, dir] of [...this.o].reverse()) {
      rows.sort((a, b) => {
        const x = getPath(a, f);
        const y = getPath(b, f);
        const r = x < y ? -1 : x > y ? 1 : 0;
        return dir === 'desc' ? -r : r;
      });
    }
    return rows;
  }
  async get() {
    const lim = Math.min(1000, this.l == null ? 100 : this.l);
    return { data: clone(this._rows().slice(this.s, this.s + lim)) };
  }
  async count() {
    return { total: this._rows().length };
  }
  async update({ data }) {
    const rows = this._rows();
    rows.forEach((d) => applyUpdate(d, data));
    return { stats: { updated: rows.length } };
  }
  async remove() {
    const rows = this._rows();
    rows.forEach((d) => this.store.delete(d._id));
    return { stats: { removed: rows.length } };
  }
}

class Collection extends Query {
  constructor(store) {
    super(store);
  }
  async add({ data }) {
    const _id = 'id' + ++seq;
    const d = clone(data);
    this.store.set(_id, { ...d, _id });
    return { _id };
  }
  doc(id) {
    const store = this.store;
    return {
      async get() {
        if (!store.has(id)) throw new Error(`document.get:fail document with _id ${id} does not exist`);
        return { data: clone(store.get(id)) };
      },
      async set({ data }) {
        const d = clone(data);
        delete d._id;
        store.set(id, { ...d, _id: id });
        return {};
      },
      async update({ data }) {
        if (!store.has(id)) throw new Error(`document.update:fail document ${id} does not exist`);
        applyUpdate(store.get(id), data);
        return { stats: { updated: 1 } };
      },
      async remove() {
        store.delete(id);
        return { stats: { removed: 1 } };
      },
    };
  }
}

function createMockDb() {
  const stores = new Map();
  const db = {
    command,
    collection(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      return new Collection(stores.get(name));
    },
    async runTransaction(fn) {
      return fn(db);
    },
    _dump: (name) => Array.from((stores.get(name) || new Map()).values()).map(clone),
  };
  return db;
}

module.exports = { createMockDb };
