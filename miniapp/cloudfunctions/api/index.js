// 云函数入口：所有接口走这一个函数，按 event.action 分发
const cloud = require('wx-server-sdk');
const { dispatch } = require('./router');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  return dispatch({ db, _: db.command, openid: OPENID, now: () => Date.now() }, event);
};
