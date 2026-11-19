# Contexto de la aplicación de finanzas en pareja

Estado: MVP implementado en este repositorio con Angular 22.2.6, Firebase Authentication y Cloud Firestore. Incluye demostración local y pruebas de cálculos, reglas y navegación. La configuración y el despliegue de un proyecto Firebase real quedan pendientes de aportar los datos del proyecto. El modelo de datos, la instalación y la verificación se describen en [README.md](README.md).

Las decisiones vigentes están en las secciones funcionales. El registro final conserva la evolución de la conversación; los acuerdos más recientes sustituyen a los anteriores cuando existe un cambio.

## Propósito

Crear una aplicación para que una pareja pueda registrar y consultar sus movimientos económicos individuales y comunes en un mismo lugar. Tricount es una referencia aportada por el usuario para la gestión de gastos compartidos; el alcance concreto se acordará durante la definición.

El alcance definido en este documento se ha implementado como primera versión. Las ampliaciones se mantienen fuera del MVP.

## Necesidades confirmadas

- La aplicación estará pensada inicialmente para dos personas: el usuario y su pareja.
- Ambas personas podrán registrar sus propios movimientos.
- La primera versión será una aplicación web adaptada al móvil y accesible también desde el ordenador.
- Cada persona tendrá su propia cuenta, con acceso mediante Google o correo y contraseña. Los movimientos del espacio común se actualizarán automáticamente para la otra persona mientras utiliza la aplicación.
- Una persona creará la pareja y compartirá un código que la otra introducirá para vincular su cuenta.
- Habrá gastos individuales y gastos comunes.
- Se registrarán ingresos, como nóminas o dinero obtenido por trabajos de impresión 3D, y gastos, como compras o alquiler.
- Tanto los ingresos como los gastos tendrán una categoría personalizable por movimiento para facilitar su seguimiento y recuento. Es suficiente para la primera versión; no se necesitan varias etiquetas por movimiento en el MVP.
- Las categorías formarán un catálogo común modificable por ambos, con categorías de ingresos separadas de las de gastos.
- Habrá dos espacios: individual y compartido. Los movimientos individuales estarán asociados a la persona correspondiente; no se modelan como tres espacios separados.
- Todos los espacios y sus movimientos serán visibles para ambos miembros de la pareja durante el MVP. «Públicos» significa visibles entre ambos; no se ha solicitado acceso público en Internet.
- La privacidad y la ocultación de movimientos quedan fuera del MVP.
- Los ingresos individuales, como una nómina, se registrarán en el espacio de la persona correspondiente y no afectarán al espacio compartido ni al balance de deudas.
- También se podrán registrar ingresos en el espacio compartido. Se repartirán al 50/50 y compensarán las deudas según quién reciba el dinero.
- Se podrá consultar el balance individual de cada persona, tanto sin incluir lo compartido como incluyéndole su mitad de los ingresos y gastos comunes.
- La mitad que corresponde a cada persona incluirá todos los movimientos compartidos, independientemente de quién los registre, pague o cobre.
- Ambos podrán añadir, editar y eliminar movimientos y liquidaciones, independientemente de quién los haya registrado.
- Los movimientos incluirán importe en euros, fecha, concepto, categoría y espacio. En los gastos se indicará a quién corresponden y quién paga; en los ingresos, quién los recibe.
- Los gastos comunes podrán ser pagados íntegramente por una persona o a medias entre ambas (50/50).
- Habrá un balance de deudas entre ambas personas, calculado a partir de los gastos e ingresos compartidos, quién los paga o cobra y las liquidaciones registradas.
- En el MVP, el coste de los gastos compartidos se repartirá siempre al 50/50, independientemente de quién pague.
- El MVP permitirá registrar liquidaciones entre ambos para reducir o saldar la deuda. No se contarán como nuevos gastos o ingresos.
- Cada liquidación guardará importe, fecha, quién envía, quién recibe y una nota opcional.
- Habrá un resumen mensual de ingresos, gastos y diferencia entre ambos, con desglose por categoría y filtros por fecha, persona y categoría.
- El balance de deudas mostrará todo lo pendiente, independientemente del mes seleccionado en el resumen.
- Un gasto cuyo coste no se comparte se registrará como individual. No se necesita un modo especial de «invitar» dentro de los gastos compartidos.
- El desarrollo será escalonado: primero un MVP con la funcionalidad principal y después ampliaciones progresivas.
- Las decisiones se acordarán mediante preguntas y quedarán recogidas en este documento.

## Alcance del MVP acordado

