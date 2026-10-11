import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const document = Buffer.from(JSON.stringify({ asset: { version: '2.0', generator: 'AVERON test fixture' } }));
const json = Buffer.concat([document, Buffer.alloc((4 - document.length % 4) % 4, 0x20)]);
const binary = Buffer.alloc(4);
const length = 12 + 8 + json.length + 8 + binary.length;
const glb = Buffer.alloc(length);
glb.writeUInt32LE(0x46546c67, 0);
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(length, 8);
glb.writeUInt32LE(json.length, 12);
glb.writeUInt32LE(0x4e4f534a, 16);
json.copy(glb, 20);
const binOffset = 20 + json.length;
glb.writeUInt32LE(binary.length, binOffset);
glb.writeUInt32LE(0x004e4942, binOffset + 4);
binary.copy(glb, binOffset + 8);

const output = join(tmpdir(), 'averon-fixture-shirt.glb');
await writeFile(output, glb);
process.stdout.write(`${output}\n`);
