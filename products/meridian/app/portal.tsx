'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,AudioLines,ChartNoAxesCombined,Mic,PhoneOff,PlayCircle,Sparkles,Video,X} from 'lucide-react';
import Analytics from './experience';
import './portal.css';

function Landing(){
 const [focus,setFocus]=useState({x:78,y:36});
 const [videoOpen,setVideoOpen]=useState(false);
 const assetBase=location.pathname.startsWith('/analytics')?'/analytics':'';
 useEffect(()=>{
  if(!videoOpen)return;
  const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setVideoOpen(false);};
  document.addEventListener('keydown',close);
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',close);document.body.style.overflow=previous;};
 },[videoOpen]);
 return <main className="meridian-home" onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();setFocus({x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100});}}>
  <svg className="mh-threads" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
   <defs><linearGradient id="mhg"><stop stopColor="#00f5d4"/><stop offset=".45" stopColor="#3a86ff"/><stop offset="1" stopColor="#8338ec"/></linearGradient></defs>
   {[0,1,2,3].map(i=><path key={i} d={`M-40 ${130+i*145} C 210 ${70+i*120}, 390 ${560-i*80}, ${focus.x*10} ${focus.y*7} S 820 ${160+i*100}, 1060 ${95+i*150}`}/>) }
  </svg>
  <header className="mh-nav"><a href="https://decisionos.me" className="mh-brand"><span><ChartNoAxesCombined size={19}/></span>meridian</a><div className="mh-actions"><button className="mh-video-link" onClick={()=>setVideoOpen(true)}><PlayCircle size={17}/> Watch video</button><a className="mh-demo-link" href="?demo=1">Browse demo data</a></div></header>
  <section className="mh-hero">
   <div className="mh-copy"><p className="mh-script">commerce intelligence</p><h1>The eCommerce expertise<br/><em>your data has been missing.</em></h1><p className="mh-lede">Meridian gives growing commerce teams an expert view of performance—what matters, what they might be missing, and what to do next.</p><div className="mh-cta"><a href="?demo=1">Explore the live demo <ArrowRight size={18}/></a></div></div>
   <div className="mh-proof" aria-label="Meridian product capabilities">
    <article><small><Sparkles size={15}/> PROACTIVE ANALYTICS</small><strong>Signals surface before somebody thinks to ask.</strong><p>Seasonality, incidents, campaigns, and market movements stay in one evidence trail.</p><figure className="mh-proof-shot"><img src={`${assetBase}/meridian-proactive.png`} alt="Meridian proactive analytics showing conversion, purchase frequency, attribution, and ranked priorities."/></figure></article>
    <article><small><AudioLines size={15}/> LIVE ANALYST</small><strong>Bring your analyst into the call.</strong><p>Ask follow-ups in product, Zoom, Slack, or voice without rebuilding the analysis.</p><div className="mh-call-preview" aria-label="Zoom call with Maya on the left and Meridian insight in meeting chat on the right"><header><span><Video size={13}/> Zoom call</span><i>3 participants · Meeting chat open</i></header><div className="mh-call-body"><div className="mh-call-stage" aria-hidden="true"><div className="mh-participant is-maya"><img src={`${assetBase}/maya-avatar.png`} alt=""/><span>Maya · Head of Sales</span></div></div><div className="mh-meeting-chat"><div className="mh-chat-title">Meridian in meeting chat <span>Live</span></div><div className="mh-chat-message is-maya"><small>Maya · 10:14</small><p>Why did revenue fall last month?</p></div><div className="mh-chat-message is-meridian"><small>Meridian · Voice analyst</small><p>One fewer day explains most of the gap. Western Europe and Fragrance still fell per day.</p></div></div></div><footer><span><Mic size={13}/><Video size={13}/><em>Meridian is answering</em></span><i><PhoneOff size={13}/></i></footer></div></article>
    <div className="mh-signal"><span>Signal identified</span><b>Halloween campaign finished below plan</b><i>Evidence ready for review</i></div>
   </div>
  </section>
  <section className="mh-values" aria-labelledby="values-title"><p className="mh-script">why meridian</p><div className="mh-section-heading"><h2 id="values-title">Expert judgment, available when you need it.</h2><p>The depth of a specialist commerce team, made practical for a growing business.</p></div><div className="mh-value-grid"><article><span>01</span><h3>Expert, proactive analysis of your data.</h3><p>Industry experts codify how strong eCommerce analysis is done. Meridian combines that approach with your data and your team’s way of working.</p></article><article><span>02</span><h3>Talk to your data naturally.</h3><p>Ask questions and follow-ups as if you were working with a human analyst.</p></article><article><span>03</span><h3>Pay for usage, not seats.</h3><p>Spend on Meridian when your team uses it and gets value from it.</p></article></div></section>
  <section className="mh-team" aria-labelledby="team-title"><div className="mh-team-portrait"><img src={`${assetBase}/aditya-caricature.png`} alt="Caricature of Aditya Vithaldas."/></div><div><p className="mh-script">the team</p><h2 id="team-title">Built by someone who has lived the problem.</h2><h3>Aditya Vithaldas</h3><p>Product, engineering, and analytics leader with 15 years in eCommerce and marketplaces. Formerly at Zalando, eBay, and Flipkart.</p><a href="https://decisionos.me/#about">About Aditya <ArrowRight size={16}/></a></div></section>
  {videoOpen&&<div className="mh-video-backdrop" onMouseDown={event=>{if(event.currentTarget===event.target)setVideoOpen(false);}}><section className="mh-video-player" role="dialog" aria-modal="true" aria-label="Meridian story video"><header><div><PlayCircle size={18}/><strong>The Meridian story</strong></div><button aria-label="Close video" onClick={()=>setVideoOpen(false)}><X size={20}/></button></header><video controls autoPlay playsInline preload="metadata"><source src={`${assetBase}/meridian-commerce-intelligence.mp4`} type="video/mp4"/></video></section></div>}
 </main>;
}

export default function MeridianPortal(){
 const [demo,setDemo]=useState<boolean|null>(null);
 useEffect(()=>setDemo(new URLSearchParams(location.search).has('demo')),[]);
 if(demo===null)return <div className="mh-loading"/>;
 return demo?<Analytics/>:<Landing/>;
}