1. Registrar ingresos y gastos de cada persona.
2. Organizar los movimientos en dos espacios visibles para ambos: individual y compartido. Cada movimiento individual se asociará a una persona.
3. Categorizar ingresos y gastos mediante un catálogo común editable por ambos, separado por tipo de movimiento.
4. Consultar los movimientos y un resumen mensual de ingresos, gastos y diferencia, con desglose por categoría y filtros por fecha, persona y categoría.
5. Calcular el balance de deudas a partir de ingresos y gastos compartidos repartidos al 50/50, teniendo en cuenta quién cobra o paga.
6. Consultar el balance individual de cada persona sin lo compartido o incluyendo su mitad de todos los ingresos y gastos compartidos.
7. Registrar liquidaciones con importe, fecha, emisor, receptor y nota opcional para reducir o saldar la deuda, sin duplicar ingresos ni gastos.
8. Acceder mediante cuentas separadas, con Google o correo y contraseña, a una web adaptada al móvil, con actualización automática de los movimientos comunes.
9. Permitir a ambos crear, editar y eliminar movimientos y liquidaciones.
10. Vincular las cuentas mediante un código compartido por quien crea la pareja.

Estas funciones constituyen el alcance funcional acordado para la primera versión. Las ampliaciones de la hoja de ruta no se implementarán como parte del MVP. Los detalles técnicos implementados se describen en README.md.

## Plataforma y tecnologías acordadas

