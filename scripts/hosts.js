import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

// Configuration
const EPISODES_DIR = path.join('src', 'episodes');
const SVG_PATH = path.join('src', 'hosts.svg');
const START_YEAR = 2016;
const PX_PER_MONTH = 6;
const LEFT_MARGIN = 208;
const ROW_HEIGHT = 64;
const FIRST_ROW_Y = 80;

// Host name aliases → canonical name
const HOST_ALIASES = {
	'Vadim Makeev': 'Вадим Макеев',
	'Vadim Machiavelli': 'Вадим Макеев',
	'Alessio Simonetti': 'Алексей Симоненко',
	'Olga Alessandrini': 'Ольга Алексашенко',
};

// Fixed color mapping for known hosts (by name)
const HOST_COLORS = {
	'Вадим Макеев': 'red',
	'Алексей Симоненко': 'orange',
	'Ольга Алексашенко': 'yellow',
	'Мария Просвирнина': 'green',
	'Никита Дубко': 'cyan',
	'Андрей Мелихов': 'blue',
	'Юля Миоцен': 'violet',
	'Полина Гуртовая': 'indigo',
};

const FALLBACK_COLORS = [
	'red', 'orange', 'yellow', 'green',
	'cyan', 'blue', 'violet', 'indigo',
];

function canonicalize(name) {
	return HOST_ALIASES[name] || name;
}

function monthsFromEpoch(date) {
	return (date.getFullYear() - START_YEAR) * 12 + date.getMonth();
}

function readEpisodes() {
	const episodes = [];
	const episodeDirs = fs.readdirSync(EPISODES_DIR, { withFileTypes: true });

	for (const entry of episodeDirs) {
		if (!entry.isDirectory()) continue;

		const ymlPath = path.join(EPISODES_DIR, entry.name, 'index.yml');
		if (!fs.existsSync(ymlPath)) continue;

		const content = fs.readFileSync(ymlPath, 'utf-8');
		const data = yaml.load(content);

		if (!data || !data.date || !data.hosts) continue;

		const date = new Date(data.date);
		if (date.getFullYear() > 2900) continue;

		episodes.push({
			number: entry.name,
			date,
			hosts: data.hosts.map(canonicalize),
		});
	}

	episodes.sort((a, b) => a.date - b.date);
	return episodes;
}

function collectHostAppearances(episodes) {
	const appearances = new Map();

	for (const episode of episodes) {
		for (const host of episode.hosts) {
			if (!appearances.has(host)) {
				appearances.set(host, []);
			}
			appearances.get(host).push(episode.date);
		}
	}

	return appearances;
}

function computeHostData(episodes, now) {
	const appearances = collectHostAppearances(episodes);
	const latestEpisodeMonth = monthsFromEpoch(episodes[episodes.length - 1].date);
	const hosts = [];

	for (const [name, dates] of appearances) {
		const firstDate = dates[0];
		const lastDate = dates[dates.length - 1];
		const isCurrent = monthsFromEpoch(lastDate) >= latestEpisodeMonth;

		const startMonth = monthsFromEpoch(firstDate);
		const endMonth = isCurrent ? monthsFromEpoch(now) + 1 : monthsFromEpoch(lastDate);
		const durationMonths = endMonth - startMonth;

		hosts.push({
			name,
			startMonth,
			durationMonths,
			isCurrent,
			totalEpisodes: dates.length,
			firstDate,
			lastDate,
		});
	}

	hosts.sort((a, b) => {
		if (a.startMonth !== b.startMonth) return a.startMonth - b.startMonth;
		return b.totalEpisodes - a.totalEpisodes;
	});

	return hosts;
}

