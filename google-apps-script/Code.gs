const WAITLIST_SHEET_NAME = 'Waitlist';
const ORDERS_SHEET_NAME = 'Orders';
const ORDER_ITEMS_SHEET_NAME = 'Order Items';
const SPREADSHEET_ID = '';
const WAITLIST_HEADERS = ['Timestamp', 'Email', 'Source', 'Page', 'User Agent'];
const ORDER_HEADERS = [
  'Order ID',
  'Created At',
  'Customer Name',
  'Phone',
  'Address',
  'Pincode',
  'Delivery Mode',
  'Delivery Fee',
  'Subtotal',
  'Discount',
  'Total',
  'Payment Status',
  'Payment Method',
  'Source',
  'Page',
  'User Agent',
];
const ORDER_ITEM_HEADERS = [
  'Order ID',
  'SKU',
  'Product',
  'Variant',
  'Quantity',
  'Unit Price',
  'Line Total',
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
  const createdAt = String(payload.createdAt || '').trim();
  const customer = payload.customer || {};
  const delivery = payload.delivery || {};
  const payment = payload.payment || {};
  const pricing = payload.pricing || {};
  const source = payload.source || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const customerName = String(customer.name || '').trim();
  const phone = String(customer.phone || '').trim();
  const address = String(customer.address || '').trim();
  const pincode = String(customer.pincode || '').trim();
  const deliveryMode = String(delivery.mode || '').trim();
  const deliveryFee = toNumber_(delivery.fee);
  const subtotal = toNumber_(pricing.subtotal);
  const discount = toNumber_(pricing.discount);
  const total = toNumber_(pricing.total);
  const paymentStatus = String(payment.status || '').trim() || 'paid';
  const paymentMethod = String(payment.method || '').trim() || 'UPI';
  const sourceName = String(source.source || '').trim();
  const page = String(source.page || '').trim();
  const userAgent = String(source.userAgent || '').trim();
  const isHomeDelivery = deliveryMode === 'home';

  if (!orderId) throw new Error('Missing order ID');
  if (!createdAt) throw new Error('Missing created timestamp');
  if (customerName.length < 2) throw new Error('Missing customer name');
  if (!isValidPhone_(phone)) throw new Error('Invalid phone number');
  if (deliveryMode !== 'pickup' && deliveryMode !== 'home') throw new Error('Invalid delivery mode');
  if (!items.length) throw new Error('At least one order item is required');
  if (subtotal <= 0 || total <= 0 || total !== subtotal + deliveryFee - discount) {
    throw new Error('Invalid order totals');
  }
  if (isHomeDelivery && address.length < 8) throw new Error('Missing address');
  if (isHomeDelivery && !isValidPincode_(pincode)) throw new Error('Invalid pincode');

  const validatedItems = items.map(validateOrderItem_);
  const recalculatedSubtotal = validatedItems.reduce((sum, item) => sum + item.lineTotal, 0);

  if (recalculatedSubtotal !== subtotal) {
    throw new Error('Subtotal does not match order items');
  }

  const orderSheet = getSheet_(ORDERS_SHEET_NAME);
  const itemSheet = getSheet_(ORDER_ITEMS_SHEET_NAME);
  ensureHeaders_(orderSheet, ORDER_HEADERS);
  ensureHeaders_(itemSheet, ORDER_ITEM_HEADERS);

  if (!hasOrderId_(orderSheet, orderId)) {
    orderSheet.appendRow([
      orderId,
      createdAt,
      customerName,
      phone,
      address,
      pincode,
      deliveryMode,
      deliveryFee,
      subtotal,
      discount,
      total,
      paymentStatus,
      paymentMethod,
      sourceName,
      page,
      userAgent,
    ]);

    validatedItems.forEach(item => {
      itemSheet.appendRow([
        orderId,
        item.sku,
        item.product,
        item.variant,
        item.quantity,
        item.unitPrice,
        item.lineTotal,
      ]);
    });
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

  const orderIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return orderIds.some(row => String(row[0]).trim() === orderId);
}

function validateOrderItem_(item) {
  const sku = String(item.sku || '').trim();
  const product = String(item.product || '').trim();
  const variant = String(item.variant || '').trim();
  const quantity = toNumber_(item.quantity);
  const unitPrice = toNumber_(item.unitPrice);
  const lineTotal = toNumber_(item.lineTotal);

  if (!sku) throw new Error('Missing item SKU');
  if (!product) throw new Error('Missing item product');
  if (!variant) throw new Error('Missing item variant');
  if (quantity < 1) throw new Error('Invalid item quantity');
  if (unitPrice < 0) throw new Error('Invalid item unit price');
  if (lineTotal !== quantity * unitPrice) throw new Error('Invalid item line total');

  return {
    sku,
    product,
    variant,
    quantity,
    unitPrice,
    lineTotal,
  };
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
