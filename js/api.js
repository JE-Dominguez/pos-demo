import { sb } from "./supabase.js";
import { Util } from "./util.js";

const run = async (promesa) => {
  const { data, error } = await promesa;
  if (error) throw new Error(error.message);
  return data;
};

const SELECT_VENTAS =
  "fecha, hora, ticket, cantidad, precio_unitario, total, metodo_pago, cliente_id, productos(nombre, categoria), clientes(nombre)";

export const Api = {
  async config() {
    const filas = await run(sb.from("configuracion").select("clave, valor"));
    return Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
  },

  guardarConfig: (valores) =>
    run(sb.from("configuracion").upsert(
      Object.entries(valores).map(([clave, valor]) => ({ clave, valor: String(valor) }))
    )),

  async productos({ incluirInactivos = false } = {}) {
    let q = sb.from("productos").select("*").order("nombre");
    if (!incluirInactivos) q = q.eq("activo", true);
    return run(q);
  },

  guardarProducto(p) {
    if (p.id) {
      const { id, ...datos } = p;
      return run(sb.from("productos").update(datos).eq("id", id));
    }
    const { id, ...nuevo } = p;
    return run(sb.from("productos").insert(nuevo));
  },

  desactivarProducto: (id) => run(sb.from("productos").update({ activo: false }).eq("id", id)),

  ajustarStock: (id, delta) => run(sb.rpc("ajustar_stock", { p_producto: id, p_delta: delta })),

  clientes: () => run(sb.from("clientes").select("*").order("nombre")),

  guardarCliente(c) {
    if (c.id) {
      const { id, ...datos } = c;
      return run(sb.from("clientes").update(datos).eq("id", id));
    }
    const { id, ...nuevo } = c;
    return run(sb.from("clientes").insert(nuevo));
  },

  eliminarCliente: (id) => run(sb.from("clientes").delete().eq("id", id)),

  historialClientes: () =>
    run(sb.from("ventas").select("cliente_id, ticket, total").not("cliente_id", "is", null)),

  proveedores: () => run(sb.from("proveedores").select("*").order("nombre")),

  guardarProveedor: (p) => run(sb.from("proveedores").insert(p)),

  compras: () =>
    run(sb.from("compras")
      .select("fecha, cantidad, costo_unitario, total, proveedores(nombre), productos(nombre)")
      .order("created_at", { ascending: false })
      .limit(100)),

  registrarCompra: ({ proveedor_id, producto_id, cantidad, costo }) =>
    run(sb.rpc("registrar_compra", {
      p_proveedor: proveedor_id,
      p_producto: producto_id,
      p_cantidad: Number(cantidad),
      p_costo: Number(costo),
      p_fecha: Util.hoy()
    })),

  registrarVenta({ clienteId, metodo, items }) {
    const ahora = new Date();
    return run(sb.rpc("registrar_venta", {
      p_cliente: clienteId || null,
      p_metodo: metodo,
      p_items: items,
      p_fecha: Util.fechaISO(ahora),
      p_hora: ahora.getHours()
    }));
  },

  async ventasRango(desde, hasta) {
    const paso = 1000;
    const filas = [];
    for (let inicio = 0; ; inicio += paso) {
      const lote = await run(
        sb.from("ventas")
          .select(SELECT_VENTAS)
          .gte("fecha", desde)
          .lte("fecha", hasta)
          .order("fecha", { ascending: false })
          .order("ticket", { ascending: false })
          .order("id", { ascending: true })
          .range(inicio, inicio + paso - 1)
      );
      filas.push(...lote);
      if (lote.length < paso) break;
    }
    return filas;
  }
};
