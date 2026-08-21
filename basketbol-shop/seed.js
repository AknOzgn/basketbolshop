const db = require('./db');
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

const insert = db.prepare(`
  INSERT INTO products (name, slug, description, price, stock, category, image_url)
  VALUES (@name, @slug, @description, @price, @stock, @category, @image_url)
`);

const existingCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;

if (existingCount === 0) {
  db.runInTransaction(() => {
    for (const p of products) {
      insert.run({
        ...p,
        slug: slugify(p.name, { lower: true, locale: 'tr', strict: true }),
        image_url: '/img/placeholder.svg'
      });
    }
  });
  console.log(`[seed] ${products.length} ürün eklendi.`);
} else {
  console.log(`[seed] Veritabanında zaten ${existingCount} ürün var, seed atlandı.`);
}
