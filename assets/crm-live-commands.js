const clean=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[’']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
// Spoken lead-ins carry no intent; strip them so "okay, mark it done" reads as "mark it done".
const LEAD=/^(?:ok(?:ay)?|so|now|and|then|yes|yeah|yep|alright|all right|right|hey|um+|uh+|hmm+|well|also|please|just|actually|great|cool|thanks|thank you|can you|could you|would you|will you|lets|let us|go ahead and|i want to|i want you to|i need you to|id like to|i would like to)\s+/;
// Intent is recognised anywhere in the sentence. Reply wins over dismissal so "reply saying not interested" drafts, never dismisses.
const REPLY=/\b(?:reply|replies|respond|response|answer|write back|get back to|draft|compose|write (?:a |an )?(?:quick |short |brief )?(?:email|note|message|response|reply)|send (?:them |him |her )?(?:a |an )?(?:quick |short |brief )?(?:reply|response|note))\b/;
const NOT_IMPORTANT=/\b(?:not important|unimportant|not relevant|irrelevant|not needed|no longer relevant|not interested|ignore|dismiss|discard|remove|get rid of|junk|spam|trash)\b/;
const DONE=/\bas read\b|\bmark(?:ed)? (?:it |this |that )?read\b|\b(?:done|complete|completed|finish|finished|handled|taken care of|resolve|resolved|archive|check (?:it |this |that )?off|tick (?:it |this |that )?off|wrap (?:it |this |that )?up|wrapped up)\b/;
const SELECT=/\b(?:go to|goto|go back|select|show|open|highlight|pick|jump to|move to|switch to|focus on|look at|bring up|pull up|find)\b/;
const CONTENT=/\b(?:saying|that says|telling (?:them|him|her)|to say|and say|and tell (?:them|him|her)|with)\s+(.+)$/;
const PRONOUN=new Set(['it','its','this','that','selected','current','same']);
const STOP=new Set(['please','mark','marked','market','marks','marc','mart','as','to','the','a','an','one','ones','card','item','project','email','mail','message','thread','lead','conversation','deal','task','for','me','now','right','away','then','and','also','just','ok','okay','so','yes','thanks','thank','you','is','be','can','could','would','will','we','i','of','on','in','up','again','quickly','quick','real','go','show','select','highlight','open','pick','jump','move','switch','focus','look','at','bring','pull','find','back','as','well','there','here','let','lets','us','do','should','want','need','like','it','its','this','that','selected','current','same','mail','reply','next','previous','all','set','ive','im','weve','already','have','has','been','they','them','him','her','my','our','your','about','ill','got','gotten','did','that','can','it']);
const ORDINALS=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];
const distance=(a,b)=>{let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}return row[b.length];};
// Command words as speech recognition tends to mangle them: "market" is "mark it", "reply too" is "reply to".
const SPOKEN=[...['mark','reply','done','set','go'].flatMap(a=>['it','this','that','as','to','its'].map(b=>a+b)),'mark','reply','done','complete','important','select','this','that','it','as'];
const misheard=word=>word.length<3||SPOKEN.some(w=>distance(word,w)<=Math.max(1,Math.floor(w.length/4)));
const targetCard=(card,extra={})=>({id:card.id,tab:card.tab,lastMessageId:card.lastMessageId,...extra});
export function resolveCommand(utterance,cards,selectedId=null){
 let text=clean(utterance);for(let previous;previous!==text;){previous=text;text=text.replace(LEAD,'');}
 const selected=cards.find(c=>c.id===selectedId);
 if(/^scroll\s+(?:down|up)\b|^(?:page|scroll)\s+(?:down|up)$/.test(text))return {action:'scroll',direction:text.includes('down')?'down':'up'};
 if(/\b(?:who (?:is|was) (?:it|this|that) (?:written|sent) to|recipient)\b/.test(text))return selected?{action:'recipient',id:selectedId}:{error:'Select a visible card first.'};
 if(/\b(?:do not|dont|don t|cancel|never mind|nevermind|not yet|hold on)\b|\bnot (?:done|complete|completed|finished|handled)\b/.test(text))return {error:'No action taken.',negated:true};
 if(/^(?:should|would|what|whats|is|are|was|did|do i|can i|could i|why|how|when|where)\b/.test(text))return {error:'Please give an explicit command. No action taken.'};
 const reply=REPLY.exec(text);
 if(!reply&&/\b(?:send|email it now)\b/.test(text))return {error:'Review the draft and click Send this reply. Voice never sends.'};
 // A reply's guidance ("saying ...") is content, not a command or a card name.
 const content=reply?CONTENT.exec(text.slice(reply.index)):null,head=content?text.slice(0,reply.index+content.index):text;
 const replyIntent=content?(String(utterance).match(new RegExp(REPLY.source+'[\\s\\S]*?'+CONTENT.source,'iu'))?.at(-1)||content[1]).trim().replace(/[.!?]+$/,''):'';
 const action=reply?'reply':NOT_IMPORTANT.test(head)?'notImportant':DONE.test(head)?'done':SELECT.test(head)?'select':null;
 const extra=action==='reply'?{replyIntent}:{};
 const words=head.replace(REPLY,' ').replace(NOT_IMPORTANT,' ').replace(DONE,' ').split(' ').filter(Boolean);
 const pronoun=words.some(w=>PRONOUN.has(w));
 const ordinal=words.find(w=>ORDINALS.includes(w)),number=head.match(/\b(?:number|item|card|one)\s+(\d+)\b/)||head.match(/\b(\d+)(?:st|nd|rd|th)\b/);
 if(ordinal||number){const card=ordinal?cards[ORDINALS.indexOf(ordinal)]:cards[Number(number[1])-1];return card?targetCard(card,{action:action||'select',...extra}):{action,error:'Which displayed card? Say its number or title.'};}
 if(/\blast (?:one|card|item)\b/.test(head))return targetCard(cards.at(-1),{action:action||'select',...extra});
 if(/\blast (?:email|mail)\b/.test(head))return selected?targetCard(selected,{action:action||'select',...extra}):{action,error:'Select a visible card first.'};
 // Only a whole navigation command moves on; "next week" inside reply guidance never does.
 if((!action||action==='select')&&/^(?:(?:go|move|jump|skip|switch) (?:on )?(?:to )?(?:the )?|(?:select|show|open|highlight) (?:me )?(?:the )?)?(?:next|previous|go back)(?: (?:one|card|item|email|mail|project|lead|thread|message|please))*$/.test(head)){
  const index=cards.findIndex(c=>c.id===selectedId),step=/\bnext\b/.test(head)?1:-1,card=cards[index<0?(step>0?0:cards.length-1):index+step];
  return card?targetCard(card,{action:'select'}):{action:'select',error:step>0?'No next visible item.':'No previous visible item.'};
 }
 const target=words.filter(w=>!STOP.has(w)).join(' ');
 if(target){
  const matches=cards.filter(c=>{const title=clean(c.title+' '+(c.company||''));return title.includes(target)||title.replaceAll(' ','').includes(target.replaceAll(' ',''))||target.split(' ').filter(w=>w.length>2).every(w=>title.includes(w));});
  if(matches.length===1)return targetCard(matches[0],{action:action||'select',...extra});
  if(matches.length>1)return {action,...extra,target,options:matches.slice(0,3).map(c=>String(c.title).split(/\s+/).slice(0,3).join(' ')),error:'Which matching card do you mean? Use its visible number.'};
  // Leftover words that resemble no visible title are speech-recognition noise ("market is done"):
  // a clear action then applies to the selected card. Otherwise JEV classifies the target (and intent, if none was heard).
  if(selected&&action&&action!=='select'&&target.split(' ').every(misheard))return targetCard(selected,{action,...extra});
  return {action,...extra,target,ask:true,classify:!action,error:'Which displayed card? Say its number or title.'};
 }
 if(selected&&(pronoun||action&&action!=='select'))return targetCard(selected,{action:action||'select',...extra});
 return {action,...extra,error:selected||!pronoun&&!action?'Which displayed card? Say its number or title.':'Select a visible card first.'};
}
