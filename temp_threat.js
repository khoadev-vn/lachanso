const GAMBLING_DOMAINS = new Set([
"sunwin.com", "sunwin.vn", "sunwin-app.com", "sunwin.qa", "sunwin.co", "sunwin.io",
"sunwin.gg", "sunwin.app", "sunwin.pro", "sunwin.live", "sunwin-vip.com",
"sunwins.com", "sunwin-play.com", "play-sunwin.com", "sunwin888.com",
"vin777.com", "vin777.vn", "vin777.co", "vin777.io", "vin777.app",
"vinwin.com", "vinwin777.com",
"iwin.com", "iwin.vn", "iwin.app", "iwin.live", "iwin-vip.com",
"iwin888.com", "playiwin.com",
"f8bet.com", "f8bet.vn", "f8bet.app", "f8bet.live", "f8bet.pro",
"f8bet888.com",
"fun88.com", "fun88.vn", "fun88asia.com", "fun88.app", "fun88.co",
"fun88.live", "fun888.com", "fun88thai.com",
"188bet.com", "188bet.vn", "188bet.app", "188bet.live", "bet188.com",
"12play.com", "12play.vn", "12play.app", "12play.live",
"w88.com", "w88.vn", "w88.app", "w88.live", "w88.co", "w88.pro",
"w88thai.com", "w88asia.com",
"ae888.com", "ae888.vn", "ae888.app", "ae888.live",
"sands.vn", "sands88.vn", "kingbet.vn", "bet88.com", "bet88.vn",
"casino.com", "online-casino.vn", "ca-do.com", "casino.vn",
"betfair.com", "bet365.com", "ladbrokes.com", "betfred.com",
"williamhill.com", "betvictor.com", "paddy-power.com", "bwin.com",
"dafabet.com", "maxbet.com", "188188.com", "live-casino.com"]
);

const GAMBLING_KEYWORDS = [
"bet", "sunwin", "f8bet", "f88", "fun88", "w88", "win88", "vin777", "iwin",
"188bet", "12play", "ae888", "sands", "kingbet", "casino", "keonhacai",
"cadobongda", "nhacai", "bong88", "bwin", "dafabet"];


