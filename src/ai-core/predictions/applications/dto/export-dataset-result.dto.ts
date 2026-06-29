/**
 * Hasil dari proses export dataset.
 */
export class ExportDatasetResultDto {
  /** Total gambar yang berhasil di-export */
  totalImages: number = 0;

  /** Daftar kode durian yang masuk ke ZIP */
  includedCodes: string[] = [];

  /** Gambar yang gagal (tidak ditemukan di storage) */
  skippedImages: number = 0;

  /** Ukuran ZIP dalam bytes */
  zipSizeBytes: number = 0;

  /** Nama file ZIP yang dihasilkan */
  filename: string = '';

  constructor(partial: Partial<ExportDatasetResultDto>) {
    Object.assign(this, partial);
  }
}
