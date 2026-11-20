import { Api } from "../api.js";
import { Util } from "../util.js";

async function montar(el) {
  const productos = await Api.productos();
  const bajos = productos.filter((p) => p.stock <= p.stock_minimo);

  el.innerHTML = Util.encabezado(
    "Inventario",
    "Existencias, entradas, salidas y alertas de stock",
    `<button class="btn" id="exportar">Exportar CSV</button><button class="btn btn-primary" id="nuevo">+ Nuevo producto</button>`
  ) + `
    <div class="kpis">
      ${Util.kpi("Productos activos", Util.numero(productos.length))}
      ${Util.kpi("Con stock bajo", Util.numero(bajos.length), bajos.length ? "Requieren reposición" : "Todo en orden")}
    </div>
    <section class="panel">
      <div class="toolbar">
        <input id="buscar" type="search" class="search" placeholder="Buscar producto…">
      </div>
      <div class="table-wrap">
        <table class="tabla">
          <thead>
            <tr>
              <th>Producto</th><th>Categoría</th><th class="num">Stock</th><th class="num">Mínimo</th>
              <th>Estado</th><th>Movimiento</th><th></th>
            </tr>
          </thead>
          <tbody id="filas"></tbody>
        </table>
      </div>
    </section>`;

  const pintarFilas = (texto = "") => {
    const lista = productos.filter((p) => p.nombre.toLowerCase().includes(texto.toLowerCase()));
    document.getElementById("filas").innerHTML = lista.length
      ? lista.map((p) => {
          const bajo = p.stock <= p.stock_minimo;
          return `
            <tr>
              <td data-label="Producto"><strong>${Util.esc(p.nombre)}</strong></td>
              <td data-label="Categoría">${Util.esc(p.categoria)}</td>
              <td data-label="Stock" class="num">${Util.numero(p.stock)}</td>
              <td data-label="Mínimo" class="num">${Util.numero(p.stock_minimo)}</td>
              <td data-label="Estado"><span class="badge ${bajo ? "badge-warn" : "badge-ok"}">${bajo ? "Stock bajo" : "Normal"}</span></td>
              <td data-label="Movimiento">
                <div class="inline">
                  <input type="number" min="1" value="1" class="input-sm" id="m-${p.id}">
                  <button class="btn btn-sm" data-mov="${p.id}" data-signo="1">+ Entrada</button>
                  <button class="btn btn-sm" data-mov="${p.id}" data-signo="-1">− Salida</button>
                </div>
              </td>
              <td data-label="">
                <div class="inline">
                  <button class="btn btn-sm btn-ghost" data-editar="${p.id}">Editar</button>
                  <button class="btn btn-sm btn-ghost danger" data-eliminar="${p.id}">Eliminar</button>
                </div>
              </td>
            </tr>`;
        }).join("")
      : `<tr><td colspan="7" class="muted">Sin resultados</td></tr>`;
  };

  const formulario = (p = {}) => `
    ${Util.input("nombre", "Nombre", p.nombre ?? "", "text", "required")}
    ${Util.input("categoria", "Categoría", p.categoria ?? "", "text", "required")}
    <div class="form-grid">
      ${Util.input("precio", "Precio", p.precio ?? "", "number", 'step="0.01" min="0" required')}
      ${Util.input("stock_minimo", "Stock mínimo", p.stock_minimo ?? 0, "number", 'min="0" required')}
    </div>
    ${p.id ? "" : Util.input("stock", "Stock inicial", 0, "number", 'min="0" required')}`;

  const guardar = async (datos, id) => {
    const producto = {
      nombre: datos.nombre.trim(),
      categoria: datos.categoria.trim(),
      precio: Number(datos.precio),
      stock_minimo: Number(datos.stock_minimo)
    };
    if (id) {
      await Api.guardarProducto({ id, ...producto });
    } else {
      await Api.guardarProducto({ ...producto, stock: Number(datos.stock) });
    }
    await montar(el);
  };

  el.onclick = async (e) => {
    const t = e.target.closest("button");
    if (!t) return;

    if (t.id === "exportar") {
      Util.csv("inventario.csv", [
        ["Producto", "Categoría", "Precio", "Stock", "Stock mínimo"],
        ...productos.map((p) => [p.nombre, p.categoria, p.precio, p.stock, p.stock_minimo])
      ]);
      return;
    }

    if (t.id === "nuevo") {
      return Util.modal({
        titulo: "Nuevo producto",
        cuerpo: formulario(),
        onGuardar: (datos) => guardar(datos)
      });
    }

    if (t.dataset.editar) {
      const p = productos.find((x) => x.id === t.dataset.editar);
      return Util.modal({
        titulo: "Editar producto",
        cuerpo: formulario(p),
        onGuardar: (datos) => guardar(datos, p.id)
      });
    }

    if (t.dataset.eliminar) {
      if (!confirm("¿Desactivar este producto? Dejará de aparecer en el POS.")) return;
      try {
        await Api.desactivarProducto(t.dataset.eliminar);
        Util.toast("Producto eliminado");
        await montar(el);
      } catch (err) {
        Util.toast(err.message, "error");
      }
      return;
    }

    if (t.dataset.mov) {
      const cantidad = Number(document.getElementById(`m-${t.dataset.mov}`).value);
      if (!Number.isInteger(cantidad) || cantidad < 1) return Util.toast("Cantidad no válida", "error");
      try {
        await Api.ajustarStock(t.dataset.mov, cantidad * Number(t.dataset.signo));
        Util.toast("Stock actualizado");
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
