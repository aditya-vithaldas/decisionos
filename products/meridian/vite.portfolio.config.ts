import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('./portfolio',import.meta.url)),base:'/analytics/',publicDir:fileURLToPath(new URL('./public',import.meta.url)),resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},plugins:[react()],build:{outDir:fileURLToPath(new URL('./dist-portfolio',import.meta.url)),emptyOutDir:true}});
