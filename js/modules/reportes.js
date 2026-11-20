import { Api } from "../api.js";
import { Util } from "../util.js";

async function montar(el) {
  el.innerHTML = Util.encabezado(
    "Reportes",
    "Ventas por rango de fechas",
    `<button class="btn" id="exportar">Exportar CSV</button>`
  ) + `
    <section class="panel">
      <div class="toolbar">
        <label class="field">Desde<input type="date" id="desde" value="${Util.hace(29)}"></label>
        <label class="field">Hasta<input type="date" id="hasta" value="${Util.hoy()}"></label>
        <button class="btn btn-primary" id="consultar">Consultar</button>
      </div>
    </section>
    <div class="kpis" id="kpis"></div>
    <div class="grid-2">
      <section class="panel"><h3>Por producto</h3><div id="por-producto"></div></section>
      <section class="panel"><h3>Por método de pago</h3><div id="por-metodo"></div></section>
    </div>
    <section class="panel">
      <h3>Detalle de ventas</h3>
      <div class="table-wrap" id="detalle"></div>
    </section>`;

  let filas = [];

  const pintar = () => {
    const total = Util.sumar(filas, (f) => f.total);
    const tickets = Util.ticketsDistintos(filas);

    document.getElementById("kpis").innerHTML = [
      Util.kpi("Ventas", Util.dinero(total)),
      Util.kpi("Tickets", Util.numero(tickets)),
      Util.kpi("Líneas vendidas", Util.numero(filas.length)),
      Util.kpi("Ticket promedio", Util.dinero(tickets ? total / tickets : 0))
    ].join("");

    const porProducto = {};
    filas.forEach((f) => {
      const n = f.productos?.nombre ?? "—";
      porProducto[n] ??= { uds: 0, monto: 0 };
      porProducto[n].uds += f.cantidad;
      porProducto[n].monto += Number(f.total);
    });
    const listaProductos = Object.entries(porProducto).sort((a, b) => b[1].monto - a[1].monto);
    document.getElementById("por-producto").innerHTML = listaProductos.length
      ? `<ul class="list">${listaProductos.map(([n, d]) =>
          `<li><span>${Util.esc(n)} <small class="muted">· ${Util.numero(d.uds)} uds</small></span><strong>${Util.dinero(d.monto)}</strong></li>`
        ).join("")}</ul>`
      : `<p class="muted">Sin datos en este rango.</p>`;

    const porMetodo = {};
    filas.forEach((f) => { porMetodo[f.metodo_pago] = (porMetodo[f.metodo_pago] || 0) + Number(f.total); });
    const listaMetodos = Object.entries(porMetodo).sort((a, b) => b[1] - a[1]);
    document.getElementById("por-metodo").innerHTML = listaMetodos.length
      ? `<ul class="list">${listaMetodos.map(([m, monto]) =>
          `<li><span>${Util.esc(m)}</span><strong>${Util.dinero(monto)}</strong></li>`
        ).join("")}</ul>`
      : `<p class="muted">Sin datos en este rango.</p>`;

    const visibles = filas.slice(0, 200);
    document.getElementById("detalle").innerHTML = filas.length
      ? `<table class="tabla">
          <thead><tr><th>Fecha</th><th>Ticket</th><th>Producto</th><th>Cliente</th><th class="num">Cant.</th><th class="num">Total</th><th>Pago</th></tr></thead>
          <tbody>${visibles.map((f) => `
            <tr>
              <td data-label="Fecha">${Util.esc(f.fecha)} <small class="muted">${String(f.hora).padStart(2, "0")}:00</small></td>
              <td data-label="Ticket">#${f.ticket}</td>
              <td data-label="Producto">${Util.esc(f.productos?.nombre)}</td>
              <td data-label="Cliente">${Util.esc(f.clientes?.nombre ?? "Público general")}</td>
              <td data-label="Cant." class="num">${f.cantidad}</td>
              <td data-label="Total" class="num">${Util.dinero(f.total)}</td>
              <td data-label="Pago">${Util.esc(f.metodo_pago)}</td>
            </tr>`).join("")}</tbody>
        </table>
        ${filas.length > 200 ? `<p class="muted small">Mostrando 200 de ${Util.numero(filas.length)} líneas. Exporta el CSV para ver todas.</p>` : ""}`
      : `<p class="muted">Sin ventas en este rango.</p>`;
  };

  const consultar = async () => {
    const desde = document.getElementById("desde").value;
    const hasta = document.getElementById("hasta").value;
    if (!desde || !hasta || desde > hasta) return Util.toast("Revisa el rango de fechas", "error");
    try {
      filas = await Api.ventasRango(desde, hasta);
      pintar();
    } catch (err) {
      Util.toast(err.message, "error");
    }
  };

  el.onclick = (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.id === "consultar") consultar();
    if (t.id === "exportar") {
      const desde = document.getElementById("desde").value;
      const hasta = document.getElementById("hasta").value;
      Util.csv(`ventas_${desde}_${hasta}.csv`, [
        ["Fecha", "Hora", "Ticket", "Producto", "Categoría", "Cliente", "Cantidad", "Precio", "Total", "Método"],
        ...filas.map((f) => [
          f.fecha, f.hora, f.ticket, f.productos?.nombre, f.productos?.categoria,
          f.clientes?.nombre ?? "Público general", f.cantidad, f.precio_unitario, f.total, f.metodo_pago
        ])
      ]);
    }
  };

  await consultar();
}

export default { montar };
