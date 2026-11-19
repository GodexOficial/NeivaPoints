const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.MENUS_TEST_URL||'http://127.0.0.1:4187';
const sizes=[[1920,1080],[1366,768],[1280,720],[1024,600],[960,540],[800,450],[640,360],[568,320],[390,664],[320,480]];
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),checks=[];try{
 const context=await browser.newContext({deviceScaleFactor:2}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('https://**/*',route=>route.abort());
 const button=name=>page.getByRole('button',{name,exact:true});
 const classPage=async()=>{await page.setViewportSize({width:1600,height:900});await page.goto(base+'/tests/responsive-menus.html');await button('Turmas').click();await button('Editar Turma').waitFor();};
 const cases=[
  ['editar-turma',async()=>button('Editar Turma').click()],
  ['cadastrar-turma',async()=>button('Cadastrar Turma').click()],
  ['cadastrar-aluno',async()=>button('Adicionar Aluno ao 5º Ano').click()],
  ['pontos-aluno',async()=>button('Adicionar pontos').click()],
  ['remover-pontos-aluno',async()=>{await button('Adicionar pontos').click();await page.getByRole('dialog').getByRole('button',{name:'Remover Pontos',exact:true}).click();}],
  ['pontos-turma',async()=>button('Dar XP para Todos').click()],
  ['remover-pontos-turma',async()=>button('Remover Pontos de Todos').click()],
  ['confirmar-exclusao',async()=>button('Excluir Turma').click()],
  ['cadastrar-aplicativo',async()=>{await button('Aplicativos').click();await button('Editar grade').click();await button('Adicionar aplicativo').click();}],
  ['editar-aplicativo',async()=>{await button('Aplicativos').click();await button('Editar grade').click();await button('Editar Aplicativo de teste').click();}],
 ];
 const verify=async(name,width,height)=>{
  const dialog=page.getByRole('dialog').last();await dialog.waitFor();await page.waitForTimeout(350);
  const result=await dialog.evaluate(el=>{
   const panel=el.querySelector('.dialog-panel'),actions=el.querySelector('.dialog-actions'),body=el.querySelector('.dialog-body');
   const fits=target=>{const r=target.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;};
   const controls=[...actions.querySelectorAll('button')];
   return {panel:fits(panel),actions:controls.every(fits),hits:controls.every(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===b||b.contains(hit);}),bodyHeight:body.clientHeight,scrolls:body.scrollHeight>body.clientHeight+1,backgroundLocked:document.body.style.overflow==='hidden',overlay:el.getBoundingClientRect().height,viewport:innerHeight};
  });
  assert.ok(result.panel&&result.actions&&result.hits&&result.backgroundLocked&&result.bodyHeight>0&&Math.abs(result.overlay-result.viewport)<2,`${name} ${width}x${height}: ${JSON.stringify(result)}`);
  // The last field remains reachable without moving the fixed action area.
  const fields=dialog.locator('input:visible, textarea:visible, select:visible');if(await fields.count()){const before=await dialog.locator('.dialog-actions').boundingBox();await fields.last().scrollIntoViewIfNeeded();const after=await dialog.locator('.dialog-actions').boundingBox();assert.ok(Math.abs(before.y-after.y)<1,'Actions must not scroll away with fields');}
  checks.push(`${name} ${width}x${height}`);
 };
 for(const[name,open]of process.env.MENUS_SKIP_MATRIX?[]:cases){await classPage();await open();for(const[width,height]of sizes){await page.setViewportSize({width,height});await verify(name,width,height);}
  if(name==='editar-turma'){await page.setViewportSize({width:800,height:450});await page.screenshot({path:'output/playwright/menu-editar-turma-800x450.png'});const d=page.getByRole('dialog');await d.locator('input[type=text]').first().fill('Turma corrigida');await d.locator('button[type=submit]').click();await d.waitFor({state:'detached'});assert.equal(await page.evaluate(()=>window.savedClass.name),'Turma corrigida');checks.push('Submit class form with action visible');}
  if(name==='cadastrar-aplicativo'){const d=page.getByRole('dialog');await d.getByPlaceholder('Ex.: Khan Academy').fill('Atalho QA');await d.getByPlaceholder('https://exemplo.com').fill('https://example.com');await d.locator('button[type=submit]').click();await d.waitFor({state:'detached'});assert.equal(await page.evaluate(()=>window.savedApp.name),'Atalho QA');checks.push('Submit application form with action visible');}
  console.log('PASS',name,'in',sizes.length,'viewports');
 }
 // Nested confirmation stays on top; Escape only closes the active dialog.
 await classPage();await button('Adicionar pontos').click();await page.getByRole('dialog').getByRole('button',{name:'Remover Pontos',exact:true}).click();await page.getByRole('dialog').locator('button[type=submit]').click();await page.setViewportSize({width:640,height:360});await verify('confirmacao-sobre-pontos',640,360);assert.equal(await page.getByRole('dialog').count(),2);await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),1);assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');checks.push('Nested dialogs keep focus, topmost Escape and scroll restoration');
 // Compact navigation at low height: all essential buttons stay within the menu.
 for(const[width,height]of [[960,540],[800,450],[640,360],[568,320],[390,664],[320,480]]){await classPage();await page.setViewportSize({width,height});await button('Abrir menu').click();await page.waitForTimeout(350);const geometry=await page.locator('#mobile-navigation').evaluate(el=>{const bounds=el.getBoundingClientRect();return{fits:bounds.bottom<=innerHeight+1,overflow:el.scrollWidth>el.clientWidth+1,buttons:[...el.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,bottom:r.bottom,right:r.right};})};});assert.ok(geometry.fits&&!geometry.overflow,JSON.stringify(geometry));assert.ok(geometry.buttons.every(b=>b.bottom<=height+1&&b.right<=width+1),`Menu navigation ${width}x${height}: ${JSON.stringify(geometry)}`);checks.push(`navigation ${width}x${height}`);}
 for(const[width,height]of [[390,664],[320,480],[568,320],[768,1024]]){
  const mobile=await browser.newContext({viewport:{width,height},deviceScaleFactor:3,isMobile:true,hasTouch:true}),touch=await mobile.newPage();await touch.route('https://**/*',r=>r.abort());await touch.goto(base+'/tests/responsive-menus.html');
  await touch.getByRole('button',{name:'Abrir menu',exact:true}).tap();await touch.getByRole('button',{name:'Turmas',exact:true}).tap();await touch.getByRole('button',{name:'Editar Turma',exact:true}).tap();
  await touch.waitForTimeout(350);const d=touch.getByRole('dialog');assert.ok(await d.locator('.dialog-actions').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.right<=innerWidth;}));
  assert.equal(await touch.evaluate(()=>matchMedia('(pointer:coarse)').matches),true);await d.locator('input[type=text]').first().fill('Turma touch');await d.locator('button[type=submit]').tap();await d.waitFor({state:'detached'});assert.equal(await touch.evaluate(()=>window.savedClass.name),'Turma touch');checks.push(`touch coarse pointer ${width}x${height}`);await mobile.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('output/playwright/responsive-menus-result.json',JSON.stringify({passed:true,checks,deviceScaleFactor:2},null,2));console.log('PASS',checks.length,'checks, no unhandled browser errors');
}catch(e){console.error(e);process.exitCode=1;}finally{await browser.close();}})();
