const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();


const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log("[db] 'data' klasörü oluşturuldu.");
}


const db = new DatabaseSync(path.join(dataDir, 'shop.db'));
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Genel',
  image_url TEXT DEFAULT '/img/placeholder.svg',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Beklemede',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);
`);

// İlk kurulumda admin kullanıcıyı .env'den oluştur / güncelle
const adminUser = process.env.ADMIN_USERNAME || 'admin';
const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
const existing = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(adminUser);
if (!existing) {
  const hash = bcrypt.hashSync(adminPass, 10);
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(adminUser, hash);
  console.log(`[db] Admin kullanıcı oluşturuldu: ${adminUser}`);
}

// Basit transaction yardımcı fonksiyonu (better-sqlite3'teki db.transaction() yerine)
db.runInTransaction = function (fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

module.exports = db;
// --- BAŞLANGIÇ VERİSİ (SEED DATA) ---
const slugify = require('slugify');

const products = [
  { name: 'Spalding NBA Resmi Maç Topu', price: 1299.90, stock: 25, category: 'Toplar', description: 'Resmi boy ve ağırlıkta, iç mekan/dış mekan kullanıma uygun kompozit deri basketbol topu.' },
  { name: 'Wilson Evolution Salon Topu', price: 1099.00, stock: 30, category: 'Toplar', description: 'Salon içi maçlar için üstün tutuş sağlayan mikrofiber kompozit deri top.' },
  { name: 'Nike Elite Basketbol Ayakkabısı', price: 3499.00, stock: 15, category: 'Ayakkabı', description: 'Yüksek konçlu, hava yastıklı taban ile bilek desteği sağlayan performans ayakkabısı.' },
  { name: 'Jordan Air Basketbol Ayakkabısı', price: 4899.00, stock: 10, category: 'Ayakkabı', description: 'Saha içi çeviklik ve sıçrama performansı için tasarlanmış ikonik model.' },
  { name: 'Takım Forması (Şort + Forma Takım)', price: 449.90, stock: 50, category: 'Giyim', description: 'Nefes alabilen kumaştan üretilmiş, terletmeyen basketbol forma takımı.' },
  { name: 'Basketbol Potası (Ayarlanabilir, Ev Tipi)', price: 2799.00, stock: 8, category: 'Ekipman', description: 'Yüksekliği ayarlanabilir, tekerlekli taşınabilir basketbol potası seti.' },
  { name: 'Duvar Tipi Basketbol Potası', price: 1599.00, stock: 12, category: 'Ekipman', description: 'Garaj veya duvara monte edilebilen sağlam çelik çerçeveli pota.' },
  { name: 'Basketbol Filesi (Yedek)', price: 89.90, stock: 100, category: 'Aksesuar', description: 'Standart çember ölçülerine uygun dayanıklı yedek file.' },
  { name: 'Basketbol Diz Koruyucu Seti', price: 199.90, stock: 40, category: 'Aksesuar', description: 'Sakatlanmayı önleyici, esnek ve nefes alabilir diz koruyucu (2 adet).' },
  { name: 'Basketbol Pompası ve İğne Seti', price: 79.90, stock: 60, category: 'Aksesuar', description: 'Topunuzu her zaman ideal basınçta tutmanız için taşınabilir pompa seti.' },
  { name: 'Antrenman Konileri (Set of 10)', price: 249.90, stock: 20, category: 'Ekipman', description: 'Çeviklik ve dripling antrenmanları için renkli plastik koniler.' },
  { name: 'Basketbol Sırt Çantası', price: 599.90, stock: 18, category: 'Aksesuar', description: 'Top bölmeli, ayakkabı cebi olan geniş hacimli spor çantası.' }
];

const existingCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;

if (existingCount === 0) {
  console.log("[db] Ürün tablosu boş, başlangıç ürünleri yükleniyor...");
  
  const insert = db.prepare(`
    INSERT INTO products (name, slug, description, price, stock, category, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  db.runInTransaction(() => {
    for (const p of products) {
      const slug = slugify(p.name, { lower: true, locale: 'tr', strict: true });
      insert.run(p.name, slug, p.description, p.price, p.stock, p.category, '/img/placeholder.svg');
    }
  });
  console.log(`[db] ${products.length} ürün başarıyla eklendi.`);
} else {
  console.log(`[db] Veritabanında zaten ${existingCount} ürün var, seed atlandı.`);
}