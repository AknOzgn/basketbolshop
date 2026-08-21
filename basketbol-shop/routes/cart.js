const express = require('express');
const router = express.Router();
const db = require('../db');

function getCart(req) {
  if (!req.session.cart) req.session.cart = {}; // { productId: quantity }
  return req.session.cart;
}

function buildCartView(req) {
  const cart = getCart(req);
  const ids = Object.keys(cart);
  if (ids.length === 0) return { items: [], total: 0 };

  const placeholders = ids.map(() => '?').join(',');
  const products = db.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`).all(...ids);

  const items = products.map(p => ({
    product: p,
    quantity: cart[p.id],
    subtotal: p.price * cart[p.id]
  }));
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  return { items, total };
}

router.get('/sepet', (req, res) => {
  const { items, total } = buildCartView(req);
  res.render('cart', { items, total });
});

router.post('/sepet/ekle', (req, res) => {
  const { productId, quantity } = req.body;
  const qty = Math.max(1, parseInt(quantity) || 1);
  const cart = getCart(req);
  cart[productId] = (cart[productId] || 0) + qty;
  req.session.cart = cart;
  res.redirect('back');
});

router.post('/sepet/guncelle', (req, res) => {
  const { productId, quantity } = req.body;
  const cart = getCart(req);
  const qty = parseInt(quantity);
  if (qty <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = qty;
  }
  req.session.cart = cart;
  res.redirect('/sepet');
});

router.post('/sepet/sil', (req, res) => {
  const { productId } = req.body;
  const cart = getCart(req);
  delete cart[productId];
  req.session.cart = cart;
  res.redirect('/sepet');
});

module.exports = router;
module.exports.buildCartView = buildCartView;
