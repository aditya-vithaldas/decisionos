import {DuckDBInstance} from '@duckdb/node-api';
import {mkdir,readFile,copyFile,stat} from 'node:fs/promises';
import {latestSnapshot,downloadSnapshot,publishSnapshot} from './snapshot-store.mjs';
import {planScenarios,nextDay,yesterdayBerlin} from './daily-scenarios.mjs';
import {appendDay} from './append-day.mjs';
const directory=process.env.DAILY_WORK_DIR||'/tmp/meridian-daily';await mkdir(directory,{recursive:true});const path=directory+'/ecommerce.duckdb';
const previous=await latestSnapshot();if(previous)await downloadSnapshot(previous,path);else await copyFile((process.env.DATA_DIR||'data')+'/ecommerce.duckdb',path);
const baseSchema=previous?.schema||JSON.parse(await readFile((process.env.DATA_DIR||'data')+'/schema.json','utf8'));const end=yesterdayBerlin();
const db=await DuckDBInstance.create(path,{threads:'2',memory_limit:'2GB'});const c=await db.connect();
const one=async sql=>(await c.runAndReadAll(sql)).getRowObjectsJson()[0];const last=(await one('SELECT max(order_date)::VARCHAR date FROM orders')).date;
const dates=[];for(let d=nextDay(last);d<=end;d=nextDay(d))dates.push(d);
if(!dates.length){c.closeSync();db.closeSync();console.log(JSON.stringify({alreadyCurrent:true,through:last}));process.exit(0);}
if(dates.length>31)throw Error('More than 31 days missing; catch-up requires explicit operator review');
const planned=await planScenarios(dates,previous?.schema.recentScenarios||[]);
for(const s of planned.days)console.log(JSON.stringify(await appendDay(c,s.date,s)));
await c.run('ANALYZE; CHECKPOINT');const tables=[];for(const table of [...baseSchema.tables.map(t=>t.name),'generation_runs'].filter((v,i,a)=>a.indexOf(v)===i)){tables.push({name:table,rows:Number((await one(`SELECT count(*) n FROM ${table}`)).n),columns:(await c.runAndReadAll(`DESCRIBE ${table}`)).getRowObjectsJson().map(r=>({name:r.column_name,type:r.column_type}))});}
c.closeSync();db.closeSync();const schema={...baseSchema,version:`daily-${end}`,period:{start:baseSchema.period.start,end},tables,totalRows:tables.reduce((sum,t)=>sum+t.rows,0),databaseBytes:(await stat(path)).size,synthetic:true,updatedAt:new Date().toISOString(),generation:{model:planned.days[0].model,usage:planned.usage,schedule:'08:00 Europe/Berlin',dailyRowsGeneratedBy:'Validated deterministic SQL from low-cost model scenario parameters'},recentScenarios:[...(previous?.schema.recentScenarios||[]),...planned.days].slice(-7),rules:baseSchema.rules.filter(r=>!r.includes('Latest demo date')&&!r.startsWith('All records, business events')).concat([`Synthetic sample data covers ${baseSchema.period.start} through ${end}. All amounts are USD. Previous day is the latest complete date. No intraday data exists.`,`generation_runs records actual model and generated scenario parameters for each appended day. Scenario context does not prove external causation.`,`Resolve relative dates against ${end}. Data is extended each morning; never fabricate future rows.`])};
const published=await publishSnapshot(path,schema,previous);console.log(JSON.stringify({published:true,through:end,totalRows:schema.totalRows,object:published.object,model:schema.generation.model}));
