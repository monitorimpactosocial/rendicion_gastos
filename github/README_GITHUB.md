# Nota sobre esta carpeta

Esta carpeta quedo como material heredado de una estructura previa.

La configuracion activa para trabajar con `clasp` ahora vive en la raiz del proyecto:

- `.clasp.json`
- `.claspignore`
- `package.json`

Flujo actual recomendado:

1. trabajar desde la raiz del proyecto,
2. ejecutar `npx clasp status`,
3. ejecutar `npx clasp push -f` para subir cambios,
4. crear version con `npx clasp version "descripcion"`,
5. desplegar con `npx clasp deploy --versionNumber N --description "descripcion"`.
