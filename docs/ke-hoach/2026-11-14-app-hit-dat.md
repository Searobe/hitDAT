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
- Tự giảm mức (20/11): trang chính có nút «Nặng quá? Giảm mức tập» khi buổi kế là buổi tập. Mỗi lần bấm hạ T 10% (ít nhất 1 cái, không dưới 3), có hỏi xác nhận, ghi vào lịch sử dạng `{type: 'adjust', from, to}`. Bước 10% dùng lại đúng bước lùi khi hụt hai tuần liền ở trên, chỉ là để người tập chủ động khi bài thử bốc hơn sức thật; không tăng liều nên không thêm nguồn mới. Lịch tuần không đổi, bài thử kế tiếp vẫn xếp lại T theo kết quả thật. Lần giảm không tính là ngày tập trong ô «Quá trình tập». Hình dạng dữ liệu không đổi (chỉ thêm một loại dòng lịch sử) nên giữ `v: 1`.

## Cách đếm

- Camera trước: lấy độ sáng và độ tương phản của hình thu nhỏ 32×24, khoảng 16 lần/giây. Hiệu chỉnh trước buổi (giữ tư thế cao 4 giây, thấp 4 giây), chọn đặc trưng tách rõ hơn; chênh dưới 25% thì báo không dùng được camera. Hạ dưới 40% khoảng cao–thấp tính một lượt, lên lại trên 65% mới nhận lượt kế.
- Chạm màn hình luôn bật song song; hai nguồn dùng chung khoảng chặn 400 ms.

## Thế nào là xong

- `npm test` xanh (lúc làm: 16 ca của phần hít đất; nay tổng 40 ca, 16 ca ở `test/program.test.js`).
- Chạy thử bằng trình duyệt giả lập iPhone: bài thử → buổi 5 hiệp → tổng kết, không lỗi; camera giả sáng/tối đếm đúng 7/7.
- Âm thanh (14/11): bíp to hơn mỗi lượt hoặc đọc số còn lại, nhạc ngắn khi xong hiệp, nhạc mừng khi xong bài; đặt kiểu âm thanh «playback» để kêu cả khi gạt im lặng — chưa thử trên iPhone thật.
- Chưa kiểm được: camera trên iPhone thật (tự chỉnh độ sáng của máy có thể làm tín hiệu yếu đi), giữ màn hình sáng, tiếng bíp khi bật chế độ im lặng. Cần thử trên máy thật.

## Chạy không cần mạng và cập nhật

- `sw.js` lưu mọi file của app để mở được khi mất mạng. Có mạng thì hỏi máy chủ trước (bỏ qua bộ nhớ đệm 10 phút của trình duyệt); quá 4 giây hoặc mất mạng thì dùng bản đã lưu. App tự tải lại khi có bản mới, trừ khi đang giữa buổi tập.
- Số bản `VERSION` (`app.js`) phải bằng số ở `CACHE` (`sw.js`) và tăng mỗi khi đổi một file trong danh sách lưu ngoại tuyến; số bản hiện ở chân trang để biết máy đang chạy bản nào (có ca kiểm).

## Nút bấm trên iPhone (20/11)

- Gắn sự kiện chạm ở `document` để Safari iOS hiện hiệu ứng nhấn; nút thu nhỏ 4% và sáng rõ khi nhấn; `touch-action: manipulation` cho nút.
- Màn đếm ngược, nghỉ giữa hiệp, nghỉ bài chân chỉ đổi con số mỗi giây, không dựng lại cả màn (trước đây nút bị thay mỗi giây nên chạm đúng lúc đó bị mất).
- `touch-action: none` chỉ còn ở vùng đếm chạm, không phủ cả màn tập (để chữ dài trong màn tập cuộn được).
- Hình động: vẽ tối đa khoảng 30 khung/giây, hình khuất ngoài màn hình thì dừng (trang hướng dẫn có 9 hình).
- Đã kiểm bằng trình duyệt giả lập iPhone 13: nút giữ nguyên qua các giây, «+30 giây» cộng đúng, chỉ hình trong màn hình chạy. Chưa thử trên iPhone thật.

## Giới hạn đã biết

- iOS không cho web rung máy; phản hồi mỗi lượt là tiếng bíp và nháy màu.
- Dữ liệu nằm trên máy; xoá app khỏi màn hình chính là mất. Có nút «Sao lưu dữ liệu».

## Phiếu chốt (14/11/2026)

- Nền tảng: web app thêm ra màn hình chính.
- Cách đếm: camera trước + chạm màn hình.
- Khung chương trình và kế hoạch: duyệt.
- Repo trống chưa có main: đẩy một commit rỗng lên main để mở PR (ngoại lệ một lần).
- Chỗ đặt app: repo công khai, GitHub Pages từ nhánh main.
