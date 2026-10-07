import {cp,mkdir,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

const product='products/meridian';
const cache=resolve('.cache/npm');
await mkdir(cache,{recursive:true});

function run(command,args){
 const result=spawnSync(command,args,{stdio:'inherit',env:{...process.env,npm_config_cache:cache}});
 if(result.status!==0)process.exit(result.status??1);
}

run('npm',['ci','--prefix',product]);
run('npm',['run','build:portfolio','--prefix',product]);
run('npm',['exec','--prefix',product,'--','vite','build','--config','products/meridian/vite.commerce.config.ts']);
await rm('analytics',{recursive:true,force:true});
await cp(`${product}/dist-portfolio`,'analytics',{recursive:true});
await rm('commerce',{recursive:true,force:true});
await cp(`${product}/dist-commerce`,'commerce',{recursive:true});
console.log('Built Meridian from products/meridian into /analytics.');
