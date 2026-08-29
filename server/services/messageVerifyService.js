// ============ MESSAGE VERIFY SERVICE v2 — AI-Powered Multilingual Scam Detection ============
// Deep analysis engine: Multi-layer heuristic + Advanced LLM reasoning
// Supports: VI, EN, ZH, KO, JA, TH, RU, ES, PT, AR, TL + universal patterns

const { llmChat, isLLMConfigured } = require('./llmClient');

// ============================================================
// LAYER 1: ADVANCED HEURISTIC SCANNING ENGINE
// ============================================================

const SCAM_SIGNALS = [
  // ===== VIETNAMESE =====
  { id: 'VI_LINK', name: 'Đường dẫn độc hại', weight: 0.35, re: /https?:\/\/[^\s]+|www\.[^\s]+|([a-z0-9-]+\.)+(top|xyz|club|site|online|info|biz|work|live|click|buzz)(?:\/|[\s]|$)/i, lang: 'vi', category: 'phishing' },
  { id: 'VI_OTP', name: 'Yêu cầu mã OTP / mật khẩu', weight: 0.50, re: /(mã otp|mã xác (?:nhận|thực)|ma otp|mật khẩu|password|mã pin|số cvv|secure code|mã chuyển tiền| mã xác minh)/i, lang: 'vi', category: 'credential_theft' },
  { id: 'VI_TRANSFER', name: 'Yêu cầu chuyển / nạp tiền', weight: 0.50, re: /(chuyển (?:khoản|tiền|khoan)|nạp (?:tiền|thẻ|card)|thanh toán (?:trước|trước )?cọc|đặt cọc|nạp thẻ|quét mã qr để nhận|chuyển gấp|gửi (?:tiền|gấp)|chuyển ngay|gửi钱)/i, lang: 'vi', category: 'financial_fraud' },
  { id: 'VI_JOB', name: 'Việc nhẹ lương cao', weight: 0.45, re: /(việc nhẹ|viec nhe|làm việc online|lam viec online|lương cao|luong cao|300.000|500.000|1 triệu|2 triệu|3 triệu|thu nhập thêm|hoàn đơn|hoàn phí|hoan don|đánh giá sản phẩm|danh gia san pham|nhận việc ngay|click like nhận|click.*follow.*nhận|nhận lương|thu nhập thụ động|kiếm tiền tại nhà)/i, lang: 'vi', category: 'employment_scam' },
  { id: 'VI_PRIZE', name: 'Trúng thưởng bất thường', weight: 0.45, re: /(trúng (?:thưởng|giải)|trung thuong|nhận (?:quà|thưởng)|hoàn tiền|hoan tien|quà tặng miễn phí|may mắn trúng|giải đặc biệt|khuyến mãi.*(?:100%|99%)|bốc thăm|quay số|trúng xe|trúng tiền)/i, lang: 'vi', category: 'prize_scam' },
  { id: 'VI_URGENCY', name: 'Áp lực thời gian / đe dọa', weight: 0.30, re: /(ngay lập tức|ngay bây giờ|trước (?:.\d+ |)(?:giờ|phút|ngày)|hết hiệu lực|tài khoản.*(?:bị khóa|bị đóng)|đóng tài khoản|hủy.*mã|vi phạm.*pháp luật|bị truy tố|bắt giữ|cơ quan công an|vneid|cccd.*cung cấp|phải nộp|bắt buộc|không sẽ)/i, lang: 'vi', category: 'coercion' },
  { id: 'VI_LOAN', name: 'Vay vốn bất thường', weight: 0.35, re: /(vay.*(?:nhanh|online|nóng|lãi suất thấp)|cho vay.*(?:không cần|không chứng|nhận ngay)|giải ngân|nổ hũ|tăng tiền|nạp.*nhận.*(?:tiền|phần thưởng)|vay không thẩm định|không cần hộ khẩu)/i, lang: 'vi', category: 'loan_scam' },
  { id: 'VI_ID', name: 'Yêu cầu CCCD / CMND', weight: 0.40, re: /(cung cấp.*(?:cccd|cmnd|căn cước|số tài khoản|địa chỉ|số thẻ|stk)|số tài khoản.*của|mã số thuế|ngày sinh|photo.*(?:cccd|cmnd|giấy tờ))/i, lang: 'vi', category: 'identity_theft' },
  { id: 'VI_BANK', name: 'Mạo danh ngân hàng', weight: 0.45, re: /(ngân hàng.*(?:yêu cầu|thông báo|cảnh báo)|updating.*(?:tài khoản|thông tin)|cập nhật.*(?:tài khoản|thông tin)|lỗi giao dịch|giao dịch thất bại|tài khoản bất thường)/i, lang: 'vi', category: 'impersonation' },

  // ===== ENGLISH =====
  { id: 'EN_OTP', name: 'OTP / password request', weight: 0.50, re: /\b(otp|one.?time.?password|verification code|security code|pin code|cvv|cvc|ssn|social security|account password|login credentials|confirm your identity|verify your account)\b/i, lang: 'en', category: 'credential_theft' },
  { id: 'EN_TRANSFER', name: 'Money transfer request', weight: 0.50, re: /\b(wire transfer|send money|transfer funds|western union|moneygram|bitcoin|crypto wallet|gift card|itunes|amazon card|steam card|reload|top.?up|deposit|pay now|urgent payment|bank account|routing number|account number|zelle|cashapp|venmo)\b/i, lang: 'en', category: 'financial_fraud' },
  { id: 'EN_JOB', name: 'Employment scam', weight: 0.45, re: /\b(work from home|easy money|earn \$\d+|make \$\d+|passive income|financial freedom|side hustle|no experience needed|hiring immediately|click like|follow and earn|data entry|envelope stuffing|reshipping|money mule)\b/i, lang: 'en', category: 'employment_scam' },
  { id: 'EN_PRIZE', name: 'Prize/lottery scam', weight: 0.45, re: /\b(you.?ve? won|congratulations.*winner|claim your prize|lottery winner|sweepstakes|grand prize|free gift|lucky draw|million dollar|inheritance|beneficiary|next of kin|unclaimed funds|settlement)\b/i, lang: 'en', category: 'prize_scam' },
  { id: 'EN_URGENCY', name: 'Urgency/threat', weight: 0.30, re: /\b(act now|immediate(ly)?|urgent|time.?sensitive|account (?:suspended|locked|closed|compromised|expiring|limited)|verify your account|failure to comply|legal action|arrest warrant|fbi|irs|police|lawsuit)\b/i, lang: 'en', category: 'coercion' },
  { id: 'EN_IMPERSONATE', name: 'Impersonation scam', weight: 0.50, re: /\b(this is (?:the|your) (?:irs|fbi|bank|police|microsoft|apple|amazon|netflix|irs|social security|medicare|customs)|your account has been|we detected unusual|security alert|unusual activity|suspicious login|unauthorized access)\b/i, lang: 'en', category: 'impersonation' },
  { id: 'EN_CRYPTO', name: 'Crypto/investment scam', weight: 0.45, re: /\b(double your|10x return|guaranteed profit|investment opportunity|crypto airdrop|free tokens|staking reward|yield farming|pump and dump|insider tip|before it goes public|forex signals|binary options)\b/i, lang: 'en', category: 'investment_scam' },
  { id: 'EN_LOAN', name: 'Loan scam', weight: 0.35, re: /\b(no credit check|guaranteed approval|instant loan|fast cash|emergency loan|low interest|0% APR|payday loan|cash advance|pre.?approved|debt consolidation)\b/i, lang: 'en', category: 'loan_scam' },
  { id: 'EN_ROMANCE', name: 'Romance scam', weight: 0.45, re: /\b(i love you|my darling|sweetheart|miss you|can.t wait to see you|sent you a gift|help me out|need money for|stranded|emergency funds|medical emergency|military deployment)\b/i, lang: 'en', category: 'romance_scam' },

  // ===== CHINESE (中文) =====
  { id: 'ZH_OTP', name: '验证码请求', weight: 0.50, re: /(验证码|密码|安全码|支付密码|交易密码|短信验证码|手机验证码|银行卡密码|动态码|授权码)/i, lang: 'zh', category: 'credential_theft' },
  { id: 'ZH_TRANSFER', name: '转账请求', weight: 0.50, re: /(转账|汇款|打款|付款|扫码支付|微信转账|支付宝转账|银行卡转账|紧急转账|立即转账|银行账户|收款码|收款账户|对公账户)/i, lang: 'zh', category: 'financial_fraud' },
  { id: 'ZH_PRIZE', name: '中奖诈骗', weight: 0.45, re: /(中奖|恭喜您|领奖|奖金|奖品|免费领取|幸运用户|恭喜发财|年终奖|红包|抽奖|摇一摇|砸金蛋|幸运转盘)/i, lang: 'zh', category: 'prize_scam' },
  { id: 'ZH_URGENCY', name: '紧急威胁', weight: 0.30, re: /(立即处理|紧急通知|账户异常|账户冻结|账户注销|涉嫌违法|公安局|检察院|法院传票|通缉令|立即配合|安全核查|资金清查|断卡行动)/i, lang: 'zh', category: 'coercion' },
  { id: 'ZH_LOAN', name: '贷款诈骗', weight: 0.35, re: /(无抵押贷款|秒批贷款|当天放款|低息贷款|免审核|额度提升|贷款到账|急用钱|白户可贷|黑户可贷|不上征信)/i, lang: 'zh', category: 'loan_scam' },
  { id: 'ZH_JOB', name: '兼职诈骗', weight: 0.45, re: /(刷单|做任务|日赚|兼职|在家赚钱|轻松赚钱|高薪|佣金|返现|抢单|淘宝刷单|抖音刷单|直播带货|代理|推广)/i, lang: 'zh', category: 'employment_scam' },
  { id: 'ZH_INVEST', name: '投资诈骗', weight: 0.45, re: /(内幕消息|稳赚不赔|高回报|投资理财|虚拟货币|区块链|原始股|上市公司|私募基金|杀猪盘|资金盘|拉人头)/i, lang: 'zh', category: 'investment_scam' },
  { id: 'ZH_IMPERSONATE', name: '冒充公检法', weight: 0.50, re: /(公安|检察|法院|纪委|监委|安全局|稽查|税务|社保|医保|快递丢失|理赔|客服|售后)/i, lang: 'zh', category: 'impersonation' },

  // ===== KOREAN (한국어) =====
  { id: 'KO_OTP', name: '인증번호 요청', weight: 0.50, re: /(인증번호|비밀번호|인증코드|보안코드|결제비밀번호|계좌비밀번호|승인번호|본인인증|실명인증)/i, lang: 'ko', category: 'credential_theft' },
  { id: 'KO_TRANSFER', name: '송금 요청', weight: 0.50, re: /(송금|이체|입금|계좌이체|카카오뱅크|토스|계좌번호|즉시송금|급히 송금|계좌izards|네이버페이|삼성페이)/i, lang: 'ko', category: 'financial_fraud' },
  { id: 'KO_PRIZE', name: '당첨 사기', weight: 0.45, re: /(당첨|축하|상품권|경품|선물|무료|이벤트 당첨|럭키|대박|복권|추첨)/i, lang: 'ko', category: 'prize_scam' },
  { id: 'KO_URGENCY', name: '긴급 상황', weight: 0.30, re: /(즉시|긴급|계정정지|계정삭제|이상거래|보안경고|경찰|검찰|법원|범죄|수사|범죄혐의)/i, lang: 'ko', category: 'coercion' },
  { id: 'KO_IMPERSONATE', name: '기관 사칭', weight: 0.50, re: /(금융감독원|국세청|경찰청|검찰|법원|행정안전부|보건복지부|국민건강보험|공정거래위원회)/i, lang: 'ko', category: 'impersonation' },

  // ===== JAPANESE (日本語) =====
  { id: 'JA_OTP', name: '認証コード要求', weight: 0.50, re: /(認証番号|パスワード|暗証番号|セキュリティコード|確認番号|ワンタイムパスワード|本人確認)/i, lang: 'ja', category: 'credential_theft' },
  { id: 'JA_TRANSFER', name: '送金要求', weight: 0.50, re: /(振込|振替|送金|入金|口座番号|銀行口座|即時送金|緊急送金|コンビニ入金)/i, lang: 'ja', category: 'financial_fraud' },
  { id: 'JA_PRIZE', name: '詐欺キャンペーン', weight: 0.45, re: /(当選|おめでとう|景品|プレゼント|無料|キャンペーン|宝くじ|抽選|当選通知)/i, lang: 'ja', category: 'prize_scam' },
  { id: 'JA_URGENCY', name: '緊急対応', weight: 0.30, re: /(至急|緊急|アカウント停止|アカウント削除|不正利用|セキュリティ警告|警察|捜査|詐欺|犯罪)/i, lang: 'ja', category: 'coercion' },

  // ===== THAI (ภาษาไทย) =====
  { id: 'TH_OTP', name: 'ขอรหัส OTP', weight: 0.50, re: /(รหัส otp|รหัสยืนยัน|รหัสผ่าน|รหัสความปลอดภัย|รหัสบัตร|รหัส PIN|ยืนยันตัวตน)/i, lang: 'th', category: 'credential_theft' },
  { id: 'TH_TRANSFER', name: 'ขอโอนเงิน', weight: 0.50, re: /(โอนเงิน|ชำระเงิน|บัญชีธนาคาร|พร้อมเพย์|โอนด่วน|โอนทันที|转账|true money|promptpay)/i, lang: 'th', category: 'financial_fraud' },
  { id: 'TH_PRIZE', name: 'หลอกลวงรางวัล', weight: 0.45, re: /(ถูกรางวัล|โชคดี|ของรางวัล|ฟรี|โปรโมชั่น|ส่วนลด|ข้อเสนอพิเศษ|สุ่ม|ลุ้นรับ)/i, lang: 'th', category: 'prize_scam' },
  { id: 'TH_URGENCY', name: 'เร่งด่วน/ข่มขู่', weight: 0.30, re: /(ทันที|ด่วน|บัญชีถูกระงับ|บัญชีถูกปิด|ผิดกฎหมาย|ตำรวจ|ศาล|หมายจับ|สอบสวน)/i, lang: 'th', category: 'coercion' },

  // ===== RUSSIAN (Русский) =====
  { id: 'RU_OTP', name: 'Запрос кода', weight: 0.50, re: /(код подтверждения|одноразовый пароль|смс код|код безопасности|пароль|пин-код|код из смс)/i, lang: 'ru', category: 'credential_theft' },
  { id: 'RU_TRANSFER', name: 'Запрос перевода', weight: 0.50, re: /(перевод|перевести|оплатить|внести|банковский счет|номер карты|срочно перевести|сбербанк|тбанк|альфа)/i, lang: 'ru', category: 'financial_fraud' },
  { id: 'RU_PRIZE', name: 'Мошенничество с призами', weight: 0.45, re: /(вы выиграли|поздравляем|приз|выигрыш|бонус|подарок|бесплатно|лотерея|розыгрыш)/i, lang: 'ru', category: 'prize_scam' },
  { id: 'RU_URGENCY', name: 'Срочность/угроза', weight: 0.30, re: /(немедленно|срочно|аккаунт заблокирован|аккаунт удален|нарушение|полиция|суд|прокуратура|следственный)/i, lang: 'ru', category: 'coercion' },

  // ===== SPANISH (Español) =====
  { id: 'ES_OTP', name: 'Solicitud OTP', weight: 0.50, re: /(código de verificación|código otp|contraseña|código de seguridad|pin|cvv|código de confirmación)/i, lang: 'es', category: 'credential_theft' },
  { id: 'ES_TRANSFER', name: 'Solicitud de transferencia', weight: 0.50, re: /(transferir|enviar dinero|depósito|cuenta bancaria|western union|urgente|pago inmediato|bizum|nequi|daviplata)/i, lang: 'es', category: 'financial_fraud' },
  { id: 'ES_PRIZE', name: 'Estafa de premios', weight: 0.45, re: /(has ganado|felicidades|premio|sorteo|regalo|gratis|bono|lotería|el gordo|primitiva)/i, lang: 'es', category: 'prize_scam' },
  { id: 'ES_URGENCY', name: 'Urgencia/amenaza', weight: 0.30, re: /(ahora|inmediato|urgente|cuenta bloqueada|cuenta suspendida|policía|autoridad|demanda|guardia civil)/i, lang: 'es', category: 'coercion' },

  // ===== PORTUGUESE (Português) =====
  { id: 'PT_OTP', name: 'Solicitação OTP', weight: 0.50, re: /(código de verificação|código otp|senha|código de segurança|pin|cvv|pix)/i, lang: 'pt', category: 'credential_theft' },
  { id: 'PT_TRANSFER', name: 'Solicitação de transferência', weight: 0.50, re: /(transferir|enviar dinheiro|depósito|conta bancária|pix|urgente|pagamento imediato|mercadopago|picpay)/i, lang: 'pt', category: 'financial_fraud' },
  { id: 'PT_PRIZE', name: 'Estafa de prêmios', weight: 0.45, re: /(você ganhou|parabéns|prêmio|sorteio|presente|grátis|bônus|loteria|milionária)/i, lang: 'pt', category: 'prize_scam' },

  // ===== ARABIC (العربية) =====
  { id: 'AR_OTP', name: 'طلب رمز التحقق', weight: 0.50, re: /(رمز التحقق|كلمة المرور|رمز الأمان|رقم التأكيد|الرمز السري)/i, lang: 'ar', category: 'credential_theft' },
  { id: 'AR_TRANSFER', name: 'طلب تحويل', weight: 0.50, re: /(تحويل|إرسال|حساب بنكي|تحويل عاجل|دفع|إيداع|فوري|stc pay)/i, lang: 'ar', category: 'financial_fraud' },
  { id: 'AR_PRIZE', name: 'احتيال جوائز', weight: 0.45, re: /(فازت|مبروك|جوائز|هدايا|مجاني|לוטو|抽奖)/i, lang: 'ar', category: 'prize_scam' },

  // ===== FILIPINO (Tagalog) =====
  { id: 'TL_OTP', name: 'Hingi ng OTP', weight: 0.50, re: /(otp|verification code|password|security code|pin code|konfirmasyon|confirm)/i, lang: 'tl', category: 'credential_theft' },
  { id: 'TL_TRANSFER', name: 'Hingi ng padala', weight: 0.50, re: /(padala|magpadala|pera|gcash|maya|bank account|remittance|urgent|pabilis|cash)/i, lang: 'tl', category: 'financial_fraud' },
  { id: 'TL_PRIZE', name: 'Panloloko sa premyo', weight: 0.45, re: /(nanalo|congratulations|premyo|parisukat|pagkakataon|swerte|bigyan|lotto)/i, lang: 'tl', category: 'prize_scam' },

  // ===== UNIVERSAL PATTERNS (language-agnostic) =====
  { id: 'UNI_CRYPTO', name: 'Crypto wallet address', weight: 0.50, re: /\b(?:0x[0-9a-fA-F]{40}|bc1[0-9a-zA-Z]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|T[0-9a-zA-Z]{33}|ban[0-9a-zA-Z]{42}|addr1[0-9a-zA-Z]{58})\b/i, lang: 'universal', category: 'crypto_scam' },
  { id: 'UNI_MONEY', name: 'Money transfer apps', weight: 0.40, re: /\b(cashapp|venmo|zelle|paypal|revolut|wise|monzo|n26|gcash|maya|dana|ovo|shopeepay|grabpay|line pay|kakao pay|toss|paytm|phonepe|googlepay|applepay|samsungpay|alipay|wechat pay)\b/i, lang: 'universal', category: 'financial_fraud' },
  { id: 'UNI_TLD', name: 'Suspicious TLD', weight: 0.30, re: /\b[a-z0-9-]+\.(?:top|xyz|club|site|online|info|biz|work|live|click|buzz|fun|link|tech|monster|icu|cam|rest|cfd|bot|sbs|cyou|uno|surf|bond|sbs|npci)\b/i, lang: 'universal', category: 'phishing' },
  { id: 'UNI_URGENT_MONEY', name: 'Urgent money request pattern', weight: 0.40, re: /(?:urgent|紧急|긴급|至急|ด่วน|срочно|urgente|immediately|立即|즉시|直ちに|ทันที|немедленно|ahora|agora|الآن|agad).{0,20}(?:money|tiền|钱|송금|振込|โอนเงิน|перевод|dinero|dinheiro|padala|تحويل)/i, lang: 'universal', category: 'coercion' },
  { id: 'UNI_AGE', name: 'Age/gender targeting', weight: 0.25, re: /\b(?:single (?:mom|dad|lady|man|woman)|widow|widower|divorced|lonely|looking for love|seeking partner|单身|离婚|丧偶| 과부|未亡人|แม่หม้าย|أرمل)\b/i, lang: 'universal', category: 'romance_scam' },
];

