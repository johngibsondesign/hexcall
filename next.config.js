/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	webpack: (config) => {
		config.externals = config.externals || [];
		config.externals.push({ electron: 'commonjs2 electron' });
		return config;
	},
};

module.exports = nextConfig;


