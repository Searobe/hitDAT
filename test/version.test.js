import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('số bản ở app.js bằng số bộ nhớ lưu ở sw.js', () => {
  const version = read('app.js').match(/const VERSION = (\d+);/)[1];
  const cache = read('sw.js').match(/const CACHE = 'hitdat-(\d+)';/)[1];
  assert.equal(version, cache);
});

test('mọi file app nạp đều nằm trong danh sách lưu ngoại tuyến', () => {
  const files = read('sw.js').match(/const FILES = \[(.*)\];/)[1];
  for (const f of ['app.js', 'program.js', 'legs.js', 'figures.js', 'style.css', 'index.html']) {
    assert.ok(files.includes(`'${f}'`), `thiếu ${f}`);
  }
  for (const m of read('app.js').matchAll(/from '\.\/([\w.-]+)'/g)) assert.ok(files.includes(`'${m[1]}'`), `thiếu ${m[1]}`);
});
