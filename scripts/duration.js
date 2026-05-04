import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const episode = process.argv[2];

if (!episode) {
	console.error('Укажи номер эпизода: npm run duration N');
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

function getDurationSeconds() {
	const result = execSync(
		`ffprobe -v quiet -print_format json -show_format "${mp3Path}"`,
		{ encoding: 'utf-8' }
	);
	const info = JSON.parse(result);
	return Math.round(parseFloat(info.format.duration));
}

function formatDuration(totalSeconds) {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (n) => String(n).padStart(2, '0');
	return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const duration = formatDuration(getDurationSeconds());
const ymlContent = fs.readFileSync(ymlPath, 'utf-8');
const durationRegex = /^duration:.*$/m;

let updatedContent;
if (durationRegex.test(ymlContent)) {
	updatedContent = ymlContent.replace(durationRegex, `duration: ${duration}`);
} else {
	updatedContent = ymlContent.replace(/\n*$/, '') + `\n\nduration: ${duration}\n`;
}

fs.writeFileSync(ymlPath, updatedContent, 'utf-8');

console.log(`✓ Длительность обновлена: ${duration}\n`);
console.log(ymlPath);
