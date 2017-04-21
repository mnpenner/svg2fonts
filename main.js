#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-sync */
'use strict';

const {ArgumentParser, Const} = require('argparse');
const parser = new ArgumentParser({
    version: require('./package.json').version,
    addHelp: true,
    description: "Converts a directory full of SVG icons into webfonts"
});
parser.addArgument(
    'src',
    {
        help: 'Source directory'
    }
);

parser.addArgument(
    ['-d', '--out-dir'],
    {
        help: 'Output directory'
    }
);

const args = parser.parseArgs();
console.dir(args);
process.exit();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


"use strict";

const svgicons2svgfont = require('svgicons2svgfont');
const fs = require('fs');
const path = require('path');
const svg2ttf = require('svg2ttf');
const ttf2woff = require('ttf2woff');
const ttf2woff2 = require('ttf2woff2');
const ttf2eot = require('ttf2eot');
const cssesc = require('cssesc');
const he = require('he');
const _ = require('lodash');
const mkdirp = require('mkdirp');

const quoteStr = s => cssesc(s, {wrap: true});
const quoteId = s => cssesc(s, {isIdentifier: true});

const inputDir = path.normalize(`${__dirname}/../artifacts/icons`);
const outputDir = path.normalize(`${__dirname}/../assets/fonts`);

const svgFontFile = `${outputDir}/wxicons.svg`;
const ttfFontFile = `${outputDir}/wxicons.ttf`;
const woffFontFile = `${outputDir}/wxicons.woff`;
const woff2FontFile = `${outputDir}/wxicons.woff2`;
const eotFile = `${outputDir}/wxicons.eot`;
const cssFile = `${outputDir}/wxicons.css`;
const htmlFile = `${outputDir}/wxicons.html`;
const jsFile = `${outputDir}/wxicons.js`; // map icon name to css class and/or character

const fontName = 'wxicons';

mkdirp.sync(outputDir);

const fontStream = svgicons2svgfont({
    fontName: fontName,
    normalize: true,
    fontHeight: 5000,
    fixedWidth: false,
    centerHorizontally: false,
    log: () => {},
});

const svgFileStream = fs.createWriteStream(svgFontFile);

fontStream.pipe(svgFileStream)
    .on('finish', function() {
        console.log(`Wrote ${svgFontFile}`);
        createFonts();
    })
    .on('error', function(err) {
        console.log(err);
    });


// TODO: make this async
const icons = fs.readdirSync(inputDir)
    .map(f => path.resolve(inputDir, f))
    .filter(f => !fs.statSync(f).isDirectory());

const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
icons.sort(collator.compare);

let codePoint = 0xF000;

const cssDir = path.dirname(cssFile);
const htmlDir = path.dirname(htmlFile);

let css = `
@font-face {
  font-family: ${quoteStr(fontName)};
  src: url(${quoteStr(path.relative(cssDir, eotFile))}); /* IE9 Compat Modes */
  src: url(${quoteStr(path.relative(cssDir, eotFile)+'?iefix')}) format('embedded-opentype'), /* IE6-IE8 */
    url(${quoteStr(path.relative(cssDir, woff2FontFile))}) format('woff2'), /* Edge 14+, Chrome 36+, Firefox 39+, some mobile */
    url(${quoteStr(path.relative(cssDir, woffFontFile))}) format('woff'),  /* IE 9+, Edge, Firefox 3.6+, Chrome 5+, Safari 5.1+ */
    url(${quoteStr(path.relative(cssDir, ttfFontFile))}) format('truetype'), /* Safari, Android, iOS */
    url(${quoteStr(path.relative(cssDir, svgFontFile))}) format('svg'); /* Legacy iOS */
  font-weight: normal;
  font-style: normal;
}
[class^="icon-"], [class*=" icon-"] {
  /* use !important to prevent issues with browser extensions that change fonts */
  font-family: ${quoteStr(fontName)} !important;
  speak: none;
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  text-transform: none;
  line-height: 1;

  /* Better Font Rendering =========== */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`.trimLeft();


