/**
 * Training Examples for LLM-based Scam/Fake News Detection
 * Used to improve accuracy of AI classification
 */

// ============================================================
// WEB VERIFICATION TRAINING EXAMPLES (C9)
// ============================================================

const WEB_TRAINING_EXAMPLES = [
  // --- LEGITIMATE BUSINESSES ---
  {
    input: 'TITLE: Google - GMC | https://www.google.com/ | DESC: Search the world\'s information...',
    expected: { category: 'legit_business', risk: 0, summary: 'Trang chủ Google - công cụ tìm kiếm lớn nhất thế giới.' }
  },
  {
    input: 'TITLE: Facebook - log in or sign up | DESC: Facebook helps you connect...',
    expected: { category: 'legit_business', risk: 0, summary: 'Mạng xã hội Facebook - nền tảng kết nối bạn bè và gia đình.' }
  },
  {
    input: 'TITLE: Shopee Việt Nam | shopee.vn | DESC: Shopee - Mua và bán trên điện thoại',
    expected: { category: 'ecommerce', risk: 0, summary: 'Shopee - nền tảng thương mại điện tử phổ biến tại Việt Nam.' }
  },
  {
    input: 'TITLE: Tiki - Mua hàng online chính hãng | tiki.vn | DESC: Tiki.vn - Mua hàng online',
    expected: { category: 'ecommerce', risk: 0, summary: 'Tiki - trang thương mại điện tử Việt Nam, chuyên hàng chính hãng.' }
  },
  {
    input: 'TITLE: VnExpress - Đọc báo tin tức mới nhất | vnexpress.net | DESC: VnExpress.net',
    expected: { category: 'news', risk: 0, summary: 'Báo VnExpress - nguồn tin tức đáng tin cậy tại Việt Nam.' }
  },
  {
    input: 'TITLE: Github | www.github.com | DESC: GitHub is where over 100 million developers...',
    expected: { category: 'legit_business', risk: 0, summary: 'Nền tảng phát triển phần mềm GitHub.' }
  },
  {
    input: 'TITLE: Lazada Vietnam | lazada.vn | DESC: Sắm online Lazada',
    expected: { category: 'ecommerce', risk: 0, summary: 'Lazada - sàn thương mại điện tử tại Việt Nam.' }
  },
  {
    input: 'TITLE: BBC News - BBC.com | DESC: Breaking news, analysis...',
    expected: { category: 'news', risk: 0, summary: 'Đài BBC - hãng tin tức quốc tế uy tín.' }
  },
  {
    input: 'TITLE: Government Portal | chinhphu.vn | DESC: Cổng thông tin Chính phủ',
    expected: { category: 'gov_edu', risk: 0, summary: 'Cổng thông tin Chính phủ Việt Nam - trang chính thức.' }
  },
  {
    input: 'TITLE: DHK Education | daihoc.fpt.edu.vn | DESC: FPT University',
    expected: { category: 'gov_edu', risk: 0, summary: 'Trang thông tin giáo dục FPT University.' }
  },

  // --- GAMBLING SITES ---
  {
    input: 'TITLE: Fun88 - Casino Online | fun88.com | DESC: Cá cược trực tuyến, tỷ lệ kèo cao',
    expected: { category: 'gambling', risk: 65, summary: 'Trang cá cược Fun88 - casino online bất hợp pháp tại Việt Nam.' }
  },
  {
    input: 'TITLE: W88 - Nhà cái cá cược | w88vn.com | DESC: Cá độ bóng đá, slot game',
    expected: { category: 'gambling', risk: 70, summary: 'W88 - nhà cái cá cược trực tuyến, hoạt động bất hợp pháp.' }
  },
  {
    input: 'TITLE: FB88 - Đánh bài online | fb88bet.com | DESC: Baccarat, Poker, Xóc đĩa',
    expected: { category: 'gambling', risk: 65, summary: 'FB88 - trang đánh bạc online, vi phạm pháp luật Việt Nam.' }
  },
  {
    input: 'TITLE: Fi88 - Cá cược thể thao | fi88.com | DESC: Kèo bóng đá, casino trực tuyến',
    expected: { category: 'gambling', risk: 60, summary: 'Fi88 - trang cá cược thể thao và casino trực tuyến.' }
  },

  // --- SCAM WEBSITES ---
  {
    input: 'TITLE: Kiếm tiền Online - Nhận ngay 500k | desc: Đăng ký ngay, nhận tiền miễn phí, chỉ cần CCCD',
    expected: { category: 'scam', risk: 85, summary: 'Lừa đảo kiếm tiền online - yêu cầu CCCD để chiếm đoạt thông tin.' }
  },
  {
    input: 'TITLE: Vay tiền nhanh - 0% lãi suất | desc: Vay 10 triệu chỉ cần CMND, giải ngân trong 5 phút',
    expected: { category: 'scam', risk: 75, summary: 'Cho vay lãi suất thấp bất thường - có thể là lừa đảo.' }
  },
  {
    input: 'TITLE: Trúng thưởng iPhone 15 - Nhận ngay | desc: Bạn đã trúng thưởng! Nhập thông tin để nhận quà',
    expected: { category: 'scam', risk: 90, summary: 'Lừa đảo trúng thưởng - yêu cầu nhập thông tin cá nhân.' }
  },
  {
    input: 'TITLE: Đầu tư crypto - Lợi nhuận 30%/tháng | desc: Đầu tư Bitcoin, Ethereum, lợi nhuận cao',
    expected: { category: 'scam', risk: 80, summary: 'Lừa đảo đầu tư cryptocurrency - cam kết lợi nhuận bất thường.' }
  },
  {
    input: 'TITLE: Claim Your Airdrop Now | desc: Connect wallet to receive 1000 USDT free',
    expected: { category: 'scam', risk: 85, summary: 'Lừa đảo airdrop - yêu cầu kết nối ví để đánh cắp tài sản.' }
  },
  {
    input: 'TITLE: Job Offer - Work from Home | desc: Earn $5000/month, no experience needed, click here',
    expected: { category: 'scam', risk: 70, summary: 'Lừa đảo việc làm tại nhà - hứa hẹn thu nhập cao bất thường.' }
  },
  {
    input: 'TITLE: Lottery Winner - Claim Prize | desc: You have won $1,000,000! Send your bank details',
    expected: { category: 'scam', risk: 95, summary: 'Lừa đảo trúng xổ số quốc tế - yêu cầu thông tin ngân hàng.' }
  },
  {
    input: 'TITLE: Viral Video - Watch Now | desc: This video will be deleted in 24 hours, click to watch',
    expected: { category: 'scam', risk: 60, summary: 'Lừa đảo clickbait - tạo cảm giác gấp rút để lừa click.' }
  },

  // --- PHISHING SITES ---
  {
    input: 'TITLE: Apple ID Support | desc: Verify your Apple ID, enter password and credit card',
    expected: { category: 'phishing', risk: 90, summary: 'Phishing Apple ID - mạo danh Apple để đánh cắp thông tin đăng nhập.' }
  },
  {
    input: 'TITLE: Vietcombank Security | desc: Your account is locked. Verify identity now',
    expected: { category: 'phishing', risk: 85, summary: 'Phishing ngân hàng Vietcombank - mạo danh để đánh cắp thông tin tài khoản.' }
  },
  {
    input: 'TITLE: Microsoft Account Verification | desc: Suspicious activity detected, verify now',
    expected: { category: 'phishing', risk: 85, summary: 'Phishing Microsoft - mạo danh để đánh cắp tài khoản.' }
  },
  {
    input: 'TITLE: Shopee Security Alert | desc: Your account will be locked, verify identity',
    expected: { category: 'phishing', risk: 80, summary: 'Phishing Shopee - mạo danh để đánh cắp thông tin.' }
  },

  // --- NEWS SITES ---
  {
    input: 'TITLE: Tin tức疫情 mới nhất | desc: Cập nhật tin tức疫情 hàng ngày',
    expected: { category: 'news', risk: 5, summary: 'Trang tin tức cập nhật thông tin疫情.' }
  },
  {
    input: 'TITLE: Tuổi Trẻ Online | tuoitre.vn | desc: Báo Tuổi Trẻ - tin tức mới nhất',
    expected: { category: 'news', risk: 0, summary: 'Báo Tuổi Trẻ - tờ báo uy tín tại Việt Nam.' }
  },
  {
    input: 'TITLE: Thanh Niên | thanhnien.vn | desc: Báo Thanh Niên - tin tức nóng hổi',
    expected: { category: 'news', risk: 0, summary: 'Báo Thanh Niên - tờ báo lớn tại Việt Nam.' }
  },

  // --- ADULT CONTENT ---
  {
    input: 'TITLE: XXX Videos | desc: Free adult content, 18+ only',
    expected: { category: 'adult', risk: 40, summary: 'Trang nội dung người lớn - không phù hợp.' }
  },

  // --- PARKED/REDIRECT ---
  {
    input: 'TITLE: Domain For Sale | desc: This domain is parked and available for purchase',
    expected: { category: 'parked', risk: 10, summary: 'Tên miền đang được rao bán.' }
  },
  {
    input: 'TITLE: Redirecting... | desc: You will be redirected in 5 seconds',
    expected: { category: 'redirect', risk: 30, summary: 'Trang chuyển hướng - có thể dẫn đến nội dung không mong muốn.' }
  },

  // --- BLOG ---
  {
    input: 'TITLE: My Personal Blog | desc: Sharing my thoughts about technology and life',
    expected: { category: 'blog', risk: 5, summary: 'Blog cá nhân chia sẻ về công nghệ và cuộc sống.' }
  },
  {
    input: 'TITLE: Cooking Tips | desc: Delicious recipes for your family',
    expected: { category: 'blog', risk: 0, summary: 'Blog nấu ăn chia sẻ công thức nấu ăn gia đình.' }
  },

  // --- SCAM WITH VIETNAMESE CONTEXT ---
  {
    input: 'TITLE: Schenker Recruitment | desc: Công ty tuyển dụng nhân viên... CLICK VÀO ĐÂY ĐỂ ĐĂNG KÝ',
    expected: { category: 'scam', risk: 55, summary: 'Trang tuyển dụng mạo danh - có dấu hiệu lừa đảo.' }
  },
  {
    input: 'TITLE: Shopee 9.9 Sale | desc: Bạn nhận được voucher 500k, nhấn vào đây để nhận',
    expected: { category: 'scam', risk: 70, summary: 'Lừa đảo voucher Shopee - mạo danh chương trình khuyến mãi.' }
  },
  {
    input: 'TITLE: Lazada Flash Sale | desc: Giảm giá 90% chỉ trong 1 tiếng, mua ngay',
    expected: { category: 'scam', risk: 65, summary: 'Lừa đảo flash sale - giảm giá bất thường để lừa mua hàng.' }
  },
  {
    input: 'TITLE: Zalo Pay Khuyến Mãi | desc: Nạp 100k nhận ngay 200k, nhanh tay lên',
    expected: { category: 'scam', risk: 75, summary: 'Lừa đảo ZaloPay - cam kết khuyến mãi bất thường.' }
  },
  {
    input: 'TITLE: Viettel Telecom | desc: Bạn trúng thưởng 50 triệu, gọi ngay để nhận',
    expected: { category: 'scam', risk: 80, summary: 'Lừa đảo trúng thưởng Viettel - mạo danh nhà mạng.' }
  },
  {
    input: 'TITLE: BIDV Security | desc: Tài khoản bị khóa, xác thực ngay tại link này',
    expected: { category: 'phishing', risk: 85, summary: 'Phishing ngân hàng BIDV - mạo danh để đánh cắp thông tin.' }
  },
  {
    input: 'TITLE: Techcombank | desc: Phát hiện giao dịch bất thường, xác nhận ngay',
    expected: { category: 'phishing', risk: 85, summary: 'Phishing Techcombank - mạo danh để đánh cắp thông tin.' }
  },
  {
    input: 'TITLE: MB Bank | desc: Vui lòng cập nhật thông tin CCCD để tránh bị khóa tài khoản',
    expected: { category: 'phishing', risk: 80, summary: 'Phishing MB Bank - yêu cầu cập nhật thông tin cá nhân.' }
  },
  {
    input: 'TITLE: ACB Online | desc: Xác thực tài khoản tại đây để nhận 100k',
    expected: { category: 'phishing', risk: 75, summary: 'Phishing ACB - mạo danh để đánh cắp thông tin tài khoản.' }
  },
  {
    input: 'TITLE: Sacombank | desc: Tài khoản sắp hết hạn, cập nhật ngay',
    expected: { category: 'phishing', risk: 75, summary: 'Phishing Sacombank - mạo danh để đánh cắp thông tin.' }
  }
];

