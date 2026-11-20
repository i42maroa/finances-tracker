# Hucha

MVP de finanzas en pareja construido a partir de [CONTEXTO.md](CONTEXTO.md). Angular **22.2.6**, TypeScript, Firebase Authentication y Cloud Firestore. Interfaz en español, adaptada a móvil y escritorio, con colores crema y rosados e inspiración de hucha.

Las [correcciones de la revisión](docs/audit-fixes.md) documentan las optimizaciones, el control de ediciones simultáneas y la publicación validada. Esta entrega mantiene Firebase en el plan gratuito; los cambios de arquitectura de servidor se han descartado.

[Captura de escritorio](docs/screenshots/desktop.png) · [Captura móvil](docs/screenshots/mobile.png)

[Detalle del movimiento](docs/screenshots/detail-desktop.png) · [Detalle en móvil](docs/screenshots/detail-mobile.png) · [Configuración del perfil](docs/screenshots/profile-desktop.png)

## Ejecutar

Requiere **Node 24.15 o posterior compatible** y npm. Las versiones están fijadas en `package.json` y `package-lock.json`.

```sh
npm ci
npm run setup:config
npm start
```

Abre **http://127.0.0.1:4200** y pulsa **Explorar la demostración**. Hay movimientos de ejemplo del mes actual; puedes crear, editar, eliminar, filtrar, personalizar categorías y liquidar deudas. Los cambios de la demostración se conservan en `localStorage`, separados de Firebase. La demo se comparte entre pestañas del mismo navegador, pero no entre dispositivos. No representa cuentas reales. Para reiniciarla, elimina la clave `hucha-demo-v1` del almacenamiento del sitio.

En este entorno se ha preparado un Node compatible dentro de `.runtime/`, porque el Node del sistema es anterior al requerido. Los scripts lo utilizan automáticamente como alternativa; no se ha cambiado la instalación del sistema. En otro equipo, instala Node 24.15+ antes de `npm ci`. `.runtime/` no forma parte del código versionable.

## Funcionalidad

