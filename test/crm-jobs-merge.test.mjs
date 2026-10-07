import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeJobApplications } from '../scripts/crm-workspace.mjs';
const now = Date.parse('2026-10-06T12:00:00Z');
const job = (id, stage, days, company='Example Inc', position='Product Designer', requisitionId='') => ({id,threadId:id,kind:'jobs',stage,lastTouch:new Date(now-days*86400000).toISOString(),application:{company,position,requisitionId},quote:stage,evidence:[stage]});
test('normalized company and position merge; closure excludes open across threads',()=>{
 const result=mergeJobApplications([job('a','Closed',20),job('b','Open',1,'EXAMPLE INC','product designer')],now);
 assert.equal(result.length,1);assert.equal(result[0].stage,'Closed');assert.equal(result[0].applicationThreads.length,2);
});
test('latest combined contact governs inactivity; explicit inactive cannot leave open duplicate',()=>{
 assert.equal(mergeJobApplications([job('a','Inactive',20),job('b','Open',1)],now)[0].stage,'Open');
 assert.equal(mergeJobApplications([job('a','Inactive',20),job('b','Inactive',9)],now)[0].stage,'Inactive');
 const a=job('a','Inactive',1);a.manualStatus=true;
 assert.equal(mergeJobApplications([a,job('b','Open',1)],now)[0].stage,'Inactive');
});
test('different positions and requisitions remain distinct; missing identity is not guessed',()=>{
 assert.equal(mergeJobApplications([job('a','Open',1),job('b','Open',1,'Example Inc','Engineer')],now).length,2);
 assert.equal(mergeJobApplications([job('a','Open',1,'Example Inc','Engineer','123'),job('b','Closed',1,'Example Inc','Engineer','456')],now).length,2);
 const a=job('a','Open',1);a.application=null;
 assert.equal(mergeJobApplications([a,job('b','Closed',1)],now).length,2);
});
