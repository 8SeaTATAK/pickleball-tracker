// 多语言：中文 / English / Tiếng Việt / Bahasa Melayu
// 每条是 [zh, en, vi, ms]。占位符：{0} {1} 按位置，{field} {n} 等按名字（后端错误参数）。
// 越南语、马来语为初稿，建议请母语球友过一遍。

const LANGS = ['zh', 'en', 'vi', 'ms'];
const LANG_NAMES = ['中文', 'English', 'Tiếng Việt', 'Bahasa Melayu'];
const STORAGE_KEY = 'lang';

const L = {
  // ---------- 通用 ----------
  appName: ['匹克球助手', 'Pickleball Assistant', 'Trợ lý Pickleball', 'Pembantu Pickleball'],
  tabHome: ['首页', 'Home', 'Trang chủ', 'Utama'],
  tabMe: ['我的', 'Me', 'Tôi', 'Saya'],
  language: ['语言', 'Language', 'Ngôn ngữ', 'Bahasa'],
  loading: ['加载中', 'Loading', 'Đang tải', 'Memuatkan'],
  saving: ['保存中', 'Saving', 'Đang lưu', 'Menyimpan'],
  processing: ['处理中', 'Working', 'Đang xử lý', 'Memproses'],
  cancel: ['取消', 'Cancel', 'Hủy', 'Batal'],
  ok: ['确定', 'OK', 'OK', 'OK'],
  save: ['保存', 'Save', 'Lưu', 'Simpan'],
  share: ['分享', 'Share', 'Chia sẻ', 'Kongsi'],
  add: ['添加', 'Add', 'Thêm', 'Tambah'],
  adding: ['添加中', 'Adding', 'Đang thêm', 'Menambah'],
  added: ['已添加', 'Added', 'Đã thêm', 'Ditambah'],
  done: ['完成', 'Done', 'Xong', 'Selesai'],
  delete: ['删除', 'Delete', 'Xóa', 'Padam'],
  deleting: ['删除中', 'Deleting', 'Đang xóa', 'Memadam'],
  submit: ['提交', 'Submit', 'Gửi', 'Hantar'],
  submitting: ['提交中', 'Submitting', 'Đang gửi', 'Menghantar'],
  optional: ['选填', 'Optional', 'Không bắt buộc', 'Pilihan'],
  networkError: ['网络错误', 'Network error', 'Lỗi mạng', 'Ralat rangkaian'],
  provisional: ['暂定', 'provisional', 'tạm tính', 'sementara'],
  status_open: ['报名中', 'Open', 'Đang mở', 'Dibuka'],
  status_playing: ['进行中', 'In play', 'Đang diễn ra', 'Berlangsung'],
  status_finished: ['已结束', 'Finished', 'Đã kết thúc', 'Tamat'],
  role_owner: ['创建者', 'Owner', 'Người tạo', 'Pemilik'],
  role_admin: ['管理员', 'Admin', 'Quản trị viên', 'Pentadbir'],
  role_member: ['成员', 'Member', 'Thành viên', 'Ahli'],
  doubles: ['双打', 'Doubles', 'Đánh đôi', 'Beregu'],
  singles: ['单打', 'Singles', 'Đánh đơn', 'Perseorangan'],
  doublesRating: ['双打评分', 'Doubles rating', 'Điểm đánh đôi', 'Rating beregu'],
  singlesRating: ['单打评分', 'Singles rating', 'Điểm đánh đơn', 'Rating perseorangan'],
  membersN: ['{0} 名成员', '{0} members', '{0} thành viên', '{0} ahli'],
  colPlayer: ['球员', 'Player', 'Người chơi', 'Pemain'],
  colWL: ['胜-负', 'W-L', 'T-B', 'M-K'],
  colWinRate: ['胜率', 'Win %', 'Tỉ lệ thắng', '% menang'],
  colDiff: ['净胜', '+/-', 'Hiệu số', 'Beza'],
  colPoints: ['积分', 'Pts', 'Điểm', 'Mata'],
  colScores: ['得/失', 'For/Agst', 'Ghi/Mất', 'Untuk/Lawan'],
  guest: ['临时', 'Guest', 'Khách', 'Tetamu'],
  viewProfile: ['查看资料', 'View profile', 'Xem hồ sơ', 'Lihat profil'],

  // ---------- 首页 ----------
  setLevelHint: ['点这里设置你的起始水平 ›', 'Tap to set your starting level ›', 'Chạm để đặt trình độ ban đầu ›', 'Ketik untuk tetapkan tahap permulaan ›'],
  gamesSummary: ['双打 {0} 场 · 单打 {1} 场', 'Doubles {0} · Singles {1} games', 'Đôi {0} trận · Đơn {1} trận', 'Beregu {0} · Perseorangan {1} perlawanan'],
  upcoming: ['近期活动', 'Upcoming sessions', 'Buổi chơi sắp tới', 'Sesi akan datang'],
  noEvents: ['暂无活动，去俱乐部看看吧', 'No upcoming sessions — check your clubs', 'Chưa có buổi chơi nào — xem câu lạc bộ của bạn', 'Tiada sesi akan datang — lihat kelab anda'],
  myClubs: ['我的俱乐部', 'My clubs', 'Câu lạc bộ của tôi', 'Kelab saya'],
  rulesLink: ['评分规则', 'Rating rules', 'Cách tính điểm', 'Peraturan rating'],
  noClubs: ['还没有加入俱乐部', "You haven't joined a club yet", 'Bạn chưa tham gia câu lạc bộ nào', 'Anda belum menyertai mana-mana kelab'],
  createClub: ['创建俱乐部', 'Create club', 'Tạo câu lạc bộ', 'Cipta kelab'],
  joinByCode: ['邀请码加入', 'Join with code', 'Tham gia bằng mã', 'Sertai dengan kod'],
  enterCode: ['输入俱乐部邀请码', 'Enter club invite code', 'Nhập mã mời câu lạc bộ', 'Masukkan kod jemputan kelab'],
  codePh: ['6 位邀请码', '6-character code', 'Mã 6 ký tự', 'Kod 6 aksara'],
  join: ['加入', 'Join', 'Tham gia', 'Sertai'],
  joining: ['加入中', 'Joining', 'Đang tham gia', 'Menyertai'],
  signed_joined: ['已报名', 'Signed up', 'Đã đăng ký', 'Berdaftar'],
  signed_waitlist: ['候补中', 'Waitlisted', 'Đang chờ', 'Menunggu'],
  shareHome: ['匹克球助手 · 俱乐部约球、计分、评分', 'Pickleball Assistant · club sessions, scores & ratings', 'Trợ lý Pickleball · lịch chơi, tỉ số & xếp hạng', 'Pembantu Pickleball · sesi kelab, skor & rating'],

  // ---------- 俱乐部编辑 ----------
  clubSettings: ['俱乐部设置', 'Club settings', 'Cài đặt câu lạc bộ', 'Tetapan kelab'],
  name: ['名称', 'Name', 'Tên', 'Nama'],
  clubNamePh: ['例如：北区匹克球俱乐部', 'e.g. North Ryde Pickleball Club', 'VD: CLB Pickleball North Ryde', 'cth. Kelab Pickleball North Ryde'],
  city: ['城市', 'City', 'Thành phố', 'Bandar'],
  intro: ['简介', 'About', 'Giới thiệu', 'Tentang'],
  introPh: ['选填：常驻场馆、活动时间、水平要求…', 'Optional: venue, usual times, level…', 'Không bắt buộc: sân, giờ chơi, trình độ…', 'Pilihan: lokasi, masa biasa, tahap…'],
  pointsRules: ['积分规则', 'Points rules', 'Quy tắc tính điểm', 'Peraturan mata'],
  perWin: ['胜一场', 'Per win', 'Mỗi trận thắng', 'Setiap menang'],
  perLoss: ['负一场', 'Per loss', 'Mỗi trận thua', 'Setiap kalah'],
  pts: ['分', 'pts', 'điểm', 'mata'],
  lossHint: ['分（鼓励出勤可设为 1）', 'pts (1 rewards turning up)', 'điểm (đặt 1 để khuyến khích tham gia)', 'mata (1 untuk galakkan kehadiran)'],
  currency: ['费用币种', 'Currency', 'Tiền tệ', 'Mata wang'],
  needClubName: ['请填写俱乐部名称', 'Please enter a club name', 'Vui lòng nhập tên câu lạc bộ', 'Sila masukkan nama kelab'],
  creating: ['创建中', 'Creating', 'Đang tạo', 'Mencipta'],

  // ---------- 俱乐部详情 ----------
  inviteCode: ['邀请码', 'Invite code', 'Mã mời', 'Kod jemputan'],
  tapToCopy: ['（点击复制）', '(tap to copy)', '(chạm để sao chép)', '(ketik untuk salin)'],
  shareInvite: ['分享邀请', 'Share invite', 'Chia sẻ lời mời', 'Kongsi jemputan'],
  joinClub: ['加入俱乐部', 'Join club', 'Tham gia câu lạc bộ', 'Sertai kelab'],
  tabEvents: ['活动', 'Sessions', 'Buổi chơi', 'Sesi'],
  tabBoard: ['积分榜', 'Leaderboard', 'Bảng xếp hạng', 'Papan mata'],
  tabMembers: ['成员', 'Members', 'Thành viên', 'Ahli'],
  newEvent: ['＋ 发布活动', '+ New session', '+ Tạo buổi chơi', '+ Sesi baharu'],
  noClubEvents: ['还没有活动', 'No sessions yet', 'Chưa có buổi chơi', 'Belum ada sesi'],
  last7: ['近 7 天', '7 days', '7 ngày', '7 hari'],
  last30: ['近 30 天', '30 days', '30 ngày', '30 hari'],
  allTime: ['全部', 'All time', 'Tất cả', 'Semua'],
  noBoard: ['这段时间还没有比赛记录', 'No games in this period', 'Chưa có trận nào trong thời gian này', 'Tiada perlawanan dalam tempoh ini'],
  boardRule: ['积分 = 胜场 × {0} + 负场 × {1}；同分看胜率、净胜分', 'Points = wins × {0} + losses × {1}; ties go to win %, then point diff', 'Điểm = thắng × {0} + thua × {1}; bằng điểm xét tỉ lệ thắng, rồi hiệu số', 'Mata = menang × {0} + kalah × {1}; seri ikut % menang, kemudian beza mata'],
  addGuestBtn: ['＋ 添加临时球员（无需微信）', '+ Add guest player (no WeChat needed)', '+ Thêm người chơi khách (không cần WeChat)', '+ Tambah pemain tetamu (tanpa WeChat)'],
  memberWL: ['双打 {0}胜{1}负', 'Doubles {0}W {1}L', 'Đôi {0}T {1}B', 'Beregu {0}M {1}K'],
  leaveClub: ['退出俱乐部', 'Leave club', 'Rời câu lạc bộ', 'Keluar kelab'],
  leaveConfirm: ['退出后历史比赛和评分会保留。确定退出？', 'Your game history and rating are kept. Leave this club?', 'Lịch sử trận đấu và điểm sẽ được giữ lại. Rời câu lạc bộ?', 'Sejarah perlawanan dan rating anda disimpan. Keluar kelab ini?'],
  joined: ['已加入', 'Joined', 'Đã tham gia', 'Telah sertai'],
  makeAdmin: ['设为管理员', 'Make admin', 'Đặt làm quản trị viên', 'Jadikan pentadbir'],
  removeAdmin: ['取消管理员', 'Remove admin', 'Bỏ quyền quản trị', 'Buang pentadbir'],
  removeFromClub: ['移出俱乐部', 'Remove from club', 'Xóa khỏi câu lạc bộ', 'Keluarkan dari kelab'],
  removeMemberTitle: ['移出成员', 'Remove member', 'Xóa thành viên', 'Keluarkan ahli'],
  removeMemberConfirm: ['确定将「{0}」移出俱乐部？', 'Remove "{0}" from the club?', 'Xóa "{0}" khỏi câu lạc bộ?', 'Keluarkan "{0}" dari kelab?'],
  addGuestTitle: ['添加临时球员', 'Add guest player', 'Thêm người chơi khách', 'Tambah pemain tetamu'],
  guestName: ['姓名', 'Name', 'Tên', 'Nama'],
  guestNamePh: ['球员称呼', 'Player name', 'Tên người chơi', 'Nama pemain'],
  startLevel: ['起始水平', 'Starting level', 'Trình độ ban đầu', 'Tahap permulaan'],
  levelDefault: ['不设置（3.500）', 'Not set (3.500)', 'Không đặt (3.500)', 'Tidak ditetapkan (3.500)'],
  guestHint: ['临时球员同样参与对阵、积分榜和评分，由管理员代为报名和录分。', 'Guests take part in pairings, leaderboards and ratings. An admin signs them up and enters their scores.', 'Khách vẫn được xếp cặp, tính điểm và xếp hạng. Quản trị viên đăng ký và nhập tỉ số giúp họ.', 'Tetamu turut disertakan dalam pasangan, papan mata dan rating. Pentadbir mendaftar dan memasukkan skor bagi mereka.'],
  shareClub: ['邀请你加入「{0}」匹克球俱乐部', 'Join "{0}" pickleball club', 'Mời bạn tham gia CLB pickleball "{0}"', 'Sertai kelab pickleball "{0}"'],
  clubFallback: ['匹克球俱乐部', 'Pickleball club', 'Câu lạc bộ pickleball', 'Kelab pickleball'],

  // ---------- 活动编辑 ----------
  newEventTitle: ['发布活动', 'New session', 'Tạo buổi chơi', 'Sesi baharu'],
  editEvent: ['编辑活动', 'Edit session', 'Sửa buổi chơi', 'Sunting sesi'],
  eventName: ['活动名称', 'Title', 'Tên buổi chơi', 'Tajuk'],
  eventNamePh: ['例如：周六上午双打局', 'e.g. Saturday morning doubles', 'VD: Đánh đôi sáng thứ Bảy', 'cth. Beregu pagi Sabtu'],
  date: ['日期', 'Date', 'Ngày', 'Tarikh'],
  time: ['时间', 'Time', 'Giờ', 'Masa'],
  to: ['至', 'to', 'đến', 'hingga'],
  location: ['地点', 'Venue', 'Địa điểm', 'Lokasi'],
  locationPh: ['场馆 / 场地号', 'Venue / court numbers', 'Sân / số sân', 'Lokasi / nombor gelanggang'],
  courts: ['场地数', 'Courts', 'Số sân', 'Gelanggang'],
  courtsUnit: ['片', 'courts', 'sân', 'gelanggang'],
  capacity: ['人数上限', 'Max players', 'Số người tối đa', 'Pemain maksimum'],
  capacityUnit: ['人，满员后自动候补', 'extra sign-ups join the waitlist', 'người; đủ chỗ sẽ vào danh sách chờ', 'selebihnya masuk senarai menunggu'],
  fee: ['费用', 'Fee', 'Phí', 'Yuran'],
  feeUnit: ['每人', 'per person', 'mỗi người', 'seorang'],
  note: ['备注', 'Notes', 'Ghi chú', 'Nota'],
  notePh: ['水平要求、自带球、AA 方式…', 'Level, bring balls, how to split costs…', 'Trình độ, tự mang bóng, cách chia tiền…', 'Tahap, bawa bola, cara kongsi kos…'],
  publish: ['发布活动', 'Publish', 'Đăng', 'Terbitkan'],
  publishing: ['发布中', 'Publishing', 'Đang đăng', 'Menerbitkan'],
  needEventName: ['请填写活动名称', 'Please enter a title', 'Vui lòng nhập tên buổi chơi', 'Sila masukkan tajuk'],

  // ---------- 活动详情 ----------
  courtsInfo: ['{0} 片场 · 已报名 {1}/{2}', '{0} courts · {1}/{2} signed up', '{0} sân · {1}/{2} đã đăng ký', '{0} gelanggang · {1}/{2} berdaftar'],
  waitN: ['候补 {0}', '{0} waitlisted', '{0} đang chờ', '{0} menunggu'],
  feePer: ['{0}/人', '{0} pp', '{0}/người', '{0} seorang'],
  signup: ['报名', 'Sign up', 'Đăng ký', 'Daftar'],
  joinAndSignup: ['加入俱乐部并报名', 'Join club & sign up', 'Tham gia CLB & đăng ký', 'Sertai kelab & daftar'],
  cancelSignup: ['取消报名', 'Cancel sign-up', 'Hủy đăng ký', 'Batal pendaftaran'],
  waitlistCancel: ['候补中 · 取消', 'Waitlisted · cancel', 'Đang chờ · hủy', 'Menunggu · batal'],
  manage: ['管理', 'Manage', 'Quản lý', 'Urus'],
  tabPlayers: ['报名 {0}', 'Players {0}', 'Người chơi {0}', 'Pemain {0}'],
  tabMatches: ['对阵 {0}/{1}', 'Games {0}/{1}', 'Trận {0}/{1}', 'Perlawanan {0}/{1}'],
  tabStandings: ['本场排名', 'Standings', 'Xếp hạng', 'Kedudukan'],
  noSignups: ['还没有人报名', 'No sign-ups yet', 'Chưa có ai đăng ký', 'Belum ada pendaftaran'],
  waitlist: ['候补', 'Waitlist', 'Danh sách chờ', 'Senarai menunggu'],
  waitNo: ['候补 {0}', '#{0}', 'Chờ {0}', 'Menunggu {0}'],
  generate: ['生成对阵', 'Generate games', 'Xếp trận', 'Jana perlawanan'],
  regenerate: ['重新生成对阵', 'Regenerate games', 'Xếp lại trận', 'Jana semula'],
  addOne: ['手动加一局', 'Add a game', 'Thêm trận', 'Tambah perlawanan'],
  noMatchesAdmin: ['报名结束后，点「生成对阵」自动排轮转', 'When sign-ups close, tap "Generate games" to build the rotation', 'Khi chốt danh sách, chạm "Xếp trận" để tạo lịch xoay vòng', 'Selepas pendaftaran ditutup, ketik "Jana perlawanan" untuk susun giliran'],
  noMatches: ['管理员还没有生成对阵', "The admin hasn't generated games yet", 'Quản trị viên chưa xếp trận', 'Pentadbir belum menjana perlawanan'],
  roundN: ['第 {0} 轮', 'Round {0}', 'Vòng {0}', 'Pusingan {0}'],
  roundDone: ['已完赛', 'Done', 'Đã xong', 'Selesai'],
  courtN: ['{0} 号场', 'Court {0}', 'Sân {0}', 'Gelanggang {0}'],
  predicted: ['预测 {0}', 'Pred. {0}', 'Dự đoán {0}', 'Ramalan {0}'],
  enterScore: ['录入比分', 'Enter score', 'Nhập tỉ số', 'Masukkan skor'],
  noStandings: ['还没有完赛的对局', 'No finished games yet', 'Chưa có trận nào kết thúc', 'Belum ada perlawanan selesai'],
  genTitle: ['生成对阵（{0} 人）', 'Generate games ({0} players)', 'Xếp trận ({0} người)', 'Jana perlawanan ({0} pemain)'],
  rounds: ['轮数', 'Rounds', 'Số vòng', 'Pusingan'],
  rrNote: ['循环赛的轮数由队伍数决定', 'Round-robin length depends on the number of teams', 'Số vòng đấu vòng tròn phụ thuộc vào số đội', 'Bilangan pusingan round-robin bergantung pada bilangan pasukan'],
  generateBtn: ['生成', 'Generate', 'Tạo', 'Jana'],
  generating: ['生成中', 'Generating', 'Đang tạo', 'Menjana'],
  generatedN: ['已生成 {0} 场', '{0} games created', 'Đã tạo {0} trận', '{0} perlawanan dijana'],
  regenTitle: ['重新生成', 'Regenerate', 'Tạo lại', 'Jana semula'],
  regenConfirm: ['未录入比分的对局会被替换，已完赛的保留。继续？', 'Games without scores will be replaced; finished games are kept. Continue?', 'Các trận chưa có tỉ số sẽ bị thay; trận đã xong được giữ. Tiếp tục?', 'Perlawanan tanpa skor akan diganti; yang selesai dikekalkan. Teruskan?'],
  mode_rotation: ['双打轮转', 'Doubles rotation', 'Xoay vòng đánh đôi', 'Giliran beregu'],
  mode_rotation_d: ['上场次数平均，搭档和对手尽量不重复', 'Even playing time; partners and opponents change as much as possible', 'Số trận đều nhau, hạn chế lặp lại đồng đội và đối thủ', 'Masa bermain sama rata; pasangan dan lawan sentiasa bertukar'],
  mode_balanced: ['双打均衡', 'Balanced doubles', 'Đánh đôi cân bằng', 'Beregu seimbang'],
  mode_balanced_d: ['在轮转基础上，让两队评分尽量接近', 'Rotation, plus teams with ratings as close as possible', 'Xoay vòng và cân bằng điểm giữa hai đội', 'Giliran, dengan rating pasukan sedekat mungkin'],
  mode_fixed: ['固定搭档循环', 'Fixed partners round-robin', 'Vòng tròn đồng đội cố định', 'Round-robin pasangan tetap'],
  mode_fixed_d: ['按报名顺序两两组队，队与队单循环', 'Paired in sign-up order; every team plays every other team', 'Ghép cặp theo thứ tự đăng ký; mỗi đội gặp tất cả đội khác', 'Berpasangan ikut urutan pendaftaran; setiap pasukan bertemu semua pasukan lain'],
  mode_singles: ['单打轮转', 'Singles rotation', 'Xoay vòng đánh đơn', 'Giliran perseorangan'],
  mode_singles_d: ['1v1，上场次数平均，对手尽量不重复', '1v1, even playing time, varied opponents', '1 đấu 1, số trận đều, đổi đối thủ', '1 lawan 1, masa bermain sama rata, lawan berbeza'],
  mode_singlesRR: ['单打循环', 'Singles round-robin', 'Vòng tròn đánh đơn', 'Round-robin perseorangan'],
  mode_singlesRR_d: ['每两人之间打一场', 'Everyone plays everyone once', 'Mỗi người gặp tất cả người khác một lần', 'Setiap pemain bertemu semua pemain lain sekali'],
  teamA: ['A 队', 'Team A', 'Đội A', 'Pasukan A'],
  teamB: ['B 队', 'Team B', 'Đội B', 'Pasukan B'],
  proxyTitle: ['代成员报名', 'Sign up a member', 'Đăng ký hộ thành viên', 'Daftarkan ahli'],
  allSigned: ['成员都已报名', 'All members are signed up', 'Tất cả thành viên đã đăng ký', 'Semua ahli sudah berdaftar'],
  loadingMembers: ['加载成员', 'Loading members', 'Đang tải thành viên', 'Memuatkan ahli'],
  signingUp: ['报名中', 'Signing up', 'Đang đăng ký', 'Mendaftar'],
  signedFor: ['已为{0}报名', '{0} signed up', 'Đã đăng ký cho {0}', '{0} telah didaftarkan'],
  waitlistedFor: ['{0}进入候补', '{0} waitlisted', '{0} vào danh sách chờ', '{0} dalam senarai menunggu'],
  signupOk: ['报名成功', 'Signed up', 'Đăng ký thành công', 'Berjaya mendaftar'],
  signupFull: ['已满员，进入候补', "Full — you're on the waitlist", 'Đã đủ — bạn vào danh sách chờ', 'Penuh — anda dalam senarai menunggu'],
  joiningClub: ['加入俱乐部', 'Joining club', 'Đang tham gia CLB', 'Menyertai kelab'],
  cancelConfirm: ['确定取消？候补的球友会自动递补。', 'Cancel? The next person on the waitlist moves up.', 'Hủy? Người tiếp theo trong danh sách chờ sẽ được lên.', 'Batal? Orang seterusnya dalam senarai menunggu akan dinaikkan.'],
  cancelPlayer: ['取消该球员报名', "Cancel this player's sign-up", 'Hủy đăng ký người này', 'Batalkan pendaftaran pemain ini'],
  cancelPlayerConfirm: ['取消「{0}」的报名？', "Cancel {0}'s sign-up?", 'Hủy đăng ký của {0}?', 'Batalkan pendaftaran {0}?'],
  notEnough: ['报名人数不足', 'Not enough players', 'Không đủ người chơi', 'Pemain tidak mencukupi'],
  scoreTitle: ['第 {0} 轮 · {1} 号场', 'Round {0} · Court {1}', 'Vòng {0} · Sân {1}', 'Pusingan {0} · Gelanggang {1}'],
  scoreHint: ['评分预测比分 {0}。打得比预测好就涨分，赢了但没打出预期也可能掉分。', 'Predicted score {0}. Beat it and your rating goes up; a narrow win can still cost points.', 'Tỉ số dự đoán {0}. Chơi tốt hơn dự đoán thì tăng điểm; thắng sát nút vẫn có thể bị trừ.', 'Skor ramalan {0}. Lebih baik daripada ramalan, rating naik; menang tipis masih boleh turun.'],
  updateScore: ['修改比分', 'Update score', 'Sửa tỉ số', 'Kemas kini skor'],
  fillBoth: ['请填写双方比分', 'Enter both scores', 'Nhập tỉ số của hai bên', 'Masukkan kedua-dua skor'],
  ratingChange: ['评分 {0}', 'Rating {0}', 'Điểm {0}', 'Rating {0}'],
  recorded: ['已录入', 'Saved', 'Đã lưu', 'Disimpan'],
  deleteMatchTitle: ['删除对局', 'Delete game', 'Xóa trận', 'Padam perlawanan'],
  deleteDone: ['删除后会撤销这一局对评分的影响。确定删除？', "Deleting reverses this game's rating changes. Delete?", 'Xóa sẽ hoàn tác thay đổi điểm của trận này. Xóa?', 'Memadam akan membatalkan perubahan rating perlawanan ini. Padam?'],
  deletePending: ['确定删除这一局？', 'Delete this game?', 'Xóa trận này?', 'Padam perlawanan ini?'],
  reopen: ['重新开放', 'Reopen', 'Mở lại', 'Buka semula'],
  finishEvent: ['结束活动', 'Finish session', 'Kết thúc buổi chơi', 'Tamatkan sesi'],
  deleteEvent: ['删除活动', 'Delete session', 'Xóa buổi chơi', 'Padam sesi'],
  deleteEventConfirm: ['报名和未完赛对局会一起删除。', 'Sign-ups and unplayed games will be deleted too.', 'Danh sách đăng ký và các trận chưa đấu cũng sẽ bị xóa.', 'Pendaftaran dan perlawanan belum dimain juga akan dipadam.'],
  shareEvent: ['{0} · {1} 报名中', '{0} · {1} — sign up', '{0} · {1} — đăng ký ngay', '{0} · {1} — daftar sekarang'],
  eventFallback: ['匹克球活动', 'Pickleball session', 'Buổi chơi pickleball', 'Sesi pickleball'],

  // ---------- 个人页 ----------
  tapAvatar: ['点头像可更换', 'Tap avatar to change', 'Chạm ảnh để đổi', 'Ketik avatar untuk tukar'],
  editName: ['✎ 改昵称', '✎ Edit name', '✎ Sửa tên', '✎ Tukar nama'],
  guestPlayer: ['临时球员', 'Guest player', 'Người chơi khách', 'Pemain tetamu'],
  setLevelTitle: ['设置起始水平', 'Set your starting level', 'Đặt trình độ ban đầu', 'Tetapkan tahap permulaan'],
  setLevelDesc: ['新球员默认 3.500。选一个接近你的水平，评分会更快收敛；打过比赛后就由比赛结果决定。', 'New players start at 3.500. Pick the level closest to yours so your rating settles faster; after your first game, results decide.', 'Người mới bắt đầu từ 3.500. Chọn trình độ gần nhất để điểm ổn định nhanh hơn; sau trận đầu, kết quả sẽ quyết định.', 'Pemain baharu bermula pada 3.500. Pilih tahap paling hampir supaya rating cepat stabil; selepas perlawanan pertama, keputusan yang menentukan.'],
  chooseLevel: ['选择水平（当前 {0}）', 'Choose level (now {0})', 'Chọn trình độ (hiện {0})', 'Pilih tahap (kini {0})'],
  ratingSim: ['{0}（模拟 DUPR）', '{0} (simulated DUPR)', '{0} (mô phỏng DUPR)', '{0} (DUPR simulasi)'],
  howCalc: ['怎么算的？', 'How is it calculated?', 'Tính thế nào?', 'Bagaimana dikira?'],
  games: ['场次', 'Games', 'Số trận', 'Perlawanan'],
  reliability: ['可靠度', 'Reliability', 'Độ tin cậy', 'Kebolehpercayaan'],
  chartEmpty: ['打满 2 场后显示评分走势', 'Your rating trend appears after 2 games', 'Biểu đồ điểm hiển thị sau 2 trận', 'Trend rating dipaparkan selepas 2 perlawanan'],
  recentGames: ['最近比赛', 'Recent games', 'Trận gần đây', 'Perlawanan terkini'],
  winShort: ['胜', 'W', 'T', 'M'],
  lossShort: ['负', 'L', 'B', 'K'],
  withPartner: ['与 {0} ', 'with {0} ', 'cùng {0} ', 'bersama {0} '],
  noGames: ['还没有比赛记录', 'No games yet', 'Chưa có trận nào', 'Belum ada perlawanan'],
  uploading: ['上传中', 'Uploading', 'Đang tải lên', 'Memuat naik'],
  startRatingSet: ['起始评分 {0}', 'Starting rating {0}', 'Điểm ban đầu {0}', 'Rating permulaan {0}'],
  shareProfile: ['{0} 的匹克球评分 {1}', "{0}'s pickleball rating: {1}", 'Điểm pickleball của {0}: {1}', 'Rating pickleball {0}: {1}'],
  level_2: ['刚接触，正在学规则和基本击球', 'New to the game, learning rules and basic shots', 'Mới chơi, đang học luật và cú đánh cơ bản', 'Baru bermula, belajar peraturan dan pukulan asas'],
  level_25: ['能连续对拉，开始练习发球和接发', 'Can keep short rallies going, working on serve and return', 'Đánh qua lại được, đang tập giao bóng và đỡ giao bóng', 'Boleh rali pendek, berlatih servis dan balasan'],
  level_3: ['稳定发接发，会打 dink，偶尔失误较多', 'Consistent serve and return, can dink, still makes errors', 'Giao và đỡ giao ổn định, biết dink, còn mắc lỗi', 'Servis dan balasan konsisten, boleh dink, masih kerap silap'],
  level_35: ['能控制落点，开始进攻第三拍、上网配合', 'Controls placement, uses third-shot drops, moves up with partner', 'Kiểm soát điểm rơi, dùng cú thứ ba, lên lưới phối hợp', 'Kawal penempatan, guna pukulan ketiga, naik ke jaring bersama pasangan'],
  level_4: ['稳定的 dink 对抗与重置，战术意识清晰', 'Solid dink rallies and resets, clear tactical sense', 'Dink và reset ổn định, tư duy chiến thuật rõ ràng', 'Rali dink dan reset mantap, faham taktik'],
  level_45: ['失误少，能打出变化和速度，常参加比赛', 'Few errors, mixes pace and spin, plays tournaments regularly', 'Ít lỗi, biến hóa tốc độ và xoáy, thường thi đấu giải', 'Kurang silap, variasi kelajuan dan putaran, kerap bertanding'],
  level_5: ['高水平赛事选手', 'Top tournament player', 'Tay vợt thi đấu đỉnh cao', 'Pemain kejohanan tahap tinggi'],

  // ---------- 我的（菜单页）/ 编辑资料 / 指南 ----------
  launch: ['发起', 'New', 'Tạo', 'Baharu'],
  needAdminClub: ['你还不是任何俱乐部的管理员，先创建一个俱乐部吧', "You're not an admin of any club yet — create one first", 'Bạn chưa là quản trị viên câu lạc bộ nào — hãy tạo một câu lạc bộ trước', 'Anda belum menjadi pentadbir mana-mana kelab — cipta kelab dahulu'],
  gamesCount: ['{0}场', '{0}', '{0} trận', '{0}'],
  ratingsLine: ['双打 {0} · 单打 {1}', 'Doubles {0} · Singles {1}', 'Đôi {0} · Đơn {1}', 'Beregu {0} · Perseorangan {1}'],
  umpireSingles: ['单打裁判', 'Singles umpired', 'Trọng tài đơn', 'Pengadil perseorangan'],
  umpireDoubles: ['双打裁判', 'Doubles umpired', 'Trọng tài đôi', 'Pengadil beregu'],
  finishedOnly: ['※ 以上数据统计全部已结束比赛', '※ Counts include finished games only', '※ Chỉ tính các trận đã kết thúc', '※ Hanya perlawanan yang telah tamat dikira'],
  menu_events: ['我的活动', 'My sessions', 'Buổi chơi của tôi', 'Sesi saya'],
  menu_matches: ['我的比赛', 'My games', 'Trận của tôi', 'Perlawanan saya'],
  menu_rating: ['我的评分', 'My rating', 'Điểm của tôi', 'Rating saya'],
  menu_levels: ['等级标准', 'Level guide', 'Tiêu chuẩn trình độ', 'Panduan tahap'],
  menu_formats: ['赛制介绍', 'Game formats', 'Thể thức thi đấu', 'Format permainan'],
  menu_guide: ['新手指南', 'Getting started', 'Hướng dẫn người mới', 'Panduan permulaan'],
  menu_contact: ['联系客服', 'Contact us', 'Liên hệ hỗ trợ', 'Hubungi kami'],
  menu_feedback: ['产品建议', 'Suggestions', 'Góp ý sản phẩm', 'Cadangan'],
  menu_invite: ['推荐给球友', 'Invite friends', 'Giới thiệu bạn bè', 'Jemput rakan'],
  lv_newbie: ['萌新', 'Newbie', 'Tân binh', 'Pemula'],
  lv_1: ['入门', 'Beginner', 'Cơ bản', 'Asas'],
  lv_2: ['进阶', 'Intermediate', 'Trung bình', 'Pertengahan'],
  lv_3: ['熟练', 'Skilled', 'Thành thạo', 'Mahir'],
  lv_4: ['高手', 'Advanced', 'Cao thủ', 'Lanjutan'],
  lv_5: ['大神', 'Expert', 'Chuyên gia', 'Pakar'],
  lv_intro: ['参考下面的描述自评起始水平；之后评分完全由比赛比分决定。', 'Use these descriptions to pick your starting level. After that, your rating comes only from game scores.', 'Dùng mô tả dưới đây để chọn trình độ ban đầu. Sau đó điểm chỉ dựa trên tỉ số.', 'Guna huraian ini untuk pilih tahap permulaan. Selepas itu, rating hanya bergantung pada skor perlawanan.'],
  lv_titles: ['称号', 'Titles', 'Danh hiệu', 'Gelaran'],
  lv_titles_d: ['打满 6 场前是「萌新」，之后按双打评分显示称号。', 'You are a Newbie until 6 games, then your title follows your doubles rating.', 'Bạn là Tân binh cho đến khi đủ 6 trận, sau đó danh hiệu theo điểm đánh đôi.', 'Anda Pemula sehingga 6 perlawanan, kemudian gelaran mengikut rating beregu.'],
  f_intro: ['每场活动可以用不同的对阵方式，管理员在活动页点「生成对阵」时选择。', 'Each session can use a different format. Admins pick one when they tap "Generate games".', 'Mỗi buổi chơi có thể dùng thể thức khác nhau. Quản trị viên chọn khi chạm "Xếp trận".', 'Setiap sesi boleh guna format berbeza. Pentadbir memilih semasa mengetik "Jana perlawanan".'],
  f_tip: ['推荐：8 人 2 片场用「双打轮转」打 7 轮，每个人都能和其他人各搭档一次。', 'Tip: with 8 players on 2 courts, 7 rounds of doubles rotation lets everyone partner everyone else once.', 'Mẹo: 8 người 2 sân, 7 vòng xoay vòng đánh đôi thì ai cũng được đánh cặp với mọi người một lần.', 'Tip: 8 pemain di 2 gelanggang, 7 pusingan giliran beregu membolehkan setiap orang berpasangan dengan semua orang lain sekali.'],
  g_1: ['设置起始水平：在「我的 → 编辑资料」选一个接近你的水平，评分会更快准确。', 'Set your starting level under Me → Edit profile so your rating settles faster.', 'Đặt trình độ ban đầu trong Tôi → Sửa hồ sơ để điểm ổn định nhanh hơn.', 'Tetapkan tahap permulaan di Saya → Sunting profil supaya rating cepat stabil.'],
  g_2: ['加入俱乐部：点群里的分享卡片，或在首页输入 6 位邀请码。', 'Join a club: tap the share card in your group chat, or enter the 6-character invite code on Home.', 'Tham gia câu lạc bộ: chạm vào thẻ chia sẻ trong nhóm, hoặc nhập mã mời 6 ký tự ở Trang chủ.', 'Sertai kelab: ketik kad kongsi dalam kumpulan, atau masukkan kod jemputan 6 aksara di Utama.'],
  g_3: ['报名活动：满员后自动进入候补，有人取消会自动递补。', 'Sign up for sessions. When a session is full you join the waitlist and move up automatically if someone cancels.', 'Đăng ký buổi chơi. Khi đủ người bạn vào danh sách chờ và tự động được lên khi có người hủy.', 'Daftar sesi. Jika penuh anda masuk senarai menunggu dan dinaikkan secara automatik jika ada yang batal.'],
  g_4: ['打比赛：管理员生成对阵后，在「对阵」里找到你的场次；打完由场上任意一位球员录入比分。', 'Play: once the admin generates games, find yours under Games. After each game, any player on court enters the score.', 'Thi đấu: khi quản trị viên xếp trận, tìm trận của bạn trong mục Trận. Đánh xong, bất kỳ người chơi nào trên sân nhập tỉ số.', 'Bermain: selepas pentadbir menjana perlawanan, cari perlawanan anda di bahagian Perlawanan. Selepas tamat, mana-mana pemain di gelanggang memasukkan skor.'],
  g_5: ['看成绩：评分变化马上显示；俱乐部积分榜和你的评分走势随时可以查看。', 'See results: rating changes show immediately, and you can check the club leaderboard and your rating trend anytime.', 'Xem kết quả: thay đổi điểm hiện ngay; xem bảng xếp hạng câu lạc bộ và biểu đồ điểm bất cứ lúc nào.', 'Lihat keputusan: perubahan rating dipaparkan serta-merta; semak papan mata kelab dan trend rating anda bila-bila masa.'],
  g_admin: ['管理员：底部「发起」可以发布活动；活动页「管理」可以代报名、结束活动；成员页可以添加没有微信的临时球员。', 'Admins: tap New at the bottom to post a session. Use Manage on a session to sign people up or finish it, and add guest players without WeChat on the Members tab.', 'Quản trị viên: chạm Tạo ở dưới để đăng buổi chơi. Dùng Quản lý để đăng ký hộ hoặc kết thúc, và thêm người chơi khách không có WeChat ở mục Thành viên.', 'Pentadbir: ketik Baharu di bawah untuk siarkan sesi. Guna Urus untuk daftarkan ahli atau tamatkan sesi, dan tambah pemain tetamu tanpa WeChat di tab Ahli.'],
  g_adminTitle: ['给管理员', 'For admins', 'Dành cho quản trị viên', 'Untuk pentadbir'],
  editProfile: ['编辑资料', 'Edit profile', 'Sửa hồ sơ', 'Sunting profil'],
  avatar: ['头像', 'Avatar', 'Ảnh đại diện', 'Avatar'],
  changeAvatar: ['更换头像', 'Change avatar', 'Đổi ảnh', 'Tukar avatar'],
  nickname: ['昵称', 'Name', 'Tên', 'Nama'],
  nicknamePh: ['输入昵称', 'Your name', 'Nhập tên', 'Nama anda'],
  gender: ['性别', 'Gender', 'Giới tính', 'Jantina'],
  gender_: ['不设置', 'Not set', 'Không đặt', 'Tidak ditetapkan'],
  gender_m: ['男', 'Male', 'Nam', 'Lelaki'],
  gender_f: ['女', 'Female', 'Nữ', 'Perempuan'],
  saved: ['已保存', 'Saved', 'Đã lưu', 'Disimpan'],
  noMyEvents: ['还没有报名过活动', "You haven't signed up for any sessions yet", 'Bạn chưa đăng ký buổi chơi nào', 'Anda belum mendaftar mana-mana sesi'],
  upNext: ['待开赛', 'Up next', 'Sắp đấu', 'Akan datang'],
  finishedGames: ['已完赛', 'Finished', 'Đã xong', 'Selesai'],
  loadMore: ['加载更多', 'Load more', 'Tải thêm', 'Muat lagi'],
  rec_singles: ['我的单打胜率', 'My singles record', 'Thành tích đánh đơn', 'Rekod perseorangan saya'],
  rec_doubles: ['我的双打胜率', 'My doubles record', 'Thành tích đánh đôi', 'Rekod beregu saya'],
  rec_umpSingles: ['单打裁判记录', 'Singles I umpired', 'Trận đơn tôi làm trọng tài', 'Perseorangan yang saya adili'],
  rec_umpDoubles: ['双打裁判记录', 'Doubles I umpired', 'Trận đôi tôi làm trọng tài', 'Beregu yang saya adili'],
  f_last: ['近{0}次', 'Last {0}', '{0} trận gần nhất', '{0} terakhir'],
  f_halfMonth: ['近半月', '15 days', '15 ngày', '15 hari'],
  f_custom: ['自定义', 'Custom', 'Tùy chọn', 'Tersuai'],
  dateFrom: ['开始', 'From', 'Từ', 'Dari'],
  dateTo: ['结束', 'To', 'Đến', 'Hingga'],
  ratingChangeLabel: ['评分变化', 'Rating change', 'Thay đổi điểm', 'Perubahan rating'],
  umpiredN: ['共裁判 {0} 场', '{0} games umpired', 'Đã làm trọng tài {0} trận', '{0} perlawanan diadili'],
  err_nameChangeLimit: ['30 天内只能修改一次昵称，{date} 后可再修改', 'You can change your name once every 30 days. Next change: {date}', 'Bạn chỉ đổi tên được một lần mỗi 30 ngày. Lần đổi tiếp theo: {date}', 'Anda boleh menukar nama sekali setiap 30 hari. Seterusnya: {date}'],
  err_avatarChangeLimit: ['30 天内只能修改一次头像，{date} 后可再修改', 'You can change your avatar once every 30 days. Next change: {date}', 'Bạn chỉ đổi ảnh đại diện được một lần mỗi 30 ngày. Lần đổi tiếp theo: {date}', 'Anda boleh menukar avatar sekali setiap 30 hari. Seterusnya: {date}'],
  nextChangeHint: ['{0} 后可再修改', 'Next change: {0}', 'Lần đổi tiếp theo: {0}', 'Seterusnya: {0}'],
  changeRuleHint: ['昵称和头像 30 天内各可修改一次，首次设置不计入。', 'You can change your name and avatar once every 30 days each. Your first setup does not count.', 'Tên và ảnh đại diện mỗi thứ được đổi một lần mỗi 30 ngày. Lần thiết lập đầu tiên không tính.', 'Nama dan avatar masing-masing boleh ditukar sekali setiap 30 hari. Tetapan pertama tidak dikira.'],
  err_invalidGender: ['无效的性别', 'Invalid gender', 'Giới tính không hợp lệ', 'Jantina tidak sah'],

  // ---------- 规则页 ----------
  r_nav: ['评分与积分规则', 'Rating & points rules', 'Quy tắc điểm', 'Peraturan rating & mata'],
  r_t1: ['模拟 DUPR 评分', 'Simulated DUPR rating', 'Điểm DUPR mô phỏng', 'Rating DUPR simulasi'],
  r_p1: ['评分范围 2.000 – 8.000，双打、单打分开计算。新球员默认 3.500，也可以在「我的」里选一个起始水平（只能在打第一场前设置）。', 'Ratings run from 2.000 to 8.000, with doubles and singles tracked separately. New players start at 3.500, or can pick a starting level under "Me" (only before their first game).', 'Điểm từ 2.000 đến 8.000, đánh đôi và đánh đơn tính riêng. Người mới bắt đầu từ 3.500, hoặc chọn trình độ ban đầu trong mục "Tôi" (chỉ trước trận đầu tiên).', 'Rating antara 2.000 hingga 8.000, beregu dan perseorangan dikira berasingan. Pemain baharu bermula pada 3.500, atau boleh pilih tahap permulaan di "Saya" (hanya sebelum perlawanan pertama).'],
  r_p2: ['和 DUPR 一样，评分看比分，不只看输赢：', 'Like DUPR, ratings use the score, not just the win or loss:', 'Giống DUPR, điểm dựa trên tỉ số chứ không chỉ thắng thua:', 'Seperti DUPR, rating berdasarkan skor, bukan sekadar menang atau kalah:'],
  r_f1: ['期望得分率 E = 1 ÷ (1 + 10^(−评分差 ÷ 2.8))', 'Expected share E = 1 ÷ (1 + 10^(−rating gap ÷ 2.8))', 'Tỉ lệ kỳ vọng E = 1 ÷ (1 + 10^(−chênh lệch ÷ 2.8))', 'Bahagian dijangka E = 1 ÷ (1 + 10^(−beza rating ÷ 2.8))'],
  r_f2: ['实际得分率 A = 本方得分 ÷ 总分', 'Actual share A = your points ÷ total points', 'Tỉ lệ thực tế A = điểm của bạn ÷ tổng điểm', 'Bahagian sebenar A = mata anda ÷ jumlah mata'],
  r_f3: ['评分变化 = K × 局长系数 × (A − E)', 'Rating change = K × length factor × (A − E)', 'Thay đổi điểm = K × hệ số độ dài × (A − E)', 'Perubahan rating = K × faktor panjang × (A − E)'],
  r_p3: ['双打用两人平均分作为队伍评分，两位搭档按各自的 K 值变化。', "In doubles the team rating is the partners' average; each partner moves by their own K.", 'Đánh đôi lấy điểm trung bình hai người làm điểm đội; mỗi người thay đổi theo hệ số K riêng.', 'Dalam beregu, rating pasukan ialah purata kedua-dua pemain; setiap pemain berubah mengikut K masing-masing.'],
  r_t2: ['评分差与预测比分', 'Rating gap vs predicted score', 'Chênh lệch điểm và tỉ số dự đoán', 'Beza rating dan skor ramalan'],
  r_colGap: ['评分差', 'Gap', 'Chênh lệch', 'Beza'],
  r_colShare: ['期望得分率', 'Expected', 'Kỳ vọng', 'Dijangka'],
  r_colScore: ['预测比分', 'Predicted', 'Dự đoán', 'Ramalan'],
  r_p4: ['打得比预测好就涨分，否则掉分。所以强队 11:9 险胜弱队也可能掉分，弱队 9:11 惜败也可能涨分。', 'Beat the prediction and you go up; fall short and you go down. So a stronger team can lose rating winning 11–9, and a weaker team can gain losing 9–11.', 'Chơi tốt hơn dự đoán thì tăng, kém hơn thì giảm. Vì vậy đội mạnh thắng sát 11–9 vẫn có thể bị trừ, đội yếu thua 9–11 vẫn có thể được cộng.', 'Lebih baik daripada ramalan, rating naik; kurang, rating turun. Jadi pasukan kuat yang menang tipis 11–9 boleh turun, dan pasukan lemah yang kalah 9–11 boleh naik.'],
  r_t3: ['可靠度与 K 值', 'Reliability and K', 'Độ tin cậy và hệ số K', 'Kebolehpercayaan dan K'],
  r_p5: ['可靠度 = 已打场次 ÷ 20（封顶 100%）。K 值从 0.50（新球员）线性降到 0.12（可靠度 100%）：新球员几场就能找到自己的位置，老球员评分更稳定。打满 6 场前评分标注「暂定」。', 'Reliability = games played ÷ 20 (max 100%). K falls steadily from 0.50 (new) to 0.12 (100% reliable): new players find their level within a few games, regulars stay stable. Ratings are marked "provisional" until 6 games.', 'Độ tin cậy = số trận ÷ 20 (tối đa 100%). K giảm dần từ 0.50 (người mới) xuống 0.12 (tin cậy 100%): người mới nhanh chóng tìm đúng trình độ, người chơi lâu năm ổn định hơn. Điểm được ghi "tạm tính" cho đến khi đủ 6 trận.', 'Kebolehpercayaan = perlawanan dimain ÷ 20 (maksimum 100%). K menurun daripada 0.50 (baharu) ke 0.12 (100%): pemain baharu cepat menemui tahap mereka, pemain tetap lebih stabil. Rating ditanda "sementara" sehingga 6 perlawanan.'],
  r_p6: ['局长系数 = 总得分 ÷ 18，限制在 0.5–1.25：15 分、21 分的长局权重更高，短局更低。', 'Length factor = total points ÷ 18, kept within 0.5–1.25: games to 15 or 21 count more, short games less.', 'Hệ số độ dài = tổng điểm ÷ 18, giới hạn 0.5–1.25: ván 15 hoặc 21 điểm có trọng số cao hơn, ván ngắn thấp hơn.', 'Faktor panjang = jumlah mata ÷ 18, dihadkan 0.5–1.25: permainan hingga 15 atau 21 dikira lebih, permainan pendek kurang.'],
  r_t4: ['俱乐部积分榜', 'Club leaderboard', 'Bảng xếp hạng câu lạc bộ', 'Papan mata kelab'],
  r_p7: ['积分 = 胜场 × 胜场分 + 负场 × 负场分（默认 3 分 / 1 分，管理员可在俱乐部设置里改）。同积分依次比较胜率、净胜分、场次。可按近 7 天、近 30 天、全部查看。', 'Points = wins × win points + losses × loss points (default 3 / 1; admins can change this in club settings). Ties go to win %, point difference, then games played. View the last 7 days, 30 days or all time.', 'Điểm = số trận thắng × điểm thắng + số trận thua × điểm thua (mặc định 3 / 1, quản trị viên có thể đổi trong cài đặt CLB). Bằng điểm thì xét tỉ lệ thắng, hiệu số, rồi số trận. Xem theo 7 ngày, 30 ngày hoặc tất cả.', 'Mata = menang × mata menang + kalah × mata kalah (lalai 3 / 1; pentadbir boleh ubah dalam tetapan kelab). Seri ikut % menang, beza mata, kemudian bilangan perlawanan. Lihat 7 hari, 30 hari atau semua.'],
  r_t5: ['修改与删除比分', 'Editing and deleting scores', 'Sửa và xóa tỉ số', 'Menyunting dan memadam skor'],
  r_p8: ['本场球员或管理员可以录入比分；录入后只有管理员能修改或删除。修改、删除时会先撤销这一局的评分变化再重新计算。', "Players in the game or an admin can enter the score; after that only an admin can edit or delete it. Edits and deletions first reverse that game's rating changes, then recalculate.", 'Người chơi trong trận hoặc quản trị viên có thể nhập tỉ số; sau đó chỉ quản trị viên được sửa hoặc xóa. Khi sửa hoặc xóa, thay đổi điểm của trận đó được hoàn tác rồi tính lại.', 'Pemain perlawanan atau pentadbir boleh masukkan skor; selepas itu hanya pentadbir boleh sunting atau padam. Suntingan dan pemadaman membatalkan perubahan rating perlawanan itu dahulu, kemudian dikira semula.'],
  r_disclaimer: ['说明：本评分是参考 DUPR 公开原则的模拟实现，与 DUPR 官方评分无关联，结果仅供俱乐部内部参考。', 'Note: this is a simulation based on the principles DUPR has published. It is not affiliated with DUPR and is for club use only.', 'Lưu ý: đây là mô phỏng dựa trên các nguyên tắc DUPR đã công bố, không liên kết với DUPR và chỉ dùng trong câu lạc bộ.', 'Nota: ini simulasi berdasarkan prinsip yang diterbitkan oleh DUPR. Ia tidak bergabung dengan DUPR dan hanya untuk kegunaan kelab.'],

  // ---------- 后端错误代码 ----------
  err_notLoggedIn: ['请先登录', 'Please log in first', 'Vui lòng đăng nhập', 'Sila log masuk dahulu'],
  err_invalidLevel: ['无效的水平', 'Invalid level', 'Trình độ không hợp lệ', 'Tahap tidak sah'],
  err_levelLocked: ['已有比赛记录，评分由比赛结果决定', "You've already played — your rating now comes from results", 'Bạn đã có trận đấu — điểm được tính theo kết quả', 'Anda sudah bermain — rating kini ditentukan oleh keputusan'],
  err_playerNotFound: ['球员不存在', 'Player not found', 'Không tìm thấy người chơi', 'Pemain tidak dijumpai'],
  err_eventNotFound: ['活动不存在', 'Session not found', 'Không tìm thấy buổi chơi', 'Sesi tidak dijumpai'],
  err_endBeforeStart: ['结束时间须晚于开始时间', 'End time must be after start time', 'Giờ kết thúc phải sau giờ bắt đầu', 'Masa tamat mesti selepas masa mula'],
  err_invalidStatus: ['无效状态', 'Invalid status', 'Trạng thái không hợp lệ', 'Status tidak sah'],
  err_eventHasResults: ['已有完赛记录的活动不能删除，可将其标记为已结束', "Sessions with results can't be deleted — mark it finished instead", 'Không thể xóa buổi chơi đã có kết quả — hãy đánh dấu kết thúc', 'Sesi yang ada keputusan tidak boleh dipadam — tandakan sebagai tamat'],
  err_eventFinished: ['活动已结束', 'This session has finished', 'Buổi chơi đã kết thúc', 'Sesi ini telah tamat'],
  err_notClubMember: ['该球员不是俱乐部成员', "That player isn't a club member", 'Người này không phải thành viên câu lạc bộ', 'Pemain itu bukan ahli kelab'],
  err_invalidMode: ['无效的对阵模式', 'Invalid pairing mode', 'Chế độ xếp trận không hợp lệ', 'Mod pasangan tidak sah'],
  err_fixedNeedsEven: ['固定搭档需要偶数名球员（按报名顺序两两组队）', 'Fixed partners need an even number of players (paired in sign-up order)', 'Đồng đội cố định cần số người chẵn (ghép theo thứ tự đăng ký)', 'Pasangan tetap perlukan bilangan pemain genap (ikut urutan pendaftaran)'],
  err_selectPlayers: ['请选择球员', 'Please choose players', 'Vui lòng chọn người chơi', 'Sila pilih pemain'],
  err_teamSize: ['仅支持单打 1v1 或双打 2v2', 'Only 1v1 singles or 2v2 doubles', 'Chỉ hỗ trợ đơn 1v1 hoặc đôi 2v2', 'Hanya 1v1 perseorangan atau 2v2 beregu'],
  err_duplicatePlayer: ['同一名球员不能重复出现', "A player can't appear twice", 'Một người không thể xuất hiện hai lần', 'Pemain tidak boleh muncul dua kali'],
  err_matchNotFound: ['对局不存在', 'Game not found', 'Không tìm thấy trận', 'Perlawanan tidak dijumpai'],
  err_scorePermission: ['只有本场球员或管理员可以录入比分', 'Only players in this game or an admin can enter the score', 'Chỉ người chơi trong trận hoặc quản trị viên mới được nhập tỉ số', 'Hanya pemain perlawanan ini atau pentadbir boleh masukkan skor'],
  err_scoreLocked: ['比分已录入，如需修改请联系管理员', 'Score already entered — ask an admin to change it', 'Tỉ số đã nhập — liên hệ quản trị viên để sửa', 'Skor sudah dimasukkan — minta pentadbir untuk ubah'],
  err_needAdmin: ['需要俱乐部管理员权限', 'Club admins only', 'Chỉ dành cho quản trị viên', 'Pentadbir kelab sahaja'],
  err_joinFirst: ['请先加入俱乐部', 'Join the club first', 'Hãy tham gia câu lạc bộ trước', 'Sertai kelab dahulu'],
  err_clubLimit: ['每人最多创建 10 个俱乐部', 'You can create up to 10 clubs', 'Mỗi người tạo tối đa 10 câu lạc bộ', 'Anda boleh cipta maksimum 10 kelab'],
  err_clubNotFound: ['俱乐部不存在', 'Club not found', 'Không tìm thấy câu lạc bộ', 'Kelab tidak dijumpai'],
  err_badInviteCode: ['邀请码无效', 'Invalid invite code', 'Mã mời không hợp lệ', 'Kod jemputan tidak sah'],
  err_ownerCannotLeave: ['创建者不能退出俱乐部', "The owner can't leave the club", 'Người tạo không thể rời câu lạc bộ', 'Pemilik tidak boleh keluar kelab'],
  err_ownerOnly: ['只有创建者可以设置管理员', 'Only the owner can set admins', 'Chỉ người tạo mới đặt được quản trị viên', 'Hanya pemilik boleh tetapkan pentadbir'],
  err_invalidRole: ['无效角色', 'Invalid role', 'Vai trò không hợp lệ', 'Peranan tidak sah'],
  err_cannotModifyMember: ['无法修改该成员', "Can't change this member", 'Không thể thay đổi thành viên này', 'Tidak boleh ubah ahli ini'],
  err_cannotRemoveMember: ['无法移除该成员', "Can't remove this member", 'Không thể xóa thành viên này', 'Tidak boleh keluarkan ahli ini'],
  err_invalidCurrency: ['无效币种', 'Invalid currency', 'Tiền tệ không hợp lệ', 'Mata wang tidak sah'],
  err_scoreRange: ['比分须为 0–99 的整数', 'Scores must be whole numbers 0–99', 'Tỉ số phải là số nguyên 0–99', 'Skor mesti nombor bulat 0–99'],
  err_scoreTie: ['比分不能打平', "Scores can't be tied", 'Tỉ số không được hòa', 'Skor tidak boleh seri'],
  err_teamMismatch: ['双方人数不一致', 'Teams must be the same size', 'Hai đội phải cùng số người', 'Saiz pasukan mesti sama'],
  err_needPlayers: ['至少需要 {n} 名球员', 'Need at least {n} players', 'Cần ít nhất {n} người chơi', 'Perlu sekurang-kurangnya {n} pemain'],
  err_needTeams: ['至少需要 2 支队伍', 'Need at least 2 teams', 'Cần ít nhất 2 đội', 'Perlu sekurang-kurangnya 2 pasukan'],
  err_required: ['请填写{field}', 'Please enter {field}', 'Vui lòng nhập {field}', 'Sila masukkan {field}'],
  err_tooLong: ['{field}最多 {max} 个字', '{field}: max {max} characters', '{field}: tối đa {max} ký tự', '{field}: maksimum {max} aksara'],
  err_intRange: ['{field}须为 {lo}–{hi} 的整数', '{field} must be a whole number {lo}–{hi}', '{field} phải là số nguyên {lo}–{hi}', '{field} mesti nombor bulat {lo}–{hi}'],
  err_unknownAction: ['未知操作', 'Unknown action', 'Thao tác không xác định', 'Tindakan tidak diketahui'],
  err_serverError: ['服务器错误', 'Server error', 'Lỗi máy chủ', 'Ralat pelayan'],

  // 错误里引用的字段名
  f_nickName: ['昵称', 'a name', 'tên', 'nama'],
  f_avatar: ['头像', 'avatar', 'ảnh đại diện', 'avatar'],
  f_title: ['活动名称', 'a title', 'tên buổi chơi', 'tajuk'],
  f_location: ['地点', 'Venue', 'Địa điểm', 'Lokasi'],
  f_note: ['备注', 'Notes', 'Ghi chú', 'Nota'],
  f_startTime: ['开始时间', 'Start time', 'Giờ bắt đầu', 'Masa mula'],
  f_endTime: ['结束时间', 'End time', 'Giờ kết thúc', 'Masa tamat'],
  f_courts: ['场地数', 'Courts', 'Số sân', 'Gelanggang'],
  f_capacity: ['人数上限', 'Max players', 'Số người tối đa', 'Pemain maksimum'],
  f_fee: ['费用', 'Fee', 'Phí', 'Yuran'],
  f_rounds: ['轮数', 'Rounds', 'Số vòng', 'Pusingan'],
  f_round: ['轮次', 'Round', 'Vòng', 'Pusingan'],
  f_court: ['场地', 'Court', 'Sân', 'Gelanggang'],
  f_clubName: ['俱乐部名称', 'a club name', 'tên câu lạc bộ', 'nama kelab'],
  f_intro: ['简介', 'About', 'Giới thiệu', 'Tentang'],
  f_city: ['城市', 'City', 'Thành phố', 'Bandar'],
  f_winPoints: ['胜场积分', 'Points per win', 'Điểm mỗi trận thắng', 'Mata setiap menang'],
  f_lossPoints: ['负场积分', 'Points per loss', 'Điểm mỗi trận thua', 'Mata setiap kalah'],
  f_name: ['姓名', 'a name', 'tên', 'nama'],
};

