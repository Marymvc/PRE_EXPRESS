exigirSesion();
renderTopbar('catalogo');
renderFooter();

let catalogo = [];
const fmt = (n) => `Bs ${Number(n).toFixed(2)}`;

async function cargarCatalogo() {
  catalogo = await apiFetch('/api/items');
  renderCatalogo();
}

function renderCatalogo() {
  const cont = document.getElementById('listaItems');

  if (!catalogo.length) {
    cont.innerHTML = '<div class="vacio">Todavía no agregaste ningún ítem.</div>';
    return;
  }

  cont.innerHTML = catalogo
    .map(
      (item) => `
      <div class="fila-item">
        <div>
          <div class="nombre">${escapeHtml(item.nombre)}</div>
          <div class="meta">${escapeHtml(item.categoria)} · ${escapeHtml(item.unidad)}</div>
        </div>
        <div class="precio mono">${fmt(item.costoUnitario)}</div>
        <button class="btn-texto" data-eliminar-item="${item.id}" title="Eliminar">✕</button>
      </div>`
    )
    .join('');

  cont.querySelectorAll('[data-eliminar-item]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await apiFetch(`/api/items/${btn.dataset.eliminarItem}`, { method: 'DELETE' });
      await cargarCatalogo();
    });
  });
}

document.getElementById('formNuevoItem').addEventListener('submit', async (e) => {
  e.preventDefault();

  await apiFetch('/api/items', {
    method: 'POST',
    body: {
      nombre: document.getElementById('itemNombre').value,
      categoria: document.getElementById('itemCategoria').value,
      unidad: document.getElementById('itemUnidad').value,
      costoUnitario: Number(document.getElementById('itemCosto').value),
    },
  });

  e.target.reset();
  await cargarCatalogo();
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

cargarCatalogo();
