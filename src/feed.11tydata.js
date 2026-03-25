const feedConfigs = [
	{ permalink: 'index.xml', limit: 0 },
	{ permalink: 'latest.xml', limit: 25 },
];

export default {
	pagination: {
		data: 'feedConfigs',
		size: 1,
		alias: 'feedConfig',
	},
	feedConfigs,
	permalink: data => data.feedConfig.permalink,
};
