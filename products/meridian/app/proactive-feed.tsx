'use client';
import {AlertTriangle,ArrowUpRight,CalendarDays,EyeOff,Pin,TrendingUp} from 'lucide-react';
import {useState} from 'react';

type Unit={
 label:string;title:string;meta:string;state:'ready'|'gap';tone:string;highlight?:string;
 metric?:string;change?:string;kind?:'line'|'bar'|'distribution';values?:number[];baseline?:number[];labels?:string[];
 explanation:string;drivers:string[];question:string;
};

const units:Unit[]=[
 {label:'Conversion health',title:'Conversion is tracking just above its baseline',meta:'Checks every morning · trailing 28-day baseline',state:'ready',tone:'teal',highlight:'Healthy signal',metric:'3.9%',change:'+0.2 pp vs baseline',kind:'line',values:[3.4,3.6,3.5,3.7,3.8,3.7,3.9],baseline:[3.5,3.5,3.6,3.6,3.7,3.7,3.7],labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],explanation:'Visitor-to-buyer conversion is stable. The latest movement remains inside the range established during profiling.',drivers:['Returning-user conversion improved by 0.4 pp','Mobile conversion contributed most of the gain','Traffic mix remained within its normal range'],question:'What is driving the latest change in conversion?'},
 {label:'Purchase frequency',title:'Purchase frequency recovered through the week',meta:'Checks weekly · customer-level aggregate profile',state:'ready',tone:'violet',metric:'2.1',change:'orders per customer / month',kind:'bar',values:[1.8,1.9,1.7,1.9,2,2,2.1],baseline:[1.9,1.9,1.9,1.9,1.9,1.9,1.9],labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],explanation:'Customer cadence is back above its initial baseline after a mid-week dip. Meridian will watch for a sustained decline.',drivers:['High-frequency buyers expanded','Email-acquired customers retained best','The 30–60 day cohort recovered'],question:'Explain the change in purchase frequency and show the leading customer cohorts.'},
 {label:'Traffic attribution',title:'Search remains the largest identifiable source',meta:'Checks daily · acquisition source and device',state:'ready',tone:'blue',highlight:'48% from search',metric:'48%',change:'of attributed sessions',kind:'distribution',values:[48,27,16,9],labels:['Search','Email','Direct','Other'],explanation:'Most attributable traffic comes from search. Campaign-level data is still incomplete, so messaging impact cannot yet be separated.',drivers:['Organic search supplies the largest share','Email contributes 27% of attributed sessions','Missing campaign IDs limit channel-level explanation'],question:'Break down attributed traffic by source and device.'},
 {label:'Instrumentation gap',title:'Seller performance cannot be monitored yet',meta:'Add a stable seller or merchant identifier to unlock it',state:'gap',tone:'amber',highlight:'Action required',explanation:'Without a seller ID, Meridian cannot calculate seller conversion, GMV concentration, or changes in seller mix.',drivers:['No stable seller ID was found','Orders cannot be joined to merchants','Seller concentration and mix are therefore unknown'],question:'What data is required to monitor seller performance?'}
];

