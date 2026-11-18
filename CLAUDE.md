# hitDAT — Hít Đất 100

App tập hít đất: thử sức → lên lịch → đếm lượt, mục tiêu 100 cái một hơi.

## Stack

- Web app tĩnh, không bước dựng, không thư viện ngoài. Chạy trên Safari iOS, thêm ra màn hình chính.
- `program.js` — lõi chương trình tập, hàm thuần (mọi con số của chương trình ở đây).
- `progress.js` — số liệu ô «Quá trình tập» (cột hít đất, lịch 4 tuần), hàm thuần. `legs.js` — chương trình tập chân, hàm thuần (động tác, mức, chuỗi bước). `figures.js` — hình giải phẫu bóc da chuyển động theo pha (SVG, hàm thuần: tư thế khoá, khung xương, từng đầu cơ; cường độ cơ theo pha co – thả của từng động tác).
- `app.js` — giao diện, camera, âm thanh, lưu trữ (`localStorage`, khoá `hitdat.v1`).
- `sw.js` — chạy không cần mạng. `manifest.webmanifest`, `icons/` — cài ra màn hình chính.

## Chạy / kiểm / triển khai

- Chạy: `npm start` rồi mở http://localhost:8080
- Kiểm: `npm test` (Node 22, không cần cài gì). CI: `.github/workflows/kiem.yml`.
- Triển khai: GitHub Pages, nguồn nhánh `main`, thư mục gốc. Merge vào main là lên.

## Luật quan trọng

- Đổi luật chương trình tập thì sửa `program.js` / `legs.js` và thêm ca kiểm ở `test/` trong cùng PR.
- Nội dung sức khoẻ (động tác, liều tập, dấu hiệu cần đi khám) phải có nguồn ghi ở `docs/ke-hoach/`; app không chẩn đoán, không hứa chữa bệnh.
- Đổi bất kỳ file nào trong danh sách `FILES` của `sw.js` thì tăng cùng lúc số ở `CACHE` (`sw.js`) và `VERSION` (`app.js`) — hai số phải bằng nhau, có ca kiểm. Số bản hiện ở chân trang. `sw.js` hỏi máy chủ trước, mất mạng mới dùng bản lưu; app tự tải lại khi có bản mới, trừ khi đang giữa buổi tập.
- Đổi hình dạng dữ liệu lưu thì tăng `v` và viết bước chuyển đổi; không làm mất lịch sử tập của người dùng.
- Hình camera chỉ đọc tại chỗ lấy độ sáng; không lưu, không gửi đi đâu. App không gọi mạng ngoài.
- Camera chỉ chạy trên HTTPS hoặc localhost. Không thử được camera thật trong phiên đám mây — mọi thay đổi phần đếm phải ghi rõ «chưa thử trên iPhone thật» cho tới khi có người thử trên máy thật.
- Chữ trên giao diện: tiếng Việt, trung tính như app cho mọi người dùng: gọi «bạn» hoặc không xưng hô.
