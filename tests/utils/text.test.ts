import { describe, it, expect } from 'vitest';
import { 
  normalizeQuery, 
  turkishToAscii, 
  createSlug, 
  isSimilar,
  tokenize,
  jaccardSimilarity 
} from '../../scripts/pipeline/utils/text';

describe('normalizeQuery', () => {
  it('küçük harfe dönüştürmeli', () => {
    expect(normalizeQuery('GALATASARAY')).toBe('galatasaray');
  });

  it('boşlukları temizlemeli', () => {
    expect(normalizeQuery('  Fenerbahçe   maçı  ')).toBe('fenerbahçe maçı');
  });

  it('özel karakterleri kaldırmalı', () => {
    expect(normalizeQuery('test! @#$% query')).toBe('test query');
  });

  it('Türkçe karakterleri korumalı', () => {
    expect(normalizeQuery('İSTANBUL')).toBe('istanbul');
  });
});

describe('turkishToAscii', () => {
  it('Türkçe karakterleri ASCII ye çevirmeli', () => {
    expect(turkishToAscii('çğıöşü')).toBe('cgiosu');
    expect(turkishToAscii('ÇĞİÖŞÜ')).toBe('CGIOSU');
  });

  it('diğer karakterleri korumalı', () => {
    expect(turkishToAscii('hello world')).toBe('hello world');
  });

  it('karışık metinleri işlemeli', () => {
    expect(turkishToAscii('Türkiye Cumhuriyeti')).toBe('Turkiye Cumhuriyeti');
  });
});

describe('createSlug', () => {
  it('URL-safe slug oluşturmalı', () => {
    expect(createSlug('Merhaba Dünya')).toBe('merhaba-dunya');
  });

  it('Türkçe karakterleri dönüştürmeli', () => {
    expect(createSlug('Şampiyonlar Ligi Maçı')).toBe('sampiyonlar-ligi-maci');
  });

  it('özel karakterleri kaldırmalı', () => {
    expect(createSlug('Test! Haber? 2024')).toBe('test-haber-2024');
  });

  it('uzun başlıkları kırpmalı', () => {
    const longTitle = 'Bu çok uzun bir başlık ' + 'a'.repeat(100);
    expect(createSlug(longTitle).length).toBeLessThanOrEqual(80);
  });
});

describe('isSimilar', () => {
  it('tam eşleşmeleri bulmalı', () => {
    expect(isSimilar('galatasaray', 'galatasaray')).toBe(true);
  });

  it('büyük/küçük harf farkını yoksaymalı', () => {
    expect(isSimilar('Galatasaray', 'galatasaray')).toBe(true);
  });

  it('içeren metinleri benzer saymalı', () => {
    expect(isSimilar('galatasaray maçı', 'galatasaray')).toBe(true);
  });

  it('farklı metinleri ayırt etmeli', () => {
    expect(isSimilar('galatasaray', 'fenerbahçe')).toBe(false);
  });

  it('benzer metinleri bulmalı', () => {
    expect(isSimilar('dolar kuru', 'dolar kuru bugün')).toBe(true);
  });
});

describe('tokenize', () => {
  it('metni kelimelere ayırmalı', () => {
    expect(tokenize('Merhaba Dünya Test')).toEqual(['merhaba', 'dünya', 'test']);
  });

  it('kısa kelimeleri atlamalı', () => {
    expect(tokenize('bu ve de kelimeler')).toEqual(['kelimeler']);
  });

  it('boş metin için boş dizi döndürmeli', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('jaccardSimilarity', () => {
  it('aynı metinler için 1 döndürmeli', () => {
    expect(jaccardSimilarity('test kelime', 'test kelime')).toBe(1);
  });

  it('tamamen farklı metinler için 0 döndürmeli', () => {
    expect(jaccardSimilarity('galatasaray', 'fenerbahçe')).toBe(0);
  });

  it('kısmi eşleşmeler için 0-1 arası değer döndürmeli', () => {
    const similarity = jaccardSimilarity('dolar kuru bugün', 'dolar kuru artış');
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });
});
