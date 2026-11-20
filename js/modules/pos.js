import { Api } from "../api.js";
import { Util } from "../util.js";

const METODOS = ["Efectivo", "Tarjeta", "Transferencia", "Billetera digital"];

async function montar(el) {
  const estado = {
    productos: [],
    clientes: [],
    carrito: [],
    categoria: "Todas",
    buscar: "",
    clienteId: "",
    metodo: METODOS[0]
  };

  el.innerHTML = Util.encabezado("Punto de venta", "Selecciona productos, arma el ticket y cobra") + `
    <div class="pos">
      <section class="panel">
        <input id="buscar" type="search" class="search" placeholder="Buscar producto…" style="margin-bottom:4px">
        <div class="chips" id="chips"></div>
        <div class="product-grid" id="grid"></div>
      </section>
      <aside class="panel cart">
        <h3>Ticket</h3>
        <div class="cart-items" id="carrito"></div>
        <label class="field">Cliente
          <select id="cliente"></select>
        </label>
        <label class="field">Método de pago
          <select id="metodo">${METODOS.map((m) => `<option>${m}</option>`).join("")}</select>
        </label>
        <div class="cart-total"><span>Total</span><strong id="total">L 0.00</strong></div>
        <button class="btn btn-primary btn-block" id="cobrar">Cobrar</button>
        <button class="btn btn-ghost btn-block" id="vaciar">Vaciar ticket</button>
      </aside>
    </div>`;

  const $ = (id) => document.getElementById(id);
  const total = () => estado.carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

  const cargar = async () => {
    [estado.productos, estado.clientes] = await Promise.all([Api.productos(), Api.clientes()]);
    $("cliente").innerHTML = `<option value="">Público general</option>` +
      estado.clientes.map((c) => `<option value="${c.id}">${Util.esc(c.nombre)}</option>`).join("");
    $("cliente").value = estado.clienteId;
    $("metodo").value = estado.metodo;
  };

  const pintar = () => {
    const categorias = ["Todas", ...new Set(estado.productos.map((p) => p.categoria))];
    $("chips").innerHTML = categorias.map((c) =>
      `<button class="chip ${c === estado.categoria ? "active" : ""}" data-cat="${Util.esc(c)}">${Util.esc(c)}</button>`
    ).join("");

    const texto = estado.buscar.toLowerCase();
    const visibles = estado.productos.filter((p) =>
      p.stock > 0 &&
      (estado.categoria === "Todas" || p.categoria === estado.categoria) &&
      p.nombre.toLowerCase().includes(texto)
    );

    $("grid").innerHTML = visibles.length
      ? visibles.map((p) => `
          <button class="product-card" data-add="${p.id}">
            <span class="cat">${Util.esc(p.categoria)}</span>
            <strong>${Util.esc(p.nombre)}</strong>
            <span class="price">${Util.dinero(p.precio)}</span>
            <small class="muted">Stock ${Util.numero(p.stock)}</small>
          </button>`).join("")
      : `<p class="muted">No hay productos con stock para este filtro.</p>`;

    $("carrito").innerHTML = estado.carrito.length
      ? estado.carrito.map((i) => `
          <div class="cart-row">
            <div class="cart-name">
              <strong>${Util.esc(i.nombre)}</strong>
              <small class="muted">${Util.dinero(i.precio)} c/u</small>
            </div>
            <strong class="subtotal">${Util.dinero(i.precio * i.cantidad)}</strong>
            <div class="qty">
              <button data-qty="${i.productoId}" data-d="-1" aria-label="Quitar uno">−</button>
              <span>${i.cantidad}</span>
              <button data-qty="${i.productoId}" data-d="1" aria-label="Agregar uno">+</button>
            </div>
            <button class="icon-btn" data-quitar="${i.productoId}" aria-label="Quitar producto">×</button>
          </div>`).join("")
      : `<p class="muted">Sin productos en el ticket.</p>`;

    $("total").textContent = Util.dinero(total());
    $("cobrar").disabled = !estado.carrito.length;
  };

  const agregar = (id) => {
    const producto = estado.productos.find((p) => p.id === id);
    if (!producto) return;
    const item = estado.carrito.find((i) => i.productoId === id);
    const actual = item ? item.cantidad : 0;
    if (actual + 1 > producto.stock) return Util.toast("No hay más stock disponible", "error");
    if (item) item.cantidad++;
    else estado.carrito.push({ productoId: id, nombre: producto.nombre, precio: Number(producto.precio), cantidad: 1 });
    pintar();
  };

  const cambiarCantidad = (id, delta) => {
    const item = estado.carrito.find((i) => i.productoId === id);
    if (!item) return;
    const producto = estado.productos.find((p) => p.id === id);
    const nueva = item.cantidad + delta;
    if (nueva <= 0) {
      estado.carrito = estado.carrito.filter((i) => i.productoId !== id);
    } else if (producto && nueva > producto.stock) {
      return Util.toast("No hay más stock disponible", "error");
    } else {
      item.cantidad = nueva;
    }
    pintar();
  };

  const negocio = (await Api.config()).nombre_negocio || "Punto de venta";

  const cobrar = async (boton) => {
    boton.disabled = true;
    const snapshot = {
      items: estado.carrito.map((i) => ({ ...i })),
      total: total(),
      metodo: estado.metodo,
      cliente: estado.clientes.find((c) => c.id === estado.clienteId)?.nombre
    };
    try {
      const ticket = await Api.registrarVenta({
        clienteId: estado.clienteId,
        metodo: estado.metodo,
        items: estado.carrito.map((i) => ({ producto_id: i.productoId, cantidad: i.cantidad }))
      });
      Util.toast(`Venta #${ticket} registrada`);
      Util.imprimirTicket({ numero: ticket, negocio, ...snapshot });
      estado.carrito = [];
      estado.clienteId = "";
      await cargar();
      pintar();
    } catch (err) {
      Util.toast(err.message, "error");
      boton.disabled = false;
    }
  };

  el.onclick = (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.add) agregar(t.dataset.add);
    else if (t.dataset.cat) { estado.categoria = t.dataset.cat; pintar(); }
    else if (t.dataset.qty) cambiarCantidad(t.dataset.qty, Number(t.dataset.d));
    else if (t.dataset.quitar) { estado.carrito = estado.carrito.filter((i) => i.productoId !== t.dataset.quitar); pintar(); }
    else if (t.id === "cobrar") cobrar(t);
    else if (t.id === "vaciar") { estado.carrito = []; pintar(); }
  };

  $("buscar").oninput = (e) => { estado.buscar = e.target.value; pintar(); };
  $("cliente").onchange = (e) => { estado.clienteId = e.target.value; };
  $("metodo").onchange = (e) => { estado.metodo = e.target.value; };

  await cargar();
  pintar();
}

export default { montar };
