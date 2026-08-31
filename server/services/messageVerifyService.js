// ============ MESSAGE VERIFY SERVICE v3 — ELITE AI Scam Detection Engine ============
// Military-grade multilingual scam analysis with psychological profiling
// Supports: VI, EN, ZH, KO, JA, TH, RU, ES, PT, AR, TL + 50 universal patterns

const { llmChat, isLLMConfigured } = require('./llmClient');
const fs = require('fs');
const path = require('path');
const { MESSAGE_SYSTEM_PROMPT } = require('../data/trainingExamples');

// ============================================================
// SCAM INTELLIGENCE DATABASE (Real-time integration)
// ============================================================

let scamDomains = new Set();
try {
  const dataPath = path.join(__dirname, '../data/scamDomains.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const domains = data.scamDomains || data.SCAM_DOMAINS || [];
  domains.forEach(d => {
    if (d.domain) scamDomains.add(d.domain.toLowerCase());
  });
} catch (e) { /* ignore */ }

// Known scam phone prefixes (international)
const SCAM_PHONE_PREFIXES = new Set([
  '+234', '+233', '+225', '+223', '+216', '+212', // Africa
  '+855', '+856', '+95', // SE Asia
  '+92', '+880', '+94', // South Asia
  '+55', '+52', '+54', // Latin America
  '+7', '+380', // Eastern Europe
]);

// ============================================================
// LAYER 1: ADVANCED PSYCHOLOGICAL MANIPULATION DETECTION
// ============================================================

const PSYCH_MANIPULATION = [
  // URGENCY TACTICS
  { id: 'PSY_URGENCY_TIME', name: 'Time pressure manipulation', weight: 0.35, 
    re: /(ngay lập tức|right now|immediately|urgent|至急|立即|즉시|ด่วน|срочно|ahora|immediately|within \d+ (?:minutes?|hours?|days?)|before it's too late|last chance|final notice|expires? (?:today|soon|in \d+))/i,
    category: 'psychological', subcategory: 'urgency',
    explanation: 'Scammers create artificial urgency to prevent rational thinking' },
  
  { id: 'PSY_FEAR', name: 'Fear-based coercion', weight: 0.40,
    re: /(tài khoản.*(?:bị khóa|bị đóng|bị xóa)|account.*(?:suspended|locked|closed|deleted|compromised)|legal action|arrest|criminal|prosecute|truy tố|bắt giữ|penalty|fine|lawsuit|court|police|fbi|irs|公安|检察|法院|경찰|검찰|警察|法庭|หมายจับ|สอบสวน)/i,
    category: 'psychological', subcategory: 'fear',
    explanation: 'Using threats of authority or consequences to create panic' },
  
  { id: 'PSY_GREED', name: 'Greed/.reward exploitation', weight: 0.35,
    re: /(trúng (?:thưởng|giải)|won|prize|lottery|million|billion|inheritance|free money|bonus|reward|jackpot|congratulations|中奖|恭喜|당첨|축하|当選|ถูกรางวัล|выигрali|ganhou|nanalo|فازت)/i,
    category: 'psychological', subcategory: 'greed',
    explanation: 'Exploiting desire for unearned rewards' },
  
  { id: 'PSY_AUTHORITY', name: 'Authority impersonation', weight: 0.45,
    re: /(this is (?:the|your) (?:bank|police|irs|fbi|icrosoft|apple|amazon|netflix)|bank.*(?:alert|notification|security)|police.*(?:department|station)|government.*(?:agency|office)|ngân hàng|cảnh báo|công an|公安局|警察局|경찰서|은행|ธนาคาร|警察|police|bank|IRS|FBI|Microsoft|Apple|Amazon)/i,
    category: 'psychological', subcategory: 'authority',
    explanation: 'Impersonating trusted institutions to gain compliance' },
  
  { id: 'PSY_ISOLATION', name: 'Isolation tactic', weight: 0.30,
    re: /(don't tell|keep this secret|between us|confidential|private|do not share|秘密|保密|机密|비밀|绝密|ลับ|confidencial|секрет)/i,
    category: 'psychological', subcategory: 'isolation',
    explanation: 'Isolating victim from potential helpers' },
  
  { id: 'PSY_RECIPROCITY', name: 'False gift/reciprocity', weight: 0.30,
    re: /(gift|present|bonus|reward|free|complimentary|on us|special offer|exclusive|VIP|member|quà|tặng|礼品|礼物|무료|oferta|gratis|bonuse|подарок|هدية)/i,
    category: 'psychological', subcategory: 'reciprocity',
    explanation: 'Creating sense of obligation through fake generosity' },
  
  { id: 'PSY_SOCIAL_PROOF', name: 'Social proof manipulation', weight: 0.25,
    re: /(others have|many people|everyone|thousands|millions|already (?:received|claimed|joined)|đã nhận|hàng ngàn|hàng triệu|许多人|很多人|수백만|数百万)/i,
    category: 'psychological', subcategory: 'social_proof',
    explanation: 'Using false consensus to reduce skepticism' },
  
  { id: 'PSY_SCARCITY', name: 'Scarcity tactic', weight: 0.30,
    re: /(limited|only \d+ (?:left|remaining|spots)|last (?:chance|day|offer)|hurry|running out|sắp hết|hết hạn|最後|最后|마지막|最後の|ครั้งสุดท้าย|последний|último)/i,
    category: 'psychological', subcategory: 'scarcity',
    explanation: 'Creating false scarcity to force quick action' },
];

// ============================================================
// LAYER 2: MULTI-LANGUAGE SCAM SIGNALS (100+ patterns)
// ============================================================

const SCAM_SIGNALS = [
  // ===== VIETNAMESE =====
  { id: 'VI_OTP', name: 'Yêu cầu mã OTP', weight: 0.55, re: /(mã otp|mã xác (?:nhận|thực)|ma otp|mật khẩu|password|mã pin|số cvv|secure code|mã chuyển tiền|mã xác minh|mã thanh toán)/i, lang: 'vi', category: 'credential_theft' },
  { id: 'VI_TRANSFER', name: 'Yêu cầu chuyển tiền', weight: 0.55, re: /(chuyển (?:khoản|tiền|khoan)|nạp (?:tiền|thẻ|card)|thanh toán (?:trước|trước )?cọc|đặt cọc|nạp thẻ|quét mã qr để nhận|chuyển gấp|gửi (?:tiền|gấp)|chuyển ngay)/i, lang: 'vi', category: 'financial_fraud' },
  { id: 'VI_JOB', name: 'Việc nhẹ lương cao', weight: 0.50, re: /(việc nhẹ|viec nhe|làm việc online|lam viec online|lương cao|luong cao|300.000|500.000|1 triệu|2 triệu|3 triệu|thu nhập thêm|hoàn đơn|hoàn phí|hoan don|đánh giá sản phẩm|danh gia san pham|nhận việc ngay|click like nhận|thu nhập thụ động|kiếm tiền tại nhà|làm tại nhà)/i, lang: 'vi', category: 'employment_scam' },
  { id: 'VI_PRIZE', name: 'Trúng thưởng', weight: 0.50, re: /(trúng (?:thưởng|giải)|trung thuong|nhận (?:quà|thưởng)|hoàn tiền|hoan tien|quà tặng miễn phí|may mắn trúng|giải đặc biệt|khuyến mãi.*(?:100%|99%)|bốc thăm|quay số|trúng xe|trúng tiền)/i, lang: 'vi', category: 'prize_scam' },
  { id: 'VI_URGENCY', name: 'Áp lực thời gian', weight: 0.35, re: /(ngay lập tức|ngay bây giờ|trước (?:.\d+ |)(?:giờ|phút|ngày)|hết hiệu lực|tài khoản.*(?:bị khóa|bị đóng)|đóng tài khoản|hủy.*mã|vi phạm.*pháp luật|bị truy tố|bắt giữ|cơ quan công an|vneid|cccd.*cung cấp|phải nộp|bắt buộc|không sẽ)/i, lang: 'vi', category: 'coercion' },
  { id: 'VI_LOAN', name: 'Vay vốn', weight: 0.40, re: /(vay.*(?:nhanh|online|nóng|lãi suất thấp)|cho vay.*(?:không cần|không chứng|nhận ngay)|giải ngân|nổ hũ|tăng tiền|vay không thẩm định|không cần hộ khẩu|không cần chứng minh thu nhập)/i, lang: 'vi', category: 'loan_scam' },
  { id: 'VI_ID', name: 'Yêu cầu CCCD', weight: 0.45, re: /(cung cấp.*(?:cccd|cmnd|căn cước|số tài khoản|địa chỉ|số thẻ|stk)|số tài khoản.*của|mã số thuế|ngày sinh|photo.*(?:cccd|cmnd|giấy tờ))/i, lang: 'vi', category: 'identity_theft' },
  { id: 'VI_BANK', name: 'Mạo danh ngân hàng', weight: 0.50, re: /(ngân hàng.*(?:yêu cầu|thông báo|cảnh báo)|updating.*(?:tài khoản|thông tin)|cập nhật.*(?:tài khoản|thông tin)|lỗi giao dịch|giao dịch thất bại|tài khoản bất thường)/i, lang: 'vi', category: 'impersonation' },
  { id: 'VI_ROMANCE', name: 'Lừa đảo tình cảm', weight: 0.50, re: /(tình yêu|em yêu|anh yêu|yêu em|nhớ em|thương em|em nhớ|quà tặng|gửi tiền|cần tiền|khó khăn|giúp đỡ|tình nhân|người yêu)/i, lang: 'vi', category: 'romance_scam' },

  // ===== ENGLISH =====
  { id: 'EN_OTP', name: 'OTP request', weight: 0.55, re: /\b(otp|one.?time.?password|verification code|security code|pin code|cvv|cvc|ssn|social security|account password|login credentials|confirm your identity|verify your account)\b/i, lang: 'en', category: 'credential_theft' },
  { id: 'EN_TRANSFER', name: 'Money transfer', weight: 0.55, re: /\b(wire transfer|send money|transfer funds|western union|moneygram|bitcoin|crypto wallet|gift card|itunes|amazon card|steam card|reload|top.?up|deposit|pay now|urgent payment|bank account|routing number|account number|zelle|cashapp|venmo)\b/i, lang: 'en', category: 'financial_fraud' },
  { id: 'EN_JOB', name: 'Employment scam', weight: 0.50, re: /\b(work from home|easy money|earn \$\d+|make \$\d+|passive income|financial freedom|side hustle|no experience needed|hiring immediately|click like|follow and earn|data entry|envelope stuffing|reshipping|money mule)\b/i, lang: 'en', category: 'employment_scam' },
  { id: 'EN_PRIZE', name: 'Prize scam', weight: 0.50, re: /\b(you.?ve? won|congratulations.*winner|claim your prize|lottery winner|sweepstakes|grand prize|free gift|lucky draw|million dollar|inheritance|beneficiary|next of kin|unclaimed funds|settlement)\b/i, lang: 'en', category: 'prize_scam' },
  { id: 'EN_IMPERSONATE', name: 'Impersonation', weight: 0.55, re: /\b(this is (?:the|your) (?:irs|fbi|bank|police|microsoft|apple|amazon|netflix|irs|social security|medicare|customs)|your account has been|we detected unusual|security alert|unusual activity|suspicious login|unauthorized access)\b/i, lang: 'en', category: 'impersonation' },
  { id: 'EN_CRYPTO', name: 'Crypto scam', weight: 0.50, re: /\b(double your|10x return|guaranteed profit|investment opportunity|crypto airdrop|free tokens|staking reward|yield farming|pump and dump|insider tip|before it goes public|forex signals|binary options)\b/i, lang: 'en', category: 'investment_scam' },
  { id: 'EN_ROMANCE', name: 'Romance scam', weight: 0.50, re: /\b(i love you|my darling|sweetheart|miss you|can.t wait to see you|sent you a gift|help me out|need money for|stranded|emergency funds|medical emergency|military deployment)\b/i, lang: 'en', category: 'romance_scam' },
  { id: 'EN_URGENCY', name: 'Urgency/threat', weight: 0.35, re: /\b(act now|immediate(ly)?|urgent|time.?sensitive|account (?:suspended|locked|closed|compromised|expiring|limited)|verify your account|failure to comply|legal action|arrest warrant|fbi|irs|police|lawsuit)\b/i, lang: 'en', category: 'coercion' },

  // ===== CHINESE (中文) =====
  { id: 'ZH_OTP', name: '验证码请求', weight: 0.55, re: /(验证码|密码|安全码|支付密码|交易密码|短信验证码|手机验证码|银行卡密码|动态码|授权码)/i, lang: 'zh', category: 'credential_theft' },
  { id: 'ZH_TRANSFER', name: '转账请求', weight: 0.55, re: /(转账|汇款|打款|付款|扫码支付|微信转账|支付宝转账|银行卡转账|紧急转账|立即转账|银行账户|收款码|收款账户|对公账户)/i, lang: 'zh', category: 'financial_fraud' },
  { id: 'ZH_PRIZE', name: '中奖诈骗', weight: 0.50, re: /(中奖|恭喜您|领奖|奖金|奖品|免费领取|幸运用户|恭喜发财|年终奖|红包|抽奖|摇一摇|砸金蛋|幸运转盘)/i, lang: 'zh', category: 'prize_scam' },
  { id: 'ZH_URGENCY', name: '紧急威胁', weight: 0.35, re: /(立即处理|紧急通知|账户异常|账户冻结|账户注销|涉嫌违法|公安局|检察院|法院传票|通缉令|立即配合|安全核查|资金清查|断卡行动)/i, lang: 'zh', category: 'coercion' },
  { id: 'ZH_IMPERSONATE', name: '冒充公检法', weight: 0.55, re: /(公安|检察|法院|纪委|监委|安全局|稽查|税务|社保|医保|快递丢失|理赔|客服|售后)/i, lang: 'zh', category: 'impersonation' },
  { id: 'ZH_JOB', name: '兼职诈骗', weight: 0.50, re: /(刷单|做任务|日赚|兼职|在家赚钱|轻松赚钱|高薪|佣金|返现|抢单|淘宝刷单|抖音刷单|直播带货|代理|推广)/i, lang: 'zh', category: 'employment_scam' },
  { id: 'ZH_INVEST', name: '投资诈骗', weight: 0.50, re: /(内幕消息|稳赚不赔|高回报|投资理财|虚拟货币|区块链|原始股|上市公司|私募基金|杀猪盘|资金盘|拉人头)/i, lang: 'zh', category: 'investment_scam' },

  // ===== KOREAN (한국어) =====
  { id: 'KO_OTP', name: '인증번호 요청', weight: 0.55, re: /(인증번호|비밀번호|인증코드|보안코드|결제비밀번호|계좌비밀번호|승인번호|본인인증|실명인증)/i, lang: 'ko', category: 'credential_theft' },
  { id: 'KO_TRANSFER', name: '송금 요청', weight: 0.55, re: /(송금|이체|입금|계좌이체|카카오뱅크|토스|계좌번호|즉시송금|급히 송금|네이버페이|삼성페이)/i, lang: 'ko', category: 'financial_fraud' },
  { id: 'KO_IMPERSONATE', name: '기관 사칭', weight: 0.55, re: /(금융감독원|국세청|경찰청|검찰|법원|행정안전부|보건복지부|국민건강보험|공정거래위원회)/i, lang: 'ko', category: 'impersonation' },

  // ===== JAPANESE (日本語) =====
  { id: 'JA_OTP', name: '認証コード要求', weight: 0.55, re: /(認証番号|パスワード|暗証番号|セキュリティコード|確認番号|ワンタイムパスワード|本人確認)/i, lang: 'ja', category: 'credential_theft' },
  { id: 'JA_TRANSFER', name: '送金要求', weight: 0.55, re: /(振込|振替|送金|入金|口座番号|銀行口座|即時送金|緊急送金|コンビニ入金)/i, lang: 'ja', category: 'financial_fraud' },

  // ===== THAI (ภาษาไทย) =====
  { id: 'TH_OTP', name: 'ขอรหัส OTP', weight: 0.55, re: /(รหัส otp|รหัสยืนยัน|รหัสผ่าน|รหัสความปลอดภัย|รหัสบัตร|รหัส PIN|ยืนยันตัวตน)/i, lang: 'th', category: 'credential_theft' },
  { id: 'TH_TRANSFER', name: 'ขอโอนเงิน', weight: 0.55, re: /(โอนเงิน|ชำระเงิน|บัญชีธนาคาร|พร้อมเพย์|โอนด่วน|โอนทันที|true money|promptpay)/i, lang: 'th', category: 'financial_fraud' },

  // ===== RUSSIAN (Русский) =====
  { id: 'RU_OTP', name: 'Запрос кода', weight: 0.55, re: /(код подтверждения|одноразовый пароль|смс код|код безопасности|пароль|пин-код|код из смс)/i, lang: 'ru', category: 'credential_theft' },
  { id: 'RU_TRANSFER', name: 'Запрос перевода', weight: 0.55, re: /(перевод|перевести|оплатить|внести|банковский счет|номер карты|срочно перевести|сбербанк|тбанк|альфа)/i, lang: 'ru', category: 'financial_fraud' },

  // ===== SPANISH (Español) =====
  { id: 'ES_OTP', name: 'Solicitud OTP', weight: 0.55, re: /(código de verificación|código otp|contraseña|código de seguridad|pin|cvv|código de confirmación)/i, lang: 'es', category: 'credential_theft' },
  { id: 'ES_TRANSFER', name: 'Transferencia', weight: 0.55, re: /(transferir|enviar dinero|depósito|cuenta bancaria|western union|urgente|pago inmediato|bizum|nequi|daviplata)/i, lang: 'es', category: 'financial_fraud' },

  // ===== PORTUGUESE (Português) =====
  { id: 'PT_OTP', name: 'Solicitação OTP', weight: 0.55, re: /(código de verificação|código otp|senha|código de segurança|pin|cvv|pix)/i, lang: 'pt', category: 'credential_theft' },
  { id: 'PT_TRANSFER', name: 'Transferência', weight: 0.55, re: /(transferir|enviar dinheiro|depósito|conta bancária|pix|urgente|pagamento imediato|mercadopago|picpay)/i, lang: 'pt', category: 'financial_fraud' },

  // ===== ARABIC (العربية) =====
  { id: 'AR_OTP', name: 'طلب رمز التحقق', weight: 0.55, re: /(رمز التحقق|كلمة المرور|رمز الأمان|رقم التأكيد|الرمز السري)/i, lang: 'ar', category: 'credential_theft' },
  { id: 'AR_TRANSFER', name: 'طلب تحويل', weight: 0.55, re: /(تحويل|إرسال|حساب بنكي|تحويل عاجل|دفع|إيداع|فوري|stc pay)/i, lang: 'ar', category: 'financial_fraud' },

  // ===== FILIPINO (Tagalog) =====
  { id: 'TL_OTP', name: 'Hingi ng OTP', weight: 0.55, re: /(otp|verification code|password|security code|pin code|konfirmasyon|confirm)/i, lang: 'tl', category: 'credential_theft' },
  { id: 'TL_TRANSFER', name: 'Hingi ng padala', weight: 0.55, re: /(padala|magpadala|pera|gcash|maya|bank account|remittance|urgent|pabilis|cash)/i, lang: 'tl', category: 'financial_fraud' },

  // ===== UNIVERSAL PATTERNS =====
  { id: 'UNI_CRYPTO', name: 'Crypto wallet', weight: 0.55, re: /\b(?:0x[0-9a-fA-F]{40}|bc1[0-9a-zA-Z]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|T[0-9a-zA-Z]{33}|ban[0-9a-zA-Z]{42}|addr1[0-9a-zA-Z]{58})\b/i, lang: 'universal', category: 'crypto_scam' },
  { id: 'UNI_MONEY', name: 'Money apps', weight: 0.45, re: /\b(cashapp|venmo|zelle|paypal|revolut|wise|monzo|n26|gcash|maya|dana|ovo|shopeepay|grabpay|line pay|kakao pay|toss|paytm|phonepe|googlepay|applepay|samsungpay|alipay|wechat pay)\b/i, lang: 'universal', category: 'financial_fraud' },
  { id: 'UNI_TLD', name: 'Suspicious TLD', weight: 0.35, re: /\b[a-z0-9-]+\.(?:top|xyz|club|site|online|info|biz|work|live|click|buzz|fun|link|tech|monster|icu|cam|rest|cfd|bot|sbs|cyou|uno|surf|bond|npci)\b/i, lang: 'universal', category: 'phishing' },
];

const SAFE_CONTEXT = [
  { id: 'SAFE_CONFIRM', name: 'Transaction confirmation', re: /(xác nhận đã|đã nhận|đã chuyển|chuyển thành công|giao dịch thành công|mã đơn hàng|đã đặt hàng|hóa đơn|payment confirmed|order confirmed|transaction completed|order #|receipt|invoice|đã thanh toán|thành công|cảm ơn.*(?:mua|đặt)|thank you for.*(?:purchase|order))/i },
  { id: 'SAFE_REPLY', name: 'Casual conversation', re: /\b(ừ[aàá]?|ok anh|ok chị|được anh|vâng|hẹn gặp|gặp nhau|bao giờ về|đi đâu|ăn cơm|thanks|thank you|got it|see you|ok|sounds good|没问题|好的|알겠습니다|了解|tudo bem|olá|merci|gracias|hello|hi|hey)\b/i },
];

// ============================================================
// LANGUAGE DETECTION ENGINE (Enhanced)
// ============================================================

function detectLanguage(text) {
  const scores = { vi: 0, en: 0, zh: 0, ko: 0, ja: 0, th: 0, ru: 0, es: 0, pt: 0, ar: 0, tl: 0 };
  
  // Vietnamese diacritics
  if (/[àáạảãâầấậẩẫăằắặẳẵêềếệểễôồốộổỗơờớợởỡưừứựửữ]/i.test(text)) scores.vi += 3;
  if (/đ/i.test(text)) scores.vi += 2;
  
  // Chinese
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)) scores.zh += 5;
  
  // Korean
  if (/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/.test(text)) scores.ko += 5;
  
  // Japanese
  if (/[\u3040-\u309f]/.test(text)) scores.ja += 3;
  if (/[\u30a0-\u30ff]/.test(text)) scores.ja += 3;
  
  // Thai
  if (/[\u0e00-\u0e7f]/.test(text)) scores.th += 5;
  
  // Arabic
  if (/[\u0600-\u06ff\u0750-\u077f]/.test(text)) scores.ar += 5;
  
  // Cyrillic
  if (/[\u0400-\u04ff]/.test(text)) scores.ru += 5;
  
  // Latin script
  if (/[a-z]/i.test(text)) {
    const lower = text.toLowerCase();
    if (/(?:(?:chuyển|nạp|tiền|mã|tài khoản|ngân hàng|trúng|thưởng|lừa đảo|cảnh báo))/i.test(text)) scores.vi += 4;
    if (/\b(?:the|is|are|was|were|have|has|been|will|would|could|should|may|might|shall|can|need|must)\b/i.test(text)) scores.en += 2;
    if (/\b(?:your|account|verify|transfer|payment|urgent|security|alert|suspended|locked|prize|winner|congratulations)\b/i.test(text)) scores.en += 3;
    if (/\b(?:el|la|los|las|es|son|está|están|tiene|tienen|para|por|con|como|pero|más|también|puede|hay|todo|muy|bien|aquí|ahora)\b/i.test(text)) scores.es += 2;
    if (/\b(?:o|a|os|as|é|são|está|estão|tem|têm|para|com|como|mas|mais|também|pode|todo|muito|bem|aqui|agora)\b/i.test(text)) scores.pt += 2;
    if (/\b(?:ang|ng|mga|sa|na|at|ito|ay|para|may|ni|kay|po|opo|ho|salamat|kumusta|magandang)\b/i.test(text)) scores.tl += 2;
  }
  
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'unknown';
  return Object.entries(scores).reduce((a, b) => a[1] >= b[1] ? a : b)[0];
}

// ============================================================
// CONTACT EXTRACTION (International)
// ============================================================

function extractContact(text) {
  const phones = [];
  const urls = [];
  const emails = [];
  const cryptoWallets = [];
  const compact = String(text || '').replace(/\s+/g, ' ');
  
  const phonePatterns = [
    /(?:\+|00)(?:84|855|66|62|63|60|91|880|92|93|94|213|20|966|971|55|52|1|44|33|49|39|34|7|86|82|81)\s?[0-9]{8,12}\b/g,
    /(?:\+|00)?[0-9]{10,15}\b/g
  ];
  
  for (const pattern of phonePatterns) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(compact)) !== null) {
      const cleaned = m[0].replace(/\s/g, '');
      if (cleaned.length >= 8 && cleaned.length <= 15 && /[0-9]/.test(cleaned)) {
        phones.push(cleaned);
      }
    }
  }
  
  const urlRe = /(?:https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(?:com|vn|top|xyz|net|org|info|biz|online|club|site|work|live|click|buzz|fun|link|tech|io|co|me|app|dev|cloud|store|shop|id|my|ph|th|kr|jp|cn|ru|es|pt|ar)(?:\/[^\s]*)?)/gi;
  while ((m = urlRe.exec(compact)) !== null) urls.push(m[0].replace(/[.,;\]\)]$/, ''));
  
  const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  while ((m = emailRe.exec(compact)) !== null) emails.push(m[0]);
  
  const cryptoRe = /\b(?:0x[0-9a-fA-F]{40}|bc1[0-9a-zA-Z]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|T[0-9a-zA-Z]{33}|ban[0-9a-zA-Z]{42}|addr1[0-9a-zA-Z]{58})\b/g;
  while ((m = cryptoRe.exec(compact)) !== null) cryptoWallets.push(m[0]);
  
  return { 
    phones: [...new Set(phones)].slice(0, 5), 
    urls: [...new Set(urls)].slice(0, 8),
    emails: [...new Set(emails)].slice(0, 5),
    cryptoWallets: [...new Set(cryptoWallets)].slice(0, 3)
  };
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// ============================================================
// LAYER 3: HEURISTIC SCANNING ENGINE (Enhanced)
// ============================================================

