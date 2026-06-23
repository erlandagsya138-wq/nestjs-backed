# ── STAGE 1: Build (Membangun aplikasi) ──
FROM node:18-alpine AS builder

WORKDIR /app
# Copy package.json dan package-lock.json (jika ada)
COPY package*.json ./
# Install semua dependencies (termasuk devDependencies untuk build)
RUN npm install
# Copy seluruh source code
COPY . .
# Compile TypeScript menjadi JavaScript (menghasilkan folder /dist)
RUN npm run build

# ── STAGE 2: Production (Hasil Akhir yang Ringan) ──
FROM node:18-alpine

WORKDIR /app
# Copy package.json untuk install library
COPY package*.json ./
# Install HANYA dependencies production (tanpa tool dev/testing)
RUN npm install --only=production

# Copy HANYA folder dist (hasil build) dari Stage 1
COPY --from=builder /app/dist ./dist

# Buat user non-root untuk keamanan server
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

# Expose port aplikasi NestJS
EXPOSE 3001

# Jalankan file JavaScript murni hasil compile
CMD ["node", "dist/main.js"]