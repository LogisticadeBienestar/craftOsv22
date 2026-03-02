import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Render.com Persistent Disk config
// Verify if /opt/render/project/src/data exists (Render's mount path). If so, save the DB there.
const renderDataPath = path.join(__dirname, 'data');
const dbFilePath = fs.existsSync(renderDataPath)
  ? path.join(renderDataPath, 'admin.db')
  : 'admin.db';

const db = new Database(dbFilePath);

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT,
    name TEXT,
    description TEXT,
    image TEXT,
    price REAL,
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    registered TEXT,
    accept_marketing INTEGER,
    balance REAL DEFAULT 0,
    zone TEXT,
    address TEXT,
    phone TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT
  );

  CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT,
    commissioner_price REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('container_price', '1000');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('next_serial_number', '100');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('task_price_mantenimiento', '0');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('task_price_produccion', '0');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('task_price_tambo', '0');

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    serial_number TEXT,
    client_id TEXT,
    user_id TEXT,
    total_amount REAL,
    containers_returned INTEGER,
    status TEXT,
    date TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    product_id TEXT,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    order_id TEXT,
    amount REAL,
    method TEXT,
    date TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS washing_prices (
    id TEXT PRIMARY KEY,
    container_type TEXT UNIQUE,
    price REAL,
    effective_date TEXT
  );

  CREATE TABLE IF NOT EXISTS washing_records (
    id TEXT PRIMARY KEY,
    date TEXT,
    user_id TEXT,
    qty_200cc INTEGER DEFAULT 0,
    qty_500cc INTEGER DEFAULT 0,
    qty_800cc INTEGER DEFAULT 0,
    qty_910cc INTEGER DEFAULT 0,
    qty_bidones INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS vehicle_usage (
    id TEXT PRIMARY KEY,
    date TEXT,
    user_id TEXT,
    status TEXT DEFAULT 'pending',
    settlement_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    date TEXT,
    user_id TEXT,
    type TEXT,
    amount REAL,
    details TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS company_expenses (
    id TEXT PRIMARY KEY,
    date TEXT,
    user_id TEXT,
    description TEXT,
    amount REAL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS advances (
    id TEXT PRIMARY KEY,
    date TEXT,
    user_id TEXT,
    amount REAL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    settlement_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    date TEXT,
    user_id TEXT,
    description TEXT,
    amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    settlement_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS company_expenses (
    id TEXT PRIMARY KEY,
    date TEXT,
    user_id TEXT,
    description TEXT,
    amount REAL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

try { db.exec('ALTER TABLE washing_records ADD COLUMN status TEXT DEFAULT "pending"'); } catch (e) { }
try { db.exec('ALTER TABLE washing_records ADD COLUMN settlement_id TEXT'); } catch (e) { }
try { db.exec('ALTER TABLE vehicle_usage ADD COLUMN settlement_id TEXT'); } catch (e) { }
try { db.exec('ALTER TABLE tasks ADD COLUMN amount REAL DEFAULT 0'); } catch (e) { }

try { db.exec('ALTER TABLE clients ADD COLUMN zone TEXT'); } catch (e) { }
try { db.exec('ALTER TABLE clients ADD COLUMN zone_id TEXT'); } catch (e) { }
try { db.exec('ALTER TABLE clients ADD COLUMN address TEXT'); } catch (e) { }
try { db.exec('ALTER TABLE clients ADD COLUMN phone TEXT'); } catch (e) { }
try { db.exec('ALTER TABLE clients ADD COLUMN notes TEXT'); } catch (e) { }

try { db.exec('ALTER TABLE orders ADD COLUMN zone_id TEXT'); } catch (e) { }
try { db.exec('ALTER TABLE orders ADD COLUMN delivery_id TEXT'); } catch (e) { }
try { db.exec('ALTER TABLE orders ADD COLUMN subtotal REAL DEFAULT 0'); } catch (e) { }
try { db.exec('ALTER TABLE orders ADD COLUMN iva_amount REAL DEFAULT 0'); } catch (e) { }
try { db.exec('ALTER TABLE orders ADD COLUMN container_quantity INTEGER DEFAULT 0'); } catch (e) { }
try { db.exec('ALTER TABLE orders ADD COLUMN container_price REAL DEFAULT 0'); } catch (e) { }
try { db.exec('ALTER TABLE orders ADD COLUMN container_total REAL DEFAULT 0'); } catch (e) { }
try { db.exec('ALTER TABLE orders ADD COLUMN commissioner_amount REAL DEFAULT 0'); } catch (e) { }
try { db.exec('ALTER TABLE orders ADD COLUMN has_iva INTEGER DEFAULT 1'); } catch (e) { }
try { db.exec('ALTER TABLE orders ADD COLUMN has_commissioner INTEGER DEFAULT 1'); } catch (e) { }
try { db.exec('ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT "pending"'); } catch (e) { }
try { db.exec('ALTER TABLE orders ADD COLUMN fulfillment_status TEXT DEFAULT "pending"'); } catch (e) { }
try { db.exec('ALTER TABLE orders ADD COLUMN delivered_by TEXT'); } catch (e) { }

const zoneCount = db.prepare('SELECT COUNT(*) as count FROM zones').get() as { count: number };
if (zoneCount.count === 0) {
  const insertZone = db.prepare('INSERT INTO zones (id, code, name, commissioner_price) VALUES (?, ?, ?, ?)');
  insertZone.run('1', 'ZGEN', 'Zona General', 10500);
  insertZone.run('2', 'ZLOC', 'Zona Local', 7500);
}

// Ensure proper users exist
db.prepare('DELETE FROM users WHERE name IN (?, ?)').run('Repartidor 1', 'admin');
db.prepare('INSERT OR IGNORE INTO users (id, name, role) VALUES (?, ?, ?)').run('admin-1', 'Administrador', 'ADMIN');
db.prepare('INSERT OR IGNORE INTO users (id, name, role) VALUES (?, ?, ?)').run('charlie-1', 'Charly', 'DELIVERY');
db.prepare('UPDATE users SET name = ? WHERE id = ?').run('Charly', 'charlie-1'); // Ensure rename
db.prepare('INSERT OR IGNORE INTO users (id, name, role) VALUES (?, ?, ?)').run('belen-1', 'Belén', 'DELIVERY');
db.prepare('INSERT OR IGNORE INTO users (id, name, role) VALUES (?, ?, ?)').run('sergio-1', 'Sergio', 'DELIVERY');
db.prepare('INSERT OR IGNORE INTO users (id, name, role) VALUES (?, ?, ?)').run('leo-1', 'Leo', 'DELIVERY');

// Seed data if empty
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };

if (productCount.count === 0) {
  const products = [
    { id: '1', sku: 'YOG-NAT-910', name: 'YOGURT NATURAL 910CC', description: '', image: '', price: 4800, category: 'Mayorista' },
    { id: '2', sku: 'BEB-NAT-500', name: 'BEBIBLE 500CC NATURAL', description: '', image: '', price: 3800, category: 'Mayorista' },
    { id: '3', sku: 'BEB-VAI-500', name: 'YOGURT BEBIBLE VAINILLA NATURAL 500CC', description: '', image: '', price: 4500, category: 'Mayorista' },
    { id: '4', sku: 'BEB-VAI-910', name: 'YOGURT BEBIBLE VAINILLA NATURAL 910CC', description: '', image: '', price: 5800, category: 'Mayorista' },
    { id: '5', sku: 'GRI-NAT-200', name: 'GRIEGO NATURAL 200CC', description: '', image: '', price: 3800, category: 'Mayorista' },
    { id: '6', sku: 'GRI-XL-800', name: 'GRIEGO XL 800', description: '', image: '', price: 9800, category: 'Mayorista' },
    { id: '7', sku: 'UNT-NAT-200', name: 'UNTABLE NATURAL 200GR', description: '', image: '', price: 4200, category: 'Mayorista' },
    { id: '8', sku: 'LEC-ENT-910', name: 'LECHE ENTERA 910CC', description: '', image: '', price: 3800, category: 'Mayorista' },
    { id: '9', sku: 'MAN-YOG-100', name: 'MANTECA DE YOGURT 100GR', description: '', image: '', price: 2900, category: 'Mayorista' },
    { id: '10', sku: 'MAN-YOG-200', name: 'MANTECA DE YOGURT 200GR', description: '', image: '', price: 5800, category: 'Mayorista' }
  ];

  const insertProduct = db.prepare('INSERT INTO products (id, sku, name, description, image, price, category) VALUES (?, ?, ?, ?, ?, ?, ?)');
  products.forEach(p => insertProduct.run(p.id, p.sku, p.name, p.description, p.image, p.price, p.category));
}

const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number };
if (clientCount.count === 0) {
  db.prepare('DELETE FROM payments').run();
  db.prepare('DELETE FROM order_items').run();
  db.prepare('DELETE FROM orders').run();
  db.prepare('DELETE FROM clients').run();

  const detailedClients = [
    { name: "Agostina Morelli", email: "agossmorelli@gmail.com", phone: "", address: "" },
    { name: "Agustín", email: "aspinaf@gmail.com", phone: "", address: "" },
    { name: "Almacen Coni", email: "conicenteno@hotmail.com", phone: "", address: "Blvd. de los Alemanes 4995, X5147 Córdoba" },
    { name: "Almacen de Organicos", email: "leo@gmail.com", phone: "000000", address: "Las Violetas 0, Los Cocos, Córdoba" },
    { name: "Almacen de Organicos 2", email: "almacendeorganicos@gmail.com", phone: "", address: "Juan Antonio Lavalleja 886, X5000 Córdoba" },
    { name: "Almacen de Sueltos", email: "dinonicolli@hotmail.com", phone: "", address: "Lisandro de la Torre 67, X5152 Villa Carlos Paz" },
    { name: "Almacen Natural Amapola Ana", email: "guicope11@gmail.com", phone: "+5493541607139", address: "AVENIDA ARTURO UMBERTO ILLIA 647, VILLA CARLOS PAZ" },
    { name: "Almacen Natural Georgina Azocar", email: "pachamamalafalda@gmail.com", phone: "+5493548610230", address: "Av. Eden 504 Local 2, X5172 La Falda" },
    { name: "Almacén Natural La Cumbre", email: "nataliahochea@gmail.com", phone: "+543584384223", address: "Local Los Cocos, Capilla del monte" },
    { name: "Almacen Natural Sawa Celi", email: "ampueromauroezequiel@gmail.com", phone: "+5492964524759", address: "Mariano Larra 3613, X5000 Córdoba" },
    { name: "Almacen Sueltos Jorgelina", email: "origen.almacennatural@gmail.com.ar", phone: "+5493541682839", address: "LOS ARTESANOS 131, CARLOS PAZ" },
    { name: "Alma Terra", email: "almaterratiendasaludable@gmail.com", phone: "", address: "San Isidro 100, X5105 Villa Allende" },
    { name: "Almendra", email: "pedidoscraft@gmail.com", phone: "", address: "" },
    { name: "Almendra 2", email: "almendradiet@gmail.com", phone: "+5493518501072", address: "local 12 y 14, Av. Recta Martinolli 8212, X5147 Córdoba" },
    { name: "Amapola", email: "ana_55_@hotmail.com", phone: "+5493517052368", address: "Javier Lascano Colodrero 2721, X5008 Córdoba" },
    { name: "Apunto Almacen", email: "apuntoalmacen@gmail.com", phone: "", address: "Av. Pablo Ricchieri 3256, X5000 Córdoba" },
    { name: "Bananas Wellness Coffee", email: "victor-rosso@hotmail.com", phone: "", address: "Paraguay 1248, X5152 Villa Carlos Paz" },
    { name: "Canela & Miel", email: "sofyolmos@hotmail.com", phone: "", address: "Av. los Alamos 529, X5151 La Calera" },
    { name: "Carlos Varacca", email: "carlosvaracca@gmail.com", phone: "", address: "La Cumbre, Córdoba" },
    { name: "Casa Addur", email: "silvana_pugliese@hotmail.com", phone: "", address: "Av. Plte Hipólito Yrigoyen 108, X5184 Capilla del Monte" },
    { name: "Casa Addur 2", email: "logisticadebienestar@gmail.com", phone: "+5493517665508", address: "SALDAN, Córdoba" },
    { name: "Casa Addur 3", email: "georgina.azocar@gmail.com", phone: "+5491165997870", address: "Belgrano 343, X5178 La Cumbre" },
    { name: "Come Sanito", email: "comesanitocordoba@gmail.com", phone: "+5493516899853", address: "Menéndez Pidal 3612, X5009HSG Córdoba" },
    { name: "Eneldo", email: "karinasibona@hotmail.com", phone: "", address: "RIO DE JANEIRO 15. LOCAL 2, COMPLEJO, CUADRA 1, X5105 Villa Allende" },
    { name: "Estacion Claridad", email: "encuentrate@estacionclaridad.com", phone: "", address: "Cordoba, Córdoba" },
    { name: "Godere", email: "logiaticadelbienestar@gmail.com", phone: "", address: "Cordoba, Córdoba" },
    { name: "Godere 2", email: "emanuel.molina14@gmail.com", phone: "", address: "Tristán Malbrán 4258, X5009 Córdoba" },
    { name: "Kiki Market", email: "info@kikimarket.com.ar", phone: "", address: "Carlos Paz, Córdoba" },
    { name: "Kuyen", email: "caldj@hhhjd.com", phone: "+543584384223", address: "Local Los Cocos, Córdoba" },
    { name: "Kuyen 2", email: "lauraescayol@yahoo.com.ar", phone: "+5493548407762", address: "LA FALDA, Córdoba" },
    { name: "La Casita", email: "lacasitaecologicacba@gmail.com", phone: "+5493512087391", address: "Sta Rosa 687, X5000 Córdoba" },
    { name: "La Estacion", email: "verdulaestacion@gmail.com", phone: "", address: "Av. Bach 83, X5152 Villa Carlos Paz" },
    { name: "La Natu", email: "lanatualmacennatural@gmail.com", phone: "", address: "Av. Vélez Sarfield 511, X5184 Capilla del Monte" },
    { name: "La Tienda", email: "latienditawaldorf@gmail.com", phone: "", address: "X5021JJF, Isaac Newton 5827, X5021JJE Córdoba" },
    { name: "Lo De Magui", email: "ponce75adri@gmail.com", phone: "", address: "Bulgaria 2276, VILLA CARLOS PAZ" },
    { name: "Los Sobri Morfones", email: "soledadoyola16@gmail.com", phone: "", address: "Villa Carlos Paz" },
    { name: "Luben", email: "gustavocenamolina@gmail.com", phone: "+5493512273947", address: "Sta Fe 1170 Local 1, X5000 Córdoba" },
    { name: "Luna de las Flores", email: "ecotiendalunadelasflores@gmail.com", phone: "", address: "Carlos Paz, 5000" },
    { name: "Mandragora", email: "carlospucheta@gmail.com", phone: "", address: "Cordoba, Córdoba" },
    { name: "Mandragora 2", email: "fol.mariana@gmail.com", phone: "", address: "" },
    { name: "Mandragora 3", email: "pedidoscraftyogurt@gmail.com", phone: "+5491165997870", address: "LA CUMBRE, Córdoba" },
    { name: "Mandragora 4", email: "danirivadeneira@hotmail.com", phone: "+5493513856869", address: "Belgrano 256, X5184 Capilla del Monte" },
    { name: "Mandragora 5", email: "mandragoralacumbre@hotmail.com", phone: "+5493513678679", address: "Rivadavia 387, X5178 La Cumbre" },
    { name: "Marina Albarello", email: "reyna.albarello@gmail.com", phone: "+5493463417415", address: "LOS COCOS, Córdoba" },
    { name: "Marina Albarello 2", email: "lucasschab@yahoo.com.ar", phone: "+5493548538136", address: "CAPILLA DEL MONTE, Córdoba" },
    { name: "Mayra Ossorio", email: "mossorio1612@gmail.com", phone: "+543512087600", address: "CALLE ENTRE RIOS 2136 BARRIO SAN VICENTE, CORDOBA" },
    { name: "Meli Genari", email: "mel_15_g@hotmail.com", phone: "", address: "DIRECCIÓN EGUIA ZANON 9552 VILLA WALCALDE, Cordoba" },
    { name: "Morita VCP", email: "laureanomateos@hotmail.com", phone: "", address: "Carlos Paz, Córdoba" },
    { name: "Natbio", email: "natbioonline@gmail.com", phone: "", address: "Av. los Alamos 1015, X5151 Córdoba" },
    { name: "Nativo Alimentos", email: "adm.tiendasnativo@gmail.com", phone: "", address: "Av. Libertad 611, X5152 Villa Carlos Paz" },
    { name: "Natural Market", email: "flor.giordano15@gmail.com", phone: "+5493512252368", address: "Blvd. San Juan 620, X5000 Córdoba" },
    { name: "Natural Market Florencia", email: "juancmartini97@gmail.com", phone: "+5493543636355", address: "Ayacucho 486, X5000 Córdoba" },
    { name: "Naturis", email: "naturisalmacen@gmail.com", phone: "", address: "Av. Mahatma Gandhi 186, X5003 Córdoba" },
    { name: "Nodo Arguello", email: "sanchez.francisco212@gmail.com", phone: "", address: "Cordoba, Córdoba" },
    { name: "Nodo Matriz Unquillo", email: "mvictoria.mov@gmail.com", phone: "", address: "Evaristo, Carriego 40, X5109 Unquillo" },
    { name: "Nodo Mendiolaza", email: "florenciagarrone1@gmail.com", phone: "", address: "Flor y Seba, MENDIOLAZA" },
    { name: "Nodo Saldan", email: "rocanaty@gmail.com", phone: "", address: "Saldan, Córdoba" },
    { name: "Organicos de Mi Tierra", email: "organicosdmt@gmail.com", phone: "", address: "Av. Rafael Núñez 5824, X5000 Córdoba" },
    { name: "Organicos de Mi Tierra Juan", email: "magracao@gmail.com", phone: "+5493516194918", address: "AVENIDA DONOSA 3900, CORDOBA" },
    { name: "Origen Almacen Natural", email: "lacomarcaagranel@gmail.com", phone: "+5493549548492", address: "SAN MARCOS, Córdoba" },
    { name: "Pachamama", email: "carlitospucheta@gmail.com", phone: "", address: "" },
    { name: "Pachamama 2", email: "mercurio3@gmail.com", phone: "+5491124724555", address: "MEIROVICH 50 LA FALDA" },
    { name: "Pachamama 3", email: "pachamamalafalda.ventas@gmail.com", phone: "", address: "Av. Eden 504 Local 2, X5172 La Falda" },
    { name: "Pachapampa", email: "magui_pacha@hotmail.com", phone: "", address: "Av. Vélez Sarsfield 22 local 1, X5152 Villa Carlos Paz" },
    { name: "Piu Sano", email: "piusanonatural@gmail.com", phone: "", address: "barrio colinas de mantiales, lote 11 mza 64 local 3, X5017 Córdoba" },
    { name: "Sawa Almacen", email: "sawa.alimentossaludables@gmail.com", phone: "", address: "Menéndez Pidal 3996, X5009 Córdoba" },
    { name: "Sawa Cafe", email: "sawanaturalbrunch@gmail.com", phone: "", address: "Av. Malvinas 1675, X5107 Mendiolaza" },
    { name: "Sebastian Marques Maxikiosko", email: "sebasm46@gmail.com", phone: "+5493516823134", address: "TRISTAN MALBRAN 4246 EN EL CERRO, CORDOBA" },
    { name: "Shaman", email: "fernanda.severina@gmail.com", phone: "", address: "Av. República de China 1150, X5003 Córdoba" },
    { name: "Sierra Madre", email: "gabryelasch@gmail.com", phone: "", address: "San este, PUNILLA" },
    { name: "Sierra Madre 2", email: "sierramadretienda@gmail.com", phone: "+5493512460980", address: "Calasanz 1358, X5107 Mendiolaza" },
    { name: "Sierra Madre Claudia", email: "vivezero2023@gmail.com", phone: "+5493517598246", address: "BOULEVAR SARMIENTO 384, CARLOS PAZ" },
    { name: "Sol Acuariano", email: "flor_cba2@hotmail.com", phone: "", address: "Diag. Buenos Aires 113, X5184 Capilla del Monte" },
    { name: "Sol Acuariano La Falda", email: "casaaddur@gmail.com", phone: "+5493548414592", address: "HIPOLITO YRIGOYEN 108, CAPILLA DEL MONTE" },
    { name: "Souk", email: "info@soukfoodiemarket.com", phone: "", address: "" },
    { name: "Tesai Soledad", email: "espaciotesai@gmail.com", phone: "+5493563406889", address: "Bernardo O'Higgins 5845, X5014 Córdoba" },
    { name: "Tessai Soledad Sucursal 1", email: "pastelerialuben.contable@gmail.com", phone: "+5493512050484", address: "AVENIDA GAUSS 5676, CORDOBA" },
    { name: "The Hartbar", email: "clemipp2@gmail.com", phone: "", address: "Alberdi 168, X5152 Villa Carlos Paz" },
    { name: "Verde Vitae", email: "nahuel116b@hotmail.com", phone: "+5493513678679", address: "Rivadavia 387, X5178 La Cumbre" },
    { name: "Vive Zero", email: "vivezerovive@gmail.com", phone: "", address: "Carlos Paz, Córdoba" },
    { name: "Vive Zero Eugenia", email: "holisticacorporal@yahoo.com.ar", phone: "+543512804043", address: "Av. San Martín 4319, X5111 Río Ceballos" },
    { name: "Vive Zero Eugenia 2", email: "dinonicolli@gmail.com.ar", phone: "+543518004839", address: "CARLOS PAZ, Córdoba" },
    { name: "Yuyupa", email: "aniluap.731@gmail.com", phone: "+5493516990918", address: "Heriberto Martínez 6259, X5021 Córdoba" }
  ];

  const insertClient = db.prepare('INSERT INTO clients (id, name, email, registered, accept_marketing, balance, zone, address, phone, notes) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)');
  detailedClients.forEach((c, index) => {
    insertClient.run((index + 1).toString(), c.name, c.email, new Date().toISOString(), 0, '', c.address, c.phone, '');
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Users
  app.get('/api/users', (req, res) => {
    try {
      const users = db.prepare('SELECT * FROM users').all();
      res.json(users);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Products
  app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products').all();
    res.json(products);
  });

  app.post('/api/products', (req, res) => {
    const { id, sku, name, description, image, price, category } = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO products (id, sku, name, description, image, price, category) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, sku, name, description, image, price, category);
    res.json({ success: true });
  });

  app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { sku, name, description, image, price, category } = req.body;
    const stmt = db.prepare('UPDATE products SET sku = ?, name = ?, description = ?, image = ?, price = ?, category = ? WHERE id = ?');
    stmt.run(sku, name, description, image, price, category, id);
    res.json({ success: true });
  });

  // Zones
  app.get('/api/zones', (req, res) => {
    const zones = db.prepare('SELECT * FROM zones').all();
    res.json(zones);
  });

  app.post('/api/zones', (req, res) => {
    const { id, code, name, commissioner_price } = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO zones (id, code, name, commissioner_price) VALUES (?, ?, ?, ?)');
    stmt.run(id, code, name, commissioner_price || 0);
    res.json({ success: true });
  });

  app.put('/api/zones/:id', (req, res) => {
    const { id } = req.params;
    const { code, name, commissioner_price } = req.body;
    const stmt = db.prepare('UPDATE zones SET code = ?, name = ?, commissioner_price = ? WHERE id = ?');
    stmt.run(code, name, commissioner_price || 0, id);
    res.json({ success: true });
  });

  app.delete('/api/zones/:id', (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('DELETE FROM zones WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error deleting zone' });
    }
  });

  // Settings
  app.get('/api/settings', (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post('/api/settings', (req, res) => {
    const settings = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const transaction = db.transaction((settingsObj) => {
      for (const [key, value] of Object.entries(settingsObj)) {
        stmt.run(key, String(value));
      }
    });
    transaction(settings);
    res.json({ success: true });
  });

  // Clients
  app.get('/api/clients', (req, res) => {
    const clients = db.prepare('SELECT * FROM clients').all();
    res.json(clients);
  });

  app.post('/api/clients', (req, res) => {
    const { id, name, email, registered, accept_marketing, zone, zone_id, address, phone, notes } = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO clients (id, name, email, registered, accept_marketing, zone, zone_id, address, phone, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, name, email, registered, accept_marketing ? 1 : 0, zone || '', zone_id || null, address || '', phone || '', notes || '');
    res.json({ success: true });
  });

  app.post('/api/clients/bulk-update-zone', (req, res) => {
    const { clientIds, zone_id, zone_name } = req.body;
    const stmt = db.prepare('UPDATE clients SET zone_id = ?, zone = ? WHERE id = ?');
    const transaction = db.transaction((ids) => {
      for (const id of ids) {
        stmt.run(zone_id, zone_name, id);
      }
    });
    transaction(clientIds);
    res.json({ success: true });
  });

  app.put('/api/clients/:id/balance', (req, res) => {
    const { id } = req.params;
    const { balance } = req.body;
    try {
      db.prepare('UPDATE clients SET balance = ? WHERE id = ?').run(balance, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, zone, zone_id, address, phone, notes } = req.body;
    const stmt = db.prepare('UPDATE clients SET name = ?, email = ?, zone = ?, zone_id = ?, address = ?, phone = ?, notes = ? WHERE id = ?');
    stmt.run(name, email || '', zone || '', zone_id || null, address || '', phone || '', notes || '', id);
    res.json({ success: true });
  });

  app.delete('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('DELETE FROM payments WHERE client_id = ?').run(id);
      db.prepare('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE client_id = ?)').run(id);
      db.prepare('DELETE FROM orders WHERE client_id = ?').run(id);
      db.prepare('DELETE FROM clients WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error deleting client' });
    }
  });

  // Users
  app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT * FROM users').all();
    if (users.length === 0) {
      // Seed users if empty
      const defaultUsers = [
        { id: crypto.randomUUID(), name: 'Administrador', role: 'ADMIN' },
        { id: crypto.randomUUID(), name: 'Charlie', role: 'DELIVERY' },
        { id: crypto.randomUUID(), name: 'Belén', role: 'DELIVERY' },
        { id: crypto.randomUUID(), name: 'Sergio', role: 'DELIVERY' },
        { id: crypto.randomUUID(), name: 'Leo', role: 'DELIVERY' }
      ];
      const insert = db.prepare('INSERT INTO users (id, name, role) VALUES (?, ?, ?)');
      defaultUsers.forEach(u => insert.run(u.id, u.name, u.role));
      res.json(defaultUsers);
    } else {
      res.json(users);
    }
  });

  app.post('/api/users', (req, res) => {
    const { id, name, role } = req.body;
    try {
      db.prepare('INSERT INTO users (id, name, role) VALUES (?, ?, ?)').run(id, name, role);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { name, role } = req.body;
    try {
      db.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?').run(name, role, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Orders (Remitos)
  app.get('/api/orders', (req, res) => {
    const orders = db.prepare('SELECT * FROM orders ORDER BY date DESC').all();
    res.json(orders);
  });

  app.get('/api/orders/:id/items', (req, res) => {
    const { id } = req.params;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    res.json(items);
  });

  app.get('/api/orders/:id/payments', (req, res) => {
    const { id } = req.params;
    const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY date ASC').all(id);
    res.json(payments);
  });

  app.post('/api/orders', (req, res) => {
    try {
      const { client_id, user_id, total_amount, containers_returned, status, date, items, zone_id, subtotal, iva_amount, container_quantity, container_price, container_total, commissioner_amount, has_iva, has_commissioner } = req.body;

      // Generate Serial Number
      const nextSerialRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('next_serial_number') as { value: string };
      const serial_number = parseInt(nextSerialRow?.value || '100', 10);
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run((serial_number + 1).toString(), 'next_serial_number');

      // Get Zone Code
      const zoneRow = db.prepare('SELECT code FROM zones WHERE id = ?').get(zone_id) as { code: string };
      const zoneCode = zoneRow?.code || 'Z00';

      // Generate ID
      const id = `${zoneCode}-${serial_number}`;

      const payment_status = total_amount === 0 ? 'paid' : 'pending';

      const stmt = db.prepare('INSERT INTO orders (id, serial_number, client_id, user_id, total_amount, containers_returned, status, date, zone_id, subtotal, iva_amount, container_quantity, container_price, container_total, commissioner_amount, has_iva, has_commissioner, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, serial_number.toString(), client_id, user_id, total_amount, containers_returned, status, date, zone_id, subtotal, iva_amount, container_quantity, container_price, container_total, commissioner_amount, has_iva ? 1 : 0, has_commissioner ? 1 : 0, payment_status);

      if (items && items.length > 0) {
        const insertItem = db.prepare('INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)');
        items.forEach((item: any) => {
          insertItem.run(crypto.randomUUID(), id, item.product_id, item.quantity, item.price);
        });
      }

      // Update client balance
      db.prepare('UPDATE clients SET balance = balance + ? WHERE id = ?').run(total_amount, client_id);

      res.json({ success: true, id, serial_number });
    } catch (error: any) {
      console.error('Error in POST /api/orders:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const {
      payment_status, fulfillment_status, total_amount, containers_returned,
      items, subtotal, iva_amount, container_quantity, container_price,
      container_total, commissioner_amount, has_iva, has_commissioner, delivered_by
    } = req.body;

    const currentOrder = db.prepare('SELECT total_amount, client_id, payment_status FROM orders WHERE id = ?').get(id) as { total_amount: number, client_id: string, payment_status: string };

    if (items) {
      // Full edit
      db.prepare(`
        UPDATE orders 
        SET total_amount = ?, subtotal = ?, iva_amount = ?, container_quantity = ?, 
            container_price = ?, container_total = ?, commissioner_amount = ?, 
            has_iva = ?, has_commissioner = ?, delivered_by = ?
        WHERE id = ?
      `).run(
        total_amount, subtotal, iva_amount, container_quantity,
        container_price, container_total, commissioner_amount,
        has_iva ? 1 : 0, has_commissioner ? 1 : 0, delivered_by || null, id
      );

      // Adjust client balance if total_amount changed
      if (currentOrder && currentOrder.total_amount !== total_amount) {
        const difference = total_amount - currentOrder.total_amount;
        db.prepare('UPDATE clients SET balance = balance + ? WHERE id = ?').run(difference, currentOrder.client_id);
      }

      // Update items
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);
      const insertItem = db.prepare('INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)');
      items.forEach((item: any) => {
        insertItem.run(crypto.randomUUID(), id, item.product_id, item.quantity, item.price);
      });

      // Re-evaluate payment status based on new total_amount
      const payments = db.prepare('SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ?').get(id) as { total_paid: number };
      const totalPaid = payments?.total_paid || 0;
      let newStatus = payment_status;
      if (totalPaid >= total_amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partially_paid';
      } else {
        newStatus = 'pending';
      }
      db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(newStatus, id);

    } else if (total_amount !== undefined && containers_returned !== undefined) {
      // Partial edit from Deliveries
      db.prepare('UPDATE orders SET payment_status = ?, fulfillment_status = ?, total_amount = ?, containers_returned = ?, delivered_by = ? WHERE id = ?')
        .run(payment_status, fulfillment_status, total_amount, containers_returned, delivered_by || null, id);

      // Adjust client balance if total_amount changed
      if (currentOrder && currentOrder.total_amount !== total_amount) {
        const difference = total_amount - currentOrder.total_amount;
        db.prepare('UPDATE clients SET balance = balance + ? WHERE id = ?').run(difference, currentOrder.client_id);
      }

      // Re-evaluate payment status based on new total_amount
      const payments = db.prepare('SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ?').get(id) as { total_paid: number };
      const totalPaid = payments?.total_paid || 0;
      let newStatus = payment_status;
      if (totalPaid >= total_amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partially_paid';
      } else {
        newStatus = 'pending';
      }
      db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(newStatus, id);
    } else {
      // Status only edit
      db.prepare('UPDATE orders SET payment_status = ?, fulfillment_status = ?, delivered_by = ? WHERE id = ?')
        .run(payment_status, fulfillment_status, delivered_by || null, id);
    }

    // Auto-generate payment if marked as paid and wasn't paid before
    if (payment_status === 'paid' && currentOrder && currentOrder.payment_status !== 'paid') {
      const payments = db.prepare('SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ?').get(id) as { total_paid: number };
      const totalPaid = payments?.total_paid || 0;
      const orderTotal = total_amount !== undefined ? total_amount : currentOrder.total_amount;
      const remaining = orderTotal - totalPaid;

      if (remaining > 0) {
        const paymentId = crypto.randomUUID();
        db.prepare('INSERT INTO payments (id, client_id, order_id, amount, method, date) VALUES (?, ?, ?, ?, ?, ?)').run(
          paymentId, currentOrder.client_id, id, remaining, 'EFECTIVO', new Date().toISOString()
        );
        db.prepare('UPDATE clients SET balance = balance - ? WHERE id = ?').run(remaining, currentOrder.client_id);
      }
    }

    // If marked as cancelled, we might need to revert balance? The user didn't ask for this explicitly, but it's good practice.
    // For now, let's keep it simple and just handle the payment generation.

    res.json({ success: true });
  });

  app.delete('/api/orders/:id', (req, res) => {
    const { id } = req.params;

    try {
      const deleteOrderTransaction = db.transaction((orderId: string) => {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
        if (!order) {
          throw new Error('Order not found');
        }

        // Revert client balance
        db.prepare('UPDATE clients SET balance = balance - ? WHERE id = ?').run(order.total_amount, order.client_id);

        // Delete associated payments
        const payments = db.prepare('SELECT * FROM payments WHERE order_id = ?').all(orderId) as any[];
        for (const payment of payments) {
          // Revert client balance for the payment
          db.prepare('UPDATE clients SET balance = balance + ? WHERE id = ?').run(payment.amount, payment.client_id);
        }
        db.prepare('DELETE FROM payments WHERE order_id = ?').run(orderId);

        // Delete items
        db.prepare('DELETE FROM order_items WHERE order_id = ?').run(orderId);

        // Delete order
        db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
      });

      deleteOrderTransaction(id);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting order:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Payments
  app.post('/api/payments', (req, res) => {
    const { id, client_id, order_id, amount, method, date } = req.body;

    const stmt = db.prepare('INSERT INTO payments (id, client_id, order_id, amount, method, date) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, client_id, order_id, amount, method, date);

    // Update client balance
    db.prepare('UPDATE clients SET balance = balance - ? WHERE id = ?').run(amount, client_id);

    // Update order payment status if linked to an order
    if (order_id) {
      const order = db.prepare('SELECT total_amount FROM orders WHERE id = ?').get(order_id) as { total_amount: number };
      const payments = db.prepare('SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ?').get(order_id) as { total_paid: number };

      if (order && payments) {
        const totalPaid = payments.total_paid || 0;
        let newStatus = 'pending';
        if (totalPaid >= order.total_amount) {
          newStatus = 'paid';
        } else if (totalPaid > 0) {
          newStatus = 'partially_paid';
        }

        db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(newStatus, order_id);
      }
    } else {
      // Auto-allocate general payment to oldest pending/partially_paid orders
      let remainingAmount = amount;
      const pendingOrders = db.prepare(`
        SELECT id, total_amount 
        FROM orders 
        WHERE client_id = ? AND payment_status IN ('pending', 'partially_paid') 
        ORDER BY date ASC
      `).all(client_id) as { id: string, total_amount: number }[];

      for (const order of pendingOrders) {
        if (remainingAmount <= 0) break;

        const payments = db.prepare('SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ?').get(order.id) as { total_paid: number };
        const totalPaid = payments?.total_paid || 0;
        const orderRemaining = order.total_amount - totalPaid;

        if (orderRemaining > 0) {
          const allocated = Math.min(remainingAmount, orderRemaining);
          remainingAmount -= allocated;

          // We don't create a new payment record to avoid double counting balance, 
          // but we update the order status as if it was paid by this general payment.
          // To properly track it, we could link the payment, but since it's a general payment,
          // we just update the status based on a virtual allocation.
          // Actually, a better way is to just check if the client's balance is <= 0, 
          // if so, mark ALL their orders as paid.
        }
      }

      // Simpler approach: if client balance is <= 0, mark all orders as paid
      const client = db.prepare('SELECT balance FROM clients WHERE id = ?').get(client_id) as { balance: number };
      if (client && client.balance <= 0) {
        db.prepare(`UPDATE orders SET payment_status = 'paid' WHERE client_id = ? AND payment_status != 'cancelled'`).run(client_id);
      }
    }

    res.json({ success: true });
  });

  // Delete Payment
  app.delete('/api/payments/:id', (req, res) => {
    const { id } = req.params;

    try {
      const deletePaymentTransaction = db.transaction((paymentId: string) => {
        const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as any;
        if (!payment) {
          throw new Error('Payment not found');
        }

        // Revert client balance
        db.prepare('UPDATE clients SET balance = balance + ? WHERE id = ?').run(payment.amount, payment.client_id);

        // Delete payment
        db.prepare('DELETE FROM payments WHERE id = ?').run(paymentId);

        // Update order payment status if linked to an order
        if (payment.order_id) {
          const order = db.prepare('SELECT total_amount FROM orders WHERE id = ?').get(payment.order_id) as { total_amount: number };
          const payments = db.prepare('SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ?').get(payment.order_id) as { total_paid: number };

          if (order) {
            const totalPaid = payments?.total_paid || 0;
            let newStatus = 'pending';
            if (totalPaid >= order.total_amount) {
              newStatus = 'paid';
            } else if (totalPaid > 0) {
              newStatus = 'partially_paid';
            }

            db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(newStatus, payment.order_id);
          }
        }
      });

      deletePaymentTransaction(id);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reset Data
  app.post('/api/reset', (req, res) => {
    try {
      const resetTransaction = db.transaction(() => {
        // Delete all transactions
        db.prepare('DELETE FROM payments').run();
        db.prepare('DELETE FROM order_items').run();
        db.prepare('DELETE FROM orders').run();

        // Delete operational records
        db.prepare('DELETE FROM washing_records').run();
        db.prepare('DELETE FROM vehicle_usage').run();
        db.prepare('DELETE FROM advances').run();
        db.prepare('DELETE FROM tasks').run();
        db.prepare('DELETE FROM settlements').run();
        db.prepare('DELETE FROM company_expenses').run();

        // Reset client balances
        db.prepare('UPDATE clients SET balance = 0').run();
      });

      resetTransaction();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error resetting data:', error);
      res.status(500).json({ error: error.message });
    }
  });



  // Current Account (Cuenta Corriente)
  app.get('/api/clients/:id/account', (req, res) => {
    const { id } = req.params;
    const orders = db.prepare('SELECT * FROM orders WHERE client_id = ? ORDER BY date DESC').all(id);
    const payments = db.prepare('SELECT * FROM payments WHERE client_id = ? ORDER BY date DESC').all(id);
    const client = db.prepare('SELECT balance FROM clients WHERE id = ?').get(id);

    res.json({
      balance: client ? client.balance : 0,
      movements: [...orders.map(o => ({ ...o, type: 'order' })), ...payments.map(p => ({ ...p, type: 'payment' }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    });
  });

  // -------------------------
  // Audit / Records Edits
  // -------------------------

  // Advances (Adelantos)
  app.get('/api/advances', (req, res) => {
    const records = db.prepare('SELECT * FROM advances ORDER BY date DESC').all();
    res.json(records);
  });

  app.post('/api/advances', (req, res) => {
    try {
      const { date, user_id, amount, description } = req.body;
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO advances (id, date, user_id, amount, description) VALUES (?, ?, ?, ?, ?)').run(id, date, user_id, amount, description);
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/advances/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { date, amount, description } = req.body;
      db.prepare('UPDATE advances SET date = ?, amount = ?, description = ? WHERE id = ?').run(date, amount, description, id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/advances/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM advances WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/advances/:id/status', (req, res) => {
    try {
      const { id } = req.params;
      const { status, settlement_id } = req.body;
      db.prepare('UPDATE advances SET status = ?, settlement_id = ? WHERE id = ?').run(status, settlement_id || null, id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });


  // Vehicle Usage
  app.get('/api/vehicle-usage', (req, res) => {
    const records = db.prepare('SELECT * FROM vehicle_usage ORDER BY date DESC').all();
    res.json(records);
  });

  app.post('/api/vehicle-usage', (req, res) => {
    const { date, user_id } = req.body;
    db.prepare('INSERT INTO vehicle_usage (id, date, user_id) VALUES (?, ?, ?)').run(crypto.randomUUID(), date, user_id);
    res.json({ success: true });
  });

  app.put('/api/vehicle-usage/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { date, user_id } = req.body;
      db.prepare('UPDATE vehicle_usage SET date = ?, user_id = ? WHERE id = ?').run(date, user_id, id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/vehicle-usage/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM vehicle_usage WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/vehicle-usage/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, settlement_id } = req.body;
    db.prepare('UPDATE vehicle_usage SET status = ?, settlement_id = ? WHERE id = ?').run(status, settlement_id || null, id);
    res.json({ success: true });
  });

  // Washing prices
  app.get('/api/washing-prices', (req, res) => {
    const prices = db.prepare('SELECT * FROM washing_prices').all();

    if (prices.length === 0) {
      const defaultPrices = [
        { container_type: '100cc', price: 0 },
        { container_type: '200cc', price: 20 },
        { container_type: '500cc', price: 25 },
        { container_type: '800cc', price: 30 },
        { container_type: '910cc', price: 35 },
        { container_type: 'bidones', price: 50 }
      ];

      const insert = db.prepare('INSERT INTO washing_prices (id, container_type, price, effective_date) VALUES (?, ?, ?, ?)');
      defaultPrices.forEach(p => insert.run(crypto.randomUUID(), p.container_type, p.price, new Date().toISOString()));

      return res.json(defaultPrices);
    }

    res.json(prices);
  });

  app.put('/api/washing-prices', (req, res) => {
    const prices = req.body;

    const transaction = db.transaction((priceList) => {
      const stmt = db.prepare('UPDATE washing_prices SET price = ? WHERE container_type = ?');
      priceList.forEach((p: any) => stmt.run(p.price, p.container_type));
    });

    transaction(prices);
    res.json({ success: true });
  });

  // Washing records
  app.get('/api/washing-records', (req, res) => {
    const records = db.prepare('SELECT * FROM washing_records ORDER BY date DESC').all();
    res.json(records);
  });

  app.post('/api/washing-records', (req, res) => {
    const { date, user_id, qty_200cc, qty_500cc, qty_800cc, qty_910cc, qty_bidones } = req.body;
    db.prepare(`
      INSERT INTO washing_records (id, date, user_id, qty_200cc, qty_500cc, qty_800cc, qty_910cc, qty_bidones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), date, user_id, qty_200cc || 0, qty_500cc || 0, qty_800cc || 0, qty_910cc || 0, qty_bidones || 0);
    res.json({ success: true });
  });

  app.put('/api/washing-records/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { date, qty_200cc, qty_500cc, qty_800cc, qty_910cc, qty_bidones } = req.body;
      db.prepare(`
        UPDATE washing_records 
        SET date = ?, qty_200cc = ?, qty_500cc = ?, qty_800cc = ?, qty_910cc = ?, qty_bidones = ?
        WHERE id = ?
      `).run(date, qty_200cc, qty_500cc, qty_800cc, qty_910cc, qty_bidones, id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/washing-records/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM washing_records WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Company Expenses
  app.get('/api/company-expenses', (req, res) => {
    const records = db.prepare('SELECT * FROM company_expenses ORDER BY date DESC').all();
    res.json(records);
  });

  app.post('/api/company-expenses', (req, res) => {
    try {
      const { date, user_id, description, amount } = req.body;
      db.prepare(`
        INSERT INTO company_expenses (id, date, user_id, description, amount)
        VALUES (?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), date, user_id, description, amount);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/company-expenses/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM company_expenses WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Tasks (Tareas de Charlie)
  app.get('/api/tasks', (req, res) => {
    const records = db.prepare('SELECT * FROM tasks ORDER BY date DESC').all();
    res.json(records);
  });

  app.post('/api/tasks', (req, res) => {
    const { date, user_id, description } = req.body;
    db.prepare(`
      INSERT INTO tasks (id, date, user_id, description, amount)
      VALUES (?, ?, ?, ?, 0)
    `).run(crypto.randomUUID(), date, user_id, description);
    res.json({ success: true });
  });

  app.put('/api/tasks/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, settlement_id } = req.body;
    db.prepare('UPDATE tasks SET status = ?, settlement_id = ? WHERE id = ?').run(status, settlement_id || null, id);
    res.json({ success: true });
  });

  app.put('/api/tasks/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { description, amount, status, settlement_id } = req.body;

      const updateData: any[] = [];
      const updateFields: string[] = [];

      if (description !== undefined) {
        updateFields.push('description = ?');
        updateData.push(description);
      }
      if (amount !== undefined) {
        updateFields.push('amount = ?');
        updateData.push(amount);
      }
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateData.push(status);
        updateFields.push('settlement_id = ?');
        updateData.push(settlement_id || null);
      }

      if (updateFields.length > 0) {
        updateData.push(id);
        db.prepare(`UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateData);
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/tasks/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/washing-records/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, settlement_id } = req.body;
    db.prepare('UPDATE washing_records SET status = ?, settlement_id = ? WHERE id = ?').run(status, settlement_id || null, id);
    res.json({ success: true, id });
  });

  app.put('/api/vehicle-usage/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, settlement_id } = req.body;
    db.prepare('UPDATE vehicle_usage SET status = ?, settlement_id = ? WHERE id = ?').run(status, settlement_id || null, id);
    res.json({ success: true });
  });

  // Settlements
  app.get('/api/settlements', (req, res) => {
    const records = db.prepare('SELECT * FROM settlements ORDER BY date DESC').all();
    res.json(records);
  });

  app.post('/api/settlements', (req, res) => {
    try {
      const { id, date, user_id, type, amount, details } = req.body;
      const settlementId = id || crypto.randomUUID();
      db.prepare('INSERT INTO settlements (id, date, user_id, type, amount, details) VALUES (?, ?, ?, ?, ?, ?)').run(
        settlementId, date, user_id, type, amount, details
      );
      res.json({ success: true, id: settlementId });
    } catch (e: any) {
      console.error('ERROR CREATING SETTLEMENT:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/settlements/:id', (req, res) => {
    try {
      const { id } = req.params;
      const transaction = db.transaction((settlementId: string) => {
        const settlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(settlementId) as any;
        if (!settlement) throw new Error('Settlement not found');

        // Revert linked records back to pending independently of type as they're linked directly via settlement_id field
        db.prepare('UPDATE vehicle_usage SET status = "pending", settlement_id = NULL WHERE settlement_id = ?').run(settlementId);
        db.prepare('UPDATE washing_records SET status = "pending", settlement_id = NULL WHERE settlement_id = ?').run(settlementId);
        db.prepare('UPDATE advances SET status = "pending", settlement_id = NULL WHERE settlement_id = ?').run(settlementId);
        db.prepare('UPDATE tasks SET status = "pending", settlement_id = NULL WHERE settlement_id = ?').run(settlementId);

        // Finally delete the settlement
        db.prepare('DELETE FROM settlements WHERE id = ?').run(settlementId);
      });

      transaction(id);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Error deleting settlement:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Dashboard Metrics
  app.get('/api/dashboard', (req, res) => {
    try {
      const now = new Date();

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      const day = String(now.getDate()).padStart(2, '0');

      const startOfMonthUTC = `${year}-${month}-01T00:00:00.000Z`;
      const endOfMonthUTC = `${year}-${month}-${lastDay}T23:59:59.999Z`;

      const startOfDayUTC = `${year}-${month}-${day}T00:00:00.000Z`;
      const endOfDayUTC = `${year}-${month}-${day}T23:59:59.999Z`;

      // 1. Total Sales (Mes actual)
      const salesQuery = db.prepare(`
        SELECT SUM(total_amount) as total
        FROM orders
        WHERE date >= ? AND date <= ? AND status != 'cancelled'
      `).get(startOfMonthUTC, endOfMonthUTC) as { total: number };
      const totalSales = salesQuery.total || 0;

      // 2. Total Collections (Cobranzas del mes)
      const collectionsQuery = db.prepare(`
        SELECT SUM(amount) as total
        FROM payments
        WHERE date >= ? AND date <= ?
      `).get(startOfMonthUTC, endOfMonthUTC) as { total: number };
      const totalCollections = collectionsQuery.total || 0;

      // 2b. Pending Collections (Deuda Global Pendiente)
      const pendingCollectionsQuery = db.prepare(`
        SELECT SUM(balance) as total
        FROM clients
        WHERE balance > 0
      `).get() as { total: number };
      const pendingCollections = pendingCollectionsQuery.total || 0;

      // 3. Active Clients
      const activeClientsQuery = db.prepare('SELECT COUNT(DISTINCT client_id) as count FROM orders WHERE date >= ? AND date <= ?').get(startOfMonthUTC, endOfMonthUTC) as { count: number };
      const activeClients = activeClientsQuery.count;

      // 4. Pending Deliveries
      const pendingDeliveriesQuery = db.prepare(`
        SELECT COUNT(*) as count 
        FROM orders 
        WHERE date >= ? AND date <= ? AND fulfillment_status != 'delivered' AND fulfillment_status != 'cancelled'
      `).get(startOfDayUTC, endOfDayUTC) as { count: number };
      const pendingDeliveries = pendingDeliveriesQuery.count;

      // 5. Container Stats (Delivered vs Returned) - from orders (Today vs Month)
      const deliveredQuery = db.prepare("SELECT SUM(container_quantity) as total FROM orders WHERE date >= ? AND date <= ? AND status != 'cancelled'").get(startOfMonthUTC, endOfMonthUTC) as { total: number };
      const returnedQuery = db.prepare("SELECT SUM(containers_returned) as total FROM orders WHERE date >= ? AND date <= ? AND status != 'cancelled'").get(startOfMonthUTC, endOfMonthUTC) as { total: number };
      const totalDeliveredContainers = deliveredQuery.total || 0;
      const totalReturnedContainers = returnedQuery.total || 0;

      // 6. Washed Containers Stats - (Mes actual)
      const washedContainersQuery = db.prepare(`
        SELECT 
          SUM(qty_200cc) as q200,
          SUM(qty_500cc) as q500,
          SUM(qty_800cc) as q800,
          SUM(qty_910cc) as q910,
          SUM(qty_bidones) as qBidones
        FROM washing_records
        WHERE date >= ? AND date <= ?
      `).get(startOfMonthUTC, endOfMonthUTC) as any;

      const washedContainersStats = {
        qty200cc: washedContainersQuery.q200 || 0,
        qty500cc: washedContainersQuery.q500 || 0,
        qty800cc: washedContainersQuery.q800 || 0,
        qty910cc: washedContainersQuery.q910 || 0,
        qtyBidones: washedContainersQuery.qBidones || 0,
        total: (washedContainersQuery.q200 || 0) + (washedContainersQuery.q500 || 0) + (washedContainersQuery.q800 || 0) + (washedContainersQuery.q910 || 0) + (washedContainersQuery.qBidones || 0)
      };

      // 7. Chart Data (Ventas vs Cobranzas últimos 7 días)
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const dStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const y = dStart.getFullYear();
        const m = String(dStart.getMonth() + 1).padStart(2, '0');
        const d = String(dStart.getDate()).padStart(2, '0');

        const startUTC = `${y}-${m}-${d}T00:00:00.000Z`;
        const endUTC = `${y}-${m}-${d}T23:59:59.999Z`;

        const daySalesQuery = db.prepare("SELECT SUM(total_amount) as total FROM orders WHERE date >= ? AND date <= ? AND status != 'cancelled'").get(startUTC, endUTC) as { total: number };
        const dayCollectionsQuery = db.prepare('SELECT SUM(amount) as total FROM payments WHERE date >= ? AND date <= ?').get(startUTC, endUTC) as { total: number };

        chartData.push({
          name: dStart.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit' }),
          ventas: daySalesQuery.total || 0,
          cobranzas: dayCollectionsQuery.total || 0
        });
      }

      res.json({
        totalSales,
        totalCollections,
        pendingCollections,
        activeClients,
        pendingDeliveries,
        totalDeliveredContainers,
        totalReturnedContainers,
        washedContainersStats,
        chartData
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: 'Error fetching dashboard data' });
    }
  });

  // Company Expenses Endpoints
  app.get('/api/company-expenses', (req, res) => {
    try {
      const { user_id } = req.query;
      let query = `
        SELECT ce.*, u.name as user_name 
        FROM company_expenses ce
        JOIN users u ON u.id = ce.user_id
      `;
      const params: any[] = [];

      if (user_id) {
        query += ` WHERE ce.user_id = ?`;
        params.push(user_id);
      }

      query += ` ORDER BY ce.date DESC`;

      const expenses = db.prepare(query).all(...params);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching company expenses:", error);
      res.status(500).json({ error: 'Error fetching company expenses' });
    }
  });

  app.post('/api/company-expenses', (req, res) => {
    try {
      const { id, date, user_id, description, amount } = req.body;
      const stmt = db.prepare(`
        INSERT INTO company_expenses (id, date, user_id, description, amount)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(id, date, user_id, description, amount);
      res.json({ success: true, id });
    } catch (error) {
      console.error("Error creating company expense:", error);
      res.status(500).json({ error: 'Error creating company expense' });
    }
  });

  // Database Backup Endpoint
  app.get('/api/backup', (req, res) => {
    try {
      const { secret } = req.query;

      // In production, you'd want a secure secret defined in environment variables or settings
      // For this implementation, we will check a secret stored in DB settings or a default hardcoded one for immediate use.
      const secretSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('backup_secret') as { value: string };
      const validSecret = secretSetting?.value || 'craftos-backup-2026';

      if (secret !== validSecret) {
        return res.status(401).json({ error: 'Unauthorized. Invalid or missing secret key.' });
      }

      const dbPath = fs.existsSync(renderDataPath)
        ? path.join(renderDataPath, 'admin.db')
        : path.join(__dirname, 'admin.db');

      // Force download the file to the client
      res.download(dbPath, `craftos_backup_${new Date().toISOString().split('T')[0]}.db`, (err) => {
        if (err) {
          console.error("Error downloading backup file:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error processing backup file download' });
          }
        }
      });
    } catch (error) {
      console.error("Backup endpoint error:", error);
      res.status(500).json({ error: 'Internal server error during backup' });
    }
  });

  // Top Products Dashboard
  app.get('/api/dashboard/products', (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let query = `
        SELECT p.name, SUM(oi.quantity) as total_quantity
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
      `;
      const params: any[] = [];

      if (startDate && endDate) {
        query += ` WHERE o.date >= ? AND o.date <= ?`;
        params.push(`${startDate}T00:00:00.000Z`, `${endDate}T23:59:59.999Z`);
      }

      query += ` GROUP BY oi.product_id ORDER BY total_quantity DESC LIMIT 10`;

      const topProducts = db.prepare(query).all(...params);
      res.json(topProducts);

    } catch (error) {
      console.error("Top products error:", error);
      res.status(500).json({ error: 'Error fetching top products data' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
