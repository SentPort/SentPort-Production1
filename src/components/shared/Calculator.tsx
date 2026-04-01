import { useState, useEffect } from 'react';
import { X, Delete, RotateCcw, Copy, Check } from 'lucide-react';
import * as math from 'mathjs';

interface CalculatorProps {
  initialExpression?: string;
  onClose?: () => void;
}

type CalculatorMode = 'basic' | 'scientific';

export function Calculator({ initialExpression, onClose }: CalculatorProps) {
  const [display, setDisplay] = useState(initialExpression || '0');
  const [result, setResult] = useState<string | null>(null);
  const [mode, setMode] = useState<CalculatorMode>('basic');
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialExpression) {
      setDisplay(initialExpression);
      calculateResult(initialExpression);
    }
  }, [initialExpression]);

  const calculateResult = (expression: string) => {
    try {
      setError(null);
      const cleanExpression = expression.replace(/×/g, '*').replace(/÷/g, '/');
      const calculatedResult = math.evaluate(cleanExpression);
      const formattedResult = typeof calculatedResult === 'number'
        ? Number(calculatedResult.toPrecision(14)).toString()
        : calculatedResult.toString();
      setResult(formattedResult);
      return formattedResult;
    } catch (err) {
      setError('Invalid expression');
      setResult(null);
      return null;
    }
  };

  const handleButtonClick = (value: string) => {
    if (display === '0' && value !== '.') {
      setDisplay(value);
    } else {
      setDisplay(display + value);
    }
    setResult(null);
    setError(null);
  };

  const handleOperator = (operator: string) => {
    const lastChar = display[display.length - 1];
    if (['+', '-', '*', '/', '×', '÷', '^'].includes(lastChar)) {
      setDisplay(display.slice(0, -1) + operator);
    } else {
      setDisplay(display + operator);
    }
    setResult(null);
    setError(null);
  };

  const handleFunction = (func: string) => {
    setDisplay(display + func + '(');
    setResult(null);
    setError(null);
  };

  const handleClear = () => {
    setDisplay('0');
    setResult(null);
    setError(null);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
    setResult(null);
    setError(null);
  };

  const handleEquals = () => {
    const calculatedResult = calculateResult(display);
    if (calculatedResult !== null) {
      setHistory([`${display} = ${calculatedResult}`, ...history.slice(0, 4)]);
    }
  };

  const handleCopy = async () => {
    const textToCopy = result || display;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const basicButtons = [
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+']
  ];

  const scientificButtons = [
    ['sin', 'cos', 'tan', '(', ')'],
    ['ln', 'log', 'sqrt', '^', 'π'],
    ['7', '8', '9', '÷', 'AC'],
    ['4', '5', '6', '×', '←'],
    ['1', '2', '3', '-', '='],
    ['0', '.', 'e', '+', '']
  ];

  const buttons = mode === 'basic' ? basicButtons : scientificButtons;

  const handleButtonPress = (btn: string) => {
    switch (btn) {
      case '=':
        handleEquals();
        break;
      case 'AC':
        handleClear();
        break;
      case '←':
        handleBackspace();
        break;
      case '+':
      case '-':
      case '×':
      case '÷':
      case '^':
        handleOperator(btn);
        break;
      case 'sin':
      case 'cos':
      case 'tan':
      case 'ln':
      case 'log':
      case 'sqrt':
        handleFunction(btn);
        break;
      case 'π':
        handleButtonClick('pi');
        break;
      case 'e':
        handleButtonClick('e');
        break;
      case '':
        break;
      default:
        handleButtonClick(btn);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold text-lg">Calculator</h3>
          <div className="flex gap-1 bg-blue-800 rounded-md p-1">
            <button
              onClick={() => setMode('basic')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'basic'
                  ? 'bg-white text-blue-700'
                  : 'text-white hover:bg-blue-700'
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setMode('scientific')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'scientific'
                  ? 'bg-white text-blue-700'
                  : 'text-white hover:bg-blue-700'
              }`}
            >
              Scientific
            </button>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 rounded p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <div className="text-right mb-2">
            <div className="text-gray-600 text-sm min-h-6 break-all">{display}</div>
          </div>
          {error && (
            <div className="text-right text-red-600 text-sm font-medium">{error}</div>
          )}
          {result !== null && !error && (
            <div className="flex items-center justify-end gap-2 border-t border-gray-300 pt-2">
              <div className="text-2xl font-bold text-gray-900 break-all">{result}</div>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-2 hover:bg-gray-200 rounded transition-colors"
                title="Copy result"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>
          )}
        </div>

        {mode === 'basic' && (
          <div className="mb-3 flex gap-2">
            <button
              onClick={handleClear}
              className="flex-1 py-2 px-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={handleBackspace}
              className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Delete className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}

        <div className={`grid gap-2 ${mode === 'basic' ? 'grid-cols-4' : 'grid-cols-5'}`}>
          {buttons.map((row, rowIndex) => (
            row.map((btn, btnIndex) => {
              if (btn === '') return <div key={`${rowIndex}-${btnIndex}`} />;

              const isOperator = ['+', '-', '×', '÷', '='].includes(btn);
              const isSpecial = ['AC', '←'].includes(btn);
              const isFunction = ['sin', 'cos', 'tan', 'ln', 'log', 'sqrt'].includes(btn);

              return (
                <button
                  key={`${rowIndex}-${btnIndex}`}
                  onClick={() => handleButtonPress(btn)}
                  className={`py-3 px-4 rounded-lg font-semibold transition-colors ${
                    btn === '='
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : isOperator
                      ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                      : isSpecial
                      ? 'bg-red-100 hover:bg-red-200 text-red-700'
                      : isFunction
                      ? 'bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  {btn}
                </button>
              );
            })
          ))}
        </div>

        {history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">Recent Calculations</h4>
            <div className="space-y-1">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    const parts = item.split(' = ');
                    if (parts[0]) {
                      setDisplay(parts[0]);
                      calculateResult(parts[0]);
                    }
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
