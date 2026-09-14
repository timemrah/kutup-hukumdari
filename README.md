# Kutup Hükümdarı — Beyaz Sessizlik

Three.js ile geliştirilmiş 3D kutup ayısı yaşam mücadelesi. Veritabanı yok;
kayıtlar her oyuncunun kendi tarayıcısında (localStorage) tutulur.

**Oyna:** https://timemrah.github.io/kutup-hukumdari/

## Oyun

Bir kutup ayısısın: ince buz göletlerinde balık tut, kurt/tilki/morslarla
pençe (sol tık) ve ısırma (Space/V) ile savaş, yedikçe güçlen, gizli
mağaralardaki boss'ları devir. Akşam inine dönüp uyu (F), yaraların kapansın.

Kontroller: WASD (kameraya göre) • Shift koş • Sol tık pençe • Space/V ısırma •
E balık/ye • F uyu/mağara • P duraklat

## Geliştirme

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # birim testleri
npm run build    # dist/ üretir
npm run deploy   # canlıya yayınlar (gh-pages dalı)
```

Canlı yayın `gh-pages` dalından sunulur; oyunu güncelledikten sonra
`npm run deploy` yeterlidir. (`.github/workflows/deploy.yml` Actions ile
otomatik yayın için hazır bekler; `workflow` yetkili bir token ile
eklenebilir.)
