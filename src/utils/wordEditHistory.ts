export type WordEdit = {before:string[];after:string[];bytes:number;group?:string;time:number};
export const cleanWordCaret=(html:string)=>html.replace(/<span\b[^>]*\bdata-word-caret=(?:"[^"]*"|'[^']*')[^>]*><\/span>/gi,'');
const equal=(a:string[],b:string[])=>a.length===b.length&&a.every((html,index)=>html===b[index]);
const size=(a:string[],b:string[])=>Array.from({length:Math.max(a.length,b.length)},(_,i)=>a[i]===b[i]?0:((a[i]?.length||0)+(b[i]?.length||0))*2).reduce((sum,value)=>sum+value,0);
/** App-owned body history survives imported DOM replacement and repagination. */
export class WordEditHistory {
  private current:string[];
  private undoStack:WordEdit[]=[];
  private redoStack:WordEdit[]=[];
  constructor(pages:string[]){this.current=pages.map(cleanWordCaret);}
  reset(pages:string[]){this.current=pages.map(cleanWordCaret);this.undoStack=[];this.redoStack=[];}
  record(pages:string[],group?:string,time=Date.now()){
    const next=pages.map((html,index)=>{const clean=cleanWordCaret(html);return clean===this.current[index]?this.current[index]:clean;});
    if(equal(this.current,next))return false;
    const previous=this.undoStack.at(-1);
    if(group&&previous?.group===group&&!this.redoStack.length&&time-previous.time<750){previous.after=next;previous.time=time;previous.bytes=size(previous.before,next);}
    else this.undoStack.push({before:this.current,after:next,bytes:size(this.current,next),group,time});
    this.current=next;this.redoStack=[];
    let bytes=this.undoStack.reduce((total,edit)=>total+edit.bytes,0);
    // Keep one large edit undoable, while bounding ordinary editing sessions.
    while(this.undoStack.length>1&&(this.undoStack.length>50||bytes>40*1024*1024))bytes-=this.undoStack.shift()!.bytes;
    return true;
  }
  step(command:'undo'|'redo',livePages:string[]):string[]|null{
    this.record(livePages);
    const from=command==='undo'?this.undoStack:this.redoStack,to=command==='undo'?this.redoStack:this.undoStack;
    const edit=from.pop();if(!edit)return null;to.push(edit);
    this.current=command==='undo'?edit.before:edit.after;
    return [...this.current];
  }
}
