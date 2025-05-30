# MOGRT Gruplandırıcı 🎨

Adobe After Effects Motion Graphics Template (MOGRT) dosyalarını otomatik olarak gruplandıran web uygulaması.

## 🚀 Yeni Özellik: Tam MOGRT Desteği!

Artık tüm MOGRT paketini direkt yükleyip dönüştürebilirsiniz! 

### Desteklenen Dosya Formatları:
- **`.mogrt` dosyaları** - Tam MOGRT paketi (önerilen)
- **`.json` dosyaları** - Sadece definition.json

## ⚠️ Önemli Uyarı

**Bu araç sadece MOGRT paketindeki `definition.json` dosyasını dönüştürür.** 

Premiere Pro'da "Installation Failed" hatası alıyorsanız, bunun nedeni MOGRT paketinin diğer dosyalarının güncellenmemiş olmasıdır.

### MOGRT Paketi Yapısı

Bir MOGRT paketi şu dosyalardan oluşur:
- `definition.json` - Template tanım dosyası (bu araç bunu dönüştürür)
- `project.aegraphic` - After Effects proje dosyası
- `thumb.png` - Önizleme görseli

## ✨ Özellikler

- **Tam MOGRT Paketi Desteği**: .mogrt dosyasını direkt yükleyin ve dönüştürün
- **Otomatik Gruplandırma**: Kontrollerinizi otomatik olarak "Global Controllers" ve "Scene Controllers" olarak gruplar
- **Drag & Drop Desteği**: Dosyanızı sürükleyip bırakarak kolayca yükleyin
- **Görsel Önizleme**: Hem girdi hem de çıktı dosyalarının görsel önizlemesi
- **Anında İndirme**: Gruplandırılmış MOGRT veya JSON dosyasını anında indirin

## 📋 Nasıl Çalışır?

Uygulama, gruplandırılmamış MOGRT dosyanızı alır ve:

1. **Global Controllers** grubu oluşturur:
   - Global Position
   - Global Scale
   - Global Rotation

2. **Scene Controllers** grubu oluşturur:
   - Color Control 1
   - Color Control 2
   - Color Control 3

## 🛠️ Kullanım

### MOGRT Dosyası ile Kullanım (Önerilen)

1. **index.html** dosyasını bir web tarayıcısında açın
2. Gruplandırılmamış `.mogrt` dosyanızı sürükleyip bırakın
3. Otomatik dönüşümü inceleyin
4. "Gruplandır ve İndir" butonuna tıklayın
5. Yeni `grouped.mogrt` dosyası otomatik olarak indirilecektir
6. Bu dosyayı direkt Premiere Pro'da kullanabilirsiniz!

### JSON Dosyası ile Kullanım

1. **index.html** dosyasını bir web tarayıcısında açın
2. `definition.json` dosyanızı yükleyin
3. Dönüştürülmüş JSON'u indirin
4. Manuel olarak MOGRT paketini oluşturun

## 🔧 Teknik Detaylar

### MOGRT Paketi İşleme

- MOGRT dosyaları ZIP formatında açılır
- İçindeki `definition.json` otomatik bulunur ve dönüştürülür
- Diğer dosyalar (`.aegraphic`, `thumb.png`) olduğu gibi korunur
- Yeni MOGRT paketi oluşturulur ve indirilir

### Gruplandırma Mantığı

- Kontrol isimleri analiz edilerek otomatik kategorilere ayrılır
- Her grup için sabit UUID'ler kullanılır (uyumluluk için)
- `clientControls` ve `capsuleparams` yapıları güncellenir
- Orijinal versiyon bilgileri korunur

### Desteklenen Kontrol Tipleri

- **Type 2**: Slider
- **Type 3**: Angle (Açı)
- **Type 4**: Color (Renk)
- **Type 5**: Point (Nokta)
- **Type 10**: Group (Grup)

## 🐛 Bilinen Sorunlar ve Çözümleri

### "Installation Failed" Hatası

Bu hata genellikle şu sebeplerden kaynaklanır:

1. **Eksik dosyalar**: Sadece JSON dosyası dönüştürülmüş, diğer dosyalar eksik
2. **Versiyon uyumsuzluğu**: After Effects ve Premiere Pro versiyonları uyumsuz
3. **Bozuk paket**: MOGRT paketi düzgün oluşturulmamış

**Çözüm**: 
- Tüm MOGRT dosyalarının (JSON, .aegraphic, thumbnail) mevcut olduğundan emin olun
- After Effects'te projeyi açıp yeniden export edin
- Premiere Pro'yu güncelleyin

## 📁 Dosya Yapısı

```
/
├── index.html      # Ana HTML dosyası
├── app.js          # JavaScript uygulama mantığı
└── README.md       # Bu dosya
```

## 🌐 Tarayıcı Desteği

Modern tüm tarayıcılarda çalışır:
- Chrome
- Firefox
- Safari
- Edge

## 📝 Notlar

- MOGRT ve JSON dosyaları desteklenir
- Gruplandırma işlemi geri alınamaz, orijinal dosyanızı yedekleyin
- Dönüştürülen MOGRT dosyaları direkt Premiere Pro'da kullanılabilir

## 🎯 Kullanım Senaryoları

1. **Hızlı Dönüşüm**: MOGRT dosyanızı yükleyin → Otomatik gruplandırma → İndirin → Premiere'de kullanın
2. **Toplu İşlem**: Birden fazla MOGRT dosyasını sırayla dönüştürün
3. **JSON Düzenleme**: Sadece definition.json'u düzenlemek istiyorsanız JSON modunu kullanın

## 🤝 Katkıda Bulunma

Hata bildirimleri ve önerileriniz için lütfen iletişime geçin.

## 📄 Lisans

Bu proje açık kaynaklıdır ve MIT lisansı altında sunulmaktadır. 