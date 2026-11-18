const fs=require('node:fs'),path=require('node:path');
function bytes(folder){return fs.readdirSync(folder,{withFileTypes:true}).reduce((sum,item)=>sum+(item.isDirectory()?bytes(path.join(folder,item.name)):fs.statSync(path.join(folder,item.name)).size),0);}
const total=bytes('dist'),wordcraft=bytes('dist/wordcraft'),gridcraft=fs.existsSync('dist/gridcraft')?bytes('dist/gridcraft'):0;console.log(`Publicação: ${(total/1000000).toFixed(2)} MB; WordCraft: ${(wordcraft/1000000).toFixed(2)} MB; GridCraft: ${(gridcraft/1000000).toFixed(2)} MB`);
if(total>50_000_000)throw Error('A publicação ultrapassou o limite de 50 MB.');
