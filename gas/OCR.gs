function extractTextWithDriveOcr_(blob, originalName) {
  const tempFolder = getOcrTempFolder_();
  const resource = {
    title: 'OCR_' + sanitizeFileName_(originalName || 'archivo') + '_' + Date.now(),
    parents: [{ id: tempFolder.getId() }]
  };

  let inserted;
  let retries = 0;
  const maxRetries = 3;
  while (retries < maxRetries) {
    try {
      inserted = Drive.Files.insert(resource, blob, {
        ocr: true,
        ocrLanguage: 'es'
      });
      break;
    } catch (e) {
      const errorMsg = String(e);
      if (errorMsg.indexOf('rate limit') > -1 || errorMsg.indexOf('Rate Limit') > -1 || errorMsg.indexOf('429') > -1) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error('Límite de OCR excedido temporalmente. Por favor, intente de nuevo en unos minutos.');
        }
        Utilities.sleep(Math.pow(2, retries) * 1000 + Math.round(Math.random() * 1000));
      } else {
        throw e;
      }
    }
  }

  const doc = DocumentApp.openById(inserted.id);
  const text = doc.getBody().getText();

  try {
    DriveApp.getFileById(inserted.id).setTrashed(true);
  } catch (e) {}

  return normalizeText_(text);
}

function parseReceiptText_(rawText) {
  const text = normalizeText_(rawText || '');
  const lines = text.split('\n').map(function(line) {
    return line.trim();
  }).filter(Boolean);
  const joinedUpper = text.toUpperCase();

  const data = {
    merchantName: lines[0] || '',
    merchantRuc: extractFirst_(joinedUpper, /RUC\s*:?\s*([0-9\-]+)/i),
    merchantAddress: '',
    merchantPhone: extractFirst_(joinedUpper, /TEL(?:EFONO)?\s*:?\s*([0-9\-\+\(\) ]+)/i),
    expenseDate: normalizeDateText_(extractFirst_(text, /(\d{2}[\/-]\d{2}[\/-]\d{4})/)),
    expenseTime: extractFirstTimeLike_(text),
    documentNumber: extractFirst_(joinedUpper, /(FACTURA\s*(?:CONTADO|CREDITO)?\s*NRO\.?\s*:?\s*)([0-9\-]+)/i, 2),
    timbradoNumber: extractFirst_(joinedUpper, /TIMBRADO\s*NRO\.?\s*:?\s*([0-9]+)/i),
    timbradoValidUntil: normalizeDateText_(extractFirst_(joinedUpper, /VALIDEZ\s*:?\s*(\d{2}[\/-]\d{2}[\/-]\d{4})/i)),
    clientName: extractFirst_(joinedUpper, /CLIENTE\s*:?\s*(.+)/i),
    clientRuc: extractFirst_(joinedUpper, /(RUC|RUC\/)\s*:?\s*([0-9\-]+)/i, 2),
    operatorName: extractFirst_(joinedUpper, /OPERADOR\/?A\s*:?\s*(.+)/i),
    currency: 'PYG',
    subtotal: extractAmountByLabels_(joinedUpper, ['SUBTOTAL']),
    discount: extractAmountByLabels_(joinedUpper, ['DESCUENTO', 'DESCUENTOS']),
    total: extractAmountByLabels_(joinedUpper, ['TOTAL A PAGAR', 'TOTAL', 'TOTALES']),
    received: extractAmountByLabels_(joinedUpper, ['RECIBIDO']),
    changeAmount: extractAmountByLabels_(joinedUpper, ['VUELTO']),
    taxExempt: extractAmountByLabels_(joinedUpper, ['EXENTAS', 'EXENTA']),
    tax5Base: extractAmountByLabels_(joinedUpper, ['GRAVADAS 5%', 'GRAVADA 5%']),
    tax10Base: extractAmountByLabels_(joinedUpper, ['GRAVADAS 10%', 'GRAVADA 10%']),
    iva5: extractAmountByLabels_(joinedUpper, ['IVA 5%']),
    iva10: extractAmountByLabels_(joinedUpper, ['IVA 10%']),
    ivaTotal: extractAmountByLabels_(joinedUpper, ['TOTAL IVA', 'IVA TOTAL']),
    items: [],
    rawText: text,
    ocrConfidence: estimateConfidence_(text),
    reviewStatus: 'Pendiente'
  };

  data.merchantAddress = detectAddress_(lines);
  data.items = extractItems_(lines);

  if (!data.clientRuc && data.clientName) {
    const afterClientLine = findLineIndex_(lines, /^cliente/i);
    if (afterClientLine >= 0) {
      for (var index = afterClientLine; index <= Math.min(afterClientLine + 4, lines.length - 1); index++) {
        const match = lines[index].match(/([0-9]{5,}\-[0-9])/);
        if (match) {
          data.clientRuc = match[1];
          break;
        }
      }
    }
  }

  return data;
}

