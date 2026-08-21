require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = express.urlencoded;

require('./db'); // veritabanını başlat (tabloları oluşturur)

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser({ extended: true }));
app.use(express.json());

// Not: Oturumlar bellekte (RAM) tutulur — native derleme gerektiren
// paketlerden kaçınmak için basit tutuldu. Sunucuyu yeniden başlatınca
// (örn. bilgisayarı kapatıp açtığınızda) sepetler/admin oturumları sıfırlanır,
// ama ürünler ve siparişler (veritabanında saklandığı için) kaybolmaz.
app.use(session({
  secret: process.env.SESSION_SECRET || 'gizli-anahtar-degistirin',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 gün
}));

// Sepet bilgisini tüm görünümlerde kullanılabilir yap
app.use((req, res, next) => {
  const cart = req.session.cart || {};
  res.locals.cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  res.locals.siteName = 'TopSaha Basketbol';
  next();
});

app.use('/', require('./routes/shop'));
app.use('/', require('./routes/cart'));
app.use('/', require('./routes/checkout'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`\n🏀 TopSaha Basketbol sitesi çalışıyor: http://localhost:${PORT}`);
  console.log(`   Admin panel: http://localhost:${PORT}/admin  (giriş: .env dosyasındaki ADMIN_USERNAME / ADMIN_PASSWORD)\n`);
});
