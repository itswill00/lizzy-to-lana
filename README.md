# Lizzy to Lana — A Fan Archive

Website fan tribute statis untuk Lana Del Rey: arsip foto, perjalanan hidup & karier per era, galeri polaroid dengan filter + lightbox, dan diskografi tipografi. Satu halaman panjang, bergaya film Amerika 50–60an.

**Status:** sudah live di **https://blog.wldnanatayya.com** (HTTPS aktif). Siap jalan tanpa build step. Konten diperbarui **23 November 2026**.

---

## 1. Struktur folder

```
lizzy-to-lana/
├── index.html              # semua teks & bab; bagian personal ada marker EDIT DI SINI
├── images.json             # SATU-SATUNYA sumber data foto + kredit + lisensi
├── assets/
│   ├── css/style.css       # palet, tipografi, grain, vignette, responsif
│   ├── js/main.js          # render foto, filter galeri, lightbox, parallax
│   ├── img/                # foto lokal ( hasil unduh, bukan hotlink )
│   └── favicon.svg
├── KEKURANGAN.md           # foto & konten yang belum tersedia
└── README.md
```

Tidak ada `package.json`, tidak ada framework, tidak ada autoplay musik.

---

## 2. Jalankan lokal

```bash
cd lizzy-to-lana
python3 -m http.server 8080
```

Buka `http://localhost:8080`. `fetch('images.json')` butuh HTTP, jadi jangan dibuka lewat `file://` langsung.

Pemeriksaan cepat:

```bash
node --check assets/js/main.js
python3 -m json.tool images.json > /dev/null
```

---

## 3. Cara nambah / ganti foto (tanpa ngoding)

Semua foto diatur di **`images.json`**. Tipiskan saja objek baru ke dalam array `"images"`.

### Langkah

1. **Ambil fotonya** hanya dari:
   - Wikimedia Commons / public domain / CC dengan lisensi jelas;
   - materi press yang memang diizinkan untuk dipakai ulang;
   - foto yang kamu upload sendiri.
2. **Simpan lokal** di `assets/img/` (contoh: `assets/img/konser-2024.jpg`). Jangan pakai URL Google, Pinterest, Getty, dll. Jangan hotlink.
3. **Tambah entri** di `images.json` sebelum tanda `]` terakhir pada `"images"`.
4. **Refresh halaman.** Foto otomatis muncul di timeline dan/atau galeri.

### Contoh entri

```json
{
  "id": "konser-2024",
  "order": 21,
  "file": "assets/img/konser-2024.jpg",
  "era": "stove",
  "caption": "Konser di Barcelona, 31 Mei 2024",
  "alt": "Lana Del Rey bernyanyi di bawah sorotan panggung di Barcelona.",
  "credit": "Nama Fotografer",
  "source": "https://commons.wikimedia.org/wiki/File:Nama_Berkas.jpg",
  "license": "CC BY 2.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
  "timeline": true,
  "gallery": true,
  "hero": false,
  "placeholder": false
}
```

### Arti field

| Field | Wajib | Fungsi |
|---|---|---|
| `id` | ya | Identitas unik; bebas, pakai huruf kecil + tanda hubung |
| `order` | ya | Urutan tampil; angka lebih kecil tampil lebih dulu |
| `file` | ya* | Path lokal di `assets/img/` |
| `era` | ya | Harus sama dengan salah satu `id` di array `"eras"` |
| `caption` | ya | Teks di bawah polaroid & di lightbox |
| `alt` | ya | Deskripsi gambar untuk pembaca layar |
| `credit` | ya* | Nama pembuat foto |
| `source` | ya* | Tautan halaman file asli (Wikimedia Commons) |
| `license` | ya* | Misalnya `CC BY-SA 4.0` |
| `licenseUrl` | ya* | Tautan syarat lisensi |
| `timeline` | ya | `true` = tampil di bab timeline |
| `gallery` | ya | `true` = tampil di galeri |
| `hero` | ya | `true` = dijadikan background hero (cukup satu) |
| `placeholder` | ya | `false` untuk foto asli; `true` untuk kartu pengganti |
| `placeholderNote` | hanya placeholder | Catatan foto apa yang masih dicari |

\* Kecuali `placeholder: true`, maka `file`, `credit`, `source`, `license`, dan `licenseUrl` boleh `null`.

### Era yang tersedia

`awal`, `born-to-die`, `ultraviolence`, `honeymoon`, `lust-for-life`, `nfr`, `chemtrails`, `ocean-blvd`, `stove`.

