import path from 'path';
import fs from 'fs';
import { encode as base36Encode } from './base36.js';

export function savePhotoFromDataUri(dataUri, car, detail, dataRoot) {
  if (!dataUri) return null;
  try {
    const commaIdx = dataUri.indexOf(',');
    if (commaIdx < 0) return null;
    const base64Data = dataUri.slice(commaIdx + 1);
    const fileBytes = Buffer.from(base64Data, 'base64');

    const safeBrand = (car.brand || '').replace(/[\\/]/g, '_');
    const safeModel = (car.model || '').replace(/[\\/]/g, '_');
    const safeNumber = (car.number || '').replace(/[\\/]/g, '_');

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = now.toLocaleString('ru-RU', { month: 'long' });
    const dateStr = now.toLocaleDateString('ru-RU').replace(/\//g, '.');

    const directory = path.join('Photo', year, month, dateStr, `${safeBrand}_${safeModel}_${safeNumber}`);
    const relPath = path.join(directory, `${detail}_${now.getTime()}.jpg`);

    const fullDir = path.join(dataRoot, directory);
    fs.mkdirSync(fullDir, { recursive: true });

    fs.writeFileSync(path.join(dataRoot, relPath), fileBytes);

    // Use posix-style path for the ID (matches C# relPath.Replace("\\", "/"))
    const relPathForId = relPath.split(path.sep).join('/');
    return base36Encode(relPathForId);
  } catch {
    return null;
  }
}