- Cuenta independiente con Google o correo y contraseña; sesión persistente y cierre de sesión.
- Creación de pareja e incorporación con código de un solo uso, válido durante 7 días y renovable. Máximo dos miembros.
- Gastos individuales privados para su titular. Los ingresos individuales son visibles para ambos miembros de la pareja y solo su titular puede editarlos o eliminarlos. Los movimientos comunes son visibles y editables por ambos. El nombre visible Hogar conserva el identificador interno compartido para mantener el historial.
- Hogar muestra Ingresos totales de la pareja: suma de todos los ingresos confirmados de ambos, individuales y comunes, sin duplicarlos ni modificar su titularidad. Gastos comunes conserva únicamente los compartidos. Disponible tras gastos comunes resta esos gastos e indica que todavía faltan los individuales. El criterio se aplica a resúmenes mensual y anual, tabla de meses, listados y gráficos. Individual y el cálculo de deudas conservan su atribución actual.
- Gastos comunes pagados por una persona o a medias; coste siempre al 50/50. Los nuevos ingresos se crean en Individual. Se elimina el botón Compartir en Hogar del detalle. Las ediciones de ingresos de Hogar mantienen ese espacio. No se migra automáticamente el historial.
- Resumen mensual, inicialmente del mes actual según la fecha local, compartido o personal. Al entrar o pulsar Resumen se abre ese mes; el breadcrumb «Resumen / año / mes» permite volver al resumen anual correspondiente, también para meses históricos. En la vista anual, antes del desglose por categorías se muestran los meses no futuros con ingresos o gastos y un selector de año en la esquina superior derecha. Si no hay meses con actividad se indica «No hay movimientos todavía». Ingresos y balances positivos en verde; gastos y balances cero o negativos en rojo. La tarjeta de balance adapta también su fondo y el resto del texto al signo. Cada mes abre un detalle con los indicadores, desglose y todos sus movimientos. Individual incluye tu mitad de los movimientos comunes, con independencia del pagador o del registrador.
- Selección de año, mes y espacio; desglose de gastos por categoría. El desglose alterna gastos e ingresos y gráficos de barras o sectores. En barras y sectores, pulsar una categoría o cuña filtra únicamente la lista inferior.
- En el resumen anual, la opción Líneas muestra las categorías como una lista desplegable. Al abrir una categoría aparecen sus subcategorías y, debajo, el gráfico con su total de enero a diciembre, con cero en meses sin movimientos. Seleccionar una subcategoría cambia el gráfico a su línea; volver a pulsarla recupera el total de la categoría. Solo se abre una categoría a la vez y volver a pulsarla la cierra. Respeta Hogar/Individual y gastos/ingresos y cuenta solo movimientos confirmados. Pulsar un punto abre un popup con la categoría o subcategoría, mes, año e importe exacto; se cierra con la X, Escape o pulsando fuera. Los puntos admiten teclado. Se elimina el desplegable de datos mensuales.
- El gráfico de líneas ajusta su ancho y altura en móviles y tablets para mostrar los doce meses sin deslizar horizontalmente. En pantallas estrechas inclina las etiquetas de los meses y abrevia los importes del eje; los popups mantienen los valores exactos.
- Saldo de deuda en la página de liquidaciones, con todo el historial e independiente de los filtros. Las liquidaciones no forman parte de ingresos ni gastos.
- Cada cuenta gestiona sus movimientos individuales. Ambos miembros pueden gestionar los movimientos de Hogar y las liquidaciones.
- Cada movimiento abre una página de detalle al pulsar su fila o su nombre. Editar y eliminar están en las acciones situadas debajo del menú de navegación, disponibles solo en el detalle. Al eliminarlo, se vuelve a la lista.
- Las tarjetas Ingresos y Gastos filtran el listado y el desglose por ese tipo. Balance muestra ambos tipos y las categorías de gastos. Los totales del período se conservan. La selección se destaca, admite teclado, reinicia la paginación, se combina con los demás filtros y se conserva al volver del detalle; cambiar de tipo limpia la categoría y subcategoría seleccionadas.
- Los movimientos se integran en el resumen: todos los del año seleccionado en la vista anual y todos los del mes en la mensual, con total de movimientos y páginas de 10 registros. Los controles Anterior/Siguiente solo aparecen si hay más de una página. Se elimina la página independiente; su URL anterior redirige al resumen. Una lupa abre el modal para filtrar la lista por nombre, sin distinguir mayúsculas ni tildes. Los filtros de nombre y categoría se combinan sin cambiar los indicadores ni la tabla de meses, y se conservan al volver desde un movimiento.
- Las listas se ordenan por fecha descendente y por creación más reciente dentro del mismo día. En Individual, los movimientos de Hogar muestran tu parte; en Hogar y en el detalle se muestra el importe completo. No hay selector de persona ni casilla para incluir Hogar. La atribución usa céntimos exactos y no modifica el registro original.
- Botón flotante circular con el signo + para añadir movimientos en los resúmenes anual y mensual.
- Configuración reúne Perfil, Nuestra pareja y Categorías como páginas independientes con breadcrumbs. El nombre del usuario abre Configuración / Perfil, donde solo aparecen sus datos y Cerrar sesión. Nuestra pareja contiene los miembros y la vinculación de cuentas. Las URL antiguas /perfil y /pareja redirigen a sus páginas dentro de Configuración.
- Categorías generales con subcategorías opcionales: Hogar (Hipoteca, Alquiler, Luz, Agua, Internet), Supermercado (Alimentación, Limpieza), Ocio (Cena, Cine) y Coche (Gasolina, Mecánico). Se gestionan desde Configuración → Categorías y se seleccionan en los formularios; lista y detalle muestran ambas, y el resumen agrupa por categoría general. Se añaden los valores iniciales que faltan sin sobrescribir categorías existentes ni reclasificar movimientos antiguos.
- Cada categoría abre un detalle con breadcrumb Configuración / Categorías / Nombre. La lista no muestra iconos de acciones. Editar y Eliminar aparecen bajo las opciones del menú, y el botón + del detalle permite crear subcategorías. El editor reúne los datos de la categoría y los nombres de sus subcategorías, que se pueden modificar o eliminar. Los cambios se guardan juntos; Cancelar los descarta. Eliminar conserva las referencias de los movimientos históricos.
- Catálogo común de categorías separado por ingresos y gastos, editable por ambos. Se archivan las categorías para conservar las referencias y los nombres del historial; no se pueden usar en nuevos movimientos. Su tipo se mantiene al editar.
- Modal de movimientos con pestañas Gasto e Ingreso y campos en orden: categoría, nombre, importe y fecha. Los gastos añaden espacio (Hogar o Individual) y pagador; Ambos permite registrar el pago a medias sin un control separado de modalidad ni el texto 50/50. Los ingresos solo piden receptor y se guardan siempre en Individual, sin selector de espacio.
- Descripción opcional de hasta 1000 caracteres para gastos e ingresos, disponible al crear y editar y visible en el detalle. En gastos, Espacio y Quién lo paga están en la misma fila y la descripción debajo. Compatible con registros anteriores sin descripción.
- Modal global, formularios reactivos tipados, estados de carga con skeletons y estados de error y sin datos. Cancelar y X descartan los cambios; Escape y el fondo no cierran el modal.

