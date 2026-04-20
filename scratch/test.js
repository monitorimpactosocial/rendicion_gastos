const rawText = `C&E KA AVO S. A.
-COMERCIO AL POR MENOR DE OTROS ALIMENTO S N.C.P. -
RUTA 3- KM152 NRO.629 SAN ESTANISLAO Tel:0343-421282
RUC:80073467-0
17/04/2026 16:02:18
Factura Contado Nro: 001-006-0016957
Timbrado Nro.
Validez
: 18525519
: 31/01/2027
Cliente
: PARACEL SA
RUC
Operador/a
80106417-1 CAJA8
Cant. Articulo.
Subtotal
1 Paulita caja masitas 30000
1 Gaseosa coca cola la 7500
1 Dulce de mani dota m
11000
1 Chipa argolla
7000
1 Cocido c/leche
7000
SUBTOTAL :-->
62500
DESCUENTOS :-->
0
TOTALES :-->
62500
RECIBIDO :-->
62500
VUELTO :-->
0
***** DESCRIPCION DE CONCEPTOS ******
EXENTAS:-->
GRAVADAS 5%:-->
GRAVADAS 10%:-->
0
0
62500
***** LIQUIDACION DEL I.V.A.
******
IVA 5%:-->
0
IVA 10%:-->
5681
TOTAL IVA :-->
5681
Original :Cliente
Duplicado: Archivo Tributario
Gracias por su Preferencia`;

function normalizeText_(t) { return t; }
function numberFromText_(t) { return Number(t.replace(/[^\d\.]/g, '')); }

function parseReceiptText_(rawText) {
  const text = rawText || '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const joinedUpper = text.toUpperCase();

  const extractRegex = (str, regex, group = 1) => {
    const m = str.match(regex);
    return m ? m[group].trim() : '';
  };

  const extractAllRegex = (str, regex, group = 1) => {
    const matches = [];
    let m;
    const r = new RegExp(regex.source, regex.flags + (regex.flags.includes('g') ? '' : 'g'));
    while ((m = r.exec(str)) !== null) {
      matches.push(m[group].trim());
    }
    return matches;
  };

  const rucs = extractAllRegex(joinedUpper, /([0-9]{5,}\-[0-9A-Z])/g, 1);
  const merchantRuc = rucs.length > 0 ? rucs[0] : '';
  const clientRuc = rucs.length > 1 ? rucs[rucs.length - 1] : '';

  const docNumber = extractRegex(joinedUpper, /([0-9]{3}\-[0-9]{3}\-[0-9]{7})/);
  
  const timbradoNumber = extractRegex(joinedUpper, /TIMBRADO[\s\S]{0,20}?([0-9]{8})/i);

  const dates = extractAllRegex(joinedUpper, /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/g, 1);
  const expenseDate = dates.length > 0 ? dates[0] : '';
  const timbradoValidUntil = dates.length > 1 ? dates[1] : '';

  const clientNameMatch = joinedUpper.match(/CLIENTE[\s\S]{0,15}?:\s*([A-Z0-9\s\.\&]+)(?=\n|$)/);
  let clientName = clientNameMatch ? clientNameMatch[1].trim().split('\n')[0].trim() : '';

  const extractAmountLoose = (str, keywords) => {
    for (const kw of keywords) {
      const regex = new RegExp(kw + '[\\s\\S]{0,15}?(?:>|:|\\s)\\s*([0-9]{1,3}(?:[.,]?[0-9]{3})*(?:[.,][0-9]{1,2})?)(?=\\s|$|\\n)', 'i');
      const m = str.match(regex);
      if (m && m[1]) {
        return numberFromText_(m[1]);
      }
    }
    return null;
  };

  const total = extractAmountLoose(joinedUpper, ['TOTALES', 'TOTAL A PAGAR', 'TOTAL\\s*:']);
  const subtotal = extractAmountLoose(joinedUpper, ['SUBTOTAL :-->', 'SUBTOTAL\\s*:']);
  const discount = extractAmountLoose(joinedUpper, ['DESCUENTOS', 'DESCUENTO']);
  const ivaTotal = extractAmountLoose(joinedUpper, ['TOTAL IVA', 'IVA TOTAL']);
  const iva10 = extractAmountLoose(joinedUpper, ['IVA 10%']);
  const iva5 = extractAmountLoose(joinedUpper, ['IVA 5%']);
  const tax10Base = extractAmountLoose(joinedUpper, ['GRAVADAS 10%', 'GRAVADA 10%']);

  // Extract items
  const items = [];
  let inDetail = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();
    if (/CANT\.?\s+ARTICULO|DESCRIPCION|DETALLE/.test(upper)) {
      inDetail = true;
      continue;
    }
    if (inDetail && /(SUBTOTAL\s*[:>]|DESCUENTOS?\s*[:>]|TOTALES\s*[:>]|RECIBIDO|VUELTO)/.test(upper)) {
      break;
    }
    if (!inDetail) continue;

    if (upper === 'SUBTOTAL' || upper === 'CANTIDAD' || upper === 'PRECIO') continue;

    // Pattern: "1 Paulita caja masitas 30000" or "1 Paulita caja masitas" followed by "30000" on next line
    const inlineMatch = line.match(/^\s*(\d+)\s+(.+?)\s+([0-9]+)\s*$/);
    if (inlineMatch) {
      items.push({ qty: Number(inlineMatch[1]), description: inlineMatch[2].trim(), amount: Number(inlineMatch[3]) });
    } else {
      const parts = line.match(/^\s*(\d+)\s+(.+)$/);
      if (parts && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (/^[0-9]+$/.test(nextLine)) {
          items.push({ qty: Number(parts[1]), description: parts[2].trim(), amount: Number(nextLine) });
          i++; // skip next line
        }
      }
    }
  }

  console.log({ merchantRuc, clientRuc, docNumber, timbradoNumber, expenseDate, timbradoValidUntil, clientName, total, subtotal, discount, ivaTotal, iva10, iva5, tax10Base, items });
}

parseReceiptText_(rawText);
