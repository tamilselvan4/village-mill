const SHEET_NAME = 'Waitlist';
const SPREADSHEET_ID = '';
const HEADERS = ['Timestamp', 'Email', 'Source', 'Page', 'User Agent'];

function doGet() {
  return jsonResponse_({ ok: true, service: 'Village Mill waitlist' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = parsePayload_(e);
    const email = String(payload.email || '').trim().toLowerCase();

    if (!isValidEmail_(email)) {
      return jsonResponse_({ ok: false, error: 'Invalid email' });
    }

    const sheet = getWaitlistSheet_();
    ensureHeaders_(sheet);

    const duplicate = hasEmail_(sheet, email);
    if (!duplicate) {
      sheet.appendRow([
        new Date(),
        email,
        payload.source || '',
        payload.page || '',
        payload.userAgent || '',
      ]);
    }

    return jsonResponse_({ ok: true, duplicate });
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message });
  } finally {
    lock.releaseLock();
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function getWaitlistSheet_() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('No spreadsheet found. Set SPREADSHEET_ID or create this script from Extensions > Apps Script inside the Sheet.');
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(HEADERS);
}

function hasEmail_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const emails = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  return emails.some(row => String(row[0]).trim().toLowerCase() === email);
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
