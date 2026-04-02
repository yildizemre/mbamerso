# MBA Futbol Takım Oluşturucu ⚽

Modern, responsive ve özellik dolu bir futbol takımı oluşturma uygulaması.

## 🎯 Özellikler

### ✨ Temel Özellikler
- **2026 turnuva listesi** — `public/2026 İstanbul Spor Turnuvası Katılımcı Numaralı.xlsx` dosyası açılışta yüklenir (Futbol, Voleybol, … sekmeleri)
- **Manuel Oyuncu Ekleme** - Kendi oyuncularınızı ekleyin
- **Kategori Filtreleme** - Karışık, Sadece Erkek veya Sadece Kadın takımlar oluşturun
- **Dinamik Takım Boyutu** - 5 ile 15 oyuncu arası takım büyüklüğü seçin (standart: 11)
- **Fisher-Yates Algoritması** - Gerçek rastgele karıştırma

### ⚡ Gelişmiş Özellikler

#### 🎖️ Pozisyon Sistemi
- **4 Pozisyon**: Kaleci (GK), Defans (DEF), Orta Saha (MID), Forvet (FWD)
- Her oyuncunun pozisyonu belirleniyor
- Pozisyona göre filtreleme

#### 📊 Rating Sistemi
- **1-100 arası rating** sistemi
- Her oyuncunun yetenek seviyesi belirleniyor
- Ortalama rating gösterimi

#### ⚖️ Dengeli Takım Oluşturma
- Rating bazlı dengeli takım algoritması
- Her takımın toplam gücü dengeleniyor
- Takım rating'leri görüntüleniyor

#### ⭐ Favori Oyuncular
- Oyuncuları favori olarak işaretleme
- Favori oyuncuları filtreleme
- Yıldız ikonu ile gösterim

#### ✏️ Takım İsmi Özelleştirme
- Her takıma özel isim verme
- Takım kartında düzenleme butonu
- Hızlı inline editing

#### 📄 PDF Export
- Oluşturulan takımları PDF olarak indirme
- Profesyonel tablo formatı
- Oyuncu detayları dahil

#### 🌓 Dark/Light Mode
- Tema değiştirme özelliği
- Otomatik kaydetme (localStorage)
- Smooth geçişler

## 🎨 Modern Tasarım

- **Yeşil/Emerald Tema** - Futbol sahalarını anımsatan renkler
- **Gradient Arka Planlar** - Animasyonlu blur efektleri
- **Backdrop Blur** - Cam efekti (glassmorphism)
- **Hover Animasyonları** - Scale ve glow efektleri
- **Responsive Grid** - Mobil, tablet ve desktop uyumlu
- **Smooth Transitions** - Her geçiş animasyonlu

## 🛠️ Teknolojiler

- **React 18** - Modern React hooks
- **TypeScript** - Type-safe kod
- **Vite** - Hızlı build tool
- **Tailwind CSS** - Utility-first CSS
- **React Router** - Çok sayfalı navigasyon
- **Lucide React** - Modern ikonlar
- **jsPDF** - PDF oluşturma
- **Supabase** - Database (hazır)

## 📱 Sayfalar

### 1. Takımlar (Ana Sayfa)
- Kategori seçimi
- Takım boyutu ayarı (slider)
- Dengeli takım toggle
- İstatistikler & ön izleme (daraltılabilir)
- Takım oluşturma butonu
- Oluşturulan takımlar (renkli kartlar)
- Takım rating gösterimi
- PDF export butonu
- Yedek oyuncular bölümü

### 2. Oyuncu Kadrosu
- Arama çubuğu
- Cinsiyet filtresi
- Pozisyon filtresi
- Favori filtresi
- Tablo görünümü
- Rating gösterimi
- Favori işaretleme

