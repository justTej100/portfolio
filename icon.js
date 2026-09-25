/*
 * Tab icon: upgrade the square GitHub avatar link in <head> to a circular crop.
 * The square link stays as the fallback if the browser will not let us read the
 * image. It uses its own image size (s=96) so it never shares a cache entry with
 * the other avatar requests on the page, and it retries once on failure.
 */
(function () {
  var BASE = 'https://avatars.githubusercontent.com/u/181138594?v=4';

  function swap(url) {
    var old = document.getElementById('site-icon');
    var l = document.createElement('link');
    l.rel = 'icon'; l.type = 'image/png'; l.sizes = '64x64'; l.id = 'site-icon'; l.href = url;
    if (old && old.parentNode) old.parentNode.removeChild(old);
    document.head.appendChild(l);
  }

  function circle(img) {
    var n = 64, c = document.createElement('canvas');
    c.width = c.height = n;
    var x = c.getContext('2d');
    x.beginPath(); x.arc(n / 2, n / 2, n / 2, 0, Math.PI * 2); x.closePath(); x.clip();
    x.drawImage(img, 0, 0, n, n);
    return c.toDataURL('image/png');
  }

  function load(src, retry) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      try { swap(circle(img)); console.info('[icon] circular icon applied'); }
      catch (e) { console.info('[icon] canvas blocked, keeping square icon'); }
    };
    img.onerror = function () {
      if (retry) { console.info('[icon] first load failed, retrying'); load(src + '&r=' + Date.now(), false); }
      else console.info('[icon] avatar unreadable, keeping square icon');
    };
    img.src = src;
  }

  load(BASE + '&s=96', true);
})();