let cssIcons = [];
let htmlIcons = [];
let iconMap = {};

for(let icon of icons) {
    let glyph = fs.createReadStream(icon);
    let iconName = path.basename(icon, '.svg');
    let iconChar = String.fromCodePoint(codePoint++);
    glyph.metadata = {
        unicode: [iconChar],
        name: iconName,
    };
    fontStream.write(glyph);

    let className = `icon-${iconName}`;
    cssIcons.push(`.${quoteId(className)}:before {
  content: ${quoteStr(iconChar)}
}`);

    htmlIcons.push(`<a href="" class="cell"><i class="icon ${he.escape(className)}"></i><span class="classname">${he.escape(className)}</span></a>`);
    iconMap[_.camelCase(iconName)] = className;
}

css += cssIcons.join('\n');

fontStream.end();

fs.writeFile(jsFile, `export default ${JSON.stringify(iconMap,null,4)};`, {encoding: 'utf8'}, err => {
    if(err) throw err;
    console.log(`Wrote ${jsFile}`);
});

fs.writeFile(cssFile, css, {encoding: 'utf8'}, err => {
    if(err) throw err;
    console.log(`Wrote ${cssFile}`);
});

let html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${he.escape(fontName)}</title>
    <link rel="stylesheet" href="${he.escape(path.relative(htmlDir, cssFile))}">
    <style>
        .icon {
            font-size: 32px;
            background-color: #eee;
        }
        .page-wrap {
            margin: 0 auto;
            max-width: 1000px;
            padding: 0 1rem;
        }
        .container {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
        }
        /*
        .container::after {
            content: '';
            flex-grow: 2147483647;
        }
        */
        .cell {
            display: block;
            text-align: center;
            border: 1px solid #ccc;
            padding: 5px;
            margin: 3px;
            /*flex: 1;*/
            width: 100px;
            text-decoration: none;
            color: black;
        }
        .cell:hover {
            background-color: #3af;
            color: white;
        }
        .cell:hover .icon {
            background-color: #2E99E6;
        }
        .classname {
            display: block;
            font-family: monospace;
            font-size: 10px;
            white-space: nowrap;
            max-width: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    </style>
  </head>
  <body>
    <div class="page-wrap">
        <h1>${he.escape(fontName)}</h1>
        <div class="container">
            ${htmlIcons.join('\n')}
        </div>
    </div>
    <script>
        [].forEach.call(document.querySelectorAll( '.cell' ), function (a) {
            a.addEventListener('click', function(ev) {
                ev.preventDefault();
                let classname = a.querySelector('.classname');
                if(classname) {
                    let range = document.createRange();
                    range.selectNodeContents(classname);
                    let selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    document.execCommand("Copy", false, null);
                }
            }, false );
        });
    </script>
  </body>
</html>
`;

fs.writeFile(htmlFile, html, {encoding: 'utf8'}, err => {
    if(err) throw err;
    console.log(`Wrote ${htmlFile}`);
});

function createFonts() {
    let svgString = fs.readFileSync(svgFontFile, {encoding: 'utf8'});
    const ttf = svg2ttf(svgString, {});
    fs.writeFileSync(ttfFontFile, ttf.buffer);
    console.log(`Wrote ${ttfFontFile}`);

    let ttfBuffer = fs.readFileSync(ttfFontFile);
    const woff = ttf2woff(ttfBuffer, {});
    fs.writeFileSync(woffFontFile, woff.buffer);
    console.log(`Wrote ${woffFontFile}`);

    fs.writeFileSync(woff2FontFile, ttf2woff2(ttfBuffer));
    console.log(`Wrote ${woff2FontFile}`);

    fs.writeFileSync(eotFile, ttf2eot(ttfBuffer));
    console.log(`Wrote ${eotFile}`);
}
