/**
 * api/sync-sheet.js - Vercel Serverless Function (Node.js)
 * Live fetch and parse Google Sheet CSV
 */

const SHEET_ID = "1uXyB0U9ewC7EErKhjgpMl5nLNTV2LOgv9uq29emxlDo";
const GID = "688658522";
const CSV_EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

function parseCsv(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal);
      if (currentRow.some(c => c.trim().length > 0)) rows.push(currentRow);
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal);
    if (currentRow.some(c => c.trim().length > 0)) rows.push(currentRow);
  }
  return rows;
}

function extractPhones(text) {
  if (!text) return [];
  const matches = text.match(/(?:0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{3,4}|\+66[-\s]?\d[-\s]?\d{3,4}[-\s]?\d{3,4}|\b0\d{8,9}\b)/g) || [];
  const cleaned = [];
  for (const m of matches) {
    let p = m.replace(/[\s-]/g, '');
    if (p.startsWith('+66')) p = '0' + p.slice(3);
    if (!cleaned.includes(p) && p.length >= 9) cleaned.push(p);
  }
  return cleaned;
}

function extractEmails(text) {
  if (!text) return [];
  const matches = text.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || [];
  const cleaned = [];
  for (const m of matches) {
    const e = m.toLowerCase();
    if (!cleaned.includes(e)) cleaned.push(e);
  }
  return cleaned;
}

function extractUrls(text) {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s,;"'<>()]+/g) || [];
  const cleaned = [];
  for (const m of matches) {
    const u = m.replace(/[.,)>\]]+$/, '');
    if (!cleaned.includes(u)) cleaned.push(u);
  }
  return cleaned;
}

function inferColumn(colJ, colN, colP, colQ, colR, colS, statusRecruit, statusFollowup, statusExtra) {
  colJ = (colJ || '').trim();
  colN = (colN || '').trim();
  colP = (colP || '').trim();
  colQ = (colQ || '').trim();
  colR = (colR || '').trim();
  colS = (colS || '').trim();

  if (colJ === '❌') return 'dropped';
  if (colN === '❌') return 'closed';

  if (colS === '✅') return 'accepted';
  if (colR === '✅') return 'interview';
  if (colQ === '✅') return 'following_up';
  if (colP === '✅') return 'applied';
  if (colP === '❌') return 'target';

  const full = `${statusRecruit || ''} ${statusFollowup || ''} ${statusExtra || ''}`.toLowerCase();
  if (full.includes('ได้ที่แล้ว') || full.includes('ได้ที่เเล้ว')) return 'accepted';
  if (full.includes('นัดสัมภาษณ์') || full.includes('สัมภาษณ์')) return 'interview';
  if (['ส่งเรซูเม่', 'กดสมัคร', 'ส่งใบสมัคร', 'สมัครไปแล้ว', 'สมัครไปเเล้ว'].some(kw => full.includes(kw))) {
    return 'applied';
  }

  return 'target';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = `${CSV_EXPORT_URL}&t=${Date.now()}`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) throw new Error(`Google Sheet returned ${resp.status}`);
    const text = await resp.text();
    const rows = parseCsv(text);

    const companies = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;
      const no = (r[0] || '').trim();
      if (!no || isNaN(Number(no))) continue;

      const cid = Number(no);
      const nameRaw = (r[1] || '').trim();
      const name = nameRaw.split('\n')[0].trim();
      const about = (r[2] || '').trim();
      const bizType = (r[3] || '').trim();
      const location = (r[4] || '').trim();
      const locDesc = (r[5] || '').trim();
      const zone = (r[6] || '').trim();
      const role = (r[7] || '').trim();
      const welfare = (r[8] || '').trim();
      const tier = (r[9] || '✅').replace(/\s/g, '');
      const reason = (r[10] || '').trim();
      const contact = (r[11] || '').trim();
      const statusRecruit = (r[12] || '').trim();
      const statusOpen = (r[13] || '').trim();
      const statusFollowup = (r[14] || '').trim();
      const statusExtra = (r.slice(15, 21).filter(c => c && c.trim()).join('\n')).trim();

      const colJ = tier;
      const colN = statusOpen;
      const colP = (r[15] || '').trim();
      const colQ = (r[16] || '').trim();
      const colR = (r[17] || '').trim();
      const colS = (r[18] || '').trim();

      const combinedContactText = `${contact}\n${statusFollowup}\n${statusRecruit}\n${nameRaw}`;
      const phones = extractPhones(combinedContactText);
      const emails = extractEmails(combinedContactText);
      const urls = extractUrls(combinedContactText);

      const applyUrl = urls[0] || '';
      const mapCleanQuery = location.replace('— แมพ', '').replace('- แมพ', '').trim();
      const mapUrl = mapCleanQuery
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapCleanQuery + ' ' + zone)}`
        : '';

      const col = inferColumn(colJ, colN, colP, colQ, colR, colS, statusRecruit, statusFollowup, statusExtra);

      companies.push({
        id: cid,
        no: String(no),
        name,
        apply_url: applyUrl,
        urls,
        about,
        biz_type: bizType,
        location,
        map_url: mapUrl,
        loc_desc: locDesc,
        zone,
        role,
        welfare,
        tier,
        col_j: colJ,
        col_n: colN,
        col_p: colP,
        col_q: colQ,
        col_r: colR,
        col_s: colS,
        orig_tier: colJ !== '❌' ? colJ : '✅',
        orig_status_open: colN !== '❌' ? colN : '✅',
        reason,
        contact,
        phones,
        emails,
        status_recruit: statusRecruit,
        status_open: statusOpen,
        status_followup: statusFollowup,
        status_extra: statusExtra,
        custom_notes: statusFollowup,
        column: col
      });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    return res.status(200).json({
      ok: true,
      synced_at: timeStr,
      count: companies.length,
      companies
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: String(err)
    });
  }
}
