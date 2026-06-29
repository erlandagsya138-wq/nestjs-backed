/**
 * Port untuk membaca konten file dari storage (local disk / S3 / dsb).
 */
export const FILE_STORAGE_PORT = Symbol('FILE_STORAGE_PORT');

export interface IFileStoragePort {
  /**
   * Baca file sebagai Buffer dari path / URL storage.
   * @throws Error jika file tidak ditemukan
   */
  readFileAsBuffer(storagePath: string): Promise<Buffer>;

  /**
   * Cek apakah file ada di storage.
   */
  exists(storagePath: string): Promise<boolean>;
}
