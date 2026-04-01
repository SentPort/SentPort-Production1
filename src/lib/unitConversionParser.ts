import { getAllUnits, ConversionCategory } from './unitConversion';

const NUMBER_WORDS: Record<string, number> = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
  'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000,
  'million': 1000000, 'billion': 1000000000
};

const CONVERSION_KEYWORDS = ['to', 'in', 'convert', 'equals', 'how many'];

export interface ConversionRequest {
  value: number;
  fromUnit: string;
  toUnit: string;
  category: ConversionCategory;
  originalQuery: string;
}

function parseNumberWords(words: string[]): { value: number; consumed: number } | null {
  let total = 0;
  let current = 0;
  let consumed = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/-/g, ' ');
    const parts = word.split(' ');

    for (const part of parts) {
      if (part === 'and') {
        consumed++;
        continue;
      }

      const num = NUMBER_WORDS[part];

      if (num === undefined) {
        if (current > 0) total += current;
        return consumed > 0 ? { value: total, consumed } : null;
      }

      if (num === 100) {
        current = (current || 1) * 100;
      } else if (num === 1000) {
        current = (current || 1) * 1000;
        total += current;
        current = 0;
      } else if (num === 1000000) {
        current = (current || 1) * 1000000;
        total += current;
        current = 0;
      } else if (num === 1000000000) {
        current = (current || 1) * 1000000000;
        total += current;
        current = 0;
      } else {
        current += num;
      }

      consumed++;
    }
  }

  if (current > 0) total += current;
  return consumed > 0 ? { value: total, consumed } : null;
}

function extractNumber(words: string[], startIndex: number): { value: number; consumed: number } | null {
  const word = words[startIndex];

  if (/^\d+(\.\d+)?$/.test(word)) {
    return { value: parseFloat(word), consumed: 1 };
  }

  return parseNumberWords(words.slice(startIndex));
}

export function parseConversionQuery(query: string): ConversionRequest | null {
  const allUnits = getAllUnits();
  const words = query.toLowerCase().split(/\s+/);

  let valueData: { value: number; consumed: number } | null = null;
  let fromUnit: string | null = null;
  let toUnit: string | null = null;
  let fromCategory: ConversionCategory | null = null;
  let toCategory: ConversionCategory | null = null;
  let conversionKeywordIndex = -1;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[,?!.]/g, '');

    if (CONVERSION_KEYWORDS.some(kw => word.includes(kw))) {
      conversionKeywordIndex = i;
    }
  }

  if (conversionKeywordIndex === -1) {
    return null;
  }

  for (let i = 0; i < conversionKeywordIndex; i++) {
    if (!valueData) {
      const numData = extractNumber(words, i);
      if (numData) {
        valueData = numData;
        i += numData.consumed - 1;
        continue;
      }
    }

    const word = words[i].replace(/[,?!.]/g, '');

    let potentialUnit = word;
    if (i + 1 < conversionKeywordIndex) {
      const twoWords = `${word} ${words[i + 1].replace(/[,?!.]/g, '')}`;
      if (allUnits.has(twoWords)) {
        potentialUnit = twoWords;
      }
    }
    if (i + 2 < conversionKeywordIndex) {
      const threeWords = `${word} ${words[i + 1].replace(/[,?!.]/g, '')} ${words[i + 2].replace(/[,?!.]/g, '')}`;
      if (allUnits.has(threeWords)) {
        potentialUnit = threeWords;
      }
    }

    const unitInfo = allUnits.get(potentialUnit);
    if (unitInfo && !fromUnit) {
      fromUnit = potentialUnit;
      fromCategory = unitInfo.category;
      if (potentialUnit.includes(' ')) {
        i += potentialUnit.split(' ').length - 1;
      }
    }
  }

  for (let i = conversionKeywordIndex + 1; i < words.length; i++) {
    const word = words[i].replace(/[,?!.]/g, '');

    let potentialUnit = word;
    if (i + 1 < words.length) {
      const twoWords = `${word} ${words[i + 1].replace(/[,?!.]/g, '')}`;
      if (allUnits.has(twoWords)) {
        potentialUnit = twoWords;
      }
    }
    if (i + 2 < words.length) {
      const threeWords = `${word} ${words[i + 1].replace(/[,?!.]/g, '')} ${words[i + 2].replace(/[,?!.]/g, '')}`;
      if (allUnits.has(threeWords)) {
        potentialUnit = threeWords;
      }
    }

    const unitInfo = allUnits.get(potentialUnit);
    if (unitInfo) {
      toUnit = potentialUnit;
      toCategory = unitInfo.category;
      if (potentialUnit.includes(' ')) {
        i += potentialUnit.split(' ').length - 1;
      }
      break;
    }
  }

  if (!valueData) {
    valueData = { value: 1, consumed: 0 };
  }

  if (!fromUnit || !toUnit || !fromCategory || !toCategory) {
    return null;
  }

  if (fromCategory !== toCategory) {
    return null;
  }

  return {
    value: valueData.value,
    fromUnit,
    toUnit,
    category: fromCategory,
    originalQuery: query,
  };
}

export function containsConversionQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const allUnits = getAllUnits();

  const hasConversionKeyword = CONVERSION_KEYWORDS.some(kw => lowerQuery.includes(kw));
  if (!hasConversionKeyword) return false;

  const words = lowerQuery.split(/\s+/);
  let unitCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[,?!.]/g, '');

    if (allUnits.has(word)) {
      unitCount++;
      if (unitCount >= 2) return true;
    }

    if (i + 1 < words.length) {
      const twoWords = `${word} ${words[i + 1].replace(/[,?!.]/g, '')}`;
      if (allUnits.has(twoWords)) {
        unitCount++;
        if (unitCount >= 2) return true;
      }
    }

    if (i + 2 < words.length) {
      const threeWords = `${word} ${words[i + 1].replace(/[,?!.]/g, '')} ${words[i + 2].replace(/[,?!.]/g, '')}`;
      if (allUnits.has(threeWords)) {
        unitCount++;
        if (unitCount >= 2) return true;
      }
    }
  }

  return false;
}