Los importes se guardan como enteros en céntimos. Si un movimiento compartido tiene un número impar de céntimos, el primer miembro recibe el céntimo adicional en su atribución y, en pagos a medias, abona ese céntimo. La suma de las partes conserva siempre el importe original.

Desde Configuración → Categorías → detalle → Editar se puede elegir una **Subcategoría por defecto**, o Ninguna. Por ejemplo, Coche → Gasolina. Al crear movimientos o recurrencias, seleccionar Coche elige Gasolina y propone ese nombre. La sugerencia cambia al elegir otra subcategoría mientras el nombre siga siendo automático o esté vacío; los nombres escritos manualmente y los movimientos ya guardados se respetan. Al eliminar una subcategoría predeterminada se limpia también la referencia. Esta preferencia se guarda en `Category.defaultSubcategoryId`, es opcional y requiere publicar las reglas de Firestore actualizadas. Las categorías existentes sin este campo conservan su comportamiento hasta configurar una preferencia.

La página Recurrentes permite configurar ingresos y gastos mensuales con fechas de inicio y fin (opcional), uno o varios días de pago/cobro y opciones para editar, pausar y reanudar. Los días que no existen en un mes se ajustan al último día, sin duplicar apariciones en esa fecha.

Los recurrentes se ordenan por día del mes, de menor a mayor, también al filtrar por espacio. Si tienen varios días se utiliza el menor; a igualdad de día, se ordenan por nombre.

Al consultar un mes se calculan sus pendientes, sin realizar cargos ni necesitar tareas programadas. No cuentan en ingresos, gastos, categorías ni deudas hasta confirmar su cobro o pago. Al confirmar se pueden ajustar importe y fecha reales; también se puede omitir una aparición. Los listados y el detalle identifican los recurrentes con ↻, y el modal de filtros permite mostrar solo gastos recurrentes. Los meses anteriores con pendientes aparecen en el resumen anual aunque no tengan movimientos confirmados.

La gestión de apariciones se realiza en **Gastos previstos**, una suboperación del mes en el menú de escritorio y móvil. La página utiliza la ruta `/resumen/:month/previstos` y el breadcrumb Resumen / año / mes / Gastos previstos, y conserva el espacio y los filtros al volver al resumen. Permite consultar gastos e ingresos, buscar, confirmar pagos/cobros u omitir apariciones. Recurrentes aparece antes de Liquidaciones en la navegación principal.

Al confirmar, la aparición permanece en Gastos previstos como Pagado o Cobrado, con fecha prevista y fecha real. Se muestran también inicio, fin opcional, días de pago/cobro de cada mes, importe recurrente, espacio, pagador/receptor y estado de la recurrencia, junto con las acciones para editarla y consultar el movimiento confirmado. La página usa el mes de la fecha prevista, aunque el pago real se registre en otro mes. Los importes por pagar/cobrar y los avisos solo incluyen apariciones sin confirmar. Los omitidos se mantienen ocultos.

