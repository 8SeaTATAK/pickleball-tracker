# 匹克球助手 — 开发须知

- 开始改代码前先读 `PRODUCT_RULES.md`：里面是已确定但还没实现的产品规则，碰到相关功能时必须按规则实现，实现后把条目移到「已实现」。
- 界面文字都在 `miniprogram/utils/i18n.js`（中文 / English / Tiếng Việt / Bahasa Melayu），不要在页面里写死文字。
- 云函数只返回错误代码，文案由前端翻译（`err_*`）。
- 改完运行 `cd cloudfunctions/api && npm test`；改了算法或文案后重新生成网页预览：`node preview/build.js <输出文件>`。