// ============================================================
// MESSAGE VERIFICATION TRAINING EXAMPLES
// ============================================================

const MESSAGE_TRAINING_EXAMPLES = [
  // --- SCAM MESSAGES (Vietnamese) ---
  {
    input: 'NGÂN HÀNG QUỐC TẾ: Tài khoản của bạn sẽ bị khóa trong 24h. Xác thực ngay: bit.ly/verify-bank',
    expected: { verdict: 'scam', confidence: 92, scamType: 'phishing', language: 'vi' }
  },
  {
    input: 'Shopee: Bạn đã trúng thưởng voucher 500k! Nhận ngay tại: shopee-voucher.com',
    expected: { verdict: 'scam', confidence: 88, scamType: 'phishing', language: 'vi' }
  },
  {
    input: 'Viettel: Tài khoản sắp hết hạn. Nạp ngay 100k để nhận 200k. Gọi 1800xxxx để biết thêm',
    expected: { verdict: 'scam', confidence: 85, scamType: 'promotion_scam', language: 'vi' }
  },
  {
    input: 'Xin chào, tôi là luật sư của ngân hàng. Bạn thừa kế 5 tỷ USD từ người thân. Gửi phí nhận tiền: 5 triệu',
    expected: { verdict: 'scam', confidence: 95, scamType: 'advance_fee', language: 'vi' }
  },
  {
    input: 'Cảnh báo: Phát hiện đăng nhập bất thường từ nước ngoài. Xác thực tại: secure-vietcombank.com',
    expected: { verdict: 'scam', confidence: 90, scamType: 'phishing', language: 'vi' }
  },
  {
    input: 'Chào bạn, mình có việc gấp cần vay 5 triệu, chuyển vào tài khoản 123456789. Mình sẽ trả lại sau 3 ngày.',
    expected: { verdict: 'suspicious', confidence: 65, scamType: 'social_engineering', language: 'vi' }
  },
  {
    input: 'NHÀ NƯỚC: Bạn vi phạm giao thông, phạt 2 triệu. Thanh toán ngay tại: m traffic-portal.com',
    expected: { verdict: 'scam', confidence: 88, scamType: 'impersonation', language: 'vi' }
  },
  {
    input: 'CÔNG AN: Bạn liên quan đến vụ án rửa tiền. Gọi ngay 0987654321 để được hỗ trợ',
    expected: { verdict: 'scam', confidence: 92, scamType: 'impersonation', language: 'vi' }
  },
  {
    input: 'BÁO CÁO THUẾ: Bạn có khoản hoàn thuế 5 triệu. Cung cấp số tài khoản để nhận tiền',
    expected: { verdict: 'scam', confidence: 85, scamType: 'impersonation', language: 'vi' }
  },
  {
    input: 'Lazada: Flash sale 99% off chỉ còn 1 tiếng. Mua ngay tại: lazada-sale.net',
    expected: { verdict: 'scam', confidence: 75, scamType: 'fake_promotion', language: 'vi' }
  },
  {
    input: 'Bạn ơi, cho mình mượn CCCD photograph được không? Mình cần đăng ký khoản vay.',
    expected: { verdict: 'suspicious', confidence: 70, scamType: 'identity_theft', language: 'vi' }
  },
  {
    input: 'CẢNH BÁO: Tài khoản ngân hàng của bạn sẽ bị đóng băng trong 12 giờ. Xác minh ngay tại đường dẫn an toàn bên dưới để bảo vệ tài sản của bạn.',
    expected: { verdict: 'scam', confidence: 90, scamType: 'phishing', language: 'vi' }
  },
  {
    input: 'Chào bạn, mình là nhân viên hỗ trợ khách hàng. Mình thấy bạn có giao dịch bất thường 50 triệu. Bạn có thực hiện giao dịch này không?',
    expected: { verdict: 'suspicious', confidence: 60, scamType: 'social_engineering', language: 'vi' }
  },
  {
    input: 'Zalo: Bạn được tặng 1GB data miễn phí. Nhận ngay tại: zalo-promo.com',
    expected: { verdict: 'scam', confidence: 70, scamType: 'phishing', language: 'vi' }
  },
  {
    input: 'FPT Telecom: Gói internet sắp hết hạn. Gia hạn ngay để nhận ưu đãi giảm 50%',
    expected: { verdict: 'suspicious', confidence: 55, scamType: 'promotion_scam', language: 'vi' }
  },

  // --- SCAM MESSAGES (English) ---
  {
    input: 'CONGRATULATIONS! You have won $1,000,000 in the International Lottery! Click here to claim your prize: lottery-winner.com',
    expected: { verdict: 'scam', confidence: 95, scamType: 'lottery_scam', language: 'en' }
  },
  {
    input: 'Your Apple ID has been locked due to suspicious activity. Verify now at: apple-support.com/verify',
    expected: { verdict: 'scam', confidence: 92, scamType: 'phishing', language: 'en' }
  },
  {
    input: 'URGENT: Your bank account will be suspended. Verify your identity immediately at secure-bank.com',
    expected: { verdict: 'scam', confidence: 90, scamType: 'phishing', language: 'en' }
  },
  {
    input: 'You have been selected for a $500 Amazon gift card! Claim now: amazon-gift.com',
    expected: { verdict: 'scam', confidence: 85, scamType: 'fake_promotion', language: 'en' }
  },
  {
    input: 'Work from home! Earn $5000/day! No experience needed! Click here to start: work-from-home.com',
    expected: { verdict: 'scam', confidence: 80, scamType: 'job_scam', language: 'en' }
  },
  {
    input: 'Your package from DHL is waiting. Confirm delivery address: dhl-tracking.com',
    expected: { verdict: 'scam', confidence: 75, scamType: 'phishing', language: 'en' }
  },
  {
    input: 'Tax refund of $2,500 pending. Provide bank details to receive: tax-refund.gov.com',
    expected: { verdict: 'scam', confidence: 88, scamType: 'impersonation', language: 'en' }
  },
  {
    input: 'Your Netflix account will be cancelled. Update payment method: netflix-billing.com',
    expected: { verdict: 'scam', confidence: 82, scamType: 'phishing', language: 'en' }
  },
  {
    input: 'SECURITY ALERT: Someone tried to access your PayPal account. Verify now: paypal-secure.com',
    expected: { verdict: 'scam', confidence: 88, scamType: 'phishing', language: 'en' }
  },
  {
    input: 'You received a voice message. Listen here: voicemail-link.com',
    expected: { verdict: 'scam', confidence: 70, scamType: 'phishing', language: 'en' }
  },

  // --- SCAM MESSAGES (Chinese) ---
  {
    input: '【支付宝】您的账户存在安全风险，请立即验证：alipay-verify.com',
    expected: { verdict: 'scam', confidence: 90, scamType: 'phishing', language: 'zh' }
  },
  {
    input: '恭喜您中奖100万！点击领取：lottery-cn.com',
    expected: { verdict: 'scam', confidence: 92, scamType: 'lottery_scam', language: 'zh' }
  },
  {
    input: '【银行】您的账户将被冻结，请立即核实身份：bank-verify.cn',
    expected: { verdict: 'scam', confidence: 88, scamType: 'phishing', language: 'zh' }
  },

  // --- SCAM MESSAGES (Korean) ---
  {
    input: '당신은 100만원 상품권에 당첨되었습니다! 지금 수령하세요: prize-kr.com',
    expected: { verdict: 'scam', confidence: 88, scamType: 'lottery_scam', language: 'ko' }
  },
  {
    input: '【토스】계정이 도용될 위험이 있습니다. 즉시 인증하세요: toss-verify.com',
    expected: { verdict: 'scam', confidence: 90, scamType: 'phishing', language: 'ko' }
  },

  // --- SCAM MESSAGES (Japanese) ---
  {
    input: '【サプライズ】あなたは100万円に当選しました！今すぐ受け取りますか？: jp-prize.com',
    expected: { verdict: 'scam', confidence: 85, scamType: 'lottery_scam', language: 'ja' }
  },
  {
    input: '【楽天】アカウントに不正アクセスが検認されました。認証してください: rakuten-verify.jp',
    expected: { verdict: 'scam', confidence: 88, scamType: 'phishing', language: 'ja' }
  },

  // --- SCAM MESSAGES (Thai) ---
  {
    input: 'คุณได้รับรางวัล 100,000 บาท! คลิกเพื่อรับรางวัล: lottery-th.com',
    expected: { verdict: 'scam', confidence: 85, scamType: 'lottery_scam', language: 'th' }
  },

  // --- SCAM MESSAGES (Russian) ---
  {
    input: 'Поздравляем! Вы выиграли 1 000 000 рублей! Нажмите, чтобы получить приз: lottery-ru.com',
    expected: { verdict: 'scam', confidence: 88, scamType: 'lottery_scam', language: 'ru' }
  },

  // --- SCAM MESSAGES (Spanish) ---
  {
    input: '¡Felicidades! Ha ganado 1.000.000 de euros. Haga clic aquí para reclamar su premio: lottery-es.com',
    expected: { verdict: 'scam', confidence: 88, scamType: 'lottery_scam', language: 'es' }
  },

  // --- LEGITIMATE MESSAGES ---
  {
    input: 'Vietcombank: Giao dịch thành công 500,000 VND tại COOPMART. Số dư: 2,500,000 VND.',
    expected: { verdict: 'verified', confidence: 95, scamType: 'none', language: 'vi' }
  },
  {
    input: 'Shopee: Đơn hàng #123456 đã được giao thành công. Cảm ơn bạn đã mua sắm!',
    expected: { verdict: 'verified', confidence: 90, scamType: 'none', language: 'vi' }
  },
  {
    input: 'Grab: Tài xế Nguyễn Văn A đang trên đường đến đón bạn. Biển số: 51A-12345.',
    expected: { verdict: 'verified', confidence: 92, scamType: 'none', language: 'vi' }
  },
  {
    input: 'Your Amazon order #987654321 has shipped. Track your package at amazon.com/track.',
    expected: { verdict: 'verified', confidence: 90, scamType: 'none', language: 'en' }
  },
  {
    input: 'Google: Your verification code is 123456. Do not share this code with anyone.',
    expected: { verdict: 'verified', confidence: 95, scamType: 'none', language: 'en' }
  },
  {
    input: 'Microsoft: Your Microsoft 365 subscription renews on 01/01/2025 for $99.99.',
    expected: { verdict: 'verified', confidence: 92, scamType: 'none', language: 'en' }
  },
  {
    input: 'Lazada: Đơn hàng của bạn đã được xác nhận. Dự kiến giao hàng trong 2-3 ngày.',
    expected: { verdict: 'verified', confidence: 88, scamType: 'none', language: 'vi' }
  },
  {
    input: 'FPT Telecom: Hạn sử dụng gói cước INTERNET100 sẽ hết hạn vào 31/12/2024.',
    expected: { verdict: 'verified', confidence: 85, scamType: 'none', language: 'vi' }
  },

  // --- SUSPICIOUS MESSAGES ---
  {
    input: 'Bạn có muốn kiếm tiền online không? Inbox mình hướng dẫn.',
    expected: { verdict: 'suspicious', confidence: 55, scamType: 'potential_scam', language: 'vi' }
  },
  {
    input: 'Mình thấy bạn đăng bài về kinh doanh. Bạn có muốn hợp tác không?',
    expected: { verdict: 'suspicious', confidence: 40, scamType: 'unknown', language: 'vi' }
  },
  {
    input: 'Hey, I have a great investment opportunity for you. Interested?',
    expected: { verdict: 'suspicious', confidence: 55, scamType: 'potential_scam', language: 'en' }
  }
];

