const escapes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const graficas = {};

export const Util = {
  colores: ["#1d4ed8", "#3b82f6", "#60a5fa", "#93c5fd", "#cbd5e1", "#94a3b8"],

  esc: (v) => String(v ?? "").replace(/[&<>"']/g, (c) => escapes[c]),

  dinero: (v) =>
    "L " + Number(v || 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),

  numero: (v) => Number(v || 0).toLocaleString("es-HN"),

  fechaISO(d) {
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mes}-${dia}`;
  },

  hoy: () => Util.fechaISO(new Date()),

  hace(dias) {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return Util.fechaISO(d);
  },

  corta(iso) {
    const [, mes, dia] = iso.split("-");
    return `${dia}/${mes}`;
  },

  sumar: (lista, f) => lista.reduce((acc, x) => acc + Number(f(x) || 0), 0),

  ticketsDistintos: (lista) => new Set(lista.map((v) => v.ticket)).size,

  encabezado(titulo, subtitulo, acciones = "") {
    return `
      <div class="page-head">
        <div>
          <h1>${titulo}</h1>
          <p class="muted">${subtitulo}</p>
        </div>
        <div class="inline">${acciones}</div>
      </div>`;
  },

  kpi: (etiqueta, valor, nota = "") => `
    <article class="kpi">
      <span class="kpi-label">${etiqueta}</span>
      <strong class="kpi-value">${valor}</strong>
      ${nota ? `<small class="muted">${nota}</small>` : ""}
    </article>`,

  input: (nombre, etiqueta, valor = "", tipo = "text", extra = "") => `
    <label class="field">${etiqueta}
      <input name="${nombre}" type="${tipo}" value="${Util.esc(valor)}" ${extra}>
    </label>`,

  toast(mensaje, tipo = "ok") {
    const aviso = document.createElement("div");
    aviso.className = "toast" + (tipo === "error" ? " toast-error" : "");
    aviso.textContent = mensaje;
    document.body.appendChild(aviso);
    setTimeout(() => aviso.remove(), 2800);
  },

  modal({ titulo, cuerpo, onGuardar }) {
    const capa = document.createElement("div");
    capa.className = "overlay";
    capa.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <header><h3>${Util.esc(titulo)}</h3><button type="button" class="icon-btn" data-cerrar aria-label="Cerrar">×</button></header>
        <form>
          ${cuerpo}
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" data-cerrar>Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>
      </div>`;

    const cerrar = () => capa.remove();
    capa.querySelectorAll("[data-cerrar]").forEach((b) => (b.onclick = cerrar));
    capa.addEventListener("click", (e) => e.target === capa && cerrar());

    capa.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const boton = e.target.querySelector('button[type="submit"]');
      boton.disabled = true;
      try {
        await onGuardar(Object.fromEntries(new FormData(e.target).entries()));
        cerrar();
        Util.toast("Guardado correctamente");
      } catch (err) {
        Util.toast(err.message, "error");
        boton.disabled = false;
      }
    };

    document.body.appendChild(capa);
    capa.querySelector("input, select")?.focus();
  },

  grafica(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    graficas[id]?.destroy();
    graficas[id] = new Chart(canvas, config);
  },

  destruirGraficas() {
    Object.keys(graficas).forEach((id) => {
      graficas[id].destroy();
      delete graficas[id];
    });
  },

  imprimirTicket({ numero, negocio, items, total, metodo, cliente }) {
    const filas = items.map((i) =>
      `<tr><td>${i.cantidad} x ${Util.esc(i.nombre)}</td><td class="r">${Util.dinero(i.precio * i.cantidad)}</td></tr>`
    ).join("");
    const ventana = window.open("", "_blank", "width=380,height=600");
    if (!ventana) return Util.toast("Permite las ventanas emergentes para imprimir", "error");
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket #${numero}</title>
      <style>
        body { font-family: monospace; width: 72mm; margin: 0 auto; font-size: 12px; }
        h2 { text-align: center; font-size: 15px; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; vertical-align: top; }
        .r { text-align: right; }
        .c { text-align: center; }
        hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        .tot td { font-weight: bold; font-size: 14px; padding-top: 4px; }
      </style></head><body>
      <h2>${Util.esc(negocio)}</h2>
      <p class="c">Ticket #${numero}<br>${new Date().toLocaleString("es-HN")}</p>
      <hr>
      <table>${filas}</table>
      <hr>
      <table><tr class="tot"><td>TOTAL</td><td class="r">${Util.dinero(total)}</td></tr></table>
      <p>Pago: ${Util.esc(metodo)}<br>Cliente: ${Util.esc(cliente || "Público general")}</p>
      <hr>
      <p class="c">¡Gracias por su compra!</p>
      <script>window.onload = () => { window.print(); };<\/script>
      </body></html>`);
    ventana.document.close();
  },

  csv(nombre, filas) {
    const texto = "\uFEFF" + filas
      .map((fila) => fila.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }
};
