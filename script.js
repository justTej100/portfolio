/* ── Name canvas: red waves flowing inside the letters ── */

const canvas = document.getElementById('nameCanvas');
const ctx = canvas.getContext('2d');

// Palette (matches style.css) and the same system UI font the report site uses.
const TEXT = '#ffffff';
const RED  = '#bd0b11';
const FONT_STACK = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

const NAME    = 'TEJINDER TJ BAJAJ';
const BIG     = 188;    // base font size before the name is fitted to the screen
const STRETCH = 1.55;   // vertical stretch that gives the tall, narrow look

/*
 * Wave layers, back to front. These mirror the four layers of the old page waves.
 *   level  - where the surface sits, as a fraction of the letter height from the top
 *   amp    - wave height, as a fraction of the letter height
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

let W = 0, H = 0, textTop = 0, textHeight = 0, rafId = null;

/** Size the canvas for the screen and pre-render the white name mask. */
function setup() {
  W = Math.min(window.innerWidth - 16, 1100);
  H = Math.floor(BIG * 1.30);

  // Render at the screen's pixel density so the name stays sharp.
  const dpr = window.devicePixelRatio || 1;
  for (const c of [canvas, mask]) {
    c.width  = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Fit the name to 97% of the width.
  mctx.font = `900 ${BIG}px ${FONT_STACK}`;
  const size = Math.floor(BIG * (W * 0.97) / mctx.measureText(NAME).width);

  const cy = Math.floor(BIG * 0.81);
  mctx.clearRect(0, 0, W, H);
  mctx.save();
  mctx.scale(1, STRETCH);
  mctx.font = `900 ${size}px ${FONT_STACK}`;
  mctx.fillStyle = TEXT;
  mctx.textAlign = 'center';
  mctx.textBaseline = 'middle';
  const m = mctx.measureText(NAME);
  mctx.fillText(NAME, W / 2, cy / STRETCH);
  mctx.restore();

  // Vertical extent of the letters, so the waves are positioned relative to them.
  textTop    = cy - m.actualBoundingBoxAscent * STRETCH;
  textHeight = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) * STRETCH;
}

/** Paint one frame. `now` is a time in milliseconds. */
function drawFrame(now) {
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(mask, 0, 0, W, H);

  // 'source-atop' paints only where the name already exists, so the waves
  // show up inside the letters and nowhere else.
  ctx.globalCompositeOperation = 'source-atop';
  for (const L of LAYERS) {
    const wavelength = L.len * W;
    const phase = (now / L.period) * Math.PI * 2;
    ctx.fillStyle = L.color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 3; x += 3) {
      const y = textTop + textHeight * (L.level + L.amp * Math.sin((x / wavelength) * Math.PI * 2 - phase));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }
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

/**
 * Startup power-meter: a count-up (0 to 100%) that climbs fast then jitters
 * at the end, before the overlay fades out to reveal the name.
 */
function runIntro() {
  const overlay = document.getElementById('introOverlay');
  const pctEl   = document.getElementById('introPct');
  if (!overlay || !pctEl) return;

  const duration = 900;
  const startTime = performance.now();

  function step(now) {
    const t = Math.max(0, Math.min(1, (now - startTime) / duration));
    const rampT = t < 0.85 ? t / 0.85 : 1;
    let val = Math.round(rampT * 100);
    if (t > 0.85 && t < 1) {
      val = 100 + Math.round(Math.sin(t * 60) * (1 - t) * 8);
    }
    pctEl.firstChild.textContent = val;

    const settle = t < 0.85 ? t : (1 - (t - 0.85) / 0.15);
    const shakeX = (Math.random() - 0.5) * 4 * settle;
    const shakeY = (Math.random() - 0.5) * 2.4 * settle;
    pctEl.style.transform = `translate(${shakeX.toFixed(1)}px, ${shakeY.toFixed(1)}px)`;

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      pctEl.firstChild.textContent = '100';
      pctEl.style.transform = 'none';
      setTimeout(() => {
        overlay.classList.add('hide');
        // Take the loading screen out of the page once it has faded, so its
        // "100%" text never ends up in search snippets.
        setTimeout(() => overlay.remove(), 400);
      }, 150);
    }
  }
  requestAnimationFrame(step);
}

runIntro();