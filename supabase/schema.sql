-- =====================================================================
-- Sistema POS · Esquema para Supabase
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- =====================================================================

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null,
  precio numeric(12,2) not null check (precio >= 0),
  stock integer not null default 0,
  stock_minimo integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  created_at timestamptz not null default now()
);

create sequence if not exists ticket_seq;

create table if not exists ventas (
  id bigint generated always as identity primary key,
  ticket integer not null,
  fecha date not null,
  hora smallint not null,
  cliente_id uuid references clientes(id) on delete set null,
  producto_id uuid not null references productos(id),
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null,
  total numeric(12,2) not null,
  metodo_pago text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ventas_fecha on ventas(fecha);
create index if not exists idx_ventas_ticket on ventas(ticket);

create table if not exists compras (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  proveedor_id uuid not null references proveedores(id),
  producto_id uuid not null references productos(id),
  cantidad integer not null check (cantidad > 0),
  costo_unitario numeric(12,2) not null,
  total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists configuracion (
  clave text primary key,
  valor text not null
);

-- ---------------------------------------------------------------------
-- Funciones: toda operación que mueve stock corre en una transacción
-- ---------------------------------------------------------------------

create or replace function registrar_venta(
  p_cliente uuid,
  p_metodo text,
  p_items jsonb,
  p_fecha date,
  p_hora int
) returns integer
language plpgsql
as $$
declare
  v_ticket integer := nextval('ticket_seq');
  it jsonb;
  v_prod productos%rowtype;
  v_cant integer;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El ticket está vacío';
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    v_cant := (it->>'cantidad')::int;
    if v_cant is null or v_cant <= 0 then
      raise exception 'Cantidad no válida';
    end if;

    select * into v_prod from productos where id = (it->>'producto_id')::uuid for update;
    if not found or not v_prod.activo then
      raise exception 'Producto no disponible';
    end if;
    if v_prod.stock < v_cant then
      raise exception 'Stock insuficiente de %', v_prod.nombre;
    end if;

    insert into ventas (ticket, fecha, hora, cliente_id, producto_id, cantidad,
                        precio_unitario, total, metodo_pago)
    values (v_ticket, p_fecha, p_hora, p_cliente, v_prod.id, v_cant,
            v_prod.precio, v_prod.precio * v_cant, p_metodo);

    update productos set stock = stock - v_cant where id = v_prod.id;
  end loop;

  return v_ticket;
end;
$$;

create or replace function registrar_compra(
  p_proveedor uuid,
  p_producto uuid,
  p_cantidad int,
  p_costo numeric,
  p_fecha date
) returns void
language plpgsql
as $$
begin
  if p_cantidad <= 0 then
    raise exception 'Cantidad no válida';
  end if;

  insert into compras (fecha, proveedor_id, producto_id, cantidad, costo_unitario, total)
  values (p_fecha, p_proveedor, p_producto, p_cantidad, p_costo, p_cantidad * p_costo);

  update productos set stock = stock + p_cantidad where id = p_producto;
end;
$$;

create or replace function ajustar_stock(p_producto uuid, p_delta int)
returns void
language plpgsql
as $$
declare
  v_stock integer;
begin
  select stock into v_stock from productos where id = p_producto for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;
  if v_stock + p_delta < 0 then
    raise exception 'El stock no puede ser negativo';
  end if;
  update productos set stock = stock + p_delta where id = p_producto;
end;
$$;

-- ---------------------------------------------------------------------
-- Seguridad (RLS)
-- Por defecto permite acceso con la clave anon (adecuado para uso
-- interno o pruebas). Para producción, cambia estas políticas por
-- "to authenticated" y agrega inicio de sesión con Supabase Auth.
-- ---------------------------------------------------------------------

alter table productos enable row level security;
alter table clientes enable row level security;
alter table proveedores enable row level security;
alter table ventas enable row level security;
alter table compras enable row level security;
alter table configuracion enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['productos','clientes','proveedores','ventas','compras','configuracion'] loop
    execute format('drop policy if exists "acceso_total" on %I', t);
    execute format('create policy "acceso_total" on %I for all to anon, authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to anon, authenticated', t);
  end loop;
end $$;

grant usage, select on sequence ticket_seq to anon, authenticated;
