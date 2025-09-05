import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
	return (
		<Html className="dark">
			<Head>
				<meta httpEquiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: file:; img-src 'self' data: file: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" />
			</Head>
			<body className="bg-neutral-950 text-neutral-100">
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}


