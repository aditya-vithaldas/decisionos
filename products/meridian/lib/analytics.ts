import {validateGenerated,type GeneratedData} from './generated-data.ts';
export const days = [
 {day:'Sep 09',sales:18240,previous:16500,traffic:8200,orders:228},
 {day:'Sep 10',sales:20480,previous:17800,traffic:9100,orders:256},
 {day:'Sep 11',sales:19840,previous:18100,traffic:8750,orders:248},
 {day:'Sep 12',sales:24640,previous:19400,traffic:10800,orders:308},
 {day:'Sep 13',sales:28960,previous:21500,traffic:12400,orders:362},
 {day:'Sep 14',sales:26720,previous:20800,traffic:11600,orders:334},
 {day:'Sep 15',sales:32480,previous:23900,traffic:13900,orders:406},
];
export const customers=[
 {name:'Olivia Chen',initials:'OC',location:'San Francisco, US',orders:12,spend:3840},
 {name:'Noah Williams',initials:'NW',location:'London, UK',orders:10,spend:3260},
 {name:'Amara Okafor',initials:'AO',location:'Lagos, NG',orders:9,spend:2880},
 {name:'Luca Rossi',initials:'LR',location:'Milan, IT',orders:8,spend:2640},
 {name:'Sofia Andersson',initials:'SA',location:'Stockholm, SE',orders:7,spend:2240},
];
export type AnalyticsView='sales'|'traffic'|'customers'|'questions';
export const questions=['What were total sales for the last seven days?','Show me traffic for the last seven days','Show me the top users','Compare sales and traffic as lines','Show conversion for the last three days','Show sales by category as a pie chart','Show the shopping funnel','Show a heatmap of sales by category'];
export const totalSales=days.reduce((s,d)=>s+d.sales,0),totalPrevious=days.reduce((s,d)=>s+d.previous,0),totalTraffic=days.reduce((s,d)=>s+d.traffic,0),totalOrders=days.reduce((s,d)=>s+d.orders,0);
export const growth=(totalSales/totalPrevious-1)*100;
export const usd=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export const analyticsTool={name:'show_analytics',description:'Bring sales, traffic, top users/customers, or sample questions prominently onto the screen. Always call when the user asks to see data. Return includes the exact demo data to interpret.',parameters:{type:'object',properties:{view:{type:'string',enum:['sales','traffic','customers','questions']}},required:['view'],additionalProperties:false}};
export function analyticsResult(view:unknown){if(!['sales','traffic','customers','questions'].includes(String(view)))throw Error('Choose sales, traffic, customers, or questions.');return {view,period:'September 9–15, 2026 (fixed seven-day demo)',currency:'USD',demo:true,...(view==='customers'?{ranking:'Spend during this demo week, descending',customers}:view==='questions'?{questions}:{days:days.map((d,i)=>({...d,dailySalesGrowth:i?(d.sales/days[i-1].sales-1)*100:null})),totalSales,totalPrevious,totalTraffic,totalOrders,weekOverWeekSalesGrowth:growth})};}
export const analyticsInstructions=`You are Meridian's live ecommerce DEMO analyst. Every request MUST update the primary widget using show_analytics before your brief spoken interpretation. This is a synthetic demo: you are authorized to generate plausible sample data on the fly for ANY requested metric, geography, region, category, channel, cohort, product or time period. NEVER say data is unavailable or that the dataset cannot support a request. When context says uploaded data is available, ALWAYS call show_analytics with query containing the exact user question; do NOT supply generated numbers. The page calculates the answer from those files. Otherwise for EVERY new data question create a fresh dataset at request time and supply generated. Do not choose precomputed examples. Supply generated with title, period, metric label, unit (USD/%/count), aggregation (sum/average), kind and points [{label,value,secondary?}]. Use secondaryLabel when comparing two series. Generate the actual requested breakdown, not a substitute. Use 1 point for a scalar, sensible rows for a table, or 3–30 points for a graph. Reuse generated values from current context when only the chart style changes. Keep totals and breakdowns consistent with existing context when relevant. All data is sample data; the interface labels it, so do not repeatedly announce generation. Do not claim real business records or verified causes. Choose display number, table or chart to match the request. Always call the tool, never answer only in speech. Supported kinds: line, area, bar, horizontal, stacked, pie, donut, scatter, funnel, heatmap, histogram, radar. If asked for examples use questions. If asked to stop call stop_listening. Built-in snapshot: ${JSON.stringify(analyticsResult('sales'))}. Customers: ${JSON.stringify(customers)}.`;
export type Detail='daily'|'comparison'|'conversion'|'breakdown';
export type Metric='sales'|'traffic'|'orders'|'conversion'|'aov'|'growth';
export type ChartSpec={metrics:Metric[];kind:'area'|'line'|'bar'|'pie'|'donut'|'stacked'|'horizontal'|'scatter'|'funnel'|'heatmap'|'histogram'|'radar';start:number;end:number;previous:boolean};
export type Screen={view:AnalyticsView;details:Detail[];chart?:ChartSpec;display?:'number'|'chart'|'table';notice?:string;generated?:GeneratedData;source?:'uploaded';empty?:boolean;grounding?:any;guidance?:any;queryContext?:any};
export const metricInfo:Record<Metric,{label:string;unit:string;color:string}>={sales:{label:'Sales',unit:'USD',color:'#b7f478'},traffic:{label:'Traffic',unit:'sessions',color:'#9dbaed'},orders:{label:'Orders',unit:'orders',color:'#ffce84'},conversion:{label:'Conversion',unit:'%',color:'#d7b0ff'},aov:{label:'Average order value',unit:'USD',color:'#8de5d5'},growth:{label:'Daily sales growth',unit:'%',color:'#f4a8be'}};
export const chartDefaults=(view:AnalyticsView):ChartSpec=>({metrics:[view==='traffic'?'traffic':'sales'],kind:view==='traffic'?'bar':'area',start:9,end:15,previous:false});
export const screenTool={name:'show_analytics',description:'REQUIRED before answering every analytics question, including why, contributing factors, rankings and follow-ups. Pass the exact question to query the real DuckDB demo database or uploaded data. The tool selects a graph, table or number and returns measured results plus an explanation. Never invent values or answer with generic business advice. Reuse context for follow-ups.',parameters:{type:'object',properties:{query:{type:'string',description:'The complete user question, preserving requested dates, comparisons, metrics and chart style.'}},required:['query'],additionalProperties:false}};
export function transitionScreen(screen:Screen,args:unknown):Screen {
 if(!args||typeof args!=='object')throw Error('Expected screen arguments');const a=args as Record<string,unknown>;
 if(!['replace','update'].includes(String(a.mode)))throw Error('Choose replace or update');
 if(Object.keys(a).some(k=>!['mode','view','display','notice','generated','metrics','kind','start','end','previous'].includes(k)))throw Error('Unsupported widget setting');
 const display=(a.display||'chart') as Screen['display'];if(!['number','chart','table'].includes(display!))throw Error('Choose number, chart, or table');
 if(a.generated!==undefined)return {view:'sales',details:[],display,generated:validateGenerated(a.generated)};
 if(a.notice!==undefined)throw Error('Generate the requested data using generated instead.');
 if(screen.generated&&a.mode==='update'&&!a.metrics&&!a.start&&!a.end&&!a.view)return {view:'sales',details:[],display,generated:validateGenerated({...screen.generated,...(a.kind?{kind:a.kind}:{})})};
 const view=(a.view||screen.view) as AnalyticsView;analyticsResult(view);
 const chartKeys=['metrics','kind','start','end','previous'];
 if(view==='customers'||view==='questions'){if(chartKeys.some(k=>a[k]!==undefined))throw Error('Customers cover the full demo week as a ranked list.');return {view,details:[],display:'table'};}
 const base=a.mode==='replace'?chartDefaults(view):(screen.chart||chartDefaults(view));
 const chart={...base,...Object.fromEntries(chartKeys.filter(k=>a[k]!==undefined).map(k=>[k,a[k]]))} as ChartSpec;
 if(!Array.isArray(chart.metrics)||!chart.metrics.length||chart.metrics.length>2||new Set(chart.metrics).size!==chart.metrics.length||chart.metrics.some(m=>!Object.hasOwn(metricInfo,m)))throw Error('Choose one or two supported metrics.');
 if(display==='number'&&chart.metrics.length!==1)throw Error('Use one metric for a single number.');
 if(!['line','bar','area','pie','donut','stacked','horizontal','scatter','funnel','heatmap','histogram','radar'].includes(chart.kind))throw Error('Choose a supported chart type.');
 if(!Number.isInteger(chart.start)||!Number.isInteger(chart.end)||chart.start<9||chart.end>15||chart.start>chart.end)throw Error('Demo dates run from September 9 to 15, 2026.');
 if(typeof chart.previous!=='boolean')throw Error('previous must be true or false');
 if(a.previous===undefined&&a.metrics!==undefined&&!chart.metrics.includes('sales'))chart.previous=false;
 if(chart.previous&&!chart.metrics.includes('sales'))throw Error('Previous-week data is available only for sales.');
 if(display==='number'||!['line','bar','area'].includes(chart.kind))chart.previous=false;
 if(['pie','donut','stacked','horizontal','heatmap','radar'].includes(chart.kind)&&!(chart.metrics.length===1&&chart.metrics[0]==='sales'))throw Error('Category breakdowns are available for demo sales.');
 if(chart.kind==='histogram'&&chart.metrics.length!==1)throw Error('Histograms require one metric.');
 if(chart.kind==='scatter'&&chart.metrics.length!==2)throw Error('Scatter plots require two metrics.');
 return {view,details:[],chart,display};
}
export function chartData(screen:Screen){const spec=screen.chart||chartDefaults(screen.view);return days.map((d,i)=>({...d,date:9+i,conversion:d.orders/d.traffic*100,aov:d.sales/d.orders,growth:i?(d.sales/days[i-1].sales-1)*100:null})).filter(d=>d.date>=spec.start&&d.date<=spec.end);}
export function chartSummary(screen:Screen){const rows=chartData(screen),sum=(m:'sales'|'traffic'|'orders'|'previous')=>rows.reduce((s,d)=>s+d[m],0);return {sales:sum('sales'),traffic:sum('traffic'),orders:sum('orders'),conversion:sum('orders')/sum('traffic')*100,aov:sum('sales')/sum('orders'),growth:rows.length>1?(rows.at(-1)!.sales/rows[0].sales-1)*100:rows[0]?.growth??null,previous:sum('previous')};}
export function screenResult(screen:Screen){if(screen.generated)return {screen,demo:screen.source!=='uploaded',generated:screen.generated};const summary=chartSummary(screen),rows=chartData(screen);if(screen.notice)return {screen,demo:true,notice:screen.notice};return {...analyticsResult(screen.view),screen,...(['sales','traffic'].includes(screen.view)?{period:`September ${screen.chart?.start||9}–${screen.chart?.end||15}, 2026 (demo)`,days:rows,rows,summary,categoryRows:categoryRows(screen),categoryTotals:categoryTotals(screen),funnel:funnelData(screen),totalSales:summary.sales,totalTraffic:summary.traffic,totalOrders:summary.orders,totalPrevious:summary.previous,weekOverWeekSalesGrowth:(summary.sales/summary.previous-1)*100,note:'summary.growth is first-to-last selected day; row growth is day-over-day, using the preceding dataset day. Conversion and average order value are weighted over selected days.'}:{})};}
export function metricFormat(metric:Metric,value:number|null){if(value===null)return '—';return metricInfo[metric].unit==='USD'?usd(value):metricInfo[metric].unit==='%'?`${value.toFixed(2)}%`:value.toLocaleString('en-US');}
export function interpretQuestion(message:string,screen:Screen):Record<string,unknown>|null {
 const q=message.toLowerCase();if(/question|example|help/.test(q))return {mode:'replace',view:'questions'};
 if(/last\s+(?:month|year)|last\s+(?:[89]|\d{2,}|eight|nine|ten|thirty)\s+days|yesterday|today|october|august|profit|margin|refund|campaign|channel/.test(q))throw Error('This demo contains sales, traffic, orders and derived metrics for September 9–15 only.');
 if(/user|customer/.test(q)){if(/bar|line|chart|last \d|sep/.test(q))throw Error('Customers are available as a ranked list for the full demo week.');return {mode:'replace',view:'customers'};}
 const metrics:Metric[]=[];
 if(/conversion|convert/.test(q))metrics.push('conversion');
 if(/average order|\baov\b/.test(q))metrics.push('aov');
 if(/growth/.test(q))metrics.push('growth');
 if(/sales|revenue/.test(q)&&!metrics.includes('growth'))metrics.push('sales');
 if(/traffic|visit|session/.test(q))metrics.push('traffic');
 if(/\borders?\b/.test(q)&&!metrics.includes('aov'))metrics.push('orders');
 const kind=/histogram|distribution/.test(q)?'histogram':/radar|spider/.test(q)?'radar':/donut|doughnut/.test(q)?'donut':/pie/.test(q)?'pie':/heat.?map/.test(q)?'heatmap':/funnel/.test(q)?'funnel':/scatter|correlation/.test(q)?'scatter':/stack/.test(q)?'stacked':/horizontal/.test(q)?'horizontal':/categor/.test(q)?'donut':/bar/.test(q)?'bar':/line/.test(q)?'line':/area/.test(q)?'area':undefined;
 if(kind&&['pie','donut','stacked','horizontal','heatmap','radar'].includes(kind)){if(metrics.some(m=>m!=='sales'))throw Error('Category breakdowns are available for sales in this demo.');if(!metrics.length)metrics.push('sales');}
 if(kind==='scatter'&&metrics.length<2){metrics.splice(0,metrics.length,'traffic','sales');}
 if(kind==='funnel'){metrics.splice(0,metrics.length,'traffic');}
 const last=/last\s+(\d+|one|two|three|four|five|six|seven)\s+days?/.exec(q);const words:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7};const n=last?(words[last[1]]||Number(last[1])):undefined;
 const range=/(?:sep(?:tember)?\s*)?(\d{1,2})\s*(?:to|through|–|-)\s*(?:sep(?:tember)?\s*)?(\d{1,2})/.exec(q);
 const single=/sep(?:tember)?\s+(\d{1,2})/.exec(q);
 const previous=/previous week|last week/.test(q);
 const base=screen.chart||chartDefaults(screen.view);
 if(metrics.length>2)throw Error('Compare up to two metrics at a time.');
 if(n!==undefined&&(n<1||n>7))throw Error('Choose between one and seven days in this demo.');
 const config:Record<string,unknown>={};if(kind)config.kind=kind;if(n)Object.assign(config,{start:16-n,end:15});else if(range)Object.assign(config,{start:Number(range[1]),end:Number(range[2])});else if(single&&!/why|happen/.test(q))Object.assign(config,{start:Number(single[1]),end:Number(single[1])});
 if(previous)config.previous=!/hide|remove|without/.test(q);
 if(/add|also|overlay/.test(q)&&metrics.length){config.metrics=[...new Set([...base.metrics,...metrics])];}else if(metrics.length)config.metrics=metrics;
 const follow=/detail|more|break.?down|why|happen|each day|daily data/.test(q);
 if(follow&&!kind&&!last&&!range&&!previous&&(metrics.length===0||metrics.every(m=>base.metrics.includes(m)))&&screen.view!=='questions')return {mode:'update',display:'table'};
 const display=/table|breakdown|daily data|each day.*detail/.test(q)?'table':kind||/chart|graph|trend|daily|every day|over time|compare|versus|\bvs\b/.test(q)?'chart':/total|how much|how many|number|single|overall|rate|average|\baov\b/.test(q)?'number':metrics.length?'chart':screen.display||'chart';
 if(Object.keys(config).length||/number|total|single|table|chart|graph/.test(q)){const nextMetrics=(config.metrics||base.metrics) as Metric[];const same=metrics.length===0||metrics.every(m=>base.metrics.includes(m))||/add|also|overlay|compare|versus|\bvs\b/.test(q);return {mode:same&&['sales','traffic'].includes(screen.view)?'update':'replace',...(!same||!['sales','traffic'].includes(screen.view)?{view:nextMetrics[0]==='traffic'?'traffic':'sales'}:{}),...config,display};}
 if(/reset|whole week|all seven|full week/.test(q))return {mode:'update',start:9,end:15};
 return null;
}

export const categories=[{name:'Apparel',share:.36,color:'#b7f478'},{name:'Electronics',share:.28,color:'#9dbaed'},{name:'Home',share:.19,color:'#ffce84'},{name:'Beauty',share:.11,color:'#d7b0ff'},{name:'Other',share:.06,color:'#8de5d5'}];
export function categoryRows(screen:Screen){return chartData(screen).map(d=>{let allocated=0;const values=Object.fromEntries(categories.map((c,i)=>{const value=i===categories.length-1?d.sales-allocated:Math.round(d.sales*c.share);allocated+=value;return [c.name,value];}));return {day:d.day,...values} as {day:string}&Record<string,number>;});}
export function categoryTotals(screen:Screen){const rows=categoryRows(screen);return categories.map(c=>({...c,value:rows.reduce((sum,r)=>sum+r[c.name],0)}));}
export function funnelData(screen:Screen){const s=chartSummary(screen);return [{name:'Sessions',value:s.traffic,fill:'#9dbaed'},{name:'Added to cart',value:Math.round(s.traffic*.14),fill:'#8de5d5'},{name:'Checkout',value:Math.round(s.traffic*.075),fill:'#d7b0ff'},{name:'Orders',value:s.orders,fill:'#b7f478'}];}

