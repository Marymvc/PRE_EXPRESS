// Inyecta la barra superior (con navegación) y el footer, para no
// repetir el mismo HTML en cada página. paginaActiva resalta el link
// correspondiente ("catalogo" | "presupuestos" | "guia").
function renderTopbar(paginaActiva) {
  const usuario = getUsuario();
  const cont = document.getElementById('topbar');
  if (!cont) return;

  const link = (href, id, texto) =>
    `<a href="${href}" class="nav-link ${paginaActiva === id ? 'activo' : ''}">${texto}</a>`;

  cont.innerHTML = `
    <div class="topbar-izquierda">
      <span class="marca">PresupuestoExpress</span>
      <nav class="nav-links">
        ${link('app.html', 'catalogo', 'Catálogo y nuevo presupuesto')}
        ${link('presupuestos.html', 'presupuestos', 'Mis presupuestos')}
        ${link('guia.html', 'guia', 'Guía de uso')}
      </nav>
    </div>
    <div class="usuario-info">
      <span>${usuario ? usuario.nombre : ''}</span>
      <button class="btn-texto" id="btnSalir" type="button" style="color:#fff">Cerrar sesión</button>
    </div>
  `;

  const btnSalir = document.getElementById('btnSalir');
  if (btnSalir) btnSalir.addEventListener('click', cerrarSesion);
}

function renderFooter() {
  const cont = document.getElementById('footer');
  if (!cont) return;

  cont.innerHTML = `
    <div class="footer-contenido">
      <div class="footer-col">
        <div class="footer-marca">PresupuestoExpress</div>
        <p>Presupuestos de obra con catálogo reutilizable y cálculo automático por partida. Proyecto Design Lab · Web III.</p>
      </div>
      <div class="footer-col">
        <div class="footer-titulo">Contacto</div>
        <p>hola@presupuestoexpress.bo</p>
        <p>+591 700 00 000</p>
        <p>Sucre, Bolivia</p>
      </div>
      <div class="footer-col">
        <div class="footer-titulo">Síguenos</div>
        <div class="footer-redes">
          <a href="#" aria-label="Facebook">Facebook</a>
          <a href="#" aria-label="Instagram">Instagram</a>
          <a href="#" aria-label="LinkedIn">LinkedIn</a>
        </div>
      </div>
    </div>
    <div class="footer-pie">© 2026 PresupuestoExpress. Proyecto académico, TBA.</div>
  `;
}
