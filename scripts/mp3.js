import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';
import NodeID3 from 'node-id3';

const episode = process.argv[2];

if (!episode) {
	console.error('Укажи номер эпизода: node scripts/update-tags.js 505');
	process.exit(1);
}

const ymlPath = path.join('src', 'episodes', episode, 'index.yml');
const mp3Path = path.join('src', 'mp3', `${episode}.mp3`);
const coverPath = path.join('src', 'cover.png');

if (!fs.existsSync(ymlPath)) {
	console.error(`Файл не найден: ${ymlPath}`);
	process.exit(1);
}

if (!fs.existsSync(mp3Path)) {
	console.error(`Файл не найден: ${mp3Path}`);
	process.exit(1);
}

const ymlContent = fs.readFileSync(ymlPath, 'utf-8');
const data = yaml.load(ymlContent);

const title = `${episode}. ${data.title}`;
const album = 'Веб-стандарты';
const artist = 'Веб-стандарты';
const hosts = data.hosts.map((h) => `— ${h}`).join('\n');

function timeToMs(time) {
	const parts = time.split(':').map(Number);
	if (parts.length === 3) {
		return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
	}
	return (parts[0] * 60 + parts[1]) * 1000;
}

function getDurationMs() {
	const result = execSync(
		`ffprobe -v quiet -print_format json -show_format "${mp3Path}"`,
		{ encoding: 'utf-8' }
	);
	const info = JSON.parse(result);
	return Math.floor(parseFloat(info.format.duration) * 1000);
}

const durationMs = getDurationMs();

const chapters = data.chapters.map((ch, i, arr) => {
	const startTimeMs = timeToMs(ch.time);
	const endTimeMs = arr[i + 1] ? timeToMs(arr[i + 1].time) : durationMs;
	return {
		elementID: `ch${i}`,
		startTimeMs,
		endTimeMs,
		tags: {
			title: ch.title,
		},
	};
});

const tags = {
	title,
	artist,
	album,
	comment: {
		language: 'eng',
		text: hosts,
	},
	unsynchronisedLyrics: {
		language: 'eng',
		text: hosts,
	},
	chapter: chapters,
	tableOfContents: [
		{
			elementID: 'toc',
			isOrdered: true,
			elements: chapters.map((ch) => ch.elementID),
		},
	],
};

if (fs.existsSync(coverPath)) {
	tags.image = {
		mime: 'image/png',
		type: { id: 3, name: 'front cover' },
		description: '',
		imageBuffer: fs.readFileSync(coverPath),
	};
}

const success = NodeID3.write(tags, mp3Path);

if (success === true) {
	console.log(`Теги обновлены: ${mp3Path}`);
} else {
	console.error('Ошибка при записи тегов:', success);
	process.exit(1);
}