function patchSVG(svgContent, hosts, now) {
	const numHosts = hosts.length;
	const lastFullYear = now.getFullYear();
	const currentMonthX = LEFT_MARGIN + (monthsFromEpoch(now) + 1) * PX_PER_MONTH;
	const lastYearX = LEFT_MARGIN + (lastFullYear - START_YEAR) * 12 * PX_PER_MONTH;
	const width = Math.max(currentMonthX, lastYearX + 12 * PX_PER_MONTH);
	const height = FIRST_ROW_Y + (numHosts - 1) * ROW_HEIGHT + 112;
	const labelsY = height - 48;

	let svg = svgContent;

	// 1. Update viewBox
	svg = svg.replace(
		/viewBox="0 0 \d+ \d+"/,
		`viewBox="0 0 ${width} ${height}"`
	);

	// 2. Update vertical line definition y2
	svg = svg.replace(
		/(id="vertical"[\s\S]*?y2=")(\d+)(")/,
		`$1${height}$3`
	);

	// 3. Update horizontal line definition x2
	svg = svg.replace(
		/(id="horizontal"[\s\S]*?x2=")(\d+)(")/,
		`$1${currentMonthX}$3`
	);

	// 4. Replace vertical <use> lines
	const verticalLines = [];
	for (let y = START_YEAR; y <= lastFullYear; y++) {
		const x = LEFT_MARGIN + (y - START_YEAR) * 12 * PX_PER_MONTH;
		verticalLines.push(`\t<use href="#vertical" x="${x}"/>`);
	}
	svg = svg.replace(
		/\t<use href="#vertical"[^]*?(?=\n\n)/,
		verticalLines.join('\n')
	);

	// 5. Replace horizontal <use> lines
	const horizontalLines = [];
	for (let i = 0; i < numHosts; i++) {
		const y = FIRST_ROW_Y + i * ROW_HEIGHT;
		horizontalLines.push(`\t<use href="#horizontal" y="${y}"/>`);
	}
	svg = svg.replace(
		/\t<use href="#horizontal"[^]*?(?=\n\n)/,
		horizontalLines.join('\n')
	);

	// 6. Replace year labels group
	const yearLabels = [];
	for (let y = START_YEAR; y <= lastFullYear; y++) {
		const x = LEFT_MARGIN + (y - START_YEAR) * 12 * PX_PER_MONTH;
		yearLabels.push(`\t\t<text x="${x}">${y}</text>`);
	}
	svg = svg.replace(
		/\t<g transform="translate\(16 \d+\)">[^]*?<\/g>/,
		`\t<g transform="translate(16 ${labelsY})">\n${yearLabels.join('\n')}\n\t</g>`
	);

	// 7. Replace host groups
	const hostGroups = [];
	for (let i = 0; i < numHosts; i++) {
		const host = hosts[i];
		const y = FIRST_ROW_Y + i * ROW_HEIGHT;
		const color = HOST_COLORS[host.name]
			|| FALLBACK_COLORS[i % FALLBACK_COLORS.length];

		const rectX = LEFT_MARGIN + host.startMonth * PX_PER_MONTH;
		const rectWidth = host.durationMonths * PX_PER_MONTH;
		const countX = rectX + rectWidth - 8;

		hostGroups.push(
			`\t<g transform="translate(0 ${y})">\n` +
			`\t\t<text class="name" x="192">\n` +
			`\t\t\t${host.name}\n` +
			`\t\t</text>\n` +
			`\t\t<rect class="path" style="fill: var(--color-${color})" x="${rectX}" width="${rectWidth}"/>\n` +
			`\t\t<text x="${countX}" y="6" text-anchor="end">\n` +
			`\t\t\t${host.totalEpisodes}\n` +
			`\t\t</text>\n` +
			`\t</g>`
		);
	}

	const startMarker = '<!-- hosts -->';
	const endMarker = '<!-- / hosts -->';
	const startIndex = svg.indexOf(startMarker);
	const endIndex = svg.indexOf(endMarker);
	svg = svg.slice(0, startIndex + startMarker.length) +
		'\n' + hostGroups.join('\n') + '\n\t' +
		svg.slice(endIndex);

	return svg;
}

// Main
const now = new Date();
const episodes = readEpisodes();
const hosts = computeHostData(episodes, now);

const dateFormat = new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric' });

function formatDate(date) {
	const parts = dateFormat.formatToParts(date);
	const month = parts.find(p => p.type === 'month').value;
	const year = parts.find(p => p.type === 'year').value;
	return `${month} ${year}`;
}

console.log('Hosting periods computed from episode data:\n');

for (const host of hosts) {
	const start = formatDate(host.firstDate);
	const end = host.isCurrent ? 'до сих пор' : formatDate(host.lastDate);
	console.log(`  ${host.name}: ${start} → ${end} (${host.totalEpisodes})`);
}

const svgContent = fs.readFileSync(SVG_PATH, 'utf-8');
const patched = patchSVG(svgContent, hosts, now);
fs.writeFileSync(SVG_PATH, patched);

console.log(`\n✓ Updated ${SVG_PATH}`);
