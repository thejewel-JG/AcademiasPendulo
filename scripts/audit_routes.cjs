const fs = require('fs');

const content = fs.readFileSync('server.js', 'utf-8');
const lines = content.split('\n');

console.log('--- ALL API ROUTES IN SERVER.JS ---');
lines.forEach((line, i) => {
  const match = line.match(/app\.(get|post|put|delete|patch|use)\s*\(\s*['"]([^'"]+)['"]/);
  if (match) {
    console.log(`${(i + 1).toString().padStart(4, ' ')}: [${match[1].toUpperCase().padEnd(6, ' ')}] ${match[2]}`);
  }
});

console.log('\n--- SCANNING SQL INTERPOLATIONS IN SERVER.JS ---');
let inQuery = false;
let queryStart = 0;
let queryText = '';

lines.forEach((line, i) => {
  if (line.includes('query(') || line.includes('query(`')) {
    inQuery = true;
    queryStart = i + 1;
    queryText = '';
  }
  if (inQuery) {
    queryText += line + '\n';
    if (line.includes(');')) {
      inQuery = false;
      // Search for ${...} inside queryText
      const interpolations = queryText.match(/\$\{([^}]+)\}/g);
      if (interpolations) {
        console.log(`Line ${queryStart}: SQL interpolation found -> ${interpolations.join(', ')}`);
      }
    }
  }
});
