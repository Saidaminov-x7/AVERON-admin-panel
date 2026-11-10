import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const root = 'dist/assets';
const files = (await readdir(root)).filter(file => file.endsWith('.js'));
if (!files.length) throw new Error(`No JavaScript chunks found under ${root}`);
// Current production entry is 215,283 gzip bytes; 10% headroom is 236,812.
const maxGzipBytes = 237_000;
for (const file of files) {
  const bytes = gzipSync(await readFile(path.join(root, file))).byteLength;
  console.log(`${file}: ${bytes} gzip bytes`);
  if (bytes > maxGzipBytes) throw new Error(`${file} exceeds ${maxGzipBytes} gzip bytes (${bytes})`);
}
console.log(`PASS: ${files.length} JS chunks are each <= ${maxGzipBytes} gzip bytes`);
