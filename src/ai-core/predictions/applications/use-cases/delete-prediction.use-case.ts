import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PREDICTION_REPOSITORY_TOKEN, type IPredictionRepository } from '../../infrastructures/repositories/prediction.repository.interface';

@Injectable()
export class DeletePredictionUseCase {
  constructor(
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const prediction = await this.predictionRepo.findById(id);
    
    if (!prediction) {
      throw new NotFoundException(`Prediksi dengan ID ${id} tidak ditemukan`);
    }

    await this.predictionRepo.delete(id);
  }
}