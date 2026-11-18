const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.WORD_TEST_URL||'http://127.0.0.1:4186';
const eventually=async action=>{const end=Date.now()+120000;while(Date.now()<end){try{if(await action())return;}catch{}await new Promise(r=>setTimeout(r,80));}throw Error('Editor timeout');};
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),checks=[];try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},locale:'pt-BR'}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);};
 await page.goto(base+'/tests/wordcraft-regression.html');await page.getByRole('button',{name:'Documento em branco',exact:true}).click();
 await eventually(()=>page.evaluate(async()=>(await document.querySelector('iframe')?.contentWindow?.wordcraft?.docInspect())?.pages>0));
 check('New document opens without folder picker',await page.getByRole('button',{name:'Conectar pasta',exact:true}).count()===0);
 const engine=async(command,params={})=>page.evaluate(({command,params})=>document.querySelector('iframe').contentWindow.wordcraft.execute(command,params),{command,params});
 const inspect=()=>page.evaluate(()=>document.querySelector('iframe').contentWindow.wordcraft.docInspect());
 await engine('text.insert',{text:'RECUPERACAO_AUTOMATICA'});await page.getByText(/^Salvo neste navegador ·/).waitFor();
 check('Autosave persists the document in IndexedDB',JSON.stringify((await page.evaluate(()=>craftFixture.service.listCraftDocuments())).documents).includes('Novo documento.docx'));
 await page.reload();await page.getByRole('button',{name:/Novo documento.docx/}).first().click();await eventually(()=>page.evaluate(async()=>JSON.stringify(await document.querySelector('iframe')?.contentWindow?.wordcraft?.docInspect()).includes('RECUPERACAO_AUTOMATICA')));
 check('Document and edits survive page reload',true);
 await page.context().grantPermissions(['clipboard-read','clipboard-write'],{origin:base});
 await engine('insert.table',{rows:2,cols:2});await engine('text.insert',{text:'CELULA_COPIADA'});await engine('table.selectTable');await engine('edit.copy');await engine('caret.docEnd');await engine('text.pageBreak');await engine('edit.paste');
 check('Native table copy and paste retains cell text',JSON.stringify((await inspect()).blocks).split('CELULA_COPIADA').length>=3);
 await engine('edit.undo');check('Undo preserves the source table',JSON.stringify((await inspect()).blocks).split('"type":"table"').length===2);
 await page.getByRole('button',{name:'Salvar',exact:true}).click();await eventually(()=>page.evaluate(()=>document.querySelector('.craft-status')?.textContent==='Salvo neste navegador'));
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar arquivo',exact:true}).click();check('Download exports a portable file',(await download).suggestedFilename().endsWith('.docx'));
 await page.screenshot({path:'output/playwright/wordcraft-browser-storage.png'});
 // Real IndexedDB transactions, with an injected quota failure after metadata was staged.
 const storageChecks=await page.evaluate(async()=>{
  const s=craftFixture.service,checks=[],check=(name,value)=>{if(!value)throw Error(name);checks.push(name);};
  const list=await s.listCraftDocuments();for(const doc of list.documents)await s.deleteCraftDocument(doc.id);
  const nativeSet=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};let doc;
  try{doc=await s.saveCraftDocument('Grande.docx',new Uint8Array(6*1024*1024).fill(19));}finally{Storage.prototype.setItem=nativeSet;}
  check('Six MB saves without localStorage quota',(await s.openCraftDocument(doc.id)).bytes.length===6*1024*1024);
  let stale=doc;for(let i=0;i<5;i++)doc=await s.saveCraftDocument(doc.name,new Uint8Array([i+1]),doc);
  check('History is limited to three versions',doc.revisions.length===3);
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(s.WORDCRAFT_DB,1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  let tx=db.transaction('versions','readonly');const count=await new Promise(resolve=>{const r=tx.objectStore('versions').count();r.onsuccess=()=>resolve(r.result);});check('Pruned binary revisions are actually removed',count===3);
  let conflict=false;try{await s.saveCraftDocument(doc.name,new Uint8Array([88]),stale);}catch{conflict=true;}check('Stale tabs cannot overwrite current content',conflict);
  const previous=JSON.stringify(doc),originalPut=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(...args){if(this.name==='versions')throw new DOMException('Full','QuotaExceededError');return originalPut.apply(this,args);};let quota=false;
  try{await s.saveCraftDocument(doc.name,new Uint8Array([99]),doc);}catch(e){quota=e.name==='QuotaExceededError';}finally{IDBObjectStore.prototype.put=originalPut;}
  check('Quota failure rolls back pruning and metadata',quota&&JSON.stringify((await s.openCraftDocument(doc.id)).document)===previous);
  const data=await s.openCraftDocument(doc.id);const retry=await s.saveCraftDocument(doc.name,data.bytes,doc);check('Identical saves do not duplicate history',retry.revisions.length===3);
  for(let i=0;i<4;i++)await s.saveCraftDocument('Documento '+i+'.docx',new Uint8Array([i+1]));let limited=false;
  try{await s.saveCraftDocument('Sexto.docx',new Uint8Array([77]));}catch{limited=true;}
  check('Sixth document is refused without deleting existing documents',limited&&(await s.listCraftDocuments()).documents.length===5);
  await s.deleteCraftDocument(doc.id);check('Deleting a document releases its binary backups',!(await s.listCraftDocuments()).documents.some(item=>item.id===doc.id));
  for(const item of(await s.listCraftDocuments()).documents)await s.deleteCraftDocument(item.id);
  await s.saveCraftDocument('A.docx',new Uint8Array(14*1024*1024).fill(1));let budget=false;try{await s.saveCraftDocument('B.docx',new Uint8Array(14*1024*1024).fill(2));}catch{budget=true;}
  check('Twenty five MB total budget protects saved documents',budget&&(await s.listCraftDocuments()).documents.length===1);
  for(const item of(await s.listCraftDocuments()).documents)await s.deleteCraftDocument(item.id);db.close();return checks;
 });checks.push(...storageChecks);
 for(const[index,path]of(process.env.WORDCRAFT_TEST_DOCX||'').split('|').filter(Boolean).entries()){
  await page.goto(base+'/tests/wordcraft-regression.html');await page.locator('input[type=file]').setInputFiles(path);await eventually(()=>page.evaluate(async()=>(await document.querySelector('iframe')?.contentWindow?.wordcraft?.docInspect())?.pages>0));
  const before=await inspect();check(`Real DOCX ${index+1} opens with tables`,before.blocks.some(block=>block.type==='table'));
  await engine('text.insert',{text:'VERIFICACAO_NATIVA'});await engine('edit.undo');check(`Real DOCX ${index+1} undo restores imported content`,JSON.stringify((await inspect()).blocks)===JSON.stringify(before.blocks));
  await page.getByRole('button',{name:'Salvar',exact:true}).click();await eventually(()=>page.evaluate(()=>document.querySelector('.craft-status')?.textContent==='Salvo neste navegador'));
  await page.screenshot({path:`output/playwright/wordcraft-browser-real-${index+1}.png`});
 }
 check('No unhandled browser errors',errors.length===0);const report={passed:true,checks};fs.writeFileSync('output/playwright/wordcraft-regression-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
