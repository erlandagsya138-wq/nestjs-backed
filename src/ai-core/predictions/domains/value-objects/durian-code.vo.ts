/**
 * Value Object: DurianCode
 * Merepresentasikan kode unik varietas durian.
 * Contoh: "D197", "MUSANG_KING", "D24"
 */
export class DurianCode {
  private readonly value: string;

  constructor(code: string) {
    if (!code || code.trim().length === 0) {
      throw new Error('DurianCode tidak boleh kosong');
    }
    this.value = code.trim().toUpperCase();
  }

  getValue(): string {
    return this.value;
  }

  /**
   * Digunakan sebagai nama folder dalam zip.
   * Sanitasi karakter yang tidak valid untuk nama folder.
   */
  toFolderName(): string {
    return this.value.replace(/[^a-zA-Z0-9_\-]/g, '_');
  }

  equals(other: DurianCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
