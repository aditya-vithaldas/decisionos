import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export async function renderSalesDashboard(report,name='performance') {
 if(!['performance','rca'].includes(name))throw Error('Unknown dashboard');
 const directory=process.env.DASHBOARD_TEMPLATE_DIR||fileURLToPath(new URL('../../docs/dashboard/',import.meta.url));
 const template=await readFile(resolve(directory,name+'.html'),'utf8');
 if(template.split('__COMMERCE_SNAPSHOT__').length!==2)throw Error('Invalid dashboard template');
 return template.replace('__COMMERCE_SNAPSHOT__',JSON.stringify(report).replaceAll('<','\\u003c'));
}
