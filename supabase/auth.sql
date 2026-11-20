-- =====================================================================
-- Acceso solo para usuarios autenticados (un único administrador)
-- Ejecutar en: Supabase → SQL Editor → Run (después de schema.sql)
-- =====================================================================

-- 1. Quitar acceso al rol anónimo en tablas
do $$
declare
  t text;
begin
  foreach t in array array['productos','clientes','proveedores','ventas','compras','configuracion'] loop
    execute format('drop policy if exists "acceso_total" on %I', t);
    execute format('create policy "acceso_total" on %I for all to authenticated using (true) with check (true)', t);
    execute format('revoke all on %I from anon', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

revoke all on sequence ticket_seq from anon;
grant usage, select on sequence ticket_seq to authenticated;

-- 2. Funciones: solo usuarios autenticados
revoke execute on function registrar_venta(uuid, text, jsonb, date, int) from public, anon;
revoke execute on function registrar_compra(uuid, uuid, int, numeric, date) from public, anon;
revoke execute on function ajustar_stock(uuid, int) from public, anon;
grant execute on function registrar_venta(uuid, text, jsonb, date, int) to authenticated;
grant execute on function registrar_compra(uuid, uuid, int, numeric, date) to authenticated;
grant execute on function ajustar_stock(uuid, int) to authenticated;
