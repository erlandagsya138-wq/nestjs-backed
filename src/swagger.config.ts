// src/swagger.config.ts
import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('SwaggerConfig');

/**
 * Setup Swagger / OpenAPI 3.0 documentation.
 *
 * Endpoint yang tersedia setelah setup ini:
 * - GET /api/docs          → Swagger UI (HTML)
 * - GET /api/docs-json     → OpenAPI spec (JSON) ← untuk generate JSON
 * - GET /api/docs-yaml     → OpenAPI spec (YAML)
 *
 * JSON spec juga disimpan ke ./swagger.json saat startup (non-production)
 * sehingga bisa di-import ke Postman, Insomnia, atau code generator.
 */
export function setupSwagger(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Durian Classifier API')
    .setDescription(
      `## Backend API untuk Aplikasi Klasifikasi Varietas Durian

### Autentikasi
Semua endpoint yang dilindungi memerlukan **Bearer JWT token**.

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

Token didapat dari endpoint \`POST /api/v1/auth/login\` atau \`POST /api/v1/auth/register\`.

---

### Flow Utama
1. **Register / Login** → \`POST /api/v1/auth/register\` atau \`POST /api/v1/auth/login\` → Dapatkan \`accessToken\`
2. **Upload gambar** → \`POST /api/v1/storage/upload\` → Dapatkan \`imageUrl\`
3. **Cek status AI** → \`GET /api/v1/ai/status/current\` (atau SSE \`GET /api/v1/ai/status\`)
4. **Buat prediksi** → \`POST /api/v1/predictions\` dengan \`imageUrl\`
5. **Ambil hasil** → \`GET /api/v1/predictions/:id\` (polling hingga status = SUCCESS)

---

### Ekspor OpenAPI JSON
Spesifikasi API tersedia dalam format JSON dan YAML untuk digunakan dengan Postman, Insomnia, atau code generator:

- **JSON**: \`GET /api/docs-json\`
- **YAML**: \`GET /api/docs-yaml\`

File \`swagger.json\` juga otomatis di-generate ke root project saat server start (mode non-production).

---

### Rate Limiting
| Endpoint | Limit |
|---|---|
| POST /auth/login | 5 req/menit per IP |
| POST /auth/register | 5 req/menit per IP |
| Semua endpoint lain | 100 req/menit per IP |

---

### Varietas Durian yang Didukung

| Kode | Nama Populer | Asal |
|---|---|---|
| D13 | Golden Bun | Malaysia (Johor) |
| D197 | Musang King / Mao Shan Wang / Raja Kunyit | Malaysia (Kelantan) |
| D2 | Dato Nina | Malaysia (Melaka) |
| D24 | Sultan / Bukit Merah | Malaysia (Perak / Selangor) |

Confidence score dikembalikan dalam rentang **0.0000 – 1.0000** (4 desimal).
`,
    )
    .setVersion('1.0.0')
    .setContact('Durian API Support', '', 'support@example.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    // ── Security Scheme ────────────────────────────────────────
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Masukkan JWT access token. Contoh: Bearer eyJhbGc...',
        in: 'header',
      },
      'JWT',
    )
    // ── Tags ───────────────────────────────────────────────────
    .addTag('Auth', 'Registrasi dan login — endpoint ini **tidak memerlukan JWT**')
    .addTag('Users', 'Manajemen profil pengguna (lihat & update)')
    .addTag('Predictions', 'Submit gambar durian dan ambil hasil klasifikasi AI')
    .addTag('Storage', 'Upload dan hapus file gambar ke local/S3 storage')
    .addTag('Admin — Datasets', 'Manajemen dataset durian untuk keperluan AI')
    .addTag('Admin — Predictions', 'Validasi dan monitoring hasil prediksi oleh Admin')
    .addTag(
      'AI Health',
      'Status koneksi dan kesiapan model AI — **tidak memerlukan JWT**',
    )
    .addTag(
      'Market Intelligence',
      'Endpoint internal untuk ingest laporan harga pasar dari agent Python — memerlukan HMAC signature',
    )
    // ── Servers ────────────────────────────────────────────────
    .addServer('http://localhost:3001', 'Development')
    .addServer('https://api.yourapp.com', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    // ── Swagger UI Options ─────────────────────────────────────
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 3,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      tryItOutEnabled: true,
      displayOperationId: false,
      urls: [
        { url: '/api/docs-json', name: 'OpenAPI JSON' },
        { url: '/api/docs-yaml', name: 'OpenAPI YAML' },
      ],
    },
    customSiteTitle: 'Durian Classifier API Docs',
    customCss: `
      .swagger-ui .topbar { background-color: #1a7a4a; }
      .swagger-ui .topbar .download-url-wrapper { display: flex !important; }
      .swagger-ui .topbar .download-url-wrapper .select-label { color: #fff; }
      .swagger-ui .info .title { color: #1a7a4a; }
      .swagger-ui .scheme-container { background: #f8fffe; border: 1px solid #c3e6d8; }
    `,
    jsonDocumentUrl: 'api/docs-json',
    yamlDocumentUrl: 'api/docs-yaml',
  });

  // ── Save JSON spec to file (non-production) ────────────────
  if (process.env.NODE_ENV !== 'production') {
    const outputPath = path.join(process.cwd(), 'swagger.json');
    try {
      fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');
      logger.log(`📄 OpenAPI spec saved → ${outputPath}`);
      logger.log(`   Import ke Postman: File → Import → ${outputPath}`);
      logger.log(`   JSON endpoint: GET /api/docs-json`);
      logger.log(`   YAML endpoint: GET /api/docs-yaml`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`⚠️  Gagal menyimpan swagger.json: ${msg}`);
    }
  }

  return document;
}