/**
 * Snow / Christmas UAT on localhost and *.vercel.app:
 * - Stub analytics so Edge/Firefox do not prompt on third-party trackers
 * - Rewrite /3api/ JSON to use same-origin /media/ paths (backup to on-disk JSON)
 */
(function () {
  if (!window.__THREE_SNOW_UAT__) return;

  window.dataLayer = window.dataLayer || [];
  function noop() {}
  window.gtag = noop;
  window.fbq = noop;
  window.clarity = noop;
  window.Tracker = function () {};

  var from = 'https://www.three.com.hk/media/';
  var fromEsc = 'https:\\/\\/www.three.com.hk\\/media\\/';

  function rewriteMediaText(text) {
    if (typeof text !== 'string' || text.indexOf('three.com.hk/media') === -1) return text;
    return text.split(from).join('/media/').split(fromEsc).join('\\/media\\/');
  }

  var origFetch = window.fetch;
  if (!origFetch) return;

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input && input.url ? input.url : '';
    return origFetch.call(this, input, init).then(function (response) {
      if (!/\/3api\//.test(url)) return response;
      return response.text().then(function (body) {
        var rewritten = rewriteMediaText(body);
        return new Response(rewritten, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      });
    });
  };
})();