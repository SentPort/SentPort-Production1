const NUMBER_WORDS: Record<string, number> = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
  'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000,
  'million': 1000000, 'billion': 1000000000
};

const OPERATION_WORDS: Record<string, string> = {
  'plus': '+',
  'add': '+',
  'added': '+',
  'sum': '+',
  'minus': '-',
  'subtract': '-',
  'less': '-',
  'difference': '-',
  'times': '*',
  'multiply': '*',
  'multiplied': '*',
  'of': '*',
  'divide': '/',
  'divided': '/',
  'over': '/',
  'per': '/',
  'power': '^',
  'squared': '^2',
  'cubed': '^3',
  'equals': '=',
  'equal': '=',
  'is': '='
};

const FRACTION_WORDS: Record<string, string> = {
  'half': '1/2',
  'halves': '1/2',
  'third': '1/3',
  'thirds': '1/3',
  'quarter': '1/4',
  'quarters': '1/4',
  'fourth': '1/4',
  'fourths': '1/4',
  'fifth': '1/5',
  'fifths': '1/5',
  'sixth': '1/6',
  'sixths': '1/6',
  'seventh': '1/7',
  'sevenths': '1/7',
  'eighth': '1/8',
  'eighths': '1/8',
  'ninth': '1/9',
  'ninths': '1/9',
  'tenth': '1/10',
  'tenths': '1/10'
};

interface ParsedToken {
  type: 'number' | 'operation' | 'word' | 'symbol' | 'parenthesis';
  value: string;
  original: string;
}

