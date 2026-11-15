# Kế hoạch: nâng cấp hình minh hoạ tập chân

Ngày: 14/11/2026 · Hai PR liền nhau (#5 hình khối trong suốt, #7 bóc da) · Trạng thái: đã làm, chưa thử trên iPhone thật

## Mục tiêu

Hình tập chân ban đầu là người que, hai tư thế nội suy thẳng, vùng cơ là khối tròn / vạch nhấp nháy đều. Cần: (1) người và chuyển động tự nhiên hơn, khớp nhịp đếm; (2) từng bó cơ vẽ đúng vị trí giải phẫu, sáng lên khi co, dịu khi thả, có hiệu ứng riêng khi được kéo giãn; (3) hai động tác «mở gối nằm nghiêng» và «giãn cơ hình số 4» đọc được mà không cần chữ. Không đổi chương trình tập (liều, mức, lịch), không đổi phần hít đất.

## Đã tra gì, học được gì

- Cách app thể hiện nhóm cơ: dùng màu theo vai trò trên hình người; một bảng màu công khai dùng đỏ = cơ đích, hồng = cơ hỗ trợ, vàng = cơ đang bị kéo dài (https://www.muscleandmotion.com/docs/color-coding/); iMuscle 2 tách cơ chính / cơ phụ trên từng bài (https://apps.apple.com/us/app/imuscle-2/id430559374). Học được: giữ ba vai trò đỏ / vàng / xanh đang có của app, thêm cường độ theo thời gian thay cho nhấp nháy đều. Giới hạn: nguồn là trang cửa hàng ứng dụng, chỉ dùng để chọn cách thể hiện, không dùng làm nguồn sức khoẻ.
- Chức năng cơ (nguồn cho tên cơ và động tác nào dùng cơ nào): cơ mông lớn duỗi hông; cơ mông nhỡ giữ vững khung chậu khi chịu tải, dạng hông; cơ hình lê xoay ngoài hông, nằm sâu dưới cơ mông lớn; cơ sinh đôi và cơ dép gập cổ chân (duỗi mũi chân), hai gân hợp thành gân gót; cơ chày trước kéo mũi chân về phía mặt; nhóm đùi sau gồm cơ nhị đầu đùi, bán gân, bán màng (https://www.rdlfitness.com/blog/lower-body-core-muscle-anatomy, https://wisc.pb.unizin.org/virtualhumananatomylabmanual/?p=80, https://ecampusontario.pressbooks.pub/cambriananatomyphys2e1msk/?p=391). Cơ tứ đầu đùi chưa có nguồn riêng: dòng chữ về cơ này giữ nguyên như kế hoạch phần tập chân (`2026-11-14-tap-chan.md`).
- Gốc – bám tận và hướng sợi cơ, theo Gray's Anatomy bản 1918 (phạm vi công cộng): cơ mông lớn từ xương cánh chậu, xương cùng, xương cụt tới dải chậu chày và củ mông xương đùi, sợi chạy chếch xuống ngoài; cơ mông nhỡ toả hình quạt từ mặt ngoài xương cánh chậu tới mấu chuyển lớn; cơ hình lê từ mặt trong xương cùng tới bờ trên mấu chuyển lớn (https://www.hithera.com/grays-anatomy/index-7/index-7-3/index-7-2/muscles_of_the_gluteal_region/). Cơ sinh đôi bắt từ hai lồi cầu xương đùi, cơ dép từ xương chày và xương mác, hai cơ cùng đổ vào gân gót; cơ chày trước từ xương chày tới xương chêm trong; cơ thẳng đùi từ gai chậu trước dưới; nhóm đùi sau từ ụ ngồi (https://uen.pressbooks.pub/anatomyphysiology/chapter/lower-extremity-muscles/, https://wikimsk.org/wiki/Gastrocnemius). Nguồn lệch nhau ở chỗ gốc cơ sinh đôi ghi «lồi cầu» hay «đầu dưới xương đùi»: dùng «lồi cầu».
- Hoạ pháp: đùi dựng như khối tròn, gối vuông, bắp chân hình nêm ở phía sau, phía trước cẳng chân gần như không có cơ (Bridgman); khung tỉ lệ ≈ 7,5 đầu của Loomis (https://www.proko.com/human-figure-proportions-average-richer). Chỉ đọc bản tóm lược, chưa đọc trực tiếp sách; con số tỉ lệ trong mã là xấp xỉ.
- Bản vẽ giải phẫu cổ điển: Albinus dựng hình bằng lưới ô vuông và tách bản viền với bản cơ (https://sites.wip.nlm.nih.gov/exhibition/historicalanatomies/albinus_bio.html); Leonardo vẽ cơ chân như dây căng giữa hai điểm xương (https://col.rct.uk/collection/912625/the-leg-muscles-and-bones-of-man-and-horse), nguồn ghi hình dáng cơ mông và bắp chân của ông chưa chuẩn. Không chép lại ảnh nào, chỉ học cách vẽ.

## Cách đã loại

- Ảnh / video / hình giải phẫu có sẵn: vướng bản quyền, nặng, cần mạng.
- Mô hình 3D, thư viện đồ hoạ: ngoài phạm vi (không thêm thư viện, app tĩnh không bước dựng).
- Giữ SMIL hai tư thế, chỉ thêm tư thế: mỗi bó cơ phải đổi hình theo khớp và đổi độ sáng theo pha riêng; SMIL không tính được «cơ phồng khi góc khớp đổi» và không đo được pha để kiểm tra bằng test. Thay bằng hàm thuần theo pha, vẽ theo khung hình.
- Bộ lọc làm mờ để tạo quầng sáng: tốn pin khi hình chuyển động; thay bằng nét viền dày mờ.

## Cách làm (đúng như mã hiện tại)

1. **Chuyển động** (hàm thuần trong `figures.js`): mỗi động tác là chuỗi tư thế khoá theo pha 0–1 của một lượt, ít nhất 3 tư thế khác nhau (xuất phát → vượt nhẹ quá đỉnh → ổn định ở đỉnh), nối bằng đường cong Hermite theo chu kỳ, khớp xa thân trễ nhẹ hơn khớp gần thân. Chu kỳ bằng `tempo` của động tác nên khớp nhịp đếm; động tác giữ chạy chu kỳ 4 giây (kéo sâu rồi nới nhẹ).
2. **Bộ xương chuẩn, độ dài không đổi** (thân 38, cổ 17, đùi 30, cẳng chân 28, bàn chân 19, cánh tay 23, cẳng tay 21): toạ độ trong từng tư thế chỉ là mục tiêu; hông là gốc, chân và tay giải bằng động học ngược nên bàn chân bám sàn, tay bám tường hoặc đùi. Khớp có thêm độ sâu z và chiếu xiên.
3. **Lớp vẽ, từ dưới lên:** bóng da trong suốt (chân xa mờ hơn) → khung xương nét mảnh màu ngà (xương chậu, cột sống, lồng ngực, sọ, xương đùi, bánh chè, xương chày, xương mác, xương bàn chân, xương tay) → các đầu cơ từ sâu ra nông, có thớ (thoi hoặc lông chim) và gân thon dần nối vào xương → bóng da tay.
4. **Bó cơ:** bắp chân (hai đầu cơ sinh đôi + cơ dép, gân gót), cơ chày trước, tứ đầu đùi (rộng ngoài, thẳng đùi, rộng trong, dây chằng bánh chè), đùi sau (nhị đầu dài và ngắn, bán gân), mông lớn, mông nhỡ hình quạt, cơ hình lê, dải chậu chày. Cơ đang tập tô đỏ (chính) / vàng (phụ) / xanh (kéo giãn), sáng và phồng theo cường độ của pha; cơ còn lại vẽ nét trung tính làm nền. Cơ kéo giãn dài ra và thớ chạy nét đứt.
5. **Góc nhìn:** các động tác khác nhìn ngang. «Mở gối nằm nghiêng» và «giãn cơ hình số 4» nhìn từ trên cao phía trước: mở gối thấy gối hướng về người xem, hai gót chạm nhau, gối trên mở lên thành chữ V, có mũi tên gợi hướng; số 4 thấy chân dưới co gối, mắt cá gác lên gối đó, gối chân gác đổ ra phía người xem. Hai động tác này chỉ vẽ nhóm cơ mông và khung xương chậu – đùi, không vẽ cơ nền để khỏi rối. Hình «gập duỗi cổ chân» cắt lấy phần chân cho to hơn.
6. **Tích hợp:** `figureSvg` trả hình tĩnh ở tư thế đỉnh; `startFigures` chạy một vòng `requestAnimationFrame` chung, `pauseFigure` dừng khi bấm «Tạm dừng». Hình tự bỏ khỏi vòng chạy khi rời khỏi trang; nếu hệ điều hành bật «giảm chuyển động» thì chỉ hiện hình tĩnh. Cập nhật mỗi khung hình chỉ đổi thuộc tính của các phần tử đã có (số phần tử và thứ tự không đổi giữa các pha).
7. Đổi file trong danh sách lưu ngoại tuyến thì tăng cùng lúc `CACHE` (`sw.js`) và `VERSION` (`app.js`).

## Kết quả

- `npm test` xanh, 40 ca (16 hít đất, 12 chương trình chân, 10 hình, 2 số bản). Ca kiểm hình: mọi động tác có hình; ít nhất 3 tư thế khoá khác nhau và pha 1 trùng pha 0; toạ độ hữu hạn, nằm gần khung hình, không nhảy giữa hai khung; mỗi cơ trong hình khớp mức (chính / phụ / giãn) với danh sách cơ của động tác; cường độ trong [0, 1] và đạt đỉnh đúng pha; hình có bóng da, khung xương, cơ, sợi cơ, không số hỏng; bắp chân lúc co lớn hơn lúc thả; độ dài xương không đổi ở mọi pha; tên cơ khớp tên giải phẫu; số phần tử và thứ tự không đổi giữa các pha.
- Trình duyệt giả lập iPhone: chụp 9 động tác ở nhiều pha và tự soi; chạy bài bơm máu qua màn giới thiệu và màn đếm, tạm dừng giữ nguyên hình, tiếp tục chạy lại; không lỗi hay cảnh báo console. Mỗi khung hình tính khoảng 1 ms.
- **Chưa thử trên iPhone thật:** độ mượt, mức dùng pin, độ rõ trên màn nhỏ.

## Giới hạn

- Hình minh hoạ 2 chiều có chiếu xiên, không phải mô hình 3D và không phải tranh giải phẫu; hình dạng từng đầu cơ là đơn giản hoá bằng đường cong.
- Không đo được độ giống người thật bằng test, chỉ bằng mắt qua ảnh chụp.
- «Mở gối» đọc được ở độ phóng lớn; trên màn nhỏ chữ V khá bé. «Số 4»: chân gác và tay ôm đùi chồng lên nhau ở góc nhìn này. Chưa làm khung phóng to vùng mông.
- Cơ nằm sâu (mông lớn, cơ hình lê khi nằm ngửa) được vẽ xuyên qua da như lớp trong suốt, vì ở tư thế nằm chúng nằm phía dưới người.
- Cơ tứ đầu đùi chưa có nguồn giải phẫu riêng.
- App hướng dẫn vận động, không chẩn đoán.

## Phiếu chốt

- Cách chạy chuyển động: hàm thuần theo pha, vẽ theo khung hình bằng JS, không dùng SMIL.
- Hướng vẽ: bóc da kiểu Albinus / Vesalius, trong suốt, nét mảnh, chọn sau khi hai bản đầu (người nộm, rồi khối trong suốt) chưa đạt.
- Góc nhìn hai động tác nằm: từ trên cao phía trước (thay cho nhìn ngang và nhìn từ trên xuống).
