# DUPR 接入调研

2026-11-23 · 对应 `PRODUCT_RULES.md` 第 12 条

> 资料来自 DUPR 官网、帮助中心和第三方软件（Reclub、CourtReserve、PB Vision 等）的说明，链接在文末。DUPR 没有公开开发者文档，凡是标了「需向 DUPR 确认」的，都以 DUPR 官方答复为准。

## 一、结论速览

| 问题 | 结论 |
|---|---|
| 俱乐部能不能接 DUPR？ | 能。申请 **DUPR Club 免费**，在 dupr.com 的 Start a Club 页面填申请表，人工审核。 |
| 比分怎么进 DUPR？ | 三种方式：① 俱乐部管理员在 DUPR 网页逐场录入；② **CSV 批量导入**（官方说适合循环赛、联赛）；③ 通过已接入 DUPR 的第三方软件提交。俱乐部录入的比分**自动生效，不用球员确认**。 |
| 我们的小程序能直接连 DUPR 吗？ | 需要成为 **DUPR API 合作伙伴**。没有自助注册入口，要发邮件申请（support@mydupr.com），条件和费用未公开。 |
| 现在马上能做什么？ | 申请 DUPR Club + 小程序**导出 DUPR CSV**，管理员下载后上传到 DUPR。不需要 DUPR 批准接口，最快一两周能跑通。 |
| 八人转、十人转能计入 DUPR 吗？ | 能。每一局单独一行上报，赛制（发球得分制 / 直接得分制）和比分照实填写。 |
| 定级赛怎么搞？ | DUPR 上，新人打完第一场经过验证的比赛就有分，打 10–15 场才可靠（可靠度 60% 以上）。建议办「新人定级场」：新人和已有 DUPR 分的老球员混编，一晚打够 6–8 局。 |

## 二、DUPR 是什么

- DUPR（Dynamic Universal Pickleball Rating）是全球通用的匹克球评分，范围 **2.000–8.000**。
- **Pickleball Australia（PA）已把 DUPR 定为澳洲官方评分系统**，PA 认可的赛事和联赛都用它。
- 2025 年 7 月 8 日起算法改为「表现 vs 预期」：每场先按双方评分算出预期比分，打得比预期好就涨，输了也可能涨，赢了也可能跌。我们的评分规则 v1（`docs/rating-rules-v1.md`）就是照这个思路设计的。
- 计分权重：俱乐部、联赛、赛事录入的比分，比球员自己发的比分权重更高。
- **可靠度** 1–100%：打得越多、越近期越高，长期不打会下降；60% 以上算可靠。每周二更新。

## 三、球员怎么注册 DUPR

1. 手机装 **DUPR App**（App Store / Google Play），或打开 dupr.com，免费注册账号。
2. 资料里**关联 Pickleball Australia**（PA 建议这样做）。
3. 在个人页找到自己的 **DUPR ID**，发给俱乐部管理员。俱乐部上报比分时，名单里**每个人都必须有 DUPR ID**，否则导入失败。
4. 刚注册显示 **NR（未评分）**；打完第一场经过验证的比赛就有分数；建议打满 10–15 场再把分数当真。

球员自己在 App 里录比赛也行：录完后要对方确认（DUPR 2024 年的说明是所有参赛者都要确认；App 商店说明只提到对手确认，**需向 DUPR 确认**）。自己录的比赛权重低，俱乐部录的更好。

> 建议在我们小程序的「编辑资料」里加一个 **DUPR ID** 字段（现在只有 DUPR 分数），导出 CSV 时要用。

## 四、俱乐部怎么申请 DUPR Club

1. 俱乐部负责人先注册一个个人 DUPR 账号（第三方建议另开一个专用管理账号，个人账号也可以）。
2. 打开 dupr.com → **Clubs → Start a Club**，填写俱乐部名称（TATA Pickleball）、联系方式、地址（North Ryde）、会员人数。建议附上俱乐部网站或社交主页链接，审核更快。
3. 等 DUPR 审核通过（审核标准和时间未公开）。
4. 通过后，申请人是 **Director（总负责人）**，可以添加 **Organizer（组织者）**——相当于我们小程序里的管理员。只有 Director 能管理工作人员。
5. 管理员登录要开**两步验证**（用身份验证器 App，例如 Google Authenticator）。
6. 在俱乐部页面邀请球员加入，或者直接给有 DUPR ID 的球员录比分。

