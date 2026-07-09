import crypto from 'crypto';

const keys = new Set();

export function createAccessKey() {
  const key = crypto.createHash('md5')
    .update(crypto.randomBytes(32))
    .digest('hex');
  keys.add(key);
  return key;
}

export function consumeAccessKey(key) {
  if (!key || !keys.has(key)) return false;
  keys.delete(key);
  return true;
}