function extractFirst_(text, regex, group) {
  const match = String(text || '').match(regex);
  return match ? String(match[group || 1]).trim() : '';
}

function extractFirstTimeLike_(text) {
  const match = String(text || '').match(/\b(\d{2}:\d{2}(?::\d{2})?)\b/);
  return match ? match[1] : '';
}

function extractAmountByLabels_(text, labels) {
  for (var index = 0; index < (labels || []).length; index++) {
    const label = labels[index];
    const labelPattern = label
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s*');
    const regex = new RegExp(labelPattern + '\\s*(?:=+>|:+|\\s)\\s*([0-9][0-9\\.]*)', 'i');
    const match = String(text || '').match(regex);
    if (match) return numberFromText_(match[1]);
  }
  return null;
}

function normalizeDateText_(value) {
  return String(value || '').trim().replace(/-/g, '/');
}

function detectAddress_(lines) {
  for (var index = 0; index < Math.min((lines || []).length, 8); index++) {
    const line = String(lines[index] || '').toUpperCase();
    if (/(RUTA|AVDA|AVENIDA|CALLE|KM|BARRIO|NRO\.|NRO|ESQ\.|SAN |ASUNCION|PARAGUAY)/.test(line)) {
      return lines[index];
    }
  }
  return '';
}

function findLineIndex_(lines, regex) {
  for (var index = 0; index < (lines || []).length; index++) {
    if (regex.test(lines[index])) return index;
  }
  return -1;
}

function extractItems_(lines) {
  const items = [];
  let inDetail = false;

  for (var index = 0; index < (lines || []).length; index++) {
    const line = lines[index];
    const upper = String(line || '').toUpperCase();

    if (/CANT\.?\s+ARTICULO|CANT\.?\s+ARTICULO|DESCRIPCION|DETALLE/.test(upper)) {
      inDetail = true;
      continue;
    }
    if (inDetail && /(SUBTOTAL|DESCUENTO|DESCUENTOS|TOTAL|TOTALES|RECIBIDO|VUELTO)/.test(upper)) {
      break;
    }
    if (!inDetail) continue;

    const match = line.match(/^\s*(\d+[\.,]?\d*)\s+(.+?)\s+([0-9][0-9\.]*)\s*$/);
    if (match) {
      items.push({
        qty: numberFromText_(match[1]) || 1,
        description: match[2].trim(),
        amount: numberFromText_(match[3]) || 0
      });
    }
  }

  return items;
}

function estimateConfidence_(text) {
  let score = 0;
  const upperText = String(text || '').toUpperCase();
  if (/RUC\s*:?.*[0-9\-]+/.test(upperText)) score += 0.15;
  if (/FACTURA/.test(upperText)) score += 0.15;
  if (/TIMBRADO/.test(upperText)) score += 0.15;
  if (/\d{2}[\/-]\d{2}[\/-]\d{4}/.test(upperText)) score += 0.10;
  if (/TOTAL/.test(upperText)) score += 0.10;
  if (/IVA/.test(upperText)) score += 0.10;
  if (/CLIENTE/.test(upperText)) score += 0.10;
  if (upperText.split('\n').length > 8) score += 0.15;
  return Math.min(1, score);
}
