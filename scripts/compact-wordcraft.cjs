const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'public/wordcraft/0.18.1'),manifestPath=path.join(root,'public/wordcraft/manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath)),name='wordcraft-web-bc9cdbc0b42827ee_bg.wasm',source=path.join(folder,name),target=source+'.gz';
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const raw=fs.existsSync(source)?fs.readFileSync(source):zlib.gunzipSync(fs.readFileSync(target));
const expected=manifest.originalWasmSha256||manifest.files[name];
if(digest(raw)!==expected)throw Error('Official engine hash mismatch');
const compressed=zlib.gzipSync(raw,{level:9});if(digest(zlib.gunzipSync(compressed))!==expected)throw Error('Compressed engine verification failed');
fs.writeFileSync(target,compressed);
let html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
const original="const wasm = await init({ module_or_path: './"+name+"' });";
const replacement=`// NeivaPoints hosting adaptation: decompress the unchanged official engine in the browser.
let wasm;
try {
  if (!('DecompressionStream' in window)) throw new Error('Atualize o navegador para abrir o WordCraft.');
  const packed = await fetch('./${name}.gz');
  if (!packed.ok || !packed.body) throw new Error('Não foi possível baixar o WordCraft. Tente novamente.');
  // Some hosts transparently decompress .gz responses; accept either representation.
  const response = /gzip/i.test(packed.headers.get('Content-Encoding') || '')
    ? new Response(packed.body, {headers: {'Content-Type': 'application/wasm'}})
    : new Response(packed.body.pipeThrough(new DecompressionStream('gzip')), {headers: {'Content-Type': 'application/wasm'}});
  wasm = await init({module_or_path: response});
} catch (error) {
  const message = error instanceof Error ? error.message : 'Falha ao iniciar o WordCraft.';
  document.addEventListener('DOMContentLoaded', () => { document.getElementById('wordcraft_loading').textContent = message; });
  if (window.parent !== window) window.parent.postMessage({type: 'wordcraft:failed', error: message}, location.origin);
  throw error;
}`;
if(html.includes(original))html=html.replace(original,replacement);else if(!html.includes('NeivaPoints hosting adaptation'))throw Error('Unexpected loader');
html=html.replace(/<link rel="preload"[^>]+\.wasm"[^>]*>/g,'');fs.writeFileSync(path.join(folder,'index.html'),html);
if(!source.startsWith(root+path.sep))throw Error('Unsafe source path');if(fs.existsSync(source))fs.unlinkSync(source);
manifest.upstreamModified=true;manifest.originalWasmSha256=expected;manifest.modifications=['2026-11-18: hosting loader reads gzip and decompresses in the browser; engine bytes unchanged.'];delete manifest.files[name];manifest.files[name+'.gz']=digest(compressed);manifest.files['index.html']=digest(Buffer.from(html));fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({engineBytes:raw.length,compressedBytes:compressed.length,sha256:expected}));
