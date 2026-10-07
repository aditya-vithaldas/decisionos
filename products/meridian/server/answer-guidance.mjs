const short=value=>typeof value==='string'?value.trim().slice(0,300):'';
export function answerGuidance(plan,points,context){
 const guidance={confidence:plan.confidence==='low'?'low':'high',assumption:short(plan.assumption),clarification:short(plan.clarification),continuityNote:short(plan.continuityNote),investigation:plan.investigation||null};
 if(guidance.investigation){const options=guidance.investigation.options;if(!Array.isArray(options)||options.length!==3||options.some(o=>typeof o?.label!=='string'||!o.label.trim()||o.label.length>80))throw Error('Invalid investigation options');guidance.investigation={options:options.map(o=>({label:o.label,question:`Investigate ${o.label} contributions to ${plan.title||'the selected metric'} (${plan.period||'the selected periods'}). Compare the current and previous periods from the baseline; report the measured direction of change.`}))};}
 if(guidance.clarification)for(const key of ['assumption','continuityNote'])guidance[key]=guidance[key].replaceAll(guidance.clarification,'').trim();
 const previous=context?.current;
 if(previous?.datasetVersion&&plan.datasetVersion&&previous.datasetVersion!==plan.datasetVersion){guidance.continuityNote='The dataset changed since the previous answer; the values are not directly comparable.';return guidance;}
 if(previous?.metricKey===plan.metricKey&&plan.metricKey&&previous.scopeKey===plan.scopeKey&&plan.scopeKey){
  const old=previous.result?.points;
  const changed=Array.isArray(old)?points.find(p=>old.some(o=>o.label===p.label&&Number.isFinite(o.value)&&Math.abs(o.value-p.value)>Math.max(.01,Math.abs(o.value)*1e-9))):null;
  if(changed){const before=old.find(o=>o.label===changed.label);guidance.confidence='low';guidance.continuityNote=`Previously ${before.value.toLocaleString('en-US')}; now ${changed.value.toLocaleString('en-US')} for ${changed.label}. Same stated scope; this discrepancy needs checking.`;}
 }
 return guidance;
}
export function resolveInvestigation(message,context){
 const options=context?.current?.guidance?.investigation?.options;
 if(!Array.isArray(options)||options.length!==3)return {message,context};
 const match=message.trim().match(/^(?:(?:please )?(?:show|choose|select|investigate|look at|do) )?(?:(?:step|option|number) )?(one|two|three|1|2|3)[.!?]?$/i);
 const index=match?({'one':0,'two':1,'three':2,'1':0,'2':1,'3':2}[match[1].toLowerCase()]):options.findIndex(o=>o.question===message||o.label.toLowerCase()===message.trim().toLowerCase());
 if(index===undefined||index<0)return {message,context};
 return {message:options[index].question,context:{...context,selectedInvestigation:options[index]}};
}
