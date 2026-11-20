-- =====================================================================
-- DATOS DE DEMO COMPLETOS (versión 2)
-- Incluye: 22 productos en 5 categorías, 15 clientes, 5 proveedores,
-- 12 compras, configuración y 90 días de ventas (15 a 40 tickets por día).
--
-- Ejecutar DESPUÉS de schema.sql y auth.sql.
-- ATENCIÓN: borra los datos existentes en estas tablas.
-- No crea tablas nuevas ni cambia la estructura.
-- =====================================================================

truncate ventas, compras, productos, clientes, proveedores, configuracion
  restart identity cascade;

-- ---------------------------------------------------------------------
-- Productos (stock y mínimo variados para que se vean alertas)
-- ---------------------------------------------------------------------
insert into productos (nombre, categoria, precio, stock, stock_minimo) values
  -- Bebidas
  ('Café americano',       'Bebidas',   50.00, 180, 40),
  ('Capuchino',            'Bebidas',   70.00, 150, 40),
  ('Latte de vainilla',    'Bebidas',   75.00, 120, 35),
  ('Jugo natural',         'Bebidas',   60.00,  12, 30),
  ('Agua embotellada',     'Bebidas',   25.00, 200, 50),
  ('Té helado',            'Bebidas',   45.00,  90, 25),
  -- Comida
  ('Sándwich de pollo',    'Comida',    90.00,  60, 25),
  ('Ensalada César',       'Comida',   100.00,  18, 20),
  ('Wrap de atún',         'Comida',    85.00,  45, 15),
  ('Hamburguesa clásica',  'Comida',   120.00,  30, 15),
  ('Sopa del día',         'Comida',    80.00,  25, 12),
  -- Panadería
  ('Croissant',            'Panadería', 35.00,  90, 30),
  ('Muffin de arándano',   'Panadería', 40.00,  70, 25),
  ('Pan de queso',         'Panadería', 30.00,  55, 20),
  ('Dona glaseada',        'Panadería', 30.00,   8, 20),
  -- Postres
  ('Pastel de chocolate',  'Postres',   80.00,   9, 10),
  ('Cheesecake',           'Postres',   95.00,  14, 10),
  ('Galleta de avena',     'Postres',   25.00, 110, 30),
  -- Snacks
  ('Papas artesanales',    'Snacks',    45.00,  75, 20),
  ('Nueces mixtas',        'Snacks',    60.00,  40, 15),
  ('Barra de granola',     'Snacks',    35.00,   6, 15),
  ('Galleta de mantequilla','Snacks',   20.00, 130, 40);

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
insert into clientes (nombre, telefono, email) values
  ('Ana Pérez',         '9999-1111', 'ana@mail.com'),
  ('Luis Mejía',        '9999-2222', null),
  ('María Castro',      '9999-3333', 'maria@mail.com'),
  ('Carlos Lara',       '9999-4444', null),
  ('Sofía Reyes',       '9999-5555', 'sofia@mail.com'),
  ('Jorge Euceda',      '9999-6666', null),
  ('Daniela Flores',    '9999-7777', 'daniela@mail.com'),
  ('Roberto Sierra',    '9999-8888', null),
  ('Patricia Núñez',    '9999-9001', 'patricia@mail.com'),
  ('Eduardo Membreño',  '9999-9002', null),
  ('Valeria Orellana',  '9999-9003', 'valeria@mail.com'),
  ('Miguel Rivera',     '9999-9004', null),
  ('Andrea Zelaya',     '9999-9005', 'andrea@mail.com'),
  ('Fernando Bustillo', '9999-9006', null),
  ('Gabriela Madrid',   '9999-9007', 'gabriela@mail.com');

-- ---------------------------------------------------------------------
-- Proveedores
-- ---------------------------------------------------------------------
insert into proveedores (nombre, telefono) values
  ('Distribuidora Central', '2222-1111'),
  ('Panadería El Trigo',    '2222-2222'),
  ('Bebidas del Valle',     '2222-3333'),
  ('Lácteos La Granja',     '2222-4444'),
  ('Snacks y Más',          '2222-5555');

-- ---------------------------------------------------------------------
-- Compras (fechas repartidas en los últimos 90 días)
-- ---------------------------------------------------------------------
insert into compras (fecha, proveedor_id, producto_id, cantidad, costo_unitario, total)
select current_date - x.dias, p.id, pr.id, x.cant, x.costo, x.cant * x.costo
from (values
  (85, 'Bebidas del Valle',     'Café americano',        200, 30),
  (80, 'Lácteos La Granja',     'Capuchino',             150, 35),
  (72, 'Panadería El Trigo',    'Croissant',             150, 20),
  (66, 'Distribuidora Central', 'Sándwich de pollo',     100, 55),
  (60, 'Bebidas del Valle',     'Jugo natural',          120, 30),
  (52, 'Panadería El Trigo',    'Dona glaseada',         120, 15),
  (45, 'Distribuidora Central', 'Hamburguesa clásica',    80, 65),
  (38, 'Lácteos La Granja',     'Cheesecake',             60, 50),
  (30, 'Snacks y Más',          'Papas artesanales',     90, 22),
  (21, 'Snacks y Más',          'Barra de granola',      80, 18),
  (12, 'Bebidas del Valle',     'Agua embotellada',     200, 12),
  (4,  'Panadería El Trigo',    'Pastel de chocolate',   50, 40)
) as x(dias, proveedor, producto, cant, costo)
join proveedores p on p.nombre = x.proveedor
join productos pr on pr.nombre = x.producto;

-- ---------------------------------------------------------------------
-- Configuración
-- ---------------------------------------------------------------------
insert into configuracion (clave, valor) values
  ('nombre_negocio', 'Café Demo'),
  ('meta', '180000');

-- ---------------------------------------------------------------------
-- Ventas: 90 días, 15 a 40 tickets por día, 1 a 3 líneas por ticket
-- ---------------------------------------------------------------------
do $$
declare
  d int;
  t int;
  l int;
  v_ticket int;
  v_fecha date;
  v_hora int;
  v_metodo text;
  v_cliente uuid;
  v_prod record;
  v_cant int;
begin
  for d in 0..89 loop
    v_fecha := current_date - d;

    -- Más ventas en fines de semana
    for t in 1..(15 + floor(random() * 26) + case when extract(isodow from v_fecha) >= 6 then 8 else 0 end)::int loop
      v_ticket := nextval('ticket_seq');
      v_hora := (array[8, 9, 10, 11, 12, 12, 13, 13, 14, 15, 16, 17, 17, 18, 19])[1 + floor(random() * 15)::int];
      v_metodo := (array['Efectivo', 'Efectivo', 'Efectivo', 'Tarjeta', 'Tarjeta', 'Transferencia', 'Billetera digital'])[1 + floor(random() * 7)::int];
      v_cliente := case when random() < 0.45
                        then (select id from clientes order by random() limit 1)
                        else null end;

      for l in 1..(1 + floor(random() * 3))::int loop
        select * into v_prod from productos order by random() limit 1;
        v_cant := 1 + floor(random() * 2)::int;

        insert into ventas (ticket, fecha, hora, cliente_id, producto_id, cantidad,
                            precio_unitario, total, metodo_pago)
        values (v_ticket, v_fecha, v_hora, v_cliente, v_prod.id, v_cant,
                v_prod.precio, v_prod.precio * v_cant, v_metodo);
      end loop;
    end loop;
  end loop;
end $$;
