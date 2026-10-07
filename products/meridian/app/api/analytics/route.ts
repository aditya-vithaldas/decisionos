import principles from '../../../principles.md?raw';
import {env} from 'cloudflare:workers';
import {generateAnalytics} from '@/lib/generate-analytics.mjs';
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid origin'},{status:403});
 try{const raw=await request.text();if(raw.length>40000)return Response.json({error:'Request too large'},{status:413});const {message,context,source}=JSON.parse(raw);if(!Array.isArray(source)||!source.length)return Response.json({error:'Low confidence: upload a dataset before using file analysis.'},{status:400});const key=(env as unknown as Record<string,string>).GEMINI_API_KEY||process.env.GEMINI_API_KEY;const result=await generateAnalytics(key,message,context,source,principles);return Response.json(result,{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:e instanceof Error?e.message:'Please try again.'},{status:502});}
}
