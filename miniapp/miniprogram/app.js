// 把 ENV_ID 换成你的云开发环境 ID（云开发控制台 → 设置 → 环境 ID）
const ENV_ID = 'your-cloud-env-id';

App({
  globalData: { user: null },

  onLaunch() {
    if (!wx.cloud) {
      wx.showModal({ title: '提示', content: '请使用 2.2.3 以上的基础库以使用云能力', showCancel: false });
      return;
    }
    wx.cloud.init({ env: ENV_ID, traceUser: true });
  },

  // 各页面 onShow 里调用；同一时刻只发一次登录请求
  ensureLogin(force) {
    if (this.globalData.user && !force) return Promise.resolve(this.globalData.user);
    if (!this._login || force) {
      const api = require('./utils/api');
      this._login = api
        .call('login', {}, { silent: true })
        .then((u) => {
          this.globalData.user = u;
          return u;
        })
        .catch((e) => {
          this._login = null;
          throw e;
        });
    }
    return this._login;
  },
});
