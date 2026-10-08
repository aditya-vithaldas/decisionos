import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderSalesDashboard} from './dashboard.mjs';

test('canonical dashboards embed the exact snapshot safely and retain its refresh marker',async()=>{
 const report={datasetVersion:'test-v1',category:'</script><script>injected()</script>'};
 for(const name of ['performance','rca']){
  const html=await renderSalesDashboard(report,name);
  assert.match(html,/data-dashboard-layout="compact-v2"/);
  assert.ok(!html.includes('__COMMERCE_SNAPSHOT__'));
  const payload=html.match(/<script id="commerce-snapshot" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(payload);assert.deepEqual(JSON.parse(payload),report);
  assert.ok(!html.includes(report.category));
 }
 await assert.rejects(()=>renderSalesDashboard(report,'../../secrets'),/Unknown dashboard/);
});
