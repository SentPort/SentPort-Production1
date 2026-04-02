import { extractQueryWords, fuzzyMatchText, generateFuzzySearchTerms } from './src/lib/queryPreprocessing.ts';

console.log('=== Testing Fuzzy Search Implementation ===\n');

const testQuery = 'who is adma smith';
console.log(`Test query: "${testQuery}"\n`);

console.log('1. Extract query words:');
const words = extractQueryWords(testQuery);
console.log('   Words:', words);

console.log('\n2. Generate fuzzy search terms:');
const searchTerms = generateFuzzySearchTerms(testQuery);
console.log('   Terms:', searchTerms);

console.log('\n3. Test fuzzy matching with sample titles:');
const sampleTitles = [
  'Adam Smith - Wikipedia',
  'Adam Smith Economist',
  'The Life of Adam Smith',
  'John Adams Biography',
  'Random Article'
];

sampleTitles.forEach(title => {
  const score = fuzzyMatchText(testQuery, title, 0.6);
  console.log(`   "${title}": ${score.toFixed(3)}`);
});

console.log('\n4. Test with exact match:');
const exactScore = fuzzyMatchText('adam smith', 'Adam Smith - Wikipedia', 0.6);
console.log(`   "Adam Smith - Wikipedia": ${exactScore.toFixed(3)}`);

console.log('\n5. Test URL matching:');
const urlScore = fuzzyMatchText('adma smith', 'wikipedia.org/wiki/Adam_Smith', 0.6);
console.log(`   "wikipedia.org/wiki/Adam_Smith": ${urlScore.toFixed(3)}`);

console.log('\n=== Test Complete ===');