费用：**免费**，无订阅费。

## 五、比分怎么上报到 DUPR

### 方式 1：网页逐场录入
dupr.com 电脑网页 → 俱乐部 → **Matches → Add Matches**。只能给俱乐部成员或受邀球员录；必须分出胜负；选 **Standard（发球得分制）** 或 **Rally（直接得分制）**。俱乐部录入自动生效。

### 方式 2：CSV 批量导入（推荐，我们小程序配合这个）
1. **Clubs → My Clubs → 选俱乐部 → Matches → Add Matches → Import Matches via CSV**。
2. 下载官方模板，下面有 **Column Reference（列说明）**，列出哪些列必填。
3. 填好、按模板说明删掉示例行，存成 CSV 上传。
4. **只能用电脑网页上传，手机 App 不行。**
5. 一局一行；名单里每个人都要有 DUPR ID。

模板有多少列，第三方说法不一（27 列 / 22 列），**以俱乐部后台下载的官方模板为准**。拿到模板后，我们按列生成导出文件。

### 方式 3：第三方软件
Reclub、CourtReserve、Pickleheads、Scoreholio 等已接入 DUPR：把 DUPR Club ID 绑定到软件里，比赛结束点一下就提交。要求操作人是 DUPR 俱乐部的 Director 或 Organizer，球员也要各自绑定 DUPR 账号。

> **注意 Reclub**：它也做俱乐部、排对阵、一键提交 DUPR，是我们最直接的竞品。我们的差异在于：微信生态、中文/越南语/马来语、AA 收款、积分商城。

### 什么比分会被计入（需向 DUPR 确认现行规则）
- 旧资料：至少一方得到 6 分才计入（如 6:3）；DUPR 小联盟规则：双方都不到 7 分的不录入。
- 第三方说：队友分差超过 1.5、对手分差超过 0.625 的局可能暂不计入（来源不可靠，未证实）。
- 我们自己的规则 v1：双方合计不到 8 分不计分，跟上面基本一致。

## 六、俱乐部活动怎么打：八人转、十人转

我们小程序的「双打八人转」（`rotation`）就是 DUPR 常说的 round robin / mixer：每轮重新分组，搭档和对手尽量不重复。

### 八人转（推荐，最标准）
- 8 人、2 块场地、**7 轮**：每人打 7 局，**和其他 7 个人各搭档一次**，没有人轮空。
- 赛制建议：发球得分制 11 分（每局约 15–20 分钟，共约 2 小时）；时间紧就用直接得分制 15 分（每局约 12 分钟）。
- 小程序默认轮数就是 7 轮（公式：总搭档组合数 ÷ 每轮局数）。

### 十人转
- 10 人、2 块场地：每轮 8 人上场、**2 人轮空**。让每人和其他 9 人都搭档一次要 12 轮，太长。
- 实际建议打 **8–10 轮**，每人约 6–8 局；小程序会让轮空次数平均、轮空的人下一轮优先上场。
- 10 人、3 块场地不行（要 12 人），可以 2 场地十人转，或者拆成 8 + 单独加一场。

### 九人、十二人
- 9 人：2 块场地每轮轮空 1 人，打 9 轮，每人轮空 1 次、上场 8 局。
- 12 人：3 块场地，不轮空，按 11 轮全搭档太长，打 6–8 轮即可。

### 上报 DUPR 时
每一局单独一行，四个人的 DUPR ID、双方比分、赛制都填上。一晚八人转 = 14 行（7 轮 × 2 场）。

## 七、定级赛怎么搞

### DUPR 那边
- 新人打完第一场**经过验证**的比赛就出分；有资料说新人前 7 天是「初始化期」，比赛只影响新人自己的分、不影响别人（第三方说法，需确认）。
- DUPR 建议打 **10–15 场**再看分数；可靠度 **60%** 以上算可靠。
- 新人要和**已有可靠分数的球员**同场，算法才能把新人「定位」准。全是新人的比赛，分数没参照。

