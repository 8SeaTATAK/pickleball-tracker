// 隐私授权弹窗：页面第一次调用涉及隐私的接口（选头像、填昵称、剪贴板等）时，微信会触发
// wx.onNeedPrivacyAuthorization，这里弹出说明，用户同意后继续原来的操作。
// 用法：在用到这些接口的页面放 <privacy />（已在 app.json 全局注册）。
const i18n = require('../../utils/i18n');

Component({
  data: { show: false, t: {}, name: '' },
  lifetimes: {
    attached() {
      if (!wx.onNeedPrivacyAuthorization) return;
      this.setData({ t: i18n.dict() });
      wx.onNeedPrivacyAuthorization((resolve) => {
        this.resolve = resolve;
        const done = (name) => this.setData({ show: true, name: name || i18n.t('privacyGuide') });
        if (wx.getPrivacySetting) wx.getPrivacySetting({ success: (r) => done(r.privacyContractName), fail: () => done() });
        else done();
      });
    },
  },
  methods: {
    open() {
      wx.openPrivacyContract && wx.openPrivacyContract({});
    },
    agree() {
      this.setData({ show: false });
      if (this.resolve) this.resolve({ event: 'agree', buttonId: 'privacy-agree' });
      this.resolve = null;
    },
    noop() {},
    disagree() {
      this.setData({ show: false });
      if (this.resolve) this.resolve({ event: 'disagree' });
      this.resolve = null;
    },
  },
});
