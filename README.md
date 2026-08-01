# Government Form AI — Autonomous Form Auto-Fill & Recommendation Engine

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?style=for-the-badge&logo=vercel)](https://github.com/adarshjnv9100/gov-form-ai.git)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![NVIDIA AI](https://img.shields.io/badge/NVIDIA-Nemotron--3-76B900?style=for-the-badge&logo=nvidia)](https://build.nvidia.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-RAW--PDF--Vault-3448C5?style=for-the-badge&logo=cloudinary)](https://cloudinary.com/)

An AI-native, autonomous government document processing engine powered by **Moonshot AI Kimi K2.6 Vision**, **NVIDIA Nemotron Reasoning**, **pdf-lib**, **Supabase**, and **Cloudinary**.

---

## 🚀 Key Features

- **📄 Official Government PDF Template Generation**: Uses `pdf-lib` to generate official A4 government forms with Helvetica typography, security headers, SHA-256 digital stamps, and clean key-value grids.
- **🤖 Moonshot AI Kimi K2.6 Multimodal Vision OCR**: Performs document parsing across 50+ official government document types (Aadhaar, PAN, Passport, Driving License, Voter ID, Income Certificate, Bank Passbook, Utility Bills, etc.).
- **🧠 NVIDIA Nemotron Set-Cover Reasoning Engine**: Analyzes missing form fields and recommends the **MINIMUM number of supporting documents** that cover the **MAXIMUM missing fields**.
- **🎯 Robust Canonical Field Mapping Engine**:
  - Exact & Synonym Dictionary Matching (`CANONICAL_SYNONYMS`).
  - OCR Typo Correction (`moblle` → `mobile`, `passprot` → `passport`, `ifcs` → `ifsc`).
  - Levenshtein Fuzzy Matching (`>90%` auto-fill, `75%-90%` marked as **Needs Review 🟡**).
- **📂 Multiple File Simultaneous Upload**: Drag & Drop or Ctrl/Shift select multiple PDFs, PNGs, JPGs, and WEBP files simultaneously with sequential batch OCR progress tracking.
- **🔒 Isolated Multi-Tenant Data Architecture**: Strict Supabase Row Level Security (RLS) ensuring each user queries and views only their own unique submissions (`user_id = auth.uid()`).
- **🛡️ Strict RAW PDF Storage & Stream Verification**: Enforces `%PDF-` byte signature checks before upload and stores permanent Cloudinary RAW HTTPS URLs.

---

## 🏗️ Architecture & AI Workflow

```
[Government Form Upload] + [Multiple Supporting Proofs (PDF / Images)]
                            │
                            ▼
                  [Cloudinary RAW Vault]
                            │
                            ▼
           [Kimi K2.6 Multimodal Vision OCR]
                            │
                            ▼
         [Canonical Key Normalization & Fuzzy Engine]
                            │
                            ▼
          [NVIDIA Nemotron Set-Cover Reasoning]
                            │
                            ▼
          [Review Page: 🟢 Auto / 🟡 Review / 🔴 Missing]
                            │
                            ▼
          [pdf-lib Generation & %PDF- Verification]
                            │
                            ▼
           [Supabase Submissions & Forms Database]
```

---

## 🛠️ Environment Variables

Create a `.env.local` file or configure Vercel environment variables:

```env
# Supabase Database & Auth
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Cloudinary Cloud Storage
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=government-form-ai
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=government-form-ai

# NVIDIA API (Nemotron Reasoning & Kimi Vision)
VITE_NVIDIA_API_KEY=nvapi-your-nvidia-api-key
VITE_NVIDIA_API_URL=https://integrate.api.nvidia.com/v1/chat/completions
VITE_NVIDIA_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning
```

---

## 💻 Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/adarshjnv9100/gov-form-ai.git
   cd gov-form-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local development server**:
   ```bash
   npm run dev
   ```

4. **Test TypeScript Compilation**:
   ```bash
   npm run typecheck
   ```

5. **Build Production Bundle**:
   ```bash
   npm run build
   ```

---

## 🌐 Vercel Deployment Instructions

1. Push code to GitHub: `https://github.com/adarshjnv9100/gov-form-ai.git`
2. Import project into Vercel Dashboard.
3. Configure the environment variables in Vercel.
4. Click **Deploy**!

---

## 📜 License

MIT License © 2026 Government Form AI Team