### 建议做法：新人定级场
- **人员**：4 名「锚点球员」（DUPR 可靠度 60% 以上、分数在 3.0–4.0 之间的老会员）+ 4 名新人，共 8 人 2 块场地。
- **分组**：每局每队「1 锚点 + 1 新人」，4 轮下来每个新人和每个锚点各搭档一次，再打 3 轮自由轮转，共 7 局。
- **赛制**：发球得分制 11 分，所有局都由管理员录入并上报 DUPR（俱乐部录入权重高）。
- **频率**：新人参加 2 次定级场（约 14 局）就能达到 DUPR 建议的场次。
- **小程序配合**：
  - 活动加「定级场」类型，报名时标出锚点和新人；
  - 排对阵用「平衡」模式或固定「锚点 + 新人」组合；
  - 我们自己的俱乐部评分也按规则 v1 的「定级期」走（可靠度不到 60% 显示「萌新·定级中（3/10）」）；
  - 还没 DUPR 的新人先做「水平自测」，得出 2.5 / 3.0 / 3.5 / 4.0 作为起始分。

## 八、小程序怎么连 DUPR：分三步

### 第 0 步：不需要 DUPR 批准，现在就能做（建议先做）
1. 俱乐部申请 DUPR Club（第四节）。
2. 小程序「编辑资料」加 **DUPR ID**。
3. 活动结束后，管理员在小程序里点「导出 DUPR 比分」，生成和官方模板一致的 CSV（每局一行）。
4. 管理员在电脑上登录 dupr.com 上传。
- 难点：小程序里不能直接下载文件到电脑。可行办法：生成文件存到云存储，给管理员一个下载链接（复制到电脑浏览器打开）；或者发到管理员邮箱。

### 第 1 步：申请 DUPR API 合作伙伴
1. 发邮件到 **support@mydupr.com**，请转给 API / 技术合作团队。介绍：澳洲悉尼俱乐部、微信小程序、用户规模、想做的功能（读取评分、提交比分）。
2. 要问清：申请条件、费用、测试环境账号、合作伙伴文档、品牌使用规定（能不能在界面写「DUPR」、用它的 logo）。
3. 已知技术信息（第三方开发者整理，**需以 DUPR 文档为准**）：
   - 有测试环境（UAT）和正式环境（api.dupr.com）；
   - 用合作伙伴的 client key / secret 换 1 小时有效的访问令牌；
   - 读球员评分要球员通过 DUPR 登录页授权（SSO），授权后拿到球员的 DUPR ID；
   - 合作伙伴权限是分项开通的（例如读取用户资料要单独的权限）。
4. DUPR 已有 70 多家 API 合作伙伴（CourtReserve、PB Vision、Pickleball.com 等），说明这条路走得通。

### 第 2 步：接入（拿到权限后）
- **读取评分**：球员绑定 DUPR 后，自动填入「匹克球等级（DUPR）」并标「已核验」，代替现在的手填。
- **提交比分**：比赛结束、管理员确认后，云函数直接把比分提交到 DUPR，不用再导 CSV。
- 密钥放在云函数的环境变量里，不进代码仓库。

### 微信小程序特有的坑（需验证）
- **授权页打不开的风险**：小程序里的网页（web-view）只能打开在后台配置并验证过的「业务域名」，而验证要在对方域名上放文件，DUPR 的登录页我们没法配置。可能的办法：球员复制链接在手机浏览器里完成 DUPR 授权，再回到小程序；或者 DUPR 支持「填 DUPR ID + 验证码」之类的方式。**要和 DUPR 确认它支持哪些授权方式。**
- **网络**：云开发环境在国内（上海），访问海外的 api.dupr.com 可能慢或不稳定，要实测；不行就加一个海外中转服务。
- **隐私**：读取 DUPR 数据要在「用户隐私保护指引」里写明，并让球员单独同意。
- **审核**：没拿到 DUPR 授权前，界面继续叫「俱乐部评分」，不写「DUPR 官方」。

## 九、明天的行动清单

