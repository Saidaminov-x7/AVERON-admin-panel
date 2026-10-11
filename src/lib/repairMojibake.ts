const decoder = new TextDecoder('windows-1251');
const byteForCharacter = new Map<string, number>();

for (let byte = 0; byte < 256; byte += 1) {
  byteForCharacter.set(decoder.decode(new Uint8Array([byte])), byte);
}
for (let byte = 0x80; byte <= 0x9f; byte += 1) {
  byteForCharacter.set(String.fromCharCode(byte), byte);
}

function repairString(value: string): string {
  if (!value.includes('Р') && !value.includes('С') && !value.includes('вЂ')) return value;
  const bytes: number[] = [];
  for (const character of value) {
    const byte = byteForCharacter.get(character);
    if (byte === undefined) return value;
    bytes.push(byte);
  }
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
    return decoded.includes('\uFFFD') ? value : decoded;
  } catch {
    return value;
  }
}

function decodeMojibakeLayer(value: string): string {
  const bytes: number[] = [];
  for (const character of value) {
    const byte = byteForCharacter.get(character);
    if (byte === undefined) return value;
    bytes.push(byte);
  }
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
    return decoded.includes('\uFFFD') ? value : decoded;
  } catch {
    return value;
  }
}

function repairStringDeep(value: string): string {
  let current = repairString(value);
  for (let pass = 0; pass < 3; pass += 1) {
    const decoded = decodeMojibakeLayer(current);
    if (decoded === current) break;
    current = decoded;
  }
  return current;
}

export function repairMojibake<T>(value: T): T {
  if (typeof value === 'string') return repairStringDeep(value) as T;
  if (Array.isArray(value)) return value.map((entry) => repairMojibake(entry)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, repairMojibake(entry)])) as T;
  }
  return value;
}
