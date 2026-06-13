// src/ai-core/market-intelligence/applications/orchestrator/market-intelligence.orchestrator.ts
import { Injectable, Inject } from '@nestjs/common';
import { ProcessMarketReportUseCase } from '../use-cases/process-market-report.use-case';
import { type IMarketPriceRepository, MARKET_PRICE_REPOSITORY_TOKEN } from '../../infrastructures/repositories/market-price.repository.interface';
import { MarketPriceSummaryDto } from '../../../predictions/applications/dto/prediction-response.dto';

// Tambahkan import untuk DTO ingestReport yang hilang
import { MarketReportDto } from '../dto/market-report.dto';
import { MarketReportIngestResponseDto } from '../dto/market-report-ingest-response.dto';

@Injectable()
export class MarketIntelligenceOrchestrator {
  constructor(
    private readonly processMarketReport: ProcessMarketReportUseCase,

    @Inject(MARKET_PRICE_REPOSITORY_TOKEN)
    private readonly marketPriceRepo: IMarketPriceRepository,
  ) {}

  // =========================================================================
  // METHOD 1: Untuk menerima data dari scraper Python
  // (Method ini wajib ada agar MarketIntelligenceController tidak error)
  // =========================================================================
  ingestReport(dto: MarketReportDto): Promise<MarketReportIngestResponseDto> {
    return this.processMarketReport.execute(dto);
  }

  // =========================================================================
  // METHOD 2: Untuk mengirim harga ke frontend setelah prediksi AI selesai
  // (Dipanggil oleh CreatePredictionUseCase)
  // =========================================================================
  async getPriceSummaryByVariety(varietyCode: string): Promise<MarketPriceSummaryDto | null> {
    const summary = await this.marketPriceRepo.createQueryBuilder('mp')
      .select('MIN(mp.pricePerKgAvg)', 'minPriceKg')
      .addSelect('MAX(mp.pricePerKgAvg)', 'maxPriceKg')
      .addSelect('AVG(mp.pricePerKgAvg)', 'avgPriceKg')
      .addSelect('COUNT(mp.id)', 'totalListings')
      .where('mp.varietyCode = :varietyCode', { varietyCode })
      .getRawOne();

    if(!summary || !summary.totalListings || summary.totalListings === '0') {
      return null;
    }

    return {
      minPriceKg: Math.round(Number(summary.minPriceKg)),
      maxPriceKg: Math.round(Number(summary.maxPriceKg)),
      avgPriceKg: Math.round(Number(summary.avgPriceKg)),
      totalListings: Number(summary.totalListings),
    };
  }
}