import { normalizeNickname } from '../js/shared/profile-service.js';

const vectors = new Map([
  ['ÁrvízTűrő', 'arvizturo'],
  [' Zoo_42 ', 'zoo_42'],
  ['St Zoo!', 'stzoo'],
  ['Çañón', 'canon'],
  ['Über_Café', 'uber_cafe'],
  ['MOD_HU', 'mod_hu'],
]);

const failures = [];
for (const [input, expected] of vectors) {
  const actual = normalizeNickname(input);
  if (actual !== expected) failures.push(`${JSON.stringify(input)}: expected ${expected}, got ${actual}`);
}

if (failures.length) {
  console.error('Nickname normalization validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Nickname normalization parity OK: ${vectors.size} vector(s).`);
