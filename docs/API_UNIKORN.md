# Lá Chàn Số — API Tích Hợp Kiểm Tra Link An Toàn

## Dành cho: Unikorn.vn

---

## 1. Tổng Quan

Lá Chàn Số cung cấp API kiểm tra link an toàn. Khi user đăng sản phẩm trên diễn đàn Unikorn, hệ thống tự động gọi API để kiểm tra link có lừa đảo, phishing hay không.

**Kết quả trả về:**
- **safe** → Cho phép đăng
- **suspicious** → Cảnh báo, cần duyệt thủ công
- **danger** → Chặn, không cho đăng

---

## 2.Thông Tin Kết Nối

| Thông tin | Giá trị |
|-----------|---------|
| **Base URL** | `https://lachansovn.com` |
| **Endpoint** | `POST /api/partner/unikorn/check-link` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |

---

## 3. Xác Thực (Authentication)

Mỗi request phải có header `x-api-key`:

```
x-api-key: lcs_unikorn_a1b2c3d4e5f6
```

> **Lưu ý:** API key được cung cấp riêng. Không chia sẻ key cho bên thứ ba.

---

## 4. Cách Gọi API

### 4.1. Request

```bash
curl -X POST https://lachansovn.com/api/partner/unikorn/check-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: lcs_unikorn_a1b2c3d4e5f6" \
  -d '{"url": "https://shopee.vn/sp/12345"}'
```

### 4.2. Body Parameters

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `url` | string | **Có** | Link cần kiểm tra |

### 4.3. Response — Link An Toàn

```json
{
  "success": true,
  "safe": true,
  "score": 92,
  "verdict": "safe",
  "hostname": "shopee.vn",
  "reasons": [],
  "cached": false
}
```

### 4.4. Response — Link Nguy Hiểm

```json
{
  "success": true,
  "safe": false,
  "score": 15,
  "verdict": "danger",
  "hostname": "shopee-fake.com",
  "reasons": [
    {
      "id": "LINK_SCAM",
      "name": "LỪA ĐẢO / CỜ BẠC",
      "detail": "Domain nằm trong danh sách đen lừa đảo",
      "status": "danger",
      "scoreDelta": -80
    }
  ],
  "cached": false
}
```

### 4.5. Response — Link Đáng Ngờ

```json
{
  "success": true,
  "safe": false,
  "score": 55,
  "verdict": "suspicious",
  "hostname": "shop-ban-hang.com",
  "reasons": [
    {
      "id": "LINK_NEW_DOMAIN",
      "name": "TÊN MIỀN MỚI",
      "detail": "Tên miền chỉ mới đăng ký 3 ngày",
      "status": "warning",
      "scoreDelta": -25
    }
  ],
  "cached": false
}
```

### 4.6. Response — Lỗi

```json
{
  "success": false,
  "error": "Thiếu trường url trong request body"
}
```

---

## 5. Ý Nghĩa Các Trường

### 5.1. `safe` (boolean)

| Giá trị | Ý nghĩa |
|---------|---------|
| `true` | Link an toàn, cho phép đăng |
| `false` | Link không an toàn, cần xem xét |

### 5.2. `score` (number, 0-100)

| Điểm | Ý nghĩa |
|------|---------|
| 80-100 | An toàn |
| 50-79 | Đáng ngờ, cần kiểm tra thêm |
| 0-49 | Nguy hiểm, không nên cho đăng |

### 5.3. `verdict` (string)

| Giá trị | Ý nghĩa | Hành động |
|---------|---------|-----------|
| `"safe"` | An toàn | Cho đăng ngay |
| `"suspicious"` | Đáng ngờ | Duyệt thủ công |
| `"danger"` | Nguy hiểm | Chặn đăng |

### 5.4. `reasons` (array)

Danh sách các lý do đánh giá. Mỗi lý do có:

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | string | Mã lỗi (ví dụ: `LINK_SCAM`, `LINK_PHISHING`) |
| `name` | string | Tên lỗi |
| `detail` | string | Chi tiết lỗi |
| `status` | string | `"success"` / `"warning"` / `"danger"` |
| `scoreDelta` | number | Điểm trừ/thêm |

### 5.5. `hostname` (string)

Tên miền được trích xuất từ URL (ví dụ: `shopee.vn`).

### 5.6. `cached` (boolean)

| Giá trị | Ý nghĩa |
|---------|---------|
| `true` | Kết quả lấy từ cache (đã check trước đó) |
| `false` | Kết quả check mới |

---

## 6. Ví Dụ Tích Hợp

