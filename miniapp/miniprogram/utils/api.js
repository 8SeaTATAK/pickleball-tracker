// 云函数调用封装：统一 loading / 错误提示（错误代码按当前语言翻译）
const i18n = require('./i18n');

function call(action, data = {}, opts = {}) {
  if (opts.loading) wx.showLoading({ title: i18n.t(opts.loading), mask: true });
  return wx.cloud
    .callFunction({ name: 'api', data: { action, ...data } })
    .then((res) => {
      const r = res.result || {};
      if (!r.ok) {
        const err = new Error(i18n.errMsg(r.error || 'serverError', r.params));
        err.code = r.error;
        throw err;
      }
      return r.data;
    })
    .catch((e) => {
      const msg = (e && (e.message || e.errMsg)) || i18n.t('networkError');
      if (!opts.silent) wx.showToast({ title: msg.slice(0, 60), icon: 'none', duration: 2500 });
      throw e;
    })
    .finally(() => {
      if (opts.loading) wx.hideLoading();
    });
}

// 包装弹窗回调里的异步函数：错误已在 call 里 toast，这里只吞掉 rejection
function safe(fn) {
  return (...args) => Promise.resolve(fn(...args)).catch(() => {});
}

module.exports = { call, safe };
