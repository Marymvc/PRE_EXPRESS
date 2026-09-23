// Si ya hay sesión, no tiene sentido ver el login de nuevo.
if (getToken()) window.location.href = 'app.html';

const tabLogin = document.getElementById('tabLogin');
const tabRegistro = document.getElementById('tabRegistro');
const formLogin = document.getElementById('formLogin');
const formRegistro = document.getElementById('formRegistro');

tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('activo');
  tabRegistro.classList.remove('activo');
  formLogin.style.display = 'block';
  formRegistro.style.display = 'none';
});

tabRegistro.addEventListener('click', () => {
  tabRegistro.classList.add('activo');
  tabLogin.classList.remove('activo');
  formRegistro.style.display = 'block';
  formLogin.style.display = 'none';
});

function mostrarError(idBox, mensaje) {
  const box = document.getElementById(idBox);
  box.textContent = mensaje;
  box.classList.add('visible');
}
function ocultarError(idBox) {
  document.getElementById(idBox).classList.remove('visible');
}

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarError('errorLogin');

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const { token } = await apiFetch('/api/usuarios/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    const usuario = await apiFetchConToken('/api/usuarios/me', token);
    setSesion(token, usuario);
    window.location.href = 'app.html';
  } catch (err) {
    mostrarError('errorLogin', err.message || 'No pudimos iniciar sesión. Revisa tus datos.');
  }
});

formRegistro.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarError('errorRegistro');

  const nombre = document.getElementById('regNombre').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;

  try {
    await apiFetch('/api/usuarios/registro', {
      method: 'POST',
      auth: false,
      body: { nombre, email, password },
    });
    // Registro exitoso → login automático
    const { token } = await apiFetch('/api/usuarios/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    const usuario = await apiFetchConToken('/api/usuarios/me', token);
    setSesion(token, usuario);
    window.location.href = 'app.html';
  } catch (err) {
    mostrarError('errorRegistro', err.message || 'No pudimos crear tu cuenta.');
  }
});

// Variante de apiFetch que usa un token que todavía no está guardado
// (el momento justo después del login/registro, antes de setSesion).
async function apiFetchConToken(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
