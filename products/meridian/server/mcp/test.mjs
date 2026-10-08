import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
test('MCP transport, every read tool, reconciled evidence, rejected writes and origins',async()=>{
 const children=[];const start=(file,env)=>{const p=spawn(process.execPath,[file],{env:{...process.env,...env},stdio:'pipe'});children.push(p);p.stderr.on('data',b=>process.stderr.write(b));return p;};
 const client=new Client({name:'meridian-test',version:'1.0.0'});
 try{
 start(new URL('../api.mjs',import.meta.url).pathname,{PORT:'8088',DATA_DIR:process.env.BASE_DATA_DIR});start(new URL('./server.mjs',import.meta.url).pathname,{PORT:'8089',LOCAL_BACKEND:'1',DUCKDB_URL:'http://127.0.0.1:8088',PUBLIC_ORIGIN:'http://127.0.0.1:8089'});
 for(let i=0;i<100;i++){try{const r=await fetch('http://127.0.0.1:8088/health');const s=await fetch('http://127.0.0.1:8089/health');if(r.ok&&s.ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
 await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1:8089/mcp')));
 const list=await client.listTools();assert.equal(list.tools.length,5);assert.ok(list.tools.every(t=>t.annotations.readOnlyHint));
 const call=async(name,args={})=>{const r=await client.callTool({name,arguments:args});return {raw:r,value:JSON.parse(r.content[0].text)};};
 const s=await call('get_schema');assert.equal(s.value.synthetic,true);assert.deepEqual(s.value.reportingPolicy.requiredBreakdowns,['category','channel']);
 const q=await call('query_sales',{sql:'SELECT count(*)::INTEGER n FROM orders'});assert.ok(q.value.rows[0].n>0);
 for(const sql of ['DELETE FROM orders','SELECT 1; SELECT 2',"SELECT * FROM read_csv('/etc/passwd')"]){const r=await call('query_sales',{sql});assert.equal(r.raw.isError,true);}
 const intelligence=await call('get_sales_intelligence');assert.equal(intelligence.raw.isError,undefined,JSON.stringify(intelligence.value));const report=intelligence.value;assert.equal(report.dataThrough,s.value.period.end);assert.ok(Math.abs(report.attribution.unexplained)<.01);assert.equal(report.currency,'USD');assert.ok(report.presentation.nextQuestions.length);for(const dimension of ['category','channel'])assert.ok(Math.abs(report.presentation.breakdowns[dimension].reduce((sum,row)=>sum+row.current,0)-report.current.revenue)<.01);
 const docs=(await call('search',{query:'sales'})).value;assert.ok(docs.results.length);const doc=(await call('fetch',{id:docs.results[0].id})).value;assert.ok(doc.text);
 for(const id of ['sales-dashboard','sales-drop-analysis']){const dashboard=(await call('fetch',{id})).value;assert.equal(dashboard.metadata.contentType,'text/html');assert.match(dashboard.text,/data-dashboard-layout="compact-v2"/);assert.equal(dashboard.metadata.datasetVersion,report.datasetVersion);}
 const denied=await fetch('http://127.0.0.1:8089/mcp',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,403);
 const fresh=(await call('query_sales',{sql:'SELECT count(*)::INTEGER n FROM orders'})).value;assert.equal(fresh.rows[0].n,q.value.rows[0].n);
 }finally{await client.close().catch(()=>{});for(const p of children)p.kill('SIGTERM');}
});
