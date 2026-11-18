const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'public/gridcraft/0.19.1'),manifestPath=path.join(root,'public/gridcraft/manifest.json');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function files(dir,prefix=''){return Object.fromEntries(fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?Object.entries(files(path.join(dir,entry.name),prefix+entry.name+'/')):[[prefix+entry.name,digest(fs.readFileSync(path.join(dir,entry.name)))]]));}
const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath)): {name:'GridCraft',version:'0.19.1',source:'https://github.com/storytold/gridcraft',release:'https://github.com/storytold/gridcraft/releases/tag/v0.19.1',archiveSha256:'48c5d1b101befebb3c5ba3b7a14914f01c3207934813ed07dc4251b7ae116a78',files:files(folder)};
const name='gridcraft-web-fdc723373f2aa0d8_bg.wasm',source=path.join(folder,name),target=source+'.gz';
const raw=fs.existsSync(source)?fs.readFileSync(source):zlib.gunzipSync(fs.readFileSync(target)),expected=manifest.originalWasmSha256||manifest.files[name];
if(digest(raw)!==expected)throw Error('Official GridCraft engine hash mismatch');
const compressed=zlib.gzipSync(raw,{level:9});if(digest(zlib.gunzipSync(compressed))!==expected)throw Error('GridCraft compression verification failed');fs.writeFileSync(target,compressed);
let html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
const original=`const wasm = await init({ module_or_path: './${name}' });`;
const replacement=`// NeivaPoints: browser decompression; the official GridCraft engine is unchanged.
let wasm;
try {
 if (!('DecompressionStream' in window)) throw new Error('Atualize o navegador para abrir o GridCraft.');
 const packed = await fetch('./${name}.gz');
 if (!packed.ok || !packed.body) throw new Error('Não foi possível carregar o GridCraft.');
 const body = /gzip/i.test(packed.headers.get('Content-Encoding') || '') ? packed.body : packed.body.pipeThrough(new DecompressionStream('gzip'));
 wasm = await init({module_or_path: new Response(body, {headers: {'Content-Type': 'application/wasm'}})});
} catch (error) {
 const message = error instanceof Error ? error.message : 'Falha ao iniciar o GridCraft.';
 const show = () => { const label = document.getElementById('gridcraft_loading'); if (label) label.textContent = message; };
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, {once: true}); else show();
 if (window.parent !== window) window.parent.postMessage({type: 'gridcraft:failed', error: message}, location.origin);
 throw error;
}`;
if(html.includes(original))html=html.replace(original,replacement);else if(!html.includes('NeivaPoints: browser decompression'))throw Error('Unexpected GridCraft loader');
html=html.replace(/<link rel="preload"[^>]+\.wasm"[^>]*>/g,'').replace('<html lang="en">','<html lang="pt-BR">').replace('Loading GridCraft&hellip;','Carregando GridCraft&hellip;');
if(!html.includes("import './neiva-locale.js';"))html=html.replace('<script type="module">',"<script type=\"module\">\nimport './neiva-locale.js';");
fs.writeFileSync(path.join(folder,'index.html'),html);
if(!source.startsWith(root+path.sep))throw Error('Unsafe source path');if(fs.existsSync(source))fs.unlinkSync(source);
manifest.upstreamModified=true;manifest.originalWasmSha256=expected;manifest.modifications=['2026-11-18: gzip browser loader and built-in Portuguese UI; engine bytes unchanged.'];delete manifest.files[name];manifest.files[name+'.gz']=digest(compressed);manifest.files['index.html']=digest(Buffer.from(html));manifest.files['neiva-locale.js']=digest(fs.readFileSync(path.join(folder,'neiva-locale.js')));fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({engineBytes:raw.length,compressedBytes:compressed.length,originalWasmSha256:expected}));
