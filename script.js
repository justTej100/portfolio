/* ── Home screen: wave-filled name next to the GitHub picture ── */

const hero     = document.getElementById('hero');
const nameCell = document.getElementById('nameCell');
const canvas   = document.getElementById('nameCanvas');
const ctx      = canvas.getContext('2d');

// Palette (matches style.css) and the same system UI font the report site uses.
const TEXT = '#ffffff';
const RED  = '#bd0b11';
const FONT_STACK = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

const LINES = ['Tejinder', 'Tj Bajaj'];
const PAD   = 4;     // must match .hero-photo margin-top in style.css
const REF   = 100;   // reference font size used for measuring
const PITCH = 1.05;  // distance between the two baselines, in font sizes

/*
 * Wave layers, back to front, applied to each line of the name.
 *   level  - where the surface sits, as a fraction of the line's height from its top
 *   amp    - wave height, as a fraction of the line's height
 *   len    - wavelength, as a fraction of the canvas width
 *   period - milliseconds for one wavelength to travel past (7s, 10s, 13s, 20s)
 */
const LAYERS = [
  { level: 0.30, amp: 0.100, len: 0.30, period:  7000, color: 'rgba(189, 11, 17, 0.35)' },
  { level: 0.38, amp: 0.090, len: 0.23, period: 10000, color: 'rgba(189, 11, 17, 0.55)' },
  { level: 0.46, amp: 0.080, len: 0.18, period: 13000, color: 'rgba(189, 11, 17, 0.80)' },
  { level: 0.54, amp: 0.070, len: 0.14, period: 20000, color: RED }
];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Off-screen canvas holding the white name. Redrawn only when the size changes.
const mask = document.createElement('canvas');
const mctx = mask.getContext('2d');

let W = 0, H = 0, lines = [], bands = [], rafId = null, lastWidth = 0;

function measure(text) {
  mctx.font = `900 ${REF}px ${FONT_STACK}`;
  const m = mctx.measureText(text);
  return {
    left:  m.actualBoundingBoxLeft,
    right: m.actualBoundingBoxRight,
    asc:   m.actualBoundingBoxAscent,
    desc:  m.actualBoundingBoxDescent
  };
}

/**
 * Work out the layout, size the canvas and pre-render the white name.
 * Side by side, the photo starts at the name's height, then is drawn 30% larger.
 */
function setup() {
  const dpr = window.devicePixelRatio || 1;
  const sideBySide = window.matchMedia('(min-width: 760px)').matches;

  const m    = LINES.map(measure);
  const inkW = Math.max(...m.map(x => x.left + x.right));
  const inkR = m[0].asc + PITCH * REF;            // top of line 1 down to baseline of line 2

  let pfp = 0;
  if (sideBySide) {
    // Photo matches the name height, then grows 30%. Caps scale with that.
    const rowW = hero.clientWidth;
    const gap  = parseFloat(getComputedStyle(hero).columnGap) || 0;
    const a    = inkR / inkW;
    const matched = a * (rowW - gap) / (1 + a);
    pfp = Math.min(442, Math.max(182, matched * 1.3));
    hero.style.setProperty('--pfp', pfp.toFixed(1) + 'px');
  } else {
    hero.style.removeProperty('--pfp');           // phones use the CSS size
  }

  W = Math.floor(nameCell.clientWidth);
  let k = (W - 2) / inkW;
  k = sideBySide ? Math.min(k, pfp / inkR) : Math.min(k, 1.6);
  const size = REF * k;

  const asc   = m.map(x => x.asc  * k);
  const desc  = m.map(x => x.desc * k);
  const pitch = PITCH * REF * k;
  const inkH  = asc[0] + pitch;
  const boxH  = sideBySide ? Math.max(pfp, inkH) : inkH;
  const base1 = PAD + (boxH - inkH) / 2 + asc[0];
  const base2 = base1 + pitch;
  H = Math.ceil(PAD + boxH + desc[1] + PAD);

  lines = LINES.map((text, i) => {
    const base = i === 0 ? base1 : base2;
    return { text, x: m[i].left * k + 1, base, top: base - asc[i], bot: base + desc[i] };
  });
  const mid = (lines[0].bot + lines[1].top) / 2;
  bands = [[0, mid], [mid, H]];

  // Render at the screen's pixel density so the name stays sharp.
  for (const c of [canvas, mask]) {
    c.width  = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
  }
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  mctx.clearRect(0, 0, W, H);
  mctx.font = `900 ${size}px ${FONT_STACK}`;
  mctx.fillStyle = TEXT;
  mctx.textAlign = 'left';
  mctx.textBaseline = 'alphabetic';
  for (const ln of lines) mctx.fillText(ln.text, ln.x, ln.base);

  lastWidth = hero.clientWidth;
}

/** Paint one frame. `now` is a time in milliseconds. */
function drawFrame(now) {
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(mask, 0, 0, W, H);

  // 'source-atop' paints only where the name already exists, so the waves
  // show up inside the letters and nowhere else.
  ctx.globalCompositeOperation = 'source-atop';
  lines.forEach((ln, i) => {
    const h = ln.bot - ln.top;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, bands[i][0], W, bands[i][1] - bands[i][0]);
    ctx.clip();
    for (const L of LAYERS) {
      const wavelength = L.len * W;
      const phase = (now / L.period) * Math.PI * 2;
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(0, ln.bot + 4);
      for (let x = 0; x <= W + 3; x += 3) {
        const y = ln.top + h * (L.level + L.amp * Math.sin((x / wavelength) * Math.PI * 2 - phase));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, ln.bot + 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });
  ctx.globalCompositeOperation = 'source-over';
}

function loop(now) {
  drawFrame(now);
  rafId = requestAnimationFrame(loop);
}

/** Start the animation, or draw a single still frame if the visitor prefers reduced motion. */
function start() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (reduceMotion.matches) drawFrame(4000);
  else rafId = requestAnimationFrame(loop);
}

setup();
start();

window.addEventListener('resize', () => { setup(); start(); });
reduceMotion.addEventListener('change', start);

// A scrollbar can appear after the first layout and change the width, so re-fit if it does.
if ('ResizeObserver' in window) {
  new ResizeObserver(() => {
    if (hero.clientWidth !== lastWidth) { setup(); start(); }
  }).observe(hero);
}
