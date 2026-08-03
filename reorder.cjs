const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const expertAnalysisStart = '{resultData.type === "news" && resultData.analysis && (<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white text-gray-900 rounded-[32px] p-7 shadow-xl relative overflow-hidden border border-gray-100 group">';

const block1And2Start = code.indexOf(expertAnalysisStart);
if (block1And2Start === -1) {console.error("Could not find block1And2Start");process.exit(1);}

const block1And2End = code.indexOf('</motion.div>)}', code.indexOf('LCS Press Matrix')) + 15;
const block1And2 = code.substring(block1And2Start, block1And2End);

const block3Start = code.indexOf('<div className="space-y-6">', block1And2End);
if (block3Start === -1) {console.error("Could not find block3Start");process.exit(1);}

let block3EndStr = '                </div>\r\n\r\n\r\n                <div className="hidden">';
let block3End = code.indexOf(block3EndStr, block3Start);
if (block3End === -1) {
  block3EndStr = '                </div>\n\n\n                <div className="hidden">';
  block3End = code.indexOf(block3EndStr, block3Start);
}
if (block3End === -1) {
  block3End = code.indexOf('<div className="hidden">', block3Start) - 10;
} else {
  block3End += 22;
}

const block3 = code.substring(block3Start, block3End);


let newCode = code.substring(0, block1And2Start) + block3 + '\r\n\r\n' + block1And2 + '\r\n\r\n' + code.substring(block3End);


newCode = newCode.replace(
  /\{resultData\.textContent\}/g,
  '<HighlightedText text={resultData.textContent} reasons={resultData.analysisReasons} />'
);

fs.writeFileSync('src/App.tsx', newCode);
console.log('Done swap');
