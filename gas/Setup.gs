function setupApp() {
  const spreadsheet = ensureAppReady_();
  appendLog_('SETUP', 'INFO', 'Inicializacion completada o verificada', '', '');

  return {
    ok: true,
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    driveFolderId: APP_CONFIG.DRIVE_FOLDER_ID
  };
}

function ensureAppReady_() {
  getRootFolder_();

  let spreadsheet;
  const spreadsheetId = getSpreadsheetId_();

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = getBoundSpreadsheet_();

    if (spreadsheet) {
      setSpreadsheetId_(spreadsheet.getId());
    } else {
      spreadsheet = SpreadsheetApp.create('Rendicion_Gastos_Paracel');
      const file = DriveApp.getFileById(spreadsheet.getId());
      const folder = getRootFolder_();
      folder.addFile(file);
      try {
        DriveApp.getRootFolder().removeFile(file);
      } catch (e) {}
      setSpreadsheetId_(spreadsheet.getId());
    }
  }

  ensureSheet_(spreadsheet, APP_CONFIG.SHEET_NAME_USERS, APP_CONFIG.USER_HEADERS);
  ensureSheet_(spreadsheet, APP_CONFIG.SHEET_NAME_EXPENSES, APP_CONFIG.EXPENSE_HEADERS);
  ensureSheet_(spreadsheet, APP_CONFIG.SHEET_NAME_LOG, APP_CONFIG.LOG_HEADERS);

  seedAdminUser_();
  formatSheets_(spreadsheet);
  return spreadsheet;
}

function getBoundSpreadsheet_() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    return spreadsheet || null;
  } catch (e) {
    return null;
  }
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  ensureSheetSchema_(sheet, headers);
  styleSheetHeader_(sheet);
  return sheet;
}

function formatSheets_(spreadsheet) {
  const expenses = spreadsheet.getSheetByName(APP_CONFIG.SHEET_NAME_EXPENSES);
  const users = spreadsheet.getSheetByName(APP_CONFIG.SHEET_NAME_USERS);
  const log = spreadsheet.getSheetByName(APP_CONFIG.SHEET_NAME_LOG);

  setColumnWidthsByHeader_(expenses, {
    expense_id: 180,
    created_at: 165,
    updated_at: 165,
    created_by_username: 150,
    employee_name: 180,
    trip_reason: 220,
    trip_destination: 180,
    expense_date: 110,
    expense_time: 90,
    merchant_name: 240,
    merchant_ruc: 140,
    merchant_address: 260,
    merchant_phone: 140,
    document_number: 160,
    timbrado_number: 150,
    timbrado_valid_until: 130,
    client_name: 220,
    client_ruc: 140,
    operator_name: 180,
    raw_text: 420,
    json_items: 320,
    notes: 260,
    file_url: 280,
    thumbnail_formula: 160
  });
  setNumberFormatByHeaders_(expenses, [
    'subtotal',
    'discount',
    'total',
    'received',
    'change_amount',
    'tax_exempt',
    'tax_5_base',
    'tax_10_base',
    'iva_5',
    'iva_10',
    'iva_total'
  ], '#,##0');

  setColumnWidthsByHeader_(users, {
    user_id: 180,
    username: 140,
    password_hash: 320,
    full_name: 200,
    role: 100,
    email: 220,
    active: 80,
    created_at: 165,
    last_login_at: 165
  });

  setColumnWidthsByHeader_(log, {
    timestamp: 165,
    action: 140,
    level: 100,
    detail: 320,
    user_id: 180,
    expense_id: 180
  });
}

function setColumnWidthsByHeader_(sheet, config) {
  if (!sheet) return;
  const map = buildHeaderMap_(getSheetHeaders_(sheet));
  Object.keys(config || {}).forEach(function(header) {
    const column = map[header];
    if (column) sheet.setColumnWidth(column, config[header]);
  });
}

function setNumberFormatByHeaders_(sheet, headers, format) {
  if (!sheet || sheet.getMaxRows() < 2) return;
  const map = buildHeaderMap_(getSheetHeaders_(sheet));
  (headers || []).forEach(function(header) {
    const column = map[header];
    if (column) {
      sheet.getRange(2, column, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat(format);
    }
  });
}

function seedAdminUser_() {
  const sheet = getSpreadsheet_().getSheetByName(APP_CONFIG.SHEET_NAME_USERS);
  const data = getSheetRecords_(sheet);
  const exists = data.rows.some(function(row) {
    return String(row.username || '').toLowerCase() === APP_CONFIG.DEFAULT_ADMIN_USER;
  });

  if (exists) return;

  const record = {
    user_id: uuid_(),
    username: APP_CONFIG.DEFAULT_ADMIN_USER,
    password_hash: hashText_(APP_CONFIG.DEFAULT_ADMIN_PASSWORD),
    full_name: 'Administrador',
    role: 'admin',
    email: '',
    active: true,
    created_at: now_(),
    last_login_at: ''
  };

  sheet.appendRow(objectToRow_(data.headers, record));
}
