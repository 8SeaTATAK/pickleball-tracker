// 编辑资料：头像（微信头像 / 相册）、昵称（可一键填微信昵称）、性别、起始水平
const api = require('../../utils/api');
const fmt = require('../../utils/fmt');
const i18n = require('../../utils/i18n');
const app = getApp();

const GENDERS = ['', 'm', 'f'];
const LEVELS = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
const levelKey = (l) => 'level_' + String(l).replace('.', '').replace(/0$/, '');

Page({
  data: {
    t: {},
    userId: '',
    avatarUrl: '',
    nickName: '',
    genderNames: [],
    genderIdx: 0,
    canLevel: false,
    levelNames: [],
    levelIdx: -1,
    currentLevel: '',
    nameLock: '',
    avatarLock: '',
    saving: false,
  },

  async onLoad() {
    const t = i18n.dict();
    this.setData({
      t,
      genderNames: GENDERS.map((g) => t['gender_' + g]),
      levelNames: LEVELS.map((l) => `${l.toFixed(1)}  ${t[levelKey(l)]}`),
    });
    wx.setNavigationBarTitle({ title: t.editProfile });
    const u = await app.ensureLogin(true);
    this.setData({
      userId: u._id,
      avatarUrl: u.avatarUrl || '',
      nickName: u.nickName,
      genderIdx: Math.max(0, GENDERS.indexOf(u.gender || '')),
      canLevel: !u.doubles.games && !u.singles.games,
      currentLevel: fmt.rating(u.doubles.rating),
      // 30 天内改过：显示下次可修改日期，并禁用对应控件
      nameLock: u.nextNameChangeAt ? i18n.t('nextChangeHint', i18n.dayMonth(u.nextNameChangeAt)) : '',
      avatarLock: u.nextAvatarChangeAt ? i18n.t('nextChangeHint', i18n.dayMonth(u.nextAvatarChangeAt)) : '',
    });
  },

  // 选头像后立即上传到云存储
  async onChooseAvatar(e) {
    wx.showLoading({ title: i18n.t('uploading'), mask: true });
    try {
      const up = await wx.cloud.uploadFile({
        cloudPath: `avatars/${this.data.userId}-${Date.now()}.jpg`,
        filePath: e.detail.avatarUrl,
      });
      this.setData({ avatarUrl: up.fileID });
    } catch (err) {
      wx.showToast({ title: i18n.t('networkError'), icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onName(e) {
    this.setData({ nickName: e.detail.value });
  },
  onGender(e) {
    this.setData({ genderIdx: Number(e.detail.value) });
  },
  onLevel(e) {
    this.setData({ levelIdx: Number(e.detail.value) });
  },

  async save() {
    const d = this.data;
    const body = { nickName: d.nickName, avatarUrl: d.avatarUrl, gender: GENDERS[d.genderIdx] };
    if (d.canLevel && d.levelIdx >= 0) body.level = LEVELS[d.levelIdx];
    this.setData({ saving: true });
    try {
      await api.call('updateProfile', body, { loading: 'saving' });
      await app.ensureLogin(true);
      wx.showToast({ title: i18n.t('saved') });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (e) {
      // 错误已提示
    } finally {
      this.setData({ saving: false });
    }
  },
});
