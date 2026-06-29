// src/ai-core/predictions/infrastructures/repositories/prediction.repository.interface.ts
import { PredictionEntity } from '../../domains/entities/prediction.entity';

export interface VarietyScoreData {
  varietyCode:     string;
  varietyName:     string;
  confidenceScore: number;
}

export interface PredictionResultPayload {
  varietyCode:     string | null;
  varietyName:     string;
  localName:       string;
  origin:          string | null;
  description:     string;
  confidenceScore: number;
  imageEnhanced:   boolean;
  inferenceTimeMs: number;
  allVarieties:    VarietyScoreData[];
  modelVersion:    string | null;
  aiRequestId:     string | null;
}

export interface AdminPredictionFilter {
  skip: number;
  limit: number;
  status?: string;
  varietyCode?: string;
  isVerified?: boolean;
}

export interface CreatePredictionData {
  userId:        string;
  storedFileId:  string;
  imageUrl:      string;
}

export interface BulkAddFilter {
  minConfidence: number;
  varietyCode: string | null;
  onlyVerified: boolean;
}

// 👇 Menggabungkan parameter verifikasi ke dalam satu interface
export interface VerifyPredictionData {
  isVerified: boolean;
  adminNote?: string;
  correctedVarietyCode?: string;
}

export interface IPredictionRepository {
  findById(id: string): Promise<PredictionEntity | null>;
  findAllByUserId(userId: string): Promise<PredictionEntity[]>;
  findAllByUserIdPaginated(
    userId: string,
    skip:   number,
    limit:  number,
  ): Promise<[PredictionEntity[], number]>;
  findEligibleForBulkAdd(filter: BulkAddFilter): Promise<PredictionEntity[]>;
  create(data: CreatePredictionData): Promise<PredictionEntity>;
  updateResult(id: string, result: PredictionResultPayload): Promise<PredictionEntity>;
  markAsFailed(id: string, reason: string): Promise<void>;
  findByStatus(status: string): Promise<PredictionEntity[]>;
  findAllForAdmin(filter: AdminPredictionFilter): Promise<[PredictionEntity[], number]>;
  findVerifiedForExport(): Promise<PredictionEntity[]>;
  verify(id: string, data: VerifyPredictionData): Promise<PredictionEntity>;
}

export const PREDICTION_REPOSITORY_TOKEN = Symbol('IPredictionRepository');