const SAFE_CONTEXT = [
  { id: 'SAFE_CONFIRM', name: 'Transaction confirmation', re: /(xác nhận đã|đã nhận|đã chuyển|chuyển thành công|giao dịch thành công|mã đơn hàng|đã đặt hàng|hóa đơn|payment confirmed|order confirmed|transaction completed|order #|receipt|invoice|đã thanh toán|thành công|cảm ơn.*(?:mua|đặt)|thank you for.*(?:purchase|order))/i },
  { id: 'SAFE_REPLY', name: 'Casual conversation', re: /\b(ừ[aàá]?|ok anh|ok chị|được anh|vâng|hẹn gặp|gặp nhau|bao giờ về|đi đâu|ăn cơm|thanks|thank you|got it|see you|ok|sounds good|没问题|好的|알겠습니다|了解| عندك|índex|tudo bem|olá|merci|gracias|salut|hello|hi|hey)\b/i },
  { id: 'SAFE_NEWS', name: 'Legitimate news/service', re: /(bản tin|thời sự|tin tức|tin mới|cập nhật|news update|breaking news|weather forecast|dự báo|thời tiết|cảnh báo thiên tai|thông báo bảo trì|maintenance|scheduled|upcoming)/i },
];

// ============================================================
// LANGUAGE DETECTION ENGINE
// ============================================================

function detectLanguage(text) {
  const scores = { vi: 0, en: 0, zh: 0, ko: 0, ja: 0, th: 0, ru: 0, es: 0, pt: 0, ar: 0, tl: 0 };
  
  // Vietnamese diacritics
  if (/[àáạảãâầấậẩẫăằắặẳẵêềếệểễôồốộổỗơờớợởỡưừứựửữ]/i.test(text)) scores.vi += 3;
  if (/đ/i.test(text)) scores.vi += 2;
  
  // Chinese (CJK Unified Ideographs)
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)) scores.zh += 5;
  
  // Korean (Hangul)
  if (/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/.test(text)) scores.ko += 5;
  
  // Japanese (Hiragana/Katakana)
  if (/[\u3040-\u309f]/.test(text)) scores.ja += 3; // Hiragana
  if (/[\u30a0-\u30ff]/.test(text)) scores.ja += 3; // Katakana
  
  // Thai
  if (/[\u0e00-\u0e7f]/.test(text)) scores.th += 5;
  
  // Arabic
  if (/[\u0600-\u06ff\u0750-\u077f]/.test(text)) scores.ar += 5;
  
  // Cyrillic (Russian)
  if (/[\u0400-\u04ff]/.test(text)) scores.ru += 5;
  
  // Latin script languages
  if (/[a-z]/i.test(text)) {
    const lower = text.toLowerCase();
    
    // Vietnamese specific
    if (/(?:(?:chuyển|nạp|tiền|mã|tài khoản|ngân hàng|trúng|thưởng|lừa đảo|cảnh báo|ngay lập tức|việc nhẹ|lương cao))/i.test(text)) scores.vi += 4;
    
    // English specific
    if (/\b(?:the|is|are|was|were|have|has|been|will|would|could|should|may|might|shall|can|need|must)\b/i.test(text)) scores.en += 2;
    if (/\b(?:your|account|verify|transfer|payment|urgent|security|alert|suspended|locked|prize|winner|congratulations)\b/i.test(text)) scores.en += 3;
    
    // Spanish specific
    if (/\b(?:el|la|los|las|es|son|está|están|tiene|tienen|para|por|con|como|pero|más|también|puede|hay|todo|muy|bien|aquí|ahora)\b/i.test(text)) scores.es += 2;
    
    // Portuguese specific
    if (/\b(?:o|a|os|as|é|são|está|estão|tem|têm|para|com|como|mas|mais|também|pode|pode|todo|muito|bem|aqui|agora)\b/i.test(text)) scores.pt += 2;
    
    // Filipino specific
    if (/\b(?:ang|ng|mga|sa|na|at|ito|ay|para|may|ni|kay|po|opo|ho|bless|salamat|kumusta|magandang)\b/i.test(text)) scores.tl += 2;
  }
  
  // Find the highest scoring language
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
  
  // International phone patterns
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
  
  // URLs
  const urlRe = /(?:https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(?:com|vn|top|xyz|net|org|info|biz|online|club|site|work|live|click|buzz|fun|link|tech|io|co|me|app|dev|cloud|store|shop|id|my|ph|th|kr|jp|cn|ru|es|pt|ar)(?:\/[^\s]*)?)/gi;
  while ((m = urlRe.exec(compact)) !== null) urls.push(m[0].replace(/[.,;\]\)]$/, ''));
  
  // Emails
  const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  while ((m = emailRe.exec(compact)) !== null) emails.push(m[0]);
  
  // Crypto wallets
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
// LAYER 2: HEURISTIC SCANNING ENGINE
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

  SCAM_SIGNALS.forEach((sig) => {
    sig.re.lastIndex = 0;
    if (sig.re.test(text)) {
      risk += sig.weight;
      scamSignalCount += 1;
      langMatches.add(sig.lang);
      categoriesHit.add(sig.category);
      if (sig.weight >= 0.45) highWeightSignals += 1;
      
      reasons.push({
        id: sig.id,
        name: sig.name,
        detail: sig.name,
        status: sig.weight >= 0.45 ? 'danger' : 'warning',
        source: 'heuristic',
        category: sig.category
      });
    }
  });

  // Bonus: multiple categories = organized scam
  if (categoriesHit.size >= 2) {
    risk += 0.15;
    reasons.push({
      id: 'MULTI_CATEGORY',
      name: 'Multiple scam categories detected',
      detail: `Detected ${categoriesHit.size} scam categories (${Array.from(categoriesHit).join(', ')}). Organized scam campaign.`,
      status: 'warning',
      source: 'heuristic'
    });
  }

  // Bonus: high confidence signals
  if (highWeightSignals >= 2) {
    risk += 0.1;
  }

  if (contacts.phones.length > 0) {
    reasons.push({
      id: 'PHONE_FOUND',
      name: 'Phone number detected',
      detail: `Phone numbers found: ${contacts.phones.join(', ')}. Verify identity before calling.`,
      status: 'warning',
      source: 'heuristic'
    });
  }
  
  if (contacts.cryptoWallets.length > 0) {
    risk += 0.3;
    reasons.push({
      id: 'CRYPTO_WALLET',
      name: 'Crypto wallet address detected',
      detail: `Crypto wallet found: ${contacts.cryptoWallets[0].substring(0, 12)}... NEVER send crypto to strangers.`,
      status: 'danger',
      source: 'heuristic'
    });
  }
  
  contacts.urls.forEach((u) => {
    reasons.push({
      id: 'URL_FOUND',
      name: 'Suspicious link detected',
      detail: `Link found: ${u}. NEVER click links from unknown sources.`,
      status: 'danger',
      source: 'heuristic'
    });
  });

  // Safe context check
  const safeHit = SAFE_CONTEXT.find((s) => { s.re.lastIndex = 0; return s.re.test(text); });
  if (safeHit && scamSignalCount === 0 && contacts.urls.length === 0) {
    risk = Math.max(0, risk - 0.2);
    reasons.push({
      id: safeHit.id,
      name: safeHit.name,
      detail: 'Context appears personal/legitimate — low scam probability.',
      status: 'success',
      source: 'heuristic'
    });
  }

  const riskPct = clamp(Math.round(risk * 100), 0, 100);
  let verdict = 'verified';
  if (riskPct >= 60) verdict = 'scam';
  else if (riskPct >= 30) verdict = 'suspicious';

  return { riskPct, verdict, reasons, contacts, detectedLang, langMatches: Array.from(langMatches), categoriesHit: Array.from(categoriesHit), highWeightSignals, scamSignalCount };
}

