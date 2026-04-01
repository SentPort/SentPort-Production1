export type ConversionCategory =
  | 'length'
  | 'weight'
  | 'temperature'
  | 'volume'
  | 'area'
  | 'speed'
  | 'time'
  | 'energy'
  | 'power'
  | 'pressure'
  | 'data'
  | 'fuel_economy'
  | 'angle'
  | 'frequency';

export interface UnitDefinition {
  symbol: string;
  name: string;
  plural: string;
  aliases: string[];
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
}

export interface ConversionCategoryInfo {
  id: ConversionCategory;
  label: string;
  units: Record<string, UnitDefinition>;
}

const lengthUnits: Record<string, UnitDefinition> = {
  mm: {
    symbol: 'mm',
    name: 'millimeter',
    plural: 'millimeters',
    aliases: ['mm', 'millimeter', 'millimeters', 'millimetre', 'millimetres'],
    toBase: (v) => v / 1000,
    fromBase: (v) => v * 1000,
  },
  cm: {
    symbol: 'cm',
    name: 'centimeter',
    plural: 'centimeters',
    aliases: ['cm', 'centimeter', 'centimeters', 'centimetre', 'centimetres'],
    toBase: (v) => v / 100,
    fromBase: (v) => v * 100,
  },
  m: {
    symbol: 'm',
    name: 'meter',
    plural: 'meters',
    aliases: ['m', 'meter', 'meters', 'metre', 'metres'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  km: {
    symbol: 'km',
    name: 'kilometer',
    plural: 'kilometers',
    aliases: ['km', 'kilometer', 'kilometers', 'kilometre', 'kilometres'],
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
  },
  in: {
    symbol: 'in',
    name: 'inch',
    plural: 'inches',
    aliases: ['in', 'inch', 'inches', '"'],
    toBase: (v) => v * 0.0254,
    fromBase: (v) => v / 0.0254,
  },
  ft: {
    symbol: 'ft',
    name: 'foot',
    plural: 'feet',
    aliases: ['ft', 'foot', 'feet', "'"],
    toBase: (v) => v * 0.3048,
    fromBase: (v) => v / 0.3048,
  },
  yd: {
    symbol: 'yd',
    name: 'yard',
    plural: 'yards',
    aliases: ['yd', 'yard', 'yards'],
    toBase: (v) => v * 0.9144,
    fromBase: (v) => v / 0.9144,
  },
  mi: {
    symbol: 'mi',
    name: 'mile',
    plural: 'miles',
    aliases: ['mi', 'mile', 'miles'],
    toBase: (v) => v * 1609.344,
    fromBase: (v) => v / 1609.344,
  },
  nmi: {
    symbol: 'nmi',
    name: 'nautical mile',
    plural: 'nautical miles',
    aliases: ['nmi', 'nautical mile', 'nautical miles'],
    toBase: (v) => v * 1852,
    fromBase: (v) => v / 1852,
  },
};

const weightUnits: Record<string, UnitDefinition> = {
  mg: {
    symbol: 'mg',
    name: 'milligram',
    plural: 'milligrams',
    aliases: ['mg', 'milligram', 'milligrams'],
    toBase: (v) => v / 1000000,
    fromBase: (v) => v * 1000000,
  },
  g: {
    symbol: 'g',
    name: 'gram',
    plural: 'grams',
    aliases: ['g', 'gram', 'grams'],
    toBase: (v) => v / 1000,
    fromBase: (v) => v * 1000,
  },
  kg: {
    symbol: 'kg',
    name: 'kilogram',
    plural: 'kilograms',
    aliases: ['kg', 'kilogram', 'kilograms'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  t: {
    symbol: 't',
    name: 'metric ton',
    plural: 'metric tons',
    aliases: ['t', 'metric ton', 'metric tons', 'tonne', 'tonnes'],
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
  },
  oz: {
    symbol: 'oz',
    name: 'ounce',
    plural: 'ounces',
    aliases: ['oz', 'ounce', 'ounces'],
    toBase: (v) => v * 0.0283495,
    fromBase: (v) => v / 0.0283495,
  },
  lb: {
    symbol: 'lb',
    name: 'pound',
    plural: 'pounds',
    aliases: ['lb', 'lbs', 'pound', 'pounds'],
    toBase: (v) => v * 0.453592,
    fromBase: (v) => v / 0.453592,
  },
  ton: {
    symbol: 'ton',
    name: 'ton',
    plural: 'tons',
    aliases: ['ton', 'tons', 'us ton', 'us tons'],
    toBase: (v) => v * 907.185,
    fromBase: (v) => v / 907.185,
  },
};

const temperatureUnits: Record<string, UnitDefinition> = {
  c: {
    symbol: '°C',
    name: 'celsius',
    plural: 'celsius',
    aliases: ['c', 'celsius', '°c', 'degree celsius', 'degrees celsius'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  f: {
    symbol: '°F',
    name: 'fahrenheit',
    plural: 'fahrenheit',
    aliases: ['f', 'fahrenheit', '°f', 'degree fahrenheit', 'degrees fahrenheit'],
    toBase: (v) => (v - 32) * 5 / 9,
    fromBase: (v) => (v * 9 / 5) + 32,
  },
  k: {
    symbol: 'K',
    name: 'kelvin',
    plural: 'kelvin',
    aliases: ['k', 'kelvin'],
    toBase: (v) => v - 273.15,
    fromBase: (v) => v + 273.15,
  },
};

const volumeUnits: Record<string, UnitDefinition> = {
  ml: {
    symbol: 'mL',
    name: 'milliliter',
    plural: 'milliliters',
    aliases: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'],
    toBase: (v) => v / 1000,
    fromBase: (v) => v * 1000,
  },
  l: {
    symbol: 'L',
    name: 'liter',
    plural: 'liters',
    aliases: ['l', 'liter', 'liters', 'litre', 'litres'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  m3: {
    symbol: 'm³',
    name: 'cubic meter',
    plural: 'cubic meters',
    aliases: ['m3', 'cubic meter', 'cubic meters', 'cubic metre', 'cubic metres', 'm³'],
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
  },
  floz: {
    symbol: 'fl oz',
    name: 'fluid ounce',
    plural: 'fluid ounces',
    aliases: ['floz', 'fl oz', 'fluid ounce', 'fluid ounces'],
    toBase: (v) => v * 0.0295735,
    fromBase: (v) => v / 0.0295735,
  },
  cup: {
    symbol: 'cup',
    name: 'cup',
    plural: 'cups',
    aliases: ['cup', 'cups'],
    toBase: (v) => v * 0.236588,
    fromBase: (v) => v / 0.236588,
  },
  pt: {
    symbol: 'pt',
    name: 'pint',
    plural: 'pints',
    aliases: ['pt', 'pint', 'pints'],
    toBase: (v) => v * 0.473176,
    fromBase: (v) => v / 0.473176,
  },
  qt: {
    symbol: 'qt',
    name: 'quart',
    plural: 'quarts',
    aliases: ['qt', 'quart', 'quarts'],
    toBase: (v) => v * 0.946353,
    fromBase: (v) => v / 0.946353,
  },
  gal: {
    symbol: 'gal',
    name: 'gallon',
    plural: 'gallons',
    aliases: ['gal', 'gallon', 'gallons'],
    toBase: (v) => v * 3.78541,
    fromBase: (v) => v / 3.78541,
  },
};

const areaUnits: Record<string, UnitDefinition> = {
  mm2: {
    symbol: 'mm²',
    name: 'square millimeter',
    plural: 'square millimeters',
    aliases: ['mm2', 'sq mm', 'square millimeter', 'square millimeters', 'mm²'],
    toBase: (v) => v / 1000000,
    fromBase: (v) => v * 1000000,
  },
  cm2: {
    symbol: 'cm²',
    name: 'square centimeter',
    plural: 'square centimeters',
    aliases: ['cm2', 'sq cm', 'square centimeter', 'square centimeters', 'cm²'],
    toBase: (v) => v / 10000,
    fromBase: (v) => v * 10000,
  },
  m2: {
    symbol: 'm²',
    name: 'square meter',
    plural: 'square meters',
    aliases: ['m2', 'sq m', 'square meter', 'square meters', 'm²'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  ha: {
    symbol: 'ha',
    name: 'hectare',
    plural: 'hectares',
    aliases: ['ha', 'hectare', 'hectares'],
    toBase: (v) => v * 10000,
    fromBase: (v) => v / 10000,
  },
  km2: {
    symbol: 'km²',
    name: 'square kilometer',
    plural: 'square kilometers',
    aliases: ['km2', 'sq km', 'square kilometer', 'square kilometers', 'km²'],
    toBase: (v) => v * 1000000,
    fromBase: (v) => v / 1000000,
  },
  in2: {
    symbol: 'in²',
    name: 'square inch',
    plural: 'square inches',
    aliases: ['in2', 'sq in', 'square inch', 'square inches', 'in²'],
    toBase: (v) => v * 0.00064516,
    fromBase: (v) => v / 0.00064516,
  },
  ft2: {
    symbol: 'ft²',
    name: 'square foot',
    plural: 'square feet',
    aliases: ['ft2', 'sq ft', 'square foot', 'square feet', 'ft²'],
    toBase: (v) => v * 0.092903,
    fromBase: (v) => v / 0.092903,
  },
  acre: {
    symbol: 'acre',
    name: 'acre',
    plural: 'acres',
    aliases: ['acre', 'acres'],
    toBase: (v) => v * 4046.86,
    fromBase: (v) => v / 4046.86,
  },
  mi2: {
    symbol: 'mi²',
    name: 'square mile',
    plural: 'square miles',
    aliases: ['mi2', 'sq mi', 'square mile', 'square miles', 'mi²'],
    toBase: (v) => v * 2589988,
    fromBase: (v) => v / 2589988,
  },
};

const speedUnits: Record<string, UnitDefinition> = {
  ms: {
    symbol: 'm/s',
    name: 'meter per second',
    plural: 'meters per second',
    aliases: ['m/s', 'ms', 'meter per second', 'meters per second', 'mps'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  kmh: {
    symbol: 'km/h',
    name: 'kilometer per hour',
    plural: 'kilometers per hour',
    aliases: ['km/h', 'kmh', 'kph', 'kilometer per hour', 'kilometers per hour'],
    toBase: (v) => v / 3.6,
    fromBase: (v) => v * 3.6,
  },
  mph: {
    symbol: 'mph',
    name: 'mile per hour',
    plural: 'miles per hour',
    aliases: ['mph', 'mi/h', 'mile per hour', 'miles per hour'],
    toBase: (v) => v * 0.44704,
    fromBase: (v) => v / 0.44704,
  },
  knot: {
    symbol: 'knot',
    name: 'knot',
    plural: 'knots',
    aliases: ['knot', 'knots', 'kt', 'kts'],
    toBase: (v) => v * 0.514444,
    fromBase: (v) => v / 0.514444,
  },
  fps: {
    symbol: 'ft/s',
    name: 'foot per second',
    plural: 'feet per second',
    aliases: ['ft/s', 'fps', 'foot per second', 'feet per second'],
    toBase: (v) => v * 0.3048,
    fromBase: (v) => v / 0.3048,
  },
};

const timeUnits: Record<string, UnitDefinition> = {
  ms: {
    symbol: 'ms',
    name: 'millisecond',
    plural: 'milliseconds',
    aliases: ['ms', 'millisecond', 'milliseconds'],
    toBase: (v) => v / 1000,
    fromBase: (v) => v * 1000,
  },
  s: {
    symbol: 's',
    name: 'second',
    plural: 'seconds',
    aliases: ['s', 'sec', 'second', 'seconds'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  min: {
    symbol: 'min',
    name: 'minute',
    plural: 'minutes',
    aliases: ['min', 'minute', 'minutes'],
    toBase: (v) => v * 60,
    fromBase: (v) => v / 60,
  },
  h: {
    symbol: 'h',
    name: 'hour',
    plural: 'hours',
    aliases: ['h', 'hr', 'hour', 'hours'],
    toBase: (v) => v * 3600,
    fromBase: (v) => v / 3600,
  },
  day: {
    symbol: 'day',
    name: 'day',
    plural: 'days',
    aliases: ['day', 'days'],
    toBase: (v) => v * 86400,
    fromBase: (v) => v / 86400,
  },
  week: {
    symbol: 'week',
    name: 'week',
    plural: 'weeks',
    aliases: ['week', 'weeks'],
    toBase: (v) => v * 604800,
    fromBase: (v) => v / 604800,
  },
  month: {
    symbol: 'month',
    name: 'month',
    plural: 'months',
    aliases: ['month', 'months'],
    toBase: (v) => v * 2628000,
    fromBase: (v) => v / 2628000,
  },
  year: {
    symbol: 'year',
    name: 'year',
    plural: 'years',
    aliases: ['year', 'years', 'yr'],
    toBase: (v) => v * 31536000,
    fromBase: (v) => v / 31536000,
  },
};

const energyUnits: Record<string, UnitDefinition> = {
  j: {
    symbol: 'J',
    name: 'joule',
    plural: 'joules',
    aliases: ['j', 'joule', 'joules'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  kj: {
    symbol: 'kJ',
    name: 'kilojoule',
    plural: 'kilojoules',
    aliases: ['kj', 'kilojoule', 'kilojoules'],
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
  },
  cal: {
    symbol: 'cal',
    name: 'calorie',
    plural: 'calories',
    aliases: ['cal', 'calorie', 'calories'],
    toBase: (v) => v * 4.184,
    fromBase: (v) => v / 4.184,
  },
  kcal: {
    symbol: 'kcal',
    name: 'kilocalorie',
    plural: 'kilocalories',
    aliases: ['kcal', 'kilocalorie', 'kilocalories', 'calorie', 'calories'],
    toBase: (v) => v * 4184,
    fromBase: (v) => v / 4184,
  },
  wh: {
    symbol: 'Wh',
    name: 'watt-hour',
    plural: 'watt-hours',
    aliases: ['wh', 'watt hour', 'watt hours', 'watt-hour', 'watt-hours'],
    toBase: (v) => v * 3600,
    fromBase: (v) => v / 3600,
  },
  kwh: {
    symbol: 'kWh',
    name: 'kilowatt-hour',
    plural: 'kilowatt-hours',
    aliases: ['kwh', 'kilowatt hour', 'kilowatt hours', 'kilowatt-hour', 'kilowatt-hours'],
    toBase: (v) => v * 3600000,
    fromBase: (v) => v / 3600000,
  },
  btu: {
    symbol: 'BTU',
    name: 'british thermal unit',
    plural: 'british thermal units',
    aliases: ['btu', 'british thermal unit', 'british thermal units'],
    toBase: (v) => v * 1055.06,
    fromBase: (v) => v / 1055.06,
  },
};

const powerUnits: Record<string, UnitDefinition> = {
  w: {
    symbol: 'W',
    name: 'watt',
    plural: 'watts',
    aliases: ['w', 'watt', 'watts'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  kw: {
    symbol: 'kW',
    name: 'kilowatt',
    plural: 'kilowatts',
    aliases: ['kw', 'kilowatt', 'kilowatts'],
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
  },
  mw: {
    symbol: 'MW',
    name: 'megawatt',
    plural: 'megawatts',
    aliases: ['mw', 'megawatt', 'megawatts'],
    toBase: (v) => v * 1000000,
    fromBase: (v) => v / 1000000,
  },
  hp: {
    symbol: 'hp',
    name: 'horsepower',
    plural: 'horsepower',
    aliases: ['hp', 'horsepower'],
    toBase: (v) => v * 745.7,
    fromBase: (v) => v / 745.7,
  },
};

const pressureUnits: Record<string, UnitDefinition> = {
  pa: {
    symbol: 'Pa',
    name: 'pascal',
    plural: 'pascals',
    aliases: ['pa', 'pascal', 'pascals'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  kpa: {
    symbol: 'kPa',
    name: 'kilopascal',
    plural: 'kilopascals',
    aliases: ['kpa', 'kilopascal', 'kilopascals'],
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
  },
  bar: {
    symbol: 'bar',
    name: 'bar',
    plural: 'bars',
    aliases: ['bar', 'bars'],
    toBase: (v) => v * 100000,
    fromBase: (v) => v / 100000,
  },
  atm: {
    symbol: 'atm',
    name: 'atmosphere',
    plural: 'atmospheres',
    aliases: ['atm', 'atmosphere', 'atmospheres'],
    toBase: (v) => v * 101325,
    fromBase: (v) => v / 101325,
  },
  psi: {
    symbol: 'psi',
    name: 'pound per square inch',
    plural: 'pounds per square inch',
    aliases: ['psi', 'pound per square inch', 'pounds per square inch'],
    toBase: (v) => v * 6894.76,
    fromBase: (v) => v / 6894.76,
  },
  mmhg: {
    symbol: 'mmHg',
    name: 'millimeter of mercury',
    plural: 'millimeters of mercury',
    aliases: ['mmhg', 'millimeter of mercury', 'millimeters of mercury'],
    toBase: (v) => v * 133.322,
    fromBase: (v) => v / 133.322,
  },
};

const dataUnits: Record<string, UnitDefinition> = {
  bit: {
    symbol: 'bit',
    name: 'bit',
    plural: 'bits',
    aliases: ['bit', 'bits'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  byte: {
    symbol: 'B',
    name: 'byte',
    plural: 'bytes',
    aliases: ['b', 'byte', 'bytes'],
    toBase: (v) => v * 8,
    fromBase: (v) => v / 8,
  },
  kb: {
    symbol: 'KB',
    name: 'kilobyte',
    plural: 'kilobytes',
    aliases: ['kb', 'kilobyte', 'kilobytes'],
    toBase: (v) => v * 8000,
    fromBase: (v) => v / 8000,
  },
  mb: {
    symbol: 'MB',
    name: 'megabyte',
    plural: 'megabytes',
    aliases: ['mb', 'megabyte', 'megabytes'],
    toBase: (v) => v * 8000000,
    fromBase: (v) => v / 8000000,
  },
  gb: {
    symbol: 'GB',
    name: 'gigabyte',
    plural: 'gigabytes',
    aliases: ['gb', 'gigabyte', 'gigabytes'],
    toBase: (v) => v * 8000000000,
    fromBase: (v) => v / 8000000000,
  },
  tb: {
    symbol: 'TB',
    name: 'terabyte',
    plural: 'terabytes',
    aliases: ['tb', 'terabyte', 'terabytes'],
    toBase: (v) => v * 8000000000000,
    fromBase: (v) => v / 8000000000000,
  },
  pb: {
    symbol: 'PB',
    name: 'petabyte',
    plural: 'petabytes',
    aliases: ['pb', 'petabyte', 'petabytes'],
    toBase: (v) => v * 8000000000000000,
    fromBase: (v) => v / 8000000000000000,
  },
};

const fuelEconomyUnits: Record<string, UnitDefinition> = {
  mpg: {
    symbol: 'mpg',
    name: 'mile per gallon',
    plural: 'miles per gallon',
    aliases: ['mpg', 'mile per gallon', 'miles per gallon'],
    toBase: (v) => 235.215 / v,
    fromBase: (v) => 235.215 / v,
  },
  kml: {
    symbol: 'km/L',
    name: 'kilometer per liter',
    plural: 'kilometers per liter',
    aliases: ['km/l', 'kml', 'kilometer per liter', 'kilometers per liter'],
    toBase: (v) => 100 / v,
    fromBase: (v) => 100 / v,
  },
  l100km: {
    symbol: 'L/100km',
    name: 'liter per 100 kilometers',
    plural: 'liters per 100 kilometers',
    aliases: ['l/100km', 'l100km', 'liter per 100 kilometers', 'liters per 100 kilometers'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
};

const angleUnits: Record<string, UnitDefinition> = {
  deg: {
    symbol: '°',
    name: 'degree',
    plural: 'degrees',
    aliases: ['deg', 'degree', 'degrees', '°'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  rad: {
    symbol: 'rad',
    name: 'radian',
    plural: 'radians',
    aliases: ['rad', 'radian', 'radians'],
    toBase: (v) => v * 180 / Math.PI,
    fromBase: (v) => v * Math.PI / 180,
  },
  grad: {
    symbol: 'grad',
    name: 'gradian',
    plural: 'gradians',
    aliases: ['grad', 'gradian', 'gradians'],
    toBase: (v) => v * 0.9,
    fromBase: (v) => v / 0.9,
  },
};

const frequencyUnits: Record<string, UnitDefinition> = {
  hz: {
    symbol: 'Hz',
    name: 'hertz',
    plural: 'hertz',
    aliases: ['hz', 'hertz'],
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  khz: {
    symbol: 'kHz',
    name: 'kilohertz',
    plural: 'kilohertz',
    aliases: ['khz', 'kilohertz'],
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
  },
  mhz: {
    symbol: 'MHz',
    name: 'megahertz',
    plural: 'megahertz',
    aliases: ['mhz', 'megahertz'],
    toBase: (v) => v * 1000000,
    fromBase: (v) => v / 1000000,
  },
  ghz: {
    symbol: 'GHz',
    name: 'gigahertz',
    plural: 'gigahertz',
    aliases: ['ghz', 'gigahertz'],
    toBase: (v) => v * 1000000000,
    fromBase: (v) => v / 1000000000,
  },
};

export const conversionCategories: ConversionCategoryInfo[] = [
  { id: 'length', label: 'Length', units: lengthUnits },
  { id: 'weight', label: 'Weight & Mass', units: weightUnits },
  { id: 'temperature', label: 'Temperature', units: temperatureUnits },
  { id: 'volume', label: 'Volume', units: volumeUnits },
  { id: 'area', label: 'Area', units: areaUnits },
  { id: 'speed', label: 'Speed', units: speedUnits },
  { id: 'time', label: 'Time', units: timeUnits },
  { id: 'energy', label: 'Energy', units: energyUnits },
  { id: 'power', label: 'Power', units: powerUnits },
  { id: 'pressure', label: 'Pressure', units: pressureUnits },
  { id: 'data', label: 'Data Storage', units: dataUnits },
  { id: 'fuel_economy', label: 'Fuel Economy', units: fuelEconomyUnits },
  { id: 'angle', label: 'Angle', units: angleUnits },
  { id: 'frequency', label: 'Frequency', units: frequencyUnits },
];

export function getAllUnits(): Map<string, { unit: UnitDefinition; category: ConversionCategory }> {
  const allUnits = new Map<string, { unit: UnitDefinition; category: ConversionCategory }>();

  conversionCategories.forEach(category => {
    Object.values(category.units).forEach(unit => {
      unit.aliases.forEach(alias => {
        allUnits.set(alias.toLowerCase(), { unit, category: category.id });
      });
    });
  });

  return allUnits;
}

export function convert(
  value: number,
  fromUnit: string,
  toUnit: string,
  category: ConversionCategory
): number | null {
  const categoryInfo = conversionCategories.find(c => c.id === category);
  if (!categoryInfo) return null;

  const fromUnitDef = Object.values(categoryInfo.units).find(u =>
    u.aliases.some(a => a.toLowerCase() === fromUnit.toLowerCase())
  );
  const toUnitDef = Object.values(categoryInfo.units).find(u =>
    u.aliases.some(a => a.toLowerCase() === toUnit.toLowerCase())
  );

  if (!fromUnitDef || !toUnitDef) return null;

  const baseValue = fromUnitDef.toBase(value);
  const result = toUnitDef.fromBase(baseValue);

  return result;
}

export function getConversionFormula(
  fromUnit: string,
  toUnit: string,
  category: ConversionCategory
): string {
  const categoryInfo = conversionCategories.find(c => c.id === category);
  if (!categoryInfo) return '';

  const fromUnitDef = Object.values(categoryInfo.units).find(u =>
    u.aliases.some(a => a.toLowerCase() === fromUnit.toLowerCase())
  );
  const toUnitDef = Object.values(categoryInfo.units).find(u =>
    u.aliases.some(a => a.toLowerCase() === toUnit.toLowerCase())
  );

  if (!fromUnitDef || !toUnitDef) return '';

  if (category === 'temperature') {
    if (fromUnit.toLowerCase().includes('c') && toUnit.toLowerCase().includes('f')) {
      return 'multiply the temperature value by 9/5 and add 32';
    } else if (fromUnit.toLowerCase().includes('f') && toUnit.toLowerCase().includes('c')) {
      return 'subtract 32 from the temperature value and multiply by 5/9';
    } else if (fromUnit.toLowerCase().includes('c') && toUnit.toLowerCase().includes('k')) {
      return 'add 273.15 to the temperature value';
    } else if (fromUnit.toLowerCase().includes('k') && toUnit.toLowerCase().includes('c')) {
      return 'subtract 273.15 from the temperature value';
    } else if (fromUnit.toLowerCase().includes('f') && toUnit.toLowerCase().includes('k')) {
      return 'subtract 32 from the temperature value, multiply by 5/9, and add 273.15';
    } else if (fromUnit.toLowerCase().includes('k') && toUnit.toLowerCase().includes('f')) {
      return 'subtract 273.15 from the temperature value, multiply by 9/5, and add 32';
    }
  }

  const testValue = 1;
  const baseValue = fromUnitDef.toBase(testValue);
  const factor = toUnitDef.fromBase(baseValue);

  if (Math.abs(factor - 1) < 0.0001) {
    return 'the values are equal';
  } else if (factor > 1) {
    return `multiply the ${fromUnitDef.name} value by ${factor.toPrecision(6)}`;
  } else {
    return `divide the ${fromUnitDef.name} value by ${(1 / factor).toPrecision(6)}`;
  }
}
