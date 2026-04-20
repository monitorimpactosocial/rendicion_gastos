function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.appName = APP_CONFIG.APP_NAME;
  return template.evaluate()
    .setTitle(APP_CONFIG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function apiLogin(username, password) {
  ensureAppReady_();
  const user = authenticate_(username, password);
  const session = createSession_(user);

  appendLog_('LOGIN', 'INFO', 'Inicio de sesion', user.userId, '');

  return {
    ok: true,
    token: session.token,
    expiresAt: session.expiresAt.getTime(),
    user: {
      userId: user.userId,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      email: user.email
    }
  };
}

function apiLogout(token) {
  const session = getSession_(token);
  deleteSession_(token);
  appendLog_('LOGOUT', 'INFO', 'Cierre de sesion', session ? session.userId : '', '');
  return { ok: true };
}

function apiGetBootstrap(token) {
  ensureAppReady_();
  const session = requireSession_(token);
  const expenses = getExpenses_(session.role === 'admin' ? {} : { username: session.username });

  return {
    ok: true,
    appName: APP_CONFIG.APP_NAME,
    reviewStatusOptions: APP_CONFIG.REVIEW_STATUS_OPTIONS.slice(),
    user: session,
    stats: buildStats_(expenses),
    expenses: expenses,
    users: session.role === 'admin' ? getUsers_().map(function(user) {
      return {
        userId: user.userId,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        active: user.active,
        createdAt: formatDate_(user.createdAt),
        lastLoginAt: formatDate_(user.lastLoginAt)
      };
    }) : []
  };
}

function buildStats_(expenses) {
  let totalAmount = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let observedCount = 0;

  (expenses || []).forEach(function(expense) {
    totalAmount += Number(expense.total || 0);
    if (String(expense.review_status) === 'Pendiente') pendingCount++;
    if (String(expense.review_status) === 'Aprobado') approvedCount++;
    if (String(expense.review_status) === 'Observado') observedCount++;
  });

  return {
    expenseCount: (expenses || []).length,
    totalAmount: totalAmount,
    pendingCount: pendingCount,
    approvedCount: approvedCount,
    observedCount: observedCount
  };
}

function apiUploadAndRecognize(token, payload) {
  ensureAppReady_();
  const session = requireSession_(token);
  if (!payload || !payload.base64 || !payload.mimeType || !payload.fileName) {
    throw new Error('Archivo invalido.');
  }
  if (!isMimeTypeAllowed_(payload.mimeType)) {
    throw new Error('Tipo de archivo no permitido.');
  }

  const bytes = Utilities.base64Decode(payload.base64);
  const sizeMb = bytes.length / (1024 * 1024);
  if (sizeMb > APP_CONFIG.MAX_UPLOAD_MB) {
    throw new Error('El archivo excede el tamano maximo de ' + APP_CONFIG.MAX_UPLOAD_MB + ' MB.');
  }

  const blob = Utilities.newBlob(bytes, payload.mimeType, sanitizeFileName_(payload.fileName));
  const file = getUploadsFolder_().createFile(blob);
  const fileId = file.getId();
  const fileUrl = 'https://drive.google.com/file/d/' + fileId + '/view';

  const ocrText = extractTextWithDriveOcr_(blob, payload.fileName);
  const parsed = parseReceiptText_(ocrText);
  parsed.fileId = fileId;
  parsed.fileUrl = fileUrl;
  parsed.employeeName = payload.employeeName || '';
  parsed.tripReason = payload.tripReason || '';
  parsed.tripDestination = payload.tripDestination || '';

  appendLog_('OCR_UPLOAD', 'INFO', 'Factura procesada: ' + payload.fileName, session.userId, '');

  return {
    ok: true,
    fileId: fileId,
    fileUrl: fileUrl,
    extracted: parsed
  };
}

function apiSaveExpense(token, payload) {
  ensureAppReady_();
  const session = requireSession_(token);
  const expenseId = saveExpenseRecord_(payload, session);
  return { ok: true, expenseId: expenseId };
}

function apiCreateUser(token, payload) {
  ensureAppReady_();
  const session = requireSession_(token);
  return createUser_(payload, session);
}
