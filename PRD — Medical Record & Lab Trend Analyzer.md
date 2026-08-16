# PRD — Medical Record & Lab Trend Analyzer

## 1. Product Overview

### Nama sementara
**MedTrack AI**

### Tagline
**Simpan. Pahami. Pantau. Bawa Data yang Lebih Lengkap ke Dokter.**

### Tujuan

Membangun aplikasi web untuk membantu keluarga/pengasuh pasien:

1. Menyimpan rekam medis secara terstruktur.
2. Mengunggah dokumen medis baru dalam format PDF/JPG/PNG.
3. Menggunakan AI/OCR untuk membaca dokumen.
4. Mengekstrak hasil pemeriksaan laboratorium.
5. Menyimpan hasil lab berdasarkan tanggal pemeriksaan.
6. Membandingkan hasil terbaru dengan hasil sebelumnya.
7. Menampilkan tren parameter medis.
8. Menyediakan checklist pemeriksaan yang sudah/belum tersedia.
9. Mencatat episode rawat inap/drop.
10. Menyediakan ringkasan medis yang dapat dibawa ke dokter.
11. Membantu pengguna memahami perubahan data tanpa memberikan diagnosis medis definitif.

---

# 2. Problem Statement

Saat ini data medis pasien sering tersebar dalam:

- foto hasil lab
- PDF
- surat rawat inap
- resep
- hasil USG
- CT scan
- catatan dokter
- hasil transfusi
- dokumen pemeriksaan lainnya

Masalah utama:

- Sulit mengetahui tren Hb dari waktu ke waktu.
- Sulit mengetahui apakah suatu pemeriksaan pernah dilakukan.
- Sulit membandingkan hasil antar tanggal.
- Dokumen mudah tercecer.
- Pasien sering harus menjelaskan ulang riwayat kepada dokter.
- Keluarga sulit mengetahui pemeriksaan apa yang masih perlu ditanyakan kepada dokter.

---

# 3. Target User

## Primary User

Keluarga/pengasuh pasien yang mengelola rekam medis anggota keluarga.

Contoh:
- anak yang merawat orang tua
- pasangan
- caregiver

## Secondary User

- pasien
- dokter yang menerima ringkasan pasien
- caregiver profesional

---

# 4. Scope MVP

## MVP wajib memiliki

### A. Patient Profile

Data:

- Nama
- Nama panggilan
- Jenis kelamin
- Tanggal lahir
- Usia otomatis
- Golongan darah (opsional)
- Tinggi badan
- Berat badan
- Alergi
- Riwayat penyakit
- Riwayat operasi
- Catatan umum

---

# 5. Medical Timeline

Timeline kronologis:

- hasil lab
- rawat inap
- konsultasi dokter
- obat
- transfusi
- USG
- CT scan
- tindakan medis
- dokumen lainnya

Contoh:

2026-04-30
→ Lab

2026-06-22
→ Lab + konsultasi

2026-08-15
→ Lab

Timeline dapat difilter berdasarkan kategori.

---

# 6. Document Management

User dapat upload:

- PDF
- JPG
- JPEG
- PNG

Kategori:

- Laboratory
- Hospitalization
- Prescription
- Doctor Note
- Ultrasound
- CT Scan
- X-Ray
- MRI
- Procedure
- Transfusion
- Other

Setiap dokumen memiliki:

- ID
- patient_id
- filename
- document_type
- upload_date
- document_date
- storage_path
- OCR status
- extraction status
- confidence score
- processing status

Status:

- Uploaded
- Processing
- Extracted
- Needs Review
- Confirmed
- Failed

---

# 7. AI Document Extraction

Ketika dokumen diupload:

UPLOAD
→ STORAGE
→ OCR/VISION
→ AI EXTRACTION
→ VALIDATION
→ USER REVIEW
→ DATABASE

AI harus mengekstrak:

### Identitas

- patient_name
- document_date
- facility
- doctor
- document_type

### Laboratory

Contoh parameter:

- Hemoglobin
- Hematocrit
- RBC
- WBC
- Platelets
- MCV
- MCH
- MCHC
- RDW
- Neutrophils
- Lymphocytes
- Monocytes
- Eosinophils
- Basophils

### Additional tests

- Ferritin
- Serum Iron
- TIBC
- TSAT
- Vitamin B12
- Folate
- Reticulocyte
- Creatinine
- eGFR
- Urea/BUN
- Sodium
- Potassium
- AST
- ALT
- Albumin
- Bilirubin
- LDH
- Haptoglobin
- TSH
- FT4

AI tidak boleh mengarang nilai yang tidak terlihat.

