/* =========================================================
   Sistema de Inventario — lógica
   Los datos (productos e historial) se guardan en el navegador.
   Soporta unidades (unidad, kg, litro, ...) y cantidades decimales.
   ========================================================= */
const STORAGE_KEY = 'devdvd_inventario_v1';

let products = [];
let movements = [];
let editingId = null;
let movingId = null;
let sortKey = 'name';
let sortDir = 1; // 1 = ascendente, -1 = descendente

const $ = (id) => document.getElementById(id);

/* ---------- Persistencia ---------- */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      products = parsed; movements = []; // compatibilidad con versión anterior
    } else if (parsed && typeof parsed === 'object') {
      products = Array.isArray(parsed.products) ? parsed.products : [];
      movements = Array.isArray(parsed.movements) ? parsed.movements : [];
    } else {
      products = []; movements = [];
    }
  } catch {
    products = []; movements = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, movements }));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- Datos de ejemplo (solo la primera vez) ---------- */
function seedIfEmpty() {
  if (localStorage.getItem(STORAGE_KEY) !== null) return;
  const now = Date.now();
  products = [
    { id: uid(), name: 'Arroz 1kg', category: 'Abarrotes', unit: 'unidad', price: 8, stock: 40, minStock: 10, createdAt: now },
    { id: uid(), name: 'Pollo (pechuga)', category: 'Carnes', unit: 'kg', price: 18.5, stock: 12.5, minStock: 5, createdAt: now },
    { id: uid(), name: 'Aceite 1L', category: 'Abarrotes', unit: 'unidad', price: 12.5, stock: 6, minStock: 10, createdAt: now },
    { id: uid(), name: 'Leche', category: 'Lácteos', unit: 'litro', price: 7, stock: 20, minStock: 8, createdAt: now },
    { id: uid(), name: 'Coca-Cola 2L', category: 'Bebidas', unit: 'unidad', price: 11, stock: 0, minStock: 6, createdAt: now },
  ];
  movements = [];
  save();
}

/* ---------- Utilidades ---------- */
function round(n, d = 3) {
  const f = Math.pow(10, d);
  return Math.round((Number(n) || 0) * f) / f;
}

function formatQty(n) {
  return Number(n || 0).toLocaleString('es-BO', { maximumFractionDigits: 3 });
}

function formatBs(n) {
  const num = Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return 'Bs ' + num;
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// Devuelve la etiqueta de unidad, o '' si es "unidad"
function unitLabel(u) {
  const s = String(u || '').trim();
  if (!s || s.toLowerCase() === 'unidad' || s.toLowerCase() === 'u') return '';
  return s;
}

function qtyWithUnit(qty, unit) {
  const u = unitLabel(unit);
  return formatQty(qty) + (u ? ' ' + u : '');
}

function priceWithUnit(price, unit) {
  const u = unitLabel(unit);
  return formatBs(price) + (u ? '/' + u : '');
}

function statusOf(p) {
  if (p.stock <= 0) return { cls: 'badge--out', text: 'Agotado', rank: 0 };
  if (p.stock <= p.minStock) return { cls: 'badge--low', text: 'Stock bajo', rank: 1 };
  return { cls: 'badge--ok', text: 'Disponible', rank: 2 };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2200);
}

/* ---------- Filtros + orden ---------- */
function visibleProducts() {
  const q = $('search').value.trim().toLowerCase();
  const cat = $('filterCategory').value;
  const onlyLow = $('onlyLow').checked;

  const list = products.filter((p) => {
    if (cat && p.category !== cat) return false;
    if (onlyLow && !(p.stock <= p.minStock)) return false;
    if (q && !(p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q))) return false;
    return true;
  });

  list.sort((a, b) => {
    let va, vb;
    if (sortKey === 'status') { va = statusOf(a).rank; vb = statusOf(b).rank; }
    else if (sortKey === 'price' || sortKey === 'stock') { va = Number(a[sortKey]) || 0; vb = Number(b[sortKey]) || 0; }
    else { va = String(a[sortKey] || '').toLowerCase(); vb = String(b[sortKey] || '').toLowerCase(); }
    if (va < vb) return -1 * sortDir;
    if (va > vb) return 1 * sortDir;
    return 0;
  });

  return list;
}

