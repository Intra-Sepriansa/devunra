# DEVUNRA · web

Landing page untuk [DEVUNRA](https://github.com/Intra-Sepriansa/devunra/releases), panel untuk semua server lokal di macOS dan Windows.

![DEVUNRA](public/img/og.png)

Dibuat dengan React 18, Vite dan [motion](https://motion.dev). Screenshot di `public/img` diambil dari aplikasi aslinya; tarsius dan animasinya memakai geometri yang sama dengan aplikasi.

## Jalankan

```bash
npm install
npm run dev
```

`npm run build` menaruh hasilnya di `dist/`.

## Deploy

Alamat produksi: **https://devunra.arsinode.site/**, dihosting di **server yang sama dengan Arsinode** menggunakan Nginx. Situs ditempatkan terpisah di `/var/www/devunra.arsinode.site`, sehingga rilis DEVUNRA tidak mengubah file situs Arsinode.

Untuk memperbarui situs, gunakan Node.js 22+, SSH, dan `rsync`. Pastikan alias SSH `intra` mengarah ke server Arsinode dengan akun yang memiliki akses ke folder DEVUNRA, lalu jalankan:

```bash
npm ci
npm run deploy
```

Perintah deploy membangun situs, mengunggah isi `dist/` ke folder rilis baru, lalu mengganti symlink `current` secara atomik. Pemeriksaan HTTPS langsung ke Nginx dijalankan setelah aktivasi; jika gagal, rilis sebelumnya dipulihkan. Konfigurasi ada di `hosting.json`; kunci SSH tidak disimpan dalam repo. Alias koneksi dapat diganti melalui `DEVUNRA_SSH_HOST`. GitHub Actions di `.github/workflows/build.yml` memeriksa build dan menyimpan hasilnya; publikasi ke server dilakukan lewat perintah deploy di atas.

Domain `arsinode.site` terdaftar di Spaceship, tetapi DNS aktif dikelola Cloudflare (`ganz.ns.cloudflare.com` dan `jen.ns.cloudflare.com`). Record `A` untuk `devunra` memakai alamat server yang sama dengan `arsinode.site` dan mode Proxied. Konfigurasi Nginx tersimpan di `deploy/nginx/devunra.arsinode.site.conf`; berkas tersebut dipasang sebagai virtual host DEVUNRA terpisah di server.

HTTPS origin memakai sertifikat Let's Encrypt untuk `devunra.arsinode.site`. Certbot memperpanjangnya melalui webroot `/var/www/devunra.arsinode.site/acme` dan memuat ulang Nginx setelah perpanjangan. Pertahankan lokasi `/.well-known/acme-challenge/` di konfigurasi HTTP dan HTTPS agar perpanjangan otomatis dapat berjalan.

## Installer dan metadata rilis

Repo publik ini menyimpan source website dan aset installer hasil build. Source aplikasi desktop tetap berada di repo privat yang terpisah. Installer besar disimpan pada GitHub Releases; server Arsinode menyimpan website dan metadata kecil saja.

Data unduhan berada di `src/lib/env.ts`: setiap berkas mempunyai versi, kebutuhan OS/chip, SHA-256, ukuran, dan daftar engine yang benar-benar disertakan. Tautan unduhan dipatok per tag versi agar mempertahankan installer platform lama tidak bergantung pada rilis terbaru. Jangan memublikasikan data placeholder atau checksum dari build sebelumnya.

Feed aplikasi ada di `public/releases/latest.json`. Terbitkan aset installer lebih dahulu dan periksa identitasnya, lalu deploy feed dan website secara atomik. Feed saat ini memuat satu pilihan untuk setiap platform/chip: Apple Silicon lengkap, Intel slim, dan Windows lengkap setelah penerimaan platform itu lulus. Pengguna macOS yang lebih lama memilih paket slim di web. Signing/notarisasi serta pemasangan otomatis installer berada di luar alur ini.