// ============================================================
// LAYER 3: ADVANCED LLM ANALYSIS ENGINE
// ============================================================

const LLM_SYSTEM_PROMPT = `You are an elite cybersecurity analyst specializing in multilingual scam detection. You analyze messages across ALL languages with deep cultural and contextual understanding.

## YOUR MISSION
Analyze the provided message and determine if it's a scam, suspicious, or legitimate. You MUST:
1. Detect the language of the message
2. Analyze cultural context and scam patterns specific to that region
3. Identify ALL scam indicators with detailed reasoning
4. Provide a confidence-scored verdict

## ANALYSIS FRAMEWORK (Chain of Thought)
Before giving your verdict, mentally analyze:

### Step 1: Language & Cultural Context
- What language is this message in?
- What country/region is this targeting?
- What are common scam patterns in this region?

### Step 2: Content Analysis
- What is the message asking for? (money, info, action)
- Is there urgency or pressure tactics?
- Are there links, phone numbers, or account details?
- Does it impersonate an authority figure?

### Step 3: Red Flag Detection
- Credential theft attempts (OTP, passwords, PINs)
- Financial fraud (wire transfer, gift cards, crypto)
- Social engineering (urgency, fear, greed)
- Impersonation (banks, government, tech companies)
- Advance fee fraud (pay upfront to receive "prize")
- Romance/emotional manipulation

### Step 4: Legitimacy Check
- Is this from a known contact?
- Is the request reasonable?
- Are there verification methods available?
- Does it match legitimate communication patterns?

## OUTPUT FORMAT
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
  "scamType": "<type: credential_theft|financial_fraud|prize_scam|impersonation|romance_scam|employment_scam|loan_scam|investment_scam|phishing|coercion|other>",
  "riskFactors": ["<list of specific risk factors>"],
  "recommendedAction": "<what the recipient should do, in the same language as the message>"
}

## VERDICT GUIDELINES

### "scam" (confidence >= 75)
ONLY when CLEAR EVIDENCE exists:
- Requesting OTP/password/PIN/CVV/SSN
- Asking for wire transfer/gift cards/crypto
- Impersonating bank/government/tech company
- Phishing links to fake login pages
- "You've won!" requiring upfront payment
- Fake investment with guaranteed returns
- Romance scam asking for money
- Threats demanding immediate payment

### "suspicious" (confidence 40-74)
When indicators are present but not conclusive:
- Unusual sender with some legitimate elements
- Pressure tactics but unclear financial request
- Links present but destination unclear
- Mixed signals (some red flags, some normal)

### "verified" (confidence >= 60)
When message is clearly legitimate:
- Transaction confirmations from known contacts
- Legitimate service notifications
- Personal conversations with no requests
- Business communications with proper context

## LANGUAGE-SPECIFIC PATTERNS

### Vietnamese (vi)
Common scams: "việc nhẹ lương cao", "trúng thưởng", "chuyển khoản gấp", "mã OTP", "cập nhật thông tin tài khoản"
Legitimate patterns: Shopee/Tiki/Lazada notifications, bank transaction alerts, friend conversations

### English (en)
Common scams: "wire transfer", "you've won", "account suspended", "verify your identity", "gift cards"
Legitimate patterns: Bank alerts, delivery notifications, service updates

### Chinese (zh)
Common scams: "刷单", "中奖", "转账", "验证码", "冒充公检法", "杀猪盘"
Legitimate patterns: WeChat/Alipay notifications, Taobao orders, friend messages

### Korean (ko)
Common scams: "인증번호", "송금", "당첨", "계정정지", "금융감독원 사칭"
Legitimate patterns: KakaoTalk messages, bank notifications, delivery updates

### Japanese (ja)
Common scams: "認証番号", "振込", "当選", "アカウント停止", "裁判所通知"
Legitimate patterns: LINE messages, bank notifications, convenience store alerts

### Thai (th)
Common scams: "รหัส OTP", "โอนเงิน", "ถูกรางวัล", "บัญชีถูกระงับ"
Legitimate patterns: LINE messages, bank notifications, TrueMove alerts

### Russian (ru)
Common scams: "код подтверждения", "перевод", "вы выиграли", "аккаунт заблокирован"
Legitimate patterns: Sberbank notifications, VK messages, delivery updates

### Spanish (es)
Common scams: "código de verificación", "transferir", "has ganado", "cuenta bloqueada"
Legitimate patterns: WhatsApp messages, bank notifications, MercadoLibre updates

### Portuguese (pt)
Common scams: "código otp", "pix", "você ganhou", "conta bloqueada"
Legitimate patterns: WhatsApp messages, Nubank notifications, MercadoLivre updates

### Arabic (ar)
Common scams: "رمز التحقق", "تحويل", "فازت", "الحساب معلق"
Legitimate patterns: WhatsApp messages, STC notifications, Al Rajhi alerts

### Filipino (tl)
Common scams: "otp", "padala", "nanalo", "account locked"
Legitimate patterns: GCash/Maya notifications, Grab delivery, friend messages

## IMPORTANT RULES
1. NEVER conclude "scam" without specific evidence
2. ALWAYS detect and respond in the message's language
3. Provide CULTURALLY APPROPRIATE analysis
4. Consider regional scam patterns
5. When uncertain, use "suspicious" — never guess
6. Confidence must match evidence strength
7. List specific risk factors for transparency`;

