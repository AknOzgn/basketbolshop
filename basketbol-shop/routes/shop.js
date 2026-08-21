const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const category = req.query.kategori || null;
  const q = req.query.q || null;

  let sql = 'SELECT * FROM products WHERE active = 1';
  const params = [];
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (q) {
    sql += ' AND name LIKE ?';
    params.push(`%${q}%`);
  }
  sql += ' ORDER BY created_at DESC';

  const products = db.prepare(sql).all(...params);
  const categories = db.prepare('SELECT DISTINCT category FROM products WHERE active = 1').all().map(r => r.category);

  res.render('index', { products, categories, activeCategory: category, q: q || '' });
});

router.get('/urun/:slug', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!product) return res.status(404).render('404');
  res.render('product', { product });
});

module.exports = router;