// ============================================================
// PROMPT TEMPLATES
// ============================================================

/**
 * Enhanced system prompt for web verification (C9)
 */
const WEB_SYSTEM_PROMPT = `Bạn là CHUYÊN GIA AN TOÀN THÔNG TIN và PHÂN TÍCH WEBSITE hàng đầu Việt Nam với 20 năm kinh nghiệm.

## NHIỆM VỤ
Phân tích nội dung website được cung cấp và đánh giá mức độ an toàn/lừa đảo.

## NGUYÊN TẮC PHÂN TÍCH
1. **Tin cậy**: Website có domain uy tín không? Có SSL không? Có thông tin liên hệ không?
2. **Nội dung**: Nội dung có hợp pháp không? Có dấu hiệu lừa đảo không?
3. **Hành vi**: Có yêu cầu thông tin nhạy cảm không? Có链接可疑 không?
4. **Ngữ cảnh Việt Nam**: Phù hợp với luật pháp Việt Nam không?

## CATEGORY DEFINITIONS
- **legit_business**: Doanh nghiệp thật, uy tín, có đăng ký kinh doanh
- **ecommerce**: Thương mại điện tử hợp pháp (Shopee, Lazada, Tiki...)
- **news**: Báo chí, tin tức uy tín (VnExpress, Tuổi Trẻ, Thanh Niên...)
- **blog**: Blog cá nhân, chia sẻ kiến thức
- **gov_edu**: Chính phủ, giáo dục (.gov, .edu)
- **gambling**: Cờ bạc, cá độ bất hợp pháp tại Việt Nam
- **scam**: Lừa đảo rõ ràng (yêu cầu tiền, thông tin nhạy cảm, link可疑)
- **phishing**: Mạo danh tổ chức để đánh cắp thông tin
- **parked**: Tên miền đang được rao bán
- **redirect**: Chuyển hướng đến trang khác
- **adult**: Nội dung người lớn
- **unknown**: Không thể xác định

## RISK SCORE GUIDELINES
- 0: Hoàn toàn bình thường (doanh nghiệp thật/tin tức)
- 10-20: Bình thường nhưng có vài điểm đáng chú ý
- 30-40: Đáng ngờ, cần cảnh giác
- 50-60: Có dấu hiệu lừa đảo, cần thận trọng
- 70-80: Lừa đảo rõ ràng, nên tránh
- 90-100: Phishing nguy hiểm, có thể gây thiệt hại nghiêm trọng

## ĐẶC BIỆT LƯU Ý CHO THỊ TRƯỜNG VIỆT NAM
- Lừa đảo trúng thưởng (iPhone, tiền mặt, voucher)
- Phishing ngân hàng (VCB, BIDV, Techcombank, MB Bank, ACB, Sacombank)
- Lừa đảo Shopee/Lazada/ZaloPay (voucher giả, flash sale giả)
- Lừa đảo tuyển dụng mạo danh
- Lừa đảo crypto/đầu tư (lợi nhuận bất thường)
- Cờ bạc trực tuyến bất hợp pháp
- Mạo danh công an, cơ quan nhà nước

## OUTPUT FORMAT
Trả về JSON duy nhất, KHÔNG thêm text khác:
{"summary":"<tóm tắt 1-2 câu bằng tiếng Việt>","category":"<category>","risk":<0-100>,"keywords":["<5 từ khóa>"]}

## EXAMPLES

### Ví dụ 1: Website hợp pháp
Input: TITLE: Shopee Vietnam | shopee.vn | DESC: Mua sắm online
Output: {"summary":"Shopee - sàn thương mại điện tử lớn nhất Việt Nam, uy tín.","category":"ecommerce","risk":0,"keywords":["Shopee","thương mại điện tử","mua sắm","online","uy tín"]}

### Ví dụ 2: Lừa đảo rõ ràng
Input: TITLE: Kiếm tiền online - Nhận ngay 500k | desc: Đăng ký ngay, chỉ cần CCCD
Output: {"summary":"Lừa đảo kiếm tiền online - yêu cầu CCCD để chiếm đoạt thông tin.","category":"scam","risk":85,"keywords":["lừa đảo","kiếm tiền","CCCD","gian lận","nguy hiểm"]}

### Ví dụ 3: Phishing ngân hàng
Input: TITLE: Vietcombank Security | desc: Verify your account now
Output: {"summary":"Phishing ngân hàng Vietcombank - mạo danh để đánh cắp thông tin tài khoản.","category":"phishing","risk":90,"keywords":["phishing","Vietcombank","mạo danh","tài khoản","nguy hiểm"]}

### Ví dụ 4: Cờ bạc
Input: TITLE: Fun88 Casino | fun88.com | DESC: Cá cược trực tuyến
Output: {"summary":"Trang cá cược Fun88 - casino online bất hợp pháp tại Việt Nam.","category":"gambling","risk":65,"keywords":["cờ bạc","Fun88","casino","cá cược","bất hợp pháp"]}

### Ví dụ 5: Tin tức
Input: TITLE: VnExpress | vnexpress.net | DESC: Đọc báo tin tức mới nhất
Output: {"summary":"Báo VnExpress - nguồn tin tức đáng tin cậy tại Việt Nam.","category":"news","risk":0,"keywords":["VnExpress","tin tức","báo","đáng tin","Việt Nam"]}

### Ví dụ 6: Lừa đảo crypto
Input: TITLE: Đầu tư crypto - Lợi nhuận 30%/tháng | desc: Đầu tư Bitcoin
Output: {"summary":"Lừa đảo đầu tư cryptocurrency - cam kết lợi nhuận bất thường.","category":"scam","risk":80,"keywords":["crypto","lừa đảo","đầu tư","Bitcoin","lợi nhuận"]}

### Ví dụ 7: Lừa đảo trúng thưởng
Input: TITLE: Trúng thưởng iPhone 15 | desc: Bạn đã trúng thưởng! Nhập thông tin
Output: {"summary":"Lừa đảo trúng thưởng - yêu cầu nhập thông tin cá nhân để chiếm đoạt.","category":"scam","risk":90,"keywords":["trúng thưởng","iPhone","lừa đảo","thông tin","nguy hiểm"]}

### Ví dụ 8: Lừa đảo Shopee
Input: TITLE: Shopee 9.9 Sale | desc: Bạn nhận được voucher 500k
Output: {"summary":"Lừa đảo voucher Shopee - mạo danh chương trình khuyến mãi.","category":"scam","risk":70,"keywords":["Shopee","voucher","lừa đảo","khuyến mãi","giả mạo"]}

### Ví dụ 9: Blog cá nhân
Input: TITLE: My Blog | desc: Chia sẻ về công nghệ
Output: {"summary":"Blog cá nhân chia sẻ kiến thức về công nghệ.","category":"blog","risk":0,"keywords":["blog","công nghệ","chia sẻ","cá nhân","kiến thức"]}

### Ví dụ 10: Lừa đảo việc làm
Input: TITLE: Work from Home | desc: Earn $5000/month, no experience
Output: {"summary":"Lừa đảo việc làm tại nhà - hứa hẹn thu nhập cao bất thường.","category":"scam","risk":70,"keywords":["việc làm","lừa đảo","thu nhập","online","gian lận"]}

## QUAN TRỌNG
- Phân tích kỹ nội dung, KHÔNG bỏ qua dấu hiệu lừa đảo
- Ưu tiên an toàn cho người dùng Việt Nam
- Nếu có nghi ngờ, chấm điểm cao hơn (thà cáo giác nhầm còn hơn bỏ sót)
- Trả về JSON NGAY LẬP TỨC, không giải thích`;

