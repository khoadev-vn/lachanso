/**
 * FAKE NEWS KEYWORDS DATABASE - Lá Chắn Số
 * Từ điển từ khóa phân tích tin giả đa tầng
 * Cập nhật: 2026
 */

export interface KeywordGroup {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  weight: number;         // Trọng số phạt (0-100)
  bonusIfCombined?: string[]; // Kết hợp với group khác sẽ tăng phạt
}

// ============================================================
// NHÓM A: NGÔN NGỮ GÂY HOẢNG LOẠN & ÁP LỰC
// ============================================================
export const PANIC_KEYWORDS: KeywordGroup = {
  id: "KG_PANIC",
  name: "Ngôn ngữ gây hoảng loạn",
  description: "Từ khóa kích hoạt cảm xúc sợ hãi để đẩy hành động nhanh",
  weight: 25,
  bonusIfCombined: ["KG_AUTHORITY", "KG_FINANCIAL"],
  keywords: [
    // Khẩn cấp
    "khẩn cấp", "khẩn", "ngay lập tức", "ngay bây giờ", "ngay tức thì",
    "trong hôm nay", "hôm nay thôi", "chỉ còn vài giờ", "hết hạn ngay",
    "thông báo khẩn", "cảnh báo khẩn", "tin nóng", "tin gấp",
    // Đe dọa
    "bị phong tỏa", "tài khoản bị khóa", "bị đình chỉ", "bị vô hiệu hóa",
    "bị khởi tố", "bị bắt giữ", "lệnh bắt", "truy nã", "bị tạm giam",
    "bị phạt nặng", "bị xử lý hình sự", "vi phạm nghiêm trọng",
    "sẽ bị mất", "mất tất cả", "không còn cơ hội",
    // Giật gân
    "sốc", "kinh hoàng", "rúng động", "bàng hoàng", "choáng váng",
    "không thể tin nổi", "chấn động", "gây sốt", "làm dậy sóng",
    "cả nước xôn xao", "mạng xã hội nổi sóng", "cộng đồng phẫn nộ",
    // Kêu gọi chia sẻ ngay
    "chia sẻ ngay", "lan truyền gấp", "báo cho người thân", "cảnh báo bạn bè",
    "đừng để muộn", "kẻo hối hận", "cứu lấy",
  ]
};

// ============================================================
// NHÓM B: TỪ KHÓA MẠO DANH UY QUYỀN
// ============================================================
export const AUTHORITY_IMPERSONATION_KEYWORDS: KeywordGroup = {
  id: "KG_AUTHORITY",
  name: "Mạo danh uy quyền",
  description: "Từ khóa giả mạo cơ quan nhà nước, tổ chức lớn",
  weight: 40,
  bonusIfCombined: ["KG_FINANCIAL", "KG_PERSONAL_INFO"],
  keywords: [
    // Công an / An ninh
    "cục an ninh mạng", "a05", "pcc05", "cảnh sát kinh tế",
    "cục phòng chống tội phạm công nghệ cao", "bộ công an thông báo",
    "cảnh sát điều tra", "điều tra viên", "cán bộ điều tra",
    // Chính phủ / Hành chính
    "ủy ban nhân dân", "ubnd thông báo", "cổng dịch vụ công",
    "bộ tài chính thông báo", "bộ thông tin truyền thông",
    "thủ tướng chính phủ chỉ đạo", "nghị định mới nhất",
    "văn bản số", "quyết định số", "thông tư số",
    // Tòa án / Pháp luật
    "viện kiểm sát", "tòa án nhân dân", "quy kết tội danh",
    "lệnh triệu tập", "lệnh khám xét", "lệnh phong tỏa tài sản",
    "thi hành án", "bản án", "phán quyết",
    // Ngân hàng Nhà nước
    "ngân hàng nhà nước thông báo", "thống đốc ngân hàng",
    "cục thanh tra giám sát ngân hàng",
    // Quốc tế giả mạo
    "interpol thông báo", "fbi cảnh báo", "fbi việt nam",
    "tổ chức y tế thế giới cảnh báo mới",
    // Danh xưng giả
    "đại tá", "thiếu tướng", "thứ trưởng", "cục trưởng", "vụ trưởng",
    "thanh tra chính phủ", "kiểm toán nhà nước phát hiện",
  ]
};

