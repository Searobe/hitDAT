import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCountdown } from '../clock.js';

test('đếm lùi theo giây: số đổi đúng lúc tròn giây', () => {
  const cd = makeCountdown(5, 1000, 10_000);
  assert.equal(cd.left(10_000), 5);
  assert.equal(cd.left(10_999), 5);
  assert.equal(cd.left(11_000), 4);
  assert.equal(cd.left(14_999), 1);
  assert.equal(cd.left(15_000), 0);
});

test('rời app 40 giây giữa giờ nghỉ 90 giây: quay lại còn đúng 50, không đứng ở 90', () => {
  const cd = makeCountdown(90, 1000, 0);
  assert.equal(cd.left(40_000), 50);
  assert.equal(cd.left(500_000), 0); // đi quá lâu thì về 0, không âm
});

test('+30 giây cộng vào giờ còn lại', () => {
  const cd = makeCountdown(60, 1000, 0);
  cd.add(30);
  assert.equal(cd.left(20_000), 70);
});

test('tạm dừng thì số đứng yên; tiếp tục thì chạy tiếp từ số đó', () => {
  const cd = makeCountdown(10, 1000, 0);
  cd.pause(3_000);
  assert.equal(cd.paused, true);
  assert.equal(cd.left(3_000), 7);
  assert.equal(cd.left(60_000), 7);
  cd.pause(50_000); // bấm tạm dừng lần nữa không đổi mốc
  cd.resume(60_000);
  assert.equal(cd.paused, false);
  assert.equal(cd.left(60_000), 7);
  assert.equal(cd.left(67_000), 0);
});

test('đếm lượt theo nhịp: 10 lượt nhịp 2,5 giây, mỗi nhịp bớt một lượt', () => {
  const cd = makeCountdown(10, 2500, 0);
  assert.equal(cd.left(0), 10);
  assert.equal(cd.left(2_499), 10);
  assert.equal(cd.left(2_500), 9);
  assert.equal(cd.left(22_500), 1);
  assert.equal(cd.left(25_000), 0);
});
