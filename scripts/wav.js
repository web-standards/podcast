import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function runCommandSync(bin, args) {
	return execFileSync(bin, args, {
		encoding: 'utf-8',
	});
}

function buildMp3(episodeNumber, inputFolder, outputFolder) {
	return runCommandSync('ffmpeg', [
		'-i', path.join(inputFolder, `${episodeNumber}.wav`),
		'-nostats',
		'-loglevel', '0',
		'-hide_banner',
		'-codec:a', 'libmp3lame',
		'-b:a', '128k',
		path.join(outputFolder, `${episodeNumber}.mp3`),
	]);
}

function buildChapters(inputFile) {
	return runCommandSync('ffprobe', [
		'-i', inputFile,
		'-loglevel', '0',
		'-hide_banner',
		'-print_format', 'json',
		'-show_chapters',
		'-pretty',
	]);
}

function parseTime(str) {
	return `0${str}`.split('.')[0];
}

function formatChapters(chapters) {
	return chapters.map(chapter => {
		const startTime = parseTime(chapter.start_time);
		const title = chapter.tags.title;
		return `${startTime} ${title}`;
	}).join('\n');
}

function generateIndexFromTemplate(templatePath, episode, chapters) {
	const template = fs.readFileSync(templatePath, 'utf-8');
	const chaptersText = formatChapters(chapters);

	return template
		.replace(/\bN\b/g, episode)
		.replace(/^CHAPTERS$/m, chaptersText);
}

function writeIndexFile(templatePath, episode, chapters, outputPath) {
	const content = generateIndexFromTemplate(templatePath, episode, chapters);
	fs.writeFileSync(outputPath, content);
}

const episode = process.argv[2];

if (!episode) {
	console.error('Укажи номер эпизода: npm run wav N');
	process.exit(1);
}

const wavPath = path.join('src', 'wav', `${episode}.wav`);
const templatePath = path.join('src', 'templates', 'index.txt');
const mp3Dir = path.join('src', 'mp3');
const mp3Path = path.join(mp3Dir, `${episode}.mp3`);
const episodeDir = path.join('src', 'episodes', episode);
const indexPath = path.join(episodeDir, 'index.txt');

if (!fs.existsSync(wavPath)) {
	console.error(`Файл не найден: ${wavPath}`);
	process.exit(1);
}

if (!fs.existsSync(templatePath)) {
	console.error(`Файл не найден: ${templatePath}`);
	process.exit(1);
}

fs.mkdirSync(mp3Dir, { recursive: true });

buildMp3(episode, path.join('src', 'wav'), mp3Dir);
console.log(`Создан: ${mp3Path}`);

const json = buildChapters(mp3Path);
const parsedJson = JSON.parse(json);

if (!parsedJson.chapters) {
	console.error('В файле нет глав');
	process.exit(1);
}

fs.mkdirSync(episodeDir, { recursive: true });

writeIndexFile(templatePath, episode, parsedJson.chapters, indexPath);
console.log(`Создан: ${indexPath}`);
