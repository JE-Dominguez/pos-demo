-- Versión mínima (sin ventas). Para la demo completa usa seed_completo.sql
-- Datos de ejemplo. Ejecutar después de schema.sql.
insert into productos (nombre, categoria, precio, stock, stock_minimo) values
  ('Café americano', 'Bebidas', 50, 120, 20),
  ('Capuchino', 'Bebidas', 70, 120, 20),
  ('Jugo natural', 'Bebidas', 60, 80, 15),
  ('Sándwich de pollo', 'Comida', 90, 80, 10),
  ('Ensalada César', 'Comida', 100, 40, 10),
  ('Croissant', 'Panadería', 35, 60, 15),
  ('Muffin de arándano', 'Panadería', 40, 50, 10),
  ('Pastel de chocolate', 'Postres', 80, 30, 8);

insert into clientes (nombre, telefono, email) values
  ('Ana Pérez', '9999-1111', 'ana@mail.com'),
  ('Luis Mejía', '9999-2222', null),
  ('María Castro', '9999-3333', 'maria@mail.com');

insert into proveedores (nombre, telefono) values
  ('Distribuidora Central', '2222-1111'),
  ('Panadería El Trigo', '2222-2222'),
  ('Bebidas del Valle', '2222-3333');

insert into configuracion (clave, valor) values
  ('nombre_negocio', 'Mi Negocio'),
  ('meta', '200000')
on conflict (clave) do nothing;
