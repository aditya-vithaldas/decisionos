import test from 'node:test';import assert from 'node:assert/strict';import {sourcePaymentFailure} from '../scripts/crm-workspace.mjs';
const candidate=text=>({lastTouch:'2026-10-07T08:00:00.000Z',messages:[{text}]});
test('failed payments use literal source amounts/references/dates; conditional or resolved failures do not become outstanding failure cards',()=>{
 const raw=candidate('Your payment failed. Amount: EUR 42.50. Invoice: INV-123. Failure date: 2026-10-06. Please retry your payment.');const result=sourcePaymentFailure(raw);assert.equal(result.amount,'42.50');assert.equal(result.currency,'EUR');assert.equal(result.reference,'INV-123');assert.equal(result.date,'2026-10-06');assert.equal(result.requiresAction,true);assert.ok(raw.messages[0].text.includes(result.amountQuote));assert.ok(raw.messages[0].text.includes(result.quote));
 assert.equal(sourcePaymentFailure(candidate('If your payment failed, please retry.')),null);assert.equal(sourcePaymentFailure(candidate('Your payment failed. Retry now successful.')),null);
 const unknown=sourcePaymentFailure(candidate('Transaction declined. Please update your payment method.'));assert.equal(unknown.amount,null);assert.equal(unknown.currency,null);assert.equal(unknown.date,null);assert.equal(unknown.reportedAt,'2026-10-07T08:00:00.000Z');
 assert.equal(sourcePaymentFailure(candidate('Thanks for your payment. On Monday someone wrote: Your payment failed.')),null);
});