function parseComplexNumberWord(words: string[]): { value: number; consumed: number } | null {
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

function parseFraction(words: string[], startIndex: number): { value: string; consumed: number } | null {
  const word = words[startIndex].toLowerCase();

  if (FRACTION_WORDS[word]) {
    return { value: FRACTION_WORDS[word], consumed: 1 };
  }

  const numeratorResult = parseComplexNumberWord([words[startIndex]]);
  if (!numeratorResult) return null;

  let nextIndex = startIndex + 1;
  if (nextIndex >= words.length) return null;

  const denomWord = words[nextIndex].toLowerCase();
  let denominator: number | null = null;

  if (denomWord.endsWith('th') || denomWord.endsWith('ths')) {
    const baseDenom = denomWord.replace(/ths?$/, '');
    const denomNum = NUMBER_WORDS[baseDenom];
    if (denomNum) {
      denominator = denomNum;
    }
  }

  if (denominator) {
    return {
      value: `${numeratorResult.value}/${denominator}`,
      consumed: 2
    };
  }

  return null;
}

function tokenizeQuery(query: string): ParsedToken[] {
  const tokens: ParsedToken[] = [];
  const words = query.trim().split(/\s+/);
  let i = 0;

  while (i < words.length) {
    const word = words[i];
    const lowerWord = word.toLowerCase().replace(/[,?!.]/g, '');

    if (/^[\d.]+$/.test(word)) {
      tokens.push({ type: 'number', value: word, original: word });
      i++;
      continue;
    }

    if (/^[\+\-\*\/\^\(\)\=]$/.test(word)) {
      tokens.push({ type: 'symbol', value: word, original: word });
      i++;
      continue;
    }

    if (word === '(' || word === ')') {
      tokens.push({ type: 'parenthesis', value: word, original: word });
      i++;
      continue;
    }

    const fractionResult = parseFraction(words, i);
    if (fractionResult) {
      tokens.push({ type: 'number', value: fractionResult.value, original: words.slice(i, i + fractionResult.consumed).join(' ') });
      i += fractionResult.consumed;
      continue;
    }

    const numberResult = parseComplexNumberWord(words.slice(i));
    if (numberResult && numberResult.consumed > 0) {
      tokens.push({ type: 'number', value: numberResult.value.toString(), original: words.slice(i, i + numberResult.consumed).join(' ') });
      i += numberResult.consumed;
      continue;
    }

    if (OPERATION_WORDS[lowerWord]) {
      if (lowerWord === 'of') {
        const prevToken = tokens.length > 0 ? tokens[tokens.length - 1] : null;
        const prevOriginal = prevToken?.original.toLowerCase();
        if (prevOriginal && (prevOriginal.includes('percent') || prevOriginal.includes('percentage') || (prevToken.type === 'number' && prevToken.value.includes('/100')))) {
          tokens.push({ type: 'operation', value: '*', original: word });
          i++;
          continue;
        }
      } else if (lowerWord !== 'is') {
        const opValue = OPERATION_WORDS[lowerWord];
        tokens.push({ type: 'operation', value: opValue, original: word });
        i++;
        continue;
      }
    }

    if (lowerWord === 'is' && i > 0) {
      const prevWords = words.slice(Math.max(0, i - 3), i).map(w => w.toLowerCase());
      if (prevWords.includes('what') || prevWords.includes('calculate') || prevWords.includes('compute')) {
        i++;
        continue;
      }
    }

    if (lowerWord === 'percent' || lowerWord === 'percentage') {
      if (tokens.length > 0 && tokens[tokens.length - 1].type === 'number') {
        const lastToken = tokens[tokens.length - 1];
        lastToken.value = `(${lastToken.value}/100)`;
        lastToken.original += ' ' + word;
      }
      i++;
      continue;
    }

    if (lowerWord === 'to' && i + 1 < words.length && words[i + 1].toLowerCase() === 'the') {
      i++;
      continue;
    }

    if (lowerWord === 'the' || lowerWord === 'a' || lowerWord === 'an') {
      i++;
      continue;
    }

    if (lowerWord === 'by' || lowerWord === 'with' || lowerWord === 'from' || lowerWord === 'than') {
      i++;
      continue;
    }

    if (lowerWord === 'open' && i + 1 < words.length && (words[i + 1].toLowerCase() === 'paren' || words[i + 1].toLowerCase() === 'bracket')) {
      tokens.push({ type: 'parenthesis', value: '(', original: words[i] + ' ' + words[i + 1] });
      i += 2;
      continue;
    }

    if (lowerWord === 'close' && i + 1 < words.length && (words[i + 1].toLowerCase() === 'paren' || words[i + 1].toLowerCase() === 'bracket')) {
      tokens.push({ type: 'parenthesis', value: ')', original: words[i] + ' ' + words[i + 1] });
      i += 2;
      continue;
    }

    if (lowerWord === 'root' && tokens.length > 0) {
      const lastToken = tokens[tokens.length - 1];
      if (lastToken.original.toLowerCase() === 'square') {
        tokens[tokens.length - 1] = { type: 'operation', value: 'sqrt(', original: lastToken.original + ' ' + word };
        i++;
        continue;
      }
      if (lastToken.original.toLowerCase() === 'cube') {
        tokens[tokens.length - 1] = { type: 'operation', value: 'cbrt(', original: lastToken.original + ' ' + word };
        i++;
        continue;
      }
    }

    tokens.push({ type: 'word', value: lowerWord, original: word });
    i++;
  }

  return tokens;
}

function buildExpression(tokens: ParsedToken[]): string | null {
  if (tokens.length === 0) return null;

  let expression = '';
  let expectingValue = true;
  let hasNumbers = false;
  let hasOperations = false;
  let openParenCount = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'number') {
      if (!expectingValue && expression.length > 0) {
        break;
      }
      expression += token.value;
      expectingValue = false;
      hasNumbers = true;
    } else if (token.type === 'operation') {
      if (token.value === 'sqrt(' || token.value === 'cbrt(') {
        expression += token.value;
        expectingValue = true;
        openParenCount++;
        hasOperations = true;
      } else if (token.value === '=') {
        break;
      } else {
        if (expectingValue || expression.length === 0) {
          if (token.value === '-' && expectingValue) {
            expression += '-';
          } else {
            return null;
          }
        } else {
          expression += token.value;
          expectingValue = true;
          hasOperations = true;
        }
      }
    } else if (token.type === 'symbol') {
      if (token.value === '=' || token.value === '?') {
        break;
      }
      expression += token.value;
      if (token.value === '(' || token.value === ')') {
        if (token.value === '(') openParenCount++;
        else openParenCount--;
      } else {
        expectingValue = token.value !== ')';
        hasOperations = true;
      }
    } else if (token.type === 'parenthesis') {
      expression += token.value;
      if (token.value === '(') {
        openParenCount++;
        expectingValue = true;
      } else {
        openParenCount--;
        expectingValue = false;
      }
    } else if (token.type === 'word') {
      if (['what', 'calculate', 'solve', 'compute', 'find'].includes(token.value)) {
        continue;
      }

      if (expectingValue || hasNumbers) {
        break;
      }
    }
  }

  while (openParenCount > 0) {
    expression += ')';
    openParenCount--;
  }

  if (!hasNumbers) return null;

  expression = expression.replace(/\s+/g, '');

  if (expression.endsWith('+') || expression.endsWith('-') || expression.endsWith('*') || expression.endsWith('/') || expression.endsWith('^')) {
    expression = expression.slice(0, -1);
  }

  return expression.length > 0 ? expression : null;
}

export function parseWordBasedMathExpression(query: string): string | null {
  try {
    const tokens = tokenizeQuery(query);
    const expression = buildExpression(tokens);

    console.log('[MathParser] Query:', query);
    console.log('[MathParser] Tokens:', tokens);
    console.log('[MathParser] Expression:', expression);

    return expression;
  } catch (error) {
    console.error('[MathParser] Error parsing:', error);
    return null;
  }
}

export function containsMathWords(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);

  let hasNumber = false;
  let hasOperation = false;

  for (const word of words) {
    const cleanWord = word.replace(/[,?!.]/g, '');

    if (NUMBER_WORDS[cleanWord] !== undefined || FRACTION_WORDS[cleanWord] !== undefined) {
      hasNumber = true;
    }

    if (/^\d+$/.test(cleanWord)) {
      hasNumber = true;
    }

    if (OPERATION_WORDS[cleanWord] && cleanWord !== 'is') {
      hasOperation = true;
    }

    if (cleanWord === 'percent' || cleanWord === 'percentage') {
      hasOperation = true;
    }
  }

  return hasNumber && hasOperation;
}
