# Rendicion de Gastos de Viajes

Aplicacion web basada en Google Apps Script para registrar rendiciones de viaje con carga de facturas, OCR, revision manual y persistencia en Google Drive + Google Sheets.

Hoja de trabajo vinculada:

- `https://docs.google.com/spreadsheets/d/1iK8MF2Yeb3H7Jp2SnYcvRiGAvcJdEHyCYIbcytjktig/edit`

Proyecto Apps Script vinculado:

- `https://script.google.com/d/1P0MSIOFZycmbX7T75qLMetUglXEyJ9fsgDCBjHznM5JXvGNOl9pFsIBp/edit`

Acceso web embebido previsto para usuarios:

- `https://monitorimpactosocial.github.io/rendicion_gastos/`

## Lo que hace hoy

- inicio de sesion con usuarios basicos,
- carga de imagen o PDF de comprobante,
- almacenamiento del archivo en Google Drive,
- OCR con Drive API sobre una copia temporal,
- extraccion heuristica de campos frecuentes en facturas paraguayas,
- revision y correccion manual antes de guardar,
- actualizacion posterior de una rendicion ya existente,
- filtros por estado y busqueda rapida,
- administracion basica de usuarios.

## Estructura del proyecto

- `gas`: codigo principal de Apps Script
- `github`: material heredado de una estructura anterior
- `docs`: despliegue y notas
- `plantillas`: referencia de estructura

## Desarrollo local

El repositorio ya quedo preparado en la raiz con:

- `.clasp.json` apuntando al proyecto Apps Script vinculado,
- `.claspignore` para subir solo `gas/`,
- `package.json` con scripts de `clasp`,
- `index.html` como wrapper estatico para GitHub Pages.

Comandos utiles:

- `npx clasp status`
- `npx clasp push -f`
- `npx clasp version "descripcion"`
- `npx clasp deploy --versionNumber N --description "descripcion"`

Para GitHub Pages, la opcion mas simple en este repo es:

- `Settings > Pages > Deploy from a branch`
- rama `main`
- carpeta `/(root)`

## Credenciales iniciales

- usuario: `admin`
- contrasena: `123`

Conviene cambiarlas apenas se despliegue la solucion.

## Despliegue rapido

1. Crear un proyecto standalone en Apps Script.
2. Copiar el contenido de `gas/`.
3. Activar el servicio avanzado `Drive API`.
4. Si quiere forzar la inicializacion desde el editor, ejecutar `setupApp()`. La app tambien puede autoasegurarse al primer login.
5. Desplegar como aplicacion web.

`setupApp()` ahora es seguro para volver a ejecutar: verifica y amplia la estructura sin borrar los datos existentes. Si no hay `SPREADSHEET_ID` en propiedades del script, toma por defecto la hoja vinculada configurada en `APP_CONFIG.DEFAULT_SPREADSHEET_ID`.

## Hojas de datos

La inicializacion deja estas hojas:

- `USERS`
- `EXPENSES`
- `LOG`

## Flujo operativo

1. iniciar sesion,
2. cargar la factura,
3. procesar OCR,
4. revisar fecha, comercio, RUC, numero, total e IVA,
5. guardar la rendicion,
6. filtrar o reabrir el registro cuando haga falta ajustarlo.

## Observaciones tecnicas

- Los archivos originales se guardan en `uploads_facturas`.
- Los temporales de OCR se crean en `ocr_tmp` y luego se envian a papelera.
- La base de rendiciones soporta creacion y edicion desde la interfaz.
- La extraccion automatica ayuda, pero no reemplaza la verificacion humana.
- La pagina de GitHub Pages embebe la web app de Apps Script mediante `iframe`.
