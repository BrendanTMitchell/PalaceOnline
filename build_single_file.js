"use strict";

const fs = require("node:fs");
const path = require("node:path");

const here = __dirname;
let html = fs.readFileSync(path.join(here, "index.html"), "utf8");
const css = fs.readFileSync(path.join(here, "style.css"), "utf8");
const engine = fs.readFileSync(path.join(here, "game-engine.js"), "utf8");
const app = fs.readFileSync(path.join(here, "script.js"), "utf8");

function scriptSafe(text) {
	return text.replace(/<\//g, "<\\/");
}

const replacements = [
	['<link rel="stylesheet" href="style.css">', `<style>\n${css}\n</style>`],
	['<script src="game-engine.js" defer></script>', ""],
	['<script src="script.js" defer></script>', ""],
];

for (const [source, replacement] of replacements) {
	if (!html.includes(source)) throw new Error(`Expected build marker not found: ${source}`);
	html = html.replace(source, replacement);
}

if (!html.includes("</body>")) throw new Error("Expected closing body tag not found");
html = html.replace(
	"</body>",
	`<script>\n${scriptSafe(engine)}\n</script>\n<script>\n${scriptSafe(app)}\n</script>\n</body>`,
);
html = html.replace(/^[\t ]+\r?$/gm, "");

const output = path.join(here, "Palace.html");
fs.writeFileSync(output, html, "utf8");
console.log(`Wrote ${output}`);
