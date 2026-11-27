# 自动加入购物车：给 WorkBuddy 的操作手册

这份手册写给 WorkBuddy（或其他能操控浏览器的 AI 助手）。任务只有一个：**按 Victor 的要求，把 Tennis World North Ryde 的 pickleball 场加进购物车，然后停下来等他自己付款。**

动手前先读完这一页，每次都按这里做。回复用中文。

---

## 1. 铁律（任何情况下都不能违反）

1. **只加购物车，不付款。** 不点 Pay、Checkout、Complete、Confirm、Submit、Book now、Place order 这类付款或提交订单的按钮。到了结账页就停。
2. **不碰支付信息。** 不新增、删除、修改账户里的支付方式，不切换默认卡，不输入任何卡号。需要说明用哪张卡时，只说卡类型和尾号。
3. **不输密码。** 页面要求登录（Sign in / Log in to Continue）时，停下来请 Victor 自己在窗口里登录，登好了再继续。
4. **只用专用 Chrome。** 只连 `127.0.0.1:9222` 这个由 `scripts/windows/tennisworld-chrome.bat` 打开的实例。连不上就告诉 Victor 先运行这个脚本，不要去连别的浏览器，也不要自己改启动参数。
5. **不擅自替换。** 要的时段或场地没有了，就跳过并报告，不要自己换时间、换日期、换场地。只有 Victor 事先说了「没有就换 X」才能换。
6. **Victor 说「我要付款了」之后，停止一切浏览器操作，**直到他说「付完了」。

---

## 2. Victor 会怎么下指令

一般是这样一句话：

> 11/29 周日晚上 7–9 点，订 2 片 Premium，最好相邻；没有 Premium 就订 Standard。

你要先整理成一张清单，**发给他确认后再动手**：

| 日期 | 场地 | 时间 | 格数 | 小计 |
|---|---|---|---|---|
| 2026-11-29 周日 | Ct3 | 7:00–9:00 PM | 4 | A$70.00 |

- 日期一律按**悉尼时间**算。他说「今晚」「周五」时，先确认悉尼今天是几号再推算。
- 价格：Premium（Ct1–4）每 30 分钟 A$17.50，Standard（Ct5–16）每 30 分钟 A$15。60 分钟的价格就是两格加起来，所以都按 30 分钟一格加购物车，不用找 60 分钟的服务。
- 他没指定场地时，挑法见第 4 节。

---

## 3. 每片场的预订页面

每片场有一个直达页面，地址格式：

```
https://go.mindbodyonline.com/book/widgets/appointments/view/7b9803fef1/schedule?locationId=1&serviceId={SVC}&staffId={STAFF}
```

| 场地 | 页面上显示的名字 | serviceId | staffId |
|---|---|---|---|
| Ct1 | Premium Pickleball Court 1 | 132 | 100000022 |
| Ct2 | Premium Pickleball Court 2 | 132 | 100000023 |
| Ct3 | Premium Pickleball Court 3 | 132 | 100000024 |
| Ct4 | Premium Pickleball Court 4 | 132 | 100000025 |
| Ct5 | Standard PB Ct 5 | 120 | 100000152 |
| Ct6 | Standard PB Ct 6 | 120 | 100000153 |
| Ct7 | Standard PB Ct 7 | 120 | 100000154 |
| Ct8 | Standard PB Ct 8 | 120 | 100000155 |
| Ct9 | Standard PB Ct 9 | 120 | 100000156 |
| Ct10 | Standard PB Ct10 | 120 | 100000157 |
| Ct11 | Standard PB Ct11 | 120 | 100000158 |
| Ct12 | Standard PB Ct12 | 120 | 100000159 |
| Ct13 | Standard PB Ct13 | 120 | 100000162 |
| Ct14 | Standard PB Ct14 | 120 | 100000163 |
| Ct15 | Standard PB Ct15 | 120 | 100000164 |
| Ct16 | Standard PB Ct16 | 120 | 100000165 |

serviceId 132 是「Pickleball Premium - 30 mins」，120 是「Pickleball 30 minutes」。

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

## 5. 加购物车的步骤（每一格都这样做）

1. 打开这片场的预订页（第 3 节）。
2. 在顶部日期条点目标日期。页面会显示「Availability for <日期>」。
3. 在 Morning / Afternoon / Evening 里点开始时间，比如 `7:00 PM`。**页面上没有这个时间，就是这片场这个时段已经被订了**，记下来，跳过。
4. **核对右侧 BOOKING SUMMARY**，三样都要对：
   - 日期，比如 `Sun, Nov 29`
   - 时间，比如 `7:00 pm–7:30 pm`
   - 场地名，比如 `Premium Pickleball Court 3`（要和第 3 节表里的名字一致）

   任何一样不对，不要点，回到第 2 步重新选。
5. 点 **Add to Cart**。
6. 下一个半小时格，回到第 1 步。同一片场连续几格就重复几次。

全部加完后：

7. 打开购物车，把里面**每一项**列给 Victor（日期、场地、开始–结束时间、价格），算合计。
8. 告诉他哪些没加上、为什么（比如「Ct4 8:30 已被订」）。
9. 告诉他结账页默认选的是哪张卡（只说类型和尾号）。
10. **停下。** 说一句「已加入购物车，请你核对后自己付款」。

---

## 6. 注意事项

- **购物车不锁场。** 别人先付款，场就没了。加完要提醒 Victor 尽快付，晚上热门时段尤其要快。
- **源站有延迟。** 他刚付完款，页面可能过几分钟才把那格去掉。
- **周四 19:00–21:00 通常全馆被占**（联赛、课程），全部 16 片场一起不可订是正常的，不是出错。
- **预订窗口大约提前 8 天。** 更远的日期页面上还看不到，告诉他到时候再订。
- 网站结构可能改版。按钮名字、页面布局和这里写的对不上时，停下来截图给 Victor，不要乱点。

---

## 7. 付完款之后

Victor 付完款，会把确认单发给 Claude，由 Claude 更新 `data/mine.json` 和页面。你**不用改仓库里的任何文件**。
