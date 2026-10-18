# Sistema de Inventario — DEVDVD

Aplicación web para **controlar el inventario de un negocio**: registrar productos,
controlar entradas y salidas de stock, y recibir alertas de stock bajo.

Funciona **100% en el navegador** (sin servidor, sin internet, sin costos). Los datos
se guardan en el propio navegador (`localStorage`) y se pueden respaldar/restaurar.

## ✨ Funciones

- ➕ Agregar, editar y eliminar productos.
- ⚖️ **Unidad de venta** por producto: `unidad`, `kg`, `litro`, `lb`, docena, etc.
- 🔢 **Cantidades decimales** (ej: 12,5 kg de pollo).
- 🔢 Registrar **entradas (+)** y **salidas (−)** de stock.
- 🕘 **Historial de movimientos** con fecha y hora.
- 🔔 **Alertas de stock bajo** (configurables por producto).
- 📊 Estadísticas: productos, **valor del inventario** (Bs), categorías y stock bajo.
- 🔎 Buscar, filtrar por categoría o "solo stock bajo", y **ordenar por columna**.
- 💾 **Exportar / Importar** respaldo en JSON.
- 📄 **Exportar a CSV** (para Excel/Sheets).
- 🖨️ **Imprimir / guardar como PDF** (reporte limpio).
- 📱 Diseño responsive (funciona en celular y computadora).

## 🚀 Cómo usarlo

Abre `index.html` con el navegador:

```bash
xdg-open index.html
```

O con un servidor local:

```bash
python3 -m http.server 8080
# abre http://localhost:8080
```

> La primera vez carga 4 productos de ejemplo para que veas cómo funciona. Bórralos y agrega los tuyos.

## 🌍 Publicarlo gratis

- **GitHub Pages**, **Netlify** o **Vercel**: sube la carpeta y listo (igual que el portafolio).
- Al ser estático, no necesitas pagar hosting.

## 💼 Cómo venderlo a clientes

1. Muéstralo funcionando con datos de ejemplo reales del negocio (abarrotes, ferretería, etc.).
2. Ofrécelo como **app que funciona en su celular** (se agrega a inicio, sin instalar nada).
3. Cobra por **implementación** (cargar su inventario) + **soporte mensual**.
4. Si necesita varios usuarios o sincronización entre dispositivos, ese es un **plan superior** (con base de datos y servidor).

## 🧩 Estructura

| Archivo | Función |
|---|---|
| `index.html` | Interfaz |
| `styles.css` | Diseño |
| `app.js` | Lógica y almacenamiento |
