const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'js', 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

const patchPath = 'C:\\tmp\\sim_patch.js'; 
let patchContent;
try {
  patchContent = fs.readFileSync(patchPath, 'utf8');
} catch(e) {
  // try linux style root /tmp/
  try {
    patchContent = fs.readFileSync('/tmp/sim_patch.js', 'utf8');
  } catch (e2) {
    console.error("Could not find sim_patch.js");
    process.exit(1);
  }
}

const simIdx = content.indexOf('// ===== SIMULATOR =====');
const initIdx = content.indexOf('// ===== INIT =====');

if (simIdx === -1 || initIdx === -1) {
  console.error("Could not find markers in app.js");
  process.exit(1);
}

const before = content.substring(0, simIdx);
const after = content.substring(initIdx);

const newContent = before + patchContent + '\n\n' + after;

fs.writeFileSync(appJsPath, newContent, 'utf8');
console.log('App successfully patched! New length: ' + newContent.length);