// ============================================================
// NHÓM C: TỪ KHÓA TÀI CHÍNH LỪA ĐẢO
// ============================================================
export const FINANCIAL_SCAM_KEYWORDS: KeywordGroup = {
  id: "KG_FINANCIAL",
  name: "Tài chính lừa đảo",
  description: "Từ khóa dụ dỗ tài chính, hứa hẹn lợi nhuận phi thực tế",
  weight: 35,
  bonusIfCombined: ["KG_PANIC", "KG_PERSONAL_INFO"],
  keywords: [
    // Lợi nhuận phi thực tế
    "lợi nhuận 300%", "lợi nhuận 500%", "x2 tài khoản", "x3 tài khoản",
    "double tiền", "sinh lời hàng ngày", "thu nhập thụ động",
    "bao lãi", "đảm bảo lợi nhuận", "không bao giờ lỗ",
    "chiến lược bí mật", "bí kíp làm giàu", "công thức triệu phú",
    // Vay mượn phi pháp
    "vay không cần thế chấp", "vay không cần lịch sử tín dụng",
    "giải ngân trong 5 phút", "giải ngân ngay hôm nay",
    "vay tín chấp nhanh", "hỗ trợ vay xấu nợ", "vay qua app",
    "tín dụng đen", "lãi suất 0%", "cho vay ưu đãi",
    // Trúng thưởng giả
    "chúc mừng trúng thưởng", "bạn đã may mắn", "giải jackpot",
    "giải đặc biệt", "phần thưởng tri ân", "bốc thăm may mắn",
    "khách hàng may mắn", "người dùng thứ triệu",
    // Thu nhập online giả
    "làm giàu online", "kiếm tiền tại nhà", "việc nhẹ lương cao",
    "thu nhập 20 triệu/tháng", "làm online không cần vốn",
    "cộng tác viên online", "đại lý phân phối độc quyền",
    "kiếm tiền từ điện thoại", "nhiệm vụ kiếm tiền",
    // Crypto lừa đảo
    "đầu tư crypto lãi cao", "coin mới sắp lên sàn",
    "tiền điện tử miễn phí", "airdrop độc quyền", "mining miễn phí",
    "ví crypto bị đóng băng", "lấy lại ví bitcoin",
  ]
};

// ============================================================
// NHÓM D: YÊU CẦU THÔNG TIN CÁ NHÂN
// ============================================================
export const PERSONAL_INFO_KEYWORDS: KeywordGroup = {
  id: "KG_PERSONAL_INFO",
  name: "Yêu cầu thông tin cá nhân",
  description: "Từ khóa chiếm đoạt thông tin nhạy cảm cá nhân",
  weight: 60,
  bonusIfCombined: ["KG_AUTHORITY"],
  keywords: [
    // Thông tin tài khoản
    "nhập mật khẩu", "mã otp", "mã xác thực", "mã pin",
    "số thẻ tín dụng", "số cvv", "ngày hết hạn thẻ",
    "số tài khoản ngân hàng", "cung cấp otp", "gửi otp ngay",
    "xác thực 2 bước", "đăng nhập để xác minh",
    // Giấy tờ cá nhân
    "chụp 2 mặt cccd", "gửi ảnh căn cước", "ảnh hộ chiếu",
    "ảnh chứng minh nhân dân", "số định danh cá nhân",
    "thông tin sinh trắc học", "quét vân tay online",
    "nhận diện khuôn mặt online", "selfie với cccd",
    // Tài khoản mạng xã hội
    "tên đăng nhập facebook", "mật khẩu zalo", "email đăng nhập",
    "cấp quyền truy cập", "ủy quyền tài khoản",
    // Thông tin y tế
    "mã số bảo hiểm y tế", "số thẻ bhyt", "mã bệnh nhân",
    "thông tin sức khỏe cá nhân",
  ]
};

