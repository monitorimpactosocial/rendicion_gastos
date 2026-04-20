function createSession_(user) {
  const token = createToken_();
  const expiresAt = new Date(Date.now() + APP_CONFIG.SESSION_HOURS * 60 * 60 * 1000);

  CacheService.getScriptCache().put(
    'session_' + token,
    toJson_({
      token: token,
      userId: user.userId,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      email: user.email || '',
      expiresAt: expiresAt.getTime()
    }),
    APP_CONFIG.SESSION_HOURS * 3600
  );

  return {
    token: token,
    expiresAt: expiresAt
  };
}

function getSession_(token) {
  if (!token) return null;

  const raw = CacheService.getScriptCache().get('session_' + token);
  if (!raw) return null;

  const session = fromJson_(raw, null);
  if (!session) return null;

  if (session.expiresAt < Date.now()) {
    CacheService.getScriptCache().remove('session_' + token);
    return null;
  }

  return session;
}

function deleteSession_(token) {
  if (token) CacheService.getScriptCache().remove('session_' + token);
}

function getUsers_() {
  const sheet = getSpreadsheet_().getSheetByName(APP_CONFIG.SHEET_NAME_USERS);
  const data = getSheetRecords_(sheet);

  return data.rows.map(function(row) {
    return {
      userId: row.user_id,
      username: String(row.username || '').trim(),
      passwordHash: row.password_hash,
      fullName: row.full_name || '',
      role: row.role || 'user',
      email: row.email || '',
      active: asBoolean_(row.active, true),
      createdAt: row.created_at || '',
      lastLoginAt: row.last_login_at || '',
      rowNumber: row._rowNumber
    };
  });
}

function authenticate_(username, password) {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const users = getUsers_();
  const user = users.find(function(item) {
    return item.username.toLowerCase() === normalizedUsername && item.active;
  });

  if (!user) {
    throw new Error('Usuario no encontrado o inactivo.');
  }

  if (user.passwordHash !== hashText_(password)) {
    throw new Error('Contrasena incorrecta.');
  }

  const sheet = getSpreadsheet_().getSheetByName(APP_CONFIG.SHEET_NAME_USERS);
  const headerMap = buildHeaderMap_(getSheetHeaders_(sheet));
  const lastLoginColumn = headerMap.last_login_at;
  if (lastLoginColumn) {
    sheet.getRange(user.rowNumber, lastLoginColumn).setValue(now_());
  }

  return user;
}

function requireSession_(token) {
  const session = getSession_(token);
  if (!session) {
    throw new Error('Sesion vencida o invalida. Inicie sesion nuevamente.');
  }
  return session;
}

function requireAdmin_(session) {
  if (!session || session.role !== 'admin') {
    throw new Error('Acceso denegado.');
  }
}
