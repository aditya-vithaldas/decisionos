(() => {
  const measurementId = document.currentScript?.dataset.decisionaxisAnalytics;
  if (!measurementId || window.decisionAxisAnalyticsLoaded) return;
  window.decisionAxisAnalyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };

  // Study invitations and private app URLs contain credentials in query strings.
  // Send page paths and campaign attribution, without query tokens or fragments.
  function pageURL(value) {
    try {
      const url = new URL(value, location.href);
      const campaign = new URLSearchParams();
      for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id']) {
        if (url.searchParams.has(key)) campaign.set(key, url.searchParams.get(key));
      }
      url.search = campaign.toString();
      url.hash = '';
      return url.href;
    } catch { return ''; }
  }

  const initialReferrer = document.referrer ? pageURL(document.referrer) : '';
  let previousPage;
  function pageView() {
    const page = pageURL(location.href);
    if (page === previousPage) return;
    gtag('event', 'page_view', {
      page_location: page,
      page_referrer: previousPage || initialReferrer,
      page_title: document.title,
      send_to: measurementId,
    });
    previousPage = page;
  }

  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: false,
    page_location: pageURL(location.href),
    page_referrer: initialReferrer,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  pageView();
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      pageView();
      return result;
    };
  }
  window.addEventListener('popstate', pageView);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
})();
