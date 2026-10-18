// Build only the public pages/media for this release. Existing applications stay in the base image.
import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const out=resolve(process.argv[2]||'.cache/asana-release');
for(const path of ['index.html','case-studies.html','services/ai-product-lead.html','projects/asana']){
 await mkdir(dirname(`${out}/${path}`),{recursive:true});await cp(path,`${out}/${path}`,{recursive:true});
}
const siteHeader=(await readFile('scripts/build.mjs','utf8')).match(/const siteHeader = `([^`]+)`;/)[1];
const pages=JSON.parse(await readFile('scripts/seo-pages.json','utf8'));
for(const page of pages.filter(p=>['index.html','case-studies.html','services/ai-product-lead.html','projects/asana/index.html'].includes(p.file))){
 const url='https://decisionaxis.co'+page.path, esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 let html=await readFile(`${out}/${page.file}`,'utf8');
 html=html.replace(/<header class="site-header">[\s\S]*?<\/header>/,siteHeader);
 html=html.replace(/<link rel="canonical"[^>]*>/g,'');
 const tags=`<link rel="canonical" href="${url}"><meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${url}"><meta property="og:type" content="${page.type==='Article'?'article':'website'}">${page.image?`<meta property="og:image" content="https://decisionaxis.co/${page.image}">`:''}<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':page.service?'Service':page.type,name:page.title,url,description:page.description,...(page.service?{provider:{'@type':'Organization',name:'Decision Axis'}}:{})}).replaceAll('<','\\u003c')}</script>`;
 html=html.replace('</head>',tags+'</head>');await writeFile(`${out}/${page.file}`,html);
}
console.log(`Built Asana release at ${out}`);
