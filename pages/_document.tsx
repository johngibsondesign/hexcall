import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
	return (
		<Html className="dark">
			<Head>
				<meta httpEquiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: file:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://ddragon.leagueoflegends.com https://raw.communitydragon.org https://metered-ca.global.ssl.fastly.net; img-src 'self' data: file: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" />
			</Head>
			<body className="bg-neutral-950 text-neutral-100">
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}


