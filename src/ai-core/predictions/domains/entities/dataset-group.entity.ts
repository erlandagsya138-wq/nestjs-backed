import { DurianCode } from '../value-objects/durian-code.vo';
import { DatasetImage } from '../entities/dataset-image.entity';

/**
 * Domain Entity: DatasetGroup
 * Kumpulan gambar yang dikelompokkan berdasarkan satu DurianCode.
 * Menjadi satu folder di dalam ZIP.
 */
export class DatasetGroup {
  private readonly images: DatasetImage[];

  constructor(
    public readonly durianCode: DurianCode,
    images: DatasetImage[] = [],
  ) {
    this.images = images;
  }

  getImages(): ReadonlyArray<DatasetImage> {
    return this.images;
  }

  getFolderName(): string {
    return this.durianCode.toFolderName();
  }

  isEmpty(): boolean {
    return this.images.length === 0;
  }

  totalImages(): number {
    return this.images.length;
  }

  addImage(image: DatasetImage): DatasetGroup {
    return new DatasetGroup(this.durianCode, [...this.images, image]);
  }
}
