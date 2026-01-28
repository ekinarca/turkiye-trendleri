# 📊 Türkiye Trendleri

Türkiye'deki Google Trends verilerinden otomatik haber üreten modern bir web sitesi.

![Türkiye Trendleri](https://img.shields.io/badge/Türkiye-Trendleri-red?style=flat-square)
![Astro](https://img.shields.io/badge/Astro-5.0-purple?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square)

## 🌟 Özellikler

- **Otomatik Trend Takibi**: Google Trends Türkiye verilerini günde 3 kez çeker
- **Akıllı Araştırma**: Google Haberler ve Türk haber siteleri RSS'lerinden kaynak toplar
- **Yapay Zeka İçerik**: OpenAI GPT ile özgün Türkçe haberler üretir
- **Şeffaf Kaynaklar**: Her haberde kullanılan kaynaklar listelenir
- **Deduplication**: Aynı trend için tekrar makale yazmaz
- **Modern UI**: Temiz, hızlı, responsive tasarım

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js 20+
- npm veya yarn
- OpenAI API anahtarı (makale üretimi için)

### Kurulum

```bash
# Repoyu klonla
git clone https://github.com/KULLANICI/turkiye-trendleri.git
cd turkiye-trendleri

# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

### Ortam Değişkenleri

```bash
# .env dosyası oluştur
cp .env.example .env

# Değişkenleri düzenle
OPENAI_API_KEY=sk-...
```

## 📁 Proje Yapısı

```
turkiye-trendleri/
├── src/
│   ├── content/
│   │   └── posts/          # Oluşturulan makaleler
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro     # Ana sayfa
│   │   ├── trendler/       # Trendler sayfası
│   │   ├── kategoriler/    # Kategoriler
│   │   ├── hakkinda.astro  # Hakkında
│   │   └── haber/          # Makale detay
│   └── utils/
│       └── date.ts         # Tarih yardımcıları
├── scripts/
│   └── pipeline/
│       ├── index.ts        # Ana pipeline
│       ├── fetch-trends.ts # Trend çekici
│       ├── research.ts     # Araştırma modülü
│       ├── generate.ts     # Makale üretici
│       ├── publish.ts      # Yayınlayıcı
│       └── utils/          # Yardımcı fonksiyonlar
├── data/
│   ├── trends/             # Trend snapshot'ları
│   ├── research/           # Araştırma paketleri
│   ├── logs/               # Çalışma logları
│   └── state.json          # Deduplication state
├── tests/                  # Test dosyaları
├── .github/
│   └── workflows/
│       └── auto-publish.yml
├── astro.config.mjs
├── netlify.toml
├── package.json
└── README.md
```

## 🛠️ Komutlar

```bash
# Geliştirme
npm run dev              # Geliştirme sunucusu
npm run build            # Production build
npm run preview          # Build önizleme

# Pipeline
npm run autopublish      # Tam pipeline çalıştır
npm run autopublish:dry  # Test modu (makale üretmez)
npm run fetch-trends     # Sadece trend çek

# Test
npm run test             # Testleri çalıştır
npm run test:watch       # Watch modunda test

# Kod kalitesi
npm run lint             # ESLint
npm run format           # Prettier
```

## 🔄 Otomatik Çalışma

Site GitHub Actions ile günde 3 kez otomatik güncellenir:

| Türkiye Saati | UTC Saati | Cron |
|---------------|-----------|------|
| 00:30 | 21:30 (önceki gün) | `30 21 * * *` |
| 12:30 | 09:30 | `30 9 * * *` |
| 21:30 | 18:30 | `30 18 * * *` |

### Manuel Tetikleme

GitHub Actions > "Otomatik Haber Yayınlama" > "Run workflow"

## 🌐 Netlify Deployment

### Otomatik Deploy

1. GitHub'da repo oluştur ve push et
2. Netlify'da "New site from Git" seç
3. GitHub reposunu bağla
4. Build ayarları otomatik algılanacak:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Deploy!

### Environment Variables (Netlify)

Netlify'da ortam değişkeni ayarlamaya gerek yok - build sırasında pipeline çalışmaz.
Pipeline sadece GitHub Actions'da çalışır.

### GitHub Secrets

GitHub repo ayarlarından şu secret'ı ekleyin:

- `OPENAI_API_KEY`: OpenAI API anahtarınız

## 📝 Kategoriler

| Kategori | Açıklama |
|----------|----------|
| Ekonomi | Finans, borsa, döviz |
| Spor | Futbol, basketbol, diğer sporlar |
| Magazin | Ünlüler, eğlence |
| Teknoloji | Yazılım, donanım, internet |
| Siyaset | İç ve dış politika |
| Sağlık | Tıp, sağlık haberleri |
| Dünya | Uluslararası haberler |
| Eğitim | Eğitim sistemi, okullar |
| Kripto | Kripto paralar, blockchain |
| Otomotiv | Arabalar, otomotiv sektörü |
| Diğer | Diğer konular |

## ⚠️ Önemli Notlar

- Bu site yapay zeka tarafından otomatik oluşturulur
- Tüm içerikler kaynaklarla birlikte sunulur
- Kritik bilgiler için birincil kaynakları kontrol edin
- Hiçbir ücretli API kullanılmamaktadır

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing`)
5. Pull Request açın

## 📄 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

<p align="center">
  🇹🇷 Türkiye'deki trendleri takip edin!
</p>
