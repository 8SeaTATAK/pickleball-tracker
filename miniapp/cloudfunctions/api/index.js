// 云函数入口：所有接口走这一个函数，按 event.action 分发
const cloud = require('wx-server-sdk');
const { dispatch } = require('./router');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 微信内容安全（需要 config.json 里的 openapi 权限）。接口本身出错时放行并记日志，避免误伤正常使用。
function makeSecCheck(openid) {
  return {
    async secCheck(content, scene) {
      try {
        const r = await cloud.openapi.security.msgSecCheck({ openid, scene, version: 2, content });
        return (r.result && r.result.suggest) || 'pass';
      } catch (e) {
        console.error('msgSecCheck', e);
        return 'pass';
      }
    },
    async secCheckImage(fileID) {
      const { fileList } = await cloud.getTempFileURL({ fileList: [fileID] });
      const url = fileList && fileList[0] && fileList[0].tempFileURL;
      if (!url) return;
      await cloud.openapi.security.mediaCheckAsync({ openid, scene: 1, version: 2, media_type: 2, media_url: url });
    },
  };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  return dispatch({ db, _: db.command, openid: OPENID, now: () => Date.now(), ...makeSecCheck(OPENID) }, event);
};
