const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy root static files
const filesToCopy = ['index.html', 'style.css', 'script.js', 'README.md'];
for (const file of filesToCopy) {
  const src = path.join(__dirname, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, file));
  }
}

// Copy asifrahman-jpg folder
const srcImgDir = path.join(__dirname, 'asifrahman-jpg');
const destImgDir = path.join(distDir, 'asifrahman-jpg');
if (fs.existsSync(srcImgDir)) {
  fs.cpSync(srcImgDir, destImgDir, { recursive: true });
}

console.log('Build succeeded: all assets copied to dist/');
