const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.md')) {
      let content = fs.readFileSync(filePath, 'utf8');
      // Remove both escaped and unescaped heading anchors
      let updated = content.replace(/ \\?\{#[A-Za-z_-]+\\?\}/g, '');
      if (content !== updated) {
        fs.writeFileSync(filePath, updated);
        console.log(`Fixed: ${filePath}`);
      }
    }
  });
}

walkDir('./docs');
console.log('Done!');
