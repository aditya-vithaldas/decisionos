import {test} from 'node:test';
import assert from 'node:assert/strict';
import {segmentBreakdown,salesPresentation,reportingInstructions} from './reporting.mjs';

const report = () => ({
 dataThrough:'2026-10-07', baselineDate:'2026-09-30',
 current:{revenue:800,cancelled_orders:20}, baseline:{revenue:1000,cancelled_orders:10},
 categories:[{label:'Books',current:300,baseline:500},{label:'Home',current:500,baseline:500}],
 channels:[{label:'mobile_app',current:300,baseline:600},{label:'web',current:500,baseline:400}],
 daily:[{date:'2026-10-05',revenue:1000},{date:'2026-10-06',revenue:700},{date:'2026-10-07',revenue:800}]
});

test('category and channel splits retain independent totals, shares and zero-baseline meaning',()=>{
 const p=salesPresentation(report());
 for(const dimension of ['category','channel']) {
  assert.equal(p.breakdowns[dimension].reduce((s,r)=>s+r.current,0),800);
  assert.equal(p.breakdowns[dimension].reduce((s,r)=>s+r.sharePct,0),100);
  assert.equal(p.breakdowns[dimension].reduce((s,r)=>s+r.change,0),-200);
 }
 assert.equal(p.breakdowns.category.find(r=>r.label==='Books').changeColor,'red');
 assert.equal(p.breakdowns.category.find(r=>r.label==='Home').changeColor,'neutral');
 assert.equal(p.breakdowns.channel.find(r=>r.label==='web').changeColor,'green');
 const [newCategory]=segmentBreakdown([{label:'New',current:50,baseline:0}],50);
 assert.equal(newCategory.changePct,null);
 assert.equal(segmentBreakdown([{label:'Empty',current:0,baseline:0}],0)[0].sharePct,null);
});

test('decline prompts use exact daily dates rather than the latest weekly segment baseline',()=>{
 const p=salesPresentation(report());
 assert.equal(p.declineCues.length,1);
 const cue=p.declineCues[0];
 assert.equal(cue.date,'2026-10-06');
 assert.equal(cue.baselineDate,'2026-10-05');
 assert.equal(cue.change,-300);
 assert.equal(cue.changePct,-30);
 assert.match(cue.investigationPrompt,/2026-10-06 versus 2026-10-05/);
 assert.doesNotMatch(cue.investigationPrompt,/2026-09-30|caused|checkout friction/);
 assert.ok(p.nextQuestions.length<=3);
 assert.match(p.nextQuestions[0],/cancelled orders rose from 10 on 2026-09-30 to 20 on 2026-10-07/);
 assert.match(p.nextQuestions[1],/mobile_app/);
});

test('growth and unchanged reports still have an evidence-led forward question without invented decline',()=>{
 const growth=report();growth.current.cancelled_orders=5;growth.daily=[{date:'2026-10-07',revenue:800}];
 growth.channels=[{label:'web',current:800,baseline:700}];growth.categories=[{label:'Books',current:800,baseline:700}];
 const p=salesPresentation(growth);assert.equal(p.declineCues.length,0);assert.match(p.nextQuestions[0],/increase in Books/);
 growth.channels[0].baseline=800;growth.categories[0].baseline=800;
 const unchanged=salesPresentation(growth);assert.match(unchanged.nextQuestions[0],/category and channel mix/);
 assert.doesNotMatch(unchanged.nextQuestions[0],/increase|decline/);
 assert.match(reportingInstructions,/smooth shape-preserving/);
 assert.match(reportingInstructions,/cancellation increases are unfavorable/);
});