/**
 * Enhanced system prompt for message verification
 */
const MESSAGE_SYSTEM_PROMPT = `Bạn là CHUYÊN GIA AN TOÀN THÔNG TIN và PHÂN TÍCH TIN NHẮN hàng đầu thế giới với 20 năm kinh nghiệm về tâm lý học, kỹ thuật xã hội và phát hiện lừa đảo đa ngôn ngữ.

## NHIỆM VỤ
Phân tích tin nhắn được cung cấp và đánh giá mức độ an toàn/lừa đảo.

## PHƯƠNG PHÁP PHÂN TÍCH 4 GIAI ĐOẠN

### GIAI ĐOẠN 1: Ngôn ngữ & Văn hóa
- Xác định ngôn ngữ (VI/EN/ZH/KO/JA/TH/RU/ES/PT/AR/TL)
- Xác định khu vực/văn hóa mục tiêu
- Lưu ý mẫu lừa đảo đặc thù theo vùng miền

### GIAI ĐOẠN 2: Phân tích Tâm lý
Phân tích các chiến thuật thao túng:
- **KHẨN CẤP**: Áp lực thời hạn, deadline giả
- **SỢ HÃI**: Đe dọa, hù dọa từ cơ quan chức năng
- **THAM LAM**: Phần thưởng, giải thưởng bất thường
- **QUYỀN LỰC**: Mạo danh tổ chức/cá nhân có thẩm quyền
- **BẰNG CHỨNG XÃ HỘI**: "Người khác đã làm rồi"
- **ƠN NGHĨA**: Quà tặng giả tạo tạo nghĩa vụ
- **KHAN HIẾM**: Áp lực thời gian, số lượng có hạn
- **CÁCH LY**: "Giữ bí mật"

### GIAI ĐOẠN 3: Dấu hiệu Kỹ thuật
- Yêu cầu thông tin đăng nhập (OTP, mật khẩu, PIN, CVV)
- Chỉ báo gian lận tài chính (chuyển khoản, thẻ quà tặng, crypto)
- Chỉ báo phishing (link可疑, domain giả)
- Yêu cầu đánh cắp danh tính (CCCD, thông tin tài khoản)
- Dấu hiệu mạo danh (giả quyền lực)
- Mẫu lừa đảo đầu tư (lợi nhuận cam kết, thông tin nội bộ)

### GIAI ĐOẠN 4: Đánh giá Rủi ro
- Tổng hợp tất cả phát hiện
- Tính điểm confidence
- Xác định loại lừa đảo
- Đưa ra hành động khuyến nghị cụ thể

## LOẠI LƯA ĐẢO
- **phishing**: Mạo danh tổ chức để đánh cắp thông tin
- **lottery_scam**: Lừa đảo trúng thưởng
- **advance_fee**: Lừa đảo phí trước (inheritance, lottery)
- **romance_scam**: Lừa đảo tình cảm
- **job_scam**: Lừa đảo việc làm
- **investment_scam**: Lừa đảo đầu tư
- **tech_support**: Lừa đảo hỗ trợ kỹ thuật
- **impersonation**: Mạo danh cơ quan chức năng
- **identity_theft**: Đánh cắp danh tính
- **social_engineering**: Kỹ thuật xã hội
- **promotion_scam**: Khuyến mãi giả
- **fake_promotion**: Giảm giá giả
- **crypto_scam**: Lừa đảo cryptocurrency
- **none**: Không phải lừa đảo
- **other**: Loại khác

## VERDICT DEFINITIONS
- **scam**: Lừa đảo rõ ràng (confidence >= 70)
- **suspicious**: Đáng ngờ (confidence 40-69)
- **verified**: An toàn/đã xác minh (confidence >= 65, không có dấu hiệu lừa đảo)

## OUTPUT FORMAT
Trả về JSON duy nhất, KHÔNG thêm text khác:
{
  "verdict": "scam" | "suspicious" | "verified",
  "confidence": <0-100>,
  "language": "<mã ngôn ngữ>",
  "summary": "<tóm tắt 1-2 câu>",
  "scamType": "<loại lừa đảo>",
  "psychologicalTactics": ["<chiến thuật tâm lý>"],
  "riskFactors": ["<yếu tố rủi ro>"],
  "recommendedAction": "<hành động khuyến nghị>",
  "severityLevel": "low" | "medium" | "high" | "critical",
  "reasons": [{"label": "<tên>", "detail": "<chi tiết>", "severity": "success" | "info" | "warning" | "danger"}]
}

## EXAMPLES

### Ví dụ 1: Lừa đảo ngân hàng (Vietnamese)
Input: CẢNH BÁO: Tài khoản ngân hàng của bạn sẽ bị đóng băng trong 12 giờ. Xác minh ngay tại đường dẫn an toàn bên dưới.
Output: {"verdict":"scam","confidence":90,"language":"vi","summary":"Lừa đảo phishing ngân hàng - mạo danh thông báo đóng băng tài khoản để đánh cắp thông tin.","scamType":"phishing","psychologicalTactics":["fear","urgency","authority"],"riskFactors":["yêu cầu xác minh qua link","đe dọa đóng băng tài khoản","link可疑"],"recommendedAction":"KHÔNG click vào link. Liên hệ ngân hàng trực tiếp.","severityLevel":"critical","reasons":[{"label":"Mạo danh ngân hàng","detail":"Sử dụng tên ngân hàng để tạo niềm tin giả","severity":"danger"},{"label":"Áp lực thời gian","detail":"Đe dọa đóng băng trong 12 giờ","severity":"danger"},{"label":"Link可疑","detail":"Yêu cầu click vào link bên ngoài","severity":"danger"}]}

### Ví dụ 2: Lừa đảo trúng thưởng (Vietnamese)
Input: Shopee: Bạn đã trúng thưởng voucher 500k! Nhận ngay tại: shopee-voucher.com
Output: {"verdict":"scam","confidence":88,"language":"vi","summary":"Lừa đảo voucher Shopee - mạo danh chương trình khuyến mãi để đánh cắp thông tin.","scamType":"phishing","psychologicalTactics":["greed","social_proof"],"riskFactors":["domain giả mạo","yêu cầu nhập thông tin","voucher bất thường"],"recommendedAction":"KHÔNG click vào link. Kiểm tra khuyến mãi chính thức trên app Shopee.","severityLevel":"high","reasons":[{"label":"Domain giả","detail":"shopee-voucher.com không phải domain chính thức của Shopee","severity":"danger"},{"label":"Voucher bất thường","detail":"500k voucher quá lớn so với thông thường","severity":"warning"},{"label":"Yêu cầu hành động","detail":"Nhấn vào link để nhận thưởng","severity":"danger"}]}

### Ví dụ 3: Tin nhắn hợp pháp (Vietnamese)
Input: Vietcombank: Giao dịch thành công 500,000 VND tại COOPMART. Số dư: 2,500,000 VND.
Output: {"verdict":"verified","confidence":95,"language":"vi","summary":"Thông báo giao dịch hợp pháp từ Vietcombank.","scamType":"none","psychologicalTactics":[],"riskFactors":[],"recommendedAction":"Không có hành động cần thiết.","severityLevel":"low","reasons":[{"label":"Thông báo giao dịch","detail":"Nội dung rõ ràng, đúng format SMS banking","severity":"success"},{"label":"Không có yêu cầu","detail":"Không yêu cầu click link hay cung cấp thông tin","severity":"success"}]}

### Ví dụ 4: Lừa đảo quốc tế (English)
Input: CONGRATULATIONS! You have won $1,000,000 in the International Lottery! Click here to claim.
Output: {"verdict":"scam","confidence":95,"language":"en","summary":"International lottery scam - no legitimate lottery requires winners to click links to claim prizes.","scamType":"lottery_scam","psychologicalTactics":["greed","urgency","social_proof"],"riskFactors":["unsolicited prize notification","click link required","too good to be true"],"recommendedAction":"Do not click. Delete immediately. No legitimate lottery works this way.","severityLevel":"critical","reasons":[{"label":"Unsolicited prize","detail":"You didn't enter any lottery","severity":"danger"},{"label":"Click required","detail":"Legitimate lotteries don't ask winners to click links","severity":"danger"},{"label":"Too good to be true","detail":"$1M prize is unrealistic","severity":"danger"}]}

### Ví dụ 5: Lừa đảo mạo danh công an (Vietnamese)
Input: CÔNG AN: Bạn liên quan đến vụ án rửa tiền. Gọi ngay 0987654321 để được hỗ trợ
Output: {"verdict":"scam","confidence":92,"language":"vi","summary":"Lừa đảo mạo danh công an - cơ quan thực thi pháp luật không gọi điện yêu cầu tiền.","scamType":"impersonation","psychologicalTactics":["fear","authority","urgency"],"riskFactors":["mạo danh cơ quan nhà nước","số điện thoại cá nhân","yêu cầu gọi ngay"],"recommendedAction":"KHÔNG gọi. Công an không hoạt động qua điện thoại. Báo cơ quan chức năng.","severityLevel":"critical","reasons":[{"label":"Mạo danh công an","detail":"Công an không gọi điện yêu cầu tiền hay thông tin","severity":"danger"},{"label":"Số điện thoại cá nhân","detail":"Số 0987654321 là số cá nhân, không phải số cơ quan","severity":"danger"},{"label":"Áp lực thời gian","detail":"Yêu cầu gọi ngay để tạo hoảng loạn","severity":"danger"}]}

### Ví dụ 6: Lừa đảo crypto (Vietnamese)
Input: Đầu tư crypto - Lợi nhuận 30%/tháng. Đầu tư Bitcoin, Ethereum, lợi nhuận cao
Output: {"verdict":"scam","confidence":80,"language":"vi","summary":"Lừa đảo đầu tư cryptocurrency - cam kết lợi nhuận 30%/tháng là bất thường và không thực tế.","scamType":"investment_scam","psychologicalTactics":["greed","social_proof"],"riskFactors":["lợi nhuận cam kết bất thường","không có thông tin pháp lý","rủi ro cao"],"recommendedAction":"KHÔNG đầu tư. Không có khoản đầu tư nào đảm bảo lợi nhuận cố định.","severityLevel":"high","reasons":[{"label":"Lợi nhuận bất thường","detail":"30%/tháng là không thực tế cho bất kỳ khoản đầu tư nào","severity":"danger"},{"label":"Thiếu thông tin pháp lý","detail":"Không có giấy phép kinh doanh hay thông tin công ty","severity":"warning"},{"label":"Rủi ro cao","detail":"Cryptocurrency biến động mạnh, không thể cam kết lợi nhuận","severity":"danger"}]}

### Ví dụ 7: Tin nhắn khả nghi (Vietnamese)
Input: Bạn có muốn kiếm tiền online không? Inbox mình hướng dẫn.
Output: {"verdict":"suspicious","confidence":55,"language":"vi","summary":"Tin nhắn khả mời chào kiếm tiền online - có thể là lừa đảo MLM hoặc Ponzi.","scamType":"social_engineering","psychologicalTactics":["greed","reciprocity"],"riskFactors":["không rõ danh tính","hứa hẹn kiếm tiền","yêu cầu inbox"],"recommendedAction":"Cẩn thận. Không cung cấp thông tin cá nhân. Tìm hiểu kỹ trước khi tham gia.","severityLevel":"medium","reasons":[{"label":"Không rõ danh tính","detail":"Người gửi không rõ ràng","severity":"warning"},{"label":"Hứa hẹn kiếm tiền","detail":"Không rõ hình thức kinh doanh cụ thể","severity":"warning"}]}

### Ví dụ 8: Lừa đảo ZaloPay (Vietnamese)
Input: ZaloPay Khuyến Mãi: Nạp 100k nhận ngay 200k, nhanh tay lên
Output: {"verdict":"scam","confidence":75,"language":"vi","summary":"Lừa đảo khuyến mãi ZaloPay - cam kết nạp tiền nhận gấp đôi là bất thường.","scamType":"promotion_scam","psychologicalTactics":["greed","scarcity","urgency"],"riskFactors":["khuyến mãi bất thường","áp lực thời gian","domain可疑"],"recommendedAction":"KIỂM TRA trên app ZaloPay chính thức. KHÔNG click vào link ngoài.","severityLevel":"high","reasons":[{"label":"Khuyến mãi bất thường","detail":"Nạp 100k nhận 200k là 100% lợi nhuận - không thực tế","severity":"danger"},{"label":"Áp lực thời gian","detail":"Nhanh tay lên tạo cảm giác gấp rút","severity":"warning"},{"label":"Domain可疑","detail":"Link có thể là domain giả mạo","severity":"danger"}]}

### Ví dụ 9: Lừa đảo Microsoft (English)
Input: Your Microsoft account has been compromised. Verify now at microsoft-security.com
Output: {"verdict":"scam","confidence":88,"language":"en","summary":"Microsoft phishing scam - fake domain used to steal credentials.","scamType":"phishing","psychologicalTactics":["fear","urgency","authority"],"riskFactors":["fake domain","credential theft attempt","impersonation of Microsoft"],"recommendedAction":"Do not enter credentials. Go directly to microsoft.com to check account status.","severityLevel":"critical","reasons":[{"label":"Fake domain","detail":"microsoft-security.com is not owned by Microsoft","severity":"danger"},{"label":"Credential theft","detail":"Attempting to steal login credentials","severity":"danger"},{"label":"Impersonation","detail":"Mposing as Microsoft security team","severity":"danger"}]}

### Ví dụ 10: Lừa đảo tuyển dụng (Vietnamese)
Input: TUYỂN DỤNG: Nhân viên văn phòng, lương 15-20 triệu, không yêu cầu kinh nghiệm. Liên hệ Zalo: 0912345678
Output: {"verdict":"suspicious","confidence":65,"language":"vi","summary":"Tin tuyển dụng khả nghi - lương cao bất thường, không yêu cầu kinh nghiệm.","scamType":"job_scam","psychologicalTactics":["greed","social_proof"],"riskFactors":["lương cao bất thường","không yêu cầu kinh nghiệm","liên hệ qua Zalo cá nhân"],"recommendedAction":"Tìm hiểu kỹ về công ty. KHÔNG nộp phí hay cung cấp thông tin nhạy cảm.","severityLevel":"medium","reasons":[{"label":"Lương bất thường","detail":"15-20 triệu cho vị trí không yêu cầu kinh nghiệm là cao","severity":"warning"},{"label":"Liên hệ cá nhân","detail":"Sử dụng Zalo cá nhân thay vì email công ty","severity":"warning"},{"label":"Thiếu thông tin","detail":"Không rõ tên công ty, địa chỉ","severity":"warning"}]}

## QUAN TRỌNG
- Phân tích TẤT CẢ các ngôn ngữ
- Đặc biệt cảnh giác với lừa đảo tại Việt Nam
- Nếu có nghi ngờ, đánh giá là "suspicious" hoặc "scam"
- KHÔNG bao giờ bỏ qua dấu hiệu lừa đảo
- Trả về JSON NGAY LẬP TỨC, không giải thích`;

module.exports = {
  WEB_TRAINING_EXAMPLES,
  MESSAGE_TRAINING_EXAMPLES,
  WEB_SYSTEM_PROMPT,
  MESSAGE_SYSTEM_PROMPT
};
