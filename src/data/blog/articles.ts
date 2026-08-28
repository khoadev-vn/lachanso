export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  content: string;
  contentEn?: string;
  category: string;
  categoryEn?: string;
  tags: string[];
  publishedAt: string;
  readTime: number;
  image?: string;
  author: string;
  pinned?: boolean;
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: "11",
    slug: "cam-on-unikorn-vi-da-dong-hanh",
    title: "LÁ CHẮN SỐ × UNIKORN — CẢM ƠN VÌ ĐÃ ĐỒNG HÀNH",
    description: "Unikorn đã hỗ trợ tài trợ công nghệ cho Lá Chắn Số và cùng đưa sản phẩm đến gần hơn với cộng đồng startup Việt Nam. Cảm ơn Unikorn vì đã tin tưởng và đồng hành.",
    category: "Đồng Hành",
    categoryEn: "Partners",
    titleEn: "LÁ CHẮN SỐ × UNIKORN — THANK YOU FOR YOUR PARTNERSHIP",
    descriptionEn: "Unikorn has supported La Chan So with technology sponsorship, helping bring the product closer to Vietnam's startup community. Thank you Unikorn for your trust and partnership.",
    tags: ["unikorn", "đồng hành", "tài trợ", "startup"],
    publishedAt: "2026-08-09",
    readTime: 3,
    author: "Lá Chắn Số",
    pinned: true,
    content: `
## Cảm ơn vì đã đồng hành

Một dự án nhỏ, một hành trình lớn — và Lá Chắn Số rất vui khi trên hành trình đó có Unikorn đồng hành.

Lá Chắn Số xin gửi lời cảm ơn chân thành đến Unikorn vì đã hỗ trợ tài trợ công nghệ cho dự án, đồng thời tạo điều kiện để đội ngũ có thêm nền tảng và nguồn lực tiếp tục phát triển sản phẩm.

Đặc biệt, sự đồng hành này không chỉ dừng lại ở việc hỗ trợ công nghệ. Unikorn còn là nơi để Lá Chắn Số có cơ hội đưa sản phẩm đến gần hơn với cộng đồng startup và công nghệ Việt Nam.

## Top 3 Product of the Day trên Unikorn

Sau những ngày đầu ra mắt, Lá Chắn Số đã có những tín hiệu rất tích cực từ cộng đồng và đạt **Top 3 Product of the Day** trên Unikorn.

Đối với một dự án được xây dựng bởi một nhóm bạn trẻ, đây thực sự là một cột mốc rất đáng nhớ.

Chúng mình tin rằng những sản phẩm công nghệ có ý nghĩa không nhất thiết phải bắt đầu từ một đội ngũ lớn. Quan trọng là có một vấn đề đủ đáng để giải quyết, một tập thể đủ nghiêm túc để theo đuổi và những người đồng hành sẵn sàng tin tưởng.

Cảm ơn Unikorn vì đã tin tưởng và đồng hành cùng Lá Chắn Số.

Chặng đường phía trước vẫn còn rất dài. Lá Chắn Số sẽ luôn tiếp tục cải thiện sản phẩm, lắng nghe phản hồi từ cộng đồng và xây dựng một nền tảng kiểm chứng thông tin ngày càng hữu ích, dễ tiếp cận hơn.

## Lá Chắn Số × Unikorn

Cùng xây dựng một môi trường thông tin an toàn hơn cho cộng đồng Việt Nam.
    `,
    contentEn: `
## Thank You for Standing With Us

A small project, a big journey — and La Chan So is grateful to have Unikorn by our side.

La Chan So would like to express our sincere gratitude to Unikorn for sponsoring the project's technology needs and creating opportunities for the team to access the resources and foundations needed to continue developing the product.

More importantly, this partnership goes beyond just technology support. Unikorn also gave La Chan So the chance to bring our product closer to Vietnam's startup and technology community.

## Top 3 Product of the Day on Unikorn

In its early days, La Chan So received very positive signals from the community and achieved **Top 3 Product of the Day** on Unikorn.

For a project built by a group of young friends, this is truly a memorable milestone.

We believe that meaningful technology products don't necessarily need to start with a large team. What matters is having a problem worth solving, a team serious enough to pursue it, and partners willing to trust.

Thank you, Unikorn, for believing in and standing with La Chan So.

The road ahead is still long. La Chan So will continue to improve the product, listen to community feedback, and build an increasingly useful and accessible fact-checking platform.

## La Chan So × Unikorn

Together, let's build a safer information environment for the Vietnamese community.
    `
  },
  {
    id: "12",
    slug: "cam-on-vietnix-tai-tro-hosting",
    title: "Lời Cảm Ơn Đến Vietnix",
    description: "Vietnix đã đồng hành quý báu với Lá Chắn Số thông qua việc tài trợ hạ tầng hosting. Cảm ơn đội ngũ Vietnix vì đã tin tưởng và đồng hành ngay từ những ngày đầu.",
    category: "Đồng Hành",
    categoryEn: "Partners",
    titleEn: "A HEARTFELT THANK YOU TO VIETNIX",
    descriptionEn: "Vietnix has been an invaluable partner to La Chan So through hosting infrastructure sponsorship. Thank you to the Vietnix team for your trust and support from the very beginning.",
    tags: ["vietnix", "hosting", "đồng hành", "tài trợ"],
    publishedAt: "2026-08-09",
    readTime: 2,
    author: "Lá Chắn Số",
    pinned: true,
    content: `
# Lời cảm ơn đến Vietnix

Trong quá trình phát triển Lá Chắn Số, tụi mình đã nhận được sự đồng hành quý báu từ **Vietnix** thông qua việc tài trợ hạ tầng **hosting** cho dự án.

Đối với một dự án được xây dựng bởi hai học sinh, sự hỗ trợ này không chỉ giúp tụi mình có thêm điều kiện để phát triển và vận hành sản phẩm, mà còn là nguồn động lực rất lớn để tiếp tục theo đuổi những ý tưởng có ích cho cộng đồng.

Tụi mình xin gửi lời cảm ơn chân thành đến đội ngũ Vietnix vì đã tin tưởng và đồng hành cùng Lá Chắn Số ngay từ những ngày đầu.

Hy vọng trong thời gian tới, Lá Chắn Số sẽ luôn tiếp tục hoàn thiện hơn nữa để mang đến một công cụ hữu ích, góp phần xây dựng môi trường số an toàn và đáng tin cậy hơn cho mọi người.

Một lần nữa, xin chân thành cảm ơn Vietnix vì đã đồng hành cùng dự án.

## Liên kết

- Trải nghiệm Lá Chắn Số tại: https://lachansovn.vercel.app/
- Vietnix: https://vietnix.vn/
    `,
    contentEn: `
# A Heartfelt Thank You to Vietnix

Throughout the development of La Chan So, we have received invaluable support from **Vietnix** through hosting infrastructure sponsorship for the project.

For a project built by two students, this support not only gave us the conditions to develop and operate the product, but also served as a tremendous source of motivation to keep pursuing ideas that benefit the community.

We would like to express our sincere gratitude to the Vietnix team for believing in and standing with La Chan So from the very beginning.

We hope that in the time ahead, La Chan So will continue to improve and deliver a useful tool, contributing to a safer and more trustworthy digital environment for everyone.

Once again, a heartfelt thank you to Vietnix for partnering with this project.

## Links

- Try La Chan So at: https://lachansovn.vercel.app/
- Vietnix: https://vietnix.vn/
    `
  },
  {
    id: "13",
    slug: "cam-on-retask-vi-da-dong-hanh",
    title: "CẢM ƠN RETASK — CẢM ƠN VÌ ĐÃ ĐỒNG HÀNH CÙNG LÁ CHẮN SỐ",
    description: "Retask đã hỗ trợ và cung cấp công nghệ cho Lá Chắn Số, giúp đội ngũ có thêm nguồn lực để tiếp tục xây dựng, thử nghiệm và hoàn thiện sản phẩm.",
    category: "Đồng Hành",
    categoryEn: "Partners",
    titleEn: "THANK YOU RETASK — THANK YOU FOR STANDING WITH LA CHAN SO",
    descriptionEn: "Retask has supported and provided technology for La Chan So, giving the team more resources to continue building, testing, and perfecting the product.",
    tags: ["retask", "đồng hành", "tài trợ", "công nghệ"],
    publishedAt: "2026-08-09",
    readTime: 3,
    author: "Lá Chắn Số",
    pinned: true,
    content: `
# Cảm ơn Retask — Cảm ơn vì đã đồng hành cùng Lá Chắn Số

Một sản phẩm công nghệ có thể bắt đầu từ một ý tưởng rất đơn giản, nhưng để biến ý tưởng đó thành một sản phẩm thực sự hoạt động và có thể phục vụ cộng đồng, phía sau luôn cần rất nhiều sự hỗ trợ.

Trong hành trình phát triển Lá Chắn Số, tụi mình rất vui khi nhận được sự đồng hành từ **Retask**.

Lá Chắn Số xin gửi lời cảm ơn chân thành đến Retask vì đã hỗ trợ và cung cấp công nghệ cho dự án, giúp đội ngũ có thêm nguồn lực để tiếp tục xây dựng, thử nghiệm và hoàn thiện sản phẩm.

Với tụi mình, sự hỗ trợ này không đơn thuần chỉ là một phần về công nghệ. Đó còn là sự tin tưởng dành cho một dự án được xây dựng bởi một đội ngũ trẻ, với mong muốn tạo ra một công cụ gần gũi và hữu ích hơn cho cộng đồng trong việc nhận diện tin giả, lừa đảo, website đáng ngờ và những nội dung có nguy cơ gây mất an toàn trên không gian mạng.

Trong thời gian qua, Lá Chắn Số đã liên tục cập nhật dựa trên phản hồi từ người dùng, từ hệ thống kiểm tra website, tin nhắn, tin tức cho đến các tính năng AI hỗ trợ phân tích và giải thích kết quả. Và chắc chắn hành trình này vẫn chưa dừng lại.

Mỗi sự đồng hành, mỗi góp ý và mỗi lượt sử dụng đều giúp tụi mình có thêm động lực để tiếp tục cải thiện sản phẩm.

Cảm ơn Retask vì đã tin tưởng và đồng hành cùng Lá Chắn Số.

Hy vọng đây sẽ không chỉ là một lần hỗ trợ, mà là điểm bắt đầu cho nhiều cơ hội hợp tác và những sản phẩm công nghệ ý nghĩa hơn trong tương lai.

## Lá Chắn Số

Bảo vệ thông tin. Bảo vệ cộng đồng.
    `,
    contentEn: `
# Thank You Retask — Thank You for Standing With La Chan So

A technology product can start from a very simple idea, but turning that idea into a product that truly works and can serve the community always requires a great deal of support behind the scenes.

Throughout the journey of developing La Chan So, we are delighted to have the support of **Retask**.

La Chan So would like to express our sincere gratitude to Retask for supporting and providing technology for the project, giving the team more resources to continue building, testing, and perfecting the product.

To us, this support goes far beyond just technology. It is also a vote of confidence in a project built by a young team with the desire to create a more accessible and useful tool for the community in identifying fake news, scams, suspicious websites, and content that poses cybersecurity risks.

Over time, La Chan So has continuously updated based on user feedback — from the website checking system, message verification, and news analysis to AI-powered features that help analyze and explain results. And this journey is far from over.

Every partnership, every piece of feedback, and every user helps us stay motivated to keep improving the product.

Thank you, Retask, for believing in and standing with La Chan So.

We hope this is not just a one-time support, but the starting point for many more collaborations and meaningful technology products in the future.

## La Chan So

Protecting information. Protecting the community.
    `
  },
  {
    id: "1",
    slug: "cach-nhat-biet-tin-gia-tren-facebook",
    title: "10 Cách Nhận Biết Tin Giả Trên Facebook Năm 2026",
    description: "Hướng dẫn chi tiết 10 cách nhận diện tin giả trên Facebook, từ tiêu đề giật gân đến nguồn tin không xác minh. Bảo vệ bản thân và gia đình khỏi thông tin sai lệch.",
    category: "Phòng Chống Tin Giả",
    categoryEn: "Anti-Fake News",
    titleEn: "10 Ways to Spot Fake News on Facebook in 2026",
    descriptionEn: "A detailed guide to 10 methods for identifying fake news on Facebook, from clickbait headlines to unverified sources. Protect yourself and your family from misinformation.",
    tags: ["tin giả", "facebook", "phòng chống", "an ninh mạng"],
    publishedAt: "2026-08-01",
    readTime: 8,
    author: "Lá Chắn Số",
    content: `
## Tại sao tin giả trên Facebook nguy hiểm?

Mỗi ngày, hàng triệu người dùng Facebook tiếp xúc với thông tin sai lệch. Theo nghiên cứu của MIT (2024), tin giả lan truyền nhanh gấp 6 lần tin thật trên mạng xã hội. Tại Việt Nam, 67% người dùng thừa nhận từng chia sẻ tin tức mà không kiểm tra kỹ.

## 10 Cách Nhận Biết Tin Giả

### 1. Tiêu Đề Giật Gân
Tin giả thường dùng tiêu đề sốc,uses từ ngữ cảm xúc mạnh: "SỐC!", "KHỦNG KHIẾP!", "BẠN SẼ KHÔNG TIN!". Tiêu đề thật thường ngắn gọn, rõ ràng.

### 2. Thiếu Nguồn Tin Rõ Ràng
Tin thật luôn có tên tác giả, ngày tháng, và nguồn trích dẫn. Nếu bài viết chỉ ghi "theo nguồn tin" mà không nêu cụ thể, đó là dấu hiệu cảnh báo.

### 3. Ngày Đăng Bất Thường
Kiểm tra ngày đăng bài. Tin giả thường được đăng lại nhiều lần hoặc có ngày không hợp lý.

### 4. Ảnh/Video Không Đúng Ngữ Cảnh
Dùng Google Reverse Image Search để kiểm tra ảnh. Nhiều tin giả dùng ảnh cũ hoặc ảnh cắt ghép.

### 5. Chính Tả và Ngữ Pháp
Tin giả từ nguồn không uy tín thường có nhiều lỗi chính tả, câu văn không mạch lạc.

### 6. Yêu Cầu Chia Sẻ Ngay
"Share ngay nếu bạn yêu gia đình!", "Chia sẻ trong 24 giờ nếu không muốn hối hận" - đây là kỹ thuật thao túng cảm xúc.

### 7. Thông Tin Cực Đoan
Tin giả thường đưa thông tin tuyệt đối: "100% sự thật", "không thể sai", "đã được xác nhận hoàn toàn".

### 8. Không Có Bình Luận Hoặc Bình Luận Giả
Kiểm tra phần bình luận. Nếu chỉ có bình luận khen ngợi hoặc không có phản hồi tiêu cực, có thể là bình luận giả.

### 9. Tên Trang Facebook Đáng Ngờ
Tên trang lạ, mới tạo, hoặc giả mạo thương hiệu nổi tiếng (thêm chữ "vn", "official" giả).

### 10. Sử Dụng Lá Chắn Số
Công cụ AI phân tích đa tầng giúp bạn kiểm tra tin tức chỉ trong vài giây.

## Cách Bảo Vệ Bản Thân

1. **Đọc kỹ trước khi chia sẻ** - Dành 30 giây đọc hết bài viết
2. **Kiểm tra nguồn** - Google tên tác giả, tên báo
3. **Sử dụng công cụ** - Lá Chắn Số, Google Fact Check
4. **Báo cáo tin giả** - Click "Báo cáo" trên Facebook
5. **Giáo dục gia đình** - Hướng dẫn người lớn tuổi nhận biết

## Kết Luận

Việc nhận biết tin giả không khó nếu bạn biết các dấu hiệu. Hãy luôn là người dùng thông thái, kiểm tra trước khi tin và chia sẻ.
    `,
    contentEn: `
## Why Is Fake News on Facebook Dangerous?

Every day, millions of Facebook users are exposed to misinformation. According to a 2024 MIT study, fake news spreads 6 times faster than real news on social media. In Vietnam, 67% of users admit to having shared news without checking it carefully.

## 10 Ways to Spot Fake News

### 1. Clickbait Headlines
Fake news often uses shocking headlines with emotionally charged words: "SHOCKING!", "TERRIFYING!", "YOU WON'T BELIEVE IT!" Real headlines tend to be concise and clear.

### 2. No Clear Source
Real news always has an author name, date, and cited sources. If an article just says "according to sources" without specifics, that's a red flag.

### 3. Unusual Publish Dates
Check the posting date. Fake news is often reposted multiple times or has unreasonable dates.

### 4. Photos/Videos Out of Context
Use Google Reverse Image Search to verify photos. Many fake stories use old or manipulated images.

### 5. Spelling and Grammar
Fake news from unreliable sources often contains many spelling errors and incoherent sentences.

### 6. Urging You to Share Immediately
"Share now if you love your family!", "Share within 24 hours or you'll regret it" — these are emotional manipulation tactics.

### 7. Extreme Information
Fake news often presents absolute claims: "100% true", "impossible to be wrong", "completely verified".

### 8. No Comments or Fake Comments
Check the comments section. If there are only positive comments or no negative feedback, they may be fabricated.

### 9. Suspicious Facebook Page Names
Strange page names, newly created pages, or brands impersonating famous ones (with added "vn" or fake "official" tags).

### 10. Use La Chan So
An AI-powered multi-layer analysis tool that helps you verify news in just seconds.

## How to Protect Yourself

1. **Read carefully before sharing** — Take 30 seconds to read the entire article
2. **Check the source** — Google the author and publication name
3. **Use tools** — La Chan So, Google Fact Check
4. **Report fake news** — Click "Report" on Facebook
5. **Educate your family** — Teach elderly members how to spot fake news

## Conclusion

Spotting fake news isn't hard if you know the signs. Always be a savvy user — verify before you trust and share.
    `
  },
  {
    id: "2",
    slug: "lua-dao-truc-tuyen-pho-bien-2026",
    title: "Top 10 Hình Thức Lừa Đảo Trực Tuyến Phổ Biến 2026",
    description: "Tổng hợp các hình thức lừa đảo trực tuyến phổ biến nhất tại Việt Nam năm 2026: từ phishing, lừa đảo tài chính đến giả mạo thương hiệu. Cách nhận biết và phòng tránh.",
    category: "Phòng Chống Lừa Đảo",
    categoryEn: "Anti-Scam",
    titleEn: "Top 10 Common Online Scams in 2026",
    descriptionEn: "A roundup of the most common online scams in Vietnam in 2026: from phishing and financial fraud to brand impersonation. How to recognize and prevent them.",
    tags: ["lừa đảo", "phishing", "an ninh mạng", "tài chính"],
    publishedAt: "2026-07-28",
    readTime: 10,
    author: "Lá Chạn Số",
    content: `
## Thực Trạng Lừa Đảo Trực Tuyến Tại Việt Nam

Năm 2025, Cục An ninh mạng ghi nhận hơn 15,000 vụ lừa đảo trực tuyến, gây thiệt hại hơn 3,000 tỷ đồng. Dự báo năm 2026, con số này sẽ tiếp tục tăng nếu người dùng không nâng cao cảnh giác.

## Top 10 Hình Thức Lừa Đảo

### 1. Phishing - Giả Mạo Đăng Nhập
Kẻ lừa đảo tạo trang web giả mạo ngân hàng, ví điện tử để đánh cắp thông tin đăng nhập. Dấu hiệu: URL lạ, yêu cầu nhập mật khẩu OTP.

### 2. Lừa Đảo Trúng Thưởng
"Chúc mừng bạn trúng iPhone 15!", "Bạn nhận được giải thưởng 500 triệu". Yêu cầu đóng phí nhận thưởng = lừa đảo.

### 3. Lừa Đảo Tuyển Dụng
"Việc làm online lương cao", "Cộng tác viên thu nhập 30 triệu/tháng". Yêu cầu ứng trước phí = lừa đảo.

### 4. Giả Mạo Công An/Tòa Án
Gọi điện xưng là công an, yêu cầu chuyển tiền xác minh. Công an không bao giờ yêu cầu chuyển tiền qua điện thoại.

### 5. Lừa Đảo Tình Cảm (Pig Butchering)
Kết bạn qua mạng, phát triển tình cảm, rồi rủ đầu tư vào sàn giả. Vốn tăng nhưng không rút được.

### 6. Lừa Đảo Đầu Tư
Cam kết lợi nhuận 30-50%/tháng, đầu tư tiền ảo, forex. Hứa hẹn lợi nhuận cao bất thường = lừa đảo.

### 7. Giả Mạo Thương Hiệu
Tạo page giả mạo thương hiệu nổi tiếng, bán hàng giả hoặc thu tiền không giao hàng.

### 8. Lừa Đảo VNeID/Căn Cước
Yêu cầu cập nhật thông tin VNeID qua link lạ. Cục Cảnh sát phòng chống tội phạm công nghệ cao cảnh báo.

### 9. Lừa Đảo Tình Dục (Sextortion)
Quay clip nhạy cảm rồi đe dọa tống tiền. Không bao giờ chia sẻ ảnh nhạy cảm với người lạ.

### 10. Lừa Đảo Từ Thiện Giả
Tạo quỹ từ thiện giả, lợi dụng sự kiện thiên tai để chiếm đoạt tiền đóng góp.

## Cách Phòng Tránh

1. **Không chia sẻ OTP** với bất kỳ ai
2. **Không chuyển tiền** cho người lạ
3. **Kiểm tra URL** trước khi đăng nhập
4. **Sử dụng xác thực 2 yếu tố**
5. **Cảnh giác với tin quá tốt** để đúng

## Nếu Bị Lừa Đảo

1. Liên hệ ngân hàng ngay lập tức
2. Báo công an tại cơ quan gần nhất
3. Cung cấp bằng chứng (chat, hóa đơn)
4. Báo cáo lên Cục An ninh mạng: 0692.345.678
    `,
    contentEn: `
## The State of Online Scams in Vietnam

In 2025, the Cybersecurity Department recorded over 15,000 cases of online fraud, causing damages exceeding 3,000 billion VND. Projections for 2026 show this number will continue to rise if users don't stay vigilant.

## Top 10 Types of Scams

### 1. Phishing — Fake Login Pages
Scammers create fake banking or e-wallet websites to steal login credentials. Warning signs: unusual URLs, requests to enter OTP passwords.

### 2. Prize Scams
"Congratulations, you've won an iPhone 15!", "You've received a 500 million VND prize". Any request to pay a fee to claim a prize = scam.

### 3. Job Scams
"High-paying online work", "Earn 30 million VND/month as a collaborator". Any request for advance fees = scam.

### 4. Impersonating Police/Courts
Calling and claiming to be police, requesting money transfers for verification. Police never request money transfers over the phone.

### 5. Romance Scams (Pig Butchering)
Building relationships online, developing feelings, then inviting you to invest on a fake platform. Your capital appears to grow but you can't withdraw.

### 6. Investment Scams
Promising 30-50% monthly returns, cryptocurrency, forex investments. Abnormal profit promises = scam.

### 7. Brand Impersonation
Creating fake pages of famous brands, selling counterfeit products or taking money without delivering.

### 8. VNeID/Citizen ID Scams
Requesting VNeID information updates via suspicious links. The High-Tech Crime Prevention Department has issued warnings.

### 9. Sextortion
Recording compromising videos then threatening blackmail. Never share intimate content with strangers.

### 10. Fake Charity Scams
Creating fake charity funds, exploiting natural disasters to embezzle donations.

## How to Prevent

1. **Never share OTP** with anyone
2. **Never transfer money** to strangers
3. **Verify URLs** before logging in
4. **Enable two-factor authentication**
5. **Be skeptical of offers that seem too good** to be true

## If You've Been Scammed

1. Contact your bank immediately
2. Report to the nearest police station
3. Provide evidence (chats, receipts)
4. Report to the Cybersecurity Department: 0692.345.678
    `
  },
  {
    id: "3",
    slug: "cach-bao-ve-tai-khoan-ngan-hang",
    title: "Cách Bảo Vệ Tài Khoản Ngân Hàng Khỏi Lừa Đảo",
    description: "Hướng dẫn bảo vệ tài khoản ngân hàng trực tuyến khỏi các hình thức lừa đảo phổ biến. Mẹo an ninh quan trọng mỗi người dùng cần biết.",
    category: "Bảo Mật Tài Chính",
    categoryEn: "Financial Security",
    titleEn: "How to Protect Your Bank Account from Scams",
    descriptionEn: "A guide to protecting your online bank account from common scam tactics. Essential security tips every user should know.",
    tags: ["ngân hàng", "bảo mật", "tài khoản", "lừa đảo"],
    publishedAt: "2026-07-25",
    readTime: 7,
    author: "Lá Chắn Số",
    content: `
## Tại Sao Tài Khoản Ngân Hàng Dễ Bị Lừa Đảo?

Năm 2025, tại Việt Nam có hơn 8,000 vụ lừa đảo tài chính trực tuyến, chiếm đoạt hơn 2,000 tỷ đồng. Nguyên nhân chính: thiếu kiến thức và chủ quan.

## Các Hình Thức Lừa Đảo Ngân Hàng Phổ Biến

### 1. Giả Mạo Ngân Hàng
Tin nhắn SMS/Email giả mạo ngân hàng yêu cầu xác nhận tài khoản. Link dẫn đến trang giả mạo.

### 2. Lừa Đảo OTP
Gọi điện xưng là nhân viên ngân hàng, yêu cầu cung cấp mã OTP. Ngân hàng không bao giờ yêu cầu OTP qua điện thoại.

### 3. Lừa Đảo Chuyển Khoản
Tin nhắn yêu cầu chuyển khoản nhầm, nhờ xác nhận lại. Kẻ lừa đảo giả vờ chuyển tiền thật nhưng chưa thành công.

### 4. Lừa Đảo Đầu Tư
Sàn giao dịch giả mạo, hứa hẹn lợi nhuận cao. Vốn tăng nhưng không rút được tiền.

## Cách Bảo Vệ

### 1. Không Chia Sẻ Thông Tin
- **Mật khẩu**: Không chia sẻ với bất kỳ ai
- **OTP**: Không cung cấp qua điện thoại, tin nhắn
- **Số thẻ**: Chỉ nhập khi giao dịch chính thức

### 2. Kiểm Tra URL
- Only đăng nhập qua app hoặc website chính thức
- Kiểm tra https:// và tên miền chính xác
- Không click link từ tin nhắn, email

### 3. Sử Dụng Xác Thực 2 Yếu Tố (2FA)
- Kích hoạt 2FA cho mọi tài khoản
- Sử dụng app xác thực (Google Authenticator, Authy)
- Không dùng SMS OTP nếu có thể

### 4. Theo Dõi Giao Dịch
- Kiểm tra thông báo giao dịch thường xuyên
- Báo ngay ngân hàng nếu có giao dịch bất thường
- Đặt hạn mức giao dịch trực tuyến

### 5. Cẩn Trọng Với WiFi Công Cộng
- Không giao dịch ngân hàng qua WiFi công cộng
- Sử dụng VPN nếu cần truy cập
- Tắt kết nối tự động

## Nếu Phát Hiện Lừa Đảo

1. **Liên hệ ngân hàng ngay**: Khóa tài khoản tạm thời
2. **Đổi mật khẩu**: Tất cả tài khoản liên quan
3. **Báo công an**: Cung cấp bằng chứng
4. **Theo dõi tài khoản**: Kiểm tra giao dịch 30 ngày

## Kết Luận

Bảo vệ tài khoản ngân hàng là trách nhiệm của mỗi người. Hãy luôn cảnh giác và cập nhật kiến thức an ninh mạng thường xuyên.
    `,
    contentEn: `
## Why Are Bank Accounts Vulnerable to Scams?

In 2025, Vietnam saw over 8,000 cases of online financial fraud, with losses exceeding 2,000 billion VND. The main causes: lack of knowledge and overconfidence.

## Common Bank Scam Tactics

### 1. Fake Bank Messages
SMS/Email impersonating banks asking you to verify your account. Links lead to fake pages.

### 2. OTP Scams
Calling and claiming to be bank staff, requesting your OTP code. Banks never ask for OTP over the phone.

### 3. Transfer Scams
Messages requesting you to transfer money to the wrong account and asking for confirmation. Scammers pretend to send real money but the transaction hasn't gone through.

### 4. Investment Scams
Fake trading platforms promising high returns. Your capital appears to grow but you can't withdraw.

## How to Protect Yourself

### 1. Don't Share Information
- **Passwords**: Never share with anyone
- **OTP**: Never provide over phone or text
- **Card numbers**: Only enter during legitimate transactions

### 2. Verify URLs
- Only log in through the official app or website
- Check for https:// and the correct domain name
- Don't click links from messages or emails

### 3. Use Two-Factor Authentication (2FA)
- Enable 2FA for all accounts
- Use authenticator apps (Google Authenticator, Authy)
- Avoid SMS OTP if possible

### 4. Monitor Transactions
- Check transaction notifications regularly
- Report unusual transactions to your bank immediately
- Set online transaction limits

### 5. Be Careful with Public WiFi
- Don't conduct banking over public WiFi
- Use a VPN if you need to access
- Disable auto-connect

## If You Detect Fraud

1. **Contact your bank immediately**: Temporarily freeze your account
2. **Change passwords**: For all related accounts
3. **Report to police**: Provide evidence
4. **Monitor your account**: Check transactions for 30 days

## Conclusion

Protecting your bank account is everyone's responsibility. Stay vigilant and keep your cybersecurity knowledge up to date.
    `
  },
  {
    id: "4",
    slug: "phat-hien-ai-tao-dung-tin-gia",
    title: "Cách Phát Hiện AI Tạo Dung Tin Giả (Deepfake)",
    description: "Hướng dẫn nhận diện video, ảnh, giọng nói giả mạo bằng AI (deepfake). Công nghệ AI ngày càng tinh vi, nhưng vẫn có dấu hiệu nhận biết.",
    category: "Công Nghệ AI",
    categoryEn: "AI Technology",
    titleEn: "How to Detect AI-Generated Fake News (Deepfake)",
    descriptionEn: "A guide to identifying fake videos, images, and voice clones created by AI (deepfake). AI technology is becoming increasingly sophisticated, but there are still telltale signs.",
    tags: ["AI", "deepfake", "tin giả", "công nghệ"],
    publishedAt: "2026-07-20",
    readTime: 9,
    author: "Lá Chắn Số",
    content: `
## Deepfake Là Gì?

Deepfake sử dụng AI để tạo video, ảnh hoặc giọng nói giả mạo. Năm 2025, số lượng deepfake tăng 500% so với năm trước. Tại Việt Nam, nhiều trường hợp deepfake được sử dụng để lừa đảo và bôi nhọ danh dự.

## Các Loại Deepfake Phổ Biến

### 1. Video Giả Mạo
Thay thế khuôn mặt người này sang người khác trong video. Thường dùng với người nổi tiếng, chính trị gia.

### 2. Giọng Nói Giả Mạo
Tạo giọng nói giống hệt người thật từ mẫu âm thanh ngắn. Used in lừa đảo qua điện thoại.

### 3. Ảnh Giả Mạo
Tạo ảnh khuôn mặt không tồn tại hoặc chỉnh sửa ảnh thật bằng AI.

### 4. Text-to-Video
Tạo video từ văn bản mô tả. Công nghệ mới nhưng ngày càng phổ biến.

## Dấu Hiệu Nhận Biết

### 1. Mắt và Miệng
- Mắt chớp không tự nhiên hoặc không chớp
- Miệng chuyển động không khớp với giọng nói
- Khuôn mặt thiếu biểu cảm tự nhiên

### 2. Ánh Sáng và Bóng
- Ánh sáng không đồng nhất trên khuôn mặt
- Bóng đổ không đúng vị trí
- Màu da thay đổi bất thường

### 3. Chi Tiết Phụ
- Tóc, lông mi bị mờ hoặc biến dạng
- Đồ trang sức, mắt kính bất thường
- Phông nền cogiật hoặc biến dạng

### 4. Chất Lượng
- Video bị mờ ở một số khu vực
- Biên giới giữa khuôn mặt và cổ không tự nhiên
- Chuyển động quá mượt mà hoặc giật cục

## Cách Kiểm Tra

### 1. Google Reverse Image Search
Upload ảnh lên Google Images để tìm nguồn gốc.

### 2. Kiểm Tra Nguồn
- Tìm video gốc trên các kênh chính thức
- Đối chiếu với nhiều nguồn tin
- Kiểm tra ngày giờ đăng

### 3. Sử Dụng Công Cụ
- Microsoft Video Authenticator
- Sensity AI
- Deepware Scanner

### 4. Phân Tích Bối Cảnh
- Video có phù hợp với sự kiện thực tế không?
- Có ai khác đăng cùng nội dung không?
- Tại sao video này xuất hiện vào lúc này?

## Cách Bảo Vệ

1. **Không tin视频 từ người lạ** qua Messenger, Zalo
2. **Xác minh qua kênh chính thức**
3. **Báo cáo video giả mạo** trên nền tảng
4. **Giáo dục người thân** về deepfake

## Kết Luận

Deepfake ngày càng tinh vi nhưng vẫn có dấu hiệu nhận biết. Hãy luôn cảnh giác và kiểm tra kỹ trước khi tin hoặc chia sẻ video.
    `,
    contentEn: `
## What Are Deepfakes?

Deepfakes use AI to create fake videos, images, or voice recordings. In 2025, the number of deepfakes increased by 500% compared to the previous year. In Vietnam, many deepfake cases have been used for fraud and reputation attacks.

## Common Types of Deepfakes

### 1. Face-Swapped Videos
Replacing one person's face with another in a video. Often used with celebrities and politicians.

### 2. Voice Cloning
Creating voices that sound exactly like real people from short audio samples. Used in phone scams.

### 3. Fake Photos
Generating non-existent faces or editing real photos using AI.

### 4. Text-to-Video
Creating videos from text descriptions. A new technology but increasingly common.

## Signs to Watch For

### 1. Eyes and Mouth
- Unnatural blinking or no blinking at all
- Mouth movements not matching the voice
- Face lacking natural expressions

### 2. Lighting and Shadows
- Inconsistent lighting across the face
- Shadows in wrong positions
- Unusual skin color changes

### 3. Background Details
- Hair, eyelashes blurry or distorted
- Unusual jewelry or glasses
- Background glitches or warping

### 4. Quality Issues
- Video blurry in certain areas
- Unnatural edges between face and neck
- Movements too smooth or unnaturally jerky

## How to Verify

### 1. Google Reverse Image Search
Upload photos to Google Images to find the original source.

### 2. Check the Source
- Find the original video on official channels
- Cross-reference with multiple sources
- Check the posting date and time

### 3. Use Tools
- Microsoft Video Authenticator
- Sensity AI
- Deepware Scanner

### 4. Analyze the Context
- Does the video match real-world events?
- Has anyone else posted the same content?
- Why is this video appearing now?

## How to Protect Yourself

1. **Don't trust videos from strangers** on Messenger, Zalo
2. **Verify through official channels**
3. **Report fake videos** on platforms
4. **Educate family members** about deepfakes

## Conclusion

Deepfakes are becoming increasingly sophisticated, but there are still telltale signs. Always stay alert and verify thoroughly before trusting or sharing videos.
    `
  },
  {
    id: "5",
    slug: "an-ninh-mang-cho-nguoi-lon-tuoi",
    title: "Hướng Dẫn An Ninh Mạng Cho Người Lớn Tuổi",
    description: "Kiến thức an ninh mạng cần thiết cho người lớn tuổi: cách nhận biết lừa đảo, bảo vệ tài khoản, sử dụng mạng xã hội an toàn.",
    category: "Kiến Thức Mạng",
    categoryEn: "Internet Knowledge",
    titleEn: "Internet Safety Guide for the Elderly",
    descriptionEn: "Essential cybersecurity knowledge for senior citizens: how to recognize scams, protect accounts, and use social media safely.",
    tags: ["người lớn tuổi", "an ninh mạng", "gia đình", "phòng chống"],
    publishedAt: "2026-07-15",
    readTime: 6,
    author: "Lá Chắn Số",
    content: `
## Tại Sao Người Lớn Tuổi Dễ Bị Lừa Đảo?

Theo thống kê, 70% nạn nhân lừa đảo trực tuyến trên 50 tuổi. Nguyên nhân: thiếu kiến thức công nghệ, tin người, và sợ bị phạt nếu không làm theo.

## Các Hình Thức Lừa Đảo Thường Nhắm Vào Người Lớn Tuổi

### 1. Lừa Đảo Qua Điện Thoại
- Giả mạo công an, tòa án
- Giả mạo nhân viên ngân hàng
- Thông báo trúng thưởng, quà tặng

### 2. Lừa Đảo Qua Zalo/Facebook
- Nick giả mạo con cháu
- Tin nhắn vay tiền gấp
- Yêu cầu chuyển khoản khẩn cấp

### 3. Lừa Đảo Sức Khỏe
- Quảng cáo thuốc giả, thực phẩm chức năng
- Cam kết chữa bệnh thần kỳ
- Bán hàng đa cấp giả

## Cách Nhận Biết

### 1. Cuộc Gọi Đòi Chuyển Tiền
- Ngân hàng, công an **không bao giờ** yêu cầu chuyển tiền qua điện thoại
- Nếu nghi ngờ, gọi lại số chính thức của cơ quan

### 2. Tin Nhắn Vay Tiền
- Gọi điện xác nhận trực tiếp với người thân
- Không chuyển tiền ngay lập tức
- Hỏi lại bằng câu hỏi riêng chỉ hai người biết

### 3. Quảng Cáo Quá Tốt
- "Thuốc chữa bách bệnh" = lừa đảo
- "Lợi nhuận 50%/tháng" = lừa đảo
- "Trúng thưởng triệu đô" = lừa đảo

## Cách Sử Dụng Mạng Xã Hội An Toàn

### 1. Facebook
- Chỉ kết bạn với người quen biết
- Không chia sẻ thông tin cá nhân
- Không click link từ người lạ

### 2. Zalo
- Khôngaccept lời mời kết bạn từ người lạ
- Không chuyển tiền qua Zalo
- Sử dụng mã PIN cho ứng dụng

### 3. Điện Thoại
- Cài đặt ứng dụng chặn cuộc gọi rác
- Không cung cấp OTP cho bất kỳ ai
- Lưu số ngân hàng chính thức

## Hướng Dẫn Cho Con Cháu

1. **Giải thích đơn giản** về lừa đảo
2. **Đặt câu hỏi an toàn**: "Nếu ai đó yêu cầu tiền, hãy gọi cho con trước"
3. **Cài đặt ứng dụng bảo vệ** trên điện thoại
4. **Kiểm tra định kỳ** cùng nhau

## Nếu Bị Lừa Đảo

1. **Báo ngay cho gia đình**
2. **Liên hệ ngân hàng** khóa tài khoản
3. **Báo công an** tại địa phương
4. **Không tự xử lý** một mình

## Kết Luận

Người lớn tuổi cần được hỗ trợ để sử dụng công nghệ an toàn. Con cháu hãy dành thời gian hướng dẫn và kiểm tra thường xuyên.
    `,
    contentEn: `
## Why Are Elderly People More Vulnerable to Scams?

Statistics show that 70% of online fraud victims are over 50. The reasons: lack of tech knowledge, trusting nature, and fear of consequences if they don't comply.

## Common Scam Tactics Targeting the Elderly

### 1. Phone Scams
- Impersonating police or courts
- Pretending to be bank staff
- Prize or gift notifications

### 2. Zalo/Facebook Scams
- Fake accounts impersonating children or grandchildren
- Urgent money borrowing requests
- Emergency transfer requests

### 3. Health Scams
- Advertising fake medicine or supplements
- Promising miracle cures
- Fake multi-level marketing schemes

## How to Recognize Them

### 1. Calls Demanding Money Transfers
- Banks and police **never** request money transfers over the phone
- If in doubt, call the official number of the agency

### 2. Money Borrowing Messages
- Call to confirm directly with the person
- Don't transfer money immediately
- Ask a question only the two of you would know

### 3. Too-Good-to-Be-True Ads
- "Cure-all medicine" = scam
- "50% monthly returns" = scam
- "Winning millions in prizes" = scam

## How to Use Social Media Safely

### 1. Facebook
- Only connect with people you know
- Don't share personal information
- Don't click links from strangers

### 2. Zalo
- Don't accept friend requests from strangers
- Don't transfer money via Zalo
- Use a PIN for the app

### 3. Phone
- Install call-blocking apps
- Never provide OTP to anyone
- Save official bank numbers

## Guide for Children and Grandchildren

1. **Explain simply** what scams are
2. **Set up safety rules**: "If anyone asks for money, call me first"
3. **Install protection apps** on their phone
4. **Check in regularly** together

## If They've Been Scammed

1. **Tell family immediately**
2. **Contact the bank** to freeze the account
3. **Report to local police**
4. **Don't try to handle it alone**

## Conclusion

Elderly people need support to use technology safely. Children and grandchildren should take the time to guide and check in with them regularly.
    `
  },
  {
    id: "6",
    slug: "kiem-tra-tin-tuc-truoc-khi-chia-se",
    title: "5 Bước Kiểm Tra Tin Tức Trước Khi Chia Sẻ",
    description: "Quy trình 5 bước đơn giản để kiểm tra tin tức trước khi chia sẻ lên mạng xã hội. Tránh lan truyền thông tin sai lệch.",
    category: "Phòng Chống Tin Giả",
    categoryEn: "Anti-Fake News",
    titleEn: "5 Steps to Verify News Before Sharing",
    descriptionEn: "A simple 5-step process to verify news before sharing it on social media. Prevent the spread of misinformation.",
    tags: ["tin tức", "kiểm tra", "chia sẻ", "trách nhiệm"],
    publishedAt: "2026-07-10",
    readTime: 5,
    author: "Lá Chắn Số",
    content: `
## Tại Sao Phải Kiểm Tra Tin Tức?

Mỗi tin giả chia sẻ có thể gây hậu quả nghiêm trọng: hoang mang dư luận, mất tiền oan, thậm chí vi phạm pháp luật. Bộ Thông tin và Truyền thông cảnh báo: chia sẻ tin giả có thể bị phạt từ 10-20 triệu đồng.

## 5 Bước Kiểm Tra Đơn Giản

### Bước 1: Đọc Hết Bài Viết
**Thời gian: 30 giây**

Nhiều người chỉ đọc tiêu đề rồi chia sẻ. Hãy:
- Đọc toàn bộ nội dung
- Xem có thông tin mâu thuẫn không
- Kiểm tra ngày đăng

### Bước 2: Kiểm Tra Nguồn
**Thời gian: 1 phút**

- Tên báo/tác giả có rõ ràng không?
- Có trích dẫn nguồn không?
- Google tên tác giả, tên báo để xác minh

### Bước 3: Đối Chiếu Nhiều Nguồn
**Thời gian: 2 phút**

- Tìm tin tương tự trên các báo khác
- Nếu chỉ 1 nguồn đưa tin → nghi ngờ
- Ưu tiên nguồn uy tín: VnExpress, Tuổi Trẻ, Thanh Niên

### Bước 4: Kiểm Tra Ảnh/Video
**Thời gian: 1 phút**

- Dùng Google Reverse Image Search
- Kiểm tra ảnh có bị cắt ghép không
- Đối chiếu với sự kiện thực tế

### Bước 5: Sử Dụng Công Cụ
**Thời gian: 30 giây**

- Lá Chắn Số: Phân tích AI đa tầng
- Google Fact Check: Kiểm tra sự thật
- Tin Nhiễm Mạng: Cảnh báo tin giả Việt Nam

## Mẹo Nhanh

### 1. "Cảm Giác" Không Đủ
- Tin thật thường có số liệu, nguồn cụ thể
- Tin giả dùng cảm xúc, sốc, kinh hoàng

### 2. "Quá Tốt Để Đúng"
- Nếu tin quá tốt → có thể là lừa đảo
- "Trúng thưởng triệu đô" → 99.9% lừa đảo

### 3. "Gấp Gáp" = Cảnh Báo
- "Chia sẻ ngay trong 24 giờ"
- "Hết hạn hôm nay" → lừa đảo

### 4. "Yêu Cầu Chia Sẻ"
- Tin thật không yêu cầu share
- "Share nếu yêu gia đình" → thao túng

## Trách Nhiệm Của Mỗi Người

1. **Kiểm tra trước khi tin**
2. **Kiểm tra trước khi chia sẻ**
3. **Báo cáo tin giả**
4. **Giáo dục người thân**

## Kết Luận

5 bước đơn giản, 5 phút kiểm tra có thể ngăn chặn tin giả lan truyền. Hãy là người dùng có trách nhiệm.
    `,
    contentEn: `
## Why Must We Verify News?

Every piece of fake news shared can cause serious consequences: public panic, financial loss, and even legal violations. The Ministry of Information and Communications warns: sharing fake news can result in fines of 10-20 million VND.

## 5 Simple Verification Steps

### Step 1: Read the Entire Article
**Time: 30 seconds**

Many people only read the headline and share. Instead:
- Read the full content
- Check for contradictory information
- Verify the publish date

### Step 2: Check the Source
**Time: 1 minute**

- Is the publication/author name clear?
- Are sources cited?
- Google the author and publication to verify

### Step 3: Cross-Reference Multiple Sources
**Time: 2 minutes**

- Find similar stories on other outlets
- If only one source reported it → be skeptical
- Prioritize reputable sources: VnExpress, Tuoi Tre, Thanh Nien

### Step 4: Verify Photos/Videos
**Time: 1 minute**

- Use Google Reverse Image Search
- Check if photos have been cropped or edited
- Compare with real-world events

### Step 5: Use Verification Tools
**Time: 30 seconds**

- La Chan So: Multi-layer AI analysis
- Google Fact Check: Verify facts
- Tin Nhiem Mang: Vietnamese fake news alerts

## Quick Tips

### 1. "Gut Feeling" Isn't Enough
- Real news usually has specific data and sources
- Fake news uses emotion, shock value, fear

### 2. "Too Good to Be True"
- If the news is too good → it's likely a scam
- "Winning millions in prizes" → 99.9% scam

### 3. "Urgency" = Red Flag
- "Share within 24 hours"
- "Expires today" → scam

### 4. "Sharing Required"
- Real news doesn't demand you share
- "Share if you love your family" → emotional manipulation

## Everyone's Responsibility

1. **Verify before you trust**
2. **Verify before you share**
3. **Report fake news**
4. **Educate your family**

## Conclusion

5 simple steps, 5 minutes of verification can stop fake news from spreading. Be a responsible user.
    `
  },
  {
    id: "7",
    slug: "phishing-nhan-biet-va-phong-tranh",
    title: "Phishing: Cách Nhận Biết Và Phòng Tránh",
    description: "Phishing là hình thức lừa đảo phổ biến nhất. Hướng dẫn nhận biết email, tin nhắn, website phishing và cách bảo vệ bản thân.",
    category: "An Ninh Mạng",
    categoryEn: "Cybersecurity",
    titleEn: "Phishing: How to Recognize and Prevent It",
    descriptionEn: "Phishing is the most common form of online fraud. A guide to recognizing phishing emails, messages, and websites, and how to protect yourself.",
    tags: ["phishing", "email", "website", "bảo mật"],
    publishedAt: "2026-07-05",
    readTime: 7,
    author: "Lá Chắn Số",
    content: `
## Phishing Là Gì?

Phishing (lừa đảo trực tuyến) là hình thức kẻ lừa đảo giả mạo tổ chức uy tín để đánh cắp thông tin cá nhân: mật khẩu, số thẻ, mã OTP. Đây là hình thức lừa đảo phổ biến nhất thế giới.

## Các Loại Phishing Phổ Biến

### 1. Email Phishing
- Email giả mạo ngân hàng, cơ quan nhà nước
- Yêu cầu "xác nhận tài khoản" qua link
- Đính kèm file độc hại

### 2. SMS Phishing (Smishing)
- Tin nhắn giả mạo ngân hàng
- "Tài khoản của bạn đang bị khóa"
- Link dẫn đến website giả mạo

### 3. Voice Phishing (Vishing)
- Cuộc gọi giả mạo công an, ngân hàng
- Yêu cầu cung cấp OTP, mật khẩu
- Đe dọa nếu không làm theo

### 4. Website Phishing
- Tạo trang web giả mạo ngân hàng
- Giao diện giống hệt website thật
- Thu thập thông tin đăng nhập

## Cách Nhận Biết

### 1. Kiểm Tra URL
- **Đúng**: mb-bank.com.vn, techcombank.com.vn
- **Sai**: mb-bank.com, techcombank.xyz, mb-bank.club
- Luôn check kỹ tên miền

### 2. Kiểm Tra SSL
- Website thật có https:// và khóa màu xanh
- Website giả có https:// nhưng không có khóa
- Không tin tưởng hoàn toàn vào https

### 3. Kiểm Tra Nội Dung
- Lỗi chính tả, ngữ pháp
- Yêu cầu khẩn cấp bất thường
- Thông tin chung chung, không cá nhân hóa

### 4. Kiểm Tra Người Gửi
- Email: xem kỹ địa chỉ người gửi
- Số điện thoại: tra cứu trên Google
- Zalo/Facebook: xác minh qua cuộc gọi

## Cách Phòng Tránh

### 1. Không Click Link Từ Nguồn Không Rõ
- Không click link từ tin nhắn, email
- Truy cập website trực tiếp qua trình duyệt
- Lưu bookmark website chính thức

### 2. Không Cung Cấp Thông Tin
- Không nhập mật khẩu OTP
- Không chia sẻ số thẻ tín dụng
- Không cung cấp CMND/CCCD qua điện thoại

### 3. Sử Dụng Xác Thực 2 Yếu Tố
- Kích hoạt 2FA cho mọi tài khoản
- Sử dụng app xác thực thay vì SMS

### 4. Cài Đặt Bảo Vệ
- Phần mềm diệt virus
- Block tin nhắn rác
- Ứng dụng chặn cuộc gọi

## Nếu Bị Phishing

1. **Đổi mật khẩu ngay** cho tài khoản bị ảnh hưởng
2. **Liên hệ ngân hàng** khóa thẻ tạm thời
3. **Quét virus** cho thiết bị
4. **Báo cáo** cho cơ quan chức năng

## Kết Luận

Phishing ngày càng tinh vi nhưng vẫn có dấu hiệu nhận biết. Hãy luôn cảnh giác và kiểm tra kỹ trước khi cung cấp thông tin cá nhân.
    `,
    contentEn: `
## What Is Phishing?

Phishing is a form of online fraud where scammers impersonate trusted organizations to steal personal information: passwords, card numbers, OTP codes. It is the most common type of online scam in the world.

## Common Types of Phishing

### 1. Email Phishing
- Fake emails impersonating banks or government agencies
- Requesting "account verification" via link
- Attaching malicious files

### 2. SMS Phishing (Smishing)
- Fake messages impersonating banks
- "Your account has been locked"
- Links leading to fake websites

### 3. Voice Phishing (Vishing)
- Calls impersonating police or banks
- Requesting OTP or password
- Threatening if you don't comply

### 4. Website Phishing
- Creating fake banking websites
- Interface identical to real sites
- Collecting login credentials

## How to Recognize Phishing

### 1. Check the URL
- **Correct**: mb-bank.com.vn, techcombank.com.vn
- **Wrong**: mb-bank.com, techcombank.xyz, mb-bank.club
- Always verify the domain name carefully

### 2. Check SSL
- Real sites have https:// and a green lock icon
- Fake sites may have https:// but no lock
- Don't fully trust https alone

### 3. Check the Content
- Spelling and grammar errors
- Unusual urgent requests
- Generic, non-personalized information

### 4. Check the Sender
- Email: scrutinize the sender's address
- Phone numbers: search on Google
- Zalo/Facebook: verify through a phone call

## How to Prevent Phishing

### 1. Don't Click Links from Unknown Sources
- Don't click links from messages or emails
- Access websites directly through your browser
- Bookmark official websites

### 2. Don't Provide Information
- Don't enter OTP or passwords
- Don't share credit card numbers
- Don't provide ID documents over the phone

### 3. Use Two-Factor Authentication
- Enable 2FA for all accounts
- Use authenticator apps instead of SMS

### 4. Install Protection
- Antivirus software
- Spam message blocking
- Call-blocking apps

## If You've Been Phished

1. **Change passwords immediately** for affected accounts
2. **Contact your bank** to temporarily freeze your card
3. **Scan for viruses** on your device
4. **Report** to authorities

## Conclusion

Phishing is becoming increasingly sophisticated, but there are still telltale signs. Always stay alert and verify carefully before providing personal information.
    `
  },
  {
    id: "8",
    slug: "lua-dao-tai-chinh-dau-tu",
    title: "Nhận Biết Lừa Đảo Tài Chính - Đầu Tư",
    description: "Cảnh báo các hình thức lừa đảo tài chính, đầu tư lợi nhuận cao, sàn giao dịch giả. Cách nhận biết và bảo vệ tài sản.",
    category: "Tài Chính",
    categoryEn: "Finance",
    titleEn: "Recognizing Financial & Investment Scams",
    descriptionEn: "Warning about financial and high-yield investment scams, fake trading platforms. How to recognize and protect your assets.",
    tags: ["tài chính", "đầu tư", "lừa đảo", "cảnh báo"],
    publishedAt: "2026-06-30",
    readTime: 8,
    author: "Lá Chắn Số",
    content: `
## Thực Trạng Lừa Đảo Tài Chính

Năm 2025, Công anTP.HCM ghi nhận hơn 3,000 vụ lừa đảo tài chính, chiếm đoạt hơn 1,500 tỷ đồng. Dự báo 2026 sẽ tiếp tục tăng.

## Các Hình Thức Lừa Đảo

### 1. Sàn Giao Dịch Giả Mạo
- Tạo sàn giả với giao diện chuyên nghiệp
- Cho phép nạp tiền, thấy lợi nhuận trên màn hình
- Khi rút tiền thì gặp sự cố, yêu cầu đóng phí

### 2. Đầu Tư Tiền Ảo
- Cam kết lợi nhuận 20-50%/tháng
- Không có dự án cụ thể
- Mời chào qua Zalo, Facebook

### 3. Đa Cấp Giả
- Bán hàng không rõ nguồn gốc
- Lợi nhuận từ việc mời người mới
- Phí tham gia cao

### 4. Cho Vay Nóng
- App cho vay nhanh, không cần duyệt
- Lãi suất cao, phí ẩn nhiều
- Đe dọa, khủng bố tinh thần khi nợ

## Dấu Hiệu Nhận Biết

### 1. "Lợi Nhuận Cao Bất Thường"
- CAM KẾT lợi nhuận → 99% lừa đảo
- Lợi nhuận 10-20%/tháng → không có thật
- "Không rủi ro" → lừa đảo

### 2. "Yêu Cầu Chuyển Khoản Nhanh"
- "Cơ hội cuối cùng"
- "Hết hạn hôm nay"
- "Đầu tư càng sớm càng lời"

### 3. "Không Rõ Dự Án"
- Không biết tiền đầu tư vào đâu
- Không có hợp đồng rõ ràng
- Không có thông tin công ty

### 4. "Áp Lực Giới Thiệu"
- Yêu cầu mời người mới
- Phần thưởng khi tuyển dụng
- Đa cấp trá hình

## Cách Bảo Vệ

### 1. Nguyên Tắc Vàng
- **Không CAM KẾT lợi nhuận**
- **Không chuyển tiền** cho người lạ
- **Không tin** lời mời gọi qua mạng

### 2. Kiểm Tra Công Ty
- Mã số thuế, giấy phép kinh doanh
- Địa chỉ, số điện thoại rõ ràng
- Thông tin trên google, báo chí

### 3. Hỏi Ý Kiến Chuyên Gia
- Tham khảo ý kiến người có kinh nghiệm
- Không quyết định vội vàng
- "Suy nghĩ 24 giờ trước khi đầu tư"

### 4. Sử Dụng Nguồn Chính Thức
- Ngân hàng Nhà nước: sbv.gov.vn
- Ủy ban Chứng khoán: ssb.gov.vn
- Công an phòng chống tội phạm

## Nếu Bị Lừa Đảo

1. **Thu thập bằng chứng**: Hợp đồng, hóa đơn, chat
2. **Báo công an ngay**: Đơn vị chuyên trách
3. **Liên hệ ngân hàng**: Khóa tài khoản
4. **Cảnh báo người thân**: Tránh bị lây lan

## Kết Luận

Đầu tư chính đáng phải có rủi ro. Cam kết lợi nhuận cao bất thường = lừa đảo. Hãy thông thái và cảnh giác.
    `,
    contentEn: `
## The State of Financial Scams

In 2025, Ho Chi Minh City Police recorded over 3,000 cases of financial fraud, with losses exceeding 1,500 billion VND. Projections for 2026 show the trend will continue.

## Types of Financial Scams

### 1. Fake Trading Platforms
- Creating fake platforms with professional interfaces
- Allowing deposits and showing profits on screen
- When withdrawing, encountering issues and being asked to pay fees

### 2. Cryptocurrency Investments
- Promising 20-50% monthly returns
- No specific project or product
- Recruiting through Zalo, Facebook

### 3. Fake Multi-Level Marketing
- Selling products of unknown origin
- Profits from recruiting new members
- High participation fees

### 4. Predatory Lending
- Fast loan apps, no approval needed
- High interest rates, many hidden fees
- Threats and harassment when in debt

## Warning Signs

### 1. "Abnormally High Returns"
- GUARANTEEING returns → 99% scam
- 10-20% monthly returns → unrealistic
- "No risk" → scam

### 2. "Urgent Transfer Required"
- "Last chance opportunity"
- "Expires today"
- "Invest sooner for more profit"

### 3. "Unclear Project"
- No idea where the money is invested
- No clear contract
- No company information

### 4. "Recruitment Pressure"
- Asked to recruit new members
- Referral bonuses
- Disguised pyramid schemes

## How to Protect Yourself

### 1. Golden Rules
- **Never GUARANTEE returns**
- **Never transfer money** to strangers
- **Never trust** unsolicited online offers

### 2. Verify the Company
- Tax ID, business license
- Clear address and phone number
- Check Google, news coverage

### 3. Seek Expert Advice
- Consult experienced people
- Don't make hasty decisions
- "Sleep on it for 24 hours before investing"

### 4. Use Official Sources
- State Bank of Vietnam: sbv.gov.vn
- Securities Commission: ssb.gov.vn
- Cybercrime police

## If You've Been Scammed

1. **Gather evidence**: Contracts, receipts, chat logs
2. **Report to police immediately**: Specialized units
3. **Contact your bank**: Freeze your account
4. **Warn family and friends**: Prevent further spread

## Conclusion

Legitimate investments always carry risk. Abnormally high profit guarantees = scam. Be smart and stay vigilant.
    `
  },
  {
    id: "9",
    slug: "bao-mat-thong-tin-ca-nhan",
    title: "Cách Bảo Vệ Thông Tin Cá Nhân Trên Mạng",
    description: "Hướng dẫn bảo vệ thông tin cá nhân trên mạng xã hội, internet. Tránh bị đánh cắp danh tính, lừa đảo.",
    category: "Bảo Mật",
    categoryEn: "Security",
    titleEn: "How to Protect Your Personal Information Online",
    descriptionEn: "A guide to protecting your personal information on social media and the internet. Avoid identity theft and fraud.",
    tags: ["bảo mật", "thông tin cá nhân", "mạng xã hội", "quyền riêng tư"],
    publishedAt: "2026-06-25",
    readTime: 6,
    author: "Lá Chắn Số",
    content: `
## Tại Sao Bảo Vệ Thông Tin Cá Nhân Quan Trọng?

Năm 2025, hơn 2 tỷ bản ghi dữ liệu cá nhân bị rò rỉ toàn cầu. Tại Việt Nam, nhiều trường hợp bị đánh cắp CMND, CCCD để vay nợ, lừa đảo.

## Thông Tin Cần Bảo Vệ

### 1. Thông Tin Định Danh
- CMND/CCCD
- Hộ chiếu
- Số tài khoản ngân hàng

### 2. Thông Tin Liên Hệ
- Số điện thoại
- Email
- Địa chỉ nhà

### 3. Thông Tin Tài Chính
- Số thẻ tín dụng
- Mã OTP
- Mật khẩu

### 4. Thông Tin Sức Khỏe
- Hồ sơ bệnh án
- Kết quả xét nghiệm
- Đơn thuốc

## Cách Bảo Vệ

### 1. Mạng Xã Hội
- **Không chia sẻ CMND/CCCD** lên Facebook
- **Không đăng ảnh hộ chiếu**
- **Ẩn thông tin cá nhân** trên profile
- **Khôngaccept kết bạn** từ người lạ

### 2. Điện Thoại
- **Cài đặt mã PIN** cho điện thoại
- **Sử dụng vân tay/khuôn mặt**
- **Không lưu mật khẩu** trên trình duyệt
- **Xóa ứng dụng** không sử dụng

### 3. Trình Duyệt
- **Không lưu mật khẩu** trên trình duyệt
- **Xóa lịch sử** định kỳ
- **Sử dụng trình duyệt bảo mật**: Firefox, Brave
- **Cài đặt chặn quảng cáo**

### 4. WiFi
- **Không giao dịch** qua WiFi công cộng
- **Sử dụng VPN** khi cần
- **Tắt kết nối tự động**

### 5. Email
- **Không mở file đính kèm** từ người lạ
- **Không click link** đáng ngờ
- **Sử dụng email riêng** cho đăng ký

## Dấu Hiệu Bị Đánh Cắp Thông Tin

1. **Tin nhắn OTP** không gửi
2. **Cuộc gọi** từ số lạ hỏi thông tin
3. **Tài khoản** đăng nhập bất thường
4. **Thẻ tín dụng** có giao dịch lạ

## Nếu Bị Đánh Cắp Thông Tin

1. **Đổi mật khẩu** tất cả tài khoản
2. **Liên hệ ngân hàng** khóa thẻ
3. **Báo công an** tại địa phương
4. **Theo dõi credit** 30 ngày

## Kết Luận

Bảo vệ thông tin cá nhân là bảo vệ bản thân và gia đình. Hãy cẩn thận với mọi yêu cầu cung cấp thông tin trên mạng.
    `,
    contentEn: `
## Why Is Protecting Personal Information Important?

In 2025, over 2 billion personal data records were leaked globally. In Vietnam, many cases involved stolen ID cards being used for loans and fraud.

## Information to Protect

### 1. Identity Information
- National ID card / Citizen ID
- Passport
- Bank account numbers

### 2. Contact Information
- Phone number
- Email
- Home address

### 3. Financial Information
- Credit card numbers
- OTP codes
- Passwords

### 4. Health Information
- Medical records
- Test results
- Prescriptions

## How to Protect Yourself

### 1. Social Media
- **Don't share ID cards** on Facebook
- **Don't post passport photos**
- **Hide personal information** on your profile
- **Don't accept friend requests** from strangers

### 2. Phone
- **Set a PIN** for your phone
- **Use fingerprint/face recognition**
- **Don't save passwords** in your browser
- **Delete unused apps**

### 3. Browser
- **Don't save passwords** in your browser
- **Clear history** periodically
- **Use secure browsers**: Firefox, Brave
- **Install ad blockers**

### 4. WiFi
- **Don't conduct transactions** over public WiFi
- **Use a VPN** when needed
- **Disable auto-connect**

### 5. Email
- **Don't open attachments** from strangers
- **Don't click suspicious links**
- **Use a separate email** for sign-ups

## Signs Your Information Has Been Stolen

1. **OTP messages** you didn't request
2. **Calls** from unknown numbers asking for information
3. **Unusual login activity** on your accounts
4. **Unknown transactions** on your credit card

## If Your Information Has Been Stolen

1. **Change passwords** for all accounts
2. **Contact your bank** to freeze your card
3. **Report to local police**
4. **Monitor your credit** for 30 days

## Conclusion

Protecting personal information is protecting yourself and your family. Be cautious with every request to provide information online.
    `
  },
  {
    id: "10",
    slug: "cong-cu-kiem-tra-tin-gia",
    title: "Top 5 Công Cụ Kiểm Tra Tin Giả Miễn Phí",
    description: "Tổng hợp 5 công cụ miễn phí kiểm tra tin giả hiệu quả nhất hiện nay: Lá Chắn Số, Google Fact Check, và nhiều hơn nữa.",
    category: "Công Cụ",
    categoryEn: "Tools",
    titleEn: "Top 5 Free Fake News Checking Tools",
    descriptionEn: "A roundup of the 5 best free tools for verifying fake news: La Chan So, Google Fact Check, and more.",
    tags: ["công cụ", "tin giả", "kiểm tra", "miễn phí"],
    publishedAt: "2026-06-20",
    readTime: 5,
    author: "Lá Chắn Số",
    content: `
## Tại Sao Cần Công Cụ Kiểm Tra Tin Giả?

Con người không thể nhớ và kiểm tra mọi thông tin. Công cụ AI giúp kiểm tra nhanh, chính xác hơn nhiều lần so với thủ công.

## Top 5 Công Cụ Miễn Phí

### 1. Lá Chắn Số (lachansovn.com)
**Điểm mạnh:**
- Phân tích AI đa tầng: ngôn ngữ, tin cậy, hành vi
- Đồ thị tin cậy với 1,000+ nguồn uy tín
- Nhận diện mẫu lừa đảo Việt Nam
- Miễn phí, không cần đăng ký

**Cách sử dụng:**
1. Truy cập lachansovn.com
2. Dán link hoặc văn bản cần kiểm tra
3. Nhấn "Kiểm tra"
4. Xem kết quả phân tích

### 2. Google Fact Check Tools
**Điểm mạnh:**
- Kết nối với các tổ chức fact-check toàn cầu
- Kết quả từ báo chí uy tín
- Miễn phí

**Cách sử dụng:**
1. Truy cậptoolbox.google.com/factcheck
2. Nhập từ khóa cần kiểm tra
3. Xem kết quả từ nhiều nguồn

### 3. Tin Nhiễm Mạng (tinnhiemmang.vn)
**Điểm mạnh:**
- Cảnh báo tin giả Việt Nam
- Phân loại theo lĩnh vực
- Cập nhật thường xuyên

**Cách sử dụng:**
1. Truy cập tinnhiemmang.vn
2. Xem danh sách tin giả đã xác minh
3. Tìm kiếm tin cụ thể

### 4. Snopes
**Điểm mạnh:**
- Cơ sở dữ liệu fact-check lớn nhất thế giới
- Phân tích chi tiết từng tin
- Đánh giá mức độ tin cậy

**Cách sử dụng:**
1. Truy cập snopes.com
2. Tìm kiếm tin cần kiểm tra
3. Đọc phân tích chi tiết

### 5. FactCheck.org
**Điểm mạnh:**
- Phi lợi nhuận, không thiên vị
- Chuyên về chính trị, xã hội
- Phân tích chuyên sâu

**Cách sử dụng:**
1. Truy cập factcheck.org
2. Tìm kiếm chủ đề quan tâm
3. Đọc phân tích chuyên gia

## Mẹo Sử Dụng Hiệu Quả

1. **Kết hợp nhiều công cụ** để có kết quả chính xác
2. **Đọc kỹ phân tích**, không chỉ xem điểm
3. **Tự kiểm tra thêm** qua nguồn chính thức
4. **Chia sẻ công cụ** cho người thân

## Kết Luận

Công cụ AI giúp kiểm tra tin giả nhanh chóng, nhưng tư duy phản biện vẫn là quan trọng nhất. Hãy sử dụng kết hợp công cụ và kiến thức cá nhân.
    `,
    contentEn: `
## Why Do We Need Fake News Checking Tools?

Humans can't remember and verify every piece of information. AI tools help check faster and more accurately than manual methods.

## Top 5 Free Tools

### 1. La Chan So (lachansovn.com)
**Strengths:**
- Multi-layer AI analysis: language, credibility, behavior
- Credibility graph with 1,000+ trusted sources
- Vietnamese scam pattern recognition
- Free, no registration required

**How to use:**
1. Visit lachansovn.com
2. Paste the link or text you want to check
3. Click "Check"
4. View the analysis results

### 2. Google Fact Check Tools
**Strengths:**
- Connected to global fact-checking organizations
- Results from reputable publications
- Free to use

**How to use:**
1. Visit toolbox.google.com/factcheck
2. Enter the keyword you want to verify
3. View results from multiple sources

### 3. Tin Nhiem Mang (tinnhiemmang.vn)
**Strengths:**
- Vietnamese fake news warnings
- Categorized by topic
- Regularly updated

**How to use:**
1. Visit tinnhiemmang.vn
2. Browse verified fake news list
3. Search for specific stories

### 4. Snopes
**Strengths:**
- World's largest fact-check database
- Detailed analysis of each claim
- Credibility ratings

**How to use:**
1. Visit snopes.com
2. Search for the claim you want to verify
3. Read the detailed analysis

### 5. FactCheck.org
**Strengths:**
- Non-profit, non-partisan
- Focused on politics and society
- In-depth expert analysis

**How to use:**
1. Visit factcheck.org
2. Search for the topic you're interested in
3. Read expert analysis

## Tips for Effective Use

1. **Combine multiple tools** for more accurate results
2. **Read the full analysis**, not just the rating
3. **Verify further** through official sources
4. **Share these tools** with family and friends

## Conclusion

AI tools help verify fake news quickly, but critical thinking remains the most important. Use a combination of tools and personal knowledge.
    `
  },
  {
    id: "14",
    slug: "nhom-outside-enterprise-lua-dao-ai",
    title: "Cảnh báo đỏ: Nhóm tội phạm 'Outsider Enterprise' dùng AI tạo hàng nghìn website giả, đánh cắp gần 4 triệu thẻ",
    description: "Bộ Công an và các ngân hàng phát cảnh báo về chiến dịch lừa đảo toàn cầu do nhóm 'Outsider Enterprise' vận hành: AI tự động tạo website giả mạo ngân hàng, đơn vị vận chuyển và sàn thương mại điện tử, đánh cắp ~3,87 triệu thẻ tín dụng chỉ trong 2 tháng.",
    category: "Phòng Chống Lừa Đảo",
    categoryEn: "Anti-Scam",
    titleEn: "Red Alert: 'Outsider Enterprise' Crime Group Uses AI to Create Thousands of Fake Websites, Stealing Nearly 4 Million Credit Cards",
    descriptionEn: "The Ministry of Public Security and banks warn of a global scam campaign operated by the 'Outsider Enterprise' group: AI automatically creates fake banking, shipping, and e-commerce websites, stealing ~3.87 million credit cards in just 2 months.",
    tags: ["AI", "deepfake", "website giả", "SMS", "cảnh báo", "ngân hàng"],
    publishedAt: "2026-08-08",
    readTime: 5,
    author: "Lá Chắn Số",
    content: `
## Câu chuyện thật từ cảnh báo của Bộ Công an

Đầu tháng 8/2026, Cục An ninh mạng và Phòng chống tội phạm sử dụng công nghệ cao (Bộ Công an) và một số tổ chức tài chính đồng loạt phát cảnh báo về chiến dịch lừa đảo quy mô toàn cầu do nhóm tội phạm **"Outsider Enterprise"** vận hành.

Đây là sự kết hợp giữa **AI và lừa đảo**:

- Hệ thống **dùng trí tuệ nhân tạo tự động tạo ra hàng nghìn website giả mạo**: ngân hàng, đơn vị vận chuyển, sàn thương mại điện tử.
- **Phát tán hàng loạt SMS chứa đường link độc hại**, dẫn người dùng vào web giả giống hệt trang thật.
- Chỉ riêng tháng 5-6/2026, nhóm đã phát tán **hơn 2,5 triệu SMS** và đánh cắp thông tin của khoảng **3,87 triệu thẻ tín dụng**, thiệt hại lên tới **1,9 tỷ USD**.

## Điểm đáng chú ý

Hệ thống có thể **đánh cắp thông tin theo thời gian thực ngay trong lúc bạn đang nhập liệu** — không cần chờ bạn bấm nút xác nhận nào.

## Nhận diện tin nhắn lừa đảo kiểu này

### 1. SMS có nội dung "gấp"
Tài khoản sắp bị khóa, xác minh ngay kẻo mất tiền, có bưu kiện chưa nhận, trúng thưởng… — đây là các dấu hiệu điển hình.

### 2. Tên miền khác một ký tự
Viết gần giống website thật (typo domain). Chỉ cần sai một ký tự cũng có thể là web giả.

### 3. Link rút gọn
Bit.ly, cutt.ly… giấu địa chỉ thật. Đừng bấm vào link rút gọn trong tin nhắn lạ.

### 4. Yêu cầu nhập OTP / mật khẩu gấp
Ngân hàng thật **không bao giờ** yêu cầu bạn gửi mật khẩu, mã OTP qua tin nhắn SMS hoặc "nhân viên hỗ trợ".

## 4 bước bảo vệ tại chỗ

1. **Bình tĩnh** — đừng vì áp lực "khẩn cấp" mà làm theo.
2. **Không bấm link** trong SMS/email/Facebook/Zalo lạ.
3. **Tự gõ địa chỉ** ngân hàng thật vào trình duyệt để đăng nhập.
4. **Dán link vào Lá Chắn Số** trước khi nhập bất kỳ thông tin gì.
    `,
    contentEn: `
## A Real Story from the Ministry of Public Security's Warning

In early August 2026, the Cybersecurity and High-Tech Crime Prevention Department (Ministry of Public Security) and several financial institutions simultaneously issued warnings about a global scam campaign operated by the crime group **"Outsider Enterprise"**.

This is a combination of **AI and fraud**:

- The system **uses artificial intelligence to automatically create thousands of fake websites**: banks, shipping companies, e-commerce platforms.
- **Mass-distributing SMS containing malicious links**, leading users to fake sites that look identical to the real ones.
- In May-June 2026 alone, the group distributed **over 2.5 million SMS messages** and stole information from approximately **3.87 million credit cards**, with damages reaching **1.9 billion USD**.

## Key Takeaway

The system can **steal your information in real-time as you're typing** — you don't even need to press a confirm button.

## How to Recognize This Type of Scam

### 1. "Urgent" SMS Messages
Account about to be locked, verify now or lose your money, unclaimed package, prize winner — these are classic warning signs.

### 2. Domain Off by One Character
Designed to look like the real website (typo domain). A single character difference could mean it's a fake.

### 3. Shortened Links
Bit.ly, cutt.ly... hiding the real address. Don't click shortened links in unfamiliar messages.

### 4. Urgent OTP / Password Requests
Real banks **never** ask you to send your password or OTP code via SMS or to a "support agent".

## 4 Steps to Protect Yourself

1. **Stay calm** — don't act under "urgent" pressure.
2. **Don't click links** in SMS/email/Facebook/Zalo from unknown sources.
3. **Type the bank's real address** yourself in your browser to log in.
4. **Paste the link into La Chan So** before entering any information.
    `
  },
  {
    id: "15",
    slug: "lua-dao-shipper-huy-dang-ky-giao-hang",
    title: "Cảnh giác 'shipper' gọi điện: từ thông báo đơn hàng đến yêu cầu chuyển tiền hủy đăng ký",
    description: "Cảnh báo mới từ Công an TP Cần Thơ (8/2026): đối tượng giả danh shipper rồi chuyển sang giả nhân viên bưu điện yêu cầu nạn nhân 'hủy đăng ký tài khoản giao hàng' và chuyển tiền 'xác minh', liên tục viện lỗi giao dịch để chuyển thêm tiền.",
    category: "Phòng Chống Lừa Đảo",
    categoryEn: "Anti-Scam",
    titleEn: "Beware of 'Shippers' Calling: From Delivery Notifications to Requests to Transfer Money to Cancel Registration",
    descriptionEn: "New warning from Can Tho City Police (August 2026): scammers impersonate shippers, then switch to posing as postal workers asking victims to 'cancel delivery account registration' and transfer money for 'verification', repeatedly citing transaction errors to demand more transfers.",
    tags: ["shipper", "bưu điện", "giao hàng", "chuyển tiền", "cảnh báo"],
    publishedAt: "2026-08-05",
    readTime: 4,
    author: "Lá Chắn Số",
    content: `
## Kịch bản lừa đảo thực tế (theo Công an TP Cần Thơ)

1. Một người tự xưng **shipper** gọi điện thông báo bạn đang được giao một đơn hàng.
2. Sau đó chuyển qua giả danh **nhân viên bưu điện** / "tổng đài hỗ trợ đơn vị vận chuyển".
3. Họ nói bạn bị **đăng ký nhầm tài khoản shipper**, viện lý do sẽ phát sinh nghĩa vụ tài chính, rủi ro pháp lý.
4. Đối tượng hướng dẫn bạn liên hệ với một số "tổng đài" do chúng cung cấp, mở ra "thủ tục hủy" bằng… chuyển tiền.
5. Tiền chuyển xong, chúng báo "giao dịch lỗi, sai cú pháp, tiền chưa vào hệ thống" → yêu cầu chuyển thêm nhiều lần để "khắc phục lỗi".

## Dấu hiệu nhận biết

- **Số "tổng đài" do đối tượng cung cấp** — đừng gọi theo số họ gửi, hãy tra số chính thức trên website.
- **"Hủy đăng ký" qua chuyển tiền là phi lý.** Bưu chính, vận chuyển, cơ quan nhà nước **không bao giờ** yêu cầu chuyển tiền để hủy dịch vụ hay "khắc phục lỗi hệ thống".
- **Kịch bản lặp lỗi chuyển khoản** nhiều lần là dấu hiệu không phải nghiệp vụ thật.

## Xử lý khi nghi ngờ

- Cúp máy, gọi tổng đài chính thức (số trên website, không phải số chúng gửi).
- Không cung cấp OTP, số tài khoản, mật khẩu.
- Dán chính nội dung tin nhắn lên Lá Chắn Số để kiểm tra mức rủi ro và tìm bài cảnh báo tương tự.
  `,
  contentEn: `
## The Scam Scenario (According to Can Tho City Police)

1. A person claiming to be a **shipper** calls to inform you about a delivery.
2. Then switches to impersonating a **postal worker** / "shipping company support line".
3. They say you accidentally **registered a delivery account**, citing potential financial obligations and legal risks.
4. The scammer directs you to call a "hotline" they provide, which opens a "cancellation procedure" via... money transfer.
5. After you transfer, they report "transaction error, wrong syntax, money hasn't entered the system" → asking you to transfer more to "fix the error".

## Warning Signs

- **"Hotline" numbers provided by the scammer** — don't call the numbers they send; look up the official number on the website.
- **"Canceling registration" via money transfer is illogical.** Postal services, shipping companies, and government agencies **never** request money transfers to cancel services or "fix system errors".
- **Repeated "transfer errors"** are a sign this is not a legitimate process.

## What to Do If You Suspect a Scam

- Hang up, call the official hotline (from the website, not the number they sent).
- Don't provide OTP, account numbers, or passwords.
- Paste the message content directly into La Chan So to check the risk level and find similar warnings.
  `
  },
  {
    id: "16",
    slug: "bien-lai-chuyen-khoan-gia",
    title: "Biên lai chuyển khoản thành công 'nhưng tiền chưa vào': chiêu tạo biên lai giả mới",
    description: "Công an tỉnh Nghệ An (8/2026) cảnh báo thủ đoạn dùng phần mềm chỉnh sửa ảnh tạo biên lai chuyển khoản giả với đầy đủ số tài khoản, tên người nhận và số tiền — đánh vào tâm lý giao tài sản trước khi ngân hàng xử lý.",
    category: "Phòng Chống Lừa Đảo",
    categoryEn: "Anti-Scam",
    titleEn: "Successful Bank Transfer Receipt 'But Money Hasn't Arrived': A New Fake Receipt Scam",
    descriptionEn: "Nghe An Provincial Police (August 2026) warn of a new trick: using photo-editing software to create fake bank transfer receipts with complete account numbers, recipient names, and amounts — exploiting the psychology of releasing goods before the bank processes the transaction.",
    tags: ["biên lai giả", "chuyển khoản", "fake bill", "deepfake", "giao dịch"],
    publishedAt: "2026-08-04",
    readTime: 4,
    author: "Lá Chắn Số",
    content: `
## Vì sao "biên lai" không nên là căn cứ duy nhất?

Thực tế mới (2026): các đối tượng dùng **phần mềm chỉnh sửa ảnh hoặc AI để tạo biên lai chuyển khoản thành công giả** với đầy đủ thông tin — số tài khoản, tên người nhận, số tiền giao dịch. Một số trường hợp còn kèm theo ảnh chụp màn hình giả (fake bill) để thuyết phục.

Nếu bạn giao hàng hoặc giao tài sản trước khi kiểm tra số dư thực tế — coi như đã mất tiền.

## Cách kiểm tra không bao giờ sai

1. **Đừng tin ảnh biên lai.** Chỉ tin **số dư thực tế trong app ngân hàng** được ghi nhận.
2. Kiểm tra **SMS thông báo ghi có** từ ngân hàng (không phải tin nhắn do người ta soạn).
3. Giao dịch lớn: **yêu cầu đối tác nhận diện rõ người** (tháo khẩu trang/giả che) trước khi giao tài sản.
4. Người nóng vội thúc giao nhưng "quên" chuyển tiền — cho vào danh sách nghi ngờ.

## Câu hỏi bạn nên hỏi trực tiếp trước khi giao

- "Bạn đã chuyển chưa?" — mời xem ảnh màn hình app, không phải ảnh biên lai.
- "Sao số dư tôi chưa tăng?" — Chờ vài phút, gọi ngân hàng xác minh.
- Đối tác lạ + khẩn khoản giao: giảm thấy cảnh giác hơn.

**Ảnh thì dễ tạo, tiền thật mới khó.** Chỉ tin số dư trong app của chính bạn.
    `,
    contentEn: `
## Why a "Receipt" Shouldn't Be Your Only Proof

A new reality in 2026: scammers use **photo-editing software or AI to create fake bank transfer receipts** with complete information — account numbers, recipient names, and transaction amounts. Some cases even include fake screenshots (fake bills) to be more convincing.

If you hand over goods or assets before checking your actual balance — consider the money lost.

## How to Verify (Never Fails)

1. **Don't trust receipt images.** Only trust **the actual balance in your banking app**.
2. Check **credit notification SMS** from your bank (not messages composed by the other person).
3. Large transactions: **ask the other party to identify themselves clearly** (remove masks/coverings) before handing over goods.
4. Someone rushing you to deliver but "forgot" to transfer — add them to your suspicion list.

## Questions You Should Ask Directly Before Handing Over

- "Have you transferred yet?" — ask to see the app screenshot, not a receipt image.
- "Why hasn't my balance increased?" — Wait a few minutes, call the bank to verify.
- Stranger + urgent delivery request = lower your guard less.

**Photos are easy to create; real money is hard to fake.** Only trust the balance in your own app.
    `
  }
];

export function getBlogArticleBySlug(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find(article => article.slug === slug);
}

export function getBlogArticlesByCategory(category: string): BlogArticle[] {
  return BLOG_ARTICLES.filter(article => article.category === category);
}

export function getBlogCategories(): string[] {
  return [...new Set(BLOG_ARTICLES.map(article => article.category))];
}