Jika tidak ditemukan:

value = null

---

# 8. Extraction Review

Setelah AI membaca dokumen, user harus dapat melihat:

| Parameter | Extracted | Unit | Confidence | Action |
|---|---:|---|---|---|
| Hb | 8.0 | g/dL | 98% | Confirm |
| MCV | 101.7 | fL | 97% | Confirm |
| Ferritin | — | — | — | Missing |

User dapat:

- Confirm
- Edit
- Reject
- Add manually

Data **tidak dianggap final sebelum user melakukan confirmation**, terutama jika confidence rendah.

---

# 9. Lab Result Database

Setiap hasil:

- patient_id
- test_date
- test_name
- normalized_test_name
- value
- unit
- reference_low
- reference_high
- abnormal_flag
- source_document_id
- extraction_confidence
- verified_by_user
- created_at

---

# 10. Lab Trend Analyzer

Aplikasi harus membandingkan hasil berdasarkan tanggal.

Contoh:

Hb:

7.4 → 8.7 → 8.0

Trombosit:

150 → 119 → 110

Leukosit:

5.1 → 4.2 → 3.82

MCV:

96 → 101.7

Tampilkan:

- nilai terbaru
- nilai sebelumnya
- perubahan absolut
- perubahan persen
- trend naik/turun/stabil

Gunakan grafik line chart.

User dapat memilih parameter.

---

# 11. Clinical Checklist

Checklist bukan checklist diagnosis.

Checklist digunakan untuk mengetahui **pemeriksaan apa yang sudah tersedia dalam rekam medis**.

Contoh kategori:

### Anemia

- CBC
- Reticulocyte
- Peripheral blood smear
- Ferritin
- Serum Iron
- TIBC
- TSAT
- Vitamin B12
- Folate
- Creatinine
- eGFR
- LDH
- Bilirubin
- Haptoglobin
- TSH

Status:

- Available
- Missing
- Outdated
- Needs Review

Aplikasi tidak boleh menyatakan:

"Pasien harus melakukan pemeriksaan X."

Gunakan:

"Belum ditemukan hasil pemeriksaan X dalam dokumen yang diunggah."

---

# 12. Hospitalization / Episode Tracker

User dapat mencatat episode:

- tanggal masuk
- tanggal keluar
- alasan opname
- gejala
- diagnosis dokter
- Hb saat masuk
- Hb saat keluar
- transfusi
- jumlah kantong
- obat
- tindakan
- catatan

Aplikasi menghitung:

- jumlah episode
- interval antar episode
- rata-rata interval
- Hb sebelum/sesudah opname

---

# 13. Transfusion Tracker

Data:

- tanggal
- jenis produk darah
- jumlah unit
- Hb sebelum
- Hb sesudah
- indikasi menurut dokter
- rumah sakit
- catatan

Tujuan:

Melihat apakah Hb naik setelah transfusi dan berapa lama kemudian turun kembali.

---

# 14. AI Medical Summary

AI dapat menghasilkan:

### Summary

- kondisi terbaru
- perubahan penting
- data yang belum tersedia
- pertanyaan untuk dokter

Contoh:

"Pada pemeriksaan terbaru Hb 8,0 g/dL, lebih rendah dibanding 8,7 g/dL sebelumnya. Trombosit dan leukosit juga menunjukkan penurunan dibanding pemeriksaan sebelumnya."

AI harus menggunakan bahasa:

- "menunjukkan"
- "perlu dikonfirmasi"
- "dapat menjadi pertimbangan"
- "diskusikan dengan dokter"

Jangan menggunakan:

- "pasti"
- "terdiagnosis"
- "pasti terkena"
- "obat ini harus diminum"

---

# 15. Doctor Report

Generate laporan PDF/printable:

## Patient Summary

### Patient Information

Nama:
Tanggal lahir:
Usia:

### Main Medical History

...

### Laboratory Trend

Hb:
Trombosit:
Leukosit:
MCV:
Creatinine:

### Hospitalization History

...

### Current Medication

...

### Available Investigations

...

### Missing / Not Found in Records

...

### Questions for Doctor

...

### Source Documents

Tanggal + nama dokumen.

---

# 16. Dashboard

Dashboard menampilkan:

### Patient Card

Nama
Usia
Jenis kelamin

### Latest Labs

Hb
WBC
Platelets
MCV
Creatinine

### Trend

Hb chart

### Recent Documents

5 dokumen terakhir

### Recent Events

3 event terakhir

### Checklist Progress

Contoh:

Anemia Workup

8 / 15 available

### Important Changes

AI-generated observation.

