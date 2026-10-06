import {generateAnalytics} from './generate-analytics.mjs';
const recent = new Map();
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(body));}
export async function analyticsSession(req,res,generate=false){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Use POST'});}
 const origin=req.headers.origin;
 const expectedHost=req.headers.host;
 if(!origin||!['https://decisionos.me','https://www.decisionos.me','https://decisionaxis.co','https://www.decisionaxis.co',`http://${expectedHost}`].includes(origin)){return json(res,403,{error:'Invalid origin'});}
 const caller=req.headers['x-forwarded-for']?.split(',')[0]?.trim()||req.socket.remoteAddress;
 const now=Date.now();for(const [id,entry] of recent)if(now-entry.start>60000)recent.delete(id);
 const bucket=recent.get(caller)||{start:now,count:0};if(bucket.count>=10)return json(res,429,{error:'Please wait a minute before starting another session.'});bucket.count++;recent.set(caller,bucket);
 try{
 let body='';for await(const chunk of req){body+=chunk;if(body.length>(generate?40000:2048))return json(res,413,{error:'Request too large'});}
 let data;try{data=JSON.parse(body);}catch{return json(res,400,{error:'Invalid JSON'});}
 if(generate){const result=await generateAnalytics(process.env.GEMINI_API_KEY,data.message,data.context,data.source);return json(res,200,result);}
 if(data.model!=='gemini-3.8-live')return json(res,400,{error:'Unknown live model'});
 if(!process.env.GEMINI_API_KEY)return json(res,503,{error:'Live voice is not configured yet. You can explore the demo with text.'});
 const response=await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({uses:1,expireTime:new Date(now+30*60000).toISOString(),newSessionExpireTime:new Date(now+60000).toISOString()}),signal:AbortSignal.timeout(15000)});
 if(!response.ok){console.error('Analytics Gemini token failed',response.status);return json(res,502,{error:'Could not start Gemini. Please try again shortly.'});}
 const result=await response.json();if(typeof result.name!=='string')throw Error('Missing token');return json(res,200,{token:result.name});
 }catch{return json(res,502,{error:'Live connection unavailable. Please try again.'});}
}
