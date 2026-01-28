/**
 * Ana pipeline script - Tüm adımları sırayla çalıştırır
 */

import { fetchTrends } from './fetch-trends.js';
import { researchTrends } from './research.js';
import { generateArticles } from './generate.js';
import { publishArticles } from './publish.js';
import { updateHealth, logRun } from './utils/logging.js';
import { nowISOTurkey, formatDateForFile, formatTimeForFile } from './utils/date.js';

const DRY_RUN = process.env.DRY_RUN === 'true';
const MAX_ARTICLES = parseInt(process.env.MAX_ARTICLES || '5', 10);

async function main() {
  const startTime = Date.now();
  const runId = `${formatDateForFile()}-${formatTimeForFile()}`;
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🚀 Türkiye Trendleri Pipeline Başlatıldı`);
  console.log(`📅 Çalışma Zamanı: ${nowISOTurkey()}`);
  console.log(`🔧 Mod: ${DRY_RUN ? 'DRY RUN (test)' : 'PRODUCTION'}`);
  console.log(`📝 Maksimum Makale: ${MAX_ARTICLES}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const logs: string[] = [];
  let success = true;
  let articlesGenerated = 0;

  try {
    // Adım 1: Trendleri çek
    console.log('📊 ADIM 1: Google Trends verilerini çekiliyor...');
    logs.push(`[${nowISOTurkey()}] Trend çekme başladı`);
    
    const trends = await fetchTrends();
    console.log(`✅ ${trends.length} trend bulundu\n`);
    logs.push(`[${nowISOTurkey()}] ${trends.length} trend bulundu`);

    if (trends.length === 0) {
      console.log('⚠️ Hiç trend bulunamadı, pipeline durduruluyor.');
      logs.push(`[${nowISOTurkey()}] Trend bulunamadı, durduruluyor`);
      await logRun(runId, logs, false, 0);
      await updateHealth(false, 'Trend bulunamadı');
      return;
    }

    // Adım 2: Trendleri araştır
    console.log('🔍 ADIM 2: Trendler için kaynak araştırması yapılıyor...');
    logs.push(`[${nowISOTurkey()}] Kaynak araştırması başladı`);
    
    const researchBundles = await researchTrends(trends, MAX_ARTICLES);
    console.log(`✅ ${researchBundles.length} trend için kaynak toplandı\n`);
    logs.push(`[${nowISOTurkey()}] ${researchBundles.length} araştırma paketi oluşturuldu`);

    if (researchBundles.length === 0) {
      console.log('⚠️ Yeterli kaynak bulunamadı, pipeline durduruluyor.');
      logs.push(`[${nowISOTurkey()}] Yeterli kaynak yok, durduruluyor`);
      await logRun(runId, logs, false, 0);
      await updateHealth(false, 'Yeterli kaynak bulunamadı');
      return;
    }

    // Adım 3: Makaleleri oluştur
    if (!DRY_RUN && process.env.OPENAI_API_KEY) {
      console.log('✍️ ADIM 3: Makaleler oluşturuluyor...');
      logs.push(`[${nowISOTurkey()}] Makale üretimi başladı`);
      
      const articles = await generateArticles(researchBundles);
      console.log(`✅ ${articles.length} makale oluşturuldu\n`);
      logs.push(`[${nowISOTurkey()}] ${articles.length} makale oluşturuldu`);

      // Adım 4: Makaleleri yayınla
      console.log('📤 ADIM 4: Makaleler yayınlanıyor...');
      logs.push(`[${nowISOTurkey()}] Yayınlama başladı`);
      
      articlesGenerated = await publishArticles(articles);
      console.log(`✅ ${articlesGenerated} makale yayınlandı\n`);
      logs.push(`[${nowISOTurkey()}] ${articlesGenerated} makale yayınlandı`);
    } else {
      if (DRY_RUN) {
        console.log('ℹ️ DRY RUN modu - Makale üretimi ve yayınlama atlandı');
        logs.push(`[${nowISOTurkey()}] DRY RUN - Makale üretimi atlandı`);
      } else {
        console.log('⚠️ OPENAI_API_KEY bulunamadı - Makale üretimi atlandı');
        logs.push(`[${nowISOTurkey()}] API key yok - Makale üretimi atlandı`);
      }
    }

  } catch (error) {
    success = false;
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('❌ Pipeline hatası:', errorMessage);
    logs.push(`[${nowISOTurkey()}] HATA: ${errorMessage}`);
  }

  // Çalışma özeti
  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Pipeline Tamamlandı`);
  console.log(`⏱️ Süre: ${duration} saniye`);
  console.log(`📝 Oluşturulan Makale: ${articlesGenerated}`);
  console.log(`✅ Durum: ${success ? 'BAŞARILI' : 'HATALI'}`);
  console.log('═══════════════════════════════════════════════════════════');

  logs.push(`[${nowISOTurkey()}] Pipeline tamamlandı - Süre: ${duration}s, Makaleler: ${articlesGenerated}`);
  
  await logRun(runId, logs, success, articlesGenerated);
  await updateHealth(success, success ? 'Başarılı' : 'Hata oluştu');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