// ============================================================
// NHÓM E: KỸ THUẬT NÉ BỘ LỌC
// ============================================================
export const FILTER_EVASION_KEYWORDS: KeywordGroup = {
  id: "KG_EVASION",
  name: "Kỹ thuật né bộ lọc",
  description: "Dấu hiệu cố ý né hệ thống lọc nội dung",
  weight: 30,
  keywords: [
    // Ký tự thay thế phổ biến
    "n.g.â.n h.à.n.g", "c.ô.n.g a.n", "b.ộ c.ô.n.g a.n",
    "o-t-p", "m-ậ-t k-h-ẩ-u", "t.à.i k.h.o.ả.n",
    // Tiếng lóng né lọc
    "tkcn", "stk", "ck ngay", "chuyển khoản gấp",
    "bank số", "acc số", "tài khoản số",
    // Mã hóa bằng số
    "0tp", "m4t kh4u", "t41 kh04n",
    // Cụm từ né lọc
    "liên hệ riêng", "inbox riêng", "pm riêng",
    "nhắn tin riêng", "chat private", "zalo riêng",
    "telegram group", "group kín", "nhóm vip",
  ]
};

// ============================================================
// NHÓM F: THAO TÚNG TÂM LÝ
// ============================================================
export const PSYCHOLOGICAL_MANIPULATION_KEYWORDS: KeywordGroup = {
  id: "KG_PSYCH",
  name: "Thao túng tâm lý",
  description: "Kỹ thuật thao túng cảm xúc để kiểm soát hành vi",
  weight: 28,
  bonusIfCombined: ["KG_AUTHORITY", "KG_FINANCIAL"],
  keywords: [
    // Scarcity (khan hiếm giả tạo)
    "chỉ còn 3 suất", "số lượng có hạn", "duy nhất hôm nay",
    "cơ hội cuối cùng", "bán hết ngay", "sắp đóng cửa",
    "không còn cơ hội thứ hai", "bây giờ hoặc không bao giờ",
    // Social proof giả
    "hàng triệu người đã làm", "99% người thành công",
    "cộng đồng 500k thành viên", "hội nhóm triệu phú",
    "chuyên gia xác nhận", "được kiểm chứng bởi",
    // Reciprocity (có đi có lại)
    "tặng free không điều kiện", "hoàn toàn miễn phí",
    "quà tặng không hoàn lại", "ưu đãi chỉ cho bạn",
    // Fear of missing out
    "bạn bè đã đăng ký hết", "hàng xóm đã nhận tiền",
    "ai cũng đang làm điều này", "đừng để lỡ cơ hội vàng",
    // Tin nội bộ / bí mật
    "tin rò rỉ", "thông tin nội bộ", "bí mật chưa công bố",
    "nguồn tin đáng tin cậy", "tài liệu mật", "thông tin độc quyền",
    "không được chia sẻ rộng rãi",
    // Lòng trắc ẩn
    "hoàn cảnh éo le", "gia đình khó khăn", "bệnh hiểm nghèo",
    "trẻ em mồ côi", "người già neo đơn", "nạn nhân thiên tai",
    "kêu gọi giúp đỡ khẩn cấp", "quyên góp cứu người",
  ]
};

