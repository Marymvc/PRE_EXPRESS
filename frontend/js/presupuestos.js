exigirSesion();
renderTopbar('presupuestos');
renderFooter();

let catalogo = [];          // ítems del catálogo (ms-items)
let filas = [];              // filas del presupuesto que se está armando o editando
let modoEdicion = null;      // null = creando uno nuevo | id = editando ese presupuesto
let presupuestosCache = [];  // último listado cargado, para poder generar el PDF sin pedirlo de nuevo

const fmt = (n) => `Bs ${Number(n).toFixed(2)}`;

// ------------------------------------------------------------------
// Catálogo (solo lectura acá — se administra en app.html)
// ------------------------------------------------------------------
async function cargarCatalogo() {
  catalogo = await apiFetch('/api/items');
  renderFilas();
}

// ------------------------------------------------------------------
// Armador / editor de presupuesto
// ------------------------------------------------------------------
function agregarFila() {
  if (!catalogo.length) {
    alert('Todavía no tienes ítems en tu catálogo. Agrégalos primero en "Catálogo y nuevo presupuesto".');
    return;
  }
  filas.push({ itemId: catalogo[0].id, superficie: 1 });
  renderFilas();
}

function renderFilas() {
  const cont = document.getElementById('filasPresupuesto');

  if (!filas.length) {
    cont.innerHTML = '<div class="vacio">Agrega ítems del catálogo para armar el presupuesto.</div>';
    actualizarTotalPreview();
    return;
  }

  const opciones = (seleccionado) =>
    catalogo
      .map((it) => `<option value="${it.id}" ${it.id === seleccionado ? 'selected' : ''}>${escapeHtml(it.nombre)}</option>`)
      .join('');

  const filaHtml = (fila, i) => {
    const item = catalogo.find((it) => it.id === fila.itemId);
    const subtotal = item ? item.costoUnitario * fila.superficie : 0;
    return `
      <div class="fila-presupuesto">
        <select data-fila="${i}" data-campo="itemId">${opciones(fila.itemId)}</select>
        <input type="number" class="mono" min="0" step="0.01" value="${fila.superficie}" data-fila="${i}" data-campo="superficie" />
        <span class="mono meta">${item ? escapeHtml(item.unidad) : ''}</span>
        <span class="subtotal-fila mono">${fmt(subtotal)}</span>
        <button class="btn-texto" data-quitar-fila="${i}" title="Quitar">✕</button>
      </div>`;
  };

  // Agrupa las filas por partida mientras se arma, igual que el
  // resultado final que calcula µs-Presupuestos.
  const grupos = new Map();
  filas.forEach((fila, i) => {
    const item = catalogo.find((it) => it.id === fila.itemId);
    const categoria = item ? item.categoria : 'Sin categoría';
    if (!grupos.has(categoria)) grupos.set(categoria, []);
    grupos.get(categoria).push(i);
  });

  cont.innerHTML = Array.from(grupos.entries())
    .map(
      ([categoria, indices]) => `
      <div class="partida">
        <div class="partida-nombre">${escapeHtml(categoria)}</div>
        ${indices.map((i) => filaHtml(filas[i], i)).join('')}
      </div>`
    )
    .join('');

  cont.querySelectorAll('select[data-fila], input[data-fila]').forEach((el) => {
    el.addEventListener('input', (e) => {
      const i = Number(e.target.dataset.fila);
      const campo = e.target.dataset.campo;
      filas[i][campo] = campo === 'superficie' ? Number(e.target.value) : e.target.value;
      renderFilas();
    });
  });
  cont.querySelectorAll('[data-quitar-fila]').forEach((btn) => {
    btn.addEventListener('click', () => {
      filas.splice(Number(btn.dataset.quitarFila), 1);
      renderFilas();
    });
  });

  actualizarTotalPreview();
}

function actualizarTotalPreview() {
  const total = filas.reduce((suma, fila) => {
    const item = catalogo.find((it) => it.id === fila.itemId);
    return suma + (item ? item.costoUnitario * fila.superficie : 0);
  }, 0);
  document.getElementById('totalPreview').textContent = fmt(total);
}

document.getElementById('btnAgregarFila').addEventListener('click', agregarFila);

function volverAModoCreacion() {
  modoEdicion = null;
  document.getElementById('tituloBuilder').textContent = 'Nuevo presupuesto';
  document.getElementById('btnCancelarEdicion').style.display = 'none';
  document.getElementById('presupuestoNombre').value = '';
  document.getElementById('presupuestoCliente').value = '';
  filas = [];
  renderFilas();
}

document.getElementById('btnCancelarEdicion').addEventListener('click', volverAModoCreacion);

