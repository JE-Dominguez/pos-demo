import { Api } from "../api.js";
import { Util } from "../util.js";

async function montar(el) {
  const [clientes, historial] = await Promise.all([Api.clientes(), Api.historialClientes()]);

  const stats = {};
  historial.forEach((v) => {
    const s = (stats[v.cliente_id] ??= { tickets: new Set(), gastado: 0 });
    s.tickets.add(v.ticket);
    s.gastado += Number(v.total);
  });

  el.innerHTML = Util.encabezado(
    "Clientes",
    "Directorio y historial de compras",
    `<button class="btn" id="exportar">Exportar CSV</button><button class="btn btn-primary" id="nuevo">+ Nuevo cliente</button>`
  ) + `
    <section class="panel">
      <div class="toolbar"><input id="buscar" type="search" class="search" placeholder="Buscar cliente…"></div>
      <div class="table-wrap">
        <table class="tabla">
          <thead>
            <tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th class="num">Compras</th><th class="num">Gastado</th><th></th></tr>
          </thead>
          <tbody id="filas"></tbody>
        </table>
      </div>
    </section>`;

  const pintarFilas = (texto = "") => {
    const lista = clientes.filter((c) => c.nombre.toLowerCase().includes(texto.toLowerCase()));
    document.getElementById("filas").innerHTML = lista.length
      ? lista.map((c) => {
          const s = stats[c.id];
          return `
            <tr>
              <td data-label="Nombre"><strong>${Util.esc(c.nombre)}</strong></td>
              <td data-label="Teléfono">${Util.esc(c.telefono || "—")}</td>
              <td data-label="Correo">${Util.esc(c.email || "—")}</td>
              <td data-label="Compras" class="num">${s ? s.tickets.size : 0}</td>
              <td data-label="Gastado" class="num">${Util.dinero(s ? s.gastado : 0)}</td>
              <td data-label="">
                <div class="inline">
                  <button class="btn btn-sm btn-ghost" data-editar="${c.id}">Editar</button>
                  <button class="btn btn-sm btn-ghost danger" data-eliminar="${c.id}">Eliminar</button>
                </div>
              </td>
            </tr>`;
        }).join("")
      : `<tr><td colspan="6" class="muted">Sin resultados</td></tr>`;
  };

  const formulario = (c = {}) => `
    ${Util.input("nombre", "Nombre", c.nombre ?? "", "text", "required")}
    ${Util.input("telefono", "Teléfono", c.telefono ?? "")}
    ${Util.input("email", "Correo", c.email ?? "", "email")}`;

  const guardar = async (datos, id) => {
    if (!datos.nombre.trim()) throw new Error("El nombre es obligatorio");
    await Api.guardarCliente({
      id,
      nombre: datos.nombre.trim(),
      telefono: datos.telefono?.trim() || null,
      email: datos.email?.trim() || null
    });
    await montar(el);
  };

  el.onclick = async (e) => {
    const t = e.target.closest("button");
    if (!t) return;

    if (t.id === "exportar") {
      Util.csv("clientes.csv", [
        ["Nombre", "Teléfono", "Correo", "Compras", "Gastado"],
        ...clientes.map((c) => [c.nombre, c.telefono, c.email, stats[c.id]?.tickets.size ?? 0, stats[c.id]?.gastado ?? 0])
      ]);
      return;
    }

    if (t.id === "nuevo") {
      return Util.modal({ titulo: "Nuevo cliente", cuerpo: formulario(), onGuardar: (d) => guardar(d) });
    }

    if (t.dataset.editar) {
      const c = clientes.find((x) => x.id === t.dataset.editar);
      return Util.modal({
        titulo: "Editar cliente",
        cuerpo: formulario(c),
        onGuardar: (d) => guardar(d, c.id)
      });
    }

    if (t.dataset.eliminar) {
      if (!confirm("¿Eliminar este cliente? Sus ventas se conservan como público general.")) return;
      try {
        await Api.eliminarCliente(t.dataset.eliminar);
        Util.toast("Cliente eliminado");
        await montar(el);
      } catch (err) {
        Util.toast(err.message, "error");
      }
    }
  };

  document.getElementById("buscar").oninput = (e) => pintarFilas(e.target.value);
  pintarFilas();
}

export default { montar };
