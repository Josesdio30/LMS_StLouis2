# Setup Environment Variables di Vercel

## ⚠️ CATATAN PENTING
Environment variables di Vercel **TIDAK** diambil dari file `.env` di repository. 
Anda harus **manual setup** di Vercel Dashboard.

## 📋 Environment Variables yang Diperlukan

Masuk ke **Vercel Dashboard** → Pilih Project → **Settings** → **Environment Variables**

### Database Configuration
```
POSTGRES_HOST=<your-production-db-host>          # Contoh: db.example.com atau IP public
POSTGRES_PORT=5432
POSTGRES_DATABASE=<your-production-db-name>      # Contoh: sinluidua_lms
POSTGRES_USER=<your-production-db-user>          # Contoh: sindua
POSTGRES_PASSWORD=<your-production-db-password>  # Password database production
```

### NextAuth Configuration
```
NEXTAUTH_SECRET=hinwLnHxFWzAz+x6ojAOO2OZ8ImR1F46ucAGrVSzS84=
```

### Node Environment
```
NODE_ENV=production
```

## 🔍 Cara Verifikasi

Setelah deploy, cek logs di Vercel:
- Jika env vars benar → akan muncul log: `Database config: { host: '...', database: '...', ... }`
- Jika env vars salah → akan muncul error: `Missing required database environment variables`

## 📝 Catatan

1. **JANGAN** commit file `.env` ke git repository
2. Pastikan **Production** database dapat diakses dari internet
3. Gunakan **SSL connection** untuk production database
4. Environment variables harus di-set untuk **Production**, **Preview**, dan **Development** environments






