const api = require('../../../utils/api');
const fmt = require('../../../utils/fmt');
const app = getApp();

function nextSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return fmt.date(d.getTime());
}

Page({
  data: {
    clubId: '',
    eventId: '',
    title: '',
    location: '',
    day: '',
    start: '09:00',
    end: '11:00',
    courts: '2',
    capacity: '12',
    fee: '0',
    note: '',
    today: '',
    saving: false,
  },

  async onLoad(q) {
    await app.ensureLogin();
    this.setData({ clubId: q.clubId || '', today: fmt.date(Date.now()), day: nextSaturday() });
    if (!q.id) return;
    wx.setNavigationBarTitle({ title: '编辑活动' });
    const { event: e } = await api.call('getEvent', { eventId: q.id }, { loading: '加载中' });
    this.setData({
      eventId: e._id,
      clubId: e.clubId,
      title: e.title,
      location: e.location || '',
      day: fmt.date(e.startTime),
      start: fmt.time(e.startTime),
      end: fmt.time(e.endTime),
      courts: String(e.courts),
      capacity: String(e.capacity),
      fee: String(e.fee || 0),
      note: e.note || '',
    });
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.k]: e.detail.value });
  },

  async save() {
    const d = this.data;
    if (!d.title.trim()) return wx.showToast({ title: '请填写活动名称', icon: 'none' });
    const startTime = fmt.toTs(d.day, d.start);
    let endTime = fmt.toTs(d.day, d.end);
    if (endTime <= startTime) endTime += 24 * 3600 * 1000; // 跨零点
    const body = {
      title: d.title,
      location: d.location,
      note: d.note,
      startTime,
      endTime,
      courts: Number(d.courts),
      capacity: Number(d.capacity),
      fee: Number(d.fee || 0),
    };
    this.setData({ saving: true });
    try {
      if (d.eventId) {
        await api.call('updateEvent', { eventId: d.eventId, ...body }, { loading: '保存中' });
        wx.navigateBack();
      } else {
        const { eventId } = await api.call('createEvent', { clubId: d.clubId, ...body }, { loading: '发布中' });
        wx.redirectTo({ url: '/pages/event/detail/detail?id=' + eventId });
      }
    } finally {
      this.setData({ saving: false });
    }
  },
});
