import { Api } from "../api.js";
import { Util } from "../util.js";

const PERIODOS = [
  { dias: 7, texto: "Últimos 7 días" },
  { dias: 30, texto: "Últimos 30 días" },
  { dias: 90, texto: "Últimos 90 días" }
];

async function cargar(el, dias) {
  const [config, ventas, productos] = await Promise.all([
    Api.config(),
    Api.ventasRango(Util.hace(dias - 1), Util.hoy()),
    Api.productos()
  ]);

  const hoy = Util.hoy();
  const delHoy = ventas.filter((v) => v.fecha === hoy);
  const total = Util.sumar(ventas, (v) => v.total);
  const tickets = Util.ticketsDistintos(ventas);
  const meta = Number(config.meta || 0) * (dias / 30);
  const avance = meta ? (total / meta) * 100 : 0;

  document.getElementById("kpis").innerHTML = [
    Util.kpi("Ventas de hoy", Util.dinero(Util.sumar(delHoy, (v) => v.total)), `${Util.ticketsDistintos(delHoy)} tickets`),
    Util.kpi(`Ventas ${dias} días`, Util.dinero(total), `${Util.numero(tickets)} tickets`),
    Util.kpi("Ticket promedio", Util.dinero(tickets ? total / tickets : 0)),
    Util.kpi("Avance de meta", avance.toFixed(1) + "%", meta ? `Meta ${Util.dinero(meta)}` : "Define una meta en Configuración")
  ].join("");

  const fechas = [];
  for (let i = dias - 1; i >= 0; i--) fechas.push(Util.hace(i));
  const porDia = Object.fromEntries(fechas.map((f) => [f, 0]));
  ventas.forEach((v) => { porDia[v.fecha] = (porDia[v.fecha] || 0) + Number(v.total); });

  Util.grafica("g-ingresos", {
    type: "line",
    data: {
      labels: fechas.map(Util.corta),
      datasets: [{
        label: "Ingresos",
        data: fechas.map((f) => porDia[f]),
        borderColor: Util.colores[0],
        backgroundColor: "rgba(29,78,216,.08)",
        fill: true,
        tension: 0.3,
        pointRadius: dias > 30 ? 0 : 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => Util.numero(v) } } }
    }
  });

  const metodos = {};
  ventas.forEach((v) => { metodos[v.metodo_pago] = (metodos[v.metodo_pago] || 0) + Number(v.total); });
  const etiquetas = Object.keys(metodos);
  Util.grafica("g-metodos", {
    type: "doughnut",
    data: { labels: etiquetas, datasets: [{ data: etiquetas.map((k) => metodos[k]), backgroundColor: Util.colores }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom" } } }
  });

  const mapa = {};
  ventas.forEach((v) => {
    const nombre = v.productos?.nombre ?? "—";
    mapa[nombre] ??= { unidades: 0, ingreso: 0 };
    mapa[nombre].unidades += v.cantidad;
    mapa[nombre].ingreso += Number(v.total);
  });
  const top = Object.entries(mapa).sort((a, b) => b[1].ingreso - a[1].ingreso).slice(0, 5);
  document.getElementById("top").innerHTML = top.length
    ? `<ul class="list">${top.map(([nombre, d], i) => `
        <li><span><span class="rank">${i + 1}</span>${Util.esc(nombre)} <small class="muted">· ${Util.numero(d.unidades)} uds</small></span>
        <strong>${Util.dinero(d.ingreso)}</strong></li>`).join("")}</ul>`
    : `<p class="muted">Aún no hay ventas en este periodo.</p>`;

  const bajo = productos.filter((p) => p.stock <= p.stock_minimo);
  document.getElementById("bajo").innerHTML = bajo.length
    ? `<ul class="list">${bajo.map((p) => `
        <li><span>${Util.esc(p.nombre)}</span><span class="badge badge-warn">${p.stock} / mín. ${p.stock_minimo}</span></li>`).join("")}</ul>`
    : `<p class="muted">Todo en orden.</p>`;
}

async function montar(el) {
  el.innerHTML = Util.encabezado(
    "Dashboard",
    "Resumen de ventas",
    `<select id="periodo">${PERIODOS.map((p) => `<option value="${p.dias}" ${p.dias === 30 ? "selected" : ""}>${p.texto}</option>`).join("")}</select>`
  ) + `
    <div class="kpis" id="kpis"></div>
    <div class="grid-main">
      <section class="panel"><h3>Ingresos diarios</h3><div class="chart-box"><canvas id="g-ingresos"></canvas></div></section>
      <section class="panel"><h3>Métodos de pago</h3><div class="chart-box"><canvas id="g-metodos"></canvas></div></section>
    </div>
    <div class="grid-2">
      <section class="panel"><h3>Productos más vendidos</h3><div id="top"></div></section>
      <section class="panel"><h3>Stock bajo</h3><div id="bajo"></div></section>
    </div>`;

  document.getElementById("periodo").onchange = (e) => cargar(el, Number(e.target.value));
  await cargar(el, 30);
}

export default { montar };