function iniciarEdicion(p) {
  modoEdicion = p.id;
  document.getElementById('tituloBuilder').textContent = `Editando: ${p.nombre}`;
  document.getElementById('btnCancelarEdicion').style.display = 'inline-block';
  document.getElementById('presupuestoNombre').value = p.nombre;
  document.getElementById('presupuestoCliente').value = p.cliente || '';

  filas = p.items.map((item, idx) => {
    let match = catalogo.find((it) => it.id === item.itemId);
    if (!match) {
      // El ítem ya no está en el catálogo (o el presupuesto es viejo y
      // no guardó itemId) — se agrega una opción temporal con sus
      // datos originales, para no perder la fila al editar.
      match = {
        id: item.itemId || `original-${idx}-${Date.now()}`,
        nombre: item.descripcion,
        categoria: item.categoria,
        unidad: item.unidad,
        costoUnitario: item.costoUnitario,
      };
      catalogo.push(match);
    }
    return { itemId: match.id, superficie: item.superficie };
  });

  renderFilas();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('btnGuardarPresupuesto').addEventListener('click', async () => {
  const nombre = document.getElementById('presupuestoNombre').value.trim();
  const cliente = document.getElementById('presupuestoCliente').value.trim();
  if (!nombre) return alert('Ponle un nombre al proyecto.');
  if (!filas.length) return alert('Agrega al menos una fila.');

  const items = filas.map((fila) => {
    const item = catalogo.find((it) => it.id === fila.itemId);
    return {
      itemId: item.id,
      descripcion: item.nombre,
      categoria: item.categoria,
      unidad: item.unidad,
      superficie: fila.superficie,
      costoUnitario: item.costoUnitario,
    };
  });

  if (modoEdicion) {
    const query = `
      mutation($id: ID!, $nombre: String, $cliente: String, $items: [ItemInput!]!) {
        actualizarPresupuesto(id: $id, nombre: $nombre, cliente: $cliente, items: $items) { id }
      }
    `;
    await graphqlFetch(query, { id: modoEdicion, nombre, cliente: cliente || null, items });
  } else {
    const query = `
      mutation($nombre: String!, $cliente: String, $items: [ItemInput!]!) {
        crearPresupuesto(nombre: $nombre, cliente: $cliente, items: $items) { id }
      }
    `;
    await graphqlFetch(query, { nombre, cliente: cliente || null, items });
  }

  volverAModoCreacion();
  await cargarPresupuestos();
});

// ------------------------------------------------------------------
// Presupuestos guardados: listar, ver detalle, editar, eliminar, PDF
// ------------------------------------------------------------------
async function cargarPresupuestos() {
  const query = `
    query {
      misPresupuestos {
        id
        nombre
        cliente
        total
        totalEnLetras
        estado
        fecha
        subtotalesPorCategoria { categoria subtotal }
        items { itemId descripcion categoria unidad superficie costoUnitario subtotal }
      }
    }
  `;
  const data = await graphqlFetch(query);
  renderPresupuestos(data ? data.misPresupuestos : []);
}

function renderPresupuestos(lista) {
  presupuestosCache = lista;
  const cont = document.getElementById('listaPresupuestos');

  if (!lista.length) {
    cont.innerHTML = '<div class="vacio">Todavía no guardaste ningún presupuesto.</div>';
    return;
  }

  cont.innerHTML = lista
    .slice()
    .reverse()
    .map((p) => {
      const grupos = new Map();
      p.items.forEach((item) => {
        if (!grupos.has(item.categoria)) grupos.set(item.categoria, []);
        grupos.get(item.categoria).push(item);
      });

      let contador = 0;
      const filasTabla = Array.from(grupos.entries())
        .map(([categoria, items]) => {
          const sub = p.subtotalesPorCategoria.find((s) => s.categoria === categoria);
          const filasItems = items
            .map((item) => {
              contador++;
              return `
              <tr>
                <td class="num mono">${contador}</td>
                <td>${escapeHtml(item.descripcion)}</td>
                <td class="mono">${escapeHtml(item.unidad)}</td>
                <td class="num mono">${item.superficie}</td>
                <td class="num mono">${fmt(item.costoUnitario)}</td>
                <td class="num mono">${fmt(item.subtotal)}</td>
              </tr>`;
            })
            .join('');
          return `
            <tr class="fila-categoria">
              <td colspan="5">${escapeHtml(categoria)}</td>
              <td class="num mono">${fmt(sub ? sub.subtotal : 0)}</td>
            </tr>
            ${filasItems}`;
        })
        .join('');

      return `
      <details class="presupuesto-guardado">
        <summary>
          <div class="cabecera">
            <span class="nombre">${escapeHtml(p.nombre)}</span>
          </div>
          <div class="fecha">${escapeHtml(p.cliente || 'Sin cliente')} · ${new Date(p.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          <div class="mono" style="margin-top:0.4rem; font-weight:600; color:var(--verde-obra)">${fmt(p.total)}</div>
        </summary>

        <div class="detalle-presupuesto">
          <table class="tabla-detalle">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Descripción</th>
                <th>Und.</th>
                <th>Cantidad</th>
                <th>Unitario</th>
                <th>Parcial (Bs)</th>
              </tr>
            </thead>
            <tbody>
              ${filasTabla}
              <tr class="fila-total">
                <td colspan="5">Total presupuesto Bs:</td>
                <td class="num mono">${fmt(p.total)}</td>
              </tr>
            </tbody>
          </table>
          <div class="letras">Son: ${escapeHtml(p.totalEnLetras)}</div>

          <div class="presupuesto-acciones">
            <button class="btn-secundario" data-editar="${p.id}">Editar</button>
            <button class="btn-secundario" data-pdf="${p.id}">Descargar PDF</button>
            <button class="btn-peligro" data-eliminar="${p.id}">Eliminar</button>
          </div>
        </div>
      </details>`;
    })
    .join('');

  cont.querySelectorAll('[data-editar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = presupuestosCache.find((x) => x.id === btn.dataset.editar);
      if (p) iniciarEdicion(p);
    });
  });

  cont.querySelectorAll('[data-pdf]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = presupuestosCache.find((x) => x.id === btn.dataset.pdf);
      if (p) generarPDF(p);
    });
  });

  cont.querySelectorAll('[data-eliminar]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const p = presupuestosCache.find((x) => x.id === btn.dataset.eliminar);
      if (!p) return;
      if (!confirm(`¿Eliminar el presupuesto "${p.nombre}"? Esta acción no se puede deshacer.`)) return;

      const query = `mutation($id: ID!) { eliminarPresupuesto(id: $id) }`;
      await graphqlFetch(query, { id: p.id });

      if (modoEdicion === p.id) volverAModoCreacion();
      await cargarPresupuestos();
    });
  });
}

