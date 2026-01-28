/**
 * Loglama yardımcı fonksiyonları
 */

import fs from 'node:fs';
import path from 'node:path';
import { formatDateForFile, nowISOTurkey } from './date.js';

const LOGS_DIR = path.join(process.cwd(), 'data', 'logs');
const HEALTH_FILE = path.join(process.cwd(), 'data', 'health.json');

export interface HealthStatus {
  lastRun: string;
  success: boolean;
  message: string;
  articlesGenerated: number;
  consecutiveFailures: number;
}

/**
 * Çalışma logunu kaydet
 */
export async function logRun(
  runId: string,
  logs: string[],
  success: boolean,
  articlesGenerated: number
): Promise<void> {
  const dateStr = formatDateForFile();
  const dirPath = path.join(LOGS_DIR, dateStr);
  
  fs.mkdirSync(dirPath, { recursive: true });
  
  const logContent = [
    `═══════════════════════════════════════════════════════════`,
    `Run ID: ${runId}`,
    `Time: ${nowISOTurkey()}`,
    `Status: ${success ? 'SUCCESS' : 'FAILED'}`,
    `Articles Generated: ${articlesGenerated}`,
    `═══════════════════════════════════════════════════════════`,
    '',
    ...logs,
    '',
    `═══════════════════════════════════════════════════════════`,
  ].join('\n');
  
  const logFile = path.join(dirPath, `run-${runId.split('-').pop()}.log`);
  fs.writeFileSync(logFile, logContent, 'utf-8');
  
  // JSON formatında da kaydet
  const jsonFile = path.join(dirPath, `run-${runId.split('-').pop()}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify({
    runId,
    timestamp: nowISOTurkey(),
    success,
    articlesGenerated,
    logs,
  }, null, 2), 'utf-8');
}

/**
 * Health status'u güncelle
 */
export async function updateHealth(success: boolean, message: string): Promise<void> {
  let health: HealthStatus;
  
  try {
    if (fs.existsSync(HEALTH_FILE)) {
      health = JSON.parse(fs.readFileSync(HEALTH_FILE, 'utf-8'));
    } else {
      health = {
        lastRun: '',
        success: true,
        message: '',
        articlesGenerated: 0,
        consecutiveFailures: 0,
      };
    }
  } catch {
    health = {
      lastRun: '',
      success: true,
      message: '',
      articlesGenerated: 0,
      consecutiveFailures: 0,
    };
  }
  
  health.lastRun = nowISOTurkey();
  health.success = success;
  health.message = message;
  
  if (success) {
    health.consecutiveFailures = 0;
  } else {
    health.consecutiveFailures++;
  }
  
  const dirPath = path.dirname(HEALTH_FILE);
  fs.mkdirSync(dirPath, { recursive: true });
  
  fs.writeFileSync(HEALTH_FILE, JSON.stringify(health, null, 2), 'utf-8');
}

/**
 * Health status'u oku
 */
export function getHealth(): HealthStatus | null {
  try {
    if (fs.existsSync(HEALTH_FILE)) {
      return JSON.parse(fs.readFileSync(HEALTH_FILE, 'utf-8'));
    }
  } catch {
    // Ignore
  }
  return null;
}
