# 自动加入购物车：给 WorkBuddy 的操作手册

这份手册写给 WorkBuddy（或其他能操控浏览器的 AI 助手）。任务只有一个：**按 Victor 的要求，把 Tennis World North Ryde 的 pickleball 场加进购物车，然后停下来等他自己付款。**

动手前先读完这一页，每次都按这里做。回复用中文。

---

## 1. 铁律（任何情况下都不能违反）

1. **只加购物车，不付款。** 不点 Pay、Checkout、Complete、Confirm、Submit、Book now、Place order 这类付款或提交订单的按钮。到了结账页就停。
2. **不碰支付信息。** 不新增、删除、修改账户里的支付方式，不切换默认卡，不输入任何卡号。需要说明用哪张卡时，只说卡类型和尾号。
3. **不输密码。** 页面要求登录（Sign in / Log in to Continue）时，停下来请 Victor 自己在窗口里登录，登好了再继续。
   - **一律从官网 https://www.tennisworldonline.com.au/bookacourt/ 进去**，在页面里嵌的预订组件上操作。这个组件的登录状态只在官网页面里有效；直接打开 `go.mindbodyonline.com/...` 的链接是另一套登录，不要这样用。
   - 没登录时点 Add to Cart 只会弹出 Mindbody 登录窗，不会加购物车。请 Victor 自己点组件里的 **My Account** 登录。
   - 不要去 `cart.mindbodyonline.com` 品牌站上操作，那里有付款组件。
   - 官网里的组件是第三方 iframe，**专用 Chrome 必须允许 tennisworldonline.com.au 使用第三方 Cookie**，否则登录存不住，Add to Cart 会一直弹登录窗。设置方法：Chrome 设置 → 隐私和安全 → 第三方 Cookie → 「允许使用第三方 Cookie 的网站」→ 添加 `[*.]tennisworldonline.com.au`。由 Victor 自己设置。
4. **只用专用 Chrome。** 只连 `127.0.0.1:9222` 这个由 `scripts/windows/tennisworld-chrome.bat` 打开的实例。连不上就告诉 Victor 先运行这个脚本，不要去连别的浏览器，也不要自己改启动参数。
5. **不擅自替换。** 要的时段或场地没有了，就跳过并报告，不要自己换时间、换日期、换场地。只有 Victor 事先说了「没有就换 X」才能换。
6. **Victor 说「我要付款了」之后，停止一切浏览器操作，**直到他说「付完了」。

---

## 2. Victor 会怎么下指令

一般是这样一句话：

> 11/29 周日晚上 7–9 点，订 2 片 Premium，最好相邻；没有 Premium 就订 Standard。

你要先整理成一张清单，**发给他确认后再动手**：

| 日期 | 场地 | 时间 | 时长 | 价格 |
|---|---|---|---|---|
| 2026-11-29 周日 | Ct3 | 7:00–9:00 PM | 120 分钟 | A$70.00 |

- 日期一律按**悉尼时间**算。他说「今晚」「周五」时，先确认悉尼今天是几号再推算。
- 价格：Premium（Ct1–4）每 30 分钟 A$17.50，Standard（Ct5–16）每 30 分钟 A$15。以结账页显示的为准。
- 他没指定场地时，挑法见第 4 节。

---

## 3. 预订组件的结构

入口：https://www.tennisworldonline.com.au/bookacourt/ ，页面中间嵌着 Mindbody 预订组件（iframe，地址以 `go.mindbodyonline.com/book/widgets/appointments/view/7b9803fef1` 开头）。

组件里依次是：

1. **服务列表**：Court Hire 下有 Basketball、**Premium Pickleball**、**Standard Pickleball**、Tennis，每项点 **Show** 展开。
2. **时长**：展开后有 30 / 60 / 90 / 120 分钟四种，点对应的 **Select**。
   - Premium：`Pickleball Premium - 30 mins` / `60 mins` / `90 mins` / `120 mins`
   - Standard：`Pickleball 30 minutes` / `60 Minutes` 等（以页面为准）
3. **加购页（Enhance your service）**：球拍租赁之类的附加项。**一律点 Continue with no add-ons**，不要加任何附加项。
4. **选场地（Select your provider）**：点具体场地名，**不要选 First Available**（会随机分配场地），然后点 **Continue**。
5. **选日期和时间**：顶部日期条点日期，下面 Morning / Afternoon / Evening 里点开始时间。
6. 右侧 **BOOKING SUMMARY** 核对后点 **Add to Cart**。

场地在页面上的名字：

| 场地 | 页面上的名字 |
|---|---|
| Ct1–Ct4 | Premium Pickleball Court 1 … Court 4 |
| Ct5–Ct9 | Standard PB Ct 5 … Ct 9（Ct 和数字之间有空格） |
| Ct10–Ct16 | Standard PB Ct10 … Ct16（没有空格） |

