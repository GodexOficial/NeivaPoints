export type FontFaceLink={style:string;weight:string;url:string;sha256?:string};
export type FontFamilyLink={family:string;license:{spdx:string;url:string};faces:FontFaceLink[]};
export type FontState={catalog:FontFamilyLink[];missing:string[];loaded:string[];loading:string;errors:Record<string,string>;warning:string};
export type FontEngine={execute:(command:string,params:object)=>Promise<unknown>};
const FONT_PREFIX='neiva-session-font-';
const MAX_FONT_BYTES=4*1024*1024,MAX_SESSION_BYTES=16*1024*1024;
const guarded=new WeakSet<Window>();
const key=(name:string)=>name.trim().normalize('NFC').toLocaleLowerCase('en-US');

// The upstream shell persists font.add by default. Only our reserved session keys
// become read-only requests; other fonts, preferences and documents are untouched.
export function keepLinkedFontsInMemory(frame:Window){
 if(guarded.has(frame))return;
 const prototype=(frame as Window&{IDBObjectStore:typeof IDBObjectStore}).IDBObjectStore.prototype;
 const put=prototype.put;
 prototype.put=function(value:unknown,id?:IDBValidKey){
  if(this.transaction.db.name==='wordcraft'&&this.name==='fonts'&&typeof id==='string'&&id.startsWith(FONT_PREFIX))return this.get(id);
  return id===undefined?put.call(this,value):put.call(this,value,id);
 };
 guarded.add(frame);
}
function safeUrl(raw:string,base:string,font=false){
 const url=new URL(raw,base);
 if((url.protocol!=='https:'&&url.origin!==location.origin)||url.username||url.password||url.hash)throw Error('Use links HTTPS diretos, sem credenciais.');
 if(font&&!/\.(ttf|otf)$/i.test(url.pathname))throw Error('O link deve apontar diretamente para um arquivo TTF ou OTF.');
 return url.href;
}
export function validateFontCatalog(raw:unknown,base:string):FontFamilyLink[]{
 const catalog=raw as {version?:number;fonts?:FontFamilyLink[]};
 if(catalog?.version!==1||!Array.isArray(catalog.fonts)||catalog.fonts.length>40)throw Error('Catálogo de fontes inválido.');
 const names=new Set<string>();
 return catalog.fonts.map(font=>{
  if(typeof font.family!=='string'||!font.family.trim()||font.family.length>100||names.has(key(font.family)))throw Error('Nome de fonte inválido ou repetido no catálogo.');
  names.add(key(font.family));
  if(typeof font.license?.spdx!=='string'||!font.license.spdx.trim()||typeof font.license.url!=='string'||!Array.isArray(font.faces)||!font.faces.length||font.faces.length>8)throw Error('Informe licença e até oito variações para cada fonte.');
  return{family:font.family.trim(),license:{spdx:font.license.spdx,url:safeUrl(font.license.url,base)},faces:font.faces.map(face=>{
   if(typeof face.url!=='string'||typeof face.style!=='string'||typeof face.weight!=='string'||(face.sha256!==undefined&&!/^[a-f0-9]{64}$/i.test(face.sha256)))throw Error('Variação de fonte inválida.');
   return{...face,url:safeUrl(face.url,base,true)};
  })};
 });
}
async function readLimited(response:Response,max:number){
 if(!response.ok||!response.body)throw Error(`O servidor não disponibilizou a fonte (HTTP ${response.status}).`);
 if(Number(response.headers.get('Content-Length'))>max)throw Error('O arquivo de fonte excede o tamanho permitido.');
 const reader=response.body.getReader(),parts:Uint8Array[]=[];let length=0;
 try{for(;;){const item=await reader.read();if(item.done)break;length+=item.value.length;if(length>max)throw Error('O arquivo de fonte excede o tamanho permitido.');parts.push(item.value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
async function fingerprint(bytes:Uint8Array){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(bytes)))].map(value=>value.toString(16).padStart(2,'0')).join('');}
function base64(bytes:Uint8Array){let encoded='';for(let i=0;i<bytes.length;i+=8192)encoded+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(encoded);}

export class WordCraftFontSession{
 private state:FontState={catalog:[],missing:[],loaded:[],loading:'',errors:{},warning:''};
 private controller=new AbortController();
 private timer:ReturnType<typeof setTimeout>|undefined;
 private disposed=false;
 private scanning=false;
 private used=0;
 private attempted=new Set<string>();
 private imported=new Set<string>();
 private queue:Promise<unknown>=Promise.resolve();
 private api:FontEngine;
 private onChange:(state:FontState)=>void;
 private catalogUrl:string;
 constructor(api:FontEngine,frame:Window,onChange:(state:FontState)=>void,catalogUrl=new URL(`${import.meta.env.BASE_URL}wordcraft/fontes.json`,document.baseURI).href){this.api=api;this.onChange=onChange;this.catalogUrl=catalogUrl;keepLinkedFontsInMemory(frame);}
 private publish(change:Partial<FontState>){if(this.disposed)return;this.state={...this.state,...change};this.onChange(this.state);}
 async start(){
  try{const response=await fetch(this.catalogUrl,{signal:this.controller.signal,cache:'no-store',credentials:'omit'});const bytes=await readLimited(response,256*1024);this.publish({catalog:validateFontCatalog(JSON.parse(new TextDecoder().decode(bytes)),this.catalogUrl)});}
  catch(error){if(!this.disposed)this.publish({warning:error instanceof Error?error.message:'Não foi possível carregar o catálogo de fontes.'});}
  if(this.disposed)return;await this.scan();this.schedule();
 }
 private schedule(){if(!this.disposed)this.timer=setTimeout(()=>{void this.scan().finally(()=>this.schedule());},6000);}
 private async missing(){const report=await this.api.execute('font.missing',{}) as {missing?:{font:string}[]};return Array.isArray(report?.missing)?report.missing.filter(item=>typeof item.font==='string').map(item=>item.font):[];}
 async scan(){
  if(this.disposed||this.scanning||document.hidden)return;
  this.scanning=true;
  try{
   const missing=await this.missing();if(this.disposed)return;this.publish({missing});
   for(const name of missing){const font=this.state.catalog.find(item=>key(item.family)===key(name));if(font&&!this.attempted.has(key(font.family)))await this.load(font.family);}
   if(!this.disposed)this.publish({missing:await this.missing()});
  }catch{/* A document can still be opening, or the engine can be shutting down. */}finally{this.scanning=false;}
 }
 load(family:string):Promise<void>{
  const action=this.queue.then(()=>this.importFamily(family));this.queue=action.catch(()=>{});return action;
 }
 private async importFamily(family:string){
  const font=this.state.catalog.find(item=>key(item.family)===key(family));if(!font||this.disposed)return;
  if(this.state.loaded.includes(font.family))return;
  this.attempted.add(key(font.family));this.publish({loading:font.family});
  try{
   for(const face of font.faces){
    if(this.disposed)return;if(this.imported.has(face.url))continue;
    const request=new AbortController(),cancel=()=>request.abort();
    this.controller.signal.addEventListener('abort',cancel,{once:true});
    const timeout=setTimeout(cancel,20000);
    let bytes:Uint8Array;
    try{bytes=await readLimited(await fetch(face.url,{signal:request.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'}),MAX_FONT_BYTES);}finally{clearTimeout(timeout);this.controller.signal.removeEventListener('abort',cancel);}
    if(this.disposed)return;
    const signature=[...bytes.subarray(0,4)].map(value=>value.toString(16).padStart(2,'0')).join('');
    if(bytes.length<12||!['00010000','4f54544f','74727565'].includes(signature))throw Error('O link não devolveu uma fonte TTF ou OTF válida.');
    if(face.sha256&&await fingerprint(bytes)!==face.sha256.toLowerCase())throw Error('A fonte recebida difere do arquivo registrado no catálogo.');
    if(this.used+bytes.length>MAX_SESSION_BYTES)throw Error('O limite de 16 MB de fontes desta sessão foi atingido.');
    const magic=Array.from(bytes.subarray(0,4)).join(',');if(magic!=='0,1,0,0'&&magic!=='79,84,84,79')throw Error('O link não retornou uma fonte TTF ou OTF válida.');
    if(face.sha256&&await fingerprint(bytes)!==face.sha256.toLowerCase())throw Error('O arquivo da fonte mudou. Confira seu link e hash no catálogo.');
    const name=FONT_PREFIX+crypto.randomUUID()+(magic==='79,84,84,79'?'.otf':'.ttf');
    try{
     const added=await this.api.execute('font.add',{name,data:base64(bytes)}) as {families?:string[]};
     if(!added?.families?.some(item=>key(item)===key(font.family))){for(const item of added?.families||[])await this.api.execute('font.remove',{family:item});throw Error('A família dentro do arquivo difere do nome informado no catálogo.');}
     this.used+=bytes.length;
    }catch(error){if(!(error instanceof Error&&/already available/i.test(error.message)))throw error;}
    this.imported.add(face.url);
   }
   const errors={...this.state.errors};delete errors[font.family];this.publish({loaded:[...this.state.loaded,font.family],errors});
   this.publish({missing:await this.missing()});
  }catch(error){if(!this.disposed)this.publish({errors:{...this.state.errors,[font.family]:error instanceof TypeError?'Não foi possível acessar a fonte. Verifique a conexão e se o servidor permite acesso CORS.':error instanceof Error&&error.name==='AbortError'?'O servidor demorou a responder. Tente novamente.':error instanceof Error?error.message:'Não foi possível carregar a fonte.'}});}
  finally{this.publish({loading:''});}
 }
 dispose(){this.disposed=true;clearTimeout(this.timer);this.controller.abort();}
}
