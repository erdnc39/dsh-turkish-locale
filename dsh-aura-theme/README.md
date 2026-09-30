# dsh-aura-theme

DeepSeek Harness (DSH) web GUI için **Aura** tema eklentisi: tema motoruna
kayıtlı, turuncu–siyah ağırlıklı sıcak bir palet; buzlu cam yüzeyler; sohbet
penceresinde gezen **border beam** + süpüren **background beam**; ve tüm
arayüzü saran **CodeNewRoman Nerd Font**.

> An English summary lives at the end of this file.

## Ne yapar?

Eklenti saf bir **tarayıcı (client) eklentisidir** — host yarısı bilinçli
olarak boştur. Sayfa yüklenirken şunları yapar:

1. **`aura` temasını tema kayıt defterine (`ctx.theme.register`) ekler.**
   `ui-theme` paketi `light`/`dark` çiftini built-in tutar; üçüncü parti
   temalar alias katmanı override'ları ile kaydolur. Aura `colorScheme: "dark"`
   olarak kaydedilir, yani aktifleştiğinde `body[data-ds-dark-theme]` açılır ve
   palet `--dsw-alias-*` değişkenlerine gömülür.
2. **Tema tercihini `aura`'ya çeker** (kayıt sonrası `theme/setTheme`), böylece
   eklenti kurulur kurulmaz görünür. `Settings → General` satırındaki anahtardan
   kapatılabilir; tercih `localStorage` içinde saklanır.
3. **`theme/change` dinleyicisi** kök elemana `data-dsh-aura` niteliğini yazar:
   bütün Aura CSS'i bu niteliğe anahtarlanır, tema kapalıyken tek bir kural bile
   uygulanmaz.
4. **`Settings → General` bölümüne "Aura Teması" anahtar satırı** ekler
   (`settings.general.item` slotu, `order: 12`).

### Renk paleti (sıcak, turuncu–siyah)

| Katma | Değer |
|---|---|
| `--dsw-alias-bg-base` | `#0b0705` (sıcak siyah) |
| `--dsw-alias-bg-layer-1/2/3` | `#150f09` → `#1d150d` → `#261c11` |
| `--dsw-alias-label-primary` | `#f8ede2` (sıcak kâğıt beyazı) |
| `--dsw-alias-brand-primary` | `#ff8a1f` |
| `--dsw-alias-border-l1..l4` | `#ff8a1f1f` → `#ffb06666` (her saç teli çizgide ember) |
| `--dsw-specific-sidebar-fill` | `#100b07eb` (yarı saydam) |
| `--dsw-specific-menu` | `#17110bf2` + `--dsw-menu-backdrop-filter: blur(26px)` |

Palette ayrıca sıcak shiki sözdizimi renkleri, sıcak scrollbar, toast/tooltip ve
durum (success/warn/error) renkleri tanımlıdır.

### Efektler (hepsi `[data-dsh-aura]` altında)

- **Border beam** — sohbet penceresinin (`[data-conversation-content]`) iç
  kenarında 10px oluğa yerleşen, maskeli konik degrade ile **dönen ışın
  halkası**. `@property --dsh-aura-beam-angle` kayıtlı özel değişken olduğu için
  Chromium'da gerçek animasyon; halka mesaj metnine, kaydırma çubuğuna ve
  yazma alanına hiç girmeyen boşlukta kalır. Ayrıca her zaman görünen
  `inset` sıcak saç teli çerçeve.
- **Background beam** — sohbet kaydırıcısının (`[data-conversation-scroll]`)
  **arka plan katmanı** olarak süpüren diyagonal ışık huzmesi + üstte sıcak
  hale. Arka plan olduğu için içerik asla üstüne çıkmaz, kaydırma ile kaymaz.
- **Buzlu cam** — yazma alanı kartı (`[data-composer-card]`) gerçek
  `backdrop-filter: blur(20px) saturate(160%)` ile ışının üstünde cam gibi
  durur; kenar çubuğu (`[data-slot="sidebar"]`) 24px bulanıklık; açılan
  menüler (`[data-menu-material]`) 26px — üstelik menü bulanıklığı token
  üzerinden de zorlanır.
- **Sıcak metin seçimi** (`::selection`) ve sıcak odak halkası.

### Yazı tipi

`CodeNewRoman Nerd Font`, tema token'ları üzerinden hem gövde
(`--dsw-font-family`) hem de kod (`--ds-font-family-code`) için tanımlanır:

- Kaynak sırası: yerel kurulu kopya → jsDelivr aynası → Raw GitHub (üst akış
  katalog tarafından desteklenen yedek).
- `font-display: swap` sayesinde yazı tipi inerken arayüz beklemez; CDN
  erişilemezse yığın `ui-monospace → Consolas → monospace` ile düşer.

## Kurulum

DSH 0.2.0-rc.1 ve sonrası gerekir. Depo kontrolünden:

```sh
dsh plugin --profile desktop add <path-to-this-package>
```

veya Web kenar çubuğundaki **Plugins** sayfasından / `plugin_manager`
aracından bu paket dizini ile kurun. Kurulum eklentiyi otomatik seçer;
çalışan bir profilde HMR sayesinde sayfayı yenilemeden de yüklenir.

## Ayarlar

| | |
|---|---|
| Ana anahtar | **Ayarlar → Genel → Aura Teması** (aç/kapa, `localStorage` içinde kalıcı) |
| Diğer anahtar | Kenar çubuğundaki **Açık** anahtarı `Settings → General → Appearance`'ta bir tema seçtiğinizde Aura'yı kapatır (kayıt `ui-theme` ayar alanı izlenerek yapılır) |
| Yapılandırma anahtarı yoktur | Eklenti `config` alanı tanımlamaz |

## Bilinen sınırlamalar

- Aura seçiliyken **Aparans** satırındaki Açık/Koyu/Sistem seçimi Aura'ya
  geri dönmez;Aura'yı kapatmak için kendi anahtarını kullanın (bu, ui-theme'in
  tercihi yazdığı alan izlenerek kasıtlı yapıldı).
- Tema tercihi ui-theme'in kalıcı ayar alanında saklanamaz (yalnız built-in
  kabul edilir), bu yüzden eklenti her açılışta kendini yeniden etkinleştirir.
- Yazı tipi CDN'den gelir: ilk açılışta ~2×2.2 MB woff2 indirilir ve tarayıcı
  önbelleğine alınır.
- Beam efektleri `prefers-reduced-motion: reduce` altında durur.

## Lisans

MIT. CodeNewRoman Nerd Font, upstream Nerd Fonts lisansı (SIL OFL) ile
dağıtılır; bu eklenti font dosyalarını içermez, yalnızca kaynak URL'lerini
kullanır.

---

## English summary

A pure browser plugin for the DeepSeek Harness web GUI that registers an
`aura` theme (warm orange-on-black palette, `colorScheme: "dark"`) into the
`ui-theme` registry, auto-activates it, and gates every visual rule behind a
`data-dsh-aura` root attribute: frosted-glass composer/sidebar/menus, a
travelling border beam and a sweeping background beam on the chat window, warm
syntax-highlighting tokens, and the **CodeNewRoman Nerd Font** for both body
and code. Toggled from **Settings → General → Aura Teması**; the switch state
persists in `localStorage`.
