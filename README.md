# Smart KKQ · Laporan PWA

PWA untuk menjana laporan perjumpaan Kelab KKQ menggunakan Gemini dan menyimpan terus ke Google Sheet tanpa membuka Sheet/Sidebar.

## Seni bina
- Frontend PWA: `index.html`, `styles.css`, `app.js`, `manifest.json`, `sw.js`
- Vercel proxy: `api/kkq.js`
- Backend Google Apps Script: `apps-script/Code.gs`
- Gemini API key kekal di Apps Script Script Properties, tidak didedahkan kepada browser.

## 1. Apps Script
1. Buka Apps Script yang terikat dengan Google Sheet laporan KKQ.
2. Gantikan/tambah kod dengan `apps-script/Code.gs` dan `apps-script/appsscript.json`.
3. Pastikan Script Properties:
   - `SMART_KKQ_GEMINI_API_KEY` = API key Gemini
   - `SMART_KKQ_GEMINI_MODEL` = model pilihan (opsyenal)
4. Semak `SMART_KKQ.reportFolderId` dalam `Code.gs` — ID folder Google Drive destinasi salinan laporan (lalai ditetapkan kepada folder yang dikongsi).
5. Deploy > New deployment > Web app.
6. Execute as: Me.
7. Who has access: Anyone (atau polisi akaun yang sesuai).
8. Semasa deploy/authorize pertama, luluskan kebenaran baharu untuk Google Drive (skop `drive`) — diperlukan untuk mencipta dan memindahkan salinan Google Sheet ke folder yang dinyatakan.
9. Salin URL `/exec`.

## 2. Vercel
1. Upload/push folder ini ke GitHub.
2. Import repo ke Vercel.
3. URL Web App Apps Script `/exec` sudah dikodkan terus dalam `api/kkq.js` (`DEFAULT_APPS_SCRIPT_URL`). Jika Apps Script dideploy semula dan URL berubah, kemaskini pemalar tersebut — atau tetapkan Environment Variable `SMART_KKQ_APPS_SCRIPT_URL` di Vercel untuk override tanpa ubah kod.
4. Deploy.

## Aliran pengguna
1. Pilih tab laporan.
2. Tekan `Muat data tab` jika mahu baca maklumat sedia ada daripada template.
3. Isi tajuk dan maklumat perjumpaan.
4. `Jana Laporan AI`.
5. Semak/edit preview.
6. `Simpan ke Google Sheet` — tab laporan dikemaskini dan satu salinan tab itu (kekal format Google Sheet, bukan PDF) turut disalin ke fail Google Sheet baharu dalam folder Google Drive yang ditetapkan (`SMART_KKQ.reportFolderId`). Pautan fail dipaparkan selepas berjaya.

## Pemetaan sel yang dikekalkan
D7 unit, D9 sesi, D11 perjumpaan, D13 hari, D15 tarikh, D17 tempat, D19 masa,
D24-D27 kehadiran/guru, D32-D34 nilai/subnilai/matlamat, D35 tajuk,
D36-D38 objektif, D39/D42/D46/D50 KBAT, D53 PIKeBM, D54-D59 aktiviti, D60 refleksi.
