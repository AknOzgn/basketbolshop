// ============================================================
// IYZICO ÖDEME ENTEGRASYONU
// ============================================================
// Bu dosya, kredi kartı ile online ödeme almanızı sağlar.
// Çalışması için .env dosyasına şu bilgileri girmeniz gerekir:
//   IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL
//
// Bu bilgileri www.iyzico.com üzerinden üye işyeri hesabı
// açtıktan sonra "Ayarlar > API Anahtarları" bölümünden alabilirsiniz.
// Anahtarlar girilmeden bu modül devre dışı kalır ve sitede
// sadece "Havale/EFT" ödeme seçeneği görünür.
// ============================================================

require('dotenv').config();
const Iyzipay = require('iyzipay');

function isConfigured() {
  return !!(process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY);
}

function getClient() {
  return new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'
  });
}

// Ödeme formu (checkout form) başlatır, kullanıcıyı iyzico'nun
// güvenli ödeme sayfasına yönlendirecek bir "paymentPageUrl" döner.
function createCheckoutForm({ order, items, callbackUrl }) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      return reject(new Error('IYZICO_NOT_CONFIGURED'));
    }
    const iyzipay = getClient();

    const basketItems = items.map((item, i) => ({
      id: String(item.product_id || i + 1),
      name: item.product_name,
      category1: 'Basketbol',
      itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
      price: (item.price * item.quantity).toFixed(2)
    }));

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: order.order_no,
      price: order.total.toFixed(2),
      paidPrice: order.total.toFixed(2),
      currency: Iyzipay.CURRENCY.TRY,
      basketId: order.order_no,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl,
      buyer: {
        id: 'BY' + order.id,
        name: order.customer_name.split(' ')[0] || order.customer_name,
        surname: order.customer_name.split(' ').slice(1).join(' ') || '-',
        email: order.email,
        identityNumber: '11111111111', // Gerekirse gerçek TC kimlik no ile değiştirin
        registrationAddress: order.address,
        city: order.city,
        country: 'Turkey'
      },
      shippingAddress: {
        contactName: order.customer_name,
        city: order.city,
        country: 'Turkey',
        address: order.address
      },
      billingAddress: {
        contactName: order.customer_name,
        city: order.city,
        country: 'Turkey',
        address: order.address
      },
      basketItems
    };

    iyzipay.checkoutFormInitialize.create(request, (err, result) => {
      if (err) return reject(err);
      if (result.status !== 'success') return reject(new Error(result.errorMessage || 'iyzico hatası'));
      resolve(result); // result.paymentPageUrl / result.checkoutFormContent
    });
  });
}

// Ödeme sonucunu doğrulamak için (callback sonrası) kullanılır
function retrieveCheckoutForm(token) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) return reject(new Error('IYZICO_NOT_CONFIGURED'));
    const iyzipay = getClient();
    iyzipay.checkoutForm.retrieve({ locale: Iyzipay.LOCALE.TR, token }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

module.exports = { isConfigured, createCheckoutForm, retrieveCheckoutForm };