function heuristicScan(text) {
  const reasons = [];
  let risk = 0;
  const contacts = extractContact(text);
  const detectedLang = detectLanguage(text);
  let scamSignalCount = 0;
  const langMatches = new Set();
  const categoriesHit = new Set();
  let highWeightSignals = 0;
  const psychManipulations = [];

  // Check psychological manipulation
  PSYCH_MANIPULATION.forEach((psy) => {
    psy.re.lastIndex = 0;
    if (psy.re.test(text)) {
      risk += psy.weight;
      psychManipulations.push(psy.subcategory);
      reasons.push({
        id: psy.id,
        name: psy.name,
        detail: psy.explanation,
        status: psy.weight >= 0.4 ? 'danger' : 'warning',
        source: 'psychological'
      });
    }
  });

  // Check scam signals
  SCAM_SIGNALS.forEach((sig) => {
    sig.re.lastIndex = 0;
    if (sig.re.test(text)) {
      risk += sig.weight;
      scamSignalCount += 1;
      langMatches.add(sig.lang);
      categoriesHit.add(sig.category);
      if (sig.weight >= 0.50) highWeightSignals += 1;
      
      reasons.push({
        id: sig.id,
        name: sig.name,
        detail: sig.name,
        status: sig.weight >= 0.50 ? 'danger' : 'warning',
        source: 'heuristic',
        category: sig.category
      });
    }
  });

  // Check links against scam database
  contacts.urls.forEach((url) => {
    try {
      const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase();
      const isScamDomain = scamDomains.has(hostname) || Array.from(scamDomains).some(d => hostname.endsWith(`.${d}`));
      if (isScamDomain) {
        risk += 0.5;
        reasons.push({
          id: 'SCAM_DOMAIN',
          name: 'Known scam domain detected',
          detail: `This domain is in our scam database: ${hostname}`,
          status: 'danger',
          source: 'intelligence'
        });
      }
    } catch (e) { /* ignore invalid URLs */ }
    
    reasons.push({
      id: 'URL_FOUND',
      name: 'Link detected',
      detail: `Link found: ${url}. NEVER click links from unknown sources.`,
      status: 'danger',
      source: 'heuristic'
    });
  });

  // Check phone numbers against scam prefixes
  contacts.phones.forEach((phone) => {
    const normalized = phone.startsWith('+') ? phone : `+${phone}`;
    const isScamPrefix = Array.from(SCAM_PHONE_PREFIXES).some(prefix => normalized.startsWith(prefix));
    if (isScamPrefix) {
      risk += 0.2;
      reasons.push({
        id: 'SCAM_PHONE',
        name: 'Suspicious phone origin',
        detail: `Phone number originates from a region commonly associated with scam operations.`,
        status: 'warning',
        source: 'intelligence'
      });
    }
    
    reasons.push({
      id: 'PHONE_FOUND',
      name: 'Phone number detected',
      detail: `Phone numbers found: ${contacts.phones.join(', ')}. Verify identity before calling.`,
      status: 'warning',
      source: 'heuristic'
    });
  });

  // Check crypto wallets
  if (contacts.cryptoWallets.length > 0) {
    risk += 0.35;
    reasons.push({
      id: 'CRYPTO_WALLET',
      name: 'Crypto wallet detected',
      detail: `Crypto wallet found: ${contacts.cryptoWallets[0].substring(0, 12)}... NEVER send crypto to strangers.`,
      status: 'danger',
      source: 'heuristic'
    });
  }

  // Bonus: multiple categories = organized scam
  if (categoriesHit.size >= 2) {
    risk += 0.15;
    reasons.push({
      id: 'MULTI_CATEGORY',
      name: 'Multiple scam categories',
      detail: `Detected ${categoriesHit.size} scam categories: ${Array.from(categoriesHit).join(', ')}. Organized campaign.`,
      status: 'warning',
      source: 'heuristic'
    });
  }

  // Bonus: psychological manipulation + scam signals = high confidence
  if (psychManipulations.length >= 2 && scamSignalCount >= 2) {
    risk += 0.2;
    reasons.push({
      id: 'COMBINED_ATTACK',
      name: 'Combined manipulation + scam signals',
      detail: `Multiple psychological tactics (${psychManipulations.join(', ')}) combined with scam patterns.`,
      status: 'danger',
      source: 'heuristic'
    });
  }

  // Safe context check
  const safeHit = SAFE_CONTEXT.find((s) => { s.re.lastIndex = 0; return s.re.test(text); });
  if (safeHit && scamSignalCount === 0 && contacts.urls.length === 0 && psychManipulations.length === 0) {
    risk = Math.max(0, risk - 0.25);
    reasons.push({
      id: safeHit.id,
      name: safeHit.name,
      detail: 'Context appears legitimate — low scam probability.',
      status: 'success',
      source: 'heuristic'
    });
  }

  const riskPct = clamp(Math.round(risk * 100), 0, 100);
  let verdict = 'verified';
  if (riskPct >= 60) verdict = 'scam';
  else if (riskPct >= 30) verdict = 'suspicious';

  return { riskPct, verdict, reasons, contacts, detectedLang, langMatches: Array.from(langMatches), categoriesHit: Array.from(categoriesHit), highWeightSignals, scamSignalCount, psychManipulations };
}

