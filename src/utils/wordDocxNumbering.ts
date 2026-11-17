const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const child=(el:Element|undefined,name:string)=>Array.from(el?.children||[]).find(n=>n.namespaceURI===W&&n.localName===name);
const value=(el:Element|undefined,name='val')=>el?.getAttributeNS(W,name)||'';
const roman=(n:number)=>{let result='';for(const [amount,label] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']] as const){while(n>=amount){result+=label;n-=amount;}}return result;};
function format(n:number,kind:string){
  if(kind==='lowerLetter'||kind==='upperLetter'){let label='';while(n>0){n--;label=String.fromCharCode(65+n%26)+label;n=Math.floor(n/26);}return kind==='lowerLetter'?label.toLowerCase():label;}
  if(kind==='lowerRoman'||kind==='upperRoman'){const label=roman(Math.min(3999,Math.max(1,n)));return kind==='lowerRoman'?label.toLowerCase():label;}
  return kind==='decimalZero'?String(n).padStart(2,'0'):String(n);
}
/** Resolve list counters from OOXML, including numbered paragraphs with no text. */
export function docxNumberLabels(numbering:Document|null,paragraphs:Element[],styles:Map<string,Element>){
  const labels=new Map<Element,{text:string;id:string;level:number}>();if(!numbering)return labels;
  const nums=new Map(Array.from(numbering.getElementsByTagNameNS(W,'num')).map(n=>[value(n,'numId'),n]));
  const abstracts=new Map(Array.from(numbering.getElementsByTagNameNS(W,'abstractNum')).map(n=>[value(n,'abstractNumId'),n]));
  const counters=new Map<string,number[]>();
  const properties=(p:Element)=>{let props=child(p,'pPr'),num=child(props,'numPr');const seen=new Set<string>();let id=value(child(props,'pStyle'));while(!num&&id&&!seen.has(id)){seen.add(id);const s=styles.get(id);num=child(child(s,'pPr'),'numPr');id=value(child(s,'basedOn'));}return num;};
  for(const p of paragraphs){
    const props=properties(p),id=value(child(props,'numId'));if(!id||id==='0')continue;
    const level=Math.min(8,Math.max(0,Number(value(child(props,'ilvl'))||0))),num=nums.get(id),abstract=abstracts.get(value(child(num,'abstractNumId')));
    const override=Array.from(num?.children||[]).find(n=>n.localName==='lvlOverride'&&Number(value(n,'ilvl'))===level);
    const definition=child(override,'lvl')||Array.from(abstract?.children||[]).find(n=>n.localName==='lvl'&&Number(value(n,'ilvl'))===level);if(!definition)continue;
    const levels=counters.get(id)||[],start=Number(value(child(override,'startOverride'))||value(child(definition,'start'))||1);
    levels[level]=levels[level]===undefined?start:levels[level]+1;
    for(let i=level+1;i<9;i++){const deeper=Array.from(abstract?.children||[]).find(n=>n.localName==='lvl'&&Number(value(n,'ilvl'))===i);const restart=child(deeper,'lvlRestart');if(!restart||value(restart)!=='0')delete levels[i];}
    counters.set(id,levels);
    const kind=value(child(definition,'numFmt')),template=value(child(definition,'lvlText'))||`%${level+1}.`;
    const label=kind==='bullet'?(template.match(/[\u2022\u25cf\u25cb\u25a0\u2013\u002d]/)?.[0]||'•'):template.replace(/%([1-9])/g,(_,digit)=>{const index=Number(digit)-1,def=Array.from(abstract?.children||[]).find(n=>n.localName==='lvl'&&Number(value(n,'ilvl'))===index);return format(levels[index]??Number(value(child(def,'start'))||1),value(child(def,'numFmt')));});
    labels.set(p,{text:label,id,level});
  }
  return labels;
}
