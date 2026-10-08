import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/render-dashboard.mjs snapshot.json output-directory');
const d=JSON.parse(await readFile(input,'utf8'));
if(d.synthetic!==true||d.currency!=='USD'||!d.source?.generation?.model||!/^\d{4}-\d{2}-\d{2}$/.test(d.dataThrough))throw Error('Invalid commerce snapshot');
if(d.current?.date!==d.dataThrough||d.baseline?.date!==d.baselineDate)throw Error('Snapshot dates disagree');
const total=d.attribution.effects.reduce((s,x)=>s+x.effect,0)+d.attribution.unexplained;
if(!Number.isFinite(total)||Math.abs(total-d.change)>.01)throw Error('Revenue bridge does not reconcile');
for(const dim of ['categories','regions','channels'])if(Math.abs(d[dim].reduce((s,x)=>s+x.current-x.baseline,0)-d.change)>.01)throw Error('Segment breakdown does not reconcile');
const payload=JSON.stringify(d).replaceAll('<','\\u003c');
await mkdir(output,{recursive:true});
for(const name of ['performance','rca']){
 const template=await readFile(new URL('../docs/dashboard/'+name+'.html',import.meta.url),'utf8');
 if(template.split('__COMMERCE_SNAPSHOT__').length!==2)throw Error('Expected exactly one data placeholder');
 await writeFile(resolve(output,name+'.html'),template.replace('__COMMERCE_SNAPSHOT__',payload));
}
console.log(JSON.stringify({rendered:true,datasetVersion:d.datasetVersion,dataThrough:d.dataThrough}));
