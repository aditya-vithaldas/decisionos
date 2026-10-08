import {DuckDBInstance,StatementType} from '@duckdb/node-api';
import {readFile,mkdir,unlink} from 'node:fs/promises';
import {latestSnapshot,downloadSnapshot} from './snapshot-store.mjs';
const directory=process.env.DATA_DIR||'data';
export let schema=JSON.parse(await readFile(`${directory}/schema.json`,'utf8'));
async function open(path,metadata){
 const db=await DuckDBInstance.create(path,{access_mode:'READ_ONLY',threads:process.env.DUCKDB_THREADS||'2',memory_limit:process.env.DUCKDB_MEMORY_LIMIT||'1GB',enable_external_access:'false',allow_community_extensions:'false',autoinstall_known_extensions:'false',autoload_known_extensions:'false'});
 const c=await db.connect();await c.run('SET lock_configuration=true');c.closeSync();return {db,schema:metadata,path,active:0,retired:false};
}
let state=await open(`${directory}/ecommerce.duckdb`,schema),generation=null,checkedAt=0,refreshPromise;
async function retire(old){if(old.active)return;old.db.closeSync();if(old.path.startsWith('/tmp/meridian-reader/'))await unlink(old.path).catch(()=>{});}
export async function refreshSnapshot(){
 if(refreshPromise)return refreshPromise;if(!process.env.SNAPSHOT_BUCKET||Date.now()-checkedAt<60000)return;
 refreshPromise=(async()=>{checkedAt=Date.now();const manifest=await latestSnapshot();if(!manifest||manifest.manifestGeneration===generation)return;await mkdir('/tmp/meridian-reader',{recursive:true});const path=`/tmp/meridian-reader/${manifest.manifestGeneration}.duckdb`;await downloadSnapshot(manifest,path);const replacement=await open(path,manifest.schema);const old=state;state=replacement;schema=replacement.schema;generation=manifest.manifestGeneration;old.retired=true;await retire(old);console.log(JSON.stringify({snapshotLoaded:schema.version,through:schema.period.end}));})();
 try{await refreshPromise;}finally{refreshPromise=null;}
}
await refreshSnapshot();
export async function queryDatabase(sql){
 if(typeof sql!=='string'||sql.length>12000||!/^\s*(select|with)\b/i.test(sql))throw Error('A read-only SELECT query is required.');
 if(/\b(information_schema|pg_catalog|duckdb_\w*|sqlite_\w*|read_\w*|glob|query|query_table|getenv|current_setting|generate_series|range)\s*[.(]/i.test(sql))throw Error('Only the documented demo tables may be queried.');
 await refreshSnapshot();const captured=state;captured.active++;const c=await captured.db.connect();let statement;const start=performance.now();const timeout=setTimeout(()=>c.interrupt(),8000);
 try{const statements=await c.extractStatements(sql);if(statements.count!==1)throw Error('Only one statement is allowed.');statement=await statements.prepare(0);if(statement.statementType!==StatementType.SELECT)throw Error('Only SELECT is allowed.');const reader=await statement.runAndReadUntil(1001);const rows=reader.getRowObjectsJson();if(rows.length>1000)throw Error('Too many groups. Ask for a coarser time interval or narrower filter.');return {rows,sqlMs:performance.now()-start,datasetVersion:captured.schema.version};}finally{clearTimeout(timeout);statement?.destroySync();c.closeSync();captured.active--;if(captured.retired&&!captured.active)await retire(captured);}
}
