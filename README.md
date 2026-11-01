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

Setiap push ke `main` di-build dan dipasang ke GitHub Pages oleh `.github/workflows/deploy.yml`. Sekali saja: Settings › Pages › Source pilih **GitHub Actions**.