// ============================================================
// NHÓM G: Y TẾ GIẢ MẠO & THUỐC CHỮA BỆNH PHẢN KHOA HỌC
// ============================================================
export const HEALTH_MISINFORMATION_KEYWORDS: KeywordGroup = {
  id: "KG_HEALTH",
  name: "Y tế giả mạo",
  description: "Thông tin y tế sai lệch, thuốc chữa bách bệnh",
  weight: 45,
  keywords: [
    // Thuốc/phương pháp phản khoa học
    "chữa bách bệnh", "thuốc thần kỳ", "chữa ung thư tại nhà",
    "khỏi hoàn toàn", "không cần phẫu thuật", "bỏ qua bác sĩ",
    "bí quyết gia truyền", "lương y bí truyền", "thảo dược bí mật",
    "không tác dụng phụ", "an toàn tuyệt đối 100%",
    "fda công nhận" /* thường giả mạo */, "who khuyến cáo dùng",
    // Dịch bệnh giả mạo
    "dịch bệnh mới bùng phát", "biến chủng nguy hiểm hơn",
    "virus lạ lan nhanh", "dịch bệnh lây qua không khí",
    "phong tỏa thành phố sắp xảy ra", "chuẩn bị lương thực ngay",
    "tích trữ khẩu trang gấp",
    // Thực phẩm giả mạo
    "thực phẩm nhiễm hóa chất", "rau quả có chất độc",
    "gạo nhựa từ trung quốc", "trứng gà nhân tạo",
    "đường hóa học gây ung thư", "muối biển nhiễm vi nhựa nặng",
    // Vaccine giả mạo
    "vaccine chứa chip", "vaccine gây vô sinh", "vaccine thử nghiệm",
    "tác hại vaccine bị che giấu", "bác sĩ tiết lộ sự thật vaccine",
  ]
};

// ============================================================
// NHÓM H: TIN ĐỒN CHÍNH TRỊ - XÃ HỘI
// ============================================================
export const POLITICAL_RUMOR_KEYWORDS: KeywordGroup = {
  id: "KG_POLITICAL",
  name: "Tin đồn chính trị xã hội",
  description: "Tin đồn gây bất ổn xã hội, sai sự thật về chính trị",
  weight: 50,
  keywords: [
    // Lãnh đạo giả mạo
    "thủ tướng từ chức", "chủ tịch bị bắt", "bộ trưởng bị khởi tố",
    "lãnh đạo qua đời bí ẩn", "đảo chính", "chính phủ sụp đổ",
    // Kinh tế giả mạo
    "ngân hàng vỡ nợ hàng loạt", "tiền đồng mất giá 50%",
    "lạm phát phi mã", "nền kinh tế sụp đổ",
    "tịch thu tài sản người dân", "đổi tiền bắt buộc",
    "rút tiền mặt hàng loạt", "hạn mức rút tiền về 0",
    // Xã hội giả mạo
    "bắt cóc hàng loạt", "buôn người trở lại", "tệ nạn xã hội tràn lan",
    "tội phạm tăng 1000%", "mất an ninh trật tự",
    "chiến tranh sắp xảy ra", "xung đột biên giới",
    // Thiên tai giả mạo
    "siêu bão cấp 15 sắp vào", "động đất cấp 9 sắp xảy ra",
    "sóng thần khổng lồ tiến vào", "lũ lụt cực đoan",
    "bầu trời đổi màu cảnh báo", "hiện tượng thiên văn ngày tận thế",
  ]
};

