// ---------- utilidades ----------
function moneda(valor) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
}

function mostrarToast(mensaje, esError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.classList.toggle('is-error', esError);
  toast.classList.remove('hidden');
  clearTimeout(mostrarToast._t);
  mostrarToast._t = setTimeout(() => toast.classList.add('hidden'), 3200);
}

async function api(url, opciones = {}) {
  const respuesta = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.error || 'Ocurrió un error inesperado.');
  }
  return datos;
}

// ---------- tabs ----------
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => b.classList.remove('is-active'));
    tabPanels.forEach((p) => p.classList.remove('is-active'));
    btn.classList.add('is-active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('is-active');

    if (btn.dataset.tab === 'pedidos') cargarSelectProductos();
    if (btn.dataset.tab === 'hoy') cargarPedidosHoy();
    if (btn.dataset.tab === 'historial') cargarHistorial();
  });
});

// ============================================================
// PRODUCTOS
// ============================================================
const listaProductos = document.getElementById('lista-productos');
const formProductoWrap = document.getElementById('form-producto-wrap');
const formProducto = document.getElementById('form-producto');
const productoError = document.getElementById('producto-error');

document.getElementById('btn-nuevo-producto').addEventListener('click', () => {
  formProducto.reset();
  document.getElementById('producto-id').value = '';
  document.getElementById('btn-guardar-producto').textContent = 'Guardar producto';
  productoError.textContent = '';
  formProductoWrap.classList.remove('hidden');
});

document.getElementById('btn-cancelar-producto').addEventListener('click', () => {
  formProductoWrap.classList.add('hidden');
});

async function cargarProductos() {
  try {
    const productos = await api('/api/productos');
    renderProductos(productos);
    return productos;
  } catch (error) {
    listaProductos.innerHTML = `<p class="vacio">No se pudieron cargar los productos.</p>`;
    mostrarToast(error.message, true);
    return [];
  }
}

function renderProductos(productos) {
  if (!productos.length) {
    listaProductos.innerHTML = '<p class="vacio">Todavía no hay productos. Crea el primero.</p>';
    return;
  }

  listaProductos.innerHTML = productos
    .map((p) => {
      const stockClase = p.stock <= 5 ? 'stock-bajo' : 'stock-ok';
      return `
        <div class="fila" data-id="${p.id_producto}">
          <div class="fila-info">
            <h3>${p.nombre}</h3>
            <p>${moneda(p.precio)} · <span class="${stockClase}">${p.stock} en stock</span></p>
          </div>
          <div class="fila-acciones">
            <button data-accion="editar">Modificar</button>
            <button data-accion="eliminar">Eliminar</button>
          </div>
        </div>
      `;
    })
    .join('');

  listaProductos.querySelectorAll('.fila').forEach((fila) => {
    const id = fila.dataset.id;
    const producto = productos.find((p) => String(p.id_producto) === id);

    fila.querySelector('[data-accion="editar"]').addEventListener('click', () => abrirEdicion(producto));
    fila.querySelector('[data-accion="eliminar"]').addEventListener('click', () => eliminarProducto(producto));
  });
}

function abrirEdicion(producto) {
  document.getElementById('producto-id').value = producto.id_producto;
  document.getElementById('producto-nombre').value = producto.nombre;
  document.getElementById('producto-precio').value = producto.precio;
  document.getElementById('producto-stock').value = producto.stock;
  document.getElementById('btn-guardar-producto').textContent = 'Guardar cambios';
  productoError.textContent = '';
  formProductoWrap.classList.remove('hidden');
  formProductoWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function eliminarProducto(producto) {
  if (!confirm(`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)) return;
  try {
    await api(`/api/productos/${producto.id_producto}`, { method: 'DELETE' });
    mostrarToast('Producto eliminado.');
    cargarProductos();
  } catch (error) {
    mostrarToast(error.message, true);
  }
}

formProducto.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  productoError.textContent = '';

  const id = document.getElementById('producto-id').value;
  const datos = {
    nombre: document.getElementById('producto-nombre').value.trim(),
    precio: document.getElementById('producto-precio').value,
    stock: document.getElementById('producto-stock').value
  };

  try {
    if (id) {
      await api(`/api/productos/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
      mostrarToast('Producto actualizado.');
    } else {
      await api('/api/productos', { method: 'POST', body: JSON.stringify(datos) });
      mostrarToast('Producto creado.');
    }
    formProductoWrap.classList.add('hidden');
    cargarProductos();
  } catch (error) {
    productoError.textContent = error.message;
  }
});

// ============================================================
// TOMAR PEDIDO
// ============================================================
const selectProducto = document.getElementById('pedido-producto');
const pedidoDisponible = document.getElementById('pedido-disponible');
const formPedido = document.getElementById('form-pedido');
const pedidoError = document.getElementById('pedido-error');
const pedidoOk = document.getElementById('pedido-ok');

