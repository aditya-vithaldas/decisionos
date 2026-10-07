// SQL identifiers and expressions come only from this allowlist, never from the model.
export class GroundingError extends Error {constructor(message){super(message);this.name='GroundingError';}}
const fail=message=>{throw new GroundingError(message);};
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const metrics={revenue:{unit:'USD',label:'Revenue'},orders:{unit:'count',label:'Orders'},order_items:{unit:'count',label:'Order items'},units:{unit:'count',label:'Units sold'},traffic:{unit:'count',label:'Sessions'},customers:{unit:'count',label:'Purchasing customers'},aov:{unit:'USD',label:'Average order value'},conversion:{unit:'%',label:'Conversion'}};
const dimensions=['none','day','week','month','year','category','product','customer','region','segment','channel','source','device','status'];
const filterColumns={category:'cat.category_name',product:'p.product_name',customer:'c.customer_name',region:'r.region_name',segment:'c.segment',channel:'o.channel',source:'s.traffic_source',device:'s.device'};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function compileIntent(input){
 if(!input||typeof input!=='object'||!Object.hasOwn(metrics,input.metric)||!dimensions.includes(input.dimension))fail('Low confidence: this analysis is outside the verified metric definitions.');
 const i={...input,filters:input.filters||[],limit:input.limit??null,status:input.status||(input.metric==='revenue'||input.metric==='aov'?'completed':'all')};
 if(!validDate(i.start)||!validDate(i.end)||i.start>i.end)fail('Low confidence: the date range could not be verified.');
 if((i.previousStart||i.previousEnd)&&(!validDate(i.previousStart)||!validDate(i.previousEnd)||i.previousStart>i.previousEnd))fail('Low confidence: the comparison dates could not be verified.');
 if(!['all','completed','cancelled','returned'].includes(i.status)||!Array.isArray(i.filters)||i.filters.length>8)fail('Low confidence: the filters could not be verified.');
 if(i.limit!==null&&(!Number.isInteger(i.limit)||i.limit<1||i.limit>1000))fail('Low confidence: the ranking limit is invalid.');
 if(['category','region','segment','channel','source','device','status'].includes(i.dimension))i.limit=null;
 if(!['product','customer'].includes(i.dimension)&&i.limit!==null)fail('Low confidence: a top-N limit needs a ranked entity.');
 if(['product','customer'].includes(i.dimension)&&i.limit===null)i.limit=50;
 const session=['traffic','conversion'].includes(i.metric);
 const required=new Set([i.dimension]);
 for(const f of i.filters){if(!f||!Object.hasOwn(filterColumns,f.field)||typeof f.value!=='string'||!f.value.trim()||f.value.length>160)fail('Low confidence: an unsupported filter was requested.');required.add(f.field);}
 if(session&&[...required].some(d=>['category','product','channel','status'].includes(d)))fail('Low confidence: this session breakdown is not yet supported by the verified query builder.');
 if(!session&&[...required].some(d=>['source','device'].includes(d)))fail('Low confidence: use sales channel for orders, or traffic source/device for sessions.');
 if(i.metric==='traffic'&&i.status!=='all')fail('Low confidence: traffic counts all sessions, not an order-status subset.');
 const product=required.has('product')||required.has('category');
 const items=['order_items','units'].includes(i.metric)||product;
 if(i.metric==='aov'&&product)fail('Low confidence: category-level average order value needs a more explicit definition.');
 let from=session?'sessions s':'orders o';
 if(session&&i.metric==='conversion'&&i.status!=='all')from+=' LEFT JOIN orders o ON o.order_id=s.order_id';
 if(!session&&items)from+=' JOIN order_items oi ON oi.order_id=o.order_id';
 if(product)from+=' JOIN products p ON p.product_id=oi.product_id JOIN categories cat ON cat.category_id=p.category_id';
 if([...required].some(d=>['customer','region','segment'].includes(d)))from+=` JOIN customers c ON c.customer_id=${session?'s':'o'}.customer_id`;
 if(required.has('region'))from+=' JOIN regions r ON r.region_id=c.region_id';
 const date=session?'s.session_date':'o.order_date';
 const bucket={day:date,week:`date_trunc('week',${date})::DATE`,month:`strftime(${date},'%Y-%m')`,year:`year(${date})`};
 const group={category:['cat.category_id','cat.category_name'],product:['p.product_id','p.product_name'],customer:['c.customer_id','c.customer_name'],region:['r.region_id','r.region_name'],segment:['c.segment'],channel:['o.channel'],source:['s.traffic_source'],device:['s.device'],status:['o.status']}[i.dimension]||(bucket[i.dimension]?[bucket[i.dimension]]:[]);
 const label=group.length?`${group.at(-1)}::VARCHAR`:quote(metrics[i.metric].label);
 function expression(start,end){const period=`${date} BETWEEN DATE ${quote(start)} AND DATE ${quote(end)}`;const f=` FILTER (WHERE ${period})`;
  switch(i.metric){case 'revenue':return `COALESCE(SUM(${items?'oi':'o'}.net_amount)${f},0)`;case 'orders':return `COUNT(DISTINCT o.order_id)${f}`;case 'order_items':return `COUNT(oi.order_item_id)${f}`;case 'units':return `COALESCE(SUM(oi.quantity)${f},0)`;case 'traffic':return `COUNT(*)${f}`;case 'customers':return `COUNT(DISTINCT o.customer_id)${f}`;case 'aov':return `COALESCE(SUM(o.net_amount)${f}/NULLIF(COUNT(*)${f},0),0)`;case 'conversion':return `COALESCE(100.0*COUNT(s.order_id) FILTER (WHERE ${period}${i.status==='all'?'':` AND o.status=${quote(i.status)}`})/NULLIF(COUNT(*)${f},0),0)`;}
 }
 const start=i.previousStart&&i.previousStart<i.start?i.previousStart:i.start,end=i.previousEnd&&i.previousEnd>i.end?i.previousEnd:i.end;
 const predicates=[`${date} BETWEEN DATE ${quote(start)} AND DATE ${quote(end)}`];
 if(!session&&i.status!=='all')predicates.push(`o.status=${quote(i.status)}`);
 for(const f of i.filters)predicates.push(`${filterColumns[f.field]}=${quote(f.value)}`);
 const base=` FROM ${from} WHERE ${predicates.join(' AND ')}`;
 const values=`${expression(i.start,i.end)} AS "value"${i.previousStart?`, ${expression(i.previousStart,i.previousEnd)} AS "secondary"`:''}`;
 const sql=`SELECT ${label} AS "label", ${values}${base}${group.length?` GROUP BY ${group.join(', ')}`:''}${group.length?` ORDER BY ${bucket[i.dimension]?group[0]:i.previousStart?'ABS("value"-"secondary") DESC':'"value" DESC'}`:''}${i.limit?` LIMIT ${i.limit}`:''}`;
 const denominator=['aov','conversion'].includes(i.metric)?`, COUNT(*) FILTER (WHERE ${date} BETWEEN DATE ${quote(i.start)} AND DATE ${quote(i.end)}) AS support_count`:'';
 const totalSql=`SELECT 'Total' AS "label", ${values}${denominator}${base}`;
 const additive=!['aov','conversion','customers'].includes(i.metric)&&!(i.metric==='orders'&&product);
 const scope={start:i.start,end:i.end,previousStart:i.previousStart||null,previousEnd:i.previousEnd||null,status:i.status,filters:[...i.filters].sort((a,b)=>a.field.localeCompare(b.field)||a.value.localeCompare(b.value))};
 return {sql,totalSql,intent:i,unit:metrics[i.metric].unit,title:metrics[i.metric].label+(i.dimension==='none'?'':` by ${i.dimension}`)+(i.limit?` (top ${i.limit})`:''),metricKey:i.metric,scopeKey:JSON.stringify({...scope,dimension:i.dimension,limit:i.limit}),period:`${i.start} – ${i.end}${i.previousStart?` vs ${i.previousStart} – ${i.previousEnd}`:''}`,axisType:bucket[i.dimension]?'time':'category',additive};
}
export function reconcileRows(compiled,rows,totalRows){
 if(!Array.isArray(rows)||!rows.length||rows.length>1000||!Array.isArray(totalRows)||totalRows.length!==1)fail('Low confidence: the result could not be reconciled. No new answer was displayed.');
 if(['aov','conversion'].includes(compiled.intent.metric)&&Number(totalRows[0].support_count)===0)fail('Low confidence: there are no observations to calculate this rate or average.');
 const tolerance=n=>Math.max(.01,Math.abs(n)*1e-9);
 for(const field of compiled.intent.previousStart?['value','secondary']:['value']){
  const total=Number(totalRows[0][field]);if(!Number.isFinite(total))fail('Low confidence: the control total is invalid.');
  const values=rows.map(r=>Number(r[field]));if(values.some((n,index)=>rows[index][field]===null||!Number.isFinite(n)||n<0))fail('Low confidence: the query returned invalid values.');
  if(compiled.intent.metric==='conversion'&&values.some(n=>n>100))fail('Low confidence: conversion is outside its valid range.');
  if(compiled.additive){const sum=values.reduce((a,b)=>a+b,0);if(compiled.intent.limit?sum>total+tolerance(total):Math.abs(sum-total)>tolerance(total))fail('Low confidence: the breakdown does not reconcile to its control total. No new answer was displayed.');}
 }
 return {status:'checked',metric:compiled.metricKey,checks:['schema-and-grain','allowlisted-sql','independent-intent-review',compiled.additive?'control-total-reconciled':'non-additive-bounds'],scope:compiled.period};
}
