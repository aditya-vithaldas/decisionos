import {createServer} from 'node:http';
import {demoAPI} from './gateway.mjs';
createServer((req,res)=>{if(req.url==='/health'){res.writeHead(200).end('ok');return;}void demoAPI(req,res);}).listen(Number(process.env.PORT||8080),'0.0.0.0');
