const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export function encode(str) {
  if (!str) return '';
  const data = Buffer.from(str, 'utf8');
  if (data.length === 0) return '';

  // Mirror C#: append 0 byte so BigInteger is always positive (little-endian high byte = 0)
  const temp = Buffer.concat([data, Buffer.from([0])]);

  // Build BigInt from little-endian bytes
  let value = 0n;
  for (let i = temp.length - 1; i >= 0; i--) {
    value = (value << 8n) | BigInt(temp[i]);
  }

  if (value === 0n) return '0';

  let result = '';
  while (value > 0n) {
    const rem = value % 36n;
    value = value / 36n;
    result = ALPHABET[Number(rem)] + result;
  }
  return result;
}

export function decode(input) {
  if (!input) return '';
  const s = input.toLowerCase();

  let value = 0n;
  for (const c of s) {
    const idx = ALPHABET.indexOf(c);
    if (idx < 0) throw new Error('Invalid base36 char: ' + c);
    value = value * 36n + BigInt(idx);
  }

  // Convert BigInt to little-endian bytes
  const bytes = [];
  while (value > 0n) {
    bytes.push(Number(value & 0xffn));
    value >>= 8n;
  }

  // Remove single trailing zero (the sign byte we added during encode)
  if (bytes.length > 1 && bytes[bytes.length - 1] === 0) {
    bytes.pop();
  }

  return Buffer.from(bytes).toString('utf8');
}
