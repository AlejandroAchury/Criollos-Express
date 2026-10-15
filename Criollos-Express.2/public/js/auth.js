const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const titulo = document.getElementById('auth-title');
const descripcion = document.getElementById('auth-description');
const errorAuth = document.getElementById('auth-error');
const exitoAuth = document.getElementById('auth-success');

function mostrarFormulario(tipo) {
  const esRegistro = tipo === 'registro';
  formLogin.classList.toggle('hidden', esRegistro);
  formRegister.classList.toggle('hidden', !esRegistro);
  tabLogin.classList.toggle('is-active', !esRegistro);
  tabRegister.classList.toggle('is-active', esRegistro);
  tabLogin.setAttribute('aria-selected', String(!esRegistro));
  tabRegister.setAttribute('aria-selected', String(esRegistro));
  titulo.textContent = esRegistro ? 'Crea tu cuenta' : 'Bienvenido de nuevo';
  descripcion.textContent = esRegistro
    ? 'Registra tu negocio para comenzar a organizar tus pedidos.'
    : 'Ingresa con el correo y la contraseña de tu cuenta.';
  errorAuth.textContent = '';
  exitoAuth.textContent = '';
}

async function enviarFormulario(url, datos) {
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  const resultado = respuesta.status === 204 ? {} : await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo completar la solicitud.');
  return resultado;
}

tabLogin.addEventListener('click', () => mostrarFormulario('login'));
tabRegister.addEventListener('click', () => mostrarFormulario('registro'));

formLogin.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  errorAuth.textContent = '';
  exitoAuth.textContent = '';
  const datos = Object.fromEntries(new FormData(formLogin).entries());

  try {
    await enviarFormulario('/api/auth/login', datos);
    window.location.assign('/');
  } catch (error) {
    errorAuth.textContent = error.message;
  }
});

formRegister.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  errorAuth.textContent = '';
  exitoAuth.textContent = '';
  const datos = Object.fromEntries(new FormData(formRegister).entries());

  try {
    await enviarFormulario('/api/auth/registro', datos);
    window.location.assign('/');
  } catch (error) {
    errorAuth.textContent = error.message;
  }
});

mostrarFormulario(window.location.pathname === '/register' ? 'registro' : 'login');
