const fs = require('fs');
const path = require('path');

let totalFixed = 0;

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;
  
  // Replace HTML anchor tags in two patterns:
  // 1. Line-start anchors: ^\s*<a id="AnchorName"></a>Heading Text
  // 2. Inline anchors: **<a id="AnchorName"></a>Text**
  
  // Pattern 1: Line-start anchors -> convert to headings
  const lineAnchorPattern = /^(\s*)<a id="([^"]+)"><\/a>([^\n]+)/gm;
  content = content.replace(lineAnchorPattern, (match, leadingSpace, anchorId, headingText) => {
    changes++;
    return `## ${headingText.trim()} {#${anchorId}}`;
  });
  
  // Pattern 2: Inline anchors like **<a id="Name"></a>Text** -> just **Text** with ID after
  const inlineAnchorPattern = /\*\*<a id="([^"]+)"><\/a>([^*]+)\*\*/g;
  content = content.replace(inlineAnchorPattern, (match, anchorId, text) => {
    changes++;
    return `**${text}** {#${anchorId}}`;
  });
  
  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${changes} HTML anchors in ${path.relative(process.cwd(), filePath)}`);
    totalFixed += changes;
  }
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name.charAt(0) !== '.') {
      scanDir(fullPath);
    } else if (entry.name.endsWith('.md')) {
      fixFile(fullPath);
    }
  }
}

console.log('Converting HTML anchors to Docusaurus markdown heading IDs...\n');
scanDir('docs');
console.log(`\nTotal: Fixed ${totalFixed} HTML anchor tags`);
