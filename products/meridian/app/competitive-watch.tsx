'use client';
import {ScanSearch,Tag} from 'lucide-react';

const competitors=[
 {name:'OTTO',scope:'Fashion · Living · Sport',surfaces:'4 surfaces',promotions:'6 promo mechanics',status:'Promotion-led',tone:'coral',callouts:['Three recurring sale formats: Deal of the day, week, and month','Super-Sale plus a separate “Top deals & discounts” destination','At least 20% extra called out across Fashion, Living, and Sport'],updated:'Observed 29 Sep 2026'},
 {name:'Zalando',scope:'Homepage · Sale · Outlet',surfaces:'3 surfaces',promotions:'2 sale destinations',status:'Sale section active',tone:'sun',callouts:['Homepage remains style-led; no broad sitewide discount headline','Sale and Outlet are the two explicit discount destinations','Selected Outlet examples showed roughly 20–70% markdowns'],updated:'Observed 29 Sep 2026'},
 {name:'About You',scope:'Women · Men · Shoes',surfaces:'4 surfaces',promotions:'4 featured modules',status:'Discovery-led',tone:'violet',callouts:['Three discovery modules lead: Live Shopping, seasonal styling, and exclusive drops','Sale remains available in navigation as a fourth commercial route','No percentage-off headline led the homepage during this scan'],updated:'Observed 29 Sep 2026'},
 {name:'Amazon DE',scope:'Homepage attempt',surfaces:'1 attempted surface',promotions:'0 verified promos',status:'Could not verify',tone:'blue',callouts:['Automated access was blocked by a browser challenge','No category or promotion count has been inferred','Retry through an approved connected browser before comparison'],updated:'Scan attempted 29 Sep 2026'}
];

export default function CompetitiveWatch(){
 return <div className="cw-app">
  <header className="cw-heading"><div><p className="an-kicker">COMPETITIVE INTELLIGENCE</p><h1>A brief read of the market.</h1><p>One homepage and a few leading category surfaces per competitor—enough to spot sales, pricing posture, and the messages they are leading with.</p></div><span className="cw-complete"><ScanSearch size={15}/> One-off scan complete</span></header>
  <section className="cw-summary" aria-label="Competitive scan summary"><div><ScanSearch size={18}/><span><strong>11 verified surfaces</strong><small>12 attempted across 4 competitors</small></span></div><div><Tag size={18}/><span><strong>12 promotion signals</strong><small>6 on OTTO alone</small></span></div><p>Germany · observed 29 September 2026 · summary only, no item-level crawl</p></section>
  <div className="cw-feed">{competitors.map((competitor,index)=><article className={`is-${competitor.tone}`} key={competitor.name}>
   <div className="cw-rank">{String(index+1).padStart(2,'0')}</div><div className="cw-company"><small>{competitor.updated}</small><h2>{competitor.name}</h2><p>{competitor.scope}</p><div className="cw-counts"><b>{competitor.surfaces}</b><b>{competitor.promotions}</b></div><span>{competitor.status}</span></div>
   <div className="cw-callouts"><small>WHAT THEY ARE LEADING WITH</small><ul>{competitor.callouts.map(callout=><li key={callout}>{callout}</li>)}</ul></div>
  </article>)}</div>
 </div>;
}
