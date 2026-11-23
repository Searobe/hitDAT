import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const files = read('sw.js').match(/const FILES = \[(.*)\];/)[1].match(/'[^']+'/g).map((s) => s.slice(1, -1));
const appJs = readdirSync(new URL('../', import.meta.url)).filter((f) => f.endsWith('.js') && f !== 'sw.js');

test('số bản ở app.js bằng số bộ nhớ lưu ở sw.js', () => {
  const version = read('app.js').match(/const VERSION = (\d+);/)[1];
  const cache = read('sw.js').match(/const CACHE = 'hitdat-(\d+)';/)[1];
  assert.equal(version, cache);
});

test('mọi file app nạp đều nằm trong danh sách lưu ngoại tuyến', () => {
  for (const f of ['index.html', 'style.css', 'manifest.webmanifest', ...appJs]) assert.ok(files.includes(f), `thiếu ${f}`);
  // File nào nhập file nào: mọi đường nhập đều phải là file có trong danh sách.
  for (const f of appJs) {
    for (const m of read(f).matchAll(/(?:from|import) '\.\/([\w.-]+)'/g)) assert.ok(files.includes(m[1]), `${f} nhập ${m[1]} nhưng sw.js thiếu`);
  }
  for (const m of read('index.html').matchAll(/(?:href|src)="([^"#:]+)"/g)) assert.ok(files.includes(m[1]), `index.html dùng ${m[1]} nhưng sw.js thiếu`);
});

test('danh sách lưu ngoại tuyến không có file không tồn tại', () => {
  for (const f of files) if (f !== './') assert.doesNotThrow(() => read(f), `sw.js ghi ${f} nhưng không có file`);
});

test('app.js chỉ còn khởi động: giao diện đã tách ra file nhỏ', () => {
  for (const f of appJs) assert.ok(read(f).split('\n').length <= 600, `${f} dài quá 600 dòng`);
  assert.ok(read('app.js').split('\n').length <= 80, 'app.js phải ngắn');
});

test('không còn hộp của trình duyệt và không khoá phóng to', () => {
  for (const f of appJs.filter((x) => x !== 'ui.js')) assert.doesNotMatch(read(f), /(?<![\w.])(confirm|alert|prompt)\(/, `${f} còn gọi hộp của trình duyệt`);
  assert.doesNotMatch(read('index.html'), /user-scalable|maximum-scale/);
});

test('app không gọi mạng ngoài', () => {
  for (const f of ['index.html', 'style.css', ...appJs]) assert.doesNotMatch(read(f), /(src|href)="https?:|url\(["']?https?:|fetch\(|XMLHttpRequest|WebSocket|sendBeacon/, f);
});
