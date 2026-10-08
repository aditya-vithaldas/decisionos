import {createServer} from 'node:http';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {ListToolsRequestSchema,CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {backend,sqlQuery} from './backend.mjs';
import {salesIntelligence} from './intelligence.mjs';
const annotations={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
const object=(properties={},required=[])=>({type:'object',properties,required,additionalProperties:false});
const tools=[
 {name:'get_schema',description:'Read table names, columns, relationships, business metric definitions, generation model, and latest complete date of the continuously updated synthetic Meridian commerce database. Read this before SQL.',inputSchema:object()},
 {name:'query_sales',description:'Execute one bounded read-only SQL SELECT/CTE against documented synthetic ecommerce tables. Maximum 1,000 rows and 8 seconds. Revenue is completed orders net amount in USD; avoid duplicating order totals across item joins.',inputSchema:object({sql:{type:'string',maxLength:12000}},['sql'])},
 {name:'get_sales_intelligence',description:'Read the exact evidence used by the Sales Intelligence Dashboard: latest complete day versus same weekday last week, revenue trend, top products, reconciled traffic/conversion/basket decomposition, category/region/channel changes, devices, and synthetic scenario context. Separates measured contribution from unproven causality.',inputSchema:object()},
 {name:'search',description:'Search the synthetic dataset documentation and sales intelligence source for citations.',inputSchema:object({query:{type:'string',maxLength:200}},['query'])},
 {name:'fetch',description:'Fetch a documentation source returned by search, including the current sales intelligence evidence.',inputSchema:object({id:{type:'string',maxLength:80}},['id'])}
].map(t=>({...t,annotations}));
const json=x=>({content:[{type:'text',text:JSON.stringify(x)}]});
async function call(name,a,origin){
 if(name==='get_schema')return json(await backend('/schema'));
 if(name==='query_sales'){if(typeof a.sql!=='string'||a.sql.length>12000)throw Error('sql is required');return json(await sqlQuery(a.sql));}
 if(name==='get_sales_intelligence')return json(await salesIntelligence());
 if(name==='search'){if(typeof a.query!=='string'||a.query.length>200)throw Error('query is required');const s=await backend('/schema'),q=a.query.toLowerCase();const all=[{id:'schema',title:'Meridian synthetic commerce schema'},{id:'sales-intelligence',title:'Sales Intelligence Dashboard evidence'},...s.tables.map(t=>({id:`table-${t.name}`,title:`${t.name} table documentation`}))];return json({results:all.filter(x=>!q||x.title.toLowerCase().includes(q)||/sales|revenue|rca|commerce/.test(q)&&x.id==='sales-intelligence').map(x=>({...x,url:origin+'/source/'+x.id}))});}
 if(name==='fetch'){if(typeof a.id!=='string')throw Error('id is required');return json(await source(a.id,origin));}
 throw Error('Unknown tool');
}
async function source(id,origin){const s=await backend('/schema');let text;if(id==='sales-intelligence')text=JSON.stringify(await salesIntelligence());else if(id==='schema')text=JSON.stringify(s);else if(id.startsWith('table-')){const t=s.tables.find(t=>t.name===id.slice(6));if(!t)throw Error('Unknown source');text=JSON.stringify({table:t,rules:s.rules,period:s.period,synthetic:true});}else throw Error('Unknown source');return {id,title:id==='sales-intelligence'?'Sales intelligence evidence':id,text,url:origin+'/source/'+id,metadata:{synthetic:true,currency:'USD',datasetVersion:s.version}};}
const send=(res,status,body)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(body));
let active=0;
createServer(async(req,res)=>{
 const origin=process.env.PUBLIC_ORIGIN||`http://${req.headers.host}`,url=new URL(req.url,origin);
 if(active>=8)return send(res,429,{error:'Busy; retry shortly'});active++;res.on('close',()=>active--);
 try{
 if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true,synthetic:true,readOnly:true});
 if(req.method==='GET'&&url.pathname==='/schema')return send(res,200,await backend('/schema'));
 if(req.method==='GET'&&url.pathname==='/dashboard')return send(res,200,await salesIntelligence());
 if(req.method==='GET'&&url.pathname.startsWith('/source/'))return send(res,200,await source(decodeURIComponent(url.pathname.slice(8)),origin));
 if(url.pathname!=='/mcp')return send(res,404,{error:'Not found'});
 if(req.method!=='POST')return send(res,405,{error:'Use MCP Streamable HTTP POST'});
 if(req.headers.origin&&req.headers.origin!==origin&&!/^https:\/\/(chatgpt\.com|chat\.openai\.com)$/.test(req.headers.origin))return send(res,403,{error:'Origin rejected'});
 let body='';for await(const chunk of req){body+=chunk;if(body.length>20000)return send(res,413,{error:'Request too large'});}const message=JSON.parse(body);
 const server=new Server({name:'meridian-commerce',version:'1.0.0'},{capabilities:{tools:{}},instructions:'Read-only access to SYNTHETIC daily ecommerce data. All monetary amounts USD. Resolve relative dates from get_schema period.end. Data updates at 08:00 Berlin for the previous complete day. Use get_sales_intelligence for grounded RCA. Mathematical contributions and overlapping segments are not proof of external causes.'});
 server.setRequestHandler(ListToolsRequestSchema,async()=>({tools}));
 server.setRequestHandler(CallToolRequestSchema,async r=>{try{return await call(r.params.name,r.params.arguments||{},origin);}catch(e){return {...json({error:e.message}),isError:true};}});
 const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});await server.connect(transport);res.on('close',()=>{transport.close().catch(()=>{});server.close().catch(()=>{});});await transport.handleRequest(req,res,message);
 }catch(e){if(!res.headersSent)send(res,400,{error:e.message});}
}).listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('Meridian read-only commerce MCP ready'));
