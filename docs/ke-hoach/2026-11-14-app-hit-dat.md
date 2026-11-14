# Kế hoạch: app tập hít đất 100 cái

Ngày: 14/11/2026 · Một mốc, một PR · Trạng thái: đã làm, chờ thử trên iPhone thật

## Yêu cầu

1. Dùng trên iPhone.
2. Thử khả năng trước, rồi mới đưa chương trình tập.
3. Điện thoại nằm ngửa dưới đất; mỗi lần hạ xuống cảm biến tính một lượt, số giảm dần về 0.
4. Có lịch tập, số hiệp, số lượt.
5. Tham khảo tinh hoa.

## Đã tra gì, học được gì

- Hundred Pushups của Steve Speirs (https://hundredpushups.com/week1.html): thử sức ban đầu để xếp cột; 3 buổi/tuần có ngày nghỉ xen giữa; mỗi buổi 5 hiệp, nghỉ 60 giây hoặc hơn, hiệp cuối hít tối đa; thử lại sau tuần 2; hụt thì lặp lại tuần. Đây là khung được giữ lại.
- Điểm yếu của bản gốc: bảng cố định 6 tuần, nhiều người kẹt ở tuần 5. Bản này thay bằng công thức tính theo mức đo thật và tự lên / giữ / lùi mức.
- Cảm biến tiệm cận: Safari iOS không cho web đọc (https://caniuse.com/proximity — không hỗ trợ ở mọi phiên bản). Vì vậy dùng camera trước làm cảm biến, kèm chạm màn hình dự phòng.

## Cách đã loại

- App gốc Swift: đọc được cảm biến tiệm cận thật nhưng cần Xcode, cài lại mỗi 7 ngày hoặc 99 đô/năm, không thử được trong phiên.
- Tập rải nhiều hiệp nhỏ cả ngày (grease the groove): nguồn chỉ là bài tự thuật, không hợp kiểu đặt máy tập theo buổi.

## Chương trình tập (mọi số nằm ở program.js)

- T = mức tối đa đang dùng, lấy từ bài thử (thấp nhất 3).
- Mỗi tuần 3 buổi: nhẹ 50%, vừa 57%, nặng 65% của T; nhân thêm (1 + 4/(T+4)) cho người mới và giảm tới 20% khi T từ 20 lên 80.
- Mỗi buổi 5 hiệp theo dáng 1 · 1,2 · 0,85 · 0,85 · 1+; không hiệp nào vượt T. Ví dụ T = 10, buổi nhẹ: 6 · 8 · 5 · 5 · 6+.
- Nghỉ giữa hiệp: 60 giây (hiệp dài nhất ≤ 15 lượt), 90 giây (≤ 30), 120 giây (trên 30).
- Buổi kế cách buổi trước 2 ngày lịch (nghỉ trọn ít nhất 1 ngày); app nhắc, không khoá.
- Hết tuần: đạt ≥ 2/3 buổi thì T tăng 12% (hiệp cuối buổi nặng ≥ 1,5 lần mức tối thiểu thì 20%); hụt thì giữ; hụt hai tuần liền thì lùi 10%.
- Cứ 2 tuần thử lại, T = đúng kết quả thử. Thử được 100 là về đích.

## Cách đếm

- Camera trước: lấy độ sáng và độ tương phản của hình thu nhỏ 32×24, khoảng 16 lần/giây. Hiệu chỉnh trước buổi (giữ tư thế cao 4 giây, thấp 4 giây), chọn đặc trưng tách rõ hơn; chênh dưới 25% thì báo không dùng được camera. Hạ dưới 40% khoảng cao–thấp tính một lượt, lên lại trên 65% mới nhận lượt kế.
- Chạm màn hình luôn bật song song; hai nguồn dùng chung khoảng chặn 400 ms.

## Thế nào là xong

- `npm test` xanh (16 ca).
- Chạy thử bằng trình duyệt giả lập iPhone: bài thử → buổi 5 hiệp → tổng kết, không lỗi; camera giả sáng/tối đếm đúng 7/7.
- Chưa kiểm được: camera trên iPhone thật (tự chỉnh độ sáng của máy có thể làm tín hiệu yếu đi), giữ màn hình sáng, tiếng bíp khi bật chế độ im lặng. Cần thử trên máy thật.

## Giới hạn đã biết

- iOS không cho web rung máy; phản hồi mỗi lượt là tiếng bíp và nháy màu.
- Dữ liệu nằm trên máy; xoá app khỏi màn hình chính là mất. Có nút «Sao lưu dữ liệu».

## Phiếu chốt (14/11/2026)

- Nền tảng: web app thêm ra màn hình chính.
- Cách đếm: camera trước + chạm màn hình.
- Khung chương trình và kế hoạch: duyệt.
- Repo trống chưa có main: đẩy một commit rỗng lên main để mở PR (ngoại lệ một lần).
- Chỗ đặt app: repo công khai, GitHub Pages từ nhánh main.