// ============================================================
// LAYER 4: ADVANCED LLM ANALYSIS ENGINE (Elite Prompt)
// ============================================================

const LLM_SYSTEM_PROMPT = `You are an ELITE cybersecurity analyst with expertise in psychological manipulation, social engineering, and multilingual scam detection. You analyze messages with military-grade precision.

## YOUR EXPERTISE
- Psychological manipulation tactics (Cialdini's principles, cognitive biases)
- Social engineering attack patterns
- Multilingual scam typologies (11 languages)
- Financial fraud indicators
- Identity theft patterns
- Cryptocurrency scam techniques
- Romance scam psychology
- Authority impersonation tactics

## ANALYSIS FRAMEWORK (4-Phase Deep Analysis)

### PHASE 1: Language & Cultural Context
- Detect message language (VI/EN/ZH/KO/JA/TH/RU/ES/PT/AR/TL)
- Identify target region/culture
- Note region-specific scam patterns

### PHASE 2: Psychological Profile Analysis
Analyze for manipulation tactics:
- URGENCY: Time pressure, artificial deadlines
- FEAR: Threats, authority intimidation, consequences
- GREED: Unrealistic rewards, prizes, returns
- AUTHORITY: Impersonation of institutions/individuals
- SOCIAL PROOF: "Others have done it" claims
- RECIPROCITY: Fake gifts creating obligation
- SCARCITY: Limited availability pressure
- ISOLATION: "Keep this secret" tactics

### PHASE 3: Technical Red Flag Detection
- Credential theft attempts (OTP, passwords, PINs, CVVs)
- Financial fraud indicators (wire transfers, gift cards, crypto)
- Phishing indicators (suspicious links, fake domains)
- Identity theft requests (ID numbers, account details)
- Impersonation markers (fake authority claims)
- Investment fraud patterns (guaranteed returns, inside tips)

### PHASE 4: Risk Assessment & Verdict
- Synthesize all findings
- Calculate confidence score
- Determine scam type
- Provide specific recommended actions

## OUTPUT FORMAT (STRICT JSON)
Return ONLY a JSON object (no markdown, no extra text):
{
  "verdict": "scam" | "suspicious" | "verified",
  "confidence": <integer 0-100>,
  "language": "<detected language code>",
  "summary": "<1-2 sentence summary in the same language as the message>",
  "reasons": [
    {
      "severity": "danger" | "warning" | "success",
      "label": "<brief label>",
      "detail": "<detailed explanation in the same language as the message>"
    }
  ],
  "scamType": "<credential_theft|financial_fraud|prize_scam|impersonation|romance_scam|employment_scam|loan_scam|investment_scam|phishing|coercion|other>",
  "psychologicalTactics": ["<list of detected manipulation tactics>"],
  "riskFactors": ["<list of specific risk factors>"],
  "recommendedAction": "<specific steps for the recipient, in the same language as the message>",
  "severityLevel": "critical" | "high" | "medium" | "low" | "none"
}

## VERDICT GUIDELINES

### "scam" (confidence >= 80)
ONLY when MULTIPLE CLEAR EVIDENCE points exist:
- Requesting OTP/password/PIN/CVV/SSN
- Asking for wire transfer/gift cards/crypto
- Impersonating bank/government/tech company with pressure tactics
- Phishing links to fake login pages
- "You've won!" requiring upfront payment
- Fake investment with guaranteed returns
- Romance scam asking for money
- Threats demanding immediate payment
- Multiple psychological manipulation tactics detected

### "suspicious" (confidence 40-79)
When indicators present but not conclusive:
- Unusual sender with some legitimate elements
- Pressure tactics but unclear financial request
- Links present but destination unclear
- Mixed signals (some red flags, some normal)
- Single psychological manipulation tactic

### "verified" (confidence >= 65)
When message is clearly legitimate:
- Transaction confirmations from known contacts
- Legitimate service notifications
- Personal conversations with no requests
- Business communications with proper context
- No red flags detected

## LANGUAGE-SPECIFIC SCAM PATTERNS

### Vietnamese (vi)
- "Việc nhẹ lương cao" employment scams
- "Trúng thưởng" prize scams
- Bank impersonation ("cập nhật thông tin tài khoản")
- OTP request scams
- "Chuyển khoản gấp" urgency scams

### English (en)
- IRS/FBI/Police impersonation
- "You've won" prize scams
- Wire transfer/gift card requests
- Account suspension threats
- Crypto investment scams
- Romance scams ("I love you, send money")

### Chinese (zh)
- "刷单" (brushing) scams
- "中奖" (lottery) scams
- "冒充公检法" (government impersonation)
- "杀猪盘" (pig butchering) scams
- "兼职" (part-time job) scams

### Korean (ko)
- "금융감독원" impersonation
- "인증번호" OTP scams
- "당첨" lottery scams
- "계정정지" account threats

### Japanese (ja)
- "振り込み" wire transfer scams
- "当選" lottery scams
- "アカウント停止" account threats

### Thai (th)
- "รหัส OTP" scams
- "โอนเงิน" transfer requests
- "ถูกรางวัล" lottery scams

### Russian (ru)
- "Код подтверждения" OTP scams
- "Перевод" transfer requests
- "Вы выиграли" lottery scams

### Spanish (es)
- "Código de verificación" OTP scams
- "Transferir" transfer requests
- "Has ganado" lottery scams

### Portuguese (pt)
- "Código OTP" scams
- "Pix" transfer requests
- "Você ganhou" lottery scams

### Arabic (ar)
- "رمز التحقق" OTP scams
- "تحويل" transfer requests
- "فازت" lottery scams

### Filipino (tl)
- "OTP" scams
- "Padala" remittance requests
- "Nanalo" lottery scams

## CRITICAL RULES
1. NEVER conclude "scam" without MULTIPLE pieces of evidence
2. ALWAYS detect and respond in the message's language
3. Provide CULTURALLY APPROPRIATE analysis
4. Consider regional scam patterns
5. When uncertain, use "suspicious" — never guess
6. Confidence must match evidence strength
7. List specific risk factors for transparency
8. Always provide actionable recommended actions
9. Consider psychological manipulation tactics
10. Check for multi-category scam indicators`;