---

## 4. 挑场地（他没指定时）

1. 先看最新空场：打开 `https://8seatatak.github.io/pickleball-tracker/data/availability.json`，结构是 `{"data": {"YYYY-MM-DD": {"Ct1": ["19:00", ...]}}}`，列出的是可订的半小时格（24 小时制）。这份数据可能有半小时左右的延迟，**以预订页面上实际显示的为准**。
2. 想要整段时间（比如 7–9 点），优先挑**整段都空**的场，不要把一个人的时间拆到两片场上。
3. 要几片场时，优先相邻的。场地布局：
   - Premium：Ct1–4 一排
   - Std A：6、7 在上，5、8 在下
   - Std B：10、11 在上，9、12 在下
   - Std C：14、15 在上，13、16 在下
4. Victor 已经订了的场在 `https://8seatatak.github.io/pickleball-tracker/data/mine.json` 里。要「加时」的话，优先接在他已有的场后面，人不用换场。

---

## 5. 加购物车的步骤

**按整段时长加**：一片场要 7:00–9:00，就选 120 分钟的服务、开始时间 7:00 PM，一次加进去。页面只会列出整段都空的开始时间。

- 60 分钟及以上的服务**只能整点开始**（7:00、8:00…）。半点开始的时段（比如 7:30–8:30）要用 30 分钟的服务连加两笔。
- 整段加不了（比如中间有一格被占），就报告给 Victor，不要自己拆成几段换场。

每一笔都这样做：

1. 打开 https://www.tennisworldonline.com.au/bookacourt/ ，滚到预订组件（之后可以在组件里点 **Back** 回到服务列表，不用每次重开）。
2. 展开 Premium Pickleball 或 Standard Pickleball，选对应时长的 **Select**。
3. 加购页点 **Continue with no add-ons**。
4. 选具体场地 → **Continue**。
5. 日期条点目标日期，确认显示「Availability for <日期>」。
6. 点开始时间。**页面上没有这个时间，就是这片场这段时间不能整段订**，记下来，跳过这一笔。
7. **核对右侧 BOOKING SUMMARY**，四样都要对：
   - 服务名和时长，比如 `Pickleball Premium - 120 mins`
   - 日期，比如 `Sun, Nov 29`
   - 时间，比如 `7:00 pm–9:00 pm`
   - 场地名，比如 `Premium Pickleball Court 3`

   任何一样不对，不要点，重新选。
8. 点 **Add to Cart**。每加成功一笔，简单报一句，比如「✓ Ct3 7:00–9:00」。

全部加完后：

9. 打开购物车，把里面**每一项**列给 Victor（日期、场地、开始–结束时间、价格），算合计。
10. 告诉他哪些没加上、为什么（比如「Ct4 8:30 已被订，7:00–9:00 无法整段订」）。
11. 告诉他结账页默认选的是哪张卡（只说类型和尾号）。
12. **停下。** 说一句「已加入购物车，请你核对后自己付款」。

---

## 6. 注意事项

- **购物车不锁场。** 别人先付款，场就没了。加完要提醒 Victor 尽快付，晚上热门时段尤其要快。
- **源站有延迟。** 他刚付完款，页面可能过几分钟才把那格去掉。
- **周四 19:00–21:00 通常全馆被占**（联赛、课程），全部 16 片场一起不可订是正常的，不是出错。
- **预订窗口大约提前 8 天。** 更远的日期页面上还看不到，告诉他到时候再订。
- 网站结构可能改版。按钮名字、页面布局和这里写的对不上时，停下来截图给 Victor，不要乱点。

---

## 7. 付完款之后：更新页面

Victor 付完款后，把预订记进 `data/mine.json`，页面（https://8seatatak.github.io/pickleball-tracker/ ）约 1 分钟后显示紫色 ✓。

- 在**工作副本** `%USERPROFILE%\pickleball-work` 里改，不要动同步副本 `%USERPROFILE%\pickleball-tracker`（它只负责 `git pull`，改了会卡住）。
- 完全按仓库根目录 `AGENTS.md` 的规则做，特别是：
  - 第 3 节：先确认悉尼日期，`git pull origin main --ff-only`，在已有内容上合并，不要覆盖。
  - 第 4 节：格式和换算（每个半小时格写开始时间，24 小时制）。
  - 第 6 节 A：用第 7 节的命令核对源站，提交信息例如 `Add 11/30 bookings: Premium Ct1 8-10pm`。
- 只改 `data/mine.json`。不碰 `history.json`、`availability.json`、`index.html`、`scrape.mjs`。
- 推送被拒（别人刚推过）：`git pull --rebase origin main` 后再推，不要 force push。
- 推送前把改动的 diff 给 Victor 看一眼。
