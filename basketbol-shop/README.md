# 🏀 Basketbol — E-Ticaret Sitesi

Basketbol malzemeleri satan, admin panelli, ödeme sistemi entegre tam çalışan bir e-ticaret sitesi.

## İçindekiler
- Ürün vitrini (kategori filtreleme, arama, ürün detay)
- Sepet (ekle/güncelle/sil)
- Ödeme: Havale/EFT + Kredi Kartı (iyzico)
- Sipariş onay sayfası + sipariş takip numarası
- Admin paneli: dashboard, ürün yönetimi (ekle/düzenle/sil, resim yükleme), sipariş yönetimi (durum güncelleme)
- SQLite veritabanı (kurulum gerektirmez, dosya tabanlı)

## Kurulum

### 1) Gereksinimler
- Node.js 22.13 veya üzeri (https://nodejs.org). Bu proje Node'un yerleşik `node:sqlite` modülünü kullanır, bu yüzden **hiçbir native derleme / Visual Studio Build Tools gerekmez** — `npm install` sadece saf JavaScript paketlerini indirir.

### 2) Bağımlılıkları yükleyin
```bash
cd basketbol-shop
npm install
```

### 3) Ortam değişkenlerini ayarlayın
```bash
cp .env.example .env
```
Sonra `.env` dosyasını açıp **kendi bilgilerinizi girin**:

```env
PORT=3000
SESSION_SECRET=cok-gizli-uzun-bir-anahtar-yazin

ADMIN_USERNAME=admin
ADMIN_PASSWORD=guclu-bir-sifre-belirleyin

# Havale/EFT ödeme seçeneğinde müşteriye gösterilecek bilgiler
BANK_IBAN=TR00 0000 0000 0000 0000 0000 00
BANK_ACCOUNT_HOLDER=Ad Soyad / Firma Ünvanı
BANK_NAME=Banka Adı

# Kredi kartı ile ödeme almak isterseniz (opsiyonel)
# iyzico.com'da üye işyeri hesabı açtıktan sonra doldurun.
# Boş bırakırsanız sitede sadece Havale/EFT seçeneği görünür, site bozulmaz.
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
```

### 4) Örnek ürünleri yükleyin (opsiyonel ama önerilir)
```bash
npm run seed
```
Bu komut 12 örnek basketbol ürünü ekler (top, ayakkabı, forma, pota, aksesuar). İsterseniz admin panelinden hepsini silip kendi ürünlerinizi ekleyebilirsiniz.

### 5) Siteyi başlatın
```bash
npm start
```
Site: **http://localhost:3000**
Admin panel: **http://localhost:3000/admin** (giriş bilgileri `.env` dosyasındaki `ADMIN_USERNAME` / `ADMIN_PASSWORD`)

## Ödeme Sistemi Nasıl Çalışır?

### Havale/EFT (varsayılan, her zaman aktif)
`.env` dosyasına girdiğiniz IBAN bilgileri hem ödeme sayfasında hem de sipariş onay sayfasında müşteriye otomatik gösterilir. Müşteri ödemeyi yaptıktan sonra admin panelinden sipariş durumunu "Ödendi" olarak güncelleyebilirsiniz.

### Kredi Kartı (iyzico — opsiyonel)
1. [iyzico.com](https://www.iyzico.com) üzerinden üye işyeri (merchant) hesabı açın. Başvuru sırasında IBAN'ınızı da onlara vermeniz gerekecek (tahsil edilen ödemeler bu IBAN'a yatar).
2. Onay sonrası "Ayarlar > API Anahtarları" bölümünden `API Key` ve `Secret Key` alın.
3. Bu anahtarları `.env` dosyasındaki `IYZICO_API_KEY` ve `IYZICO_SECRET_KEY` alanlarına yazın.
4. Test etmek isterseniz `IYZICO_BASE_URL=https://sandbox-api.iyzipay.com` olarak bırakın (sandbox/test ortamı). Canlıya alırken `https://api.iyzipay.com` yapın ve sandbox anahtarları yerine gerçek (production) anahtarlarınızı girin.

Anahtarlar boşken kredi kartı seçeneği sitede otomatik gizlenir — hiçbir hata vermez.

## Admin Panelinden Neler Yapabilirsiniz?
- **Panel**: toplam ürün/sipariş/ciro özeti, son siparişler
- **Ürünler**: yeni ürün ekleme (resim yükleyerek), mevcut ürünleri düzenleme/silme, stok ve fiyat güncelleme, ürünü sitede gizleme (aktif/pasif)
- **Siparişler**: tüm siparişleri görüntüleme, sipariş detayına girip durumunu güncelleme (Beklemede → Hazırlanıyor → Kargoya Verildi → Teslim Edildi vb.)

## Siteyi Yayına Almak (Deploy)

Bu proje herhangi bir Node.js destekleyen sunucuda çalışır. Örnek seçenekler:
- **Render.com**, **Railway.app**, **Fly.io** — ücretsiz/uygun fiyatlı, Node.js projelerini kolayca yayınlar
- Kendi VPS'iniz (DigitalOcean, Hetzner vb.) üzerinde `pm2` ile arka planda çalıştırabilirsiniz:
  ```bash
  npm install -g pm2
  pm2 start server.js --name basketbol-shop
  ```
- Bir alan adı bağlamak isterseniz sunucunuzun önüne **Nginx** koyup ters vekil (reverse proxy) olarak 3000 portuna yönlendirmeniz yeterli.

**Önemli:** `.env` dosyanızı asla herkese açık bir yere (GitHub gibi) yüklemeyin — IBAN ve API anahtarlarınızı içerir. `.gitignore` dosyasında zaten hariç tutulmuştur.

## Klasör Yapısı
```
basketbol-shop/
├── server.js           # Ana sunucu
├── db.js               # Veritabanı bağlantısı ve şema
├── seed.js             # Örnek ürün yükleme scripti
├── payment/iyzico.js   # Kredi kartı ödeme entegrasyonu
├── middleware/auth.js  # Admin oturum kontrolü
├── routes/              # Sayfa/route tanımları
│   ├── shop.js          # Ürün listeleme/detay
│   ├── cart.js          # Sepet işlemleri
│   ├── checkout.js      # Ödeme ve sipariş
│   └── admin.js         # Admin paneli
├── views/               # EJS şablonları (HTML)
│   └── admin/            # Admin paneli sayfaları
├── public/               # CSS, görseller
└── data/                 # SQLite veritabanı dosyası (otomatik oluşur)
```

## Sık Sorulan Sorular

**Ürün resimlerini nereden değiştiririm?**
Admin panelinden ürün düzenlerken "Ürün Görseli" alanından bilgisayarınızdan resim yükleyebilirsiniz.

**Stok biterse ne olur?**
Ürün stoğu 0 olduğunda ana sayfada "Stokta yok" etiketiyle gösterilir ve sepete eklenemez.

**Vergi/fatura sistemi var mı?**
Hayır, bu temel bir e-ticaret altyapısıdır. Fatura kesme (e-fatura/e-arşiv) için ayrıca bir muhasebe/fatura entegrasyonu (örn. Paraşüt, Logo) gerekir.

**Kargo entegrasyonu var mı?**
Şu an yok. Sipariş durumunu admin panelinden manuel olarak "Kargoya Verildi" gibi güncelleyebilirsiniz. İsterseniz ileride bir kargo firması API'si eklenebilir.
