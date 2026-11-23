# hitDAT — Hít Đất 100

App tập hít đất: thử sức → lên lịch → đếm lượt, mục tiêu 100 cái một hơi.

## Stack

- Web app tĩnh, không bước dựng, không thư viện ngoài. Chạy trên Safari iOS, thêm ra màn hình chính.
- `program.js` — lõi chương trình tập, hàm thuần (mọi con số của chương trình ở đây).
- `progress.js` — số liệu ô «Quá trình tập» (cột hít đất, lịch 4 tuần), hàm thuần. `legs.js` — chương trình tập chân, hàm thuần (động tác, mức, chuỗi bước). `figures.js` — hình giải phẫu bóc da chuyển động theo pha (SVG, hàm thuần: tư thế khoá, khung xương, từng đầu cơ; cường độ cơ theo pha co – thả của từng động tác).
- `store.js` — đọc – kiểm dữ liệu lưu, file sao lưu, buổi đang dở; `clock.js` — đồng hồ đếm lùi theo giờ thật. Hàm thuần.
- `app.js` — chỉ khởi động (số bản `VERSION`, đăng ký `sw.js`). Giao diện tách thành file nhỏ: `ui.js` (thanh 3 thẻ, dựng màn, màn tập phủ kín, hộp xác nhận trong app, công tắc, đồng hồ), `view-today.js` / `view-progress.js` / `view-settings.js` (3 thẻ Hôm nay · Tiến trình · Cài đặt), `view-workout.js` (buổi hít đất), `view-legs.js` (tập chân), `backup.js` (sao lưu – khôi phục), `data.js` (`localStorage`, khoá `hitdat.v1`), `sound.js`, `camera.js`, `format.js`.
- `today.js` — chọn một việc chính cho trang Hôm nay, hàm thuần.
- `sw.js` — chạy không cần mạng. `manifest.webmanifest`, `icons/` — cài ra màn hình chính.

## Chạy / kiểm / triển khai

- Chạy: `npm start` rồi mở http://localhost:8080
- Kiểm: `npm test` (Node 22, không cần cài gì). CI: `.github/workflows/kiem.yml`.
- Triển khai: GitHub Pages, nguồn nhánh `main`, thư mục gốc. Merge vào main là lên.

## Luật quan trọng

- Đổi luật chương trình tập thì sửa `program.js` / `legs.js` và thêm ca kiểm ở `test/` trong cùng PR.
- Nội dung sức khoẻ (động tác, liều tập, dấu hiệu cần đi khám) phải có nguồn ghi ở `docs/ke-hoach/`; app không chẩn đoán, không hứa chữa bệnh.
- Đổi bất kỳ file nào trong danh sách `FILES` của `sw.js` thì tăng cùng lúc số ở `CACHE` (`sw.js`) và `VERSION` (`app.js`) — hai số phải bằng nhau, có ca kiểm. Số bản hiện ở chân trang. `sw.js` hỏi máy chủ trước, mất mạng mới dùng bản lưu; app tự tải lại khi có bản mới, trừ khi đang giữa buổi tập.
- Đổi hình dạng dữ liệu lưu thì tăng `v` và viết bước chuyển đổi; không làm mất lịch sử tập của người dùng. Dữ liệu không đọc được thì cất bản gốc (`hitdat.hong`) trước khi ghi; dữ liệu của bản mới hơn thì không ghi đè.
- Hình camera chỉ đọc tại chỗ lấy độ sáng; không lưu, không gửi đi đâu. App không gọi mạng ngoài.
- Camera chỉ chạy trên HTTPS hoặc localhost. Không thử được camera thật trong phiên đám mây — mọi thay đổi phần đếm phải ghi rõ «chưa thử trên iPhone thật» cho tới khi có người thử trên máy thật.
- Giao diện: không gọi `confirm()` / `alert()` của trình duyệt (dùng `confirmBox` / `alertBox` ở `ui.js`); không khoá phóng to; cỡ chữ viết theo `--fs`, màu viết theo biến để chạy cả sáng lẫn tối; mỗi trang chỉ một nút tô màu (`primary`). Có ca kiểm ở `test/version.test.js`.
- Chữ trên giao diện: tiếng Việt, trung tính như app cho mọi người dùng: gọi «bạn» hoặc không xưng hô.
