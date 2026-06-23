# ── STAGE 1: Build (Membangun aplikasi) ──
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json dan install semua dependencies (termasuk devDependencies)
COPY package*.json ./
RUN npm ci

# Copy seluruh source code dan lakukan build
COPY . .
RUN npm run build

# ── STAGE 2: Production (Hasil Akhir yang Ringan) ──
FROM node:20-alpine

WORKDIR /app

# Copy package.json dan install HANYA dependencies production
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy hasil build (folder dist) dari Stage 1
COPY --from=builder /app/dist ./dist

# Buat folder uploads untuk local storage dan atur permission ke user non-root
RUN mkdir -p uploads && chown -R node:node uploads

# Gunakan user 'node' bawaan image alpine untuk keamanan
USER node

# Expose port aplikasi (berdasarkan konfigurasi Anda di 3001)
EXPOSE 3001

# Jalankan aplikasi
CMD ["node", "dist/main.js"]