# DeepSeek Harness — Türkçe Dil Desteği

> 🇬🇧 **English:** Turkish language support for the DeepSeek Harness desktop/web GUI — a `dsh-tr-locale` language pack (58 namespaces / 2,771 keys) for the web interface, plus a 165-string `tr` table wired into the Electron shell for the caption menu, popup menus, welcome and update dialogs.

DeepSeek Harness'ın **web arayüzünü** ve **masaüstü kabuğunu** (üst menü şeridi, açılır menüler, karşılama/güncelleme pencereleri) Türkçe'ye çeviren tam bir çözüm. Çeviriler eksik olursa arayüz otomatik olarak İngilizce'ye düşer — asla kırılmaz.

---

## İçindekiler

- [Ne yapar?](#ne-yapar)
- [Hızlı kurulum](#hızlı-kurulum)
- [Depo yapısı](#depo-yapısı)
- [Çeviri hattı (pipeline)](#çeviri-hattı-pipeline)
- [Masaüstü (Electron) yaması](#masaüstü-electron-yaması)
- [Doğrulama](#doğrulama)
- [Bilinen sınırlamalar](#bilinen-sınırlamalar)
- [Lisans](#lisans)

---

## Ne yapar?

| Katman | Kapsam | Anahtar |
|---|---|---|
| **Web GUI** (`dsh-tr-locale`) | Sohbet, iş akışı, ayarlar, kenar çubukları, eklenti yöneticisi, zamanlama, görevler… tüm birinci taraf yüzeyler + profil eklentileri | **58 namespace / 2.771 metin** |
| **Masaüstü kabuğu** (`app.asar` yaması) | Üst şerit (Uygulama \| Düzen), açılır menüler (Geri al/Kes/Kopya…), tepsi menüsü, karşılama ekranı, güncelleme diyalogları | **165 metin** |

**Nasıl çalışır:** DSH, dil paketlerini `ctx.locale.addLanguage()` + namespace sözlükleriyle kaydetmeyi destekler. `dsh-tr-locale` bunu yapan resmî olmayan bir eklentidir; eksik bir anahtar bulunursa SDK zinciri (`ns → common → en → key`) sayesinde İngilizce görünür.

- Dil seçimi: **Ayarlar → Genel → Dil → Türkçe** (kalıcı tercih yazar)
- Türkçe tarayıcı/Windows dili varsa arayüz **otomatik** Türkçe açılır
- `<html lang>` canlı güncellenir; çeviri anahtarları yerel (hot) olarak değişir

---

## Hızlı kurulum

### 1) Web GUI dil paketi

Çalışan bir profilde (ör. `desktop`):

```powershell
# bu depoyu klonlayın, sonra:
dsh plugin --profile desktop add <klon-yolu>\dsh-tr-locale
```

veya Web arayüzü **Eklentiler** sayfasından / `plugin_manager` aracıyla `install_bundle` olarak bu paket dizinini verin (kurulum bundle'ı otomatik etkinleştirir).

Sayfa yenilendikten sonra **Ayarlar → Genel → Dil** listesinde **Türkçe** belirir.

### 2) Masaüstü menüleri (Electron kabuğu)

Üst şerit ve açılır menüler Web GUI'nin parçası olmadığı için ayrı patch gerektirir — bkz. [Masaüstü (Electron) yaması](#masaüstü-electron-yaması).

---

## Depo yapısı

```
dsh-tr-locale/            Web GUI dil paketi (kurulabilir bundle)
  lib/client.js           derlenmiş paket (58 ns / 2.771 anahtar, loader formatı)
  package.json            dsh.client + dsh.bundle.patch deklarasyonları
  cordis.patch.yml        profile satır ekler (id: tr-locale)
  README.md               paket belgesi

i18n-work/
  en/                     çıkarılmış İngilizce sözlükler (partiler)
  tr/                     Türkçe çeviriler (partiler, doğrulanmış)

desktop-tr.json           masaüstü kabuğu Türkçe tablosu (165 anahtar)
desktop-en.json           kaynak İngilizce tablo

# hattın betikleri (repo kökü)
extract-from-asar.mjs     asar'dan dosya çıkarma (genel)
capture-dicts.mjs         paketlerden en sözlüklerini yakalama
extract-static.mjs        içsel kayıtların statik çıkarımı
split-batches.mjs         partilere bölme (dengeleme)
validate-batch.mjs        anahtar + yer tutucu paritesi denetimi
cross-check.mjs           çapraz terminoloji tutarlılığı
identifier-scan.mjs       kod-benzeri değerlerin yanlış çevirisi taraması
apply-fixes.mjs           gözden geçirme düzeltmeleri
build-client.mjs          lib/client.js üretimi
test-pack.mjs             GERÇEK LocaleRuntime ile E2E test
patch-desktop-locale.mjs  Electron kabuk dosyalarını patch'leme (aşama 1)
rebuild-asar.mjs          app.asar yeniden inşası + atomik takas (aşama 2)
```

Çıkarılan büyük artefaktlar `.gitignore` ile hariçtir; `node extract-from-asar.mjs <arıv-yolu>` ile yeniden üretilir.

---

## Çeviri hattı (pipeline)

Yeni bir DSH sürümünde metinler değiştiğinde:

1. **Çıkar** — `extract-from-asar.mjs` ile ilgili `lib/client.js` dosyaları
2. **Yakala** — `capture-dicts.mjs` (dinamik: sahte `ctx` ile `apply()` çalıştırıp `locale.register` çağrılarını yakalar) + `extract-static.mjs` (içsel kayıt yapan `common`, `settings.locale`, `settings.theme`, `voice-input`, `settings.account`)
3. **Birleştir** — `merge-dicts.mjs` (üçüncü taraf eklentiler dahil)
4. **Böl & çevir** — `split-batches.mjs` → partiler `i18n-work/tr/` içine çevrilir
5. **Doğrula** — `validate-batch.mjs` (her partide anahtar/yer tutucu paritesi), `cross-check.mjs` (aynı İngilizce → farklı Türkçe), `identifier-scan.mjs` (kod benzeri değerler), `apply-fixes.mjs` (gözden geçirme kararları)
6. **Derle & test et** — `build-client.mjs` → `test-pack.mjs` (gerçek `LocaleRuntime` üzerinde `tr` aktifliği, `İptal`/`Dil` çevirileri, fallback zinciri)

**Yer tutucular** (`{count}`, `{path}`, `{version}`…) kaynakla bayt bayt aynı kalmalıdır; validatör aksi halde partiyi reddeder.

---

## Masaüstü (Electron) yaması

Neden gerekli: `lib/main.js`, `lib/preload-app.cjs` ve `lib/preload-welcome.cjs` kendi en/zh mesaj tablolarını taşır; `document.documentElement.lang = "tr"` olsa bile `resolveDesktopLocale()` bilinmeyen dili İngilizce'ye düşürür.

**Uygulama (kapatılmışken yedekleme otomatik yapılır):**

```powershell
# 1) kabuk dosyalarını patch'le (workspace kökünden)
node patch-desktop-locale.mjs

# 2) asar'ı yeniden inşa et, doğrula ve takas et (onay gerektirir)
node rebuild-asar.mjs --swap
```

- `rebuild-asar.mjs` tüm arşivi yeniden ofsetler, değiştirilen dosyaların **integrity hash'lerini** yeniler, byte-byte doğrular, orijinali `app.asar.bak` olarak yedekler ve atomik takas yapar.
- **Not:** Çalışan uygulama `app.asar`'ı kilitli tuttuğu için *rename* engellenir; betik bu durumda **yerinde yazma** yolunu kullanır (aynı doğrulamayla).

**Geri alma:**

```powershell
# uygulama kapalıyken
Copy-Item "…\resources\app.asar.bak" "…\resources\app.asar" -Force
```

**Uygulama otomatik güncellenirse** yama silinir; yukarıdaki iki adımı yeni sürüm için yeniden çalıştırın (önce `extract-from-asar.mjs` ile yeni `electron-main.js` çıkarıp `patch-desktop-locale.mjs` girişlerini güncelleyin).

---

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| Parti validatörleri (14/14) | ✅ 2.771/2.771 anahtar, yer tutucu paritesi |
| Çapraz terminoloji denetimi | 54 çakışma → 42 kasıtlı düzeltme, kalanlar bağlam farklılığı |
| Kod-benzeri tarama | `command.token.*` geri alındı (yazılabilir komutlar), `time.locale` → `tr` |
| E2E test (gerçek `LocaleRuntime`) | ✅ `tr` aktif, `İptal`/`Kapat`/`Dil` translate, fallback zinciri sağlam |
| Asar yeniden inşa | ✅ 11.470 kayıt, SHA256 eşleşmesi, üç dosyada `const tr` doğrulandı |
| Profil kurulumu | ✅ `enabled` + `installed` + `applied` (`dsh-tr-locale` bundle'ı) |

---

## Bilinen sınırlamalar

- **`dsh-free-search` arayüzü** locale altyapısını kullanmaz (kendi sabit metinleri) — kendi paketi çevrilse bile İngilizce kalır.
- **Sağlayıcı kataloğu etiketleri** (ör. model seçicideki `Balanced` = `reasoningEffort`) sağlayıcı plug-in'inden gelen `effort.name` verisidir; hiçbir dil sözlüğünde bulunmaz (Çince ekranda da İngilizce görünür).
- **Kayıt anında sabitlenen metinler** (bazı komut tanımları) yeniden kayıt olana kadar kendi dilinde kalır; slot ile çizilen metin canlı takip eder.
- **Electron'un kendi yerel metinleri** (sağ tık menüsü, sistem diyalogları) Windows diliyle çalışır — Türkçe Windows'ta zaten Türkçedir.
- Otomatik güncelleme `app.asar` yamasını sıfırlar (yukarıya bakın).

---

## Lisans

- Çeviriler, `dsh-tr-locale` paketi ve bu depodaki betikler: **MIT**
- Çıkarılmış DeepSeek kabuk kaynakları (`electron-main.js`, `lib_preload-*.cjs`, `scan_*`) yalnızca yama referansıdır ve **© DeepSeek**'e aittir; hakları saklıdır.
