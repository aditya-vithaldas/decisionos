export type GeneratedData={title:string;period:string;label:string;unit:'USD'|'%'|'count';aggregation:'sum'|'average';kind:string;axisType?:'time'|'category';secondaryLabel?:string;explanation?:string;points:{label:string;value:number;secondary?:number}[]};
const kinds=['area','line','bar','horizontal','stacked','pie','donut','scatter','funnel','heatmap','histogram','radar'];
export function validateGenerated(value:unknown):GeneratedData{
 const d=value as GeneratedData;if(!d||typeof d!=='object')throw Error('Expected chart data');
 for(const k of ['title','period','label'] as const)if(typeof d[k]!=='string'||!d[k].trim()||d[k].length>160)throw Error('Invalid chart label');
 if(!['USD','%','count'].includes(d.unit)||!['sum','average'].includes(d.aggregation)||!kinds.includes(d.kind))throw Error('Invalid chart settings');
 if(!Array.isArray(d.points)||!d.points.length||d.points.length>1000||d.points.some(p=>!p||typeof p.label!=='string'||p.label.length>100||typeof p.value!=='number'||!Number.isFinite(p.value)||Math.abs(p.value)>1e12||p.secondary!==undefined&&(typeof p.secondary!=='number'||!Number.isFinite(p.secondary)||Math.abs(p.secondary)>1e12)))throw Error('Invalid chart values');
 if(d.explanation!==undefined&&(typeof d.explanation!=='string'||d.explanation.length>2000))throw Error('Invalid explanation');
 if(d.secondaryLabel!==undefined&&(typeof d.secondaryLabel!=='string'||d.secondaryLabel.length>100))throw Error('Invalid secondary label');
 if(['pie','donut','funnel'].includes(d.kind)&&d.points.some(p=>p.value<0))throw Error('This chart requires non-negative values');
 return {title:d.title,period:d.period,label:d.label,unit:d.unit,aggregation:d.aggregation,kind:d.kind,axisType:d.axisType==='time'||d.axisType==='category'?d.axisType:undefined,secondaryLabel:d.secondaryLabel,explanation:d.explanation,points:d.points.map(p=>({label:p.label,value:p.value,...(p.secondary!==undefined?{secondary:p.secondary}:{})}))};
}
