# Despliegue en Google Apps Script

## 1. Crear proyecto

El proyecto Apps Script ya fue creado y vinculado a la hoja:

- hoja: `1iK8MF2Yeb3H7Jp2SnYcvRiGAvcJdEHyCYIbcytjktig`
- script: `1P0MSIOFZycmbX7T75qLMetUglXEyJ9fsgDCBjHznM5JXvGNOl9pFsIBp`

## 2. Cargar archivos

La forma recomendada ya no es copiar manualmente. Desde la raiz del repo:

- `npx clasp push -f`

## 3. Activar servicio avanzado

En Apps Script:

- abrir `Servicios avanzados de Google`,
- activar `Drive API`.

Ademas, confirme en Google Cloud del proyecto que la API de Drive tambien este habilitada.

## 4. Ejecutar setupApp

Puede ejecutarse una vez desde el editor si quiere inicializar manualmente:

`setupApp()`

La funcion:

- crea el libro de datos si aun no existe,
- verifica o amplia las hojas `USERS`, `EXPENSES` y `LOG`,
- si faltan columnas nuevas, las agrega sin borrar registros,
- si no existe, siembra el usuario administrador inicial,
- guarda el `SPREADSHEET_ID` en las propiedades del script.

Si esa propiedad no existe todavia, el codigo usa por defecto la hoja vinculada en `APP_CONFIG.DEFAULT_SPREADSHEET_ID`.

## 5. Desplegar como aplicacion web

Ya existe una deployment creada con version `1`.

- deployment id: `AKfycbyRJ9h0Qirm5D7g3yP-yt4AaaE8xoiwckHjA3tAsGYRJWJdn-eqqzAIDnNzD_f6uczU`
- URL esperada de ejecucion: `https://script.google.com/macros/s/AKfycbyRJ9h0Qirm5D7g3yP-yt4AaaE8xoiwckHjA3tAsGYRJWJdn-eqqzAIDnNzD_f6uczU/exec`

## 6. Verificar flujo

- ingresar con `admin / 123`,
- cargar una factura de prueba,
- revisar los datos reconocidos,
- guardar la rendicion,
- confirmar el registro en `EXPENSES`,
- volver a abrir el registro y probar una actualizacion,
- confirmar que el archivo exista en la carpeta de Drive.

## 7. Consideraciones operativas

- El archivo original se guarda en `uploads_facturas`.
- Los documentos temporales de OCR se envian a `ocr_tmp` y luego se marcan como papelera.
- La interfaz permite filtros por estado, busqueda y edicion posterior.
