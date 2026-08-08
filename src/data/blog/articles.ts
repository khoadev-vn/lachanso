export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  publishedAt: string;
  readTime: number;
  image?: string;
  author: string;
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: "1",
    slug: "cach-nhat-biet-tin-gia-tren-facebook",
    title: "10 Cách Nhận Biết Tin Giả Trên Facebook Năm 2026",
    description: "Hướng dẫn chi tiết 10 cách nhận diện tin giả trên Facebook, từ tiêu đề giật gân đến nguồn tin không xác minh. Bảo vệ bản thân và gia đình khỏi thông tin sai lệch.",
    category: "Phòng Chống Tin Giả",
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
    `
  },
  {
    id: "2",
    slug: "lua-dao-truc-tuyen-pho-bien-2026",
    title: "Top 10 Hình Thức Lừa Đảo Trực Tuyến Phổ Biến 2026",
    description: "Tổng hợp các hình thức lừa đảo trực tuyến phổ biến nhất tại Việt Nam năm 2026: từ phishing, lừa đảo tài chính đến giả mạo thương hiệu. Cách nhận biết và phòng tránh.",
    category: "Phòng Chống Lừa Đảo",
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
    `
  },
  {
    id: "3",
    slug: "cach-bao-ve-tai-khoan-ngan-hang",
    title: "Cách Bảo Vệ Tài Khoản Ngân Hàng Khỏi Lừa Đảo",
    description: "Hướng dẫn bảo vệ tài khoản ngân hàng trực tuyến khỏi các hình thức lừa đảo phổ biến. Mẹo an ninh quan trọng mỗi người dùng cần biết.",
    category: "Bảo Mật Tài Chính",
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
    `
  },
  {
    id: "4",
    slug: "phat-hien-ai-tao-dung-tin-gia",
    title: "Cách Phát Hiện AI Tạo Dung Tin Giả (Deepfake)",
    description: "Hướng dẫn nhận diện video, ảnh, giọng nói giả mạo bằng AI (deepfake). Công nghệ AI ngày càng tinh vi, nhưng vẫn có dấu hiệu nhận biết.",
    category: "Công Nghệ AI",
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
    `
  },
  {
    id: "5",
    slug: "an-ninh-mang-cho-nguoi-lon-tuoi",
    title: "Hướng Dẫn An Ninh Mạng Cho Người Lớn Tuổi",
    description: "Kiến thức an ninh mạng cần thiết cho người lớn tuổi: cách nhận biết lừa đảo, bảo vệ tài khoản, sử dụng mạng xã hội an toàn.",
    category: "Kiến Thức Mạng",
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
    `
  },
  {
    id: "6",
    slug: "kiem-tra-tin-tuc-truoc-khi-chia-se",
    title: "5 Bước Kiểm Tra Tin Tức Trước Khi Chia Sẻ",
    description: "Quy trình 5 bước đơn giản để kiểm tra tin tức trước khi chia sẻ lên mạng xã hội. Tránh lan truyền thông tin sai lệch.",
    category: "Phòng Chống Tin Giả",
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
    `
  },
  {
    id: "7",
    slug: "phishing-nhan-biet-va-phong-tranh",
    title: "Phishing: Cách Nhận Biết Và Phòng Tránh",
    description: "Phishing là hình thức lừa đảo phổ biến nhất. Hướng dẫn nhận biết email, tin nhắn, website phishing và cách bảo vệ bản thân.",
    category: "An Ninh Mạng",
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
    `
  },
  {
    id: "8",
    slug: "lua-dao-tai-chinh-dau-tu",
    title: "Nhận Biết Lừa Đảo Tài Chính - Đầu Tư",
    description: "Cảnh báo các hình thức lừa đảo tài chính, đầu tư lợi nhuận cao, sàn giao dịch giả. Cách nhận biết và bảo vệ tài sản.",
    category: "Tài Chính",
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
    `
  },
  {
    id: "9",
    slug: "bao-mat-thong-tin-ca-nhan",
    title: "Cách Bảo Vệ Thông Tin Cá Nhân Trên Mạng",
    description: "Hướng dẫn bảo vệ thông tin cá nhân trên mạng xã hội, internet. Tránh bị đánh cắp danh tính, lừa đảo.",
    category: "Bảo Mật",
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
    `
  },
  {
    id: "10",
    slug: "cong-cu-kiem-tra-tin-gia",
    title: "Top 5 Công Cụ Kiểm Tra Tin Giả Miễn Phí",
    description: "Tổng hợp 5 công cụ miễn phí kiểm tra tin giả hiệu quả nhất hiện nay: Lá Chắn Số, Google Fact Check, và nhiều hơn nữa.",
    category: "Công Cụ",
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
