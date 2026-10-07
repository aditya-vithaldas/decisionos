import {DuckDBInstance,StatementType} from '@duckdb/node-api';
import {readFile} from 'node:fs/promises';
const directory=process.env.DATA_DIR||'data';
export const schema=JSON.parse(await readFile(`${directory}/schema.json`,'utf8'));
const instance=await DuckDBInstance.create(`${directory}/ecommerce.duckdb`,{access_mode:'READ_ONLY',threads:process.env.DUCKDB_THREADS||'2',memory_limit:process.env.DUCKDB_MEMORY_LIMIT||'1GB',enable_external_access:'false',allow_community_extensions:'false',autoinstall_known_extensions:'false',autoload_known_extensions:'false'});
const configuration=await instance.connect();await configuration.run('SET lock_configuration=true');configuration.closeSync();
export async function queryDatabase(sql){
 if(typeof sql!=='string'||sql.length>12000||!/^\s*(select|with)\b/i.test(sql))throw Error('A read-only SELECT query is required.');
 if(/\b(information_schema|pg_catalog|duckdb_\w*|sqlite_\w*|read_\w*|glob|query|query_table|getenv|current_setting|generate_series|range)\s*[.(]/i.test(sql))throw Error('Only the documented demo tables may be queried.');
 const c=await instance.connect();let statement;const start=performance.now();const timeout=setTimeout(()=>c.interrupt(),8000);
 try{const statements=await c.extractStatements(sql);if(statements.count!==1)throw Error('Only one statement is allowed.');statement=await statements.prepare(0);if(statement.statementType!==StatementType.SELECT)throw Error('Only SELECT is allowed.');const reader=await statement.runAndReadUntil(1001);const rows=reader.getRowObjectsJson();if(rows.length>1000)throw Error('Too many groups. Ask for a coarser time interval or narrower filter.');return {rows,sqlMs:performance.now()-start};}finally{clearTimeout(timeout);statement?.destroySync();c.closeSync();}
}
