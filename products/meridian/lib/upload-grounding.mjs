const fail=()=>{throw Error('Low confidence: the uploaded-data query could not be validated. Your previous answer is unchanged.');};
export function compareUploadPlans(first,second,source){
 function normalize(p){
  if(!p||!Array.isArray(p.tables)||!p.tables.length||new Set(p.tables).size!==p.tables.length||!['sum','average','count','min','max'].includes(p.aggregation))fail();
  const tables=p.tables.map(id=>source.find(t=>t.id===id));if(tables.some(t=>!t))fail();
  const filters=p.filters||[];if(!Array.isArray(filters)||filters.length>12||filters.some(f=>!['eq','gt','gte','lt','lte','contains'].includes(f.op)||!['string','number'].includes(typeof f.value)))fail();
  for(const t of tables)for(const name of [p.aggregation==='count'?null:p.metric,p.groupBy,...filters.map(f=>f.column)].filter(Boolean))if(!t.columns.some(c=>c.name===name))fail();
  return {tables:[...p.tables].sort(),metric:p.aggregation==='count'?'':p.metric,aggregation:p.aggregation,groupBy:p.groupBy||null,grain:p.grain||null,unit:p.unit,filters:[...filters].map(f=>({column:f.column,op:f.op,value:f.value})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))};
 }
 if(JSON.stringify(normalize(first))!==JSON.stringify(normalize(second)))fail();
 return {status:'checked',metric:first.metric||'Row count',checks:['independent-intent-review','exact-column-check','aggregation-and-filter-agreement']};
}

export function validateUploadPlan(plan,source){compareUploadPlans(plan,plan,source);return {status:"checked",metric:plan.metric||"Row count",checks:["exact-column-check","aggregation-and-filter-validation"]};}
