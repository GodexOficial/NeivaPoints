import React from 'react';
import {createRoot} from 'react-dom/client';
import {WordCraftHome} from '../src/components/apps/wordcraft/WordCraftHome';
import * as service from '../src/services/wordcraftService';
import {chooseDocumentFolder} from '../src/services/docService';

// An isolated in-memory File System Access implementation; never touches user folders.
const files=new Map<string,Uint8Array>(),folders=new Set(['']);
const fixture={failWrite:false,holdWrite:false,release:()=>{},files,service,chooseDocumentFolder};
const directory=(path:string):any=>({kind:'directory',name:path.split('/').at(-1)||'Pasta de teste',async queryPermission(){return 'granted';},async *entries(){for(const folder of folders)if(folder!==path&&folder.startsWith(path?path+'/':'')&&folder.slice(path?path.length+1:0).indexOf('/')<0)yield[folder.split('/').at(-1),directory(folder)];for(const[file]of files)if(file.startsWith(path?path+'/':'')&&file.slice(path?path.length+1:0).indexOf('/')<0)yield[file.split('/').at(-1),handle(file)];},async getDirectoryHandle(name:string,options?:{create?:boolean}){const target=path?path+'/'+name:name;if(!folders.has(target)){if(!options?.create)throw new DOMException('Missing','NotFoundError');folders.add(target);}return directory(target);},async getFileHandle(name:string,options?:{create?:boolean}){const target=path?path+'/'+name:name;if(!files.has(target)&&!options?.create)throw new DOMException('Missing','NotFoundError');return handle(target);}});
const handle=(path:string)=>({kind:'file',name:path.split('/').at(-1),async getFile(){if(!files.has(path))throw new DOMException('Missing','NotFoundError');return new File([Uint8Array.from(files.get(path)!)],path.split('/').at(-1)!);},async createWritable(){let pending=new Uint8Array();return{async write(value:string|Uint8Array){if(fixture.holdWrite)await new Promise<void>(resolve=>{fixture.release=resolve;});if(fixture.failWrite)throw new DOMException('Disk full','QuotaExceededError');pending=typeof value==='string'?new TextEncoder().encode(value):Uint8Array.from(value);},async close(){files.set(path,pending);},async abort(){}};}});
Object.defineProperty(window,'showDirectoryPicker',{configurable:true,value:async()=>directory('')});
(window as any).craftFixture=fixture;
createRoot(document.getElementById('root')!).render(<WordCraftHome onBack={()=>{(window as any).wentBack=true;}}/>);
