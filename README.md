# dsh-tr-locale

DeepSeek Harness (DSH) web GUI için **Türkçe dil paketi**: arayüzün tamamını
Türkçe'ye çeviren, çeviri eksikse sessizce İngilizce'ye düşen resmî olmayan bir
dil eklentisi.

> 🇬🇧 **English:** An unofficial **Turkish language pack** for the DeepSeek
> Harness web GUI — 58 namespaces / 2,771 keys covering every first-party
> surface plus the profile's third-party plugins. A missing key falls back to
> English through the SDK chain (`ns → common → en → key`), so the interface
> never breaks.

---

## Ne yapar?

Eklenti saf bir **tarayıcı (client) eklentisidir** — host yarısı bilinçli olarak
boştur. Sayfa yüklenirken üç şey yapar:

1. **`tr` dil tanımını** (`id: tr`, `label: Türkçe`, `fallback: en`) dil
   kataloğuna ekler. Bu, **Ayarlar → Genel → Dil** listesinde Türkçe'yi belirir
   ve Türkçe bir tarayıcı/Windows dili varsa arayüz otomatik Türkçe açılır.
2. **Kapsanan her namespace için `tr` sözlüğünü** kaydeder. Pakette olmayan bir
   anahtar `ns → common → en → key` zinciriyle **İngilizce**'ye düşer — asla
   kırılmaz, Çince görünmez.
3. `<html lang>` değerini canlı günceller; slot ile çizilen metin dil
   değiştiğinde anında takip eder.

Dil seçimi kalıcıdır; eklentinin kendi ayar yüzeyi yoktur.

## Kapsam

| Katma | Örnekler |
|---|---|
| Birinci taraf yüzeyler | `chat`, `conversation`, `settings.*`, `sidebar*`, `pluginManager`, `trajectory`, `workspace`, `schedule.*`, `voice-input` |
| Kabuk namespace'leri | `common`, `settings.locale` |
| Profil eklentileri | `settings.ourFreeModel` |

**Toplam: 58 namespace / 2.771 anahtar.**

## Hızlı kurulum

Çalışan bir profilde (ör. `desktop`):

```powershell
# bu depoyu klonlayın, sonra:
dsh plugin --profile desktop add <klon-yolu>\dsh-tr-locale
```

veya Web arayüzü **Eklentiler** sayfasından / `plugin_manager` aracından
`install_bundle` olarak bu paket dizinini verin. Kurulum bundle'ı otomatik
etkinleştirir ve canlı profilde HMR sayesinde sayfayı yenilemeden de yüklenir.

Sayfa yenilendikten sonra **Ayarlar → Genel → Dil → Türkçe** seçilir.

## Depo yapısı

```
dsh-tr-locale/
  lib/client.js        derlenmiş paket (58 ns / 2.771 anahtar, loader formatı)
  package.json         dsh.client + dsh.bundle.patch deklarasyonları
  cordis.patch.yml     profile satır ekler (id: tr-locale)
  README.md            paket belgesi
```

Bu depoda yalnızca paket bulunur; paketle ilgisi olmayan yardımcı dosyalar
`workspace-extras/` klasörüne taşınmıştır ve git'e girmez.

## Bilinen sınırlamalar

- **`dsh-free-search` arayüzü** locale altyapısını kullanmaz (kendi sabit
  metinleri) — paket çevrilse bile o arayüz İngilizce kalır.
- **Sağlayıcı kataloğu etiketleri** (ör. model seçicideki `Balanced`) sağlayıcı
  eklentisinden gelen veridir; hiçbir dil sözlüğünde bulunmaz.
- **Kayıt anında sabitlenen metinler** (bazı komut tanımları) yeniden kayıt
  olana kadar kendi dilinde kalır; slot ile çizilen metin canlı takip eder.
- **Electron kabuğu** (üst menü şeridi, açılır menüler, sistem diyalogları)
  bu paketin kapsamı dışındadır — Web GUI localize edilir.
- Bir sonraki DSH sürümünde kaynak anahtarlar değişirse eşleşen `tr`
  anahtarlarının da güncellenmesi gerekir; yer tutucular (`{count}`, `{time}`…)
  kaynakla bayt bayt aynı kalmalıdır.

## Lisans

MIT.
