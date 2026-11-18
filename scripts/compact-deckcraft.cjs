const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'public/deckcraft/0.18.1'),manifestPath=path.join(root,'public/deckcraft/manifest.json');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function files(dir,prefix=''){return Object.fromEntries(fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?Object.entries(files(path.join(dir,entry.name),prefix+entry.name+'/')):[[prefix+entry.name,digest(fs.readFileSync(path.join(dir,entry.name)))]]));}
const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath)): {name:'DeckCraft',version:'0.18.1',source:'https://github.com/storytold/deckcraft',release:'https://github.com/storytold/deckcraft/releases/tag/v0.18.1',archiveSha256:'3196e537fcfab538aaa2e88584bc74e29bb584459b916ab584ac22fbafe32db5',files:files(folder)};
const name='deckcraft-web-f863e8c546b80fd1_bg.wasm',source=path.join(folder,name),target=source+'.gz';
const raw=fs.existsSync(source)?fs.readFileSync(source):zlib.gunzipSync(fs.readFileSync(target)),expected=manifest.originalWasmSha256||manifest.files[name];
if(digest(raw)!==expected)throw Error('Official DeckCraft engine hash mismatch');
const compressed=zlib.gzipSync(raw,{level:9});if(digest(zlib.gunzipSync(compressed))!==expected)throw Error('DeckCraft compression verification failed');fs.writeFileSync(target,compressed);
let html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
const original=`const wasm = await init({ module_or_path: './${name}' });`;
const replacement=`// NeivaPoints: browser decompression; the official DeckCraft engine is unchanged.
let wasm;
try {
 if (!('DecompressionStream' in window)) throw new Error('Atualize o navegador para abrir o DeckCraft.');
 const packed = await fetch('./${name}.gz');
 if (!packed.ok || !packed.body) throw new Error('Não foi possível carregar o DeckCraft.');
 const body = /gzip/i.test(packed.headers.get('Content-Encoding') || '') ? packed.body : packed.body.pipeThrough(new DecompressionStream('gzip'));
 wasm = await init({module_or_path: new Response(body, {headers: {'Content-Type': 'application/wasm'}})});
} catch (error) {
 const message = error instanceof Error ? error.message : 'Falha ao iniciar o DeckCraft.';
 const show = () => { const label = document.getElementById('deckcraft_loading'); if (label) label.textContent = message; };
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, {once: true}); else show();
 if (window.parent !== window) window.parent.postMessage({type: 'deckcraft:failed', error: message}, location.origin);
 throw error;
}`;
if(html.includes(original))html=html.replace(original,replacement);else if(!html.includes('NeivaPoints: browser decompression'))throw Error('Unexpected DeckCraft loader');
html=html.replace(/<link rel="preload"[^>]+\.wasm"[^>]*>/g,'').replace('<html lang="en">','<html lang="pt-BR">').replace('Loading DeckCraft&hellip;','Carregando DeckCraft&hellip;');

fs.writeFileSync(path.join(folder,'index.html'),html);
if(!source.startsWith(root+path.sep))throw Error('Unsafe source path');if(fs.existsSync(source))fs.unlinkSync(source);
manifest.upstreamModified=true;manifest.originalWasmSha256=expected;manifest.modifications=['2026-11-18: gzip browser loader; engine bytes unchanged.'];delete manifest.files[name];manifest.files[name+'.gz']=digest(compressed);manifest.files['index.html']=digest(Buffer.from(html));fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({engineBytes:raw.length,compressedBytes:compressed.length,originalWasmSha256:expected}));
