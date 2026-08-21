const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const slugify = require('slugify');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'img')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'urun-' + Date.now() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// --- GİRİŞ ---
router.get('/login', (req, res) => {
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.render('admin/login', { error: 'Kullanıcı adı veya şifre hatalı.' });
  }
  req.session.isAdmin = true;
  req.session.adminUsername = user.username;
  res.redirect('/admin');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// --- DASHBOARD ---
router.get('/', requireAdmin, (req, res) => {
  const productCount = db.prepare('SELECT COUNT(*) c FROM products').get().c;
  const orderCount = db.prepare('SELECT COUNT(*) c FROM orders').get().c;
  const pendingCount = db.prepare("SELECT COUNT(*) c FROM orders WHERE status LIKE 'Beklemede%' OR status = 'Ödeme Bekleniyor'").get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) t FROM orders WHERE status = 'Ödendi' OR status LIKE 'Beklemede%'").get().t;
  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 8').all();
  res.render('admin/dashboard', { productCount, orderCount, pendingCount, revenue, recentOrders });
});

// --- ÜRÜNLER ---
router.get('/urunler', requireAdmin, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  res.render('admin/products', { products });
});

router.get('/urunler/yeni', requireAdmin, (req, res) => {
  res.render('admin/product-form', { product: null });
});

router.post('/urunler/yeni', requireAdmin, upload.single('image'), (req, res) => {
  const { name, description, price, stock, category } = req.body;
  const slug = slugify(name, { lower: true, locale: 'tr', strict: true }) + '-' + Date.now().toString().slice(-4);
  const image_url = req.file ? '/img/' + req.file.filename : '/img/placeholder.svg';
  db.prepare(`INSERT INTO products (name, slug, description, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(name, slug, description, parseFloat(price), parseInt(stock), category, image_url);
  res.redirect('/admin/urunler');
});

router.get('/urunler/:id/duzenle', requireAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).send('Ürün bulunamadı');
  res.render('admin/product-form', { product });
});

router.post('/urunler/:id/duzenle', requireAdmin, upload.single('image'), (req, res) => {
  const { name, description, price, stock, category, active } = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  const image_url = req.file ? '/img/' + req.file.filename : existing.image_url;
  db.prepare(`UPDATE products SET name=?, description=?, price=?, stock=?, category=?, image_url=?, active=? WHERE id=?`)
    .run(name, description, parseFloat(price), parseInt(stock), category, image_url, active ? 1 : 0, req.params.id);
  res.redirect('/admin/urunler');
});

router.post('/urunler/:id/sil', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.redirect('/admin/urunler');
});

// --- SİPARİŞLER ---
router.get('/siparisler', requireAdmin, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.render('admin/orders', { orders });
});

router.get('/siparisler/:id', requireAdmin, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).send('Sipariş bulunamadı');
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.render('admin/order-detail', { order, items });
});

router.post('/siparisler/:id/durum', requireAdmin, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.redirect(`/admin/siparisler/${req.params.id}`);
});

module.exports = router;
