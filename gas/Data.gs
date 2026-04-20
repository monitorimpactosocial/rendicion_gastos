function getExpenses_(filters) {
  const sheet = getSpreadsheet_().getSheetByName(APP_CONFIG.SHEET_NAME_EXPENSES);
  const data = getSheetRecords_(sheet);
  filters = filters || {};

  return data.rows
    .filter(function(row) {
      if (filters.username) {
        const rowUsername = String(row.created_by_username || '').toLowerCase();
        if (rowUsername !== String(filters.username || '').toLowerCase()) return false;
      }
      if (filters.reviewStatus && String(row.review_status || '') !== String(filters.reviewStatus)) {
        return false;
      }
      if (filters.expenseId && String(row.expense_id || '') !== String(filters.expenseId)) {
        return false;
      }
      return true;
    })
    .sort(function(left, right) {
      return getExpenseSortTime_(right) - getExpenseSortTime_(left);
    })
    .map(function(row) {
      return toExpenseClientRecord_(row);
    });
}

function getExpenseSortTime_(row) {
  const raw = firstNonEmpty_([row.updated_at, row.created_at], 0);
  const date = raw instanceof Date ? raw : new Date(raw);
  return String(date) === 'Invalid Date' || isNaN(date.getTime()) ? 0 : date.getTime();
}

function toExpenseClientRecord_(row) {
  const items = normalizeItems_(row.json_items);
  return {
    expense_id: row.expense_id || '',
    created_at: formatDate_(row.created_at),
    updated_at: formatDate_(row.updated_at),
    created_by_user_id: row.created_by_user_id || '',
    created_by_username: row.created_by_username || '',
    employee_name: row.employee_name || '',
    trip_reason: row.trip_reason || '',
    trip_destination: row.trip_destination || '',
    expense_date: row.expense_date instanceof Date ? formatDate_(row.expense_date, 'dd/MM/yyyy') : String(row.expense_date || ''),
    expense_time: row.expense_time instanceof Date ? formatDate_(row.expense_time, 'HH:mm') : String(row.expense_time || ''),
    merchant_name: row.merchant_name || '',
    merchant_ruc: row.merchant_ruc || '',
    merchant_address: row.merchant_address || '',
    merchant_phone: row.merchant_phone || '',
    document_number: row.document_number || '',
    timbrado_number: row.timbrado_number || '',
    timbrado_valid_until: row.timbrado_valid_until || '',
    client_name: row.client_name || '',
    client_ruc: row.client_ruc || '',
    operator_name: row.operator_name || '',
    currency: row.currency || 'PYG',
    subtotal: numberFromText_(row.subtotal) || 0,
    discount: numberFromText_(row.discount) || 0,
    total: numberFromText_(row.total) || 0,
    received: numberFromText_(row.received) || 0,
    change_amount: numberFromText_(row.change_amount) || 0,
    tax_exempt: numberFromText_(row.tax_exempt) || 0,
    tax_5_base: numberFromText_(row.tax_5_base) || 0,
    tax_10_base: numberFromText_(row.tax_10_base) || 0,
    iva_5: numberFromText_(row.iva_5) || 0,
    iva_10: numberFromText_(row.iva_10) || 0,
    iva_total: numberFromText_(row.iva_total) || 0,
    raw_text: row.raw_text || '',
    json_items: JSON.stringify(items, null, 2),
    items: items,
    ocr_confidence: numberFromText_(row.ocr_confidence) || 0,
    review_status: normalizeStatus_(row.review_status),
    notes: row.notes || '',
    file_id: row.file_id || '',
    file_url: row.file_url || ''
  };
}

