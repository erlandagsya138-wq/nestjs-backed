import { DurianCode } from '../value-objects/durian-code.vo';

/**
 * Domain Entity: DatasetImage
 * Merepresentasikan satu gambar yang akan dimasukkan ke dalam dataset export.
 */
export class DatasetImage {
  constructor(
    public readonly id: string,
    public readonly durianCode: DurianCode,
    public readonly originalFilename: string,
    public readonly storagePath: string,    // path fisik / URL ke file gambar
    public readonly mimeType: string,
    public readonly capturedAt: Date,
  ) {}

  /**
   * Nama file di dalam folder zip.
   * Format: <id>_<originalFilename>
   */
  getZipFilename(): string {
    const ext = this.originalFilename.includes('.')
      ? this.originalFilename.substring(this.originalFilename.lastIndexOf('.'))
      : '.jpg';
    return `${this.id}${ext}`;
  }

  isImage(): boolean {
    return this.mimeType.startsWith('image/');
  }
}
