import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { 
  loadState, 
  saveState, 
  isRecentlyPublished, 
  markAsPublished 
} from '../../scripts/pipeline/utils/state';

const TEST_STATE_FILE = path.join(process.cwd(), 'data', 'state.json');

describe('State Management', () => {
  beforeEach(() => {
    // Test öncesi state dosyasını temizle
    if (fs.existsSync(TEST_STATE_FILE)) {
      fs.unlinkSync(TEST_STATE_FILE);
    }
  });

  afterEach(() => {
    // Test sonrası temizlik
    if (fs.existsSync(TEST_STATE_FILE)) {
      fs.unlinkSync(TEST_STATE_FILE);
    }
  });

  describe('loadState', () => {
    it('dosya yoksa varsayılan state döndürmeli', () => {
      const state = loadState();
      expect(state.publishedTrends).toEqual({});
      expect(state.lastUpdated).toBeDefined();
    });

    it('mevcut state dosyasını yüklemeli', () => {
      const testState = {
        publishedTrends: {
          'test-trend': {
            slug: 'test-slug',
            publishedAt: new Date().toISOString(),
          },
        },
        lastUpdated: new Date().toISOString(),
      };

      fs.mkdirSync(path.dirname(TEST_STATE_FILE), { recursive: true });
      fs.writeFileSync(TEST_STATE_FILE, JSON.stringify(testState));

      const state = loadState();
      expect(state.publishedTrends['test-trend']).toBeDefined();
      expect(state.publishedTrends['test-trend'].slug).toBe('test-slug');
    });
  });

  describe('saveState', () => {
    it('state dosyasını kaydetmeli', () => {
      const state = {
        publishedTrends: {
          'test': { slug: 'test', publishedAt: new Date().toISOString() },
        },
        lastUpdated: '',
      };

      saveState(state);

      expect(fs.existsSync(TEST_STATE_FILE)).toBe(true);
      
      const saved = JSON.parse(fs.readFileSync(TEST_STATE_FILE, 'utf-8'));
      expect(saved.publishedTrends['test']).toBeDefined();
    });
  });

  describe('isRecentlyPublished', () => {
    it('yeni trend için false döndürmeli', () => {
      const state = loadState();
      expect(isRecentlyPublished('yeni-trend', state)).toBe(false);
    });

    it('son 24 saatte yayınlanan trend için true döndürmeli', () => {
      const state = loadState();
      markAsPublished('test-trend', 'test-slug', state);
      
      expect(isRecentlyPublished('test-trend', state)).toBe(true);
    });

    it('24 saatten eski trend için false döndürmeli', () => {
      const state = loadState();
      
      // 25 saat önceki zaman
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
      state.publishedTrends['eski-trend'] = {
        slug: 'eski-slug',
        publishedAt: oldDate.toISOString(),
      };

      expect(isRecentlyPublished('eski-trend', state)).toBe(false);
    });
  });

  describe('markAsPublished', () => {
    it('trend\'i published olarak işaretlemeli', () => {
      const state = loadState();
      
      markAsPublished('yeni-trend', 'yeni-slug', state);

      expect(state.publishedTrends['yeni-trend']).toBeDefined();
      expect(state.publishedTrends['yeni-trend'].slug).toBe('yeni-slug');
      expect(state.publishedTrends['yeni-trend'].publishedAt).toBeDefined();
    });
  });
});