function saveExpenseRecord_(payload, session) {
  const expense = sanitizeExpensePayload_(payload);
  validateExpensePayload_(expense);

  const sheet = getSpreadsheet_().getSheetByName(APP_CONFIG.SHEET_NAME_EXPENSES);
  const data = getSheetRecords_(sheet);
  const headers = data.headers;
  let existing = null;

  if (expense.expenseId) {
    existing = data.rows.find(function(row) {
      return String(row.expense_id || '') === expense.expenseId;
    }) || null;
  }

  if (existing && session.role !== 'admin' && String(existing.created_by_username || '') !== String(session.username || '')) {
    throw new Error('No tiene permisos para actualizar esta rendicion.');
  }

  const expenseId = existing ? existing.expense_id : (expense.expenseId || uuid_());
  const createdAt = existing ? existing.created_at : now_();
  const createdByUserId = existing ? existing.created_by_user_id : session.userId;
  const createdByUsername = existing ? existing.created_by_username : session.username;
  const fileId = firstNonEmpty_([expense.fileId, safeGet_(existing, 'file_id', ''), ''], '');
  const fileUrl = firstNonEmpty_([expense.fileUrl, safeGet_(existing, 'file_url', ''), ''], '');

  const record = {
    expense_id: expenseId,
    created_at: createdAt,
    updated_at: now_(),
    created_by_user_id: createdByUserId,
    created_by_username: createdByUsername,
    employee_name: expense.employeeName,
    trip_reason: expense.tripReason,
    trip_destination: expense.tripDestination,
    expense_date: expense.expenseDate,
    expense_time: expense.expenseTime,
    merchant_name: expense.merchantName,
    merchant_ruc: expense.merchantRuc,
    merchant_address: expense.merchantAddress,
    merchant_phone: expense.merchantPhone,
    document_number: expense.documentNumber,
    timbrado_number: expense.timbradoNumber,
    timbrado_valid_until: expense.timbradoValidUntil,
    client_name: expense.clientName,
    client_ruc: expense.clientRuc,
    operator_name: expense.operatorName,
    currency: expense.currency || 'PYG',
    subtotal: toSheetNumber_(expense.subtotal),
    discount: toSheetNumber_(expense.discount),
    total: toSheetNumber_(expense.total),
    received: toSheetNumber_(expense.received),
    change_amount: toSheetNumber_(expense.changeAmount),
    tax_exempt: toSheetNumber_(expense.taxExempt),
    tax_5_base: toSheetNumber_(expense.tax5Base),
    tax_10_base: toSheetNumber_(expense.tax10Base),
    iva_5: toSheetNumber_(expense.iva5),
    iva_10: toSheetNumber_(expense.iva10),
    iva_total: toSheetNumber_(expense.ivaTotal),
    raw_text: expense.rawText,
    json_items: JSON.stringify(expense.items || []),
    ocr_confidence: toSheetNumber_(expense.ocrConfidence),
    review_status: expense.reviewStatus,
    notes: expense.notes,
    file_id: fileId,
    file_url: fileUrl,
    thumbnail_formula: fileUrl ? '=IMAGE("' + fileUrl + '")' : ''
  };

  const rowValues = objectToRow_(headers, record);
  if (existing) {
    sheet.getRange(existing._rowNumber, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  appendLog_(
    existing ? 'UPDATE_EXPENSE' : 'CREATE_EXPENSE',
    'INFO',
    existing ? 'Rendicion actualizada' : 'Rendicion registrada',
    session.userId,
    expenseId
  );

  return expenseId;
}

function sanitizeExpensePayload_(payload) {
  payload = payload || {};
  return {
    expenseId: String(payload.expenseId || '').trim(),
    employeeName: String(payload.employeeName || '').trim(),
    tripReason: String(payload.tripReason || '').trim(),
    tripDestination: String(payload.tripDestination || '').trim(),
    expenseDate: String(payload.expenseDate || '').trim(),
    expenseTime: String(payload.expenseTime || '').trim(),
    merchantName: String(payload.merchantName || '').trim(),
    merchantRuc: String(payload.merchantRuc || '').trim(),
    merchantAddress: String(payload.merchantAddress || '').trim(),
    merchantPhone: String(payload.merchantPhone || '').trim(),
    documentNumber: String(payload.documentNumber || '').trim(),
    timbradoNumber: String(payload.timbradoNumber || '').trim(),
    timbradoValidUntil: String(payload.timbradoValidUntil || '').trim(),
    clientName: String(payload.clientName || '').trim(),
    clientRuc: String(payload.clientRuc || '').trim(),
    operatorName: String(payload.operatorName || '').trim(),
    currency: String(payload.currency || 'PYG').trim().toUpperCase(),
    subtotal: numberFromText_(payload.subtotal),
    discount: numberFromText_(payload.discount),
    total: numberFromText_(payload.total),
    received: numberFromText_(payload.received),
    changeAmount: numberFromText_(payload.changeAmount),
    taxExempt: numberFromText_(payload.taxExempt),
    tax5Base: numberFromText_(payload.tax5Base),
    tax10Base: numberFromText_(payload.tax10Base),
    iva5: numberFromText_(payload.iva5),
    iva10: numberFromText_(payload.iva10),
    ivaTotal: numberFromText_(payload.ivaTotal),
    rawText: normalizeText_(payload.rawText),
    items: normalizeItems_(payload.items),
    ocrConfidence: numberFromText_(payload.ocrConfidence),
    reviewStatus: normalizeStatus_(payload.reviewStatus),
    notes: normalizeText_(payload.notes),
    fileId: String(payload.fileId || '').trim(),
    fileUrl: String(payload.fileUrl || '').trim()
  };
}

function validateExpensePayload_(expense) {
  if (!expense.employeeName) {
    throw new Error('Ingrese el nombre del colaborador.');
  }
  if (!expense.tripReason) {
    throw new Error('Ingrese el motivo del viaje.');
  }
  if (!expense.tripDestination) {
    throw new Error('Ingrese el destino del viaje.');
  }
  if (!expense.expenseDate) {
    throw new Error('Ingrese la fecha del gasto.');
  }
  if (!expense.merchantName && !expense.documentNumber && !expense.rawText) {
    throw new Error('Complete los datos del comprobante antes de guardar.');
  }
  if (expense.total === null || expense.total <= 0) {
    throw new Error('Ingrese un total valido mayor a cero.');
  }
}

function normalizeItems_(value) {
  let items = value;
  if (typeof items === 'string') {
    items = fromJson_(items, []);
  }
  if (!Array.isArray(items)) return [];

  return items.map(function(item) {
    return {
      qty: firstNonEmpty_([numberFromText_(safeGet_(item, 'qty', null)), 1], 1),
      description: String(safeGet_(item, 'description', '') || '').trim(),
      amount: firstNonEmpty_([numberFromText_(safeGet_(item, 'amount', null)), 0], 0)
    };
  }).filter(function(item) {
    return item.description || item.amount;
  });
}

function toSheetNumber_(value) {
  return value === null || value === undefined ? '' : value;
}

function createUser_(data, session) {
  requireAdmin_(session);

  const username = String(safeGet_(data, 'username', '') || '').trim();
  const password = String(safeGet_(data, 'password', '') || '').trim();
  if (!username) throw new Error('El usuario es obligatorio.');
  if (password.length < 3) throw new Error('La contrasena debe tener al menos 3 caracteres.');

  const existing = getUsers_().some(function(user) {
    return user.username.toLowerCase() === username.toLowerCase();
  });
  if (existing) throw new Error('Ya existe un usuario con ese nombre.');

  const role = String(safeGet_(data, 'role', 'user') || 'user').trim() === 'admin' ? 'admin' : 'user';
  const sheet = getSpreadsheet_().getSheetByName(APP_CONFIG.SHEET_NAME_USERS);
  const headers = getSheetHeaders_(sheet);

  const record = {
    user_id: uuid_(),
    username: username,
    password_hash: hashText_(password),
    full_name: String(safeGet_(data, 'fullName', '') || username).trim() || username,
    role: role,
    email: String(safeGet_(data, 'email', '') || '').trim(),
    active: true,
    created_at: now_(),
    last_login_at: ''
  };

  sheet.appendRow(objectToRow_(headers, record));
  appendLog_('CREATE_USER', 'INFO', 'Usuario creado: ' + username, session.userId, '');
  return { ok: true };
}
