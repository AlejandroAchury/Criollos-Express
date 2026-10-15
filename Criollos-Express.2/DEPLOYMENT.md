# Publicar Criollos Express en Azure

La aplicación está preparada para ejecutarse como una aplicación web Node.js en Azure App Service con una base de datos Azure SQL. Azure crea la URL pública al publicar la aplicación. La disponibilidad y el costo de los recursos dependen de la suscripción y la región elegida.

## 1. Crear y preparar la base de datos

En Azure Portal, crea un servidor Azure SQL y una base de datos. Configura acceso de red para que App Service pueda conectarse; evita abrir el servidor a todas las direcciones IP.

Si necesitas conservar los datos locales, migra primero la base local `Pollos` a Azure SQL con una copia compatible (por ejemplo, exportación/importación BACPAC o Azure Database Migration Service). Crear una base vacía no copia productos ni pedidos. Haz y conserva una copia de seguridad antes de migrar.

Usa un usuario SQL dedicado a la aplicación con permisos de lectura, escritura, creación de tablas y alteración de las tablas existentes. La aplicación crea sus tablas de autenticación y de pedidos diarios, y en el primer arranque agrega la columna de cuenta a las tablas anteriores.

## 2. Publicar la aplicación

Publica este repositorio en un App Service Linux con Node.js 22. El comando de inicio es `npm start`; App Service instalará las dependencias declaradas en `package.json`. Puedes conectar el despliegue a GitHub desde **Deployment Center** o publicar desde VS Code con la extensión de Azure.

## 3. Configurar variables de entorno

En **App Service → Settings → Environment variables**, agrega los valores como configuración de aplicación. No los guardes en Git ni los pongas en el código:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DB_SERVER` | Nombre DNS del servidor, por ejemplo `mi-servidor.database.windows.net` |
| `DB_DATABASE` | Nombre de la base de datos Azure SQL |
| `DB_USER` | Usuario SQL de la aplicación |
| `DB_PASSWORD` | Contraseña SQL guardada como secreto |
| `DB_ENCRYPT` | `true` |
| `DB_TRUST_SERVER_CERTIFICATE` | `false` |
| `LEGACY_OWNER_EMAIL` | Correo de la cuenta propietaria que conservará los datos actuales |
| `LEGACY_OWNER_PASSWORD` | Contraseña nueva, única y de al menos 12 caracteres |
| `LEGACY_OWNER_NAME` | Nombre que aparecerá para la cuenta propietaria |

No es necesario definir `PORT`: App Service lo proporciona. Guarda las variables y reinicia la aplicación.

En el primer arranque se crean las tablas de cuentas y sesiones, y se agregan las columnas de cuenta a los productos y pedidos que existan en la base de Azure. Los datos migrados que aún no tienen cuenta se asignan a `LEGACY_OWNER_EMAIL`; las cuentas que se registren después tendrán inventario e historial separados. Configura estas credenciales antes de arrancar por primera vez para que los datos heredados queden asociados a la cuenta correcta. Si la cuenta propietaria ya existe en esa base, el proceso no cambia su contraseña y debes iniciar sesión con la contraseña que ya tiene.

Haz una copia de seguridad de la base de datos antes del primer despliegue: el arranque inicial modifica el esquema y asigna los datos existentes a la cuenta propietaria.

## 4. Verificar el sitio

Abre la URL que muestra App Service, inicia sesión con la cuenta propietaria y confirma que aparezcan los productos y el historial previos. Desde **Crear cuenta**, registra otra cuenta y verifica que sus listas empiecen vacías. Luego cierra sesión y comprueba que la página solicite autenticación.

Para desarrollo local, copia `.env.example` como `.env` y reemplaza los valores con credenciales locales. El archivo `.env` está excluido de Git.
