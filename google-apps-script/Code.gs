const WAITLIST_SHEET_NAME = 'Waitlist';
const ORDERS_SHEET_NAME = 'Orders';
const SPREADSHEET_ID = '';
const WAITLIST_HEADERS = ['Timestamp', 'Email', 'Source', 'Page', 'User Agent'];
const ORDER_HEADERS = [
  'Timestamp',
  'Order ID',
  'Product',
  'Size',
  'Quantity',
  'Unit Price',
  'Subtotal',
  'Delivery Mode',
  'Delivery Fee',
  'Total',
  'Customer Name',
  'Phone Number',
  'Address',
  'Pincode',
  'Payment Status',
  'Source',
  'Page',
  'User Agent',
];

function doGet() {
  return jsonResponse_({ ok: true, service: 'Village Mill waitlist and orders' });
}

function doOptions() {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = parsePayload_(e);

    if (String(payload.action || '').trim().toLowerCase() === 'order') {
      return saveOrder_(payload);
    }

    return saveWaitlist_(payload);
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message });
  } finally {
    lock.releaseLock();
  }
}

function saveWaitlist_(payload) {
  const email = String(payload.email || '').trim().toLowerCase();

  if (!isValidEmail_(email)) {
    return jsonResponse_({ ok: false, error: 'Invalid email' });
  }

  const sheet = getSheet_(WAITLIST_SHEET_NAME);
  ensureHeaders_(sheet, WAITLIST_HEADERS);

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
}

function saveOrder_(payload) {
  const orderId = String(payload.orderId || '').trim();
  const product = String(payload.product || '').trim();
  const size = String(payload.size || '').trim();
  const deliveryMode = String(payload.deliveryMode || '').trim();
  const customerName = String(payload.customerName || '').trim();
  const phoneNumber = String(payload.phoneNumber || '').trim();
  const address = String(payload.address || '').trim();
  const pincode = String(payload.pincode || '').trim();
  const paymentStatus = String(payload.paymentStatus || '').trim() || 'paid';
  const quantity = toNumber_(payload.quantity);
  const unitPrice = toNumber_(payload.unitPrice);
  const subtotal = toNumber_(payload.subtotal);
  const deliveryFee = toNumber_(payload.deliveryFee);
  const total = toNumber_(payload.total);
  const isHomeDelivery = deliveryMode === 'home';

  if (!orderId) throw new Error('Missing order ID');
  if (!product) throw new Error('Missing product');
  if (!size) throw new Error('Missing size');
  if (quantity < 1) throw new Error('Invalid quantity');
  if (unitPrice <= 0 || subtotal <= 0 || total <= 0) throw new Error('Invalid order amount');
  if (!customerName) throw new Error('Missing customer name');
  if (!isValidPhone_(phoneNumber)) throw new Error('Invalid phone number');
  if (deliveryMode !== 'pickup' && deliveryMode !== 'home') throw new Error('Invalid delivery mode');
  if (isHomeDelivery && !address) throw new Error('Missing address');
  if (isHomeDelivery && !isValidPincode_(pincode)) throw new Error('Invalid pincode');

  const sheet = getSheet_(ORDERS_SHEET_NAME);
  ensureHeaders_(sheet, ORDER_HEADERS);

  if (!hasOrderId_(sheet, orderId)) {
    sheet.appendRow([
      new Date(),
      orderId,
      product,
      size,
      quantity,
      unitPrice,
      subtotal,
      deliveryMode,
      deliveryFee,
      total,
      customerName,
      phoneNumber,
      address,
      pincode,
      paymentStatus,
      payload.source || '',
      payload.page || '',
      payload.userAgent || '',
    ]);
  }

  return jsonResponse_({ ok: true, orderId });
}

function parsePayload_(e) {
  if (!e || !e.postData) return {};

  const contentType = String(e.postData.type || '').toLowerCase();
  const rawBody = e.postData.contents;

  if (!rawBody) return {};

  const bodyText = typeof rawBody === 'string' ? rawBody : Utilities.newBlob(rawBody).getDataAsString();
  const trimmed = String(bodyText || '').trim();

  if (!trimmed) return {};

  if (contentType.includes('application/json') || contentType.includes('text/plain') || contentType.includes('application/x-www-form-urlencoded')) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return {};
    }
  }

  return {};
}

function getSheet_(sheetName) {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('No spreadsheet found. Set SPREADSHEET_ID or create this script from Extensions > Apps Script inside the Sheet.');
  }

  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  return sheet;
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(headers);
}

function hasEmail_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const emails = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  return emails.some(row => String(row[0]).trim().toLowerCase() === email);
}

function hasOrderId_(sheet, orderId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const orderIds = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  return orderIds.some(row => String(row[0]).trim() === orderId);
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone_(phoneNumber) {
  return /^[0-9+\-\s]{10,15}$/.test(phoneNumber);
}

function isValidPincode_(pincode) {
  return /^\d{6}$/.test(pincode);
}

function toNumber_(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function jsonResponse_(payload) {
  const output = ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);

  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  return output;
}
