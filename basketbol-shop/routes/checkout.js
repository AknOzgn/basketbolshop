const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const { buildCartView } = require('./cart');
const iyzico = require('../payment/iyzico');
require('dotenv').config();

function generateOrderNo() {
  return 'SIP' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);
}

router.get('/odeme', (req, res) => {
  const { items, total } = buildCartView(req);
  if (items.length === 0) return res.redirect('/sepet');
  res.render('checkout', {
    items,
    total,
    iyzicoActive: iyzico.isConfigured(),
    bankInfo: {
      iban: process.env.BANK_IBAN || 'IBAN henüz tanımlanmadı',
      holder: process.env.BANK_ACCOUNT_HOLDER || '-',
      bankName: process.env.BANK_NAME || '-'
    },
    error: null
  });
});

router.post('/odeme', async (req, res) => {
  const { items, total } = buildCartView(req);
  if (items.length === 0) return res.redirect('/sepet');

  const { customer_name, email, phone, address, city, payment_method } = req.body;

  if (!customer_name || !email || !address || !city) {
    return res.render('checkout', {
      items, total,
      iyzicoActive: iyzico.isConfigured(),
      bankInfo: {
        iban: process.env.BANK_IBAN, holder: process.env.BANK_ACCOUNT_HOLDER, bankName: process.env.BANK_NAME
      },
      error: 'Lütfen tüm zorunlu alanları doldurun.'
    });
  }

  const orderNo = generateOrderNo();

  const insertOrder = db.prepare(`
    INSERT INTO orders (order_no, customer_name, email, phone, address, city, total, payment_method, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);

  const initialStatus = payment_method === 'kredi_karti' ? 'Ödeme Bekleniyor' : 'Beklemede (Havale/EFT)';

  const orderId = db.runInTransaction(() => {
    const result = insertOrder.run(orderNo, customer_name, email, phone, address, city, total, payment_method, initialStatus);
    for (const item of items) {
      insertItem.run(result.lastInsertRowid, item.product.id, item.product.name, item.quantity, item.product.price);
      db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(item.quantity, item.product.id);
    }
    return result.lastInsertRowid;
  });

  // Kredi kartı ile ödeme seçildiyse ve iyzico yapılandırılmışsa
  // kullanıcıyı iyzico'nun ödeme sayfasına yönlendir.
  if (payment_method === 'kredi_karti' && iyzico.isConfigured()) {
    try {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
      const callbackUrl = `${req.protocol}://${req.get('host')}/odeme/geri-donus`;
      const result = await iyzico.createCheckoutForm({ order, items: orderItems, callbackUrl });
      req.session.cart = {};
      return res.redirect(result.paymentPageUrl);
    } catch (err) {
      console.error('[iyzico] Ödeme başlatılamadı:', err.message);
      // Hata olursa siparişi havale/EFT bekleyen olarak bırak, kullanıcıyı bilgilendir
    }
  }

  req.session.cart = {};
  res.redirect(`/siparis/${orderNo}`);
});

// iyzico ödeme sonrası dönüş adresi
router.post('/odeme/geri-donus', express.urlencoded({ extended: true }), async (req, res) => {
  const token = req.body.token;
  try {
    const result = await iyzico.retrieveCheckoutForm(token);
    const orderNo = result.basketId;
    const status = result.paymentStatus === 'SUCCESS' ? 'Ödendi' : 'Ödeme Başarısız';
    db.prepare('UPDATE orders SET status = ? WHERE order_no = ?').run(status, orderNo);
    res.redirect(`/siparis/${orderNo}`);
  } catch (err) {
    console.error('[iyzico] Geri dönüş hatası:', err.message);
    res.redirect('/');
  }
});

router.get('/siparis/:orderNo', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(req.params.orderNo);
  if (!order) return res.status(404).render('404');
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const bankInfo = {
    iban: process.env.BANK_IBAN,
    holder: process.env.BANK_ACCOUNT_HOLDER,
    bankName: process.env.BANK_NAME
  };
  res.render('order-confirmation', { order, items, bankInfo });
});

module.exports = router;
