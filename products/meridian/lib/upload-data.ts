import type {GeneratedData} from './generated-data';
export const MAX_UPLOAD_BYTES=10_000_000;
export type DataTable={id:string;file:string;sheet:string;columns:string[];rows:Record<string,string|number|boolean|null>[]};
export type UploadSet={bytes:number;files:string[];tables:DataTable[]};
export function checkUploadLimit(files:{size:number}[],existing=0){if(existing+files.reduce((n,f)=>n+f.size,0)>MAX_UPLOAD_BYTES)throw Error('This is a demo and supports a maximum of 10 MB of data in total. Please choose smaller files.');}
export async function parseUploads(files:File[],existing:UploadSet|null,progress:(n:number,label:string)=>void):Promise<UploadSet>{
 checkUploadLimit(files,existing?.bytes||0);const XLSX=await import('xlsx');if(files.some(f=>! /\.(csv|xlsx|xls)$/i.test(f.name)))throw Error('Choose CSV or Excel (.xlsx, .xls) files.');
 const tables:DataTable[]=[...(existing?.tables||[])];let done=0;const bytes=files.reduce((n,f)=>n+f.size,0);
 for(const file of files){progress(Math.round(done/bytes*90),`Reading ${file.name}`);const buffer=await file.arrayBuffer();await new Promise(r=>setTimeout(r,0));const book=XLSX.read(buffer,{type:'array',cellDates:true});
 for(const sheet of book.SheetNames){const grid=XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[sheet],{header:1,defval:null,blankrows:false});if(grid.length<2)continue;
 const columns=(grid[0] as unknown[]).map((c,i)=>String(c??`Column ${i+1}`).trim()||`Column ${i+1}`);if(new Set(columns).size!==columns.length)throw Error(`${file.name} / ${sheet} has duplicate column names. Please give each column a unique name.`);
 const rows=grid.slice(1).map(cells=>Object.fromEntries(columns.map((c,i)=>{const value=cells[i];return [c,value instanceof Date?`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`:typeof value==='number'||typeof value==='boolean'?value:value==null?null:String(value)];})) as DataTable['rows'][number]);
 tables.push({id:`table_${tables.length}`,file:file.webkitRelativePath||file.name,sheet,columns,rows});}
 done+=file.size;progress(Math.round(done/bytes*95),`Loaded ${file.name}`);await new Promise(r=>setTimeout(r,0));}
 if(tables.length===(existing?.tables.length||0))throw Error('No data rows found. Use a header row followed by data.');progress(100,'Ready');return {bytes:(existing?.bytes||0)+bytes,files:[...(existing?.files||[]),...files.map(f=>f.webkitRelativePath||f.name)],tables};
}
export function uploadSchema(data:UploadSet){return data.tables.map(t=>({id:t.id,file:t.file,sheet:t.sheet,rowCount:t.rows.length,columns:t.columns.map(name=>{const values=t.rows.map(r=>r[name]).filter(v=>v!==null);const dates=values.filter(v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v));return {name,type:dates.length===values.length&&values.length?'date':values.every(v=>typeof v==='number')?'number':'text',...(dates.length?{first:dates.reduce((a,b)=>String(a)<String(b)?a:b),last:dates.reduce((a,b)=>String(a)>String(b)?a:b)}:{})};})}));}
export type QueryPlan={tables:string[];metric:string;aggregation:'sum'|'average'|'count'|'min'|'max';groupBy?:string;grain?:'day'|'week'|'month'|'year';filters?:{column:string;op:'eq'|'gt'|'gte'|'lt'|'lte'|'contains';value:string|number}[];kind:GeneratedData['kind'];display:'number'|'chart'|'table';title:string;unit:GeneratedData['unit']};
export function evaluateQuery(data:UploadSet,plan:QueryPlan):{mode:'replace';display:QueryPlan['display'];generated:GeneratedData}{
 if(!plan||!Array.isArray(plan.tables)||!plan.tables.length||!['sum','average','count','min','max'].includes(plan.aggregation))throw Error('Please rephrase the data question.');
 const selected=plan.tables.map(id=>{const t=data.tables.find(t=>t.id===id);if(!t)throw Error('The requested table was not found.');return t;});
 if(new Set(plan.tables).size!==plan.tables.length)throw Error('Duplicate tables in the query.');
 for(const t of selected)for(const col of [plan.aggregation==='count'?undefined:plan.metric,plan.groupBy,...(plan.filters||[]).map(f=>f.column)].filter(Boolean))if(!t.columns.includes(col!))throw Error(`Column “${col}” is not in ${t.file} / ${t.sheet}.`);
 const groups=new Map<string,number[]>();for(const t of selected)for(const row of t.rows){if(!(plan.filters||[]).every(f=>{const v=row[f.column],a=typeof v==='number'?v:String(v??''),b=typeof v==='number'?Number(f.value):String(f.value);switch(f.op){case 'eq':return String(a).toLowerCase()===String(b).toLowerCase();case 'contains':return String(a).toLowerCase().includes(String(b).toLowerCase());case 'gte':return a>=b;case 'gt':return a>b;case 'lte':return a<=b;case 'lt':return a<b;default:throw Error('Unknown filter');}}))continue;
 let label=plan.groupBy?String(row[plan.groupBy]??'Unspecified'):'Total';if(plan.grain&&/^\d{4}-\d{2}-\d{2}/.test(label)){if(plan.grain==='month')label=label.slice(0,7);else if(plan.grain==='year')label=label.slice(0,4);else if(plan.grain==='week'){const d=new Date(label);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));label=d.toISOString().slice(0,10);}else label=label.slice(0,10);}
 const raw=plan.aggregation==='count'?1:row[plan.metric];if(raw===null||raw==='')continue;const value=typeof raw==='number'?raw:Number(String(raw).replace(/[$,]/g,''));if(!Number.isFinite(value))continue;const bucket=groups.get(label)||[];bucket.push(value);groups.set(label,bucket);}
 if(!groups.size)throw Error('No matching rows. Try a different date or filter.');
 const points=[...groups].map(([label,values])=>({label,value:plan.aggregation==='average'?values.reduce((a,b)=>a+b,0)/values.length:plan.aggregation==='min'?values.reduce((a,b)=>Math.min(a,b),Infinity):plan.aggregation==='max'?values.reduce((a,b)=>Math.max(a,b),-Infinity):values.reduce((a,b)=>a+b,0)})).sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true}));
 if(points.length>1000)throw Error('This query returns more than 1,000 groups. Ask for a broader time interval or a narrower filter. Your source data has not been changed.');
 return {mode:'replace',display:plan.display,generated:{title:plan.title,label:plan.metric||'Row count',period:'Uploaded data',unit:plan.unit,aggregation:plan.aggregation==='average'?'average':'sum',kind:plan.display==='number'?'bar':plan.kind,points}};
}

export function reconcileUpload(data:UploadSet,plan:QueryPlan,points:GeneratedData['points']){
 if(!['sum','count'].includes(plan.aggregation)||!plan.groupBy)return;
 const control=evaluateQuery(data,{...plan,groupBy:undefined,grain:undefined,display:'number'}).generated.points[0].value;
 const total=points.reduce((n,p)=>n+p.value,0);if(Math.abs(control-total)>Math.max(.01,Math.abs(control)*1e-9))throw Error('Low confidence: the uploaded breakdown does not reconcile to its total.');
}
