import fs from 'fs';
import path from 'path';

const filePath = path.resolve('./src/data/coursesData.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Parse and replace per course block
// A course block starts with { and has code: "..."
const courseRegex = /{\s*id:\s*"([^"]+)",\s*code:\s*"([^"]+)"[\s\S]*?targetAudience:[^\n]+/g;

let patchedCount = 0;
content = content.replace(courseRegex, (match, id, code) => {
  patchedCount++;
  const c = code.toUpperCase();
  if (c === 'TMVG0109') {
    return match
      .replace(/totalHours:\s*\d+/, 'totalHours: 380')
      .replace(/practiceHours:\s*\d+/, 'practiceHours: 80');
  } else if (c === 'TMVG0209') {
    return match
      .replace(/totalHours:\s*\d+/, 'totalHours: 520')
      .replace(/practiceHours:\s*\d+/, 'practiceHours: 80');
  } else {
    return match
      .replace(/totalHours:\s*\d+/, 'totalHours: 0')
      .replace(/practiceHours:\s*\d+/, 'practiceHours: 0');
  }
});

fs.writeFileSync(filePath, content, 'utf-8');
console.log(`✅ ${patchedCount} cursos actualizados en src/data/coursesData.ts`);
