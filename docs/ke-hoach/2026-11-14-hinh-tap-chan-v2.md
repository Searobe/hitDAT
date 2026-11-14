# Kế hoạch: nâng cấp hình minh hoạ tập chân

Ngày: 14/11/2026 · Một mốc, một PR · Trạng thái: đã làm, chưa thử trên iPhone thật

## Mục tiêu

Hình tập chân hiện là người que, hai tư thế nội suy thẳng, vùng cơ là khối tròn / vạch nhấp nháy đều. Cần: (1) người dạng khối, chuyển động tự nhiên hơn; (2) từng bó cơ vẽ đúng chỗ, sáng lên khi co, dịu khi thả, có hiệu ứng riêng khi được kéo giãn. Không đổi chương trình tập (liều, mức, lịch), không đổi phần hít đất.

## Đã tra gì, học được gì

- App tập thể hình thể hiện nhóm cơ bằng màu theo vai trò trên hình người: một bảng màu công khai dùng đỏ = cơ đích, hồng = cơ hỗ trợ, vàng = cơ đang bị kéo dài (https://www.muscleandmotion.com/docs/color-coding/); iMuscle 2 tách cơ chính / cơ phụ trên từng bài (https://apps.apple.com/us/app/imuscle-2/id430559374). Người dùng các app khác hay xin bản đồ cơ kiểu «sáng dần theo mức tải» (https://feedback.bevel.health/feature-requests/p/workout-physical-body-diagram-muscular-load). Học được: giữ ba vai trò đỏ / vàng / xanh đang có của app; thêm cường độ theo thời gian thay cho nhấp nháy đều. Giới hạn: nguồn là trang cửa hàng ứng dụng và góp ý người dùng, không phải nghiên cứu; chỉ dùng để chọn cách thể hiện, không dùng làm nguồn sức khoẻ.
- Giải phẫu và chức năng (nguồn cho tên cơ và động tác nào dùng cơ nào): cơ mông lớn duỗi hông; cơ mông nhỡ giữ vững khung chậu khi chịu tải, dạng hông; cơ hình lê xoay ngoài hông, nằm sâu dưới cơ mông lớn; cơ sinh đôi và cơ dép gập cổ chân (duỗi mũi chân), hai gân hợp thành gân gót; cơ chày trước kéo mũi chân về phía mặt; nhóm đùi sau gồm cơ nhị đầu đùi, bán gân, bán màng (https://www.rdlfitness.com/blog/lower-body-core-muscle-anatomy, https://wisc.pb.unizin.org/virtualhumananatomylabmanual/?p=80, https://ecampusontario.pressbooks.pub/cambriananatomyphys2e1msk/?p=391). Cơ tứ đầu đùi: lượt tra này chưa ra nguồn riêng; sẽ tra thêm khi làm, không có nguồn thì dòng đó giữ nguyên như kế hoạch cũ (nguồn ngồi xổm ở docs/ke-hoach/2026-11-14-tap-chan.md), không thêm lời mới.
- Kỹ thuật vẽ chuyển động bằng SVG: SMIL mặc định nội suy thẳng; muốn mượt phải dùng `calcMode="spline"` kèm `keyTimes`, `keySplines` (https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_animation_with_SMIL, https://www.quackit.com/svg/animations/tutorial/svg_smil_animateTransform.cfm). Ghi chú của nguồn: ghép nhiều chỉ thị dễ lỗi, phải thử trên trình duyệt đích. Giới hạn: chưa thử Safari iOS thật.

- Làm lại lần hai (hình lần đầu mới là «người nộm + cục màu», chưa theo giải phẫu), tra thêm:
  - Gốc – bám tận và hướng sợi cơ, theo Gray's Anatomy bản 1918 (phạm vi công cộng): cơ mông lớn từ xương cánh chậu, xương cùng, xương cụt tới dải chậu chày và củ mông xương đùi, sợi chạy chếch xuống ngoài; cơ mông nhỡ toả hình quạt từ mặt ngoài xương cánh chậu tới mấu chuyển lớn; cơ hình lê từ mặt trong xương cùng tới bờ trên mấu chuyển lớn (https://www.hithera.com/grays-anatomy/index-7/index-7-3/index-7-2/muscles_of_the_gluteal_region/). Cơ sinh đôi bắt từ hai lồi cầu xương đùi, cơ dép từ xương chày và xương mác, hai cơ cùng đổ vào gân gót; cơ chày trước từ xương chày tới xương chêm trong; cơ thẳng đùi từ gai chậu trước dưới; nhóm đùi sau từ ụ ngồi (https://uen.pressbooks.pub/anatomyphysiology/chapter/lower-extremity-muscles/, https://wikimsk.org/wiki/Gastrocnemius). Nguồn lệch nhau ở chỗ gốc cơ sinh đôi ghi «lồi cầu» hay «đầu dưới xương đùi»: dùng «lồi cầu».
  - Hoạ pháp: đùi dựng như khối tròn, gối vuông, bắp chân hình nêm ở phía sau, phía trước cẳng chân gần như không có cơ (Bridgman); khung tỉ lệ ≈ 7,5 đầu của Loomis (https://www.proko.com/human-figure-proportions-average-richer). Chưa đọc trực tiếp sách, chỉ đọc bản tóm lược; con số tỉ lệ trong mã là xấp xỉ, không phải số đo từ sách.
  - Áp dụng: bộ xương chuẩn độ dài không đổi (thân 38, cổ 17, đùi 30, cẳng 28, bàn chân 19, cánh tay 23, cẳng tay 21), chân tay giải bằng động học ngược để bàn chân bám sàn và tay bám tường / đùi; đường viền mỗi đoạn theo bề dày thật; mỗi bó cơ vẽ theo hình gốc – bám tận, có sợi cơ; da phồng lên khi cơ co.

## Cách đã loại

- Ảnh / video / hình giải phẫu có sẵn: vướng bản quyền, nặng, cần mạng.
- Mô hình 3D, thư viện đồ hoạ: ngoài phạm vi (không thêm thư viện, app tĩnh không bước dựng).
- Giữ SMIL hai tư thế, chỉ thêm tư thế: mỗi bó cơ phải đổi hình dạng theo khớp và đổi độ sáng theo pha riêng; SMIL không tính được «cơ phồng khi góc khớp đổi» và không đo được pha để kiểm tra bằng test.

## Cách làm

1. Chuyển động (hàm thuần trong `figures.js`): mỗi động tác là chuỗi tư thế khoá theo pha 0–1 của một lượt (ví dụ nâng hông: nằm → nâng 40% → giữ ở đỉnh 20% → hạ 40%), tối thiểu 3 tư thế khoá, nội suy đường cong êm (cubic) và có độ trễ nhẹ giữa các khớp (hông trước, gối sau) cho tự nhiên. Chu kỳ lấy đúng `tempo` của động tác nên khớp nhịp đếm; động tác giữ (hold) thở nhẹ quanh tư thế giữ.
2. Hình người dạng khối: mỗi đoạn xương là hình thon có bề rộng theo đoạn (thân, đùi, cẳng, bắp tay, bàn chân), vẽ bằng đường cong SVG sinh từ toạ độ khớp; một lớp bóng nhẹ; không đường viền cứng.
3. Bó cơ vẽ riêng, gắn vào đoạn xương và đổi hình theo khớp: bắp chân (hai đầu), cơ chày trước, tứ đầu đùi, đùi sau, mông lớn, mông nhỡ, cơ hình lê (nằm sâu: vẽ nét đứt dưới lớp mông). Mỗi bó có hàm cường độ theo pha: co → sáng + phồng thêm vài phần trăm, thả → dịu; cơ chính đỏ, cơ phụ vàng, cơ giãn xanh có sọc dọc kéo dài ra khi kéo giãn tăng.
4. Góc nhìn: «mở gối nằm nghiêng» nhìn từ trên xuống (hai đùi tách như vỏ sò, hai gót chạm nhau); «giãn cơ hình số 4» nhìn chéo 3/4, kèm khung phóng to vùng mông hiện cơ hình lê bị kéo. Nếu ảnh chụp cho thấy vẫn khó đọc thì đổi góc nữa, ghi lại ở mục Giới hạn.
5. Tích hợp: `figureSvg` giữ chữ ký cũ cho `app.js`; thêm hàm cập nhật theo khung hình (requestAnimationFrame, dừng khi hình khuất hoặc màn tạm dừng, tôn trọng «giảm chuyển động» của hệ điều hành: hiện tư thế đỉnh tĩnh). Sửa `app.js` đúng ba chỗ gọi hình (trang hướng dẫn, màn giới thiệu, màn đếm). Tăng `CACHE` trong `sw.js`.

## Thế nào là xong (đo được)

- Cả 9 động tác: thân dạng khối, ≥ 3 tư thế khoá khớp nhịp tempo.
- Mọi bó cơ trong danh sách cơ của động tác có hình riêng đúng vị trí; cường độ đổi theo pha co – thả của chính động tác.
- Hai động tác nằm nghiêng / số 4 đọc được khi tắt chữ (chụp ảnh tự soi).
- `npm test` xanh, thêm ca kiểm: mỗi động tác ≥ 3 tư thế khoá; pha 0 và 1 trùng nhau (lặp liền mạch); toạ độ hữu hạn; mỗi cơ trong hình khớp mức (chính / phụ / giãn) với `EX[id].muscles`; cường độ trong [0,1], cơ chính đạt đỉnh đúng pha co.
- Trình duyệt giả lập iPhone: chụp từng động tác ở 3–4 pha, tự soi, không lỗi console.
- **Chưa thử trên iPhone thật**: hình chuyển động, độ mượt, mức dùng pin.

## Kết quả

- `npm test` xanh (35 ca, 7 ca mới ở `test/figures.test.js`).
- Trình duyệt giả lập iPhone: chụp 9 động tác ở 4–6 pha, chạy bài bơm máu qua màn giới thiệu và màn đếm, tạm dừng giữ nguyên hình, tiếp tục chạy lại, không lỗi hay cảnh báo console.
- Góc nhìn «từ trên cao phía trước» cho «mở gối» (gối hướng về người xem, hai gót chạm nhau, gối trên mở lên thành chữ V, có mũi tên gợi hướng) và «số 4» (chân dưới co gối, mắt cá gác lên gối đó, gối chân gác đổ ra phía người xem; vùng mông tô xanh có sọc).
- Chưa thử trên iPhone thật: độ mượt, mức dùng pin, thang màu trên màn thật.

## Giới hạn

- Vẫn là hình minh hoạ 2 chiều, không phải tranh giải phẫu; hình dạng bó cơ là đơn giản hoá.
- Không đo được độ giống người thật bằng test, chỉ bằng mắt qua ảnh chụp; có thể cần chỉnh thêm sau khi có người xem trên máy thật.
- «Mở gối» đọc được ở độ phóng lớn; trên màn nhỏ phần chữ V vẫn khá bé. «Số 4» đọc được nhưng chân gác và tay ôm đùi chồng lên nhau ở góc nhìn này. Chưa làm khung phóng to vùng mông như đã dự kiến. Hình vẫn là hình 2 chiều có chiếu xiên, không phải mô hình 3D.
- Cơ nằm sâu (mông lớn, cơ hình lê khi nằm ngửa) được vẽ xuyên qua da như lớp trong suốt, vì ở tư thế nằm chúng nằm phía dưới người.
- Cơ tứ đầu đùi vẫn chưa có nguồn giải phẫu riêng; dòng chữ về cơ này giữ nguyên như kế hoạch cũ.
- App hướng dẫn vận động, không chẩn đoán.

## Phiếu chốt

- Làm việc này (chấp nhận không thuộc nhóm việc ưu tiên): có.
- Cách chạy chuyển động: JS theo khung hình (hàm thuần theo pha), không dùng SMIL.
- Duyệt kế hoạch: có. Bổ sung khi làm: toạ độ khớp có thêm chiều sâu (z) và chiếu xiên để «mở gối» và «số 4» đọc được ở góc nhìn 3/4 thay vì nhìn ngang hoặc từ trên xuống.
