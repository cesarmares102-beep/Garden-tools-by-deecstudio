/* Meta (Facebook) Pixel — verbatim bootstrap snippet, moved out of index.html
   into its own file so it doesn't need a CSP script-src 'unsafe-inline'
   exception. Loading connect.facebook.net/en_US/fbevents.js is still
   allowed explicitly in _headers (script-src), and the pixel's tracking
   requests to facebook.com/tr are allowed via connect-src/img-src there. */
!function (f, b, e, v, n, t, s) {
  if (f.fbq) return;
  n = f.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = !0;
  n.version = "2.0";
  n.queue = [];
  t = b.createElement(e);
  t.async = !0;
  t.src = v;
  s = b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t, s);
}(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
fbq("init", "1118290030539871");
fbq("track", "PageView");
