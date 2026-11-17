import '../src/index.css';
import '../src/components/apps/word/word-workspace.css';
import JSZip from 'jszip';
import {importWordFile} from '../src/utils/wordImport';
import {createDocxBlob} from '../src/utils/docxExporter';
import {paginateWordHtml} from '../src/utils/wordPagination';

const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const WP='http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const checks:string[]=[];
function assert(value:unknown,message:string){if(!value)throw Error(message);checks.push(message);}
const parse=(html:string)=>new DOMParser().parseFromString(html,'text/html');
async function fixture(body:string,header=false){
 const zip=new JSZip();
 zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 zip.file('_rels/.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="root" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`);
 zip.file('word/document.xml',`<w:document xmlns:w="${W}" xmlns:r="${R}"><w:body>${body}<w:sectPr>${header?'<w:headerReference w:type="default" r:id="header"/>':''}<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="567" w:bottom="567" w:left="720" w:right="720" w:header="1701" w:footer="0"/></w:sectPr></w:body></w:document>`);
 zip.file('word/styles.xml',`<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Normal"/><w:style w:type="table" w:styleId="Grid"><w:pPr><w:spacing w:after="0" w:line="240"/></w:pPr><w:tblPr><w:tblCellMar><w:top w:w="0"/><w:bottom w:w="0"/></w:tblCellMar><w:tblBorders><w:top w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:insideH w:val="nil"/></w:tblBorders></w:tblPr></w:style><w:style w:type="paragraph" w:styleId="Header"><w:pPr><w:spacing w:after="0" w:line="240"/></w:pPr></w:style></w:styles>`);
 zip.file('word/numbering.xml',`<w:numbering xmlns:w="${W}"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1º"/><w:lvlJc w:val="right"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`);
 zip.file('word/_rels/document.xml.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="styles" Type="${R}/styles" Target="styles.xml"/><Relationship Id="numbering" Type="${R}/numbering" Target="numbering.xml"/>${header?`<Relationship Id="header" Type="${R}/header" Target="header1.xml"/>`:''}</Relationships>`);
 if(header){
  const canvas=document.createElement('canvas');canvas.width=400;canvas.height=60;canvas.getContext('2d')!.fillRect(0,0,400,60);zip.file('word/media/header.png',canvas.toDataURL().split(',')[1],{base64:true});
  zip.file('word/_rels/header1.xml.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="image" Type="${R}/image" Target="media/header.png"/></Relationships>`);
  zip.file('word/header1.xml',`<w:hdr xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="${WP}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/></w:rPr><w:drawing><wp:anchor behindDoc="1"><wp:positionH relativeFrom="margin"><wp:posOffset>617855</wp:posOffset></wp:positionH><wp:positionV relativeFrom="margin"><wp:posOffset>-1329690</wp:posOffset></wp:positionV><wp:extent cx="8542020" cy="1248410"/><a:graphic><a:blip r:embed="image"/></a:graphic></wp:anchor></w:drawing></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr></w:p></w:hdr>`);
 }
 return new File([await zip.generateAsync({type:'arraybuffer'})],'fixture.docx');
}
const p=(text:string)=>`<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
async function run(){
 const rows=['Alpha','Beta','Gamma'].map(name=>`<w:tr><w:trPr><w:trHeight w:val="283"/></w:trPr><w:tc><w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr></w:p></w:tc><w:tc>${p(name)}</w:tc></w:tr>`).join('');
 const source=await fixture(`<w:tbl><w:tblPr><w:tblStyle w:val="Grid"/><w:tblW w:w="10000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="1000"/><w:gridCol w:w="9000"/></w:tblGrid>${rows}</w:tbl>`,true);
 const imported=await importWordFile(source),dom=parse(imported.html),settings=imported.settings!;
 assert(settings.topMarginCm!>3&&settings.topMarginCm!<6,'Cabeçalho medido pelo conteúdo, sem altura da janela');
 assert(settings.pages!.length===1,'Tabela compacta cabe em uma folha');
 assert(Array.from(dom.querySelectorAll('[data-word-list-label]')).map(n=>n.textContent).join(',')==='1º,2º,3º','Numeração de células vazias preservada');
 assert(dom.querySelector('td p')!.getAttribute('data-word-line')==='240','Estilo de espaçamento da tabela prevalece sobre o padrão do documento');
 assert((dom.querySelector('td p') as HTMLElement).style.marginBottom==='0pt','Parágrafos da tabela sem espaço extra herdado');
 assert((dom.querySelectorAll('tr')[1].cells[0] as HTMLElement).style.borderTopStyle==='none','Bordas internas respeitam nil em vez de copiar bordas externas');
 const header=parse(settings.headerHtml!),image=header.querySelector('img')!;
 const top=settings.headerDistanceCm!+parseFloat(image.style.top);
 assert(top>=0&&top+parseFloat(image.style.height)*2.54/96<settings.topMarginCm!,'Imagem do cabeçalho inteira dentro da folha');
 const now=new Date().toISOString(),blob=await createDocxBlob({id:'qa',title:'QA',content:imported.html,pages:settings.pages,shapes:[],images:[],createdAt:now,updatedAt:now,...settings});
 const exported=await JSZip.loadAsync(await blob.arrayBuffer());
 const xml=new DOMParser().parseFromString(await exported.file('word/header1.xml')!.async('string'),'application/xml');
 assert(xml.getElementsByTagNameNS(WP,'positionV')[0]?.getAttribute('relativeFrom')==='page','Âncora do cabeçalho exportada com coordenadas estáveis');
 const reopened=await importWordFile(new File([blob],'reaberto.docx'));
 assert(reopened.settings!.pages!.length===1,'Exportar e reabrir conserva uma folha');
 assert(Math.abs(reopened.settings!.topMarginCm!-settings.topMarginCm!)<.02,'Exportar e reabrir não aumenta a margem');
 const once=await importWordFile(await fixture(p('Antes')+'<w:p><w:r><w:br w:type="page"/></w:r></w:p>'+p('Depois')));
 assert(once.settings!.pages!.length===2,'Quebra explícita não inventa parágrafos nem folhas vazias');
 const twice=await importWordFile(await fixture(p('Antes')+'<w:p><w:r><w:br w:type="page"/><w:br w:type="page"/></w:r></w:p>'+p('Depois')));
 assert(twice.settings!.pages!.length===3,'Folha vazia explicitamente solicitada no arquivo é preservada');
 const longPages=paginateWordHtml('<p style="height:18px"></p><table>'+Array.from({length:12},(_,i)=>`<tr style="height:120px"><td>Linha ${i}</td></tr>`).join('')+'</table>',{});
 assert(longPages.length>1&&longPages.every(page=>new DOMParser().parseFromString(page,'text/html').querySelector('table')),'Parágrafo vazio antes de tabela longa não vira uma página separada');
 const result={passed:true,checks:checks.length,topMargin:settings.topMarginCm,viewport:{width:innerWidth,height:innerHeight},details:checks};
 document.querySelector('#result')!.textContent=JSON.stringify(result,null,2);
}
run().catch(error=>document.querySelector('#result')!.textContent=JSON.stringify({passed:false,error:error.message,checks},null,2));

