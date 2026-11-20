import { Api } from "../api.js";
import { Util } from "../util.js";

async function montar(el) {
  const [proveedores, productos, compras] = await Promise.all([
    Api.proveedores(),
    Api.productos(),
    Api.compras()
  ]);

  const opcionesProveedores = proveedores.map((p) => `<option value="${p.id}">${Util.esc(p.nombre)}</option>`).join("");
  const opcionesProductos = productos.map((p) => `<option value="${p.id}">${Util.esc(p.nombre)}</option>`).join("");

  el.innerHTML = Util.encabezado("Compras y proveedores", "Registra compras para aumentar el stock") + `
    <div class="grid-2">
      <section class="panel">
        <h3>Registrar compra</h3>
        <form id="form-compra">
          <label class="field">Proveedor
            <select name="proveedor_id" required>${opcionesProveedores}</select>
          </label>
          <label class="field">Producto
            <select name="producto_id" required>${opcionesProductos}</select>
          </label>
          <div class="form-grid">
            ${Util.input("cantidad", "Cantidad", 1, "number", 'min="1" step="1" required')}
            ${Util.input("costo", "Costo unitario", "", "number", 'min="0" step="0.01" required')}
          </div>
          <button class="btn btn-primary" type="submit" ${proveedores.length && productos.length ? "" : "disabled"}>
            Registrar compra
          </button>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h3>Proveedores</h3>
          <button class="btn btn-sm" id="nuevo-proveedor">+ Nuevo</button>
        </div>
        <ul class="list">
          ${proveedores.map((p) => `<li><span>${Util.esc(p.nombre)}</span><span class="muted small">${Util.esc(p.telefono || "—")}</span></li>`).join("") || `<li class="muted">Sin proveedores</li>`}
        </ul>
      </section>
    </div>

    <section class="panel">
      <h3>Historial de compras</h3>
      <div class="table-wrap">
        <table class="tabla">
          <thead>
            <tr><th>Fecha</th><th>Proveedor</th><th>Producto</th><th class="num">Cantidad</th><th class="num">Costo</th><th class="num">Total</th></tr>
          </thead>
          <tbody>
            ${compras.map((c) => `
              <tr>
                <td data-label="Fecha">${Util.esc(c.fecha)}</td>
                <td data-label="Proveedor">${Util.esc(c.proveedores?.nombre)}</td>
                <td data-label="Producto">${Util.esc(c.productos?.nombre)}</td>
                <td data-label="Cantidad" class="num">${Util.numero(c.cantidad)}</td>
                <td data-label="Costo" class="num">${Util.dinero(c.costo_unitario)}</td>
                <td data-label="Total" class="num">${Util.dinero(c.total)}</td>
              </tr>`).join("") || `<tr><td colspan="6" class="muted">Sin compras registradas</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>`;

  document.getElementById("form-compra").onsubmit = async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.target).entries());
    try {
      await Api.registrarCompra(datos);
      Util.toast("Compra registrada y stock actualizado");
      await montar(el);
    } catch (err) {
      Util.toast(err.message, "error");
    }
  };

  document.getElementById("nuevo-proveedor").onclick = () =>
    Util.modal({
      titulo: "Nuevo proveedor",
      cuerpo: Util.input("nombre", "Nombre", "", "text", "required") + Util.input("telefono", "Teléfono"),
      onGuardar: async (d) => {
        if (!d.nombre.trim()) throw new Error("El nombre es obligatorio");
        await Api.guardarProveedor({ nombre: d.nombre.trim(), telefono: d.telefono?.trim() || null });
        await montar(el);
      }
    });
}

export default { montar };