| 谁 | 做什么 |
|---|---|
| 俱乐部负责人 | 注册 DUPR 账号 → 用 TATA Pickleball 申请 DUPR Club |
| 俱乐部负责人 | 给 support@mydupr.com 写信申请 API 合作（可以让 Claude 起草英文邮件） |
| 俱乐部管理员 | 通知会员注册 DUPR、关联 PA、把 DUPR ID 发给管理员 |
| 俱乐部 | 挑 4 名锚点球员，排第一场新人定级场 |
| 开发 | 小程序加 DUPR ID 字段；DUPR Club 批下来后拿官方 CSV 模板，做「导出 DUPR 比分」 |

## 来源

- DUPR 官网：[How it works](https://www.dupr.com/how-it-works)、[Clubs](https://www.dupr.com/clubs)、[Club Resources](https://www.dupr.com/club-resources)、[DUPR 成为 PA 官方评分](https://www.dupr.com/post/dupr-named-official-rating-system-of-pickleball-australia)、[可靠度](https://dupr.com/post/introducing-the-dupr-reliability-score)、[算法更新：输了也能涨分](https://www.dupr.com/post/dupr-algo-update-win-or-lose-your-rating-can-go-up)、[比赛验证](https://www.dupr.com/vi/post/ensuring-fair-play-the-importance-of-match-validation-on-dupr)、[DUPR 俱乐部数量与免费](https://www.dupr.com/post/dupr-clubs-hit-20-000-worldwide-and-it-keeps-growing)、[传统计分 vs 直接得分](https://www.dupr.com/post/traditional-scoring-vs-rally-scoring-what-pickleball-players-need-to-know)、[小联盟规则](https://www.dupr.com/minorleague/rules)
- DUPR 帮助中心：[CSV 导入比赛](https://dupr.zendesk.com/hc/en-us/articles/45778582901140-Adding-Matches-via-CSV)、[用俱乐部录比赛](https://dupr.zendesk.com/hc/en-us/articles/20549006556052-How-do-I-add-a-match-using-my-club)、[管理员登录与两步验证](https://dupr.zendesk.com/hc/en-us/articles/54138933441428-How-do-you-log-in-to-your-DUPR-account-as-a-club-director-or-organizer)、[添加俱乐部比赛](https://www.support.mydupr.com/post/how-do-i-add-club-matches)
- 澳洲：[Pickleball Australia 公告](https://www.pickleballaus.org/dupr-named-official-rating-system-of-pickleball-au)、[NPL DUPR 说明](https://www.nplpickleball.com.au/dupr-ratings-explained)、[Pickleball Queensland](https://www.pickleballqueensland.org/news/discovering-the-world-of-dupr)
- 第三方软件：[Reclub 提交 DUPR](https://help.reclub.co/hc/reclub-help/articles/1765844449-how-can-i-submit-matches-to-dupr)、[Reclub 组织者](https://pickleball.reclub.co/for-organizers)、[Pickleheads 绑定 DUPR Club](https://www.pickleheads.com/guides/link-dupr-club)、[CourtReserve 集成](http://help.courtreserve.com/en/articles/8265424-dupr-set-up-dupr-integration)、[CourtReserve 联赛上报](http://help.courtreserve.com/en/articles/8955787-add-league-match-information-into-dupr)、[PB Vision 绑定 DUPR](https://help.pb.vision/articles/6327132-linking-to-dupr-and-submitting-games)、[Scoreholio](https://docs.scoreholio.com/run-a-tournament/run-a-tournament/finish-and-review/dupr-for-pickleball)
- 开发者资料（第三方，需核实）：[DUPR 合作伙伴权限讨论](https://github.com/Rocktown-Labs/rallycasts/issues/203)、[球员绑定 DUPR 的实现](https://github.com/relandpigte/sports-booking/pull/51)、[dupr-partner-api](https://github.com/Info-Esportes/dupr-partner-api)、[CSV 录入工具](https://github.com/johnpathe/dupr-match-entry)
- 其他：[DUPR 比分规则 Q&A](https://www.picklesne.com/dupr-qa)、[2025 算法更新解读](https://pickleball.com/news/dupr-updates-algorithm-wins-and-losses-take-backseat-to-performance)
