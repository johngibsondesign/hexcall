"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Document;
const document_1 = require("next/document");
function Document() {
    return (<document_1.Html className="dark">
			<document_1.Head />
			<body className="bg-neutral-950 text-neutral-100">
				<document_1.Main />
				<document_1.NextScript />
			</body>
		</document_1.Html>);
}
