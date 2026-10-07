const clean=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function resolveCommand(utterance,cards,selectedId=null){
 const text=clean(utterance).replace(/^(?:please|can you|could you|would you)\s+/,'');
 if(/^scroll\s+(?:down|up)\b/.test(text))return {action:'scroll',direction:text.includes('down')?'down':'up'};
 if(/\b(?:who (?:is|was) (?:it|this|that) (?:written|sent) to|recipient)\b/.test(text))return cards.some(c=>c.id===selectedId)?{action:'recipient',id:selectedId}:{error:'Select a visible card first.'};
 if(/^(?:should|would|what|is|can i|could i)\b/.test(text))return {error:'Please give an explicit command. No action taken.'};
 if(/\b(?:send|email it now)\b/.test(text))return {error:'Review the draft and click Send this reply. Voice never sends.'};
 if(/\b(?:do not|dont|don t|cancel)\b/.test(text))return {error:'No action taken.'};
 const action=/^(?:mark|discard|remove)\b.*\b(?:not important|discard|remove)\b|^(?:discard|remove|not important)\b/.test(text)?'notImportant':/^(?:mark|set)\b.*\bdone\b|^done$|^complete\b/.test(text)?'done':/^(?:reply|respond)\b/.test(text)?'reply':'select';
 const ordinals=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];
 const word=text.split(' ').find(w=>ordinals.includes(w)),number=text.match(/\b(?:number|item|card|one)\s+(\d+)\b/) || text.match(/\b(\d+)(?:st|nd|rd|th)\b/);
 let matches=word?[cards[ordinals.indexOf(word)]]:number?[cards[Number(number[1])-1]]:/\blast (?:one|card|item)\b/.test(text)?[cards.at(-1)]:[];
 if(/^(?:done|complete|mark done|mark as done|not important|mark not important|reply|respond)$/.test(text))return cards.some(c=>c.id===selectedId)?{action,id:selectedId,tab:cards.find(c=>c.id===selectedId).tab,lastMessageId:cards.find(c=>c.id===selectedId).lastMessageId,replyIntent:''}:{action,error:'Select a visible card first.'};
 if(/\blast (?:email|mail)\b/.test(text))return cards.some(c=>c.id===selectedId)?{action,id:selectedId,tab:cards.find(c=>c.id===selectedId).tab,lastMessageId:cards.find(c=>c.id===selectedId).lastMessageId}:{action,error:'Select a visible card first.'};
 if(!word&&!number){
   const target=text.replace(/\b(?:please|show|select|highlight|go|open|mark|as|done|not important|discard|remove|reply|respond|to|the|one|card|item|with)\b/g,' ').replace(/\s+/g,' ').trim().split(/\b(?:saying|with details)\b/)[0].trim();
   if(/\b(?:it|this|that|selected)\b/.test(target)){if(!cards.some(c=>c.id===selectedId))return {action,error:'Select a visible card first.'};matches=cards.filter(c=>c.id===selectedId);}
   else if(target)matches=cards.filter(c=>{const title=clean(c.title+' '+(c.company||''));return title.includes(target)||title.replaceAll(' ','').includes(target.replaceAll(' ',''))||target.split(' ').filter(w=>w.length>2).every(w=>title.includes(w));});
 }
 matches=matches.filter(Boolean);
 if(matches.length!==1)return {action,replyIntent:action==='reply'?(utterance.match(/\b(?:with|saying|that)\s+(.+)$/i)?.[1]||''):'',error:matches.length?'Which matching card do you mean? Use its visible number.':'Which displayed card? Say its number or title.'};
 return {action,id:matches[0].id,tab:matches[0].tab,lastMessageId:matches[0].lastMessageId,replyIntent:action==='reply'?(utterance.match(/\b(?:with|saying|that)\s+(.+)$/i)?.[1]||''):''};
}
