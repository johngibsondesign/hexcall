/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	// Only use export mode for production builds
	...(process.env.NODE_ENV === 'production' && {
		output: 'export',
		assetPrefix: './',
		trailingSlash: true,
		images: {
			unoptimized: true,
		},
	}),
	// Disable caching in development to prevent file lock issues
	...(process.env.NODE_ENV === 'development' && {
		experimental: {
			serverComponentsExternalPackages: [],
		},
	}),
	webpack: (config) => {
		config.externals = config.externals || [];
		config.externals.push({ electron: 'commonjs2 electron' });
		// Disable caching in development
		if (process.env.NODE_ENV === 'development') {
			config.cache = false;
		}
		return config;
	},
};

module.exports = nextConfig;


