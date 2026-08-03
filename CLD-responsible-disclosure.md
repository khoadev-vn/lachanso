# Responsible Disclosure — Chống Lừa Đảo (chongluadao.vn)

- **Người nghiên cứu:** [Tên của bạn]
- **Liên hệ:** [email của bạn]
- **Mục tiêu:** https://chongluadao.vn/report/reportphishing#leaderboard (bảng xếp hạng)
- **API backend:** `https://feeds.chongluadao.vn`
- **Ngày:** 2026-08-03
- **Phạm vi:** Chỉ phân tích và kiểm tra an toàn (read-only, không khai thác ngoài phạm vi). Không tạo dữ liệu thật trên hệ thống.

---

## Tóm tắt

Bảng xếp hạng (leaderboard) được tính từ điểm do các báo cáo **đã được duyệt** (`APPROVED`) gắn với một địa chỉ email. Điểm không thể bị ghi giả trực tiếp (vì cần admin duyệt), nhưng có **một số lỗ hổng về xác thực và kiểm soát đầu vào** cho phép kẻ tấn công làm sai lệch thứ hạng, spam hệ thống, và lạm dụng tài nguyên.

**Mức độ tổng thể: Trung bình (Medium)** — không cho RCE/đọc DB, nhưng làm tổn hại tính toàn vẹn dữ liệu công khai và tài nguyên hệ thống.

---

## Kết quả khảo sát (read-only)

Leaderboard được lấy từ:

```
GET https://feeds.chongluadao.vn/ranks?limit=100&sort=total_points,DESC
```

Phản hồi mẫu:

```json
{"data":[{"email":"t***@gmail.com","role":"REPORTER","total_points":646,"sum_points":646,"rank":1}, ...],"total":500,"pageCount":167}
```

- Email được che chữ (mask) ở phía server → điểm tốt, không lộ email đầy đủ.
- Bảng xếp hạng tháng dùng tham số `s` (JSON kiểu MongoDB `{"start_date":{"$gte":...},"end_date":{"$lte":...}}`).
- Điểm được cộng cho `reporter_email` trong payload gửi lên khi tạo báo cáo.
- Report được tạo bằng:
  ```
  POST https://feeds.chongluadao.vn/reports
  Body: {"reporter_email":"...","url_type":"2:PHISHING","url":"...","description":"..."}
  ```

---

## Phát hiện

### 1. Thiếu reCAPTCHA và rate limiting trên `/reports` (POST) — Spam / cày điểm hàng loạt

- Các endpoint khác (`/checksafe`, `/checkbreach`, `/checkwhois`...) yêu cầu header `X-Recaptcha-Token`.
- Endpoint tạo báo cáo `/reports` **KHÔNG** yêu cầu token này.
- Kiểm tra: gửi 15 yêu cầu liên tiếp (cùng một URL đã tồn tại) → **không có bất kỳ 429/block/throttle nào**, toàn bộ trả về `409 Conflict` đồng thời.
- **Ảnh hưởng:**
  - Attacker có thể tự động hóa việc gửi hàng loạt báo cáo URL lừa đảo thật → **cày điểm lên leaderboard** cho bất kỳ email nào họ kiểm soát (điểm được duyệt sau khi admin xác nhận).
  - Làm nghẽn hàng đợi duyệt của admin (DoS ở mức quy trình), làm chậm trễ xử lý báo cáo thật.
  - Không có "ngưỡng" nào để chặn.

**Cách khắc phục gợi ý:** bắt buộc reCAPTCHA trên `/reports`, thêm rate limiting theo IP/email (vd. tối đa N báo cáo/giờ), và thêm bước xác minh email trước khi điểm được cộng.

---

### 2. `reporter_email` không được xác minh — mạo danh / gán điểm sai

