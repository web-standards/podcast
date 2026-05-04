import fs from 'node:fs';
import path from 'node:path';

const episode = process.argv[2];

if (!episode) {
	console.error('Укажи номер эпизода: npm run length N');
	process.exit(1);
}

const ymlPath = path.join('src', 'episodes', episode, 'index.yml');
const mp3Path = path.join('src', 'mp3', `${episode}.mp3`);

if (!fs.existsSync(ymlPath)) {
	console.error(`Файл не найден: ${ymlPath}`);
	process.exit(1);
}

if (!fs.existsSync(mp3Path)) {
	console.error(`Файл не найден: ${mp3Path}`);
	process.exit(1);
}

const length = fs.statSync(mp3Path).size;
const ymlContent = fs.readFileSync(ymlPath, 'utf-8');
const lengthRegex = /^length:.*$/m;

let updatedContent;
if (lengthRegex.test(ymlContent)) {
	updatedContent = ymlContent.replace(lengthRegex, `length: ${length}`);
} else {
	updatedContent = ymlContent.replace(/\n*$/, '') + `\nlength: ${length}\n`;
}

fs.writeFileSync(ymlPath, updatedContent, 'utf-8');

console.log(`✓ Размер обновлён: ${length}\n`);
console.log(ymlPath);
