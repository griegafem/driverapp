import ExcelJS from 'exceljs';
import { consumeAccessKey } from '../utils/accessKeys.js';
import { getTablesZip } from '../utils/excel.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const TRANSLATIONS = {
  body_condition:    { dirty: 'Грязный', dusty: 'Пыльный', clean: 'Чистый', NONE: '' },
  interior_condition:{ damaged: 'Повреждён', dirty: 'Грязный', perfect: 'Идеальный', NONE: '' },
  glass_condition:   { dirty: 'Грязные', clean: 'Чистые', NONE: '' },
  brake_fluid:       { MIN: 'Мин', NORM: 'Норма', MAX: 'Макс', NONE: '' },
  wifi:              { A: 'Не работает', B: 'Не предусмотрен', C: 'Работает', NONE: '' },
  vpn:               { A: 'Не работает', B: 'Не предусмотрен', C: 'Работает', NONE: '' },
};

function tr(field, val) {
  if (!val || val === 'NONE') return '';
  return TRANSLATIONS[field]?.[val] ?? val;
}

function fmtPercent(val) {
  if (!val) return '';
  const n = parseFloat(val);
  return isNaN(n) ? val : `${Math.round(n)}%`;
}

function renderTableHtml(rows, opts = {}) {
  const surname = opts.surname || '';
  const plate   = opts.plate   || '';
  const brand   = opts.brand   || '';

  const style = `
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:16px;font-size:13px}
.toolbar{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px 16px;margin-bottom:12px;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.toolbar select,.toolbar input{border:1px solid #ccc;border-radius:5px;padding:6px 10px;font-size:13px;min-width:140px;background:#fff}
.btn-export{background:#16a34a;color:#fff;border:none;border-radius:5px;padding:7px 14px;font-size:13px;cursor:pointer}
.btn-export:hover{background:#15803d}
.btn-reset{background:#6b7280;color:#fff;border:none;border-radius:5px;padding:7px 14px;font-size:13px;cursor:pointer}
.btn-reset:hover{background:#4b5563}
.count{margin-left:auto;color:#6b7280;font-size:12px;white-space:nowrap}
.wrap{overflow-x:auto}
table{border-collapse:collapse;background:#fff;white-space:nowrap}
th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
th{background:#222;color:#fff;position:sticky;top:0}
tr:nth-child(even){background:#f9f9f9}
td:has(img){padding:3px}
img{width:96px;height:96px;object-fit:cover;border-radius:3px;display:block}`;

  const allSurnames = [...new Set(rows.map(r => r['Фамилия'] || '').filter(Boolean))].sort();
  const surnameOpts = [`<option value="">Все фамилии</option>`];
  for (const s of allSurnames) {
    const val = s.toLowerCase();
    const sel = val === surname ? ' selected' : '';
    surnameOpts.push(`<option value="${escapeHtml(val)}"${sel}>${escapeHtml(s)}</option>`);
  }

  const toolbar = `<div class="toolbar">
  <select id="f_surname" onchange="filterTable()">${surnameOpts.join('')}</select>
  <input id="f_brand" type="text" placeholder="Марка" value="${escapeHtml(brand)}" oninput="filterTable()" autocomplete="off">
  <input id="f_plate" type="text" placeholder="Госномер" value="${escapeHtml(plate)}" oninput="filterTable()" autocomplete="off">
  <button type="button" onclick="doExport()" class="btn-export">Экспорт .xlsx</button>
  <button type="button" onclick="resetFilters()" class="btn-reset">Сбросить</button>
  <span id="rowCount" class="count">Записей: ${rows.length}</span>
</div>`;

  if (!rows.length) {
    return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Осмотры</title><style>${style}</style></head><body>${toolbar}<p>Нет данных.</p></body></html>`;
  }

  const headers = Object.keys(rows[0]);
  const ths = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');
  const trs = rows.map(r => {
    const sAttr = escapeHtml((r['Фамилия'] || '').toLowerCase());
    const bAttr = escapeHtml((r['Марка'] || '').toLowerCase());
    const pAttr = escapeHtml((r['Госномер'] || '').toUpperCase());
    const tds = headers.map(h => {
      const v = String(r[h] || '');
      if (v.startsWith('/api/get-photo?id=')) {
        const enc = escapeHtml(v);
        return `<td><a href="${enc}" target="_blank" rel="noopener"><img src="${enc}"/></a></td>`;
      }
      return `<td>${escapeHtml(v)}</td>`;
    }).join('');
    return `<tr data-surname="${sAttr}" data-brand="${bAttr}" data-plate="${pAttr}">${tds}</tr>`;
  }).join('');

  const js = `<script>
var _total=${rows.length};
function filterTable(){
  var s=document.getElementById('f_surname').value;
  var b=document.getElementById('f_brand').value.trim().toLowerCase();
  var p=document.getElementById('f_plate').value.trim().toUpperCase();
  var trs=document.querySelectorAll('#dataTable tbody tr');
  var vis=0;
  trs.forEach(function(tr){
    var ok=(!s||tr.dataset.surname===s)&&(!b||tr.dataset.brand.includes(b))&&(!p||tr.dataset.plate.includes(p));
    tr.style.display=ok?'':'none';
    if(ok)vis++;
  });
  document.getElementById('rowCount').textContent='Записей: '+vis+' из '+_total;
}
function doExport(){
  var p=new URLSearchParams({export:'xlsx'});
  var s=document.getElementById('f_surname').value;
  var b=document.getElementById('f_brand').value;
  var pl=document.getElementById('f_plate').value;
  if(s)p.set('surname',s);if(b)p.set('brand',b);if(pl)p.set('plate',pl);
  location.href=location.pathname+'?'+p;
}
function resetFilters(){
  document.getElementById('f_surname').value='';
  document.getElementById('f_brand').value='';
  document.getElementById('f_plate').value='';
  filterTable();
}
filterTable();
</script>`;

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Осмотры</title><style>${style}</style></head><body>${toolbar}<div class="wrap"><table id="dataTable"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>${js}</body></html>`;
}

async function rowsToXlsx(rows, sheetName = 'Отчёт', baseUrl = '') {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  if (!rows.length) return wb.xlsx.writeBuffer();
  const headers = Object.keys(rows[0]);
  ws.addRow(headers);
  ws.getRow(1).font = { bold: true };
  rows.forEach((row, ri) => {
    const wsRow = ws.getRow(ri + 2);
    headers.forEach((h, ci) => {
      const v = String(row[h] || '');
      const cell = wsRow.getCell(ci + 1);
      if (v.startsWith('/api/get-photo') && baseUrl) {
        cell.value = { text: 'Фото', hyperlink: baseUrl + v, tooltip: 'Открыть фото' };
        cell.font = { color: { argb: 'FF2563EB' }, underline: true };
      } else {
        cell.value = v;
      }
    });
    wsRow.commit();
  });
  return wb.xlsx.writeBuffer();
}

function preCheckupToRow(r) {
  const p = id => id ? `/api/get-photo?id=${id}` : '';
  const b = v => v === 1 ? 'ДА' : v === 0 ? 'НЕТ' : '';
  return {
    'Дата':             r.submitted_at || '',
    'Фамилия':          r.user_surname || '',
    'Имя':              r.user_name || '',
    'Госномер':         r.car_number || '',
    'Марка':            r.car_brand || '',
    'Модель':           r.car_model || '',
    'Тип ТС':           r.car_type || '',
    'Пробег':           r.mileage || '',
    'Геолокация':       r.geo || '',
    'Кузов':            tr('body_condition', r.body_condition),
    'Колёса ОК':        b(r.wheels_ok),
    'Колесо повреждено':b(r.wheel_damaged),
    'Салон':            tr('interior_condition', r.interior_condition),
    'Масло проверено':  b(r.oil_checked),
    'Уровень масла':    fmtPercent(r.oil_level),
    'Антифриз':         b(r.coolant_ok),
    'Тормозная жидкость': tr('brake_fluid', r.brake_fluid),
    'Омывайка':         b(r.washer_ok),
    'Освещение':        b(r.lighting_ok),
    'Аварийный набор':  b(r.emergency_kit_ok),
    'Стёкла':           tr('glass_condition', r.glass_condition),
    'Топливо':          fmtPercent(r.fuel_level),
    'Ошибки панели':    b(r.dashboard_errors),
    'СТС':              b(r.registration_ok),
    'ОСАГО до':         r.osago_date || '',
    'WiFi':             tr('wifi', r.wifi),
    'VPN':              tr('vpn', r.vpn),
    'Быстрый выезд':    b(r.quick_exit),
    'Доп. инфо':        r.additional_info || '',
    'Критически':       r.critical_info || '',
    'Фото пробега':          p(r.photo_mileage),
    'Фото пер.лев':          p(r.photo_rl),
    'Фото пер.прав':         p(r.photo_rr),
    'Фото зад.прав':         p(r.photo_br),
    'Фото зад.лев':          p(r.photo_bl),
    'Фото спереди':          p(r.photo_front),
    'Фото сзади':            p(r.photo_rear),
    'Фото лев.сторона':      p(r.photo_left),
    'Фото прав.сторона':     p(r.photo_right),
    'Фото салон пер.лев':    p(r.photo_irl),
    'Фото салон пер.прав':   p(r.photo_irr),
    'Фото салон зад.прав':   p(r.photo_ibr),
    'Фото салон зад.лев':    p(r.photo_ibl),
    'Фото дня':              p(r.photo_of_day),
    'Фото панели':           p(r.photo_dashboard),
    'Фото колеса (ОК)':      p(r.photo_wheel_ok),
    'Фото повреждения колеса': p(r.photo_wheel_damaged),
  };
}

function postCheckupToRow(r) {
  const p = id => id ? `/api/get-photo?id=${id}` : '';
  const b = v => v === 1 ? 'ДА' : v === 0 ? 'НЕТ' : '';
  return {
    'Дата':           r.submitted_at || '',
    'Фамилия':        r.user_surname || '',
    'Имя':            r.user_name || '',
    'Госномер':       r.car_number || '',
    'Марка':          r.car_brand || '',
    'Модель':         r.car_model || '',
    'Тип ТС':         r.car_type || '',
    'Пробег':         r.mileage || '',
    'Геолокация':     r.geo || '',
    'Топливо':        fmtPercent(r.fuel_level),
    'Уровень масла':  fmtPercent(r.oil_level),
    'Антифриз':       b(r.coolant_ok),
    'Тормозная жидкость': tr('brake_fluid', r.brake_fluid),
    'Омывайка':       b(r.washer_ok),
    'Авто чистый':    b(r.clean_ok),
    'Салон чистый':   b(r.interior_ok),
    'Масло':          fmtPercent(r.oil_level),
    'Охлаждайка':     b(r.coolant_ok),
    'Тормозная жидкость': tr('brake_fluid', r.brake_fluid),
    'Омывайка':       b(r.washer_ok),
    'Освещение':      b(r.lighting_ok),
    'Аварийный набор':b(r.emergency_kit_ok),
    'Стёкла':         tr('glass_condition', r.glass_condition),
    'Ошибки панели':  b(r.dashboard_errors),
    'СТС':            b(r.registration_ok),
    'ОСАГО до':       r.osago_date || '',
    'WiFi/VPN':       r.wifi || '',
    'Локация':        r.location_name || '',
    'Доп. инфо':      r.additional_info || '',
    'Критически':     r.critical_info || '',
    'Фото пробега':        p(r.photo_mileage),
    'Фото пер.лев':        p(r.photo_rl),
    'Фото пер.прав':       p(r.photo_rr),
    'Фото зад.прав':       p(r.photo_br),
    'Фото зад.лев':        p(r.photo_bl),
    'Фото спереди':        p(r.photo_front),
    'Фото сзади':          p(r.photo_rear),
    'Фото лев.сторона':    p(r.photo_left),
    'Фото прав.сторона':   p(r.photo_right),
    'Фото салон пер.лев':  p(r.photo_irl),
    'Фото салон пер.прав': p(r.photo_irr),
    'Фото салон зад.прав': p(r.photo_ibr),
    'Фото салон зад.лев':  p(r.photo_ibl),
    'Фото дня':            p(r.photo_of_day),
    'Фото повреждения':    p(r.photo_damage),
    'Фото панели':         p(r.photo_dashboard),
    'Фото зарядников':     p(r.photo_charger),
  };
}

function techInspectionToRow(r) {
  const p = id => id ? `/api/get-photo?id=${id}` : '';
  const b = v => v === 1 ? 'ДА' : v === 0 ? 'НЕТ' : '';
  return {
    'Дата':            r.submitted_at || '',
    'Фамилия':         r.user_surname || '',
    'Имя':             r.user_name || '',
    'Госномер':        r.car_number || '',
    'Марка':           r.car_brand || '',
    'Модель':          r.car_model || '',
    'Тип ТС':          r.car_type || '',
    'Геолокация':      r.geo || '',
    'Колёса ОК':       b(r.wheels_ok),
    'Доп. инфо':       r.additional_info || '',
    'Фото пер.лев':         p(r.photo_rl),
    'Фото пер.прав':        p(r.photo_rr),
    'Фото зад.прав':        p(r.photo_br),
    'Фото зад.лев':         p(r.photo_bl),
    'Фото спереди':         p(r.photo_front),
    'Фото сзади':           p(r.photo_rear),
    'Фото лев.сторона':     p(r.photo_left),
    'Фото прав.сторона':    p(r.photo_right),
    'Колесо пер.лев':       p(r.photo_wfl),
    'Протектор пер.лев':    p(r.photo_wfl_t),
    'Колесо пер.прав':      p(r.photo_wfr),
    'Протектор пер.прав':   p(r.photo_wfr_t),
    'Колесо зад.лев':       p(r.photo_wrl),
    'Протектор зад.лев':    p(r.photo_wrl_t),
    'Колесо зад.прав':      p(r.photo_wrr),
    'Протектор зад.прав':   p(r.photo_wrr_t),
    'Фото салон вод.дверь': p(r.photo_irl),
    'Фото салон пер.прав':  p(r.photo_irr),
    'Фото салон зад.прав':  p(r.photo_ibr),
    'Фото салон зад.лев':   p(r.photo_ibl),
    'Фото мотор':           p(r.photo_engine),
    'Фото багаж':           p(r.photo_trunk),
  };
}

function applyFilters(rows, mapFn, surname, plate, brand) {
  return rows
    .filter(r => !surname || (r.user_surname || '').toLowerCase() === surname)
    .filter(r => !plate   || (r.car_number  || '').toUpperCase().includes(plate))
    .filter(r => !brand   || (r.car_brand   || '').toLowerCase().includes(brand))
    .map(mapFn);
}

export default async function reportRoutes(fastify, { dataRoot, checkupDb }) {
  fastify.get('/api/get-tables', async (req, reply) => {
    const key = req.query.l || '';
    if (!consumeAccessKey(key)) {
      return reply.code(403).type('text/plain; charset=utf-8').send('Ошибка доступа');
    }
    const zip = await getTablesZip(dataRoot);
    return reply
      .header('Content-Disposition', 'attachment; filename="checkups.zip"')
      .type('application/zip')
      .send(zip);
  });

  fastify.get('/driver-app/pre-checkups', async (req, reply) => {
    const surname = (req.query.surname || '').trim().toLowerCase();
    const plate   = (req.query.plate   || '').trim().toUpperCase();
    const brand   = (req.query.brand   || '').trim().toLowerCase();
    const raw     = checkupDb.getAllPreCheckups();

    if (req.query.export === 'xlsx') {
      const filtered = applyFilters(raw, preCheckupToRow, surname, plate, brand);
      const baseUrl = `${req.protocol}://${req.hostname}`;
      const buf = await rowsToXlsx(filtered, 'Пре-чекапы', baseUrl);
      return reply
        .header('Content-Disposition', 'attachment; filename="pre-checkups.xlsx"')
        .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .send(Buffer.from(buf));
    }

    return reply.type('text/html; charset=utf-8').send(
      renderTableHtml(raw.map(preCheckupToRow), { surname, plate, brand })
    );
  });

  fastify.get('/driver-app/post-checkups', async (req, reply) => {
    const surname = (req.query.surname || '').trim().toLowerCase();
    const plate   = (req.query.plate   || '').trim().toUpperCase();
    const brand   = (req.query.brand   || '').trim().toLowerCase();
    const raw     = checkupDb.getAllPostCheckups();

    if (req.query.export === 'xlsx') {
      const filtered = applyFilters(raw, postCheckupToRow, surname, plate, brand);
      const baseUrl = `${req.protocol}://${req.hostname}`;
      const buf = await rowsToXlsx(filtered, 'После приезда', baseUrl);
      return reply
        .header('Content-Disposition', 'attachment; filename="post-checkups.xlsx"')
        .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .send(Buffer.from(buf));
    }

    return reply.type('text/html; charset=utf-8').send(
      renderTableHtml(raw.map(postCheckupToRow), { surname, plate, brand })
    );
  });

  fastify.get('/driver-app/tech-inspections', async (req, reply) => {
    const surname = (req.query.surname || '').trim().toLowerCase();
    const plate   = (req.query.plate   || '').trim().toUpperCase();
    const brand   = (req.query.brand   || '').trim().toLowerCase();
    const raw     = checkupDb.getAllTechInspections();

    if (req.query.export === 'xlsx') {
      const filtered = applyFilters(raw, techInspectionToRow, surname, plate, brand);
      const noPhotos = filtered.map(row => {
        const out = {};
        for (const [k, v] of Object.entries(row)) {
          if (!String(v || '').startsWith('/api/get-photo')) out[k] = v;
        }
        return out;
      });
      const buf = await rowsToXlsx(noPhotos, 'Тех.осмотры');
      return reply
        .header('Content-Disposition', 'attachment; filename="tech-inspections.xlsx"')
        .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .send(Buffer.from(buf));
    }

    return reply.type('text/html; charset=utf-8').send(
      renderTableHtml(raw.map(techInspectionToRow), { surname, plate, brand })
    );
  });

  fastify.post('/api/get-access', async (req, reply) => {
    try {
      const body = req.body || {};
      const userId = body?.user?.id;
      const username = body?.user?.username || '-';
      const fio = body?.name || '-';
      console.log(`\n=====ACCESS-REQUEST=====\nUserID: ${userId}\nUsername: ${username}\nFIO: ${fio}\n================`);
    } catch { /* best-effort log */ }
    return reply.send({ status: 'ok' });
  });
}
