import { AlertTriangle, Shield, ShieldCheck, User, Users, ExternalLink, Sparkles, Zap, MessageSquare, Info, HeartPulse, Landmark, Scale, Globe } from "lucide-react";
export interface FakeNewsLaw {
  id: string;
  name: string;
  detail: string;
  penalty: number;
  icon: any;
  status: "danger" | "warning" | "success";
  pattern: RegExp | ((text: string) => boolean);
}
export const FAKE_NEWS_LAWS: FakeNewsLaw[] = [
{
  id: "L001",
  name: "Né bot (Dấu chấm)",
  detail: "Sử dụng dấu chấm giữa các chữ cái (N.g.â.n H.à.n.g, C.ô.n.g A.n)",
  penalty: 25,
  icon: Sparkles,
  status: "danger",
  pattern: /[A-Z]\.[A-Z]\.[A-Z]/i
},
{
  id: "L002",
  name: "Né bot (Dấu gạch)",
  detail: "Sử dụng dấu gạch ngang xen kẽ (Ng-ân H-àng, O-T-P)",
  penalty: 20,
  icon: Sparkles,
  status: "danger",
  pattern: /[A-Z]-[A-Z]-[A-Z]/i
},
{
  id: "L003",
  name: "Ký tự tương đồng",
  detail: "Thay thế 'o' bằng '0', 'l' bằng '1', 'i' bằng 'j'",
  penalty: 15,
  icon: Sparkles,
  status: "warning",
  pattern: /[0olj1i]{3,}[a-z0-9]/
},
{
  id: "L004",
  name: "Ký tự ẩn Zero-width",
  detail: "Chèn mã Unicode ẩn (\u200B, \u200C...) giữa các ký tự",
  penalty: 50,
  icon: Zap,
  status: "danger",
  pattern: (text) => text.includes('\u200B') || text.includes('\u200C') || text.includes('\u200D')
},
{
  id: "L005",
  name: "Ký tự Unicode thay thế",
  detail: "Dùng kiểu chữ Ⓐⓝⓗ, 𝕬𝖓𝖍 để viết tên thương hiệu",
  penalty: 15,
  icon: Sparkles,
  status: "warning",
  pattern: /[Ⓐ-Ⓩⓐ-ⓩ🅰-🆉𝟘-𝟡𝕬-𝖟]/u
},
{
  id: "L006",
  name: "Dấu cách bất thường",
  detail: "Dùng nhiều dấu cách để chia tách từ khóa (N g â n H à n g)",
  penalty: 15,
  icon: MessageSquare,
  status: "warning",
  pattern: /[a-zA-Z]\s[a-zA-Z]\s[a-zA-Z]\s[a-zA-Z]/
},
{
  id: "L007",
  name: "Viết hoa áp chế",
  detail: "Dùng CAPSLOCK toàn bộ đoạn văn dài (>25 ký tự)",
  penalty: 20,
  icon: AlertTriangle,
  status: "warning",
  pattern: (text) => text === text.toUpperCase() && text.length > 25
},
{
  id: "L008",
  name: "Viết hoa/thường xen kẽ",
  detail: "Dấu hiệu tin rác hoặc mã độc (nGâN hÀnG)",
  penalty: 15,
  icon: MessageSquare,
  status: "warning",
  pattern: /([a-z][A-Z]){2,}/
},
{
  id: "L041",
  name: "Từ khóa giật gân",
  detail: "Dùng các từ: Rúng động, kinh hoàng, sốc tận óc, không thể tin nổi",
  penalty: 20,
  icon: Info,
  status: "warning",
  pattern: /rúng động|kinh hoàng|sốc tận óc|không thể tin nổi|bí mật đã được hé lộ|sự thật về/i
},
{
  id: "L042",
  name: "Thúc giục thời gian",
  detail: "Tạo áp lực: Ngay lập tức, tin khẩn, click ngay, trong hôm nay",
  penalty: 25,
  icon: Zap,
  status: "danger",
  pattern: /ngay lập tức|click ngay|chỉ còn vài phút|cuối cùng|thông báo khẩn|tin khẩn|khẩn cấp/i
},
{
  id: "L043",
  name: "Tiêu đề đe dọa",
  detail: "Dùng uy lực để dọa dẫm: Khởi tố, lệnh bắt, phong tỏa, nợ thuế",
  penalty: 40,
  icon: AlertTriangle,
  status: "danger",
  pattern: /khởi tố|lệnh bắt|phong tỏa|truy nã|nợ thuế|vi phạm|xử phạt|tạm giam|đình chỉ/i
},
{
  id: "L044",
  name: "Mồi chài tài chính",
  detail: "Việc nhẹ lương cao, nhận quà miễn phí, giải ngân nhanh",
  penalty: 30,
  icon: Landmark,
  status: "danger",
  pattern: /việc nhẹ lương cao|x2 tài khoản|nhận quà miễn phí|giải ngân|tiền treo|hoàn tiền/i
},
{
  id: "L045",
  name: "Yêu cầu bảo mật",
  detail: "Yêu cầu OTP, mật khẩu, xác thực danh tính gấp",
  penalty: 60,
  icon: Shield,
  status: "danger",
  pattern: /OTP|mật khẩu|xác thực danh tính|mã xác nhận|user|pass|đăng nhập ngay/i
},
{
  id: "L046",
  name: "Lừa đảo trúng thưởng",
  detail: "Dấu hiệu phần quà từ tập đoàn lớn (Samsung, Apple, Viettel)",
  penalty: 30,
  icon: Zap,
  status: "danger",
  pattern: /chúc mừng|trúng giải|phần quà|giải đặc biệt|đã thắng|bốc thăm/i
},
{
  id: "L081",
  name: "Mạo danh tổ chức quốc tế",
  detail: "Mượn danh WHO, UN, UNICEF... để tăng độ tin cậy",
  penalty: 45,
  icon: User,
  status: "danger",
  pattern: /Tổ chức Y tế Thế giới|WHO|Liên Hợp Quốc|UNICEF|UNESCO|World Bank|IMF/i
},
{
  id: "L082",
  name: "Mạo danh cơ quan nhà nước",
  detail: "Yêu cầu tài chính/mật khẩu hoặc dẫn link lạ dưới danh nghĩa cơ quan nhà nước",
  penalty: 50,
  icon: User,
  status: "danger",
  pattern: (text) => {
    const govKeywords = /Bộ Công an|Bộ Thông tin|Bộ Tài chính|Bộ Giáo dục|Chính phủ|Cục An ninh mạng|Viện Kiểm sát|Tòa án|Cổng dịch vụ công|VNeID/i;
    const scamIntents = /chuyển tiền|kê khai tài sản|cung cấp OTP|mật khẩu|truy cập link|lệnh bắt giữ|quy kết tội/i;
    const hasGovKeyword = govKeywords.test(text);
    const hasScamIntent = scamIntents.test(text);
    const links = text.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\.[a-zA-Z]{2,})/gi) || [];
    const hasNonGovLink = links.some((link) => !link.toLowerCase().endsWith(".gov.vn"));
    if (hasGovKeyword && (hasScamIntent || links.length > 0 && hasNonGovLink)) {
      return true;
    }
    return false;
  }
},
{
  id: "L180",
  name: "Quy tắc Tên miền Gốc (.GOV.VN)",
  detail: "Mạo danh cơ quan nhà nước nhưng link kết thúc bằng .com, .net, .xyz hoặc lồng ghép .gov.vn vào giữa",
  penalty: 80,
  icon: ExternalLink,
  status: "danger",
  pattern: (text) => {
    const govKeywords = /Bộ|Cục|Tòa án|Viện kiểm sát|UBND|Chính phủ|VNeID|Dịch vụ công/i;
    if (!govKeywords.test(text))
    return false;
    const links = text.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\.[a-zA-Z]{2,})/gi) || [];
    return links.some((link) => {
      const domain = link.toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
      const isOfficialGov = domain.endsWith('.gov.vn');
      const hasGovVnInMiddle = domain.includes('gov.vn.') || domain.includes('.gov.vn') && !domain.endsWith('.gov.vn');
      const isSuspiciousNonGov = /\.(com|net|org|info|me|xyz|top|cc|biz|io|today|click|link|today)$/i.test(domain);
      const hasFakeSubdomain = /vneid|chinhphu|thuedientu|dichvucong|bo-cong-an|congan|pcc05|a05/i.test(domain);
      return hasGovVnInMiddle || isSuspiciousNonGov && hasFakeSubdomain || !isOfficialGov && hasFakeSubdomain;
    });
  }
},
{
  id: "L083",
  name: "Mạo danh ngân hàng",
  detail: "Dùng tên ngân hàng trong ngữ cảnh đe dọa, khoá tài khoản, yêu cầu OTP",
  penalty: 35,
  icon: Landmark,
  status: "danger",
  pattern: /(?:Ngân hàng|Vietcombank|VCB|MB Bank|VPBank|Agribank|Techcombank|BIDV|Vietinbank).*(?:khóa|tạm khóa|đóng băng|nâng cấp|xác thực|truy cập|bảo mật|OTP|chặn|phạt|trừ tiền|tài khoản của bạn|hủy|tịch thu)/i
},
{
  id: "L084",
  name: "Dùng chức danh quyền lực",
  detail: "Tự xưng: Cán bộ điều tra, Giám đốc, Cục trưởng",
  penalty: 30,
  icon: User,
  status: "danger",
  pattern: /cán bộ điều tra|giám đốc ngân hàng|cảnh sát|Thứ trưởng|Cục trưởng|Đại tá/i
},
{
  id: "L121",
  name: "Kích hoạt FOMO",
  detail: "Tạo tâm lý sợ bỏ lỡ cơ hội hoặc bị phạt nếu không làm ngay",
  penalty: 25,
  icon: Zap,
  status: "warning",
  pattern: /suất duy nhất|duy nhất hôm nay|cơ hội cuối|hết hạn|ngay bây giờ/i
},
{
  id: "L122",
  name: "Kịch bản 'Tin nội bộ'",
  detail: "Dùng mã: Rò rỉ, tin mật, nguồn tin nội bộ từ văn phòng Chính phủ",
  penalty: 35,
  icon: ExternalLink,
  status: "danger",
  pattern: /rò rỉ|tin mật|nguồn tin nội bộ|bí mật bật mí|tài liệu mật/i
},
{
  id: "L123",
  name: "Tâm lý y tế hoang mang",
  detail: "Ký sinh trùng mới, mầm bệnh lạ, lây qua nguồn nước",
  penalty: 50,
  icon: HeartPulse,
  status: "danger",
  pattern: /ký sinh trùng|mầm bệnh mới|hệ thần kinh|lọc phân tử bạc|dịch bệnh lạ/i
},
{
  id: "L124",
  name: "Tận dụng lòng trắc ẩn",
  detail: "Đóng vai nạn nhân kêu gọi quyên góp vào STK cá nhân",
  penalty: 30,
  icon: Landmark,
  status: "warning",
  pattern: /hoàn cảnh đáng thương|quỹ từ thiện|xin hãy cứu|STK cá nhân/i
},
{
  id: "L161",
  name: "Link Phishing mạo danh",
  detail: "Sử dụng prefix giả mạo thương hiệu (-vne, -gov, -vneid, apple-, shopee-) hoặc TLD lạ (.ml, .ga, .cf)",
  penalty: 60,
  icon: ExternalLink,
  status: "danger",
  pattern: (text) => {
    const links = text.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\.[a-zA-Z]{2,})/gi) || [];
    return links.some((link) => {
      const domain = link.toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
      return /-vne\.|-gov\.|-vneid\.|apple-|shopee-|lazada-|\.ml$|\.ga$|\.cf$|\.gq$/i.test(domain);
    });
  }
},
{
  id: "L176",
  name: "Tên miền Squatting",
  detail: "Dùng thương hiệu lớn với đuôi lạ (.top, .info, .cc) hoặc mạo danh link bảo mật (security-brand.com)",
  penalty: 50,
  icon: ExternalLink,
  status: "danger",
  pattern: (text) => {
    const links = text.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\.[a-zA-Z]{2,})/gi) || [];
    return links.some((link) => {
      const domain = link.toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
      
      // Official domains mapping
      const officialDomains: Record<string, string[]> = {
        "vietcombank": ["vietcombank.com.vn"],
        "vcb": ["vietcombank.com.vn"],
        "mbbank": ["mbbank.com.vn"],
        "techcombank": ["techcombank.com.vn"],
        "bidv": ["bidv.com.vn"],
        "vietinbank": ["vietinbank.com.vn"],
        "momo": ["momo.vn"],
        "zalopay": ["zalopay.vn"],
        "vnpay": ["vnpay.vn"],
        "facebook": ["facebook.com"],
        "google": ["google.com", "google.com.vn"],
        "microsoft": ["microsoft.com"],
        "apple": ["apple.com"]
      };
      
      // Check if brand is in domain but not official
      const brandMatch = domain.match(/apple|google|facebook|microsoft|vtv|vneid|shopee|lazada|vcb|mbbank|vib/i);
      const hasBrand = !!brandMatch;
      const brand = brandMatch ? brandMatch[0].toLowerCase() : "";
      const official = officialDomains[brand] || [];
      const isOfficial = official.some(d => domain.endsWith(d) || domain === d);
      
      const isSuspiciousTLD = /\.(top|info|cc|icu|click|link|today|space|online|io|xyz)$/i.test(domain);
      const isSecurityImpersonation = /security|check|verify|fix|update|login|account/i.test(domain) && !/\.(com|vn|net)$/i.test(domain);
      
      return (hasBrand && !isOfficial && isSuspiciousTLD) || isSecurityImpersonation;
    });
  }
},
{
  id: "L162",
  name: "Tải App không rõ nguồn",
  detail: "Yêu cầu tải APK hoặc app lạ ngoài Store (CHPlay/Appstore)",
  penalty: 45,
  icon: ExternalLink,
  status: "danger",
  pattern: /tải app|link APK|cài đặt ứng dụng|phần mềm mới/i
},
{
  id: "L163",
  name: "Lạm dụng ký hiệu rác",
  detail: "Sử dụng hàng loạt Emoji (🚨, 🆘, 🔴) để gây chú ý",
  penalty: 15,
  icon: AlertTriangle,
  status: "warning",
  pattern: /(🚨|🆘|🔴|🔥|💰|📢|💵){3,}/
},
{
  id: "L164",
  name: "Thiếu dấu cách câu",
  detail: "Định dạng cẩu thả (dấu chấm phẩy sát chữ) - Đặc trưng tin spam",
  penalty: 15,
  icon: Info,
  status: "warning",
  pattern: /[,.?!][a-zà-ỹ][^\s"')\]]/
},
{
  id: "L165",
  name: "Uy quyền ảo (VNeID/SJC)",
  detail: "Mượn các chủ đề sốt (Vàng miếng SJC, VNeID, Định danh điện tử) để dẫn dụ người dùng",
  penalty: 45,
  icon: Shield,
  status: "danger",
  pattern: /VNeID|SJC|vàng miếng|định danh điện tử|cổng dịch vụ công|số định danh/i
},
{
  id: "L181",
  name: "Lừa đảo 'Chuyển nhầm tiền'",
  detail: "Kịch bản chuyển nhầm tiền vào tài khoản để ép trả nợ tín dụng đen",
  penalty: 40,
  icon: Landmark,
  status: "danger",
  pattern: /chuyển nhầm tiền|xin nhận lại tiền|thủ tục hoàn trà|ép trả nợ/i
},
{
  id: "L182",
  name: "Lừa đảo Quét mã QR",
  detail: "Yêu cầu quét mã QR để nhận quà hoặc xác thực (nguy cơ chiếm đoạt tài khoản)",
  penalty: 50,
  icon: Zap,
  status: "danger",
  pattern: /quét mã QR|mã QR nhận quà|quét để đăng nhập|mã QR xác thực/i
},
{
  id: "L183",
  name: "Lừa đảo Nạp game lậu",
  detail: "Quảng cáo nạp game giá rẻ, x10 kim cương để đánh cắp thông tin",
  penalty: 25,
  icon: Sparkles,
  status: "warning",
  pattern: /nạp game giá rẻ|x10 kim cương|nạp lậu|hack game|đổi thưởng game/i
},
{
  id: "L184",
  name: "Lừa đảo 'Bình chọn cuộc thi'",
  detail: "Kêu gọi click link bình chọn ảnh/tài năng để chiếm đoạt Facebook",
  penalty: 45,
  icon: MessageSquare,
  status: "danger",
  pattern: /bình chọn ảnh|vote cho bé|click link bình chọn|cuộc thi tài năng nhí/i
},
{
  id: "L185",
  name: "Lừa đảo Bảo hiểm xã hội",
  detail: "Thông báo nhận tiền trợ cấp BHXH hoặc hỗ trợ rút BHXH một lần",
  penalty: 40,
  icon: Landmark,
  status: "danger",
  pattern: /trợ cấp BHXH|rút bảo hiểm xã hội|hỗ trợ BHXH|cơ quan bảo hiểm/i
},
{
  id: "L186",
  name: "Lừa đảo Thu nợ cũ",
  detail: "Mạo danh công ty tài chính thu hồi nợ các khoản vay đã tất toán",
  penalty: 35,
  icon: AlertTriangle,
  status: "danger",
  pattern: /thu hồi nợ|khoản vay quá hạn|đòi nợ thuê|tất toán khoản vay/i
},
{
  id: "L187",
  name: "Lừa đảo Đặt phòng giá rẻ",
  detail: "Mạo danh khách sạn lớn bán combo du lịch ảo giá sốc",
  penalty: 30,
  icon: Globe,
  status: "warning",
  pattern: /combo du lịch giá rẻ|đặt phòng khách sạn 5 sao|voucher du lịch/i
},
{
  id: "L188",
  name: "Lừa đảo Tặng sách/Tài liệu",
  detail: "Tặng sách miễn phí nhưng yêu cầu trả phí vận chuyển cao (30-50k)",
  penalty: 20,
  icon: MessageSquare,
  status: "warning",
  pattern: /tặng sách miễn phí|tài liệu 0 đồng|phí ship|phí vận chuyển/i
},
{
  id: "L189",
  name: "Lừa đảo 'Lấy lại tài khoản'",
  detail: "Dịch vụ hack lại tài khoản bị mất (thực chất là lừa thêm tiền)",
  penalty: 45,
  icon: Shield,
  status: "danger",
  pattern: /lấy lại Facebook|dịch vụ mở khóa tài khoản|hack fb|mở khóa vĩnh viễn/i
},
{
  id: "L190",
  name: "Tin đồn Ngân hàng phá sản",
  detail: "Lan truyền tin đồn thất thiệt gây hoang mang hệ thống tài chính",
  penalty: 70,
  icon: Landmark,
  status: "danger",
  pattern: /ngân hàng vỡ nợ|phá sản|rút tiền hàng loạt|ngân hàng bị kiểm soát đặc biệt/i
},
{
  id: "L009",
  name: "Lặp từ điển hình",
  detail: "Lặp lại một từ khóa nhiều lần để thao túng SEO/Bot",
  penalty: 10,
  icon: MessageSquare,
  status: "warning",
  pattern: /(tiền|vay|trúng|quà).*\1.*\1/i
},
{
  id: "L010",
  name: "Lỗi chính tả cố ý",
  detail: "Viết sai chính tả các từ nhạy cảm để né lọc (C.A, B.ộ)",
  penalty: 15,
  icon: Info,
  status: "warning",
  pattern: /B\.ộ|C\.ông|Ngâ\.n|Hà\.ng/i
},
{
  id: "L011",
  name: "Lạm dụng dấu câu cực đoan",
  detail: "Sử dụng quá nhiều dấu chấm cảm hoặc hỏi gây căng thẳng ảo (!!!!)",
  penalty: 10,
  icon: AlertTriangle,
  status: "warning",
  pattern: /[!?.]{3,}/
},
{
  id: "L012",
  name: "Link rút gọn mờ ám",
  detail: "Sử dụng bit.ly, t.co, tinyurl che giấu đích đến",
  penalty: 25,
  icon: ExternalLink,
  status: "warning",
  pattern: /bit\.ly|t\.co|tinyurl\.com|shope\.ee|s\.id/i
},
{
  id: "L013",
  name: "Font chữ Unicode biến dạng",
  detail: "Dùng font 𝓵𝓾̛̀𝓪 đ𝓪̉𝓸 để trang trí tiêu đề",
  penalty: 15,
  icon: Sparkles,
  status: "warning",
  pattern: /[\u{1D400}-\u{1D7FF}]/u
},
{
  id: "L014",
  name: "Ký hiệu tiền tệ quốc tế",
  detail: "Dùng $, €, £ trong ngữ cảnh tặng tiền Việt",
  penalty: 20,
  icon: Landmark,
  status: "warning",
  pattern: /[\$€£¥]/
},
{
  id: "L015",
  name: "Kéo dài ký tự cuối",
  detail: "Sử dụng ký tự lặp (Sốc quáaaa, Ghê thậtttt)",
  penalty: 10,
  icon: MessageSquare,
  status: "warning",
  pattern: /([a-z])\1{3,}/i
},
{
  id: "L050",
  name: "Tin đồn Thảm họa/Cháy nổ",
  detail: "Thông tin chưa kiểm chứng về tai nạn, hỏa hoạn diện rộng",
  penalty: 45,
  icon: AlertTriangle,
  status: "danger",
  pattern: /cháy lớn tại|thảm họa kinh hoàng|vụ nổ kinh hoàng|số người chết tăng cao/i
},
{
  id: "L051",
  name: "Tin đồn Biến chủng Virus",
  detail: "Cảnh báo giả mạo về dịch bệnh mới (Covid-24, virus lạ)",
  penalty: 50,
  icon: HeartPulse,
  status: "danger",
  pattern: /biến chủng mới|virus lạ lây qua|dịch bệnh bùng phát lại|phong tỏa thành phố/i
},
{
  id: "L052",
  name: "Thực phẩm nhiễm độc/Bẩn",
  detail: "Tin đồn trái cây Trung Quốc chứa sáp nến, nước uống có đỉa",
  penalty: 35,
  icon: HeartPulse,
  status: "warning",
  pattern: /trái cây có đỉa|thực phẩm nhiễm độc|gạo làm bằng nhựa|trứng gà giả/i
},
{
  id: "L053",
  name: "Tận thế/Tâm linh cực đoan",
  detail: "Kêu gọi đóng tiền vào các hội nhóm tâm linh né ngày tận thế",
  penalty: 40,
  icon: Shield,
  status: "danger",
  pattern: /ngày tận thế|hội thánh đức chúa|cứu rỗi linh hồn|đóng phí hội viên/i
},
{
  id: "L054",
  name: "Nghệ sĩ qua đời (Báo tử giả)",
  detail: "Dùng tin buồn giả để câu view, click vào link quảng cáo",
  penalty: 30,
  icon: User,
  status: "warning",
  pattern: /đột ngột qua đời|vĩnh biệt nghệ sĩ|tin buồn từ gia đình/i
},
{
  id: "L055",
  name: "Bắt cóc trẻ em ảo",
  detail: "Lan truyền thông tin bắt cóc ảo để kêu gọi chia sẻ bài viết lừa đảo",
  penalty: 45,
  icon: AlertTriangle,
  status: "danger",
  pattern: /bắt cóc trẻ em|truy lùng xe|con em bị bắt|cảnh báo phụ huynh/i
},
{
  id: "L300",
  name: "Tin buồn / báo tử giả lan truyền",
  detail: "Thông báo mất/qua đời của cá nhân không rõ nguồn, lan truyền trên MXH để câu view hoặc dẫn dụ",
  penalty: 30,
  icon: AlertTriangle,
  status: "danger",
  pattern: /vừa mất trong (một vụ|vụ)?\s*(tai nạn|tai nan)|tin buồn.{0,20}lan truyền|(qua đời|mất).{0,40}lan truyền khắp mxh/i
},
{
  id: "L130",
  name: "Kịch bản 'Việc làm tại nhà'",
  detail: "Tuyển người lồng tiếng, dịch thuật, dán nhãn bao bì ảo",
  penalty: 35,
  icon: Zap,
  status: "danger",
  pattern: /lồng tiếng tại nhà|dịch thuật online|dán nhãn bao bì|không cần cọc|nhận lương ngay/i
},
{
  id: "L131",
  name: "Kịch bản 'Bạn của con'",
  detail: "Mạo danh bạn bè của con cái để vay tiền cha mẹ",
  penalty: 50,
  icon: User,
  status: "danger",
  pattern: /con là bạn của|cháu là bạn của|con đang kẹt tiền|nhờ bố mẹ chuyển/i
},
{
  id: "L132",
  name: "Kịch bản 'Đầu tư tỷ phú'",
  detail: "Mượn danh Phạm Nhật Vượng, Elon Musk hỗ trợ đầu tư",
  penalty: 40,
  icon: Landmark,
  status: "danger",
  pattern: /Phạm Nhật Vượng lừa|Elon Musk tặng coin|tỷ phú hỗ trợ|bí quyết làm giàu/i
},
{
  id: "L133",
  name: "Kịch bản 'Tình cảm xuyên biên giới'",
  detail: "Người nước ngoài gửi quà đắt tiền nhưng bị kẹt ở sân bay",
  penalty: 45,
  icon: Globe,
  status: "danger",
  pattern: /quà từ nước ngoài|thùng hàng bị kẹt|phí hải quan|nhân viên sân bay gọi/i
},
{
  id: "L134",
  name: "Lừa đảo 'Mua hộ hàng hóa'",
  detail: "Yêu cầu thanh toán trước đơn hàng xách tay hộ",
  penalty: 30,
  icon: Zap,
  status: "warning",
  pattern: /mua hộ hàng xách tay|thanh toán trước|hàng hiệu giá rẻ/i
},
{
  id: "L140",
  name: "Chế độ 'Cứu trợ khẩn cấp'",
  detail: "Mạo danh MTTQ kêu gọi cứu trợ thiên tai vào TK cá nhân",
  penalty: 60,
  icon: ShieldCheck,
  status: "danger",
  pattern: /Mặt trận Tổ quốc|cứu trợ bão lũ|STK cá nhân đại diện/i
},
{
  id: "T004",
  name: "Hotline chính thức",
  detail: "Sử dụng số điện thoại đường dây nóng uy tín (113, 115, 114, 024...)",
  penalty: -20,
  icon: ShieldCheck,
  status: "success",
  pattern: /hotline: 113|hotline: 115|đường dây nóng 1900/i
},
{
  id: "T005",
  name: "Địa chỉ trụ sở thật",
  detail: "Văn bản kèm địa chỉ cơ quan nhà nước rõ ràng",
  penalty: -15,
  icon: Landmark,
  status: "success",
  pattern: /địa chỉ:\s*số|trụ sở tại|số\s+\d+[^,]*,\s*(phường|xã|quận|huyện|thành phố|tỉnh)/i
},
{
  id: "T006",
  name: "Trình bày chuyên nghiệp",
  detail: "Văn bản có bố cục rõ ràng, không sai lỗi chính tả cơ bản",
  penalty: -10,
  icon: Info,
  status: "success",
  pattern: (text) => text.length > 300 && !/[^ ]([,.?!])/i.test(text) && !/([a-z][A-Z]){2,}/.test(text)
},
{
  id: "L191",
  name: "Lừa đảo 'Xóa nợ xấu'",
  detail: "Cam kết xóa lịch sử nợ xấu trên CIC để vay vốn ngân hàng",
  penalty: 40,
  icon: Landmark,
  status: "danger",
  pattern: /xóa nợ xấu CIC|dịch vụ xóa nợ|làm sạch hồ sơ tín dụng|xóa tên khỏi danh sách nợ/i
},
{
  id: "L192",
  name: "Mạo danh Cục Thu Thuế",
  detail: "Dọa nợ thuế thu nhập cá nhân, yêu cầu nộp phạt qua link",
  penalty: 35,
  icon: Scale,
  status: "danger",
  pattern: /Tổng cục Thuế|quyết toán thuế|nợ thuế thu nhập|hoàn thuế 0 đồng/i
},
{
  id: "L193",
  name: "Lừa đảo 'Ví trả sau'",
  detail: "Dịch vụ rút tiền mặt từ ví trả sau (Momo, Zalopay) - Nguy cơ mất tài khoản",
  penalty: 30,
  icon: Landmark,
  status: "warning",
  pattern: /rút tiền ví trả sau|đáo hạn ví trả sau|rút ví Momo|chiết khấu ví trả sau/i
},
{
  id: "L194",
  name: "Mạo danh Grab/Be/Gojek",
  detail: "Thông báo trúng thưởng chuyến xe free cả năm hoặc nạp tiền ví tài xế",
  penalty: 30,
  icon: Zap,
  status: "danger",
  pattern: /Grab tri ân|tặng chuyến xe miễn phí|nạp tiền ví Grab|đối tác Be trúng thưởng/i
},
{
  id: "L195",
  name: "Lừa đảo 'Chung tay xây dựng'",
  detail: "Kêu gọi vốn cho các dự án cộng đồng ảo, không có pháp lý",
  penalty: 25,
  icon: Users,
  status: "warning",
  pattern: /dự án cộng đồng|chung tay góp vốn|xây dựng tương lai|góp vốn khởi nghiệp/i
},
{
  id: "L196",
  name: "Mạo danh Sổ hộ khẩu điện tử",
  detail: "Yêu cầu cập nhật thông tin cư trú trên app lạ thay vì VNeID",
  penalty: 45,
  icon: Shield,
  status: "danger",
  pattern: /sổ hộ khẩu điện tử|cập nhật cư trú|xác nhận nơi ở|thông tin nhân khẩu/i
},
{
  id: "L197",
  name: "Lừa đảo 'Kiếm tiền từ App'",
  detail: "App xem video, đọc báo kiếm tiền nhưng yêu cầu nạp tiền nâng cấp",
  penalty: 30,
  icon: Zap,
  status: "warning",
  pattern: /app xem video kiếm tiền|đọc báo nhận quà|nâng cấp VIP kiếm tiền|làm nhiệm vụ kiếm tiền/i
},
{
  id: "L198",
  name: "Mạo danh BHXH quận/huyện",
  detail: "Thông báo nợ tiền đóng BHXH tự nguyện, yêu cầu đóng bù",
  penalty: 35,
  icon: Landmark,
  status: "danger",
  pattern: /BHXH quận|nợ tiền bảo hiểm|đóng bù bảo hiểm|xác nhận đóng BHXH/i
},
{
  id: "L199",
  name: "Lừa đảo 'Tài khoản số đẹp'",
  detail: "Bán số tài khoản ngân hàng bát quý/ngũ quý ảo rồi chiếm đoạt tiền",
  penalty: 25,
  icon: Sparkles,
  status: "warning",
  pattern: /tài khoản số đẹp|số tài khoản bát quý|scb số đẹp|tài khoản phong thủy/i
},
{
  id: "L200",
  name: "Mạo danh Trung tâm Anh ngữ",
  detail: "Thông báo hoàn học phí do trung tâm đóng cửa hoặc trúng học bổng 100%",
  penalty: 30,
  icon: Globe,
  status: "warning",
  pattern: /hoàn học phí|trung tâm tiếng anh tri ân|học bổng toàn phần|cam kết đầu ra Ielts/i
},
{
  id: "L201",
  name: "Lừa đảo 'Vé số Vietlott'",
  detail: "Thông báo trúng số Vietlott nhưng cần trả phí hoa hồng trước",
  penalty: 40,
  icon: Zap,
  status: "danger",
  pattern: /trúng thưởng Vietlott|giải Jackpot|nhận thưởng vé số|phí trả thưởng/i
},
{
  id: "L202",
  name: "Mạo danh Cục Đăng kiểm",
  detail: "Dọa xe hết hạn đăng kiểm, yêu cầu nộp phạt hoặc gia hạn online qua link lạ",
  penalty: 35,
  icon: Scale,
  status: "danger",
  pattern: /Cục Đăng kiểm|hết hạn kiểm định|gia hạn đăng kiểm online|nộp phạt đăng kiểm/i
},
{
  id: "L203",
  name: "Lừa đảo 'Chứng khoán quốc tế'",
  detail: "Mời chào tham gia sàn Nasdaq, Dow Jones ảo với cam kết lợi nhuận 500%",
  penalty: 45,
  icon: Landmark,
  status: "danger",
  pattern: /chứng khoán quốc tế|sàn Nasdaq|đầu tư cổ phiếu Mỹ|bao lỗ 100%|chuyên gia chứng khoán/i
},
{
  id: "L204",
  name: "Mạo danh Facebook/Meta Task",
  detail: "Thông báo tài khoản vi phạm chính sách và yêu cầu login link lạ để kháng cáo",
  penalty: 50,
  icon: Shield,
  status: "danger",
  pattern: /vi phạm tiêu chuẩn cộng đồng|tài khoản bị vô hiệu hóa|trung tâm hỗ trợ Meta|kháng cáo tài khoản/i
},
{
  id: "L205",
  name: "Lừa đảo 'Bàn tay vàng'",
  detail: "Dịch vụ bói toán, xem chỉ tay online yêu cầu đặt cọc giải hạn",
  penalty: 15,
  icon: Sparkles,
  status: "warning",
  pattern: /xem chỉ tay online|đại hạn 2026|giải hạn đầu năm|cung hoàng đạo sầu muộn/i
},
{
  id: "L206",
  name: "Mạo danh Shopee Mall tặng quà",
  detail: "Kêu gọi tham gia nhóm Telegram để nhận quà tri ân Shopee Mall",
  penalty: 35,
  icon: Zap,
  status: "danger",
  pattern: /Shopee Mall tri ân|tặng quà miễn phí 100%|liên kết tài khoản nhận quà|admin Shopee/i
},
{
  id: "L207",
  name: "Lừa đảo 'Trao đổi CCCD'",
  detail: "Yêu cầu chụp ảnh 2 mặt CCCD gửi qua Zalo để 'kiểm tra hồ sơ'",
  penalty: 60,
  icon: Shield,
  status: "danger",
  pattern: /gửi ảnh CCCD|chụp chứng minh thư|xác minh căn cước|hình ảnh cá nhân/i
},
{
  id: "L208",
  name: "Mạo danh Zalo Security",
  detail: "Yêu cầu xác thực tài khoản Zalo do 'có thiết bị lạ đăng nhập'",
  penalty: 45,
  icon: Shield,
  status: "danger",
  pattern: /thiết bị lạ đăng nhập|bảo mật Zalo|xác nhận danh tính Zalo|Zalo Official Account/i
},
{
  id: "L209",
  name: "Lừa đảo 'Voucher du lịch 0đ'",
  detail: "Quảng cáo tour Thái Lan/Hàn Quốc 0đ chỉ mất phí làm visa ảo",
  penalty: 30,
  icon: Globe,
  status: "warning",
  pattern: /tour du lịch 0 đồng|vé máy bay miễn phí|voucher nghỉ dưỡng|phí bảo hiểm du lịch/i
},
{
  id: "L210",
  name: "Mạo danh Lazada Express",
  detail: "Yêu cầu thanh toán phí lưu kho cho đơn hàng 'quên nhận'",
  penalty: 25,
  icon: ExternalLink,
  status: "warning",
  pattern: /đơn hàng chưa nhận|phí lưu kho Lazada|thanh toán bưu phẩm|kiểm tra vận đơn/i
},
{
  id: "L211",
  name: "Lừa đảo 'Cầm đồ online'",
  detail: "Cho vay tiền qua iCloud (cầm iCloud) để chiếm quyền điều khiển điện thoại",
  penalty: 55,
  icon: Shield,
  status: "danger",
  pattern: /cầm đồ iCloud|vay tiền qua iPhone|đăng nhập iCloud lạ|mở khóa iCloud/i
},
{
  id: "L212",
  name: "Mạo danh Cục Phòng chống Thiên tai",
  detail: "Kêu gọi quyên góp tiền mặt cho nạn nhân bão lũ qua số tài khoản cá nhân",
  penalty: 50,
  icon: Users,
  status: "danger",
  pattern: /Ban chỉ đạo phòng chống thiên tai|ủy thác quyên góp|STK hội cứu trợ|đóng góp khẩn cấp/i
},
{
  id: "L213",
  name: "Lừa đảo 'Tuyển mẫu nhí'",
  detail: "Mạo danh các hãng thời trang tuyển người mẫu nhí để dụ phụ huynh nạp tiền vào app",
  penalty: 40,
  icon: Users,
  status: "danger",
  pattern: /tuyển người mẫu nhí|đại diện thương hiệu nhí|vòng sơ khảo online|nạp tiền làm nhiệm vụ/i
},
{
  id: "L214",
  name: "Mạo danh Netflix/Spotify",
  detail: "Thông báo hết hạn đăng ký và yêu cầu update credit card trên web giả",
  penalty: 35,
  icon: ExternalLink,
  status: "danger",
  pattern: /Netflix subscription expired|update payment method|tài khoản Netflix bị khóa|gia hạn Spotify/i
},
{
  id: "L215",
  name: "Lừa đảo 'Tài liệu mật quân sự'",
  detail: "Dùng các cụm từ gây tò mò về chính trị, quân sự để dẫn link mã độc",
  penalty: 45,
  icon: Info,
  status: "danger",
  pattern: /bí mật quốc phòng|tài liệu quân sự|hình ảnh biên giới|tin mật từ bộ/i
},
{
  id: "L216",
  name: "Mạo danh Apple ID Security",
  detail: "Email giả mạo 'Your Apple ID has been logged in from Beijing' để chiếm tài khoản",
  penalty: 50,
  icon: Shield,
  status: "danger",
  pattern: /Apple ID has been locked|unauthorized login attempt|verify your Apple ID|đăng nhập tại Bắc Kinh/i
},
{
  id: "L217",
  name: "Lừa đảo 'Thanh toán hộ hóa đơn'",
  detail: "Dịch vụ thanh toán hộ điện, nước, internet giảm giá 30% để lấy thông tin khách hàng",
  penalty: 30,
  icon: Zap,
  status: "warning",
  pattern: /thanh toán hộ hóa đơn|chiết khấu tiền điện|giảm giá nạp tiền điện thoại|thanh toán cước internet/i
},
{
  id: "L218",
  name: "Mạo danh TikTok Shop",
  detail: "Cảnh báo gian hàng bị vi phạm và yêu cầu nộp phí duy trì để không bị khóa",
  penalty: 35,
  icon: ExternalLink,
  status: "danger",
  pattern: /TikTok Shop cập nhật|vi phạm vận hành|phí duy trì gian hàng|nâng cấp tài khoản TikTok/i
},
{
  id: "L219",
  name: "Lừa đảo 'Quỹ khuyến học'",
  detail: "Mạo danh các hội khuyến học kêu gọi đóng góp cho sinh viên nghèo rồi cắt liên lạc",
  penalty: 30,
  icon: Users,
  status: "warning",
  pattern: /quỹ khuyến học|hỗ trợ sinh viên nghèo|đóng góp sách vở|nhận đỡ đầu học sinh/i
},
{
  id: "L220",
  name: "Mạo danh ngân hàng gửi SMS Brandname",
  detail: "Tin nhắn có tên ngân hàng nhưng nội dung chứa link đuôi lạ (vcb-onlv.com)",
  penalty: 70,
  icon: Landmark,
  status: "danger",
  pattern: /Vietcombank thông báo: Tín dụng|MBBank cảnh báo|link xác nhận tài khoản/i
},
{
  id: "L221",
  name: "Lừa đảo 'Dùng thử sản phẩm free'",
  detail: "Gửi máy massage, nồi chiên không dầu dùng thử nhưng yêu cầu trả phí bảo hiểm hàng trước",
  penalty: 30,
  icon: Zap,
  status: "warning",
  pattern: /dùng thử sản phẩm miễn phí|máy massage mini tri ân|phí bảo hiểm hàng hóa|nhận quà tại nhà/i
},
{
  id: "L222",
  name: "Lừa đảo 'Cố vấn vàng miếng'",
  detail: "Nhóm kín chia sẻ 'bí kíp' đầu tư vàng SJC lợi nhuận cao mỗi ngày",
  penalty: 40,
  icon: Landmark,
  status: "danger",
  pattern: /bí kíp đầu tư vàng|vàng SJC giá sỉ|lợi nhuận vàng hàng ngày|nhóm đầu tư vàng/i
},
{
  id: "L223",
  name: "Mạo danh giáo viên chủ nhiệm",
  detail: "Gọi điện dọa con bị tai nạn hoặc nợ học phí ngoại khóa khẩn cấp",
  penalty: 60,
  icon: User,
  status: "danger",
  pattern: /con bị tai nạn|đang cấp cứu|nợ học phí ngoại khóa|gửi tiền đóng học gấp/i
},
{
  id: "L224",
  name: "Lừa đảo 'Cứu trợ thú cưng'",
  detail: "Dùng hình ảnh thú cưng bị thương để kêu gọi từ thiện vào tài khoản cá nhân",
  penalty: 25,
  icon: HeartPulse,
  status: "warning",
  pattern: /cứu trợ thú cưng|quyên góp cho chó mèo|chi phí phẫu thuật động vật|trạm cứu hộ ảo/i
},
{
  id: "L225",
  name: "Mạo danh nhân viên Viettel Post",
  detail: "Thông báo hàng có chất cấm và yêu cầu nộp tiền 'giải quyết nội bộ'",
  penalty: 50,
  icon: ExternalLink,
  status: "danger",
  pattern: /hàng chứa chất cấm|Viettel Post kiểm tra|giải quyết nội bộ|nộp phạt bưu phẩm/i
},
{
  id: "L226",
  name: "Lừa đảo 'Cập nhật sinh trắc học'",
  detail: "Yêu cầu click link lạ để 'cập nhật sinh trắc học' ngân hàng do lỗi hệ thống",
  penalty: 65,
  icon: Shield,
  status: "danger",
  pattern: /lỗi sinh trắc học|cập nhật khuôn mặt|xác thực vân tay online|link cập nhật sinh trắc/i
},
{
  id: "L227",
  name: "Mạo danh công ty xổ số 'biết trước kết quả'",
  detail: "Cam kết cung cấp số lô, số đề trúng 100% từ 'người trong ngành'",
  penalty: 35,
  icon: Zap,
  status: "danger",
  pattern: /biết trước kết quả xổ số|số đề trúng tuyệt đối|người trong hội đồng xổ số|soi cầu vip/i
},
{
  id: "L228",
  name: "Lừa đảo 'Bán vé xem ca nhạc'",
  detail: "Bán vé concert (Blackpink, Anh Trai Say Hi...) ảo, yêu cầu chuyển khoản cọc",
  penalty: 30,
  icon: Globe,
  status: "warning",
  pattern: /vé concert giá rẻ|pass vé concert|ủy quyền bán vé|đặt chỗ trước concert/i
},
{
  id: "L229",
  name: "Mạo danh 'Kế toán trường học'",
  detail: "Yêu cầu đóng phí bảo hiểm y tế học sinh qua số tài khoản cá nhân",
  penalty: 40,
  icon: User,
  status: "danger",
  pattern: /phí BHYT học sinh|kế toán trường thông báo|đóng tiền bảo hiểm gấp|số tài khoản nhà trường/i
},
{
  id: "L230",
  name: "Lừa đảo 'Trúng thưởng xe SH'",
  detail: "Thông báo trúng thưởng xe SH từ chương trình tri ân khách hàng điện lực/viễn thông",
  penalty: 45,
  icon: Zap,
  status: "danger",
  pattern: /trúng thưởng xe SH|giải đặc biệt xe máy|nhận thưởng tri ân|phí trước bạ giả/i
}];
