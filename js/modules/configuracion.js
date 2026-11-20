import { Api } from "../api.js";
import { Util } from "../util.js";
import { sb } from "../supabase.js";

async function montar(el) {
  const config = await Api.config();

  el.innerHTML = Util.encabezado("Configuración", "Datos del negocio y tu cuenta") + `
    <div class="grid-2">
      <section class="panel">
        <h3>Datos del negocio</h3>
        <form id="form-config">
          ${Util.input("nombre_negocio", "Nombre del negocio", config.nombre_negocio ?? "", "text", "required")}
          ${Util.input("meta", "Meta de ventas (30 días)", config.meta ?? "", "number", 'min="0" step="0.01"')}
          <button class="btn btn-primary" type="submit">Guardar cambios</button>
        </form>
      </section>

      <section class="panel">
        <h3>Cambiar contraseña</h3>
        <form id="form-pass">
          ${Util.input("password", "Nueva contraseña", "", "password", 'minlength="8" required autocomplete="new-password"')}
          <button class="btn" type="submit">Actualizar contraseña</button>
        </form>
      </section>
    </div>`;

  document.getElementById("form-pass").onsubmit = async (e) => {
    e.preventDefault();
    const { password } = Object.fromEntries(new FormData(e.target).entries());
    const { error } = await sb.auth.updateUser({ password });
    if (error) return Util.toast(error.message, "error");
    e.target.reset();
    Util.toast("Contraseña actualizada");
  };

  document.getElementById("form-config").onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    try {
      await Api.guardarConfig({ nombre_negocio: d.nombre_negocio.trim(), meta: Number(d.meta || 0) });
      window.dispatchEvent(new Event("config-cambio"));
      Util.toast("Configuración guardada");
    } catch (err) {
      Util.toast(err.message, "error");
    }
  };
}

export default { montar };
