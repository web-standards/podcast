const feedConfigs = [
	{ permalink: 'index.xml', limit: null },
	{ permalink: 'latest.xml', limit: 25 },
];

export default {
	data: {
		pagination: {
			data: 'feedConfigs',
			size: 1,
			alias: 'feedConfig',
		},
		feedConfigs,
		permalink: data => data.feedConfig.permalink,
	},

	async getEpisodes(data, limit) {
		let episodes = data.collections.episode;

		if (limit) {
			episodes = episodes.slice(-limit);
		}

		const result = await Promise.all(episodes.map(
			async episode => {
				const hosts = episode.data.hosts.join(', ');
				const guests = episode.data.guests ? episode.data.guests.join(', ') : null;
				return `
					<item>
						<title>${episode.fileSlug}. ${episode.data.title}</title>
						<link>${data.meta.url}${episode.fileSlug}/</link>
						<pubDate>${episode.date.toUTCString()}</pubDate>
						<description><![CDATA[<p>Простой способ сказать нам «спасибо» и попасть в закрытый чат:</p><p>• <a href="https://boosty.to/webstandards_ru">Бусти</a><br>• <a href="https://www.patreon.com/webstandards_ru">Патреон</a></p><p>Ведущие: ${hosts}</p>${guests ? `<p>Гости: ${guests}</p>` : ''}${
							episode.data.chapters ? `<p>Темы</p><p>${
								episode.data.chapters
									.map(chapter => `${chapter.time} ${chapter.title}<br>`)
									.join('')
							}</p>` : ''
						}${
							await this.htmlmin(episode.content)
						}]]></description>
						<guid isPermaLink="true">${data.meta.url}episodes/${episode.fileSlug}.mp3</guid>
						<enclosure
							type="audio/mpeg"
							url="${data.meta.url}episodes/${episode.fileSlug}.mp3"
							length="${this.length(`src/mp3/${episode.fileSlug}.mp3`)}"
						/>
						<itunes:episode>${episode.fileSlug}</itunes:episode>
						<itunes:duration>${this.duration(episode.data.duration)}</itunes:duration>
						<itunes:author>${hosts}</itunes:author>
						<itunes:explicit>${data.meta.explicit}</itunes:explicit>
						<itunes:summary>${
							episode.date.toLocaleString('ru', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
							}).replace(' г.', '')
						}: ${
							episode.data.title
						}. ${
							hosts
						}</itunes:summary>
						<itunes:image href="${data.meta.url}cover.png"/>
					</item>
				`;
			}
		));

		return result.join('');
	},

	async render(data) {
		const limit = data.feedConfig.limit;

		return `
			<?xml version="1.0" encoding="utf-8"?>
			<rss
				version="2.0"
				xmlns:atom="http://www.w3.org/2005/Atom"
				xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
				xmlns:content="http://purl.org/rss/1.0/modules/content/"
			>
				<channel>
					<title>${data.meta.title}</title>
					<description><![CDATA[${
						this.markdown(data.meta.description)
					}]]></description>
					<copyright>${data.meta.copyright}</copyright>
					<language>${data.meta.language}</language>
					<link>${data.meta.url}</link>

					<atom:link href="${data.meta.url}feed/" rel="self" type="application/rss+xml"/>

					<itunes:subtitle>${data.meta.subtitle}</itunes:subtitle>
					<itunes:type>${data.meta.type}</itunes:type>
					<itunes:author>${data.meta.author}</itunes:author>
					<itunes:explicit>${data.meta.explicit}</itunes:explicit>
					<itunes:owner>
						<itunes:name>${data.meta.owner.name}</itunes:name>
						<itunes:email>${data.meta.owner.email}</itunes:email>
					</itunes:owner>
					<itunes:image href="${data.meta.url}cover.png"/>

					${
						data.meta.categories
							.map(category => `<itunes:category text="${category.title}">${
								category.items ? category.items.map(
									category => `<itunes:category text="${category}"/>`
								).join('') : ''
							}</itunes:category>`)
							.join('')
					}

					${await this.getEpisodes(data, limit)}
				</channel>
			</rss>
		`;
	},
};
