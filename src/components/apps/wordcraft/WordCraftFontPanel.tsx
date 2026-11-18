import {X} from 'lucide-react';
import type {FontState} from '../../../services/wordcraftFonts';

export function WordCraftFontPanel({state,onClose,onLoad,onScan}:{state:FontState;onClose:()=>void;onLoad:(family:string)=>void;onScan:()=>void}){
 return <aside className="craft-history craft-fonts" aria-label="Fontes por link">
  <header><h2>Fontes por link</h2><button aria-label="Fechar fontes" onClick={onClose}><X size={18}/></button></header>
  <p>As fontes abertas do catálogo são carregadas automaticamente quando faltam no documento. Você também pode carregá-las abaixo para usar na lista de fontes do editor.</p>
  <p>Uso temporário nesta sessão. Não instala fontes no computador nem cria arquivos em Downloads.</p>
  {state.warning&&<p role="alert">{state.warning}</p>}
  <div className="craft-font-status" role="status">{state.loading?`Carregando ${state.loading}…`:state.missing.length?`Fontes ainda ausentes: ${state.missing.join(', ')}`:'Nenhuma fonte ausente detectada.'}</div>
  <button onClick={onScan} disabled={!!state.loading}>Verificar documento</button>
  {state.catalog.map(font=><article key={font.family}>
   <strong>{font.family}</strong><small>{font.faces.length} arquivo(s) · <a href={font.license.url} target="_blank" rel="noreferrer">{font.license.spdx}</a></small>
   {state.errors[font.family]&&<p role="alert">{state.errors[font.family]}</p>}
   <button disabled={!!state.loading||state.loaded.includes(font.family)} onClick={()=>onLoad(font.family)}>{state.loaded.includes(font.family)?'Disponível nesta sessão':state.loading===font.family?'Carregando…':state.errors[font.family]?'Tentar novamente':'Carregar fonte'}</button>
  </article>)}
  <p>Para adicionar fontes, edite o arquivo <a href={`${import.meta.env.BASE_URL}wordcraft/fontes.json`} target="_blank" rel="noreferrer">fontes.json</a> com links diretos TTF/OTF e suas licenças. O servidor precisa permitir acesso CORS. Fontes fora do catálogo continuam usando a substituição indicada pelo WordCraft.</p>
 </aside>;
}
