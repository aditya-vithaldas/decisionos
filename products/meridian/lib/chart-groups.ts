import type {GeneratedData} from './generated-data';
const dateLabel=/^(?:\d{4}(?:-\d{2}(?:-\d{2})?)?|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day)?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:[ ,.-]+\d{1,4})*(?:,? \d{4})?|\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?: \d{4})?|(?:Week|W|Q)\s*\d+(?:[ ,/-]+\d{4})?)$/i;
/** Compact categorical visuals only; source rows remain intact for drill-downs. */
export function chartGroups(data:GeneratedData,display?:string):{data:GeneratedData;note?:string}{
 if(display==='number'||display==='table'||data.points.length<=5||['scatter','histogram','funnel'].includes(data.kind))return {data};
 const temporal=['line','area','bar','stacked'].includes(data.kind)&&(data.axisType==='time'||data.axisType!=='category'&&data.points.every(p=>dateLabel.test(p.label.trim())));
 if(temporal)return {data};
 const ranked=[...data.points].sort((a,b)=>Math.abs(b.value)-Math.abs(a.value));const rest=ranked.slice(5);
 const aggregate=(values:number[])=>values.reduce((a,b)=>a+b,0)/(data.aggregation==='average'?values.length||1:1);
 const secondary=rest.filter(p=>p.secondary!==undefined).map(p=>p.secondary!);
 const other={label:'Everything else',value:aggregate(rest.map(p=>p.value)),...(secondary.length?{secondary:aggregate(secondary)}:{})};
 return {data:{...data,points:[...ranked.slice(0,5),other]},note:`${rest.length} ${rest.length===1?'category':'categories'} combined into Everything else.${data.aggregation==='average'?' Combined values are averages of the displayed group values.':''}`};
}
