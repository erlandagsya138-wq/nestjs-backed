// src/ai-core/datasets/infrastructures/repositories/dataset.repository.ts

import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DatasetEntity } from '../../domains/entities/dataset.entity';
import { DatasetItemEntity } from '../../domains/entities/dataset-item.entity';
import {
  CreateDatasetData,
  CreateDatasetItemData,
  IDatasetRepository,
  ListDatasetsFilter,
  UpdateDatasetStatusData,
} from './dataset.repository.interface';

@Injectable()
export class DatasetRepository implements IDatasetRepository {
  private readonly logger = new Logger(DatasetRepository.name);

  constructor(
    @InjectRepository(DatasetEntity)
    private readonly datasetOrm: Repository<DatasetEntity>,

    @InjectRepository(DatasetItemEntity)
    private readonly itemOrm: Repository<DatasetItemEntity>,

    private readonly dataSource: DataSource,
  ) {}

  // ── Dataset CRUD ───────────────────────────────────────────────────────────

  async create(data: CreateDatasetData): Promise<DatasetEntity> {
    try {
      const entity = this.datasetOrm.create({
        name:         data.name,
        description:  data.description,
        exportFormat: data.exportFormat,
      });
      return await this.datasetOrm.save(entity);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[DatasetRepository] create gagal: ${message}`);
      throw new InternalServerErrorException(
        `Gagal membuat dataset: ${message}`,
      );
    }
  }

  async findById(id: string): Promise<DatasetEntity | null> {
    return this.datasetOrm.findOne({ where: { id } });
  }

  async findAll(
    filter: ListDatasetsFilter,
  ): Promise<[DatasetEntity[], number]> {
    return this.datasetOrm.findAndCount({
      order: { createdAt: 'DESC' },
      skip:  filter.skip,
      take:  filter.limit,
    });
  }

  async updateStatus(
    id:   string,
    data: UpdateDatasetStatusData,
  ): Promise<DatasetEntity> {
    await this.datasetOrm.update(id, {
      status:       data.status,
      ...(data.exportUrl    !== undefined && { exportUrl:    data.exportUrl }),
      ...(data.exportedAt   !== undefined && { exportedAt:   data.exportedAt }),
      ...(data.errorMessage !== undefined && { errorMessage: data.errorMessage }),
    });

    const updated = await this.findById(id);
    if (!updated) {
      throw new InternalServerErrorException(
        `Dataset id='${id}' tidak ditemukan setelah updateStatus.`,
      );
    }
    return updated;
  }

  async incrementTotalItems(id: string, by: number): Promise<void> {
    await this.datasetOrm
      .createQueryBuilder()
      .update(DatasetEntity)
      .set({ totalItems: () => `totalItems + ${by}` })
      .where('id = :id', { id })
      .execute();
  }

  async decrementTotalItems(id: string): Promise<void> {
    await this.datasetOrm
      .createQueryBuilder()
      .update(DatasetEntity)
      .set({ totalItems: () => 'GREATEST(totalItems - 1, 0)' })
      .where('id = :id', { id })
      .execute();
  }

  async delete(id: string): Promise<void> {
    await this.datasetOrm.delete(id);
  }

  // ── Dataset Items ──────────────────────────────────────────────────────────

  async createItem(data: CreateDatasetItemData): Promise<DatasetItemEntity> {
    try {
      const entity = this.itemOrm.create({
        datasetId:    data.datasetId,
        predictionId: data.predictionId,
      });
      return await this.itemOrm.save(entity);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[DatasetRepository] createItem gagal: ${message}`);
      throw new InternalServerErrorException(
        `Gagal menambahkan item ke dataset: ${message}`,
      );
    }
  }

  async createItemsBulk(data: CreateDatasetItemData[]): Promise<number> {
    if (data.length === 0) return 0;

    try {
      // INSERT IGNORE agar duplikat tidak throw error
      const result = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(DatasetItemEntity)
        .values(
          data.map((d) => ({
            datasetId:    d.datasetId,
            predictionId: d.predictionId,
          })),
        )
        .orIgnore()  // MySQL: INSERT IGNORE
        .execute();

      return result.identifiers.length;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[DatasetRepository] createItemsBulk gagal: ${message}`);
      throw new InternalServerErrorException(
        `Gagal bulk insert dataset items: ${message}`,
      );
    }
  }

  async findItemById(itemId: string): Promise<DatasetItemEntity | null> {
    return this.itemOrm.findOne({ where: { id: itemId } });
  }

  async findItemsByDatasetId(
    datasetId: string,
  ): Promise<DatasetItemEntity[]> {
    return this.itemOrm.find({
      where: { datasetId },
      order: { addedAt: 'DESC' },
    });
  }

  async itemExists(
    datasetId:    string,
    predictionId: string,
  ): Promise<boolean> {
    const count = await this.itemOrm.count({
      where: { datasetId, predictionId },
    });
    return count > 0;
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.itemOrm.delete(itemId);
  }
}