const WEEK = {
  zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  ms: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
};

let current = null;
const cache = {};

function detect() {
  let sys = '';
  try {
    sys = (wx.getAppBaseInfo ? wx.getAppBaseInfo() : wx.getSystemInfoSync()).language || '';
  } catch (e) {}
  sys = sys.toLowerCase();
  if (sys.indexOf('zh') === 0) return 'zh';
  if (sys.indexOf('vi') === 0) return 'vi';
  if (sys.indexOf('ms') === 0) return 'ms';
  return 'en';
}

function getLang() {
  if (current) return current;
  let saved = '';
  try {
    saved = wx.getStorageSync(STORAGE_KEY);
  } catch (e) {}
  current = LANGS.indexOf(saved) >= 0 ? saved : detect();
  return current;
}

function setLang(lang) {
  if (LANGS.indexOf(lang) < 0) return;
  current = lang;
  try {
    wx.setStorageSync(STORAGE_KEY, lang);
  } catch (e) {}
}

// 当前语言的整本词典（给 WXML 用：{{t.key}}）
function dict(lang) {
  const l = lang || getLang();
  if (!cache[l]) {
    const i = LANGS.indexOf(l);
    const d = {};
    Object.keys(L).forEach((k) => (d[k] = L[k][i] || L[k][1]));
    cache[l] = d;
  }
  return cache[l];
}

