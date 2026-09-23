# Frontend — PresupuestoExpress

HTML + CSS + JS puro (sin frameworks). Habla **únicamente con el Gateway** (`http://localhost:3000`), nunca directo con los microservicios.

## Páginas

- **`index.html`** — login y registro (con pestañas para alternar entre los dos formularios)
- **`app.html`** — panel principal: catálogo de ítems (izquierda) y armador de presupuestos + lista de presupuestos guardados (derecha)

## Cómo probarlo

1. Asegúrate de tener los 4 servicios corriendo: `ms-usuarios` (3001), `ms-items` (3002), `ms-presupuestos` (3003) y `gateway` (3000).
2. Como es HTML/CSS/JS plano, no necesita `npm install` ni build. Solo necesitas abrirlo con un servidor local (abrirlo con doble clic como `file://` puede dar problemas de CORS con algunos navegadores).

### Opción A — con la extensión "Live Server" de VS Code
1. Clic derecho sobre `index.html` → "Open with Live Server"
2. Se abre en algo como `http://127.0.0.1:5500`

### Opción B — con un servidor simple de Node
```bash
cd frontend
npx serve .
```
Y abre la URL que te indique (normalmente `http://localhost:3000`... ⚠️ ese puerto choca con el Gateway, así que si usas `npx serve`, dile que use otro puerto: `npx serve . -l 5500`)

## Flujo de uso

1. Crea una cuenta o inicia sesión (`index.html`)
2. En el panel (`app.html`):
   - Agrega ítems a tu catálogo (nombre, partida/categoría, unidad, costo unitario) — como los que ya tienes en Firestore (Colocado de carpeta, Colocado de ceramica)
   - En "Nuevo presupuesto": ponle nombre al proyecto, agrega filas seleccionando ítems del catálogo y la superficie/cantidad — el subtotal y el total se calculan en vivo
   - "Guardar presupuesto" lo manda a `µs-Presupuestos` vía GraphQL, que calcula subtotales por partida, total y total en letras
   - Se lista abajo en "Mis presupuestos"

## Dónde vive cada cosa

```
frontend/
├── index.html          # login + registro
├── app.html             # catálogo de ítems + armador de presupuestos
├── css/styles.css       # estilos compartidos
└── js/
    ├── config.js         # URL del Gateway
    ├── api.js            # helpers fetch (REST + GraphQL) y manejo de sesión (localStorage)
    ├── login.js           # lógica de index.html
    └── app.js             # lógica de app.html
```

La sesión (token JWT + datos del usuario) se guarda en `localStorage`. Si el Gateway devuelve 401 en cualquier petición, la app cierra sesión automáticamente y redirige al login.

## Siguiente paso

**CI/CD**: configurar GitHub Actions para que, al hacer push a `main`, se corran pruebas, se haga build y se despliegue automáticamente — el último punto de la diapositiva 9.