/* ---------- Render ---------- */
function render() {
  const list = visibleProducts();
  $('tbody').innerHTML = list.map((p) => {
    const st = statusOf(p);
    const rowCls = p.stock <= 0 ? 'is-out' : (p.stock <= p.minStock ? 'is-low' : '');
    return `
      <tr class="${rowCls}">
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category || '—')}</td>
        <td class="num">${priceWithUnit(p.price, p.unit)}</td>
        <td class="num">${qtyWithUnit(p.stock, p.unit)}</td>
        <td><span class="badge ${st.cls}">${st.text}</span></td>
        <td class="actions-col">
          <div class="row-actions">
            <button class="btn btn--icon" data-act="in" data-id="${p.id}" title="Registrar entrada">＋</button>
            <button class="btn btn--icon" data-act="out" data-id="${p.id}" title="Registrar salida">－</button>
            <button class="btn btn--icon" data-act="edit" data-id="${p.id}" title="Editar">✏️</button>
            <button class="btn btn--icon btn--danger" data-act="del" data-id="${p.id}" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  $('empty').hidden = list.length > 0;
  renderStats();
  renderCategoryOptions();
  renderDatalist();
  renderSortIndicators();
}

function renderStats() {
  const total = products.length;
  const value = products.reduce((a, p) => a + Number(p.stock || 0) * Number(p.price || 0), 0);
  const categories = categoryList().length;
  const low = products.filter((p) => p.stock <= p.minStock).length;
  $('statProducts').textContent = total;
  $('statValue').textContent = formatBs(value);
  $('statCategories').textContent = categories;
  $('statLow').textContent = low;
}

function renderSortIndicators() {
  document.querySelectorAll('th[data-sort]').forEach((th) => {
    th.classList.toggle('sort-asc', th.dataset.sort === sortKey && sortDir === 1);
    th.classList.toggle('sort-desc', th.dataset.sort === sortKey && sortDir === -1);
  });
}

function categoryList() {
  const set = new Set(products.map((p) => (p.category || '').trim()).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}

function renderCategoryOptions() {
  const sel = $('filterCategory');
  const current = sel.value;
  const cats = categoryList();
  sel.innerHTML = '<option value="">Todas las categorías</option>' +
    cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if (cats.includes(current)) sel.value = current;
}

function renderDatalist() {
  $('catList').innerHTML = categoryList().map((c) => `<option value="${escapeHtml(c)}"></option>`).join('');
}

/* ---------- Historial: registrar y mostrar ---------- */
function addMovement(product, signedDelta, type, motive = '') {
  movements.unshift({
    id: uid(),
    productId: product.id,
    productName: product.name,
    unit: product.unit || 'unidad',
    type,
    qty: signedDelta,
    result: product.stock,
    motive,
    date: Date.now(),
  });
  if (movements.length > 500) movements.length = 500;
}

function renderHistory() {
  const list = movements.slice(0, 300);
  $('historyBody').innerHTML = list.map((m) => {
    const sign = m.qty > 0 ? '+' : '';
    const label = m.type === 'in' ? 'Entrada' : m.type === 'out' ? 'Salida' : 'Ajuste';
    const cls = m.qty >= 0 ? 'mov-in' : 'mov-out';
    return `
      <tr>
        <td>${formatDate(m.date)}</td>
        <td>${escapeHtml(m.productName)}</td>
        <td>${label}</td>
        <td class="num ${cls}">${sign}${qtyWithUnit(m.qty, m.unit)}</td>
        <td class="num">${formatQty(m.result)}</td>
      </tr>`;
  }).join('');
  $('historyEmpty').hidden = list.length > 0;
}

/* ---------- Modal: producto ---------- */
function openForm(id) {
  editingId = id || null;
  const p = id ? products.find((x) => x.id === id) : null;
  $('modalTitle').textContent = p ? 'Editar producto' : 'Nuevo producto';
  $('productId').value = id || '';
  $('name').value = p ? p.name : '';
  $('category').value = p ? (p.category || '') : '';
  $('unit').value = p ? (p.unit || 'unidad') : 'unidad';
  $('price').value = p ? p.price : '';
  $('stock').value = p ? p.stock : '';
  $('minStock').value = p ? p.minStock : 5;
  $('modal').hidden = false;
  $('name').focus();
}

function closeForm() {
  $('modal').hidden = true;
  $('form').reset();
  editingId = null;
}

/* ---------- Modal: movimiento ---------- */
function openMove(id, type) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  movingId = id;
  $('moveProduct').innerHTML =
    `Producto: <strong>${escapeHtml(p.name)}</strong> · Stock actual: <strong>${qtyWithUnit(p.stock, p.unit)}</strong>`;
  $('moveType').value = type;
  $('moveQty').value = 1;
  $('moveModal').hidden = false;
  $('moveQty').focus();
}

function closeMove() {
  $('moveModal').hidden = true;
  $('moveForm').reset();
  movingId = null;
}

/* ---------- Modal: historial ---------- */
function openHistory() {
  renderHistory();
  $('historyModal').hidden = false;
}

function closeHistory() {
  $('historyModal').hidden = true;
}

/* ---------- Acciones sobre la tabla ---------- */
function handleTableClick(e) {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const { act, id } = btn.dataset;
  if (act === 'edit') openForm(id);
  else if (act === 'in') openMove(id, 'in');
  else if (act === 'out') openMove(id, 'out');
  else if (act === 'del') {
    const p = products.find((x) => x.id === id);
    if (p && confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) {
      products = products.filter((x) => x.id !== id);
      save(); render(); toast('Producto eliminado');
    }
  }
}

function handleFormSubmit(e) {
  e.preventDefault();
  const data = {
    name: $('name').value.trim(),
    category: $('category').value.trim(),
    unit: $('unit').value.trim() || 'unidad',
    price: round(Math.max(0, Number($('price').value) || 0), 2),
    stock: round(Math.max(0, Number($('stock').value) || 0), 3),
    minStock: round(Math.max(0, Number($('minStock').value) || 0), 3),
  };
  if (!data.name) return;

  if (editingId) {
    const p = products.find((x) => x.id === editingId);
    const delta = round(data.stock - Number(p.stock || 0), 3);
    Object.assign(p, data);
    if (delta !== 0) addMovement(p, delta, 'ajuste', 'Edición');
    toast('Producto actualizado');
  } else {
    const p = { id: uid(), createdAt: Date.now(), ...data };
    products.push(p);
    if (p.stock > 0) addMovement(p, p.stock, 'in', 'Stock inicial');
    toast('Producto agregado');
  }

  save(); render(); closeForm();
}

function handleMoveSubmit(e) {
  e.preventDefault();
  const p = products.find((x) => x.id === movingId);
  if (!p) return;
  const type = $('moveType').value;
  const qty = round(Number($('moveQty').value) || 0, 3);
  if (!(qty > 0)) { toast('Ingresa una cantidad válida'); return; }
  if (type === 'out' && qty > p.stock) {
    toast(`No puedes sacar ${qtyWithUnit(qty, p.unit)}: solo hay ${qtyWithUnit(p.stock, p.unit)}`);
    return;
  }
  p.stock = round(p.stock + (type === 'in' ? qty : -qty), 3);
  addMovement(p, type === 'in' ? qty : -qty, type);
  save(); render(); closeMove();
  toast(type === 'in' ? `Entrada: +${qtyWithUnit(qty, p.unit)} a ${p.name}` : `Salida: −${qtyWithUnit(qty, p.unit)} de ${p.name}`);
}

/* ---------- Exportar / Importar ---------- */
function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // El enlace debe permanecer en el DOM un instante para que la descarga arranque.
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
}

function exportData() {
  const payload = { app: 'inventario-devdvd', version: 3, exportedAt: new Date().toISOString(), products, movements };
  download(JSON.stringify(payload, null, 2), `inventario-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  toast('Respaldo JSON descargado');
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function exportCsv() {
  const rows = [['Nombre', 'Categoría', 'Unidad', 'Precio', 'Stock', 'Stock mínimo', 'Estado', 'Valor']];
  products.forEach((p) => {
    rows.push([
      p.name, p.category || '', p.unit || 'unidad', p.price, p.stock, p.minStock,
      statusOf(p).text, (Number(p.stock) * Number(p.price)).toFixed(2),
    ]);
  });
  const csv = '\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  download(csv, `inventario-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  toast('CSV descargado (abre en Excel)');
}

function normalizeProduct(p) {
  return {
    id: p.id || uid(),
    name: String(p.name || 'Sin nombre'),
    category: String(p.category || ''),
    unit: String(p.unit || 'unidad'),
    price: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    minStock: Number(p.minStock) || 0,
    createdAt: p.createdAt || Date.now(),
  };
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      let prod, mov;
      if (Array.isArray(parsed)) { prod = parsed; mov = []; }
      else if (parsed && Array.isArray(parsed.products)) { prod = parsed.products; mov = Array.isArray(parsed.movements) ? parsed.movements : []; }
      else throw new Error('formato');

      products = prod.map(normalizeProduct);
      movements = mov;
      save(); render();
      toast(`Importados ${products.length} productos`);
    } catch {
      toast('El archivo no es un respaldo válido');
    }
  };
  reader.readAsText(file);
}

/* ---------- Imprimir ---------- */
function doPrint() {
  $('printMeta').textContent = 'Generado el ' + new Date().toLocaleString('es-BO') + ' · DEVDVD';
  window.print();
}

/* ---------- Inicio ---------- */
function init() {
  load();
  seedIfEmpty();

  $('btnNew').addEventListener('click', () => openForm());
  $('btnNewEmpty').addEventListener('click', () => openForm());
  $('btnCancel').addEventListener('click', closeForm);
  $('btnClose').addEventListener('click', closeForm);
  $('form').addEventListener('submit', handleFormSubmit);

  $('moveCancel').addEventListener('click', closeMove);
  $('moveClose').addEventListener('click', closeMove);
  $('moveForm').addEventListener('submit', handleMoveSubmit);

  $('btnHistory').addEventListener('click', openHistory);
  $('historyClose').addEventListener('click', closeHistory);
  $('historyClose2').addEventListener('click', closeHistory);
  $('btnClearHistory').addEventListener('click', () => {
    if (movements.length && confirm('¿Vaciar todo el historial de movimientos?')) {
      movements = []; save(); renderHistory(); toast('Historial vaciado');
    }
  });

  $('btnPrint').addEventListener('click', doPrint);
  $('btnCsv').addEventListener('click', exportCsv);
  $('btnExport').addEventListener('click', exportData);
  $('fileImport').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importData(file);
    e.target.value = '';
  });

  $('tbody').addEventListener('click', handleTableClick);

  $('search').addEventListener('input', render);
  $('filterCategory').addEventListener('change', render);
  $('onlyLow').addEventListener('change', render);

  document.querySelectorAll('th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (sortKey === key) sortDir *= -1;
      else { sortKey = key; sortDir = 1; }
      render();
    });
  });

  $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) closeForm(); });
  $('moveModal').addEventListener('click', (e) => { if (e.target === $('moveModal')) closeMove(); });
  $('historyModal').addEventListener('click', (e) => { if (e.target === $('historyModal')) closeHistory(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeForm(); closeMove(); closeHistory(); }
  });

  render();
}

document.addEventListener('DOMContentLoaded', init);