// ============================================================
// NHÓM I: LỪNG ĐẢO DANH TÍNH ĐẶC THÙ (VIỆT NAM 2025-2026)
// ============================================================
export const VN_SPECIFIC_SCAM_KEYWORDS: KeywordGroup = {
  id: "KG_VN_SCAM",
  name: "Lừa đảo đặc thù Việt Nam",
  description: "Kịch bản lừa đảo phổ biến và đặc thù ở Việt Nam",
  weight: 38,
  bonusIfCombined: ["KG_FINANCIAL", "KG_PERSONAL_INFO"],
  keywords: [
    // Lừa đảo qua mạng xã hội
    "tuyển cộng tác viên đặt đơn shopee", "nhiệm vụ hoàn tiền",
    "làm việc tại nhà nhận thưởng", "đánh giá sản phẩm nhận hoa hồng",
    "bình chọn giúp tôi với", "click link bình chọn",
    // Lừa đảo đầu tư
    "sàn đầu tư uy tín", "forex uy tín", "đầu tư chứng khoán quốc tế",
    "sàn forex lợi nhuận cao", "nhóm tín hiệu forex",
    "thầy/chuyên gia dạy đầu tư", "bot giao dịch tự động",
    // Lừa đảo qua Zalo/Facebook
    "hội nhóm kín làm giàu", "nhóm vip đầu tư", "group chơi hụi online",
    "họ hàng bạn bè kêu gọi vay", "mượn tiền gấp",
    // Lừa đảo tình cảm
    "bạn gái tây kẹt tiền", "người nước ngoài gửi quà",
    "thùng hàng từ nước ngoài kẹt sân bay",
    "yêu online cần tiền chữa bệnh",
    // Lừa đảo việc làm
    "visa du học cò mồi", "xklđ không cần hộ chiếu",
    "xuất khẩu lao động giá rẻ", "môi giới việc làm nước ngoài",
    "resort phú quốc tuyển nhân viên", "casino online tuyển",
    // Lừa đảo tuyển dụng giả
    "tuyển nhân viên không cần bằng cấp", "lương 30-50 triệu",
    "làm 4 giờ/ngày lương cao", "công ty nước ngoài tuyển",
  ]
};

// ============================================================
// NHÓM J: DẤU HIỆU NỘI DUNG CHÍNH THỐNG (ĐIỂM CỘNG)
// ============================================================
export const LEGITIMATE_CONTENT_KEYWORDS: KeywordGroup = {
  id: "KG_LEGIT",
  name: "Dấu hiệu nội dung chính thống",
  description: "Từ khóa đặc trưng của nội dung báo chí, văn bản nhà nước",
  weight: -20, // Điểm cộng (âm = giảm trừ điểm)
  keywords: [
    // Văn phong báo chí
    "theo thông tin từ", "phóng viên ghi nhận", "theo ghi nhận",
    "trao đổi với phóng viên", "đại diện đơn vị cho biết",
    "theo văn phòng chính phủ", "theo thông cáo báo chí",
    "phóng viên vov", "phóng viên vtv", "báo vnexpress đưa tin",
    // Trích dẫn rõ ràng
    "ông/bà cho biết", "theo lời chia sẻ", "đại diện công ty xác nhận",
    "nguồn từ bộ công an", "nguồn vtv",
    // Văn bản pháp luật rõ ràng
    "nghị định số ... /202", "thông tư số ... /202",
    "quyết định số ... /qd",
    // Thông tin minh bạch
    "liên hệ đường dây nóng", "hotline chính thức",
    "địa chỉ trụ sở", "số điện thoại công khai",
    "website chính thức", "email chính thức",
    // Ngôn ngữ cân bằng
    "hai phía", "nhiều quan điểm", "cần kiểm chứng thêm",
    "chờ xác nhận chính thức", "chưa có kết luận cuối",
  ]
};

// ============================================================
// NHÓM K: PHISHING KỸ THUẬT CAO
// ============================================================
export const PHISHING_TECHNICAL_KEYWORDS: KeywordGroup = {
  id: "KG_PHISHING",
  name: "Phishing kỹ thuật cao",
  description: "Từ khóa trong kịch bản phishing tinh vi",
  weight: 55,
  bonusIfCombined: ["KG_PERSONAL_INFO", "KG_AUTHORITY"],
  keywords: [
    // Banking phishing
    "cập nhật thông tin tài khoản", "xác minh tài khoản ngân hàng",
    "tài khoản sắp bị đóng", "cập nhật sinh trắc học",
    "link xác thực ngân hàng", "bảo mật 2 lớp ngân hàng",
    "đăng nhập lại để xác minh", "phiên đăng nhập hết hạn",
    // Email/SMS phishing
    "click vào link dưới đây", "nhấn vào để xác minh",
    "đường dẫn xác thực", "link an toàn", "link bảo mật",
    // App phishing
    "tải ứng dụng chính thức", "cài app để nhận thưởng",
    "apk mới nhất", "phiên bản cập nhật", "nâng cấp app",
    // Remote access
    "cài anydesk giúp tôi", "cài teamviewer", "chia sẻ màn hình",
    "hỗ trợ từ xa", "điều khiển máy tính từ xa",
    "mở anydesk ngay", "cấp quyền truy cập từ xa",
    // QR phishing
    "quét mã qr để nhận quà", "mã qr xác thực tài khoản",
    "quét để đăng nhập", "qr code ưu đãi độc quyền",
  ]
};