Si se adelanta la fecha de inicio, se incorporan los días del intervalo ampliado usando la configuración de esa edición. Por ejemplo, corregir el inicio del 19 al 1 de noviembre de un pago mensual del día 2 añade el previsto del 2 de noviembre. Los ya confirmados u omitidos no se duplican, y las siguientes ediciones o pausas conservan esos previstos históricos.

Al llegar la fecha prevista, la aplicación muestra un aviso con acceso directo al mes que necesita revisión. Los movimientos de meses anteriores siguen avisando; se prioriza el mes más antiguo y el aviso se actualiza al confirmar u omitir. Se comprueba la fecha al entrar, recuperar el foco o la visibilidad y cada minuto. Es un aviso dentro de la aplicación.

Las ediciones, pausas y reanudaciones se aplican desde el día del cambio y conservan las versiones anteriores y los movimientos confirmados. El tipo y el espacio de una recurrencia se mantienen; para cambiarlos se crea otra. La confirmación utiliza un ID estable por recurrencia y fecha prevista y una transacción para evitar duplicados entre cuentas. Eliminar una aparición confirmada la marca como omitida, para que no vuelva a generarse. Los datos antiguos sin recurrencias siguen funcionando.

No se incluyen presupuestos, inversiones, importación bancaria ni repartos personalizados.

## Entornos y configuración local

El repositorio incluye los entornos Angular de producción, desarrollo y pruebas en `src/environments/`. No contienen datos del proyecto Firebase. La configuración se lee en ejecución, sin caché, desde un JSON distinto para cada entorno:

| Entorno | Comando | Configuración Firebase | Emuladores |
| --- | --- | --- | --- |
| Desarrollo | `npm start` / `npm run build:dev` | `public/firebase-config.local.json` | Permitidos si `useEmulators` es `true` |
| Producción | `npm run build` | `public/firebase-config.json` | Rechazados |
| Pruebas | `npm run test:e2e` | `public/firebase-config.test.json` | Permitidos; las pruebas de integración aportan la configuración del proyecto ficticio `demo-hucha` |

Después de clonar, ejecuta `npm run setup:config`. Crea los JSON de producción y desarrollo y `.firebaserc` a partir de las plantillas. **Nunca sobrescribe archivos existentes.** Si ya hay configuración de producción, la usa como valor inicial para desarrollo; después puedes apuntar cada archivo a un proyecto distinto. Con los campos vacíos sigue funcionando la demostración local.

Los archivos locales y `.firebaserc` se excluyen de Git. Se versionan únicamente `config/firebase-config.example.json`, `.firebaserc.example`, los entornos sin credenciales y el JSON vacío de pruebas. Cada compilación incluye solo el JSON correspondiente a su entorno: producción no contiene las configuraciones de desarrollo ni de pruebas.

Las claves públicas de una aplicación web de Firebase serán visibles para el navegador; el acceso a los datos lo protegen Firebase Authentication y las reglas de Firestore. No guardes contraseñas, tokens administrativos ni claves de cuentas de servicio en estos archivos ni en los entornos de Angular.

## Conectar un proyecto Firebase real

1. Crea un proyecto Firebase y registra una aplicación web.
2. En **Authentication → Sign-in method**, activa **Correo electrónico/contraseña** y **Google**, y configura el correo de soporte para Google.
3. Crea una base de datos **Cloud Firestore en modo nativo**. Las reglas de este repositorio sustituyen las reglas iniciales.
4. Ejecuta `npm run setup:config` y completa la configuración de producción en `public/firebase-config.json` y la de desarrollo en `public/firebase-config.local.json`:

   ```json
   {
     "apiKey": "valor de Firebase",
     "authDomain": "tu-proyecto.firebaseapp.com",
     "projectId": "tu-proyecto",
     "appId": "valor de Firebase",
     "useEmulators": false
   }
   ```

5. Incluye `127.0.0.1`, `localhost` y el dominio de producción en **Authentication → Settings → Authorized domains**. El acceso mediante Google requiere permitir la ventana emergente del proveedor.
6. Configura tu proyecto en la copia local de `.firebaserc` con `npx firebase use --add`, o indica su ID al desplegar:

   ```sh
   npx firebase login
   node scripts/run.mjs release --project TU_PROYECTO
   ```

