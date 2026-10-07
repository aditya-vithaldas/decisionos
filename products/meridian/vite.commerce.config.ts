import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('./commerce-source',import.meta.url)),base:'/commerce/',publicDir:fileURLToPath(new URL('./commerce-public',import.meta.url)),resolve:{alias:{'@':fileURLToPath(new URL('./commerce-source',import.meta.url))}},plugins:[react()],build:{outDir:fileURLToPath(new URL('./dist-commerce',import.meta.url)),emptyOutDir:true}});
