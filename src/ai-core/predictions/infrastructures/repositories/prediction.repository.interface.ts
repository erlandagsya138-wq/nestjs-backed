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

// Data wajib saat membuat prediction baru.
// storedFileId sekarang required — tidak boleh ada prediction tanpa
// referensi ke file yang menghasilkannya.
export interface CreatePredictionData {
  userId:        string;
  storedFileId:  string;
  imageUrl:      string;
}

export interface IPredictionRepository {
  findById(id: string): Promise<PredictionEntity | null>;
  findAllByUserId(userId: string): Promise<PredictionEntity[]>;
  findAllByUserIdPaginated(
    userId: string,
    skip:   number,
    limit:  number,
  ): Promise<[PredictionEntity[], number]>;
  // Signature diperketat: terima CreatePredictionData bukan Partial<PredictionEntity>
  // agar storedFileId tidak bisa luput (compile-time enforcement)
  create(data: CreatePredictionData): Promise<PredictionEntity>;
  updateResult(id: string, result: PredictionResultPayload): Promise<PredictionEntity>;
  markAsFailed(id: string, reason: string): Promise<void>;
  findByStatus(status: string): Promise<PredictionEntity[]>;
}

export const PREDICTION_REPOSITORY_TOKEN = Symbol('IPredictionRepository');