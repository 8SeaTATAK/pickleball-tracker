// 自定义 tab 栏：首页 / 发起（中间凸起）/ 我的
const i18n = require('../utils/i18n');
const api = require('../utils/api');

Component({
  data: { selected: 0, t: {} },

  lifetimes: {
    attached() {
      this.setData({ t: i18n.dict() });
    },
  },

  methods: {
    go(e) {
      wx.switchTab({ url: e.currentTarget.dataset.url });
    },

    launch() {
      const t = i18n.dict();
      const actions = [() => this.newEvent(), () => wx.navigateTo({ url: '/pages/club/edit/edit' }), () => this.join()];
      wx.showActionSheet({
        itemList: [t.newEventTitle, t.createClub, t.joinByCode],
        success: (r) => actions[r.tapIndex](),
      });
    },

    // 发布活动：在自己管理的俱乐部里选一个
    async newEvent() {
      let clubs;
      try {
        clubs = (await api.call('myClubs', {}, { loading: 'loading' })).filter((c) => c.myRole !== 'member');
      } catch (e) {
        return;
      }
      if (!clubs.length) return wx.showToast({ title: i18n.t('needAdminClub'), icon: 'none' });
      const open = (c) => wx.navigateTo({ url: '/pages/event/edit/edit?clubId=' + c._id });
      if (clubs.length === 1) return open(clubs[0]);
      const list = clubs.slice(0, 6);
      wx.showActionSheet({ itemList: list.map((c) => c.name), success: (r) => open(list[r.tapIndex]) });
    },

    // 邀请码加入：在首页打开输入框
    join() {
      const pages = getCurrentPages();
      const cur = pages[pages.length - 1];
      if (cur && cur.route === 'pages/index/index') return cur.openJoin();
      getApp().globalData.openJoin = true;
      wx.switchTab({ url: '/pages/index/index' });
    },
  },
});
