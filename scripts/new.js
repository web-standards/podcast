import fs from 'node:fs';
import path from 'node:path';

function episodeLinkString(episode) {
	return `[${episode}]: src/episodes/${episode}/index.md`;
}

function generateNewTable(episode) {
	const startNumber = Math.floor(episode / 100) * 100 + 100;
	let table = '';
	for (let i = 0; i < 10; i++) {
		for (let j = 0; j < 10; j++) {
			table += `| ${startNumber - i * 10 - j}     `;
		}
		table += '|\n';
	}
	return `<details open>
	<summary>№${startNumber}–${startNumber - 99}</summary>

| №       |         |         |         |         |         |         |         |         |         |
| ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- |
${table}
</details>`;
}

function getNextMonday() {
	const monday = new Date();
	monday.setDate(monday.getDate() + ((1 + 7 - monday.getDay()) % 7));
	monday.setUTCHours(9);
	monday.setMinutes(0);
	monday.setSeconds(0);
	monday.setMilliseconds(0);
	return monday.toISOString().slice(0, 16);
}

const readmePath = 'README.md';
const templateMdPath = path.join('src', 'templates', 'index.md');
const templateYmlPath = path.join('src', 'templates', 'index.yml');

if (!fs.existsSync(templateMdPath)) {
	console.error(`Файл не найден: ${templateMdPath}`);
	process.exit(1);
}

if (!fs.existsSync(templateYmlPath)) {
	console.error(`Файл не найден: ${templateYmlPath}`);
	process.exit(1);
}

let readmeContent = fs.readFileSync(readmePath, 'utf-8');
const prevEpisode = Number(
	readmeContent.match(/\[(\d+)\]: src\/episodes\/(\d+)\/index.md/)[1]
);

if (!prevEpisode) {
	console.error('Не получилось достать номер прошлого эпизода из README.md.');
	process.exit(1);
}

const episode = prevEpisode + 1;
const episodeDir = path.join('src', 'episodes', String(episode));
const episodeMdPath = path.join(episodeDir, 'index.md');
const episodeYmlPath = path.join(episodeDir, 'index.yml');

if (!readmeContent.includes(`| ${episode}     |`)) {
	readmeContent = readmeContent.replace(
		'<details open>',
		`${generateNewTable(episode)}

<details>`
	);
}

readmeContent = readmeContent
	.replace(
		episodeLinkString(episode - 1),
		`${episodeLinkString(episode)}\n${episodeLinkString(episode - 1)}`
	)
	.replace(`| ${episode}     |`, `| [${episode}][] |`);

fs.writeFileSync(readmePath, readmeContent);
console.log(`Обновлён: ${readmePath}`);

fs.mkdirSync(episodeDir, { recursive: true });

const templateMdContent = fs.readFileSync(templateMdPath, 'utf-8');
fs.writeFileSync(episodeMdPath, templateMdContent);
console.log(`Создан: ${episodeMdPath}`);

const templateYmlContent = fs.readFileSync(templateYmlPath, 'utf-8');
const episodeYmlContent = templateYmlContent.replace(
	'date: 3000-01-01T09:00',
	`date: ${getNextMonday()}`
);
fs.writeFileSync(episodeYmlPath, episodeYmlContent);
console.log(`Создан: ${episodeYmlPath}`);

console.info(`
Теперь заполни:
- ${episodeYmlPath}
- ${episodeMdPath}
`);