// ============================================================
// NHÓM L: TIN GIẢ VỀ SỨC KHỎE & THỰC PHẨM
// ============================================================
export const FOOD_SAFETY_MISINFORMATION: KeywordGroup = {
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
    "dầu ăn tái chế phế thải",
  ]
};

// ============================================================
// NHÓM M: CÔNG CỤ PHÂN TÍCH TỪ ĐIỂN
// ============================================================
export const ALL_KEYWORD_GROUPS: KeywordGroup[] = [
  PANIC_KEYWORDS,
  AUTHORITY_IMPERSONATION_KEYWORDS,
  FINANCIAL_SCAM_KEYWORDS,
  PERSONAL_INFO_KEYWORDS,
  FILTER_EVASION_KEYWORDS,
  PSYCHOLOGICAL_MANIPULATION_KEYWORDS,
  HEALTH_MISINFORMATION_KEYWORDS,
  POLITICAL_RUMOR_KEYWORDS,
  VN_SPECIFIC_SCAM_KEYWORDS,
  LEGITIMATE_CONTENT_KEYWORDS,
  PHISHING_TECHNICAL_KEYWORDS,
  FOOD_SAFETY_MISINFORMATION,
];

// ============================================================
// HELPER: Phân tích text theo tất cả nhóm từ khóa
// ============================================================
export interface KeywordMatchResult {
  groupId: string;
  groupName: string;
  matchedKeywords: string[];
  penalty: number;
  isPositive: boolean;
}

export function analyzeTextByKeywords(text: string): KeywordMatchResult[] {
  // Truncate để tránh block UI khi user dán văn bản quá dài
  const input = text.length > 8000 ? text.slice(0, 8000) : text;

  const normalizedText = input.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove diacritics for comparison

  
  const results: KeywordMatchResult[] = [];

  ALL_KEYWORD_GROUPS.forEach(group => {
    const matched: string[] = [];
    
    group.keywords.forEach(keyword => {
      // Normalize keyword similarly
      const normalizedKeyword = keyword.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      
      if (normalizedText.includes(normalizedKeyword) || text.toLowerCase().includes(keyword.toLowerCase())) {
        matched.push(keyword);
      }
    });

    if (matched.length > 0) {
      // Scale penalty by number of matches (diminishing returns)
      const scaledPenalty = group.weight * Math.min(1 + (matched.length - 1) * 0.3, 2.5);
      
      results.push({
        groupId: group.id,
        groupName: group.name,
        matchedKeywords: matched,
        penalty: Math.round(scaledPenalty),
        isPositive: group.weight < 0,
      });
    }
  });

  // Check for combination bonuses
  const foundGroupIds = results.map(r => r.groupId);
  results.forEach(result => {
    const group = ALL_KEYWORD_GROUPS.find(g => g.id === result.groupId);
    if (group?.bonusIfCombined) {
      const hasCombination = group.bonusIfCombined.some(id => foundGroupIds.includes(id));
      if (hasCombination) {
        result.penalty = Math.round(result.penalty * 1.5); // 50% bonus penalty for combinations
      }
    }
  });

  return results;
}

// Quick check: Mức độ rủi ro tổng thể từ từ khóa
export function getKeywordRiskScore(text: string): number {
  const matches = analyzeTextByKeywords(text);
  let totalPenalty = 0;

  matches.forEach(m => {
    if (m.isPositive) {
      totalPenalty += m.penalty; // penalty is negative for positive groups
    } else {
      totalPenalty += m.penalty;
    }
  });

  return Math.min(100, Math.max(0, totalPenalty));
}
