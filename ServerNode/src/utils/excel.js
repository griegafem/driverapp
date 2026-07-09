import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const PRE_HEADERS = [
  'Дата записи', 'Время завершения отчёта', 'Фамилия пользователя', 'Имя пользователя',
  'Тип отчёта', 'ID автомобиля', 'Марка автомобиля', 'Модель автомобиля', 'Госномер',
  'Пробег', 'Геолокация', 'Состояние кузова', 'Колёса ОК', 'Повреждение колеса',
  'Состояние салона', 'Уровень моторного масла проверен', 'Уровень моторного масла',
  'Уровень антифриза в норме', 'Тормозная жидкость', 'Омывающей жидкости больше 80%',
  'Освещение проверено', 'Аварийный набор', 'Состояние стёкол', 'Уровень топлива',
  'Ошибки приборной панели', 'СТС', 'ОСАГО до', 'Пожелания по авто',
  'Критические замечания', 'Wifi', 'VPN', 'Быстрый выезд',
  'Фото пробега', 'Фото передний левый угол', 'Фото передний правый угол',
  'Фото задний правый угол', 'Фото задний левый угол', 'Фото спереди',
  'Фото задняя часть', 'Фото левая сторона', 'Фото правая сторона',
  'Фото открытая передняя левая дверь', 'Фото открытая передняя правая дверь',
  'Фото открытая задняя правая дверь', 'Фото открытая задняя левая дверь',
  'Фото дня', 'Фото приборной панели',
];

const POST_HEADERS = [
  'Дата записи', 'Время завершения отчёта', 'Фамилия пользователя', 'Имя пользователя',
  'Тип отчёта', 'ID автомобиля', 'Марка автомобиля', 'Модель автомобиля', 'Госномер',
  'Тип ТС', 'Пробег', 'Геолокация', 'Уровень моторного масла проверен',
  'Уровень моторного масла', 'Уровень антифриза в норме', 'Тормозная жидкость',
  'Омывающей жидкости больше 80%', 'Пожелания по авто', 'Критические замечания',
  'Уровень топлива', 'Авто чистый', 'Салон проверен и чист', 'Wifi', 'VPN', 'Локация',
  'Фото пробега', 'Фото передний левый угол', 'Фото передний правый угол',
  'Фото задний правый угол', 'Фото задний левый угол', 'Фото спереди',
  'Фото задняя часть', 'Фото левая сторона', 'Фото правая сторона',
  'Фото открытая передняя левая дверь', 'Фото открытая передняя правая дверь',
  'Фото открытая задняя правая дверь', 'Фото открытая задняя левая дверь',
  'Фото дня', 'Фото повреждения',
];

async function ensureXlsx(filePath, headers) {
  if (fs.existsSync(filePath)) return;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.addRow(headers);
  await wb.xlsx.writeFile(filePath);
}

export async function initExcel(dataRoot) {
  await ensureXlsx(path.join(dataRoot, 'checkups.xlsx'), PRE_HEADERS);
  await ensureXlsx(path.join(dataRoot, 'post_checkups.xlsx'), POST_HEADERS);
}

async function appendRow(filePath, headers, rowData) {
  let wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(filePath);
  } catch {
    // File doesn't exist or is incompatible (e.g. ClosedXML format) — recreate
    wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    ws.addRow(headers);
    await wb.xlsx.writeFile(filePath);
  }
  const ws = wb.getWorksheet('Sheet1') || wb.worksheets[0];
  const headerRow = ws.getRow(1).values.slice(1);
  ws.addRow(headerRow.map(h => rowData[h] ?? ''));
  await wb.xlsx.writeFile(filePath);
}

export async function appendPreCheckupRow(dataRoot, rowData) {
  await appendRow(path.join(dataRoot, 'checkups.xlsx'), PRE_HEADERS, rowData);
}

export async function appendPostCheckupRow(dataRoot, rowData) {
  await appendRow(path.join(dataRoot, 'post_checkups.xlsx'), POST_HEADERS, rowData);
}

export async function getTablesZip(dataRoot) {
  const preFile = path.join(dataRoot, 'checkups.xlsx');
  const postFile = path.join(dataRoot, 'post_checkups.xlsx');

  const zip = new AdmZip();
  if (fs.existsSync(preFile)) zip.addLocalFile(preFile);
  if (fs.existsSync(postFile)) zip.addLocalFile(postFile);

  return zip.toBuffer();
}

export async function getCheckupsRows(dataRoot) {
  const filePath = path.join(dataRoot, 'checkups.xlsx');
  if (!fs.existsSync(filePath)) return [];
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.getWorksheet('Sheet1') || wb.worksheets[0];
  const rows = [];
  let headers = null;
  ws.eachRow((row, rowNumber) => {
    const vals = row.values.slice(1);
    if (rowNumber === 1) { headers = vals; return; }
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    rows.push(obj);
  });
  return rows;
}

export async function getPostCheckupsRows(dataRoot) {
  const filePath = path.join(dataRoot, 'post_checkups.xlsx');
  if (!fs.existsSync(filePath)) return [];
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.getWorksheet('Sheet1') || wb.worksheets[0];
  const rows = [];
  let headers = null;
  ws.eachRow((row, rowNumber) => {
    const vals = row.values.slice(1);
    if (rowNumber === 1) { headers = vals; return; }
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    rows.push(obj);
  });
  return rows;
}
