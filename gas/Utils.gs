function toJson_(obj) {
  return JSON.stringify(obj);
}

function fromJson_(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return fallback;
  }
}

function now_() {
  return new Date();
}

function formatDate_(value, pattern) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (String(date) === 'Invalid Date' || isNaN(date.getTime())) {
    return String(value);
  }
  return Utilities.formatDate(date, APP_CONFIG.TZ, pattern || APP_CONFIG.DATETIME_FORMAT);
}

function normalizeText_(text) {
  return String(text || '')
    .replace(/[\u00A0\t]+/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hashText_(text) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(byte) {
    const value = (byte < 0 ? byte + 256 : byte).toString(16);
    return ('0' + value).slice(-2);
  }).join('');
}

function uuid_() {
  return Utilities.getUuid();
}

function createToken_() {
  return hashText_(uuid_() + '|' + Date.now() + '|' + Math.random());
}

function isMimeTypeAllowed_(mimeType) {
  return APP_CONFIG.ALLOWED_MIME_TYPES.indexOf(String(mimeType || '').toLowerCase()) !== -1;
}

function sanitizeFileName_(name) {
  return String(name || 'archivo')
    .replace(/[\\/:*?"<>|#%{}~&]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

function numberFromText_(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  const clean = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const number = Number(clean);
  return isNaN(number) ? null : number;
}

function safeGet_(obj, path, fallback) {
  try {
    return path.split('.').reduce(function(acc, key) {
      return acc[key];
    }, obj);
  } catch (e) {
    return fallback;
  }
}

function appendLog_(action, level, detail, userId, expenseId) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(APP_CONFIG.SHEET_NAME_LOG);
  sheet.appendRow([
    now_(),
    action || '',
    level || 'INFO',
    detail || '',
    userId || '',
    expenseId || ''
  ]);
}

function buildHeaderMap_(headers) {
  const map = {};
  (headers || []).forEach(function(header, index) {
    map[String(header || '').trim()] = index + 1;
  });
  return map;
}

function getSheetHeaders_(sheet) {
  if (!sheet || sheet.getLastColumn() < 1 || sheet.getLastRow() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(value) {
    return String(value || '').trim();
  });
}

function isBlankCell_(value) {
  return value === '' || value === null || value === undefined;
}

function isEmptyRow_(row) {
  return !(row || []).some(function(value) {
    return !isBlankCell_(value);
  });
}

function ensureSheetSchema_(sheet, headers) {
  const existingHeaders = getSheetHeaders_(sheet);
  if (!existingHeaders.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return headers.slice();
  }

  const missingHeaders = headers.filter(function(header) {
    return existingHeaders.indexOf(header) === -1;
  });

  if (missingHeaders.length) {
    sheet.getRange(1, existingHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }

  sheet.setFrozenRows(1);
  return getSheetHeaders_(sheet);
}

function styleSheetHeader_(sheet) {
  const headers = getSheetHeaders_(sheet);
  if (!headers.length) return;
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#234432')
    .setFontColor('#ffffff');
}

function getSheetRecords_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values.length) {
    return { headers: [], rows: [] };
  }

  const headers = values[0].map(function(header) {
    return String(header || '').trim();
  });

  const rows = [];
  for (var index = 1; index < values.length; index++) {
    const row = values[index];
    if (isEmptyRow_(row)) continue;

    const record = { _rowNumber: index + 1 };
    headers.forEach(function(header, columnIndex) {
      record[header] = row[columnIndex];
    });
    rows.push(record);
  }

  return {
    headers: headers,
    rows: rows
  };
}

function objectToRow_(headers, data) {
  return (headers || []).map(function(header) {
    const value = data[header];
    return value === null || value === undefined ? '' : value;
  });
}

function asBoolean_(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (isBlankCell_(value)) return fallback === undefined ? false : fallback;
  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'si', 's', 'yes'].indexOf(text) >= 0) return true;
  if (['false', '0', 'no', 'n'].indexOf(text) >= 0) return false;
  return fallback === undefined ? false : fallback;
}

function normalizeStatus_(value) {
  const text = String(value || '').trim();
  return APP_CONFIG.REVIEW_STATUS_OPTIONS.indexOf(text) >= 0 ? text : 'Pendiente';
}

function firstNonEmpty_(values, fallback) {
  for (var i = 0; i < (values || []).length; i++) {
    if (!isBlankCell_(values[i])) return values[i];
  }
  return fallback;
}
