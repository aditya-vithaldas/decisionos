export const reportingPolicy = {
 version: '2026-10-08.1',
 presentation: 'Always show a sales dashboard when supported, followed by a concise interpretation and a specific forward question.',
 temporalCharts: 'Always use a smooth shape-preserving curve (for example, monotone cubic interpolation) for temporal trends. Keep observed points, exact values and dates visible; smoothing is presentation, not invented observations. Use bars for categorical splits and revenue bridges.',
 changeColors: 'Color favorable changes green, unfavorable changes red, and unchanged or unknown changes neutral. Keep arrows, signs and labels so meaning does not depend on color. Revenue, orders, conversion and average order value increases are favorable; cancellation increases are unfavorable.',
 requiredBreakdowns: ['category', 'channel'],
 breakdownRules: 'Every sales-performance answer includes category AND channel revenue splits, with share, absolute change and percentage change against the same explicitly named baseline. Show both dimensions together; category and channel contributions overlap and must not be added. For another date or period, query both splits for that exact scope instead of reusing the latest-day splits.',
 declineCues: 'Every decline mentioned includes its exact dates, size and comparator, followed by a specific investigation question or action. If segment evidence is unavailable for that date, propose querying it; do not attach another date’s segment changes or scenario context as an explanation.',
 forwardQuestion: 'Always end sales-performance responses with one evidence-led question the customer is likely to ask next. Name the date, category, channel or driver that makes the question useful; avoid a generic “anything else?” Ask whether to investigate a material dip when one is present.',
 evidenceRules: 'Use measured contribution rather than causal claims. Synthetic scenario events are context, not proven causes. Preserve synthetic-data labeling and metric definitions.'
};

export const reportingInstructions = [
 'Read-only access to SYNTHETIC daily ecommerce data. All monetary amounts USD.',
 'Resolve yesterday against the user’s calendar; verify that date is available in get_schema period.end. Data updates at 08:00 Europe/Berlin for the previous complete day.',
 'Use get_sales_intelligence for grounded sales performance and RCA.',
 ...Object.entries(reportingPolicy).filter(([key]) => !['version', 'requiredBreakdowns'].includes(key)).map(([, value]) => value),
 'Always include category and channel splits in sales-performance reports.'
].join(' ');

const changePct = (current, baseline) => baseline ? (current - baseline) / baseline * 100 : null;
const usd = value => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0}).format(value);
const direction = change => change === 0 ? 'unchanged' : change > 0 ? 'up' : 'down';
export function segmentBreakdown(rows, total) {
 return rows.map(row => {
  const change = row.current - row.baseline;
  return {...row, sharePct:total ? row.current / total * 100 : null, change, changePct:changePct(row.current, row.baseline), direction:direction(change), changeColor:change === 0 ? 'neutral' : change > 0 ? 'green' : 'red'};
 }).sort((a,b) => b.current - a.current || a.label.localeCompare(b.label));
}

export function salesPresentation(report) {
 const breakdowns = {baselineDate:report.baselineDate, category:segmentBreakdown(report.categories, report.current.revenue), channel:segmentBreakdown(report.channels, report.current.revenue)};
 const declineCues = report.daily.slice(1).flatMap((day,index) => {
  const previous = report.daily[index];
  const change = day.revenue - previous.revenue;
  if(change >= 0) return [];
  const pct = changePct(day.revenue, previous.revenue);
  const question = `Do you want to investigate the ${pct === null ? usd(-change) : Math.abs(pct).toFixed(1)+'%'} sales drop on ${day.date} versus ${previous.date}, starting with traffic, completed conversion, average order value, and category and channel contributions?`;
  return [{date:day.date, baselineDate:previous.date, change, changePct:pct, changeColor:'red', question, investigationPrompt:`Investigate the ${usd(-change)} revenue drop on ${day.date} versus ${previous.date}. Query traffic, completed conversion, average order value, and both category and channel revenue splits for these exact dates. Quantify contributions, distinguish measured changes from unproven causes, show smooth temporal graphs with green favorable and red unfavorable deltas, and finish with an evidence-led forward question.`}];
 });
 const largestDip = [...declineCues].sort((a,b) => a.change - b.change)[0];
 const weakestChannel = [...breakdowns.channel].sort((a,b) => a.change - b.change)[0];
 const strongestCategoryChange = [...breakdowns.category].sort((a,b) => Math.abs(b.change) - Math.abs(a.change))[0];
 const nextQuestions = [];
 if(report.current.cancelled_orders > report.baseline.cancelled_orders) nextQuestions.push(`Do you want to investigate why cancelled orders rose from ${report.baseline.cancelled_orders} on ${report.baselineDate} to ${report.current.cancelled_orders} on ${report.dataThrough}, and whether that increase is concentrated in a channel or category?`);
 if(weakestChannel?.change < 0) nextQuestions.push(`Do you want to investigate the ${usd(-weakestChannel.change)} decline in ${weakestChannel.label} revenue on ${report.dataThrough} versus ${report.baselineDate}, including the category split within that channel?`);
 if(largestDip) nextQuestions.push(largestDip.question);
 if(!nextQuestions.length && strongestCategoryChange?.change) nextQuestions.push(`What accounts for the ${usd(Math.abs(strongestCategoryChange.change))} ${strongestCategoryChange.direction === 'down' ? 'decline' : 'increase'} in ${strongestCategoryChange.label} revenue on ${report.dataThrough} versus ${report.baselineDate}, and which channels contributed?`);
 if(!nextQuestions.length) nextQuestions.push(`Do you want to compare the category and channel mix on ${report.dataThrough} versus ${report.baselineDate} to find changes hidden by the overall result?`);
 return {policy:reportingPolicy, breakdowns, declineCues, nextQuestions:nextQuestions.slice(0,3)};
}
