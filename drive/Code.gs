/**
 * MICU HANDOVER → Google Drive archive
 *
 * What it does
 *  - Saves each day's sheet into your Drive:
 *      MICU HANDOVER Archive / 2026 / 10-October / MICU_Handover_2026-10-23_0740.docx (+ .json)
 *  - Keeps one Google Sheet "MICU HANDOVER Database" with one row per patient per handover.
 *    Saving the same handover again replaces its files and rows (no duplicates).
 *
 * Setup (once, from a laptop) — see README for pictures-free steps:
 *  1. script.google.com → New project → paste this whole file.
 *  2. Change SECRET_KEY below to your own long random text.
 *  3. Deploy → New deployment → type "Web app"
 *       Execute as: Me      Who has access: Anyone
 *     Allow the permissions it asks for (Drive + Sheets).
 *  4. Copy the Web app URL. In the app: Settings → Drive → paste URL and the same key → Test connection.
 */

const SECRET_KEY = 'CHANGE-ME-to-a-long-random-text';
const ROOT_FOLDER_NAME = 'MICU HANDOVER Archive';
const DATABASE_NAME = 'MICU HANDOVER Database';
const ROWS_TAB = 'Handovers';
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (!d || d.key !== SECRET_KEY) return out_({ ok: false, error: 'Wrong secret key. Check Settings → Drive in the app.' });
    const root = rootFolder_();
    const db = database_(root);

    if (d.action === 'ping') return out_({ ok: true, folderUrl: root.getUrl(), sheetUrl: db.getUrl() });

    if (d.action === 'archive') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) return out_({ ok: false, error: 'Bad date' });
      const parts = d.date.split('-');
      const folder = sub_(sub_(root, parts[0]), parts[1] + '-' + MONTH_NAMES[Number(parts[1]) - 1]);
      (d.files || []).forEach(function (f) {
        const old = folder.getFilesByName(f.name);
        while (old.hasNext()) old.next().setTrashed(true);
        folder.createFile(Utilities.newBlob(Utilities.base64Decode(f.data), f.mimeType, f.name));
      });
      if (d.header && d.rows) upsertRows_(db, d.header, d.date, d.time || '', d.rows);
      return out_({ ok: true, folderUrl: folder.getUrl(), sheetUrl: db.getUrl() });
    }
    return out_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet() { return out_({ ok: true, message: 'MICU HANDOVER archive is running.' }); }

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function rootFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROOT_ID');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) { } }
  const f = DriveApp.createFolder(ROOT_FOLDER_NAME);
  props.setProperty('ROOT_ID', f.getId());
  return f;
}

function sub_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function database_(root) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('DB_ID');
  if (id) { try { const ss = SpreadsheetApp.openById(id); if (!DriveApp.getFileById(id).isTrashed()) return ss; } catch (e) { } }
  const ss = SpreadsheetApp.create(DATABASE_NAME);
  ss.getSheets()[0].setName(ROWS_TAB);
  DriveApp.getFileById(ss.getId()).moveTo(root);
  props.setProperty('DB_ID', ss.getId());
  return ss;
}

function upsertRows_(ss, header, date, time, rows) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = ss.getSheetByName(ROWS_TAB) || ss.insertSheet(ROWS_TAB);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    sh.getRange('A:B').setNumberFormat('@'); // keep date and time as plain text
    const last = sh.getLastRow();
    if (last > 1) {
      const keys = sh.getRange(2, 1, last - 1, 2).getDisplayValues();
      for (let i = keys.length - 1; i >= 0; i--) if (keys[i][0] === date && keys[i][1] === time) sh.deleteRow(i + 2);
    }
    if (rows.length) {
      const width = header.length;
      const fixed = rows.map(function (r) { const x = r.slice(0, width); while (x.length < width) x.push(''); return x; });
      sh.getRange(sh.getLastRow() + 1, 1, fixed.length, width).setValues(fixed);
    }
  } finally {
    lock.releaseLock();
  }
}