### 3. Oyuncu Ekle
- Ad Soyad input
- Cinsiyet seçimi (büyük butonlar)
- Pozisyon seçimi (4 seçenek)
- Rating slider (1-100)
- Rating kategorileri (Zayıf → Mükemmel)
- Başarı mesajı

## 🎮 Nasıl Kullanılır

1. **Kategori Seçin** - Karışık, Erkek veya Kadın
2. **Takım Boyutunu Ayarlayın** - 5-15 oyuncu arası
3. **Dengeli Takım İsteyin mi?** - Checkbox ile aktifleştirin
4. **Ön İzleme Kontrol Edin** - İstatistikleri gözden geçirin
5. **Takımları Oluşturun** - Büyük yeşil butona basın
6. **Takım İsimlerini Düzenleyin** - Kartlardaki edit butonuna tıklayın
7. **PDF İndirin** - Export butonuyla PDF oluşturun

## 🚀 Geliştirme

\`\`\`bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusu (otomatik başlatılıyor)
npm run dev

# Build
npm run build

# Lint
npm run lint
\`\`\`

## 📂 Proje Yapısı

\`\`\`
src/
├── components/         # React componentleri
│   └── Navigation.tsx  # Navigasyon bar
├── context/           # Context providers
│   └── ThemeContext.tsx
├── pages/             # Sayfa componentleri
│   ├── TeamsPage.tsx
│   ├── PlayersPage.tsx
│   └── AddPlayerPage.tsx
├── types/             # TypeScript tipleri
│   └── player.ts
├── utils/             # Yardımcı fonksiyonlar
│   ├── playerGenerator.ts
│   ├── teamBalancer.ts
│   └── pdfExport.ts
├── App.tsx            # Ana uygulama
└── main.tsx           # Entry point
\`\`\`

## 🎯 Özellik Detayları

### Dengeli Takım Algoritması
Oyuncular rating'lerine göre sıralanır ve her takıma sırayla en yüksek rating'li oyuncular dağıtılır. Bu sayede tüm takımların toplam rating'i birbirine yakın olur.

### Fisher-Yates Shuffle
Gerçek rastgele karıştırma için Fisher-Yates algoritması kullanılır. Her oyuncu eşit şansa sahiptir.

### Pozisyon Dağılımı
- Kaleci: %10
- Defans: %30
- Orta Saha: %35
- Forvet: %25

### Rating Kategorileri
- 1-20: Çok Zayıf (Kırmızı)
- 21-40: Zayıf (Turuncu)
- 41-60: Orta (Sarı)
- 61-80: İyi (Yeşil)
- 81-100: Mükemmel (Emerald)

## 🎨 Renk Paleti

- **Ana Renk**: Emerald Green (#10b981)
- **Vurgu**: Green (#22c55e)
- **Arka Plan**: Gray-950 (#030712)
- **Kartlar**: Gray-900/80 (Şeffaf)
- **Kenarlıklar**: Emerald-500/20

## 📊 Supabase Schema

Database hazır ve kullanıma hazır:
- `players` - Oyuncu verileri
- `saved_teams` - Kaydedilen takım grupları
- `team_players` - Takım-oyuncu ilişkileri

## 🔒 Güvenlik

- Row Level Security (RLS) aktif
- Kullanıcılar sadece kendi verilerini görebilir
- Auth.users ile entegre

## 📱 Responsive Breakpoints

- **Mobile**: < 640px (tek kolon)
- **Tablet**: 640px - 1024px (2 kolon)
- **Desktop**: > 1024px (3-4 kolon)

## ⚡ Performans

- Lazy loading
- Code splitting
- Optimized images
- Minimal re-renders
- Memoized calculations

## 🎉 Ek Notlar

- Tüm animasyonlar CSS transitions ile yapıldı
- Accessibility (a11y) düşünüldü
- SEO friendly
- PWA ready (opsiyonel)

---

**Geliştirici**: Claude (Anthropic)
**Versiyon**: 2.0
**Tarih**: 2026-02-23
