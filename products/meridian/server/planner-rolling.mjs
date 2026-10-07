import {instructionFor,validateGuidance} from './planner.mjs';

const plans=new Map();

export function rollingInstruction(schema){
 const start=schema?.period?.start,end=schema?.period?.end;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(end||''))throw Error('Demo date range is unavailable.');
 const next=new Date(`${end}T00:00:00Z`);
 next.setUTCDate(next.getUTCDate()+1);
 const demoToday=next.toISOString().slice(0,10);
 const yesterday=end;
 const base=instructionFor(schema)
  .replace('Use the fixed 2025 dates from the schema, never current dates.',`Use the dataset dates ${start} through ${end}, never the wall-clock date.`)
  .replace('If no dates or context are given compare December with November 2025.',`If no dates or context are given, compare the last complete month in the dataset with the preceding month.`)
  .replace('For relative dates use 2025-12-31 as demo today, yesterday 2025-12-30.',`For relative dates use ${demoToday} as demo today and ${yesterday} as yesterday.`);
 return `${base}\nReturn a structured intent, never SQL. Return JSON with supported:boolean; reason when unsupported; intent:{metric,dimension,start,end,previousStart?,previousEnd?,status,filters:[{field,value}],limit}; and title,period,unit,kind,display,analysis,confidence,assumption,clarification,continuityNote,investigation when relevant. The filters field MUST be an array; use filters:[] when no filter was requested. Allowed metrics are revenue, orders, order_items, units, traffic, customers, aov, conversion. Allowed dimensions are none, day, week, month, year, category, product, customer, region, segment, channel, source, device, status. Use exact YYYY-MM-DD dates from ${start} through ${end}. For a question without dates, use the full dataset period. For relative dates, anchor on ${demoToday}; yesterday is ${yesterday}. Follow explicit dates and carry prior dates into ambiguous follow-ups. A single date has dimension none and display number unless a breakdown was requested. Revenue and AOV use completed orders by default; orders, items, and units use all statuses unless specified. Traffic uses all statuses. Filters are exact equality on category, product, customer, region, segment, channel, source, or device. Use at most eight filters. Use limit only for ranked products or customers. If the question asks for data outside the dataset or an unsupported calculation, return supported:false with a short reason. This date and structured-intent policy overrides any older fixed-year examples in the schema.`;
}

export async function planQuery(message,context,schema){
 const key=JSON.stringify({message:message.toLowerCase().trim(),context,schemaVersion:schema.version});
 const cached=plans.get(key);
 if(cached)return {...cached,planningMs:0,planCacheHit:true};
 const started=performance.now();
 const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',{
  method:'POST',
  headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},
  body:JSON.stringify({systemInstruction:{parts:[{text:rollingInstruction(schema)}]},contents:[{role:'user',parts:[{text:JSON.stringify({message,previous:context||null})}]}],generationConfig:{thinkingConfig:{thinkingLevel:'MINIMAL'},responseMimeType:'application/json',temperature:0,maxOutputTokens:2000}}),
  signal:AbortSignal.timeout(30000)
 });
 if(!response.ok)throw Error('Query planning is temporarily unavailable.');
 const body=await response.json();
 const plan=JSON.parse(body.candidates[0].content.parts.map(part=>part.text||'').join(''));
 if(plan.error)throw Error(plan.error);
 if(plan.intent?.filters&&!Array.isArray(plan.intent.filters)&&Object.keys(plan.intent.filters).length===0)plan.intent.filters=[];
 if(!['number','chart','table'].includes(plan.display)||!['USD','%','count'].includes(plan.unit))throw Error('The analyst returned an invalid display.');
 validateGuidance(plan);
 if(plans.size>=200)plans.delete(plans.keys().next().value);
 plans.set(key,plan);
 return {...plan,planningMs:performance.now()-started,planCacheHit:false};
}