- Plataforma inicial: aplicación web adaptada a móvil y ordenador.
- Interfaz: última versión estable de Angular disponible al iniciar la implementación. Referencia comprobada el 17 de noviembre de 2026: Angular 22.2.6, publicado con la etiqueta `latest` de [`@angular/core`](https://registry.npmjs.org/@angular/core/latest). Volver a comprobar la versión al crear el proyecto y fijar las dependencias compatibles para mantener una instalación reproducible.
- Persistencia: Cloud Firestore de Firebase, con una base de datos no relacional de documentos y colecciones.
- Acceso: una cuenta independiente para cada persona, con inicio de sesión mediante Google y mediante correo y contraseña.
- Sincronización: actualización automática de los movimientos comunes entre ambas cuentas.

El modelo de datos de Cloud Firestore está implementado y las dependencias compatibles están fijadas en package-lock.json. El alojamiento está preparado para Firebase Hosting; falta configurar y desplegar un proyecto real.

## Convenciones técnicas acordadas

### Componentes y archivos

- Usar Angular y TypeScript.
- Cada componente tendrá tres archivos independientes: plantilla `.html`, estilos `.css` y componente `.ts`.
- Referenciar los archivos externos desde el componente; mantener la plantilla y los estilos en sus respectivos archivos.
- Usar CSS para los estilos.
- Utilizar Angular Router para la navegación. El componente raíz alojará la salida del router y el modal global.

### Organización de carpetas

- `src/app/shared/`: componentes reutilizables, incluidos botones, modal base, skeletons y otros elementos comunes. Cada componente tendrá su propia subcarpeta con sus archivos `.html`, `.css` y `.ts`.
- `src/app/pages/`: páginas de la aplicación asociadas a la navegación del router, organizadas en subcarpetas por página.
- El modal base se implementará dentro de `shared`, con una única instancia montada en el componente raíz de la aplicación.
- Mantener los servicios y las interfaces en archivos independientes de las páginas y de los componentes visuales.

### Servicios y separación de responsabilidades

- La funcionalidad de negocio, el acceso a Firebase y la gestión del estado compartido se implementarán en servicios independientes de los componentes.
- Organizar los servicios por responsabilidad, por ejemplo autenticación, pareja, movimientos, categorías, balances y modal.
- Los componentes se encargarán de presentar los datos, gestionar la interacción y conectar los formularios con los servicios.
- Los cálculos de balances y deudas se centralizarán en servicios para que las distintas vistas usen las mismas reglas.

### Formularios y contratos de datos

- Todos los formularios serán reactivos y tipados, utilizando las APIs de Reactive Forms de Angular.
- Definir interfaces TypeScript para los modelos y contratos: usuarios, pareja, movimientos, categorías, liquidaciones, balances y configuración o datos del modal.
- Tipar los datos que reciben y devuelven los servicios, incluidos los valores emitidos por sus Observables.
- Concretar los campos de las interfaces cuando se diseñe el modelo de datos, respetando las reglas funcionales acordadas.
- Las interfaces describen los contratos de TypeScript; la validación de formularios y las reglas de acceso y validación de Firebase se definirán también en la implementación.

### Modal base global

- Crear un componente modal base reutilizable que proporcione el contenedor visual y aloje contenido variable.
- Montar una única instancia en el componente raíz de la aplicación, junto a la salida del router, para poder abrirla desde cualquier vista.
- El modal podrá mostrar distintos contenidos, por ejemplo el formulario para registrar un gasto u otros formularios de alta.
- Un servicio de modal centralizará su apertura y cierre y expondrá un Observable del estado de visibilidad.
- El flag booleano `showModal` procederá de ese Observable; por convención, el flujo podrá llamarse `showModal$: Observable<boolean>`.
- El componente raíz consumirá el flujo para mostrar u ocultar el modal. Las funcionalidades solicitarán su apertura mediante el servicio.
- El contenido y los datos necesarios tendrán contratos tipados. El mecanismo concreto de composición del contenido se definirá durante el diseño técnico.
- El cierre manual se realizará únicamente mediante el botón Cancelar o el botón X.
- Pulsar fuera del modal o sobre su fondo no lo cerrará. La tecla Escape tampoco lo cerrará, para respetar el cierre manual exclusivo con Cancelar o X.
- Cancelar y X cerrarán el modal y descartarán directamente los cambios sin guardar, sin pedir confirmación.
- Al cancelar una edición, se conservará el movimiento previamente guardado; los cambios del formulario cancelado no se persistirán.

### Estados de carga

- Cuando una operación asíncrona esté cargando, mostrar un esqueleto de carga —skeleton— en la interfaz afectada, incluyendo las vistas y el contenido del modal cuando corresponda.
- Crear componentes de skeleton reutilizables y adaptarlos a la estructura del contenido que sustituyen.
- Diferenciar el estado de carga de los estados sin datos y de error.
- Los skeletons seguirán los colores centralizados de la aplicación.
- La presentación concreta de cargas de página completa, cargas parciales y guardados se concretará al diseñar las vistas, manteniendo visible su estado de carga.

### Colores y dirección visual

- Guardar los colores de la aplicación en el archivo CSS global raíz, previsto como `src/styles.css`.
- Declararlos como propiedades personalizadas CSS en `:root`, por ejemplo `--color-primary`, `--color-background`, `--color-surface` y `--color-text`.
- Los CSS de los componentes consumirán estos colores con `var(--color-...)`, sin repetir valores de color literales. Centralizar también los colores de estados, bordes, sombras, modal y skeletons.
- La dirección artística estará inspirada en un cerdito de hucha o monedero.
- El MVP utiliza tonos rosados, fondos crema, formas redondeadas y una ilustración de hucha construida con CSS. La paleta está centralizada en `src/styles.css` y se puede ajustar posteriormente.
- Construir la interfaz con diseños y componentes propios, utilizando CSS y los componentes reutilizables de `shared`.

## Diseño técnico implementado

- Implementados el modelo de datos de Cloud Firestore, el SDK modular de Firebase, las reglas de acceso para parejas de dos miembros y la configuración de Firebase Hosting, respetando las carpetas `shared` y `pages` acordadas. Véase README.md y firestore.rules.

No quedan preguntas funcionales pendientes para definir el MVP ni dudas sobre las convenciones técnicas solicitadas. El diseño técnico está implementado y probado con emuladores. Falta configurar un proyecto Firebase real y realizar el despliegue con los pasos documentados en README.md.

## Modelo funcional en definición

### Vinculación de cuentas

Una persona creará la pareja y obtendrá un código para compartirlo con la otra. La segunda persona iniciará sesión con su propia cuenta e introducirá el código para unirse. El MVP está pensado para una pareja de dos miembros.

### Espacios y visibilidad

Los espacios organizan a quién corresponde un movimiento, sin ocultarlo a la otra persona en el MVP. Un gasto individual no genera deuda por el hecho de que ambos puedan verlo. Un gasto compartido participa en el balance según quién paga y cuánto le corresponde a cada persona.

Para el MVP se acuerdan dos espacios:

| Espacio | Visibilidad | Movimientos |
| --- | --- | --- |
| Individual | Ambos | Ingresos y gastos individuales, asociados a la persona correspondiente |
| Compartido | Ambos | Ingresos y gastos comunes |

Los espacios personalizables y los espacios privados no forman parte del MVP. Esta organización sustituye a las propuestas anteriores de tres espacios. No se añade una vista que sume los gastos individuales de ambos y los comunes como si fuera otro espacio.

### Ingresos

- Una nómina u otro ingreso individual se guarda en el espacio de quien lo recibe. No modifica los movimientos compartidos ni las deudas entre ambos.
- Se admiten ingresos en el espacio compartido.
- Los ingresos compartidos corresponden al 50 % a cada persona.
- Si una persona recibe íntegramente un ingreso común de 100 €, a cada una le corresponden 50 € y quien lo recibe debe 50 € a la otra, compensándose con las demás deudas.
- En el balance individual que incluye lo compartido, a cada persona se le atribuye su mitad del ingreso, independientemente de quién lo haya registrado o cobrado.

### Registro y permisos

Datos acordados para ingresos y gastos:

- Importe en euros.
- Fecha.
- Concepto.
- Una categoría personalizable.
- Espacio al que pertenece.
- En gastos: a quién corresponde el coste y quién lo paga, incluyendo el pago a medias cuando proceda.
- En ingresos: quién recibe el dinero.

Ambos podrán crear, editar y eliminar movimientos y liquidaciones de ambos espacios. Los resúmenes y el saldo de deudas reflejarán las modificaciones y eliminaciones de los registros que intervienen en su cálculo.

### Categorías

- Cada ingreso o gasto tendrá una categoría.
- El catálogo será común a ambos y ambos podrán modificarlo.
- Las categorías de ingresos y las de gastos estarán separadas.
- Las etiquetas adicionales por movimiento quedan fuera del MVP.

### Balance de deudas

El balance de deudas es una función principal del producto. Debe compensar los gastos e ingresos compartidos y las liquidaciones para mostrar el saldo pendiente entre ambas. Es distinto de la diferencia mensual entre ingresos y gastos.

El coste se reparte siempre al 50/50 en el MVP. Ejemplo confirmado:

- Una persona paga una cena compartida de 60 €: la otra le debe 30 €.
- Después, la otra paga una compra compartida de 40 €: el saldo neto queda en 10 € a favor de quien pagó la cena.
- Si ambas pagan la mitad de un gasto compartido y les corresponde la mitad del coste, ese gasto no cambia el saldo.

Los ingresos compartidos compensan este saldo en sentido inverso a los gastos: quien cobra más de su mitad debe la diferencia a la otra persona.

### Liquidaciones

El MVP permitirá registrar pagos entre ambas personas para reducir o saldar el balance pendiente. Se distinguirán de los ingresos y gastos para evitar duplicar los recuentos.

Siguiendo el ejemplo anterior, si quien debe 10 € registra un pago de 10 € a la otra persona, el saldo pendiente queda en cero. Las liquidaciones parciales reducen la deuda por el importe pagado.

Datos acordados para una liquidación:

- Importe en euros.
- Fecha.
- Persona que envía el dinero.
- Persona que lo recibe.
- Nota opcional.

Ambos podrán registrar, modificar o eliminar liquidaciones. La función acordada consiste en registrar un pago realizado; no se ha solicitado ejecutar transferencias desde la aplicación.

### Resúmenes y filtros

- Vista mensual con ingresos, gastos y diferencia entre ambos.
- Desglose por categoría.
- Filtros por fecha, persona y categoría.
- Balance de deudas acumulado, independiente del mes seleccionado: cambiar de mes no oculta ni reinicia las deudas pendientes.

Se acuerdan dos modalidades para el balance de cada persona:

- Solo individual: ingresos y gastos individuales asociados a esa persona.
- Individual con compartido: los anteriores más el 50 % de todos los ingresos y gastos del espacio compartido.

En ambos casos, la diferencia mensual se calcula como ingresos menos gastos. La parte compartida se atribuye por lo que corresponde a cada persona, independientemente de quién registre el movimiento y de quién pague o cobre.

Ejemplo: si la pareja paga y registra una cena común de 60 €, se cuentan 30 € de gasto para cada persona en su balance con compartido. Si la registra o paga el usuario, el reparto es idéntico; lo que cambia según el pagador es la deuda, no el coste atribuido.

Los movimientos compartidos se registran una sola vez. Incorporar su mitad al balance personal no crea otro movimiento ni duplica el importe original. Las liquidaciones tampoco se suman a los ingresos ni a los gastos.

## Navegación y vistas actualizadas (18 de noviembre de 2026)

Estas decisiones sustituyen las anteriores cuando hay diferencias.

- Preparación del repositorio GitHub: el código usa entornos Angular de desarrollo, producción y pruebas, con un JSON de Firebase distinto para cada uno. Las configuraciones locales reales, `.firebaserc`, claves, archivos `.env`, dependencias, cachés, logs, exportaciones y resultados de pruebas se excluyen de Git. Se conservan plantillas sin datos reales y un script `npm run setup:config` que crea las configuraciones que faltan sin sobrescribir las existentes. La compilación de producción excluye los JSON de desarrollo y pruebas y rechaza conexiones a emuladores. La publicación del código en GitHub se realiza separadamente del alojamiento en Firebase Hosting.

- En los resúmenes mensual y anual, las tarjetas Ingresos y Gastos filtran el listado por ese tipo y muestran su desglose por categorías. Balance del período muestra ambos tipos y vuelve al desglose de gastos. Los importes de las tarjetas y la tabla anual de meses conservan los totales del período. La tarjeta activa se destaca y funciona también con teclado. Cambiar de tipo elimina la categoría y subcategoría seleccionadas, conserva los demás filtros y reinicia la paginación. Se puede quitar el filtro de tipo desde su etiqueta y se conserva al volver del detalle de un movimiento, también tras recargarlo. El selector de categorías sigue permitiendo alternar ingresos y gastos; si hay un tipo seleccionado, se mantiene coordinado con esa selección.

- En móvil y tablet (hasta 1024 px), la barra inferior conserva dos accesos: un resumen y Liquidaciones. En el resumen mensual muestra Resumen anual para abrir el año correspondiente; en el anual y el resto de páginas muestra Resumen para abrir el mes actual. La cabecera muestra la marca y el botón hamburguesa, que abre un menú a pantalla completa con los colores y tipografía de la página. El encabezado del menú reproduce la marca Hucha con su icono de cerdito y las mismas medidas de la cabecera; el centro de la X coincide con el del botón hamburguesa. El navbar de escritorio y el menú hamburguesa incluyen Resumen, Resumen anual, Liquidaciones y Configuración, junto con las acciones de edición y eliminación según la página; Cerrar sesión sigue apareciendo solo en Perfil. El bloque del usuario, con su nombre, avatar y acceso a Mi perfil, se sitúa en la parte inferior, junto al estado de sincronización. La página de fondo permanece bloqueada, sin cambiar la estructura, el ancho ni la posición de desplazamiento al abrir o cerrar. Se puede cerrar con X o Escape y se cierra al elegir una opción, navegar o pasar a escritorio.

- Configuración reúne tres páginas independientes: Perfil (/configuracion/perfil), Nuestra pareja (/configuracion/pareja) y Categorías. El perfil muestra los datos personales y es el único lugar con Cerrar sesión. La página de pareja contiene los miembros y la vinculación; esta información ya no aparece en el perfil. Cada página tiene breadcrumb desde Configuración. El nombre del usuario sigue abriendo su perfil, y las URL antiguas redirigen a las nuevas.

- En Individual se oculta y elimina el filtro Añadido por; solo se ofrece en Hogar. La ordenación sale del modal: un icono junto a la lupa abre un desplegable hacia abajo para elegir fecha o importe, en ambos sentidos. Se aplica al seleccionar y el menú se cierra; también se cierra con Escape o al pulsar fuera.

- El modal de filtros de movimientos permite buscar por nombre, rango de importes visibles (mínimo y máximo inclusivos, desde cero) y persona que lo añadió. Incluye ordenación por fecha e importe, ascendente o descendente. Se conserva todo al volver desde el detalle; solo afecta al listado y reinicia su paginación.
- Los movimientos cuya fecha de creación corresponde a hoy en la zona local muestran una etiqueta Nuevo. La fecha del movimiento y las ediciones no afectan a esta etiqueta.

- En el resumen anual y mensual, pulsar una categoría despliega sus subcategorías debajo con los importes del período. Se mantiene el filtro por categoría de la lista y pulsar una subcategoría lo concreta, sin cambiar indicadores ni meses. Se combina con el filtro por nombre y se conserva al volver desde el detalle. Pulsar la categoría otra vez la cierra y quita ambos filtros. También se pueden quitar desde las etiquetas del listado.

- El navbar incorpora Configuración y, dentro de esa sección, Categorías. El perfil conserva la información personal y de pareja. Las antiguas URL de categorías redirigen a /configuracion/categorias.
- La lista de categorías no tiene iconos de acciones; cada fila abre su detalle. Breadcrumb: Configuración / Categorías / Nombre. Editar y Eliminar se sitúan bajo las opciones del menú. Desde el detalle se añaden subcategorías con +. El editor permite cambiar los datos de la categoría y renombrar o eliminar sus subcategorías, guardando todos los cambios juntos. Las eliminaciones conservan el historial de movimientos.

- La tarjeta Balance del período usa fondo y textos verdes si es positivo y rojos si es cero o negativo.
- Se elimina el botón Compartir en Hogar del detalle.
- Se añaden categorías generales y subcategorías opcionales. Hogar: Hipoteca, Alquiler, Luz, Agua, Internet. Supermercado: Alimentación, Limpieza. Ocio: Cena, Cine. Coche: Gasolina, Mecánico. Se pueden crear, editar y archivar desde el perfil. Los movimientos conservan su categoría general y pueden incorporar una subcategoría; los antiguos siguen siendo válidos. El resumen agrupa por categoría general y la lista y detalle muestran ambas.

- Los movimientos individuales solo se pueden consultar, editar y eliminar desde la cuenta de su titular. Los movimientos de Hogar siguen siendo accesibles para ambos. Las consultas y reglas de Firestore aplican esta privacidad.
- El resumen no permite seleccionar otra persona ni alternar la inclusión de Hogar. Individual muestra los movimientos propios y la parte correspondiente de Hogar.
- El balance de cada mes aparece en verde cuando es positivo y en rojo cuando es cero o negativo.

- Los movimientos admiten una descripción opcional de hasta 1000 caracteres, editable y visible en el detalle. En el modal de gasto, Espacio y Quién lo paga comparten fila y la descripción aparece debajo. Los ingresos también admiten descripción. Los movimientos antiguos sin este campo siguen siendo válidos.

- Los movimientos se ordenan por fecha descendente y, en la misma fecha, por creación más reciente. En Individual, los movimientos de Hogar muestran únicamente la parte atribuida a la persona seleccionada, con el mismo redondeo en céntimos que los balances; en Hogar y en el detalle se conserva el importe completo. Se eliminan los textos de Hogar/reparto del resumen, la fórmula bajo Balance y el botón Limpiar nombre del modal de filtros.

- El detalle del movimiento muestra las acciones «Editar» y «Eliminar», sin subtítulo de fecha/espacio bajo el nombre ni campo de concepto duplicado. El importe del gasto se muestra en rojo y se elimina la explicación del reparto por persona. En los listados, los gastos con signo negativo también son rojos y el total de movimientos aparece al pie. En categorías, el encabezado conserva solo Ver ingresos/Ver gastos; Barras/Sectores se elige mediante un selector separado al final del bloque.

- El espacio compartido pasa a llamarse «Hogar» en la interfaz, conservando el identificador interno para respetar el historial existente. En el modal se elimina «50/50» y el control separado «Cómo se paga»; en gastos se elige directamente quién paga, incluida la opción «Ambos» para Hogar. Los ingresos se guardan siempre en Individual y no muestran selector de espacio. Esta regla también se valida en los servicios y en Firestore; no se migra automáticamente el historial anterior.

- El modal de alta y edición de movimientos usa pestañas Gasto e Ingreso. En ambas, los campos siguen el orden categoría, nombre, importe, fecha y espacio; después se indica quién paga o recibe, conservando la persona a la que corresponde un gasto individual y el pago compartido a medias cuando proceda. Se elimina el texto explicativo sobre el reparto debajo del formulario.

- El resumen muestra un breadcrumb «Resumen / año» y el detalle mensual «Resumen / año / mes». Los enlaces de Resumen y del año permiten volver al resumen anual correspondiente, incluso desde un enlace mensual abierto directamente.
- Liquidaciones también muestra breadcrumb. El detalle de un movimiento conserva el origen «Resumen / año / [mes /] concepto». Los enlaces del breadcrumb mantienen el año, mes y filtros de la lista de origen, incluso tras recargar la página. Se eliminan los enlaces independientes de volver al resumen o a movimientos.
- La deuda acumulada se muestra únicamente en liquidaciones. En el resumen anual, la lista de meses aparece antes de los gastos por categoría. El desglose completo de categorías ocupa el ancho disponible en los resúmenes anual y mensual.
- Se elimina el desplegable superior de filtro por categoría. En los resúmenes anual y mensual, pulsar una categoría del desglose filtra únicamente la lista inferior de gastos; no cambia los totales, la deuda ni la tabla de meses.
- El resumen anual permite consultar todos los movimientos del año seleccionado y el mensual todos los del mes. La lista muestra el total de movimientos y páginas de 10 registros; los controles de paginación solo aparecen si hay más de una página. Con filtros, se muestran los resultados y el total del período. Los filtros y el cambio de período reinician la paginación. Se elimina la página independiente de movimientos y su opción del menú. La URL antigua redirige al resumen.
- El desglose por categorías no lleva la etiqueta «Por categoría». Incluye controles para alternar gastos e ingresos y para cambiar entre barras y gráfico de sectores. Las categorías y las cuñas filtran la lista inferior, también con teclado.
- La lupa de la esquina superior derecha de la lista abre el modal global con un filtro por nombre. Se combina con el filtro por categoría; ambos se pueden quitar. Cancelar y X descartan los cambios del formulario.

- Al entrar en la aplicación o pulsar Resumen, se abre directamente el mes actual según la fecha local. Se conserva el breadcrumb «Resumen / año / mes» y el enlace del año abre su resumen anual, también desde meses históricos. Las URL anuales con año explícito siguen disponibles. En el resumen anual, antes del desglose por categorías aparece una tabla con los meses no futuros que tengan ingresos o gastos. El selector de año se sitúa en la esquina superior derecha de esta tabla. Si no hay meses que mostrar, se indica «No hay movimientos todavía». Los ingresos se muestran en verde y los gastos y balances negativos en rojo. Cada mes abre un detalle con los mismos indicadores, desglose por categoría y sus movimientos paginados. El saldo de deuda en liquidaciones mantiene todo el historial, independientemente del año o mes consultado.

- Usar textos directos y funcionales en la interfaz. Se eliminan eslóganes, frases sentimentales y mensajes decorativos de navegación, acceso, páginas, modales y pies de página.

- Pulsar un movimiento del resumen abre su página de detalle con sus datos y el reparto correspondiente.
- Las listas muestran quién añadió cada registro, también en móvil, utilizando su autor original.
- Editar y eliminar movimientos dejan de aparecer en las listas. Se muestran debajo de las opciones de navegación únicamente al abrir un detalle.
- Nuestra pareja deja de ser una opción del menú principal. La información y la vinculación se muestran dentro de la configuración del perfil, accesible desde el nombre del usuario.
- Categorías también se accede desde la configuración del perfil, conservando su página y sus funciones.
- Dentro del perfil y sus páginas, debajo de la navegación principal, se muestran las operaciones Categorías, Ver nuestra pareja y Cerrar sesión. Ver nuestra pareja lleva a la sección correspondiente del perfil.
- Un botón flotante redondo con + en la esquina inferior derecha permite añadir movimientos en los resúmenes anual y mensual.

## Fuera del MVP

- Espacios o movimientos privados.
- Devoluciones de compras y reembolsos vinculados a un gasto original.
- Movimientos recurrentes, presupuestos, inversiones e importación bancaria: se abordarán después.
- Repartos distintos del 50/50, espacios personalizables y etiquetas adicionales por movimiento.

Excluir devoluciones no impide registrar ingresos comunes ordinarios, que sí están incluidos en el MVP.

## Desarrollo por etapas

El orden refleja las prioridades indicadas por el usuario. Las funciones de cada ampliación se definirán antes de implementarlas, sin añadirlas al MVP.

| Etapa | Objetivo | Estado |
| --- | --- | --- |
| 0. Definición | Acordar el producto y el alcance del MVP en este documento | Completada |
| 1. MVP | Registro manual de ingresos, gastos y liquidaciones, balances, categorías, cuentas y sincronización | Implementado y probado localmente; pendiente de configurar y desplegar Firebase real |
| 2. Movimientos recurrentes | Facilitar el registro repetido de ingresos y gastos, como nómina, alquiler o suscripciones | Primera ampliación priorizada; reglas pendientes |
| 3. Presupuestos | Crear presupuestos y consultar su seguimiento | Segunda ampliación priorizada; alcance pendiente |
| 4. Inversiones | Registrar las aportaciones realizadas y conservar su historial | Tercera ampliación priorizada; datos y reglas por concretar |

La privacidad configurable y la exportación de datos quedan como ideas sin prioridad ni etapa comprometida. Las devoluciones se excluyen de la versión actual y no tienen una etapa posterior asignada. La lectura bancaria queda aparcada por decisión del usuario, sin etapa asignada ni investigación pendiente para el trabajo actual.

### Inversiones: registro de aportaciones

El objetivo confirmado es registrar las aportaciones realizadas a inversiones para conservar un historial. Esta funcionalidad pertenece a una ampliación posterior al MVP.

No se han acordado funciones de cotización, valoración de cartera, cálculo de rentabilidad ni sincronización con plataformas de inversión.

Cuando se prepare esta etapa se concretarán los datos de cada aportación, su atribución individual o compartida y su tratamiento en los balances, evitando confundir una aportación con un gasto de consumo o duplicar movimientos.

### Lectura bancaria: aparcada

Se planteó como una posible ampliación, pero el usuario ha decidido dejarla por ahora. No se investigarán entidades, proveedores ni modalidades de importación en esta fase. Podrá retomarse si el usuario lo solicita.

## Decisiones para siguientes etapas

- Puesta en producción del MVP: aportar la configuración del proyecto Firebase, activar los proveedores de autenticación y desplegar las reglas y la aplicación en Firebase Hosting.
- Movimientos recurrentes: frecuencias, fechas, cambios de importe y generación automática o con confirmación.
- Presupuestos: período, categorías, alcance individual o compartido y forma de mostrar el consumo.
- Inversiones: datos de las aportaciones, atribución individual o común y tratamiento en los balances.

Estos puntos se resolverán cuando se prepare cada etapa; no amplían por sí mismos el MVP.

## Registro de acuerdos

- Primera conversación: se confirman el objetivo de gestionar finanzas individuales y comunes, la clasificación para seguimiento y el desarrollo progresivo.
- Segunda conversación: se confirma que los movimientos serán ingresos y gastos, que ambos tendrán categorías, que la privacidad será configurable y que un gasto común podrá pagarlo una persona o ambas al 50/50. El reparto del coste y los detalles de privacidad y clasificación siguen pendientes.
- Tercera conversación: se confirma el balance de deudas para gastos compartidos, que los gastos no compartidos serán individuales, la organización de la privacidad por espacios y una categoría personalizable por movimiento para empezar. Se solicita poder tener tanto gastos individuales privados como individuales visibles para ambos.
- Cuarta conversación: se confirman tres espacios iniciales (dos privados y uno común), gastos individuales visibles en el común sin generar deuda, reparto del coste compartido siempre al 50/50 en el MVP y registro de liquidaciones para reducir o saldar la deuda sin contabilizarlas como nuevos gastos.
- Quinta conversación: se acuerda una web adaptada al móvil con Angular y Firebase como persistencia no relacional, cuentas independientes, actualización automática del espacio común y un resumen mensual con desglose y filtros. El balance de deudas será acumulado e independiente del mes seleccionado.
- Sexta conversación: se sustituye el modelo privado por dos espacios individuales y uno compartido, todos visibles para ambos en el MVP. Se confirman ingresos individuales sin efecto sobre lo compartido, ingresos comunes, recuentos individuales y de pareja, edición completa por ambos y los datos propuestos para movimientos en euros. La privacidad queda fuera del MVP.
- Séptima conversación: se corrige la organización a dos espacios, individual y compartido. Se confirma el balance personal solo individual o incluyendo la mitad de todos los movimientos comunes, también los registrados o pagados por la otra persona. Los ingresos compartidos se reparten al 50/50 y afectan al saldo de deudas según quién los cobra. Esta decisión sustituye la propuesta de sumar tres espacios en un recuento de pareja.
- Octava conversación: se confirman acceso con Google y con correo y contraseña, catálogo común de categorías editable por ambos y separado entre ingresos y gastos, y liquidaciones con importe, fecha, emisor, receptor y nota opcional.
- Novena conversación: se confirma la vinculación mediante código y se excluyen las devoluciones del MVP. Se priorizan movimientos recurrentes, presupuestos e inversiones; se plantea explorar la lectura de movimientos bancarios como una ampliación posterior. Con estas decisiones queda definido el alcance funcional del MVP.
- Décima conversación: se concreta que la ampliación de inversiones servirá para registrar las aportaciones realizadas y conservar su historial. La lectura bancaria queda aparcada, sin investigación ni etapa asignada por ahora.
- Undécima conversación: se acuerdan la última versión estable de Angular, archivos HTML/CSS/TypeScript separados por componente, funcionalidad en servicios independientes, formularios reactivos, interfaces tipadas, Angular Router, un modal base global controlado mediante un Observable de servicio y el flag `showModal`, skeletons durante las cargas, colores centralizados mediante variables CSS globales y una estética inspirada en un cerdito de hucha. Se registran las preguntas técnicas pendientes.
- Duodécima conversación: se elige Cloud Firestore y una interfaz con diseños propios. Se acuerdan `src/app/shared/` para componentes reutilizables y `src/app/pages/` para páginas. El modal se cerrará manualmente con Cancelar o X, sin cierre al pulsar fuera ni con Escape. La confirmación para descartar cambios queda pendiente.
- Decimotercera conversación: se confirma que Cancelar y X descartan directamente los cambios sin guardar, sin solicitar confirmación. Quedan definidas las convenciones técnicas solicitadas y el alcance funcional del MVP; el diseño detallado y la implementación se abordarán en una fase posterior.
- Implementación del MVP (17 de noviembre de 2026): se crean la aplicación Angular 22.2.6, los servicios y formularios acordados, la integración de Firebase, las reglas de Firestore, la demostración local y la configuración de Firebase Hosting. Se verifican los cálculos, las reglas de acceso, la navegación móvil y de escritorio y el flujo de dos cuentas con sincronización mediante emuladores. La configuración de Firebase real y su despliegue quedan pendientes.