let productosCache = [];

async function cargarSelectProductos() {
  productosCache = await cargarProductos();
  selectProducto.innerHTML = productosCache
    .map((p) => `<option value="${p.id_producto}">${p.nombre} — ${moneda(p.precio)}</option>`)
    .join('');
  actualizarDisponible();
}

function actualizarDisponible() {
  const producto = productosCache.find((p) => String(p.id_producto) === selectProducto.value);
  pedidoDisponible.textContent = producto ? `Stock disponible: ${producto.stock}` : '';
}

selectProducto.addEventListener('change', actualizarDisponible);

formPedido.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  pedidoError.textContent = '';
  pedidoOk.textContent = '';

  const datos = {
    tienda: document.getElementById('pedido-tienda').value.trim(),
    nombre: document.getElementById('pedido-nombre').value.trim(),
    direccion: document.getElementById('pedido-direccion').value.trim(),
    id_producto: selectProducto.value,
    cantidad: document.getElementById('pedido-cantidad').value
  };

  try {
    const pedido = await api('/api/pedidos', { method: 'POST', body: JSON.stringify(datos) });
    pedidoOk.textContent = `Pedido registrado: ${pedido.cantidad} x ${pedido.producto} — ${moneda(pedido.valor_total)}`;
    formPedido.reset();
    document.getElementById('pedido-cantidad').value = 1;
    await cargarSelectProductos();
  } catch (error) {
    pedidoError.textContent = error.message;
  }
});

// ============================================================
// PEDIDOS DE HOY
// ============================================================
const listaPedidosHoy = document.getElementById('lista-pedidos-hoy');
document.getElementById('btn-refrescar-hoy').addEventListener('click', cargarPedidosHoy);

async function cargarPedidosHoy() {
  try {
    const pedidos = await api('/api/pedidos/hoy');
    renderPedidos(listaPedidosHoy, pedidos, 'Todavía no hay pedidos registrados hoy.', true);
  } catch (error) {
    listaPedidosHoy.innerHTML = '<p class="vacio">No se pudieron cargar los pedidos.</p>';
    mostrarToast(error.message, true);
  }
}

// Dibuja una lista de pedidos. Si permiteEliminar es true, muestra el botón
// de Eliminar (solo tiene sentido para los pedidos de HOY, que son los que
// se pueden borrar; el historial completo es solo de lectura).
function renderPedidos(contenedor, pedidos, mensajeVacio, permiteEliminar) {
  if (!pedidos.length) {
    contenedor.innerHTML = `<p class="vacio">${mensajeVacio}</p>`;
    return;
  }

  contenedor.innerHTML = pedidos
    .map((p) => {
      const fechaHora = new Date(p.hora_registro).toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const acciones = permiteEliminar
        ? `<div class="fila-acciones"><button data-accion="eliminar">Eliminar</button></div>`
        : '';
      return `
        <div class="fila" data-id="${p.id_registro}">
          <div class="fila-info">
            <h3>${p.cantidad} × ${p.producto}</h3>
            <p>${p.nombre} · ${p.tienda} · ${moneda(p.valor_total)} · ${fechaHora}</p>
          </div>
          ${acciones}
        </div>
      `;
    })
    .join('');

  if (!permiteEliminar) return;

  contenedor.querySelectorAll('[data-accion="eliminar"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const fila = e.target.closest('.fila');
      const id = fila.dataset.id;
      if (!confirm('¿Eliminar este pedido del registro de hoy?')) return;
      try {
        await api(`/api/pedidos/${id}`, { method: 'DELETE' });
        mostrarToast('Pedido eliminado.');
        cargarPedidosHoy();
      } catch (error) {
        mostrarToast(error.message, true);
      }
    });
  });
}

// ============================================================
// HISTORIAL COMPLETO (con filtro opcional por fecha)
// ============================================================
const listaHistorial = document.getElementById('lista-historial');
const inputFecha = document.getElementById('historial-fecha');

document.getElementById('btn-filtrar-historial').addEventListener('click', () => cargarHistorial(inputFecha.value));
document.getElementById('btn-limpiar-historial').addEventListener('click', () => {
  inputFecha.value = '';
  cargarHistorial();
});

async function cargarHistorial(fecha) {
  try {
    const url = fecha ? `/api/pedidos/historial?fecha=${fecha}` : '/api/pedidos/historial';
    const pedidos = await api(url);
    const mensajeVacio = fecha ? 'No hay pedidos registrados en esa fecha.' : 'Todavía no hay pedidos en el historial.';
    renderPedidos(listaHistorial, pedidos, mensajeVacio, false);
  } catch (error) {
    listaHistorial.innerHTML = '<p class="vacio">No se pudo cargar el historial.</p>';
    mostrarToast(error.message, true);
  }
}

// ---------- arranque ----------
cargarProductos();
