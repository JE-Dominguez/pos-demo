import { Util } from "./util.js";
import { Api } from "./api.js";
import { sb } from "./supabase.js";
import dashboard from "./modules/dashboard.js";
import pos from "./modules/pos.js";
import inventario from "./modules/inventario.js";
import clientes from "./modules/clientes.js";
import compras from "./modules/compras.js";
import reportes from "./modules/reportes.js";
import configuracion from "./modules/configuracion.js";

const MODULOS = [
  { id: "dashboard", nombre: "Dashboard", modulo: dashboard },
  { id: "pos", nombre: "Punto de venta", modulo: pos },
  { id: "inventario", nombre: "Inventario", modulo: inventario },
  { id: "clientes", nombre: "Clientes", modulo: clientes },
  { id: "compras", nombre: "Compras", modulo: compras },
  { id: "reportes", nombre: "Reportes", modulo: reportes },
  { id: "configuracion", nombre: "Configuración", modulo: configuracion }
];

const main = document.getElementById("app");
const menu = document.getElementById("menu");
const toggle = document.getElementById("menu-toggle");
const salir = document.getElementById("salir");
let logueado = false;

const pintarMenu = (activo) => {
  menu.innerHTML = MODULOS.map((m) =>
    `<a href="#/${m.id}" class="${m.id === activo ? "active" : ""}">${m.nombre}</a>`
  ).join("");
};

const cerrarMenu = () => {
  menu.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
};

const enrutar = async () => {
  if (!logueado) return;
  const id = location.hash.replace(/^#\/?/, "") || "dashboard";
  const actual = MODULOS.find((m) => m.id === id) ?? MODULOS[0];

  pintarMenu(actual.id);
  cerrarMenu();
  Util.destruirGraficas();
  window.scrollTo(0, 0);
  main.onclick = null;
  main.innerHTML = `<p class="muted">Cargando…</p>`;

  try {
    await actual.modulo.montar(main);
  } catch (err) {
    main.innerHTML = `<section class="panel"><h3>No se pudo cargar esta sección</h3><p class="muted">${Util.esc(err.message)}</p></section>`;
  }
};

const actualizarMarca = async () => {
  try {
    const config = await Api.config();
    if (config.nombre_negocio) document.getElementById("nombre-negocio").textContent = config.nombre_negocio;
  } catch {
    /* sin conexión: queda el nombre por defecto */
  }
};

toggle.onclick = () => {
  const abierto = menu.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(abierto));
};

const mostrarLogin = () => {
  logueado = false;
  salir.hidden = true;
  menu.innerHTML = "";
  Util.destruirGraficas();
  main.onclick = null;
  main.innerHTML = `
    <section class="panel login">
      <h1>Iniciar sesión</h1>
      <p class="muted">Acceso solo para el administrador.</p>
      <form id="login-form">
        <label class="field">Correo<input name="email" type="email" required autocomplete="username"></label>
        <label class="field">Contraseña<input name="password" type="password" required autocomplete="current-password"></label>
        <button class="btn btn-primary btn-block" type="submit">Entrar</button>
      </form>
    </section>`;

  document.getElementById("login-form").onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    const { error } = await sb.auth.signInWithPassword({ email: d.email.trim(), password: d.password });
    if (error) Util.toast("Correo o contraseña incorrectos", "error");
  };
};

salir.onclick = async () => {
  const { error } = await sb.auth.signOut({ scope: "local" });
  if (error) Util.toast(error.message, "error");
  mostrarLogin();
};

sb.auth.onAuthStateChange((_evento, session) => {
  if (session) {
    if (logueado) return;
    logueado = true;
    salir.hidden = false;
    // Se ejecuta fuera del evento de Supabase para evitar que se bloquee
    setTimeout(() => {
      actualizarMarca();
      enrutar();
    }, 0);
  } else {
    mostrarLogin();
  }
});

window.addEventListener("hashchange", enrutar);
window.addEventListener("config-cambio", actualizarMarca);