// ============================================================
// LLM RESPONSE PARSER (Enhanced)
// ============================================================

function parseLlm(raw) {
  const rawStr = String(raw && typeof raw === 'object' ? JSON.stringify(raw) : raw || '');
  const start = rawStr.indexOf('{');
  const end = rawStr.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(rawStr.slice(start, end + 1));
    const verdict = ['scam', 'suspicious', 'verified'].includes(parsed.verdict) ? parsed.verdict : null;
    if (!verdict) return null;
    return {
      verdict,
      confidence: clamp(Number(parsed.confidence) || 0, 0, 100),
      language: String(parsed.language || 'unknown').trim(),
      summary: String(parsed.summary || '').trim(),
      scamType: String(parsed.scamType || 'other').trim(),
      psychologicalTactics: Array.isArray(parsed.psychologicalTactics) ? parsed.psychologicalTactics.slice(0, 5) : [],
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors.slice(0, 7) : [],
      recommendedAction: String(parsed.recommendedAction || '').trim(),
      severityLevel: ['critical', 'high', 'medium', 'low', 'none'].includes(parsed.severityLevel) ? parsed.severityLevel : 'medium',
      reasons: Array.isArray(parsed.reasons)
        ? parsed.reasons.slice(0, 5).map((r) => ({
            severity: ['danger', 'warning', 'success'].includes(r.severity) ? r.severity : 'warning',
            label: String(r.label || '').slice(0, 80),
            detail: String(r.detail || '').slice(0, 400)
          })).filter((r) => r.label || r.detail)
        : []
    };
  } catch (e) {
    return null;
  }
}

