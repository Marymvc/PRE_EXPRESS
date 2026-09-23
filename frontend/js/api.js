// --- Sesión ------------------------------------------------------
function getToken() {
  return localStorage.getItem('pe_token');
}

function setSesion(token, usuario) {
  localStorage.setItem('pe_token', token);
  localStorage.setItem('pe_usuario', JSON.stringify(usuario));
}

function getUsuario() {
  const raw = localStorage.getItem('pe_usuario');
  return raw ? JSON.parse(raw) : null;
}

function cerrarSesion() {
  localStorage.removeItem('pe_token');
  localStorage.removeItem('pe_usuario');
  window.location.href = 'index.html';
}

function exigirSesion() {
  if (!getToken()) {
    window.location.href = 'index.html';
  }
}

// Headers comunes (incluye skip de ngrok por si lo usas más adelante)
function headersBase(auth = true) {
  const h = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (auth) h.Authorization = `Bearer ${getToken()}`;
  return h;
}

// --- REST (ms-usuarios, ms-items, vía Gateway) --------------------
async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: headersBase(auth),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      cerrarSesion();
      return;
    }
    throw new Error(data.error || `Error ${res.status}`);
  }

  return data;
}

// --- GraphQL (ms-presupuestos, vía Gateway) -----------------------
async function graphqlFetch(query, variables) {
  const res = await fetch(`${API_BASE}/graphql`, {
    method: 'POST',
    headers: headersBase(true),
    body: JSON.stringify({ query, variables }),
  });

  const payload = await res.json();

  if (payload.errors && payload.errors.length) {
    if (payload.errors[0].extensions?.code === 'UNAUTHENTICATED') {
      cerrarSesion();
      return;
    }
    throw new Error(payload.errors[0].message);
  }

  return payload.data;
}