// ------------------------------------------------------------------
// Exportar a PDF (jsPDF + autoTable, corre 100% en el navegador)
// ------------------------------------------------------------------
function generarPDF(p) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(27, 59, 95);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text('PresupuestoExpress', 14, 10);
  doc.setFontSize(9);
  doc.text(`Proyecto: ${p.nombre}`, 14, 17);
  doc.text(`Cliente: ${p.cliente || '—'}`, 14, 22);
  doc.text(`Fecha: ${new Date(p.fecha).toLocaleDateString('es-BO')}`, 150, 17);

  const grupos = new Map();
  p.items.forEach((item) => {
    if (!grupos.has(item.categoria)) grupos.set(item.categoria, []);
    grupos.get(item.categoria).push(item);
  });

  const body = [];
  let contador = 0;
  grupos.forEach((items, categoria) => {
    const sub = p.subtotalesPorCategoria.find((s) => s.categoria === categoria);
    body.push([
      { content: categoria, colSpan: 5, styles: { fillColor: [200, 232, 232], fontStyle: 'bold' } },
      { content: fmt(sub ? sub.subtotal : 0), styles: { fillColor: [200, 232, 232], fontStyle: 'bold', halign: 'right' } },
    ]);
    items.forEach((item) => {
      contador++;
      body.push([
        contador,
        item.descripcion,
        item.unidad,
        item.superficie,
        Number(item.costoUnitario).toFixed(2),
        Number(item.subtotal).toFixed(2),
      ]);
    });
  });

  body.push([
    { content: 'Total presupuesto Bs:', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [230, 230, 220] } },
    { content: Number(p.total).toFixed(2), styles: { fontStyle: 'bold', halign: 'right', fillColor: [230, 230, 220] } },
  ]);

  doc.autoTable({
    startY: 32,
    head: [['Nº', 'Descripción', 'Und.', 'Cantidad', 'Unitario', 'Parcial (Bs)']],
    body,
    headStyles: { fillColor: [27, 59, 95] },
    styles: { fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { cellWidth: 16 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
    },
  });

  const y = doc.lastAutoTable.finalY + 8;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont(undefined, 'italic');
  doc.text(`Son: ${p.totalEnLetras}`, 14, y);

  doc.save(`presupuesto-${p.nombre.replace(/\s+/g, '_')}.pdf`);
}

// ------------------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ------------------------------------------------------------------
(async function init() {
  await cargarCatalogo();
  await cargarPresupuestos();
})();
