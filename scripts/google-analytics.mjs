export function createAnalyticsInjector(measurementId = '') {
  if (!measurementId) return html => html;
  if (!/^G-[A-Z0-9]+$/.test(measurementId)) {
    throw new Error('GOOGLE_ANALYTICS_MEASUREMENT_ID must be a GA4 measurement ID.');
  }
  const tag = `<script src="/assets/google-analytics.js" data-decisionaxis-analytics="${measurementId}" defer></script>`;
  return html => html.includes('data-decisionaxis-analytics=')
    ? html
    : html.replace(/<\/head>/i, `${tag}</head>`);
}