export default function ProactiveFeed({onInvestigate}:{onInvestigate:(question:string)=>void}){
 const [open,setOpen]=useState<string|null>(null);
 const [pinned,setPinned]=useState<string[]>([]);
 const [notImportant,setNotImportant]=useState<string[]>([]);
 const orderedUnits=[...units].sort((a,b)=>{
  const group=(unit:Unit)=>pinned.includes(unit.label)?0:notImportant.includes(unit.label)?2:1;
  return group(a)-group(b)||units.indexOf(a)-units.indexOf(b);
 });
 const togglePinned=(label:string)=>{setPinned(current=>current.includes(label)?current.filter(item=>item!==label):[...current,label]);setNotImportant(current=>current.filter(item=>item!==label));};
 const toggleImportance=(label:string)=>{setNotImportant(current=>current.includes(label)?current.filter(item=>item!==label):[...current,label]);setPinned(current=>current.filter(item=>item!==label));};
 return <div className="pr-app">
  <div className="pr-heading"><div><p className="an-kicker">WORKSPACE INTELLIGENCE</p><h1>What changed while you were away.</h1><p>Meridian watches the priorities it learned from your data. Questions and investigations continuously reshape this feed.</p></div><button><CalendarDays size={15}/> Daily view</button></div>
  <section className="pr-summary" aria-label="Workspace monitoring summary">
   <div className="is-teal"><small>READY TO MONITOR</small><strong>5</strong><span>Grounded in the latest source profile</span></div>
   <div className="is-amber"><small>INSTRUMENTATION GAPS</small><strong>3</strong><span>Funnel, seller, and campaign detail</span></div>
   <div className="is-blue"><small>MODEL UPDATED</small><strong>Today</strong><span>From the latest source profile</span></div>
  </section>
  <div className="pr-layout"><section className="pr-feed"><div className="pr-section-title"><h2>Priority feed</h2><span>Pinned first · then workspace priority</span></div>
   <div className="pr-unit-grid">{orderedUnits.map((unit,index)=><article className={`${unit.state==='ready'?'is-signal':'is-gap'} is-${unit.tone}${pinned.includes(unit.label)?' is-pinned':''}${notImportant.includes(unit.label)?' is-not-important':''}`} key={unit.label}>
    <div className="pr-unit-head"><span className="pr-priority-index">{String(index+1).padStart(2,'0')}</span><div className="pr-unit-icon">{unit.state==='gap'?<AlertTriangle size={18}/>:<TrendingUp size={18}/>}</div><div><small>{unit.label}</small><h3>{unit.title}</h3><p>{unit.meta}</p></div><div className="pr-unit-actions"><button className="pr-pin" aria-pressed={pinned.includes(unit.label)} onClick={()=>togglePinned(unit.label)}><Pin size={14}/>{pinned.includes(unit.label)?'Pinned':'Pin'}</button><button className="pr-ignore" aria-pressed={notImportant.includes(unit.label)} onClick={()=>toggleImportance(unit.label)}><EyeOff size={14}/>{notImportant.includes(unit.label)?'Restore':'Not important'}</button></div></div>
    {unit.highlight&&<span className="pr-highlight">{unit.highlight}</span>}
    {unit.state==='ready'?<><div className="pr-metric"><strong>{unit.metric}</strong><span>{unit.change}</span></div><MiniChart unit={unit}/><p className="pr-explanation">{unit.explanation}</p><small className="pr-demo-label">Latest commerce source profile</small></>:<div className="pr-gap-visual"><div className="pr-gap-requirements"><div><small>REQUIRED FIELD</small><strong>seller_id or merchant_id</strong><span>A stable identifier on each order line</span></div><div><small>REQUIRED JOIN</small><strong>Orders → sellers</strong><span>Connect the identifier to the seller table</span></div><div><small>UNLOCKS</small><strong>3 seller analyses</strong><span>Conversion, GMV concentration, and mix</span></div></div><p>{unit.explanation}</p></div>}
    <button className="pr-deep-dive" aria-expanded={open===unit.label} onClick={()=>setOpen(value=>value===unit.label?null:unit.label)}>Deep dive into drivers <ArrowUpRight size={14}/></button>
    {open===unit.label&&<div className="pr-drivers"><strong>What is driving this</strong><ul>{unit.drivers.map(driver=><li key={driver}>{driver}</li>)}</ul><button onClick={()=>onInvestigate(unit.question)}>Ask Meridian about this <ArrowUpRight size={14}/></button></div>}
   </article>)}</div>
  </section></div>
 </div>;
}

function MiniChart({unit}:{unit:Unit}){
 const values=unit.values||[];const baseline=unit.baseline||[];const labels=unit.labels||[];
 if(unit.kind==='distribution')return <div className="pr-distribution" role="img" aria-label="Traffic source distribution">{values.map((value,index)=><div key={labels[index]}><span>{labels[index]}</span><div><i style={{width:`${value}%`}}/></div><strong>{value}%</strong></div>)}</div>;
 const all=[...values,...baseline],min=Math.min(...all),range=Math.max(...all)-min||1;
 const points=(series:number[])=>series.map((value,index)=>`${12+index*(276/Math.max(1,series.length-1))},${92-(value-min)/range*68}`).join(' ');
 return <div className="pr-chart" role="img" aria-label={`${labels[0]} to ${labels.at(-1)} trend with baseline`}><svg viewBox="0 0 300 112" preserveAspectRatio="none"><line x1="12" y1="92" x2="288" y2="92" className="pr-axis"/>{baseline.length>0&&<polyline points={points(baseline)} className="pr-baseline-line"/>}{unit.kind==='bar'?values.map((value,index)=>{const x=12+index*(276/Math.max(1,values.length-1))-11,y=92-(value-min)/range*68;return <rect key={labels[index]} x={x} y={y} width="22" height={92-y} rx="3"/>;}):<><polygon points={`12,92 ${points(values)} 288,92`} className="pr-area"/><polyline points={points(values)} className="pr-value-line"/></>}</svg><div className="pr-chart-labels"><span>{labels[0]}</span><span>{labels.at(-1)}</span></div><div className="pr-chart-legend"><span><i/>Observed</span>{baseline.length>0&&<span><i/>Baseline</span>}</div></div>;
}
