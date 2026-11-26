#!/usr/bin/env python3
"""Patch christmas HTML shells for Vercel UAT (trackers + dog widget paths)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = [ROOT / "christmas" / name for name in ("index.html", "home2.html", "home3.html")]

UAT_SNIPPET = """<script>window.__THREE_SNOW_UAT__=/localhost$|127\\.0\\.0\\.1$|\\.vercel\\.app$/i.test(location.hostname);</script>
<script src="/assets/js/uat-bootstrap.js"></script>
"""

GTM_OLD = """<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KMR63XJV');</script>
<!-- End Google Tag Manager -->"""

GTM_NEW = """<!-- Google Tag Manager -->
<script>
if (!window.__THREE_SNOW_UAT__) {
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KMR63XJV');
}
</script>
<!-- End Google Tag Manager -->"""

GTAG_OLD = """<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-T8FV8XR2CG"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-T8FV8XR2CG');
</script>"""

GTAG_NEW = """<!-- Google tag (gtag.js) -->
<script>
if (!window.__THREE_SNOW_UAT__) {
  (function () {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-T8FV8XR2CG';
    document.head.appendChild(s);
  })();
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-T8FV8XR2CG');
}
</script>"""

CLARITY_OLD = """<!-- Microsoft Clarity tracking code -->
<script type="text/javascript">
(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "td3sk37dtx");
</script>
<!-- Microsoft Clarity tracking code -->"""

CLARITY_NEW = """<!-- Microsoft Clarity tracking code -->
<script type="text/javascript">
if (!window.__THREE_SNOW_UAT__) {
(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "td3sk37dtx");
}
</script>
<!-- Microsoft Clarity tracking code -->"""

FB_OLD_START = """<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)"""

FB_NEW_START = """<!-- Meta Pixel Code -->
<script>
if (!window.__THREE_SNOW_UAT__) {
!function(f,b,e,v,n,t,s)"""

FB_OLD_END = """fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=1456015915930587&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->"""

FB_NEW_END = """fbq('track', 'PageView');
}
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=1456015915930587&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->"""

TRACKER_OLD = """<script type="module" src="https://ra.three.com.hk/analytics/static/tracker.umd.cjs"></script>
<script type="module">
  Tracker(
    "https://ra.three.com.hk/analytics/",
    "dc795b6e8851475c9cde13620efe180e"
  );
</script>"""

TRACKER_NEW = """<script type="module">
if (!window.__THREE_SNOW_UAT__) {
  import("https://ra.three.com.hk/analytics/static/tracker.umd.cjs").then(function () {
    Tracker(
      "https://ra.three.com.hk/analytics/",
      "dc795b6e8851475c9cde13620efe180e"
    );
  });
}
</script>"""


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text

    if "uat-bootstrap.js" not in text:
        text = text.replace(
            "<base href=\"/christmas/\">\n\n",
            "<base href=\"/christmas/\">\n\n" + UAT_SNIPPET + "\n",
            1,
        )

    for old, new in (
        (GTM_OLD, GTM_NEW),
        (GTAG_OLD, GTAG_NEW),
        (CLARITY_OLD, CLARITY_NEW),
        (TRACKER_OLD, TRACKER_NEW),
    ):
        text = text.replace(old, new)

    if FB_OLD_START in text and "if (!window.__THREE_SNOW_UAT__) {\n!function(f,b,e,v,n,t,s)" not in text:
        text = text.replace(FB_OLD_START, FB_NEW_START, 1)
        text = text.replace(FB_OLD_END, FB_NEW_END, 1)

    text = text.replace(
        "https://www.three.com.hk/assets/images/",
        "/assets/images/",
    )

    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    for path in PAGES:
        if not path.is_file():
            print(f"skip missing {path}")
            continue
        changed = patch_file(path)
        print(f"{'patched' if changed else 'ok'}: {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()