Mau nambah era baru? Tambahkan objek di array `"eras"` lalu buat bab `<article class="era" data-era="...">` di `index.html`.

### Placeholder

Kalau foto belum ada, jangan Dipaksa. Pakai entri dengan `placeholder: true` supaya kartu "Foto belum tersedia" muncul rapi. Contoh sudah ada di `images.json`.

---

## 4. Edit teks lain

- **Bagian "Kenapa gue sayang dia":** buka `index.html`, cari komentar `EDIT DI SINI`, ganti seluruh isi `<div class="personal-notes">`.
- **Nama di footer:** cari `[Nama gue]` di `index.html`.
- **Naskah timeline:** langsung edit `<p>` di dalam tiap `<article class="era">`.
- **Diskografi:** array `discography` di bagian atas `assets/js/main.js`.

Jangan menulis lirik lengkap. Kutipan yang ada sudah pendek dan bersumber.

---

## 5. Deploy

Situs ini folder statis biasa.

### Netlify

Drag-and-drop folder `lizzy-to-lana/` ke Netlify Drop, atau hubungkan repo dengan:

- Build command: **(kosong)**
- Publish directory: **`lizzy-to-lana`** (atau `.` kalau repo root = folder ini)

`netlify.toml` sudah disiapkan.

### Vercel

```bash
cd lizzy-to-lana
vercel deploy --prod
```

`vercel.json` sudah disiapkan. Atau di dashboard: Framework Preset **Other**, Root Directory sesuai folder proyek.

### GitHub Pages

Push folder ini ke repo, lalu **Settings → Pages → Deploy from a branch → main / root**. Kalau repo bernama `username.github.io`, taruh isi folder di root repo.

### VPS ini (nginx + domain `blog.wldnanatayya.com`)

DNS sudah diarahkan ke VPS. Contoh konfigurasi:

```nginx
server {
    listen 80;
    server_name blog.wldnanatayya.com www.blog.wldnanatayya.com;

    root /var/www/blog.wldnanatayya.com;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \.(jpg|jpeg|png|webp|svg|css|js|json)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

Copy konten:

```bash
sudo mkdir -p /var/www/blog.wldnanatayya.com
sudo cp -r /root/lizzy-to-lana/. /var/www/blog.wldnanatayya.com/
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS **sudah terpasang** di VPS ini lewat Certbot untuk `blog.wldnanatayya.com` (sertifikat aktif sampai 19 Februari 2027, perpanjangan otomatis). Kalau perlu pasang ulang:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d blog.wldnanatayya.com
```

Catatan: `www.blog.wldnanatayya.com` sengaja tidak dimasukkan karena sertifikat yang ada hanya untuk domain apex.

---

## 6. Aturan foto & kredit

- Semua 18 foto di arsip ini diunduh dari **Wikimedia Commons**, bukan di-hotlink.
- Kredit, halaman sumber, lisensi, dan tautan lisensi tersimpan di `images.json`, tampil di lightbox, dan sebagian terlihat di kartu galeri.
- Lisensi yang dipakai: CC BY 2.0, CC BY-SA 2.0/3.0/4.0, dan CC BY 4.0.
- Kalau kamu menambah foto, **wajib** mengisi kredit + sumber + lisensi. Kalau tidak jelas lisensinya, pakai placeholder.

---

## 7. Referensi singkat

- [Wikipedia — Lana Del Rey](https://en.wikipedia.org/wiki/Lana_Del_Rey)
- [Wikipedia — Lana Del Rey discography](https://en.wikipedia.org/wiki/Lana_Del_Rey_discography)
- [Wikipedia — Stove](https://en.wikipedia.org/wiki/Stove_(album))
- [Situs resmi](https://www.lanadelrey.com/)
- [Wikimedia Commons — foto per tahun](https://commons.wikimedia.org/wiki/Category:Lana_Del_Rey_by_year)

Daftar lengkap ada di bagian **Referensi** di halaman website.

---

## 8. Yang belum tersedia

Lihat **[KEKURANGAN.md](KEKURANGAN.md)** untuk daftar foto dan konten yang masih perlu dicari atau diperbarui.

---

## Disclaimer

Situs penggemar tidak resmi. Tidak berafiliasi dengan, tidak disponsori, tidak dikelola, maupun disetujui oleh Lana Del Rey atau label rekamannya. Hak cipta foto tetap milik masing-masing pembuat sesuai lisensinya.
