# TODO - Tối ưu mượt khi submit (giảm lag)

- [x] Bước 1: Sửa `src/App.tsx`

  - Thêm `await new Promise(requestAnimationFrame)` (yield) trước khi chạy pipeline thật để trình duyệt kịp paint loading.
  - Thêm cơ chế `jobId`/guard để bấm nhiều lần không chồng compute và không set state từ job cũ.

- [x] Bước 2: Sửa `src/constants/fakeNewsKeywords.ts`
  - Truncate text đầu vào cho keyword scanning (giới hạn ký tự).
  - Tối ưu precompute normalized keyword (giảm normalize trong vòng lặp keyword search) nếu thực hiện được với rủi ro thấp.


- [x] Bước 3: Sửa `src/constants/newsVerification.ts`
  - Truncate text đầu vào cho regex để giảm CPU khi user paste/dán quá dài.


- [x] Bước 4: Chạy dev/test

  - `npm run dev`
  - Kiểm tra mượt khi bấm submit ngay sau khi nhập URL/văn bản dài; xác nhận không giật/đơ UI.

