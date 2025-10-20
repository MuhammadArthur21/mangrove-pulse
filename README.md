# 🌿 MangrovePulse – WebGIS Pemantauan Mangrove Canggih

MangrovePulse adalah aplikasi WebGIS profesional untuk memantau kesehatan ekosistem mangrove berbasis citra satelit (Sentinel-2). Aplikasi ini dibangun menggunakan Google Earth Engine (GEE) dan FastAPI sebagai backend, serta Leaflet, Tailwind CSS, dan Chart.js di sisi frontend.

## ✨ Fitur Utama

- **Analisis Multi-Indeks**: Visualisasikan layer data **NDVI**, **NDWI**, dan **MVI** secara *on-the-fly* dari GEE.
- **Analisis Multi-Tahun**: Pilih tahun analisis dari **2016 hingga sekarang** melalui menu dropdown untuk melihat perubahan dari waktu ke waktu.
- **Analisis Area (AOI) Interaktif**:
    - **Alat Gambar Lengkap**: Gambar Poligon, Persegi, Garis, atau Titik langsung di peta.
    - **Statistik Zonal**: Dapatkan statistik rerata untuk semua indeks (NDVI, NDWI, MVI) dan total luas area untuk poligon yang digambar.
- **Visualisasi Data Komprehensif**:
    - **Grafik Time Series**: Lihat tren kesehatan mangrove dengan grafik garis NDVI tahunan (2019-2024).
    - **Diagram Tutupan Lahan**: Dapatkan diagram lingkaran yang mengklasifikasikan area menjadi "Mangrove" dan "Non-Mangrove".
- **Sistem Ekspor Hybrid**:
    - **Direct Download (GeoTIFF)**: Ekspor hasil analisis area kecil (< 50 MB) langsung ke komputer Anda dalam format GeoTIFF.
    - **Ekspor ke Google Drive**: Untuk area yang sangat luas, mulai tugas ekspor di latar belakang yang akan menyimpan hasilnya ke folder `MangrovePulse_Exports` di Google Drive Anda.
- **Kustomisasi Tampilan & Bahasa**:
    - **Theme Switcher**: Pilih antara tema Dark (default), Light, dan Ocean.
    - **Multi-Bahasa**: Ganti bahasa antarmuka antara Indonesia dan Inggris.
- **Fitur Tambahan**: Popup analisis titik, legenda peta dinamis, dan ekspor panel analisis ke PDF.

## 🚀 Cara Menjalankan Proyek

### 1. Backend (FastAPI)

Pastikan Anda memiliki Python dan `pip` terinstal.

1.  **Buka terminal** dan navigasi ke direktori `backend`.
2.  Buat dan aktifkan *virtual environment*:
    ```bash
    # Windows
    python -m venv venv
    .\venv\Scripts\activate
    ```
3.  Instal dependensi yang dibutuhkan:
    ```bash
    pip install -r requirements.txt
    ```
4.  Lakukan autentikasi dengan Google Earth Engine (hanya untuk pertama kali):
    ```bash
    earthengine authenticate
    ```
    Ikuti instruksi di browser Anda.

5.  Jalankan server FastAPI:
    ```bash
    uvicorn main:app --reload
    ```
    Server akan berjalan di `http://127.0.0.1:8000`.

### 2. Frontend

1.  Buka file `frontend/index.html` langsung di browser Anda (cukup klik dua kali).
2.  Aplikasi akan otomatis terhubung ke backend yang sedang berjalan.

## 📖 Cara Menggunakan

1.  **Pilih Layer & Tahun**: Gunakan radio button untuk memilih indeks (NDVI/NDWI/MVI) dan dropdown untuk memilih tahun analisis.
2.  **Gambar Area of Interest (AOI)**: Gunakan toolbar di pojok kiri atas peta untuk menggambar sebuah area (poligon atau persegi).
3.  **Lakukan Analisis**: Setelah area digambar, tombol-tombol di sidebar akan muncul.
    - Klik **"Analisis Area"** untuk melihat statistik, grafik time series, dan diagram tutupan lahan di panel bawah.
4.  **Ekspor Data**:
    - Klik **"Ekspor GeoTIFF"** untuk mengunduh data raster dari area kecil secara langsung.
    - Jika mendapat error "memory limit" atau "request size", gunakan tombol **"Ekspor ke Drive (Area Besar)"** dan periksa Google Drive Anda beberapa saat kemudian.
    - Klik **"Ekspor Laporan (PDF)"** untuk mengunduh panel analisis sebagai file PDF.

---

*Dikembangkan oleh Muhammad Yusyaf Arthur — UGM 🌿 2025*