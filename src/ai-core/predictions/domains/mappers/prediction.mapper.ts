// src/predictions/domains/mappers/prediction.mapper.ts
import { Injectable } from '@nestjs/common';
import { PredictionResponseDto } from '../../applications/dto/prediction-response.dto';
import { PredictionEntity } from '../entities/prediction.entity';

@Injectable()
export class PredictionMapper {

  toMobileListDto(entity: PredictionEntity) {
    return {
      id: entity.id,
      varietyName: entity.varietyName,
      confidenceScore: entity.confidenceScore,
      imageUrl: entity.imageUrl,
      status: entity.status,
      createdAt: entity.createdAt,
    };
  }

  toResponseDto(entity: PredictionEntity): PredictionResponseDto {
    return {
      id:              entity.id,
      userId:          entity.userId,
      varietyCode:     entity.varietyCode,
      varietyName:     entity.varietyName,
      localName:       entity.localName,
      origin:          entity.origin,
      description:     entity.description,
      confidenceScore: entity.confidenceScore,
      imageEnhanced:   entity.imageEnhanced,
      inferenceTimeMs: entity.inferenceTimeMs,
      imageUrl:        entity.imageUrl,
      status:          entity.status,
      errorMessage:    entity.errorMessage,
      createdAt:       entity.createdAt,
      allVarieties:    entity.allVarieties ?? null,
      modelVersion:    entity.modelVersion,
      aiRequestId:     entity.aiRequestId,
    };
  }

  toResponseDtoList(entities: PredictionEntity[]): PredictionResponseDto[] {
    return entities.map((e) => this.toResponseDto(e));
  }
}