### 6.1. JavaScript (Node.js / Express)

```javascript
async function checkLinkSafety(url) {
  const response = await fetch('https://lachansovn.com/api/partner/unikorn/check-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'lcs_unikorn_a1b2c3d4e5f6'
    },
    body: JSON.stringify({ url })
  });

  const result = await response.json();

  if (!result.success) {
    console.error('Lỗi:', result.error);
    return null;
  }

  return {
    allowed: result.safe,
    score: result.score,
    verdict: result.verdict
  };
}

// Sử dụng khi user đăng sản phẩm
app.post('/api/products', async (req, res) => {
  const { link } = req.body;

  const safety = await checkLinkSafety(link);

  if (!safety) {
    return res.status(500).json({ error: 'Không thể kiểm tra link' });
  }

  if (safety.verdict === 'danger') {
    return res.status(400).json({ error: 'Link này không an toàn, vui lòng chọn link khác' });
  }

  if (safety.verdict === 'suspicious') {
    // Lưu sản phẩm ở trạng thái "chờ duyệt"
    await saveProduct({ ...req.body, status: 'pending_review' });
    return res.json({ message: 'Sản phẩm chờ duyệt' });
  }

  // safe → cho đăng ngay
  await saveProduct({ ...req.body, status: 'published' });
  res.json({ message: 'Đăng sản phẩm thành công' });
});
```

### 6.2. Python

```python
import requests

def check_link_safety(url):
    response = requests.post(
        'https://lachansovn.com/api/partner/unikorn/check-link',
        json={'url': url},
        headers={
            'Content-Type': 'application/json',
            'x-api-key': 'lcs_unikorn_a1b2c3d4e5f6'
        }
    )

    result = response.json()

    if not result['success']:
        return None

    return {
        'allowed': result['safe'],
        'score': result['score'],
        'verdict': result['verdict']
    }

# Sử dụng
safety = check_link_safety('https://shopee.vn/sp/12345')
if safety and safety['verdict'] == 'danger':
    print('Link không an toàn!')
```

### 6.3. cURL

```bash
# Kiểm tra link
curl -X POST https://lachansovn.com/api/partner/unikorn/check-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: lcs_unikorn_a1b2c3d4e5f6" \
  -d '{"url": "https://example.com"}'

# Kiểm tra nhiều link
for url in "https://shopee.vn/sp/123" "https://lazada.vn/product/456"; do
  curl -s -X POST https://lachansovn.com/api/partner/unikorn/check-link \
    -H "Content-Type: application/json" \
    -H "x-api-key: lcs_unikorn_a1b2c3d4e5f6" \
    -d "{\"url\": \"$url\"}"
  echo ""
done
```

---

## 7. Rate Limit

| Giới hạn | Giá trị |
|----------|---------|
| **Requests/phút** | 100 |
| **Trả về khi vượt** | `429 Too Many Requests` |

```json
{
  "error": "Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút."
}
```

---

## 8. Danh Sách Mã Lỗi (reasons.id)

| Mã | Tên | Mức độ | Ý nghĩa |
|----|-----|--------|---------|
| `LINK_SCAM` | Lừa đảo | danger | Domain nằm trong danh sách đen |
| `LINK_PHISHING` | Giả mạo | danger | Trang web giả mạo thương hiệu |
| `LINK_GAMBLING` | Cờ bạc | danger | Trang cờ bạc, cá cược |
| `LINK_NEW_DOMAIN` | Tên miền mới | warning | Mới đăng ký < 30 ngày |
| `LINK_NO_SSL` | Không có SSL | warning | Không sử dụng HTTPS |
| `LINK_SHORTENER` | Rút gọn URL | warning | Dùng dịch vụ rút gọn link |
| `LINK_DEEP_SUBDOMAIN` | Subdomain sâu | warning | Quá nhiều subdomain |
| `LINK_SUSPICIOUS_TLD` | TLD đáng ngờ | warning | Dùng đuôi .xyz, .top, .buzz... |
| `LINK_HOMOGLYPH` | Homoglyph | danger | Dùng ký tự giống nhau để giả mạo |
| `LINK_REDIRECT` | Chuyển hướng | warning | Có redirect chain |

---

## 9. Hỗ Trợ

| Phương tiện | Thông tin |
|-------------|-----------|
| **Website** | [lachansovn.com](https://lachansovn.com) |
| **Email** | admin@lachansovn.com |
| **Fanpage** | Lá Chàn Số trên Facebook |

---

*Cập nhật lần cuối: 27/08/2026*