Para usar emuladores en desarrollo, completa el JSON local con `apiKey: "demo-api-key"`, `authDomain: "demo-hucha.firebaseapp.com"`, `projectId: "demo-hucha"`, `appId: "demo-app"` y `useEmulators: true`, y ejecuta `npm run emulators` junto con `npm start` en otra terminal.

`firebase.json` configura la salida de Angular (`dist/hucha/browser`), la navegación SPA y las reglas. No se necesita un servidor propio ni Cloud Functions para el MVP. Subir el código a GitHub no publica la aplicación en Firebase Hosting.

El comando de publicación ejecuta las pruebas y la compilación antes de desplegar. Para validar sin publicar, usa `node scripts/run.mjs release --verify-only`. También están disponibles como `npm run release -- --project TU_PROYECTO` y `npm run release -- --verify-only` si el lanzador de npm transmite los argumentos; la forma directa evita problemas de argumentos con `npm.ps1` en Windows.

## Modelo de datos y acceso

| Ruta | Contenido y acceso |
| --- | --- |
| `users/{uid}` | Perfil y `coupleId`. Solo el propio usuario puede leerlo; el vínculo no puede cambiar a otra pareja. |
| `couples/{id}` | IDs y nombres de los miembros, código de invitación y fecha de creación. Solo miembros pueden leerlo. |
| `invites/{code}` | Pareja de destino, creador, nombre y vencimiento. Solo se consulta un código exacto estando autenticado; no se puede listar el catálogo. |
| `couples/{id}/categories/{id}` | Catálogo común con tipo, nombre, símbolo y estado de archivo. |
| `couples/{id}/movements/{id}` | Tipo, céntimos, fecha local `YYYY-MM-DD`, concepto, categoría, espacio, propietario, pagador/receptor, modalidad de pago y autoría. |
| `couples/{id}/settlements/{id}` | Céntimos, fecha, emisor, receptor, nota y autoría. |
| `couples/{id}/recurringMovements/{id}` | Configuración mensual, días, fechas, estado activo/pausado, revisión e historial de versiones. Consulta de Hogar y de las propias individuales. |

Los movimientos confirmados u omitidos de una recurrencia añaden `recurringId`, `scheduledDate` y `status` (`confirmed` o `skipped`). Los pendientes se calculan a partir de la configuración y su historial; no se guardan como movimientos realizados. Se conservan los IDs previstos aunque cambie la fecha real. Las reglas protegen la privacidad individual, los enlaces entre recurrencias y movimientos, la autoría y la conservación del historial de versiones.

La creación y la vinculación se realizan con transacciones: pareja, perfil e invitación se verifican y escriben juntos. La vinculación consume la invitación. Las reglas verifican el estado final, la caducidad y el máximo de dos miembros, incluyendo incorporaciones simultáneas. Los documentos de invitación utilizan códigos aleatorios de 80 bits. Los perfiles de ambos no se exponen: el documento de pareja contiene los nombres necesarios para la interfaz.

Las colecciones de movimientos, categorías y liquidaciones se observan con `onSnapshot`. La consulta de movimientos recupera los comunes, los individuales del usuario conectado y los ingresos de ambos miembros. Las reglas permiten consultar los ingresos individuales de la pareja y reservan su edición y eliminación al titular; los gastos individuales siguen siendo privados. Ambos pueden gestionar los registros comunes conservando su autoría original. Las recurrencias individuales conservan su privacidad. Se rechazan terceros, importes no enteros o fuera de rango, categorías de tipo incorrecto y personas ajenas a la pareja. Consulta [las reglas](firestore.rules) y la [documentación de condiciones de Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions).

## Organización

```text
src/app/
  models/       Contratos TypeScript
  services/     Autenticación, Firebase, pareja, datos, movimientos,
                categorías, balances, filtros y modal
  pages/        Login, resumen, detalle del movimiento, liquidaciones,
                perfil, categorías y pareja
  shared/       Botón, modal, skeleton, filtros y lista de movimientos
src/styles.css  Colores y estilos globales
tests/          Cálculos y reglas de Firestore
e2e/            Flujos de navegador y sincronización con dos sesiones
```

