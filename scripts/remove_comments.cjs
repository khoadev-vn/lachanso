const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');

function findFiles(dir, exts, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('dist')) {
        findFiles(fullPath, exts, fileList);
      }
    } else {
      if (exts.some(ext => fullPath.endsWith(ext))) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

const allFiles = [
  ...findFiles(path.join(__dirname, '../src'), ['.ts', '.tsx']),
  ...findFiles(path.join(__dirname, '../server'), ['.js'])
];

let totalCommentsRemoved = 0;

for (const file of allFiles) {
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
  } catch (err) {
    console.error(`Error parsing ${file}: ${err.message}`);
    continue;
  }

  if (ast.comments && ast.comments.length > 0) {
    const comments = ast.comments.sort((a, b) => b.end - a.end);
    let newCode = code;
    let removedInFile = 0;

    for (const comment of comments) {
      const isShebang = comment.type === 'CommentLine' && comment.value.startsWith('!'); // Ignore shebang? No, shebang is InterpreterDirective. But just in case.
      
      // Let's remove the comment completely
      let start = comment.start;
      let end = comment.end;

      // For CommentLine, the comment doesn't include the trailing newline. 
      // If we remove just the comment, we might leave an empty line. 
      // This is acceptable, as it's safe.
      newCode = newCode.slice(0, start) + newCode.slice(end);
      removedInFile++;
    }

    if (removedInFile > 0) {
      fs.writeFileSync(file, newCode, 'utf8');
      console.log(`Removed ${removedInFile} comments from ${file}`);
      totalCommentsRemoved += removedInFile;
    }
  }
}

console.log(`\nTotal comments removed across all files: ${totalCommentsRemoved}`);