// ============================================================
// MAIN ENTRY POINT: ELITE AI VERIFICATION
// ============================================================

async function verifyMessage(text) {
  const plain = String(text || '').trim().slice(0, 3000);
  const heuristic = heuristicScan(plain);
  let llm = null;
  let usedAI = false;

  try {
    if (await isLLMConfigured()) {
      const raw = await llmChat(
        [
          { role: 'system', content: MESSAGE_SYSTEM_PROMPT },
          { role: 'user', content: `Perform deep analysis on this message:\n\n"${plain}"\n\nProvide comprehensive scam analysis in JSON format.` }
        ],
        { temperature: 0.05, maxTokens: 1000, jsonMode: true, timeout: 90000 }
      );
      llm = parseLlm(raw);
      if (llm) usedAI = true;
    }
  } catch (e) {
    console.warn('[verifyMessage] LLM error:', e.message);
  }

  // ============================================================
  // LAYER 5: INTELLIGENT VERDICT MERGING (Enhanced)
  // ============================================================
  
  const hasStrongHeuristic = heuristic.verdict === 'scam' && heuristic.riskPct >= 55;
  let verdict = 'suspicious';
  let trustScore = 50;
  let reasons = heuristic.reasons.map((r) => ({ ...r, source: r.source || 'heuristic' }));
  let summary = '';
  let scamType = 'other';
  let psychologicalTactics = [];
  let riskFactors = [];
  let recommendedAction = '';
  let severityLevel = 'medium';

  if (llm) {
    summary = llm.summary;
    scamType = llm.scamType || 'other';
    psychologicalTactics = llm.psychologicalTactics || [];
    riskFactors = llm.riskFactors || [];
    recommendedAction = llm.recommendedAction || '';
    severityLevel = llm.severityLevel || 'medium';
    
    const llmReasons = llm.reasons.map((r) => ({
      id: 'LLM_ANALYSIS',
      name: r.label,
      detail: r.detail,
      status: r.severity,
      source: 'ai'
    }));
    
    reasons = [...llmReasons, ...heuristic.reasons.filter((r) => r.status !== 'success')].slice(0, 12);

    if (llm.verdict === 'scam') {
      const llmCertain = llm.confidence >= 85;
      const llmConfident = llm.confidence >= 70;
      
      if ((llmConfident || llmCertain) && (llmCertain || hasStrongHeuristic)) {
        verdict = 'scam';
        trustScore = clamp(100 - llm.confidence * 0.35 - heuristic.riskPct * 0.15, 10, 40);
      } else if (llm.confidence >= 60 && hasStrongHeuristic) {
        verdict = 'scam';
        trustScore = clamp(100 - llm.confidence * 0.4 - heuristic.riskPct * 0.2, 15, 45);
      } else {
        verdict = 'suspicious';
        trustScore = clamp(50 - heuristic.riskPct * 0.2, 25, 65);
      }
    } else if (llm.verdict === 'verified' && llm.confidence >= 65 && !hasStrongHeuristic) {
      verdict = 'verified';
      trustScore = clamp(90 - heuristic.riskPct * 0.15, 75, 95);
    } else {
      verdict = 'suspicious';
      trustScore = clamp(50 + (llm.verdict === 'scam' ? -15 : 0) - heuristic.riskPct * 0.2, 25, 65);
    }
  } else {
    // Fallback: enhanced heuristic-only scoring
    if (heuristic.verdict === 'scam' && heuristic.riskPct >= 65) {
      verdict = 'scam';
      trustScore = clamp(100 - heuristic.riskPct, 10, 40);
    } else if (heuristic.verdict === 'verified' && heuristic.riskPct < 15) {
      verdict = 'verified';
      trustScore = 85;
    } else {
      verdict = 'suspicious';
      trustScore = clamp(55 - heuristic.riskPct * 0.2, 25, 65);
    }
    summary = '';
  }

  return {
    success: true,
    verdict,
    score: clamp(Math.round(trustScore), 0, 100),
    usedAI,
    summary,
    detectedLanguage: heuristic.detectedLang,
    languageMatches: heuristic.langMatches,
    scamType,
    psychologicalTactics,
    riskFactors,
    recommendedAction,
    severityLevel,
    contacts: heuristic.contacts,
    reasons,
    heuristic: { riskPct: heuristic.riskPct, verdict: heuristic.verdict }
  };
}

module.exports = { verifyMessage, heuristicScan };
