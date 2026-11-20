# Correcciones de la revisión de noviembre de 2026

Se mantiene el plan gratuito Spark. No se incorporan Cloud Functions ni se activa la facturación.

| Puntos | Resultado |
| --- | --- |
| 1, 2 | La carga de categorías aprovecha la suscripción existente; solo comprueba las categorías iniciales que faltan. Actualizar el perfil sin cambiar de pareja no reinicia las suscripciones. |
| 6 | Caché persistente de Firestore compartida entre pestañas. Los emuladores mantienen caché en memoria. |
| 7, 8 | Las familias de categorías escriben solo los documentos modificados. Guardar sin cambios evita la escritura y añadir otra versión a una recurrencia. |
| 10 | Se desactiva la indexación de historiales y descripciones que no se consultan. |
| 13 | Los formularios conservan su versión inicial. Las transacciones comprueban esa versión antes de editar o eliminar; una edición antigua no restaura un documento eliminado. |
| 14 | El resumen anual aplica el mismo límite de meses no futuros a indicadores, tabla, gráficos y lista. Los detalles mensuales conservan su período explícito. |
| 15 | Año, espacio, filtros, orden y gráfico se reflejan en la URL para recuperarlos al recargar. |
| 16 | La ficha de un previsto histórico muestra la configuración vigente en su fecha. |
| 17, 18 | Las reglas comprueban días de recurrencia, vigencia de la versión, ajuste a fin de mes y calendario gregoriano, incluidos los años bisiestos. |
| 20 | Cada formulario conserva su identificador y fecha de creación al reintentar un alta. |
| 21 | Repetir la misma confirmación es idempotente; una confirmación con distinto importe, fecha, pagador u otros datos avisa del conflicto. |
| 22 | Un comando valida cálculos, reglas, navegador, integración y compilación antes de publicar reglas, índices y aplicación. Comprueba el proyecto y que el código no cambie durante las pruebas. CI ejecuta la misma validación sin publicar. |
| 26, 27 | Totales mensuales y desgloses se agrupan en una pasada; la búsqueda de atrasados reutiliza identificadores ocupados y versiones de calendario calculadas. |

Los puntos **3, 4, 5 y 9** quedan fuera de esta entrega tras cancelar la propuesta de servidor: carga por períodos, paginación desde servidor, resúmenes precalculados y separación del historial de recurrencias. La aplicación sigue escuchando el historial autorizado y paginando en el navegador. Los historiales de recurrencias continúan dentro de cada plantilla. Esta decisión evita desplegar la arquitectura propuesta con Blaze; no implica que toda alternativa futura necesite un plan de pago.

Los documentos antiguos sin `revision` siguen siendo legibles y compatibles con escrituras antiguas mientras no adopten una revisión. La aplicación nueva convierte cada documento al editarlo. Desde entonces las reglas exigen aumentar su revisión; una pestaña antigua puede necesitar recargarse.

## Validar y publicar

```sh
npm run release -- --verify-only
npm run release -- --project TU_PROYECTO
```

El segundo comando vuelve a validar antes de publicar y exige que el proyecto coincida con `public/firebase-config.json`. Utiliza la sesión de Firebase CLI existente; no requiere una cuenta de servicio en el repositorio. Publica exclusivamente reglas, índices y Hosting. Firebase no ofrece una transacción conjunta para estos recursos: las reglas aceptan los documentos antiguos para permitir su actualización coordinada con la aplicación.
