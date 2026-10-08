export const generationModel=process.env.DATA_GENERATION_MODEL||'gemini-3.5-flash-lite';
export function yesterdayBerlin(now=new Date()){
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);return new Date(Date.parse(date+'T12:00:00Z')-86400000).toISOString().slice(0,10);
}
export const nextDay=d=>new Date(Date.parse(d+'T12:00:00Z')+86400000).toISOString().slice(0,10);
export function validateScenario(s){
 if(!s||!['normal','paid_traffic_drop','mobile_checkout','category_campaign','basket_shift'].includes(s.kind))throw Error('Invalid scenario kind');
 for(const [key,min,max] of [['volumeFactor',.7,1.3],['priceFactor',.85,1.08],['paidTrafficFactor',.65,1.3],['mobileCancellationPct',5,30],['promotionPct',0,25]])if(typeof s[key]!=='number'||!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw Error(`Invalid scenario ${key}`);
 if(typeof s.summary!=='string'||s.summary.length>400)throw Error('Invalid scenario summary');return s;
}
export async function planScenarios(dates,previous=[]){
 if(!process.env.GEMINI_API_KEY)throw Error('Daily generation requires the low-cost Gemini key');
 const prompt=`Generate synthetic ecommerce scenario parameters only, never SQL or customer data. Dates: ${dates.join(', ')}. Prior days: ${JSON.stringify(previous)}. Return JSON {days:[{date,kind,volumeFactor,priceFactor,paidTrafficFactor,mobileCancellationPct,promotionPct,summary}]}, exactly one day per requested date. kind: normal, paid_traffic_drop, mobile_checkout, category_campaign, basket_shift. Normal days are most common; occasional 1-3 day coherent events should affect only their named driver. volumeFactor 0.7-1.3 (usually 0.92-1.08); priceFactor 0.85-1.08 (normally 1); paidTrafficFactor 0.65-1.3 (normally 1); mobileCancellationPct 5-30 (normally 5); promotionPct 0-25 (normally 0). Include plausible weekday variation, an occasional negative event and recovery, not daily crises. summary is a short fictional scenario label, never a claim about real companies. Data will be USD and daily completed periods.`;
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${generationModel}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:.7,maxOutputTokens:Math.max(1500,dates.length*300)}}),signal:AbortSignal.timeout(90000)});
 if(!r.ok){const error=await r.json().catch(()=>({}));throw Error(`Low-cost generation failed (${r.status}): ${error.error?.message?.slice(0,500)||'Unavailable'}; no data published`);}const body=await r.json();const value=JSON.parse(body.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'{}');
 if(!Array.isArray(value.days)||value.days.length!==dates.length)throw Error('Generation omitted dates');
 const days=dates.map(date=>{const matches=value.days.filter(x=>x.date===date);if(matches.length!==1)throw Error('Generation date mismatch');return {...validateScenario(matches[0]),date,model:generationModel};});return {days,usage:body.usageMetadata};
}
