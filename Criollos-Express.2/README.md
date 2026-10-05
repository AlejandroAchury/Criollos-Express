# Criollos Express

Sistema web (Express + SQL Server + HTML) para gestionar productos y tomar
pedidos. Incluye Crear, Leer, Modificar y Eliminar tanto para productos como
para los pedidos del día.

## Qué cambió respecto a la versión de consola

- **Front en HTML**: ya no se usa la terminal. Todo se maneja desde el
  navegador (`public/index.html` + `public/js/app.js`).
- **CRUD completo de productos**: crear, ver, modificar y eliminar productos
  desde la pestaña "Productos".
- **CRUD de pedidos del día**: se pueden eliminar pedidos registrados por
  error desde la pestaña "Pedidos de hoy" (y actualizarlos vía API si lo
  necesitas).
- **Sin usuario personal quemado en el código**: `config/db.js` ya no tiene
  ningún usuario ni contraseña de una persona en particular. Los datos de
  conexión salen de un archivo `.env`, y `sql/setup.sql` crea un **login
  genérico** (`criollos_app`) que cualquiera puede usar corriendo ese mismo
  script en su propio SQL Server.
- **Tabla propia `ce_productos`**: la app usa una tabla llamada `ce_productos`
  (no `productos` a secas), para no chocar con ninguna tabla `productos` que
  ya exista en la base de datos `Pollos` por otro proyecto tuyo. La API sigue
  respondiendo en `/api/productos` (eso es solo el nombre de la ruta web, no
  el de la tabla).

## Requisitos

- Node.js 18 o superior.
- SQL Server (Express o superior) con una instancia (por defecto se asume
  `SQLEXPRESS`).
- Servicio **SQL Server Browser** activo si usas una instancia con nombre.
- Autenticación mixta habilitada en el servidor (SQL Server and Windows
  Authentication mode), para poder usar el login `criollos_app`.

## Instalación (primera vez, en cada máquina)

1. Descomprime el proyecto e instala las dependencias:
   ```bash
   npm install
   ```
2. Copia el archivo de ejemplo de variables de entorno:
   ```bash
   copy .env.example .env      # Windows
   # o: cp .env.example .env   # Mac/Linux
   ```
   Por defecto no tienes que cambiar nada dentro de `.env`: apunta al login
   genérico que crea el paso siguiente. Solo ajusta `DB_SERVER` si tu
   instancia de SQL Server se llama distinto a `localhost\SQLEXPRESS`.
3. Abre **SQL Server Management Studio**, conéctate como administrador y
   ejecuta el script `sql/setup.sql`. Esto crea la base de datos `Pollos`,
   el login genérico `criollos_app` y la tabla `ce_productos` con datos de
   ejemplo. Solo hay que hacerlo una vez por cada servidor de SQL Server.
   Si tu base `Pollos` ya existía con otras tablas de otro proyecto, no
   pasa nada: `ce_productos` es una tabla nueva y no las toca.
4. Arranca la aplicación:
   ```bash
   npm start
   ```
5. Abre el navegador en **http://localhost:3000**.

## Estructura del proyecto

```
Criollos-Express/
├── config/db.js          → conexión a SQL Server (usa .env)
├── models/
│   ├── Producto.js        → CRUD de productos
│   ├── RegistroPedidos.js → CRUD genérico de pedidos
│   ├── RegistroPorDia.js  → pedidos de hoy (tabla pedidos_AAAA_MM_DD)
│   └── RegistroUnico.js   → historial completo (tabla pedidos)
├── routes/
│   ├── productos.routes.js
│   └── pedidos.routes.js
├── public/                → front-end (HTML, CSS, JS)
├── sql/setup.sql           → script de instalación de la base de datos
├── server.js               → servidor Express
└── .env.example
```

## Endpoints de la API

| Método | Ruta                    | Acción                              |
|--------|-------------------------|--------------------------------------|
| GET    | /api/productos          | Listar productos                     |
| POST   | /api/productos          | Crear producto                       |
| PUT    | /api/productos/:id      | Modificar producto                   |
| DELETE | /api/productos/:id      | Eliminar producto                    |
| GET    | /api/pedidos/hoy        | Listar pedidos de hoy                |
| GET    | /api/pedidos/historial  | Listar historial completo            |
| POST   | /api/pedidos            | Registrar un pedido (descuenta stock)|
| PUT    | /api/pedidos/:id        | Modificar un pedido de hoy           |
| DELETE | /api/pedidos/:id        | Eliminar un pedido de hoy            |

## Compartir el proyecto con más personas

Cada persona que quiera correr el proyecto en su propia máquina debe:
1. Tener su propio SQL Server instalado y corriendo.
2. Ejecutar `sql/setup.sql` una vez en su servidor (crea el login genérico).
3. Copiar `.env.example` a `.env` (sin tocar nada, salvo el nombre del
   servidor si es distinto).
4. Correr `npm install` y `npm start`.

Nadie necesita crear una cuenta de SQL a su nombre ni tocar `config/db.js`.
