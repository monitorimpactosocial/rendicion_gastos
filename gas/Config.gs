const APP_CONFIG = {
  APP_NAME: 'Rendicion de Gastos de Viajes',
  DRIVE_FOLDER_ID: '1tLHQ8o0obWqDnK6mwfDZ9--0qN2zh_Hs',
  DEFAULT_SPREADSHEET_ID: '1iK8MF2Yeb3H7Jp2SnYcvRiGAvcJdEHyCYIbcytjktig',
  SHEET_NAME_EXPENSES: 'EXPENSES',
  SHEET_NAME_USERS: 'USERS',
  SHEET_NAME_LOG: 'LOG',
  USER_HEADERS: [
    'user_id',
    'username',
    'password_hash',
    'full_name',
    'role',
    'email',
    'active',
    'created_at',
    'last_login_at'
  ],
  EXPENSE_HEADERS: [
    'expense_id',
    'created_at',
    'updated_at',
    'created_by_user_id',
    'created_by_username',
    'employee_name',
    'trip_reason',
    'trip_destination',
    'expense_date',
    'expense_time',
    'merchant_name',
    'merchant_ruc',
    'merchant_address',
    'merchant_phone',
    'document_number',
    'timbrado_number',
    'timbrado_valid_until',
    'client_name',
    'client_ruc',
    'operator_name',
    'currency',
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
    'iva_total',
    'raw_text',
    'json_items',
    'ocr_confidence',
    'review_status',
    'notes',
    'file_id',
    'file_url',
    'thumbnail_formula'
  ],
  LOG_HEADERS: [
    'timestamp',
    'action',
    'level',
    'detail',
    'user_id',
    'expense_id'
  ],
  DATE_FORMAT: 'dd/MM/yyyy',
  DATETIME_FORMAT: 'dd/MM/yyyy HH:mm:ss',
  TZ: 'America/Asuncion',
  DEFAULT_ADMIN_USER: 'admin',
  DEFAULT_ADMIN_PASSWORD: '123',
  SESSION_HOURS: 8,
  MAX_UPLOAD_MB: 10,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  REVIEW_STATUS_OPTIONS: ['Pendiente', 'Aprobado', 'Observado']
};

function getScriptProperties() {
  return PropertiesService.getScriptProperties();
}

function getSpreadsheetId_() {
  return getScriptProperties().getProperty('SPREADSHEET_ID') || APP_CONFIG.DEFAULT_SPREADSHEET_ID;
}

function setSpreadsheetId_(id) {
  getScriptProperties().setProperty('SPREADSHEET_ID', id);
}

function getSpreadsheet_() {
  const spreadsheetId = getSpreadsheetId_();
  if (!spreadsheetId) {
    throw new Error('La aplicacion aun no fue inicializada. Ejecute setupApp() una vez desde el editor de Apps Script.');
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function getRootFolder_() {
  return DriveApp.getFolderById(APP_CONFIG.DRIVE_FOLDER_ID);
}

function getOrCreateSubfolder_(name) {
  const folder = getRootFolder_();
  const iterator = folder.getFoldersByName(name);
  return iterator.hasNext() ? iterator.next() : folder.createFolder(name);
}

function getUploadsFolder_() {
  return getOrCreateSubfolder_('uploads_facturas');
}

function getOcrTempFolder_() {
  return getOrCreateSubfolder_('ocr_tmp');
}
