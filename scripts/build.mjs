import { cp, mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'design-system.html', 'case-studies.html', 'thanks.html', 'analytics', 'commerce', 'crm', 'feedback', 'leadgen', 'assets', 'toptal-application.html', 'toptal-application.css', 'toptal-application.js', 'images']) {
  await cp(path, `dist/${path}`, { recursive: true });
}
// Publish registered detail pages; unlisted source pages stay available for later.
const pages = JSON.parse(await readFile('scripts/seo-pages.json', 'utf8'));
await mkdir('dist/projects', { recursive: true });
for (const page of pages.filter(page => page.file.startsWith('projects/') || page.file.startsWith('services/'))) {
  await mkdir(dirname(`dist/${page.file}`), { recursive: true });
  await cp(page.file, `dist/${page.file}`);
}
const versions = {};
for (const name of ['hero-art-motion.css', 'hero-art-motion.js', 'leadgen.css', 'leadgen.js', 'styles.css', 'motion.js', 'concepts.js', 'contact.js', 'service-carousel.js','crm.css','crm-workspace.css','crm.js','crm-live.js','crm-live-commands.js','crm-live-capture.js']) {
  versions[name] = createHash('sha256').update(await readFile(`assets/${name}`)).digest('hex').slice(0, 10);
}
// Pin the entire Live module graph, not only the HTML entry. Changing a child
// must change its parent's content hash, including the capture worklet URL.
for(const name of ['crm-live.js','crm.js']){
  const source=(await readFile(`dist/assets/${name}`,'utf8')).replace(/((?:\.\/|\/assets\/)(crm-live(?:-commands|-capture)?\.js))(?:\?v=[a-f0-9]+)?/g,(_,url,child)=>`${url}?v=${versions[child]}`);
  await writeFile(`dist/assets/${name}`,source);
  versions[name]=createHash('sha256').update(source).digest('hex').slice(0,10);
}
const siteHeader = `<header class="site-header"><a class="wordmark" href="/" aria-label="Decision Axis, home"><span class="monogram">d<span>↗</span></span><span class="wordmark-name">Decision Axis<span class="wordmark-sub">Product · Design · Engineering</span></span></a><nav aria-label="Main navigation"><a href="/#services">eCommerce</a><a href="/#b2b-saas">B2B SaaS</a><a href="/#common-services">Common services</a><a href="/#approach">Our philosophy</a><a href="/#about">About Decision Axis</a><a class="contact-button" href="/#contact">Contact Us <span aria-hidden="true">↗</span></a></nav></header>`;
async function versionPages(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await versionPages(path);
    else if (entry.name.endsWith('.html')) {
      const html = (await readFile(path, 'utf8'))
        .replace(/<header class="site-header">[\s\S]*?<\/header>/, siteHeader)
        .replace(/(assets\/(hero-art-motion\.css|hero-art-motion\.js|leadgen\.css|leadgen\.js|styles\.css|motion\.js|concepts\.js|contact\.js|service-carousel\.js|crm\.css|crm-workspace\.css|crm\.js|crm-live\.js|crm-live-commands\.js|crm-live-capture\.js))(?:\?v=[^"\s]+)?/g, (_, url, name) => `${url}?v=${versions[name]}`);
      await writeFile(path, html);
    }
  }
}
await versionPages('dist');
console.log('Built site, work index, and case studies with versioned assets. Archive excluded.');
