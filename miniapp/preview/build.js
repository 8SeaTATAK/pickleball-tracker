// 生成网页交互预览：把小程序真实的 评分 / 对阵 / 积分榜 / 多语言 / 格式化 代码打包进一个 HTML。
// 用法：node miniapp/preview/build.js <输出文件>
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const mods = {
  rating: 'cloudfunctions/api/lib/rating.js',
  schedule: 'cloudfunctions/api/lib/schedule.js',
  stats: 'cloudfunctions/api/lib/stats.js',
  i18n: 'miniprogram/utils/i18n.js',
  fmt: 'miniprogram/utils/fmt.js',
  predict: 'miniprogram/utils/predict.js',
};

const bundle = Object.entries(mods)
  .map(([name, file]) => `__def(${JSON.stringify(name)}, function (module, exports, require) {\n${read(file)}\n});`)
  .join('\n');

const runtime = `
// 小程序 API 的最小替身：语言设置存在浏览器里，系统语言取浏览器语言
var wx = {
  getStorageSync: function (k) { try { return localStorage.getItem('pp_' + k) || ''; } catch (e) { return ''; } },
  setStorageSync: function (k, v) { try { localStorage.setItem('pp_' + k, v); } catch (e) {} },
  getAppBaseInfo: function () { return { language: (navigator.language || 'en').replace('-', '_') }; },
  setTabBarItem: function () {},
};
var __mods = {};
function __def(name, fn) { __mods[name] = { fn: fn, exp: null }; }
function __req(name) {
  var m = __mods[name];
  if (!m.exp) {
    var module = { exports: {} };
    m.fn(module, module.exports, function (p) { return __req(p.replace(/^.*\\//, '').replace(/\\.js$/, '')); });
    m.exp = module.exports;
  }
  return m.exp;
}
`;

const html = `<title>匹克球助手预览</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600&display=swap">
<style>
${read('preview/style.css')}
</style>
<div id="app" class="shell"></div>
<script>
${runtime}
${bundle}
// 预览代码放进独立作用域，避免和 window.top 等浏览器全局变量冲突
(function () {
${read('preview/app.js')}
})();
</script>
`;

const out = process.argv[2] || path.join(__dirname, 'preview.html');
fs.writeFileSync(out, html);
console.log('wrote', out, Math.round(html.length / 1024) + ' KB');
