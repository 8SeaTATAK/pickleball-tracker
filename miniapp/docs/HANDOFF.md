# 交接说明：接入云开发（在本地电脑上继续）

> 写于 2026-11-23。上一个对话在云端容器里，看不到本地电脑，所以云开发接入需要在本地新对话里完成。

## 项目现状

- 仓库 `8seatatak/pickleball-tracker`，分支 `claude/exciting-galileo-3du6ba`（最新提交：同步发布准备工作——等级自测、内容安全、隐私弹窗）。
- 小程序代码在 `miniapp/`：原生小程序 + 微信云开发，单个云函数 `api`（按 `event.action` 分发），7 个集合：users、clubs、members、events、signups、matches、ratingHistory（权限：仅管理端可读写）。
- 开发须知见 `miniapp/CLAUDE.md`；待实现规则见 `miniapp/PRODUCT_RULES.md`；上线清单见 `miniapp/docs/RELEASE_CHECKLIST.md`。
- 测试：`cd miniapp/cloudfunctions/api && npm install && npm test`（24 个通过）。
- 小程序已注册（成都公司营业执照），**微信认证已完成，小程序备案未完成**。类目：体育 → 体育赛事。

## 还是占位符，需要换成真实值

- `miniapp/project.config.json`：`"appid": "touristappid"`
- `miniapp/miniprogram/app.js`：`const ENV_ID = 'your-cloud-env-id';`

## 云开发接入步骤（按 https://docs.cloudbase.net/skill.md）

1. 站点：**国内站**（微信小程序；国内站有免费体验环境，3,000 资源点/月）。
2. 检查 `node`（≥18）、`npm`、`npx`、`git`。
3. 安装插件：`npx plugins add TencentCloudBase/cloudbase-plugin -y --scope user --target claude-code`，装完提示用户重启 Claude Code。重启前用 `tcb` 命令行（`npm i -g @cloudbase/cli`）。
4. 登录授权页选**「公众平台登录」**，用绑定这个小程序的微信扫码（不要用腾讯云账号登录，否则看不到环境）。
5. 微信开发者工具 **Nightly** 版，导入 `miniapp` 文件夹，填真实 AppID，工具栏「云开发」开通环境，记下环境 ID。
6. 配置开发者工具 Skill：开发者工具菜单导出 Skill 并导入 Claude Code（或终端跑 `wechatide`，把输出的路径给 Claude），首次授权点「允许」。
7. 验收：「检查开发者工具是否已登录，然后打开这个小程序并预览。」能预览后再做业务。

## 接通之后

1. 把真实 AppID 和环境 ID 写进上面两个文件。
2. 部署云函数 `api`（要带上 `config.json`，里面有 `security.msgSecCheck` / `security.mediaCheckAsync` 权限）。用 `tcb fn deploy`，不要用 `tcb deploy`。
3. 建 7 个集合，权限设为「仅管理端可读写」。
4. 可选：云函数环境变量 `VIP_OPENIDS`（逗号分隔的 openid，永久 VIP）。
5. 继续 `RELEASE_CHECKLIST.md`：隐私保护指引、审核说明和测试账号、真机测试、小程序备案。

## 2026-11-24 更新

- DUPR 调研、俱乐部申请进度和今天定下的规则，见 `docs/notes-2026-11-24.md`（纪要）、`docs/dupr-research.md`（调研）和 `PRODUCT_RULES.md` 第 12–15 条。
- 下一步开发优先级：DUPR ID 字段 → 活动类型（普通 Social / DUPR 计分场）→ 比分双方确认 → 周期活动。
