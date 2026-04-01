import { parseConversionQuery, containsConversionQuery } from './src/lib/unitConversionParser.ts';

const testQueries = [
  '2mm to inches',
  'convert 5 pounds to kilograms',
  'how many meters in 10 feet',
  'twenty five kilometers to miles',
  '100 celsius to fahrenheit',
  'five kilograms in pounds',
  '2 millimeters in inches',
  '50 mph to kmh',
  '1 gallon to liters',
  '100 degrees to radians',
];

console.log('Testing Unit Conversion Parser\n');
console.log('='.repeat(50));

testQueries.forEach(query => {
  console.log(`\nQuery: "${query}"`);
  const contains = containsConversionQuery(query);
  console.log(`Contains conversion: ${contains}`);

  if (contains) {
    const parsed = parseConversionQuery(query);
    if (parsed) {
      console.log(`Parsed:`, {
        value: parsed.value,
        fromUnit: parsed.fromUnit,
        toUnit: parsed.toUnit,
        category: parsed.category
      });
    } else {
      console.log('Failed to parse conversion');
    }
  }
  console.log('-'.repeat(50));
});
