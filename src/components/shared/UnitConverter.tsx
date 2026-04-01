import { useState, useEffect } from 'react';
import { X, ArrowLeftRight, Copy, Check } from 'lucide-react';
import {
  conversionCategories,
  convert,
  getConversionFormula,
  ConversionCategory
} from '../../lib/unitConversion';
import { ConversionRequest } from '../../lib/unitConversionParser';

interface UnitConverterProps {
  initialConversion?: ConversionRequest;
  onClose?: () => void;
}

interface ConversionHistory {
  value: number;
  fromUnit: string;
  toUnit: string;
  result: number;
  category: ConversionCategory;
}

export function UnitConverter({ initialConversion, onClose }: UnitConverterProps) {
  const [selectedCategory, setSelectedCategory] = useState<ConversionCategory>(
    initialConversion?.category || 'length'
  );
  const [fromValue, setFromValue] = useState<string>(
    initialConversion?.value.toString() || '1'
  );
  const [toValue, setToValue] = useState<string>('');
  const [fromUnit, setFromUnit] = useState<string>('');
  const [toUnit, setToUnit] = useState<string>('');
  const [formula, setFormula] = useState<string>('');
  const [history, setHistory] = useState<ConversionHistory[]>([]);
  const [copied, setCopied] = useState(false);

  const currentCategory = conversionCategories.find(c => c.id === selectedCategory);
  const unitKeys = currentCategory ? Object.keys(currentCategory.units) : [];

  useEffect(() => {
    const storedHistory = localStorage.getItem('unitConversionHistory');
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        setHistory(parsed.slice(0, 5));
      } catch (e) {
        console.error('Failed to parse conversion history:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (initialConversion && currentCategory) {
      const fromUnitKey = Object.keys(currentCategory.units).find(key =>
        currentCategory.units[key].aliases.some(
          alias => alias.toLowerCase() === initialConversion.fromUnit.toLowerCase()
        )
      );
      const toUnitKey = Object.keys(currentCategory.units).find(key =>
        currentCategory.units[key].aliases.some(
          alias => alias.toLowerCase() === initialConversion.toUnit.toLowerCase()
        )
      );

      if (fromUnitKey && toUnitKey) {
        setFromUnit(fromUnitKey);
        setToUnit(toUnitKey);
        setFromValue(initialConversion.value.toString());
      }
    } else if (unitKeys.length >= 2) {
      setFromUnit(unitKeys[0]);
      setToUnit(unitKeys[1]);
    }
  }, [selectedCategory, initialConversion]);

  useEffect(() => {
    if (fromUnit && toUnit && fromValue) {
      const numValue = parseFloat(fromValue);
      if (!isNaN(numValue)) {
        const result = convert(numValue, fromUnit, toUnit, selectedCategory);
        if (result !== null) {
          const precision = Math.abs(result) < 0.01 || Math.abs(result) > 1000000 ? 6 : 8;
          setToValue(Number(result.toPrecision(precision)).toString());

          const formulaText = getConversionFormula(fromUnit, toUnit, selectedCategory);
          setFormula(formulaText);
        }
      }
    }
  }, [fromValue, fromUnit, toUnit, selectedCategory]);

  const handleFromValueChange = (value: string) => {
    setFromValue(value);
  };

  const handleToValueChange = (value: string) => {
    setToValue(value);

    const numValue = parseFloat(value);
    if (!isNaN(numValue) && fromUnit && toUnit) {
      const result = convert(numValue, toUnit, fromUnit, selectedCategory);
      if (result !== null) {
        const precision = Math.abs(result) < 0.01 || Math.abs(result) > 1000000 ? 6 : 8;
        setFromValue(Number(result.toPrecision(precision)).toString());
      }
    }
  };

  const handleSwapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setFromValue(toValue);
  };

  const handleCategoryChange = (newCategory: ConversionCategory) => {
    setSelectedCategory(newCategory);
    const newCategoryInfo = conversionCategories.find(c => c.id === newCategory);
    if (newCategoryInfo) {
      const keys = Object.keys(newCategoryInfo.units);
      if (keys.length >= 2) {
        setFromUnit(keys[0]);
        setToUnit(keys[1]);
      }
    }
    setFromValue('1');
  };

  const saveToHistory = () => {
    const numValue = parseFloat(fromValue);
    const numResult = parseFloat(toValue);

    if (!isNaN(numValue) && !isNaN(numResult) && fromUnit && toUnit) {
      const newEntry: ConversionHistory = {
        value: numValue,
        fromUnit,
        toUnit,
        result: numResult,
        category: selectedCategory,
      };

      const newHistory = [newEntry, ...history.filter(
        h => !(h.value === numValue && h.fromUnit === fromUnit && h.toUnit === toUnit)
      )].slice(0, 5);

      setHistory(newHistory);
      localStorage.setItem('unitConversionHistory', JSON.stringify(newHistory));
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      saveToHistory();
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const loadFromHistory = (item: ConversionHistory) => {
    setSelectedCategory(item.category);
    setFromValue(item.value.toString());
    setFromUnit(item.fromUnit);
    setToUnit(item.toUnit);
  };

  const getUnitDisplay = (unitKey: string) => {
    if (!currentCategory) return unitKey;
    const unit = currentCategory.units[unitKey];
    return unit ? `${unit.name} (${unit.symbol})` : unitKey;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">Unit Converter</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white hover:bg-green-800 rounded p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Conversion Type
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value as ConversionCategory)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
          >
            {conversionCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="number"
                value={fromValue}
                onChange={(e) => handleFromValueChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-2"
                placeholder="Enter value"
              />
              <select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm"
              >
                {unitKeys.map(key => (
                  <option key={key} value={key}>
                    {getUnitDisplay(key)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSwapUnits}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors self-center"
              title="Swap units"
            >
              <ArrowLeftRight className="w-5 h-5 text-gray-600" />
            </button>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="number"
                value={toValue}
                onChange={(e) => handleToValueChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-2"
                placeholder="Result"
              />
              <select
                value={toUnit}
                onChange={(e) => setToUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm"
              >
                {unitKeys.map(key => (
                  <option key={key} value={key}>
                    {getUnitDisplay(key)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {toValue && fromValue && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">{fromValue}</span>{' '}
                  {currentCategory?.units[fromUnit]?.symbol} ={' '}
                  <span className="font-semibold">{toValue}</span>{' '}
                  {currentCategory?.units[toUnit]?.symbol}
                </div>
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
              {formula && (
                <div className="mt-2 text-xs text-gray-600 bg-yellow-50 px-3 py-2 rounded border border-yellow-200">
                  <span className="font-semibold">Formula:</span> {formula}
                </div>
              )}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">Recent Conversions</h4>
            <div className="space-y-1">
              {history.map((item, index) => {
                const category = conversionCategories.find(c => c.id === item.category);
                const fromUnitInfo = category?.units[item.fromUnit];
                const toUnitInfo = category?.units[item.toUnit];

                return (
                  <div
                    key={index}
                    className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded cursor-pointer hover:bg-gray-100"
                    onClick={() => loadFromHistory(item)}
                  >
                    {item.value} {fromUnitInfo?.symbol} = {item.result.toPrecision(6)} {toUnitInfo?.symbol}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