// ============================================================
// LLM RESPONSE PARSER
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
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors.slice(0, 5) : [],
      recommendedAction: String(parsed.recommendedAction || '').trim(),
      reasons: Array.isArray(parsed.reasons)
        ? parsed.reasons.slice(0, 4).map((r) => ({
            severity: ['danger', 'warning', 'success'].includes(r.severity) ? r.severity : 'warning',
            label: String(r.label || '').slice(0, 80),
            detail: String(r.detail || '').slice(0, 300)
          })).filter((r) => r.label || r.detail)
        : []
    };
  } catch (e) {
    return null;
  }
}

// ============================================================
// MAIN ENTRY POINT: AI-POWERED VERIFICATION
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
          { role: 'system', content: LLM_SYSTEM_PROMPT },
          { role: 'user', content: `Analyze this message for scam indicators:\n\n"${plain}"\n\nProvide your analysis in JSON format.` }
        ],
        { temperature: 0.1, maxTokens: 800, jsonMode: true, timeout: 60000 }
      );
      llm = parseLlm(raw);
      if (llm) usedAI = true;
    }
  } catch (e) {
    console.warn('[verifyMessage] LLM error:', e.message);
  }

  // ============================================================
  // LAYER 4: INTELLIGENT VERDICT MERGING
  // ============================================================
  
  const hasStrongHeuristic = heuristic.verdict === 'scam' && heuristic.riskPct >= 55;
  let verdict = 'suspicious';
  let trustScore = 50;
  let reasons = heuristic.reasons.map((r) => ({ ...r, source: 'heuristic' }));
  let summary = '';
  let scamType = 'other';
  let riskFactors = [];
  let recommendedAction = '';

  if (llm) {
    summary = llm.summary;
    scamType = llm.scamType || 'other';
    riskFactors = llm.riskFactors || [];
    recommendedAction = llm.recommendedAction || '';
    
    const llmReasons = llm.reasons.map((r) => ({
      id: 'LLM_ANALYSIS',
      name: r.label,
      detail: r.detail,
      status: r.severity,
      source: 'ai'
    }));
    
    // Merge reasons: AI first, then heuristic (excluding duplicates)
    reasons = [...llmReasons, ...heuristic.reasons.filter((r) => r.status !== 'success')].slice(0, 10);

    if (llm.verdict === 'scam') {
      const llmCertain = llm.confidence >= 85;
      const llmConfident = llm.confidence >= 70;
      
      if ((llmConfident || llmCertain) && (llmCertain || hasStrongHeuristic)) {
        verdict = 'scam';
        trustScore = clamp(100 - llm.confidence * 0.35 - heuristic.riskPct * 0.15, 10, 45);
      } else if (llm.confidence >= 60 && hasStrongHeuristic) {
        verdict = 'scam';
        trustScore = clamp(100 - llm.confidence * 0.4 - heuristic.riskPct * 0.2, 15, 50);
      } else {
        verdict = 'suspicious';
        trustScore = clamp(50 - heuristic.riskPct * 0.2, 30, 68);
      }
    } else if (llm.verdict === 'verified' && llm.confidence >= 60 && !hasStrongHeuristic) {
      verdict = 'verified';
      trustScore = clamp(90 - heuristic.riskPct * 0.2, 72, 95);
    } else {
      verdict = 'suspicious';
      trustScore = clamp(50 + (llm.verdict === 'scam' ? -10 : 0) - heuristic.riskPct * 0.2, 30, 68);
    }
  } else {
    // Fallback: enhanced heuristic-only scoring
    if (heuristic.verdict === 'scam' && heuristic.riskPct >= 70) {
      verdict = 'scam';
      trustScore = clamp(100 - heuristic.riskPct, 15, 45);
    } else if (heuristic.verdict === 'verified' && heuristic.riskPct < 15) {
      verdict = 'verified';
      trustScore = 85;
    } else {
      verdict = 'suspicious';
      trustScore = clamp(58 - heuristic.riskPct * 0.2, 30, 68);
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
    riskFactors,
    recommendedAction,
    contacts: heuristic.contacts,
    reasons,
    heuristic: { riskPct: heuristic.riskPct, verdict: heuristic.verdict }
  };
}

module.exports = { verifyMessage, heuristicScan };
