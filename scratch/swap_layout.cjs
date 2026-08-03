const fs = require('fs');
const file = 'd:/Documents/Workspace/NodeJS/La-Chan-So/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const startBlock1 = '{resultData.type === "news" && resultData.analysis && (<motion.div initial={{ opacity: 0, scale: 0.95 }}';
const startBlock2 = '{resultData.type === "news" && resultData.pressArticles && (<motion.div initial={{ opacity: 0, y: 16 }}';
const startBlock3 = '<div className="space-y-6">';
const endBlock3 = '<div className="hidden">';

const idx1 = content.indexOf(startBlock1);
const idx2 = content.indexOf(startBlock2);
const idx3 = content.indexOf(startBlock3);
const idx4 = content.indexOf(endBlock3);

if (idx1 !== -1 && idx2 !== -1 && idx3 !== -1 && idx4 !== -1) {
  const block1_2 = content.substring(idx1, idx3);
  const block3 = content.substring(idx3, idx4);

  let newContent = content.substring(0, idx1) + block3 + block1_2 + content.substring(idx4);

  newContent = newContent.replace('<div className="space-y-8" ref={resultsRef}>', '<div className="space-y-8">');
  newContent = newContent.replace('<div className="space-y-6">', '<div className="space-y-6" ref={resultsRef}>');

  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Successfully swapped layout blocks and moved ref in App.tsx');
} else {
  console.log('Failed to find one or more blocks');
  console.log({ idx1, idx2, idx3, idx4 });
}