function isGamblingDomainInput(input) {
  const trimmed = input.trim();
  if (!trimmed) return false;

  let host = trimmed.toLowerCase().replace(/^www\./, "");
  let normalizedInput = trimmed.toLowerCase();

  try {
    const parsedUrl = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`);
    host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    normalizedInput = `${host}${parsedUrl.pathname}${parsedUrl.search}`.toLowerCase();
  } catch {
    host = host.split(/[/?#\s]/)[0];
    normalizedInput = trimmed.toLowerCase();
  }

  const domainMatched = Array.from(GAMBLING_DOMAINS).some((domain) => host === domain || host.endsWith(`.${domain}`));
  if (domainMatched) return true;

  return GAMBLING_KEYWORDS.some((keyword) => {
    const compactKeyword = keyword.toLowerCase();
    return host.includes(compactKeyword) || normalizedInput.includes(compactKeyword);
  });
}

const ALL_KEYWORD_GROUPS = [
{
  id: "KG_PANIC",
  name: "Ngôn ngữ gây hoảng loạn",
  description: "Từ khóa kích hoạt cảm xúc sợ hãi để đẩy hành động nhanh",
  weight: 35,
  bonusIfCombined: ["KG_AUTHORITY", "KG_FINANCIAL"],
  keywords: [
  "khẩn cấp", "ngay lập tức", "ngay bây giờ", "ngay tức thì",
  "trong hôm nay", "hôm nay thôi", "chỉ còn vài giờ", "hết hạn ngay",
  "thông báo khẩn", "cảnh báo khẩn", "tin nóng", "tin gấp",
  "bị phong tỏa", "tài khoản bị khóa", "bị đình chỉ", "bị vô hiệu hóa",
  "bị khởi tố", "bị bắt giữ", "lệnh bắt", "truy nã", "bị tạm giam",
  "bị phạt nặng", "bị xử lý hình sự", "vi phạm nghiêm trọng",
  "sẽ bị mất", "mất tất cả", "không còn cơ hội",
  "sốc", "kinh hoàng", "rúng động", "bàng hoàng", "choáng váng",
  "không thể tin nổi", "chấn động", "gây sốt", "làm dậy sóng",
  "cả nước xôn xao", "mạng xã hội nổi sóng", "cộng đồng phẫn nộ",
  "chia sẻ ngay", "lan truyền gấp", "báo cho người thân", "cảnh báo bạn bè",
  "đừng để muộn", "kẻo hối hận", "cứu lấy",
  "bắt cóc trẻ em", "bắt cóc lấy nội tạng", "lấy nội tạng", "mổ cướp nội tạng"]

},
{
  id: "KG_AUTHORITY",
  name: "Mạo danh uy quyền",
  description: "Từ khóa giả mạo cơ quan nhà nước, tổ chức lớn (Chỉ phạt nặng nếu đi kèm Phishing/Tài chính)",
  weight: 10,
  bonusIfCombined: ["KG_FINANCIAL", "KG_PERSONAL_INFO", "KG_PHISHING", "KG_PANIC"],
  keywords: [
  "cục an ninh mạng", "a05", "pcc05", "cảnh sát kinh tế",
  "cục phòng chống tội phạm công nghệ cao", "bộ công an thông báo",
  "cảnh sát điều tra", "điều tra viên", "cán bộ điều tra",
  "ủy ban nhân dân", "ubnd thông báo", "cổng dịch vụ công",
  "bộ tài chính thông báo", "bộ thông tin truyền thông",
  "thủ tướng chính phủ chỉ đạo", "nghị định mới nhất",
  "văn bản số", "quyết định số", "thông tư số",
  "viện kiểm sát", "tòa án nhân dân", "quy kết tội danh",
  "lệnh triệu tập", "lệnh khám xét", "lệnh phong tỏa tài sản",
  "thi hành án", "bản án", "phán quyết",
  "ngân hàng nhà nước thông báo", "thống đốc ngân hàng",
  "cục thanh tra giám sát ngân hàng",
  "interpol thông báo", "fbi cảnh báo", "fbi việt nam",
  "tổ chức y tế thế giới cảnh báo mới",
  "đại tá", "thiếu tướng", "thứ trưởng", "cục trưởng", "vụ trưởng",
  "thanh tra chính phủ", "kiểm toán nhà nước phát hiện"]

},
{
  id: "KG_FINANCIAL",
  name: "Tài chính lừa đảo",
  description: "Từ khóa dụ dỗ tài chính, hứa hẹn lợi nhuận phi thực tế",
  weight: 35,
  bonusIfCombined: ["KG_PANIC", "KG_PERSONAL_INFO"],
  keywords: [
  "lợi nhuận 300%", "lợi nhuận 500%", "x2 tài khoản", "x3 tài khoản",
  "double tiền", "sinh lời hàng ngày", "thu nhập thụ động",
  "bao lãi", "đảm bảo lợi nhuận", "không bao giờ lỗ",
  "chiến lược bí mật", "bí kíp làm giàu", "công thức triệu phú",
  "vay không cần thế chấp", "vay không cần lịch sử tín dụng",
  "giải ngân trong 5 phút", "giải ngân ngay hôm nay",
  "vay tín chấp nhanh", "hỗ trợ vay xấu nợ", "vay qua app",
  "tín dụng đen", "lãi suất 0%", "cho vay ưu đãi",
  "chúc mừng trúng thưởng", "bạn đã may mắn", "giải jackpot",
  "giải đặc biệt", "phần thưởng tri ân", "bốc thăm may mắn",
  "khách hàng may mắn", "người dùng thứ triệu",
  "làm giàu online", "kiếm tiền tại nhà", "việc nhẹ lương cao",
  "thu nhập 20 triệu/tháng", "làm online không cần vốn",
  "cộng tác viên online", "đại lý phân phối độc quyền",
  "kiếm tiền từ điện thoại", "nhiệm vụ kiếm tiền",
  "đầu tư crypto lãi cao", "coin mới sắp lên sàn",
  "tiền điện tử miễn phí", "airdrop độc quyền", "mining miễn phí",
  "ví crypto bị đóng băng", "lấy lại ví bitcoin"]

},
{
  id: "KG_PERSONAL_INFO",
  name: "Yêu cầu thông tin cá nhân",
  description: "Từ khóa chiếm đoạt thông tin nhạy cảm cá nhân",
  weight: 60,
  bonusIfCombined: ["KG_AUTHORITY"],
  keywords: [
  "nhập mật khẩu", "mã otp", "mã xác thực", "mã pin",
  "số thẻ tín dụng", "số cvv", "ngày hết hạn thẻ",
  "số tài khoản ngân hàng", "cung cấp otp", "gửi otp ngay",
  "xác thực 2 bước", "đăng nhập để xác minh",
  "chụp 2 mặt cccd", "gửi ảnh căn cước", "ảnh hộ chiếu",
  "ảnh chứng minh nhân dân", "số định danh cá nhân",
  "thông tin sinh trắc học", "quét vân tay online",
  "nhận diện khuôn mặt online", "selfie với cccd",
  "tên đăng nhập facebook", "mật khẩu zalo", "email đăng nhập",
  "cấp quyền truy cập", "ủy quyền tài khoản",
  "mã số bảo hiểm y tế", "số thẻ bhyt", "mã bệnh nhân",
  "thông tin sức khỏe cá nhân"]

},
{
  id: "KG_EVASION",
  name: "Kỹ thuật né bộ lọc",
  description: "Dấu hiệu cố ý né hệ thống lọc nội dung",
  weight: 30,
  keywords: [
  "n.g.â.n h.à.n.g", "c.ô.n.g a.n", "b.ộ c.ô.n.g a.n",
  "o-t-p", "m-ậ-t k-h-ẩ-u", "t.à.i k.h.o.ả.n",
  "tkcn", "stk", "ck ngay", "chuyển khoản gấp",
  "bank số", "acc số", "tài khoản số",
  "0tp", "m4t kh4u", "t41 kh04n",
  "liên hệ riêng", "inbox riêng", "pm riêng",
  "nhắn tin riêng", "chat private", "zalo riêng",
  "telegram group", "group kín", "nhóm vip"]

},
{
  id: "KG_PSYCH",
  name: "Thao túng tâm lý",
  description: "Kỹ thuật thao túng cảm xúc để kiểm soát hành vi",
  weight: 28,
  bonusIfCombined: ["KG_AUTHORITY", "KG_FINANCIAL"],
  keywords: [
  "chỉ còn 3 suất", "số lượng có hạn", "duy nhất hôm nay",
  "cơ hội cuối cùng", "bán hết ngay", "sắp đóng cửa",
  "không còn cơ hội thứ hai", "bây giờ hoặc không bao giờ",
  "hàng triệu người đã làm", "99% người thành công",
  "cộng đồng 500k thành viên", "hội nhóm triệu phú",
  "chuyên gia xác nhận", "được kiểm chứng bởi",
  "tặng free không điều kiện", "hoàn toàn miễn phí",
  "quà tặng không hoàn lại", "ưu đãi chỉ cho bạn",
  "bạn bè đã đăng ký hết", "hàng xóm đã nhận tiền",
  "ai cũng đang làm điều này", "đừng để lỡ cơ hội vàng",
  "tin rò rỉ", "thông tin nội bộ", "bí mật chưa công bố",
  "nguồn tin đáng tin cậy", "tài liệu mật", "thông tin độc quyền",
  "không được chia sẻ rộng rãi",
  "hoàn cảnh éo le", "gia đình khó khăn", "bệnh hiểm nghèo",
  "trẻ em mồ côi", "người già neo đơn", "nạn nhân thiên tai",
  "kêu gọi giúp đỡ khẩn cấp", "quyên góp cứu người"]

},
{
  id: "KG_HEALTH",
  name: "Y tế giả mạo",
  description: "Thông tin y tế sai lệch, thuốc chữa bách bệnh",
  weight: 45,
  keywords: [
  "chữa bách bệnh", "thuốc thần kỳ", "chữa ung thư tại nhà",
  "khỏi hoàn toàn", "không cần phẫu thuật", "bỏ qua bác sĩ",
  "bí quyết gia truyền", "lương y bí truyền", "thảo dược bí mật",
  "không tác dụng phụ", "an toàn tuyệt đối 100%",
  "fda công nhận", "who khuyến cáo dùng",
  "dịch bệnh mới bùng phát", "biến chủng nguy hiểm hơn",
  "virus lạ lan nhanh", "dịch bệnh lây qua không khí",
  "phong tỏa thành phố sắp xảy ra", "chuẩn bị lương thực ngay",
  "tích trữ khẩu trang gấp",
  "thực phẩm nhiễm hóa chất", "rau quả có chất độc",
  "gạo nhựa từ trung quốc", "trứng gà nhân tạo",
  "đường hóa học gây ung thư", "muối biển nhiễm vi nhựa nặng",
  "vaccine chứa chip", "vaccine gây vô sinh", "vaccine thử nghiệm",
  "tác hại vaccine bị che giấu", "bác sĩ tiết lộ sự thật vaccine"]

},
{
  id: "KG_POLITICAL",
  name: "Tin đồn chính trị xã hội",
  description: "Tin đồn gây bất ổn xã hội, sai sự thật về chính trị",
  weight: 50,
  keywords: [
  "thủ tướng từ chức", "chủ tịch bị bắt", "bộ trưởng bị khởi tố",
  "lãnh đạo qua đời bí ẩn", "đảo chính", "chính phủ sụp đổ",
  "ngân hàng vỡ nợ hàng loạt", "tiền đồng mất giá 50%",
  "lạm phát phi mã", "nền kinh tế sụp đổ",
  "tịch thu tài sản người dân", "đổi tiền bắt buộc",
  "rút tiền mặt hàng loạt", "hạn mức rút tiền về 0",
  "bắt cóc hàng loạt", "buôn người trở lại", "tệ nạn xã hội tràn lan",
  "tội phạm tăng 1000%", "mất an ninh trật tự",
  "chiến tranh sắp xảy ra", "xung đột biên giới",
  "siêu bão cấp 15 sắp vào", "động đất cấp 9 sắp xảy ra",
  "sóng thần khổng lồ tiến vào", "lũ lụt cực đoan",
  "bầu trời đổi màu cảnh báo", "hiện tượng thiên văn ngày tận thế",
  "cá sấu sổng chuồng", "cá sấu khổng lồ", "quái vật", "sinh vật lạ", "ngoài hành tinh", "rơi xuống", "vật thể lạ"]

},
{
  id: "KG_CLICKBAIT",
  name: "Giật tít câu view",
  description: "Sử dụng ngôn từ giật gân, câu view rẻ tiền",
  weight: 40,
  keywords: [
  "sốc", "kinh hoàng", "kinh hãi", "chết sững", "đứng hình",
  "khóc thét", "bủn rủn", "rùng mình", "chết khiếp", "tím mặt",
  "ngất lịm", "đột ngột qua đời", "sự thật chấn động",
  "bí mật động trời", "cái kết sốc", "cái kết đắng",
  "không tin nổi vào mắt mình", "ngã ngửa", "tá hỏa",
  "thảm cảnh", "lòi ra", "kỳ dị", "quái đản",
  "lúc nhúc", "chi chít", "kinh dị", "kinh tởm",
  "sinh vật bí ẩn", "báo mộng", "ma dắt", "bùa ngải",
  "thần dược", "thần thánh", "thực vật", "còn zin",
  "chết lặng", "sự thật đắng", "thần kỳ", "trứng khủng long",
  "cúi lạy", "phóng sinh", "khẩn cấp", "c.ưỡng h.iếp", "thú tính",
  "xót xa nhìn cảnh", "khóc ngất", "li kì", "náo loạn",
  "bí mật đằng sau", "bí mật kinh hoàng", "sự thật bên trong",
  "sự thật động trời", "chờ́ng", "chuẩn chờ́ng", "sợng sắt",
  "rụng tim", "sừng sốt", "sững sốt", "ngư ngàng",
  "đừng ở ngoài", "có tin", "đang trốn"]

},
{
  id: "KG_ABSURD",
  name: "Tin đồn nhảm / Mê tín / Hư cấu / Spam",
  description: "Nội dung phi thực tế, mê tín dị đoan, hư cấu tình ái hoặc spam ứng dụng không nguồn gốc",
  weight: 45,
  keywords: [

  "kiếp trước", "kiếp sau", "tiền duyên", "số phận đã định", "tử vi", "phong thủy",
  "xem bói", "bói toán", "bùa chú", "ma quỷ", "ma cà rồng", "linh hồn",
  "oan hồn", "cô hồn", "vong linh", "thác oan", "lên đồng", "gọi hồn",
  "thần tài", "thần linh", "cầu may", "giải hạn", "đeo bùa", "cúng bái",
  "hồng nhan bạc phận", "duyên số", "mệnh cung",
  "tiền vào như nước", "tài lộc", "hút tài hút lộc",
  "muốn tiền vào", "nhớ đừng để thứ này", "đặt thứ này trong nhà",

  "sinh con với nhau", "đàn ông có thể sinh con", "tự sinh con",
  "sống mãi không già", "uống thứ này sẽ", "ăn thứ này sẽ",
  "chữa bách bệnh", "khỏi ung thư trong", "bí quyết sống thọ",
  "người ngoài hành tinh đến", "ufos xác nhận", "người ngoài vũ trụ",
  "chứng minh được tồn tại", "khoa học xác nhận ma", "nghiên cứu chứng minh phong thủy",

  "tình yêu đến từ kiếp trước", "yêu nhau từ kiếp trước",
  "bố và con gái tình yêu", "mẹ và con trai tình yêu",
  "tình yêu cấm kỵ", "chấp nhận đổ vỏ", "đổ vỏ cho con nhỏ bạn thân",
  "vẫn còn zin", "còn trinh", "lần đầu tiên",

  "tải ngay app", "tải app ngay", "link tải", "download ngay",
  "ngắm gái xinh", "gái xinh nóng bỏng", "hot girl lộ", "clip nóng",
  "xem ngay tại đây", "click vào link", "đăng ký ngay",
  "truy cập ngay", "vào link dưới đây", "free 100%",

  "chính phủ giấu", "sự thật bị che giấu", "giới tinh hoa",
  "thế lực ngầm", "bí mật bị che đậy", "họ không muốn bạn biết",
  "bí mật mà truyền thông không nói", "media che giấu",

  "võ sư tay không", "đánh bại hàng trăm", "giang hồ sài gòn",
  "rắn hổ chúa", "tìm đến nhà", "không đầu", "đú đởn",
  "xăm chữ này", "xăm lên đùi", "gợi cảm lên bar",
  "canh báo", "chính phủ nhật bản đã quyết định",
  "đại sứ quán từ chối", "từ chối cấp visa",

  "uống thuốc trừ sâu", "tự tử vì lý do",
  "bỗng hóa", "hóa người rắn", "da dẻ nứt toác",
  "như thần", "sứng sốt", "sừng sốt",
  "quẩy banh nóc", "khăn quàng quẩy"]

},
{
  id: "KG_VN_SCAM",
  name: "Lừa đảo đặc thù Việt Nam",
  description: "Kịch bản lừa đảo phổ biến và đặc thù ở Việt Nam",
  weight: 38,
  bonusIfCombined: ["KG_FINANCIAL", "KG_PERSONAL_INFO"],
  keywords: [
  "tuyển cộng tác viên đặt đơn shopee", "nhiệm vụ hoàn tiền",
  "làm việc tại nhà nhận thưởng", "đánh giá sản phẩm nhận hoa hồng",
  "bình chọn giúp tôi với", "click link bình chọn",
  "sàn đầu tư uy tín", "forex uy tín", "đầu tư chứng khoán quốc tế",
  "sàn forex lợi nhuận cao", "nhóm tín hiệu forex",
  "thầy/chuyên gia dạy đầu tư", "bot giao dịch tự động",
  "hội nhóm kín làm giàu", "nhóm vip đầu tư", "group chơi hụi online",
  "họ hàng bạn bè kêu gọi vay", "mượn tiền gấp",
  "bạn gái tây kẹt tiền", "người nước ngoài gửi quà",
  "thùng hàng từ nước ngoài kẹt sân bay",
  "yêu online cần tiền chữa bệnh",
  "visa du học cò mồi", "xklđ không cần hộ chiếu",
  "xuất khẩu lao động giá rẻ", "môi giới việc làm nước ngoài",
  "resort phú quốc tuyển nhân viên", "casino online tuyển",
  "tuyển nhân viên không cần bằng cấp", "lương 30-50 triệu",
  "làm 4 giờ/ngày lương cao", "công ty nước ngoài tuyển"]

},
{
  id: "KG_LEGIT",
  name: "Dấu hiệu nội dung chính thống",
  description: "Từ khóa đặc trưng của nội dung báo chí, văn bản nhà nước",
  weight: -20,
  keywords: [
  "theo thông tin từ", "phóng viên ghi nhận", "theo ghi nhận",
  "trao đổi với phóng viên", "đại diện đơn vị cho biết",
  "theo văn phòng chính phủ", "theo thông cáo báo chí",
  "phóng viên vov", "phóng viên vtv", "báo vnexpress đưa tin",
  "ông/bà cho biết", "theo lời chia sẻ", "đại diện công ty xác nhận",
  "nguồn từ bộ công an", "nguồn vtv",
  "nghị định số", "thông tư số",
  "quyết định số",
  "liên hệ đường dây nóng", "hotline chính thức",
  "địa chỉ trụ sở", "số điện thoại công khai",
  "website chính thức", "email chính thức",
  "hai phía", "nhiều quan điểm", "cần kiểm chứng thêm",
  "chờ xác nhận chính thức", "chưa có kết luận cuối"]

},
{
  id: "KG_PHISHING",
  name: "Phishing kỹ thuật cao",
  description: "Từ khóa trong kịch bản phishing tinh vi",
  weight: 55,
  bonusIfCombined: ["KG_PERSONAL_INFO", "KG_AUTHORITY"],
  keywords: [
  "cập nhật thông tin tài khoản", "xác minh tài khoản ngân hàng",
  "tài khoản sắp bị đóng", "cập nhật sinh trắc học",
  "link xác thực ngân hàng", "bảo mật 2 lớp ngân hàng",
  "đăng nhập lại để xác minh", "phiên đăng nhập hết hạn",
  "click vào link dưới đây", "nhấn vào để xác minh",
  "đường dẫn xác thực", "link an toàn", "link bảo mật",
  "tải ứng dụng chính thức", "cài app để nhận thưởng",
  "apk mới nhất", "phiên bản cập nhật", "nâng cấp app",
  "cài anydesk giúp tôi", "cài teamviewer", "chia sẻ màn hình",
  "hỗ trợ từ xa", "điều khiển máy tính từ xa",
  "mở anydesk ngay", "cấp quyền truy cập từ xa",
  "quét mã qr để nhận quà", "mã qr xác thực tài khoản",
  "quét để đăng nhập", "qr code ưu đãi độc quyền"]

},
{
  id: "KG_FOOD",
  name: "Tin giả thực phẩm & sức khỏe",
  description: "Tin đồn về an toàn thực phẩm, thuốc và sức khỏe",
  weight: 35,
  keywords: [
  "thực phẩm bẩn", "rau có hóa chất", "thịt bẩn",
  "nước mắm có asen", "bánh mì bị độc",
  "trái cây tẩm hóa chất", "thực phẩm trung quốc có giòi",
  "muối biển chứa vi nhựa", "nước uống có ký sinh trùng",
  "sữa có melamine", "cá nhiễm formol", "rau ngâm thuốc độc",
  "gạo giả từ nhựa", "mỳ tôm chứa chất gây ung thư",
  "dầu ăn tái chế phế thải"]

},
{
  id: "KG_GOSSIP",
  name: "Tin tức đời thường / Showbiz",
  description: "Từ khóa phổ biến trong tin đồn, giải trí, chuyện đời sống",
  weight: 15,
  keywords: [
  "showbiz", "ngoại tình", "cưới vợ", "chia tay", "lộ clip",
  "tá hỏa", "khóc thét", "sốc tận não", "cạn lời", "sững sờ",
  "vợ bé", "hot girl", "hot boy", "đánh ghen", "cắm sừng",
  "bóc phốt", "người tình kiếp trước", "con giáp thứ 13",
  "cộng đồng mạng xôn xao", "dân mạng phẫn nộ", "phì phèo",
  "rụng rời", "phát hoảng", "vạch mặt", "bạn gái tây",
  "đại gia", "chân dài"]

}];


function analyzeTextByKeywords(text) {
  const input = text.length > 8000 ? text.slice(0, 8000) : text;



  const evasionCharsRegex = /[\u0370-\u03FF\u0400-\u04FF\u1D00-\u1D7F]/g;
  const evasionMatchRaw = input.match(evasionCharsRegex);



  const stripped = input.normalize("NFD").
  replace(/[\u0332\u0331\u0330\u0333\u0334\u0335\u0336\u0337\u0338]/g, '').
  replace(/[\u0300-\u036F]/gu, (c) => {


    const code = c.codePointAt(0);


    return c;
  });
  const normalizedText = stripped.normalize("NFC").
  replace(/(?<=\p{L})[.-](?=\p{L})/gu, '').
  toLowerCase();

  const results = [];


  if (evasionMatchRaw && evasionMatchRaw.length > 3) {
    results.push({
      groupId: "KG_EVASION_FONT",
      groupName: "Sử dụng ký tự đặc biệt để lách luật",
      matchedKeywords: [...new Set(evasionMatchRaw)],
      penalty: 45,
      isPositive: false
    });
  }

  ALL_KEYWORD_GROUPS.forEach((group) => {
    const matched = [];
    group.keywords.forEach((keyword) => {
      const normalizedKeyword = keyword.normalize("NFC").replace(/(?<=\p{L})[.-](?=\p{L})/gu, '').toLowerCase();

      const regex = new RegExp(`(^|\\s|[.,!?'"\\u201C\\u201D\\[\\](){}:\\-])${normalizedKeyword}((?=\\s|[.,!?'"\\u201C\\u201D\\[\\](){}:\\-])|$)`, 'i');

      if (regex.test(normalizedText)) {
        matched.push(keyword);
      }
    });
    if (matched.length > 0) {
      const scaledPenalty = group.weight * Math.min(1 + (matched.length - 1) * 0.3, 2.5);
      results.push({
        groupId: group.id,
        groupName: group.name,
        matchedKeywords: matched,
        penalty: Math.round(scaledPenalty),
        isPositive: group.weight < 0
      });
    }
  });

  const foundGroupIds = results.map((r) => r.groupId);
  results.forEach((result) => {
    const group = ALL_KEYWORD_GROUPS.find((g) => g.id === result.groupId);
    if (group?.bonusIfCombined) {
      const hasCombination = group.bonusIfCombined.some((id) => foundGroupIds.includes(id));
      if (hasCombination) {
        result.penalty = Math.round(result.penalty * 1.5);
      }
    }
  });

  return results;
}

module.exports = { GAMBLING_DOMAINS: Array.from(GAMBLING_DOMAINS), GAMBLING_KEYWORDS, ALL_KEYWORD_GROUPS };
