const fs = require('fs');
const wasmCode = fs.readFileSync('dist/rnnoise-processor.wasm');
const js = fs.readFileSync('dist/rnnoise-processor.js',{ encoding:'utf8' });
if (js.includes('WASM_CODE_BASE64')) {
    fs.writeFileSync('dist/rnnoise-processor.js', js.replace('WASM_CODE_BASE64',wasmCode.toString('base64')));
}