function format(s, args) {
  if (args.length === 1 && args[0] && typeof args[0] === 'object') {
    const o = args[0];
    return s.replace(/\{(\w+)\}/g, (m, k) => (o[k] == null ? m : o[k]));
  }
  return s.replace(/\{(\d+)\}/g, (m, k) => (args[k] == null ? m : args[k]));
}

function t(key, ...args) {
  const s = dict()[key];
  if (s == null) return key;
  return args.length ? format(s, args) : s;
}

// 后端错误代码 → 文案；不认识的（如数据库原始报错）原样显示
// 日期：中文 12月21日，其他语言 21/12
function dayMonth(ts) {
  const dt = new Date(ts);
  return getLang() === 'zh' ? `${dt.getMonth() + 1}月${dt.getDate()}日` : `${dt.getDate()}/${dt.getMonth() + 1}`;
}

function errMsg(code, params) {
  const d = dict();
  const s = d['err_' + code];
  if (!s) return code;
  const p = Object.assign({}, params);
  if (p.field) p.field = d['f_' + p.field] || p.field;
  if (p.at) p.date = dayMonth(p.at);
  return format(s, [p]);
}

function weekday(day) {
  return WEEK[getLang()][day];
}

// 原生 tab 栏文字：在 tab 页 onShow 里调用
function applyTabBar() {
  const d = dict();
  [d.tabHome, d.tabMe].forEach((text, index) => wx.setTabBarItem({ index, text, fail() {} }));
}

// 自定义 tab 栏（custom-tab-bar）：在 tab 页 onShow 里调用，同步选中项和语言
function syncTabBar(page, selected) {
  const bar = typeof page.getTabBar === 'function' && page.getTabBar();
  if (bar) bar.setData({ selected, t: dict() });
}

// 称号：打满 6 场前是萌新，之后按双打评分
function levelTitle(doubles) {
  if (!doubles || doubles.games < 6) return t('lv_newbie');
  const r = doubles.rating;
  return t(r >= 4.5 ? 'lv_5' : r >= 4.0 ? 'lv_4' : r >= 3.5 ? 'lv_3' : r >= 3.0 ? 'lv_2' : 'lv_1');
}

module.exports = { dayMonth, levelTitle, LANGS, LANG_NAMES, getLang, setLang, dict, t, errMsg, weekday, applyTabBar, syncTabBar, format };