---

# 17. Search

Search seluruh rekam medis.

Contoh:

"ferritin"

"transfusi"

"creatinine"

"opname"

"Hb 7"

Hasil menunjukkan:

- dokumen
- hasil lab
- event
- tanggal

---

# 18. Database Design

Gunakan PostgreSQL/Supabase.

## Tables

### profiles

- id
- user_id
- full_name
- date_of_birth
- gender
- blood_type
- allergies
- notes
- created_at
- updated_at

### medical_conditions

- id
- patient_id
- condition_name
- diagnosed_date
- status
- notes

### documents

- id
- patient_id
- document_type
- file_name
- storage_path
- document_date
- upload_date
- processing_status
- ocr_text
- extraction_status
- extraction_confidence
- created_at

### lab_results

- id
- patient_id
- document_id
- test_date
- test_name
- normalized_name
- value_numeric
- value_text
- unit
- reference_low
- reference_high
- abnormal_flag
- confidence
- verified
- created_at

### hospitalizations

- id
- patient_id
- admission_date
- discharge_date
- reason
- diagnosis
- notes

### transfusions

- id
- patient_id
- hospitalization_id
- transfusion_date
- product_type
- units
- hb_before
- hb_after
- notes

### medications

- id
- patient_id
- medication_name
- dosage
- frequency
- start_date
- end_date
- notes

### checklist_items

- id
- category
- name
- description
- active

### patient_checklist

- id
- patient_id
- checklist_item_id
- status
- source_document_id
- last_found_date
- notes

### ai_analyses

- id
- patient_id
- document_id
- analysis_type
- content
- model
- created_at

---

# 19. Security

Karena data medis sangat sensitif:

- Supabase Auth
- Row Level Security
- User hanya dapat melihat pasien miliknya
- Storage private bucket
- Signed URLs
- Tidak menyimpan dokumen pada public URL
- Audit log
- Jangan mengirim seluruh rekam medis ke AI jika tidak diperlukan
- Encryption in transit
- Environment variables untuk API keys
- Jangan expose API key di frontend

---

# 20. AI Safety

AI hanya sebagai:

**Information extraction + summarization + trend analysis + question generation**

AI bukan:

- dokter
- alat diagnosis
- alat menentukan obat
- alat menentukan transfusi
- alat menentukan operasi

Semua keputusan medis harus dikonfirmasi dokter.

Jika data tidak cukup:

AI harus mengatakan:

> "Data belum cukup untuk menyimpulkan."

---

# 21. MVP User Flow

### First Use

Login

↓

Create Patient

↓

Dashboard

↓

Upload Document

↓

AI Extraction

↓

Review Extraction

↓

Confirm

↓

Data masuk database

↓

Timeline update

↓

Lab trend update

↓

Checklist update

↓

AI summary update

---

# 22. MVP Development Priority

## Phase 1

- Authentication
- Patient profile
- Document upload
- Supabase Storage
- Document list
- Manual lab entry

## Phase 2

- OCR/Vision extraction
- Extraction review
- Lab database
- Timeline

## Phase 3

- Trend charts
- Checklist
- Hospitalization
- Transfusion

## Phase 4

- AI analysis
- Doctor report
- PDF export

## Phase 5

- Advanced AI
- Multi-patient
- Medication tracking
- More document types
- Search

---

# 23. Success Criteria

MVP dianggap berhasil jika user dapat:

1. Membuat profil pasien.
2. Mengupload hasil lab.
3. AI membaca hasil lab.
4. User memverifikasi hasil.
5. Data tersimpan.
6. Hasil baru otomatis masuk timeline.
7. Grafik tren diperbarui.
8. Checklist pemeriksaan diperbarui.
9. User dapat melihat perubahan antar tanggal.
10. User dapat menghasilkan laporan untuk dokter.

# 24. Recommended Stack

Frontend:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts

Backend:
- Next.js server actions/API routes

Database:
- Supabase PostgreSQL

Storage:
- Supabase Storage

Auth:
- Supabase Auth

AI:
- Vision-capable LLM untuk document extraction
- LLM untuk summarization

PDF:
- PDF.js untuk preview
- server-side PDF generation untuk Doctor Report

Deployment:
- Vercel

---

# 25. Important Design Principle

Aplikasi harus terasa seperti:

**"Digital medical notebook yang pintar"**

bukan:

**"AI dokter otomatis."**

UI harus:

- clean
- professional
- calm
- mudah digunakan orang non-teknis
- mobile-first
- tidak menakut-nakuti pengguna
- setiap angka harus memiliki tanggal dan sumber dokumen