- Payload gửi `/reports` nhận `reporter_email` **tùy ý**, không yêu cầu đăng nhập, không xác minh email, không OTP.
- **Ảnh hưởng:**
  - Attacker có thể gửi báo cáo gắn với email của **nạn nhân** để đẩy nạn nhân lên top (mạo danh).
  - Ngược lại, có thể gửi báo cáo rác gắn email nạn nhân → làm hại uy tín / khiến nạn nhân bị gán sai danh tiếng.
  - Không có ràng buộc danh tính giữa người gửi và email nhận điểm → **tính toàn vẹn của bảng xếp hạng phụ thuộc hoàn toàn vào tự khai báo**.

**Cách khắc phục gợi ý:** yêu cầu xác minh email (magic link / OTP) trước khi điểm được cộng vào leaderboard; hoặc gắn danh tính qua tài khoản đăng nhập thay vì trường tự khai.

---

### 3. `/upload-image` không xác thực — lạm dụng tài nguyên, upload file tùy ý

```
POST https://feeds.chongluadao.vn/upload-image   (không token, không login)
```

- Chấp nhận mọi file, chuyển lên dịch vụ bên thứ ba (pasteboard.co), trả link công khai.
- Kiểm tra: upload file `.txt` (không phải ảnh) vẫn thành công, `HTTP 201`.
- **Ảnh hưởng:** bất kỳ ai cũng có thể dùng server này làm proxy upload lưu trữ file, tốn băng thông/dung lượng, lưu trữ nội dung không mong muốn. Ở mức thấp-trung bình.

**Cách khắc phục gợi ý:** validate MIME nội dung thật (không tin extension), giới hạn kích thước, giới hạn số lần/IP, và có thể thêm xác thực.

---

### 4. SSRF nghi ngờ tại các endpoint fetch phía server — cần kiểm tra cẩn thận

Các endpoint sau khiến server tải URL do người dùng cung cấp:

- `GET /screenshots/capture?url=<url>` → trả về nội dung/ảnh (trả `200` khi test với `https://example.com`)
- `GET /net/ip?url=<url>` → trả IP/geo của URL đó
- `GET /net/check-url-exists?url=<url>`
- `POST /checksafe/<id>` với body `{"url":...}`

Đây là chức năng hợp lệ (phân tích URL lừa đảo), nhưng nếu filter không đủ chặt, attacker có thể trỏ server tới **metadata cloud (169.254.169.254), localhost, mạng nội bộ**.

**Ghi chú:** tôi **không** thử truy cập nội bộ/metadata trong buổi kiểm tra này. Cần Hiếu PC/đội kỹ thuật tự kiểm tra hoặc cho phép môi trường test riêng để xác nhận mức độ khai thác.

**Cách khắc phục gợi ý:** block IP private/link-local/loopback và metadata IP trước khi fetch; dùng DNS resolver kiểm soát; giới hạn redirect.

---

### 5. Tham số `s` kiểu MongoDB của `/ranks` — không phát hiện được injection

- Đã thử `$regex`, `$where`, `$ne`, `$gt` chèn vào tham số `s` → server trả về dữ liệu **không bị ảnh hưởng** (bộ lọc bị làm sạch/ignored). Không xác nhận được NoSQL injection ở endpoint này.
- Ghi nhận để đội kỹ thuật xem lại cách parse `s` (JSON do client cung cấp) nhằm đảm bảo chỉ chấp nhận whitelist field/operator.

---

### 6. Admin backend — khảo sát (chỉ-đọc)

Khảo sát đường dẫn admin trên `chongluadao.vn` và `feeds.chongluadao.vn` (chỉ GET, không bruteforce, không bypass auth):

- **Server:** `feeds.chongluadao.vn` chạy **openresty + Express (Node.js)**, `X-Powered-By: Express`.
- **Auth:** JWT — các endpoint admin trả `401 Unauthorized` khi không có token:
  - `/reports/*` (approve, approval, review, status, accept, reject) → `401`
  - `/users`, `/users/approve` → `401`
  - `/health` → `200`
- **Rate limiting hiện diện:** header `X-Ratelimit-Limit: 7` trên `/reports/approve`, `100` trên `/users`.
- **Admin frontend:** `admin.chongluadao.vn` **không có DNS record**; các path admin phổ biến trên cả hai host đều `404`. Admin panel không được public ra internet.
- Các path `/admin/*`, `/auth/*`, `/api/*` trên feeds → `404` (không tồn tại).

**Đánh giá:** cấu hình admin khá tốt — JWT + rate limit + không public frontend. Không phát hiện endpoint admin nào truy cập được công khai. Ghi nhận tích cực cho đội kỹ thuật.

---

## Kết quả kiểm tra thực tế (test 1 report duy nhất — 2026-08-03)

Để xác nhận luồng tạo báo cáo có tự duyệt (auto-approve) hay không, đã gửi **đúng 1 báo cáo test**:

```
POST https://feeds.chongluadao.vn/reports
Body: {"reporter_email":"pentest-research-cld@example.com","url_type":"2:PHISHING",
       "url":"https://www.iana.org/domains/reserved?cldtest=1785694352",
       "description":"Security research test - responsible disclosure. Please ignore."}
```

**Kết quả: HTTP 201 — report được tạo nhưng KHÔNG tự duyệt.**

```json
{"status":"CREATED","level":"3:HIGH","id":56926,
 "uuid":"87d202e8-4278-42d2-8eb5-3d1f2b28d6e8",
 "created_at":"2026-08-02T18:12:29.242Z","updated_at":"2026-08-02T18:12:29.242Z",
 "reporter_email":"pentest-research-cld@example.com"}
```

- Trạng thái `CREATED` (chờ xử lý), **không** `APPROVED` → **không có auto-approve**. Điểm leaderboard chỉ được cộng khi admin duyệt.
- Không thấy email test xuất hiện trên leaderboard (email bị che ký tự phía server, không có điểm mới).
- Truy vấn chi tiết report bằng id/uuid đều trả `401 Unauthorized` → endpoint chỉ admin truy cập.

**Kết luận:** Để đẩy 1 email lên top-10 cần nhiều báo cáo **được duyệt**, tức là attacker phải liên tục gửi các URL lừa đảo thật và chờ duyệt. Vấn đề thực sự là: **không rate limit + không reCAPTCHA + email không xác minh** cho phép automation cày hàng loạt → làm sai lệch thứ hạng về lâu dài và spam hàng đợi admin. Đây là phát hiện đáng báo cáo, không phải auto-approve.

> **Lưu ý cho đội kỹ thuật:** xin xóa report test `id 56926` / `uuid 87d202e8-4278-42d2-8eb5-3d1f2b28d6e8` khỏi hàng đợi.

---

## Đề xuất ưu tiên

| # | Vấn đề | Mức | Ưu tiên |
|---|--------|-----|---------|
| 1 | Thiếu reCAPTCHA + rate limit trên `/reports` | Medium | Cao |
| 2 | `reporter_email` không xác minh → mạo danh điểm | Medium | Cao |
| 3 | `/upload-image` không xác thực | Low-Med | Trung bình |
| 4 | SSRF nghi ngờ ở các endpoint fetch | Medium (cần xác nhận) | Trung bình |
| 5 | Tham số `s` MongoDB — chỉ ghi nhận | Info | Thấp |

---

## Cam kết

- Không tạo báo cáo/dữ liệu thật trên hệ thống trong quá trình kiểm tra (mọi POST chỉ dùng URL đã tồn tại để trả `409`, hoặc URL không hợp lệ để trả `400`).
- Không khai thác SSRF nội bộ / không truy cập dữ liệu người khác.
- Sẵn sàng hỗ trợ lại cho đội kỹ thuật nếu cần thông tin chi tiết hơn trong môi trường test được cấp phép.

Xin phép được công bố thông tin này sau khi đã khắc phục.