Cada componente mantiene `.ts`, `.html` y `.css` separados. El componente raíz aloja Angular Router y la única instancia del modal. `ModalService.showModal$` proporciona su visibilidad mediante Observable. Los cálculos están centralizados en `finance.ts` y `BalanceService`.

## Comprobar

```sh
npm test                 # Cálculos, demostración y configuración local
npm run build            # Compilación de producción y plantillas estrictas
npm run test:e2e          # Interfaz, con servidor automático y configuración de pruebas
npm run test:rules        # Firestore: emulador y reglas (requiere Java 21+)
npm run test:integration  # Dos sesiones con Auth + Firestore emulados (Java 21+)
```

En Windows, Playwright utiliza Edge. En Linux/macOS instala su Chromium con `npx playwright install chromium`. Las pruebas de integración utilizan el proyecto ficticio `demo-hucha` y sirven una configuración solo para los navegadores de prueba: no modifican tu archivo de configuración ni usan servicios de producción. Los emuladores se detienen al terminar los comandos correspondientes. Si ya los tienes abiertos mediante `npm run emulators`, usa `npm run test:rules:running` y `node scripts/run.mjs playwright test e2e/firebase.spec.ts` para reutilizarlos.

Las pruebas de navegador inician un servidor independiente en el puerto 4201 y lo detienen al terminar. No reutilizan el servidor de desarrollo del puerto 4200.

La suite cubre cálculos, demostración, configuración local, reglas e interfaz, incluido un flujo con dos cuentas. Incluye usuarios ajenos, incorporación concurrente, códigos caducados, importes inválidos y modificación por el otro miembro; creación de cuentas por correo; vinculación y sincronización entre dos sesiones; formularios, cancelación, búsqueda por nombre, filtros independientes, resumen anual y mensual, filtrado de meses, colores de importes, detalle, perfil y vistas de 390 y 1440 píxeles. El acceso con Google real y el despliegue de producción requieren la configuración del proyecto externo.

Los gastos de demostración usan Hogar / Alquiler, Supermercado / Alimentación, Ocio / Cena y Coche / Gasolina. Los ejemplos originales guardados sin subcategoría se actualizan al entrar, conservando las ediciones del usuario.

En el resumen, pulsar una categoría despliega debajo sus subcategorías con importes del período y filtra la lista por esa categoría. Pulsar una subcategoría concreta la lista; ambos filtros se combinan con el nombre y se conservan al volver del detalle. Los indicadores y la tabla de meses no se modifican. Al quitar el filtro de categoría también se elimina el de subcategoría.

El modal de filtros de movimientos incluye nombre, importe mínimo y máximo (inclusivos, desde cero) y Añadido por (solo en Hogar; al pasar a Individual se elimina ese filtro). El rango utiliza los importes visibles, incluida la parte de Hogar en Individual. La ordenación por fecha o importe, en ambos sentidos, está en un desplegable abierto desde un icono junto a la lupa, fuera del modal. Los filtros y la ordenación se conservan al volver del detalle y no cambian los indicadores del resumen. Los registros creados hoy muestran Nuevo según la fecha local de creación, independientemente de la fecha del movimiento o de su última edición.

En móvil y tablet (hasta 1024 px), la barra inferior muestra Liquidaciones y un acceso al resumen: en la vista mensual aparece Resumen anual y en la anual aparece Resumen para volver al mes actual. En las demás páginas también se muestra Resumen. La cabecera contiene la marca y el botón hamburguesa, que abre un menú a pantalla completa con la estética de la página. El encabezado reproduce la marca y el icono de Hucha; la X ocupa la misma posición que el botón hamburguesa. El navbar de escritorio y el menú hamburguesa incluyen Resumen, Resumen anual, Liquidaciones y Configuración, junto con las acciones de edición, eliminación y cierre de sesión en Perfil. El nombre del usuario, su avatar, el acceso a Mi perfil y el estado de sincronización se sitúan en la parte inferior del menú. La página de fondo conserva su posición, estructura y ancho; el menú se cierra al seleccionar una opción, pulsar X o Escape, navegar o ampliar a escritorio.
