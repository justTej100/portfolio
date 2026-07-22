/* ── Name canvas electric effect ── */

// Top-level DOM and rendering context used for the animated name canvas.
// `canvas`: the <canvas> element with id 'nameCanvas'.
// `ctx`: 2D rendering context used for all drawing operations.
const canvas = document.getElementById('nameCanvas');
const ctx = canvas.getContext('2d');

// `states`: array of name strings that the animation cycles through.
// `idx`: current index into `states`.
// `animId`: id returned from requestAnimationFrame for the active animation (or null).
// `phase`: 'idle' when static, 'transitioning' when an animated change is in progress.
// `frame`: current frame counter used during transitions.
// `TOTAL_FRAMES`: number of animation frames used for a full transition.
// `BIG`: base font size used for the large (display) text.
const states = ['I AM TEJINDER', 'I AM TJ'];
let idx = 0;
let animId     = null;
let idleAnimId = null;
let idleFrame  = 0;
let phase = 'idle';
let frame = 0;
const TOTAL_FRAMES = 60;
const BIG = 188;

/**
 * Initialize the canvas size based on viewport width and the base font size.
 * @returns {{W: number, H: number}} Computed canvas dimensions.
 */
function initCanvas() {
  const W = Math.min(window.innerWidth - 16, 1100);
  const H = Math.floor(BIG * 1.30);
  canvas.width = W;
  canvas.height = H;
  return { W, H };
}

let dims = initCanvas();

// Shared font size computed from the longest state so all texts render
// at the same character height — shorter texts just take less width.
let sharedBigSize = BIG;
function computeSharedBigSize() {
  const longestText = states.reduce((a, b) => a.length > b.length ? a : b);
  ctx.font = `900 ${BIG}px "Times New Roman", serif`;
  const measured = ctx.measureText(longestText).width;
  sharedBigSize = Math.floor(BIG * (dims.W * 0.97) / measured);
}
computeSharedBigSize();

// ── Mob Psycho palette: stark black/white with a single red accent ──
const NEON = ['#000000','#000000','#ffffff','#e24b4a','#000000','#ffffff','#e24b4a','#000000'];
function randNeon() { return NEON[Math.floor(Math.random() * NEON.length)]; }

/**
 * Draw the two overlapping text layers that produce the logo/name effect.
 * A large vertically-stretched serif layer sits behind a smaller Impact layer,
 * both centered at the same point so they overlap and create depth.
 * @param {string} text - The text to draw.
 * @param {number} offsetX - Horizontal pixel offset from center.
 * @param {number} offsetY - Vertical pixel offset from center.
 * @param {string} colorBig - CSS color for the large text layer.
 * @param {string} colorSmall - CSS color for the small overlapping layer.
 * @param {number} alpha - Global opacity to use while drawing.
 */
function drawBase(text, offsetX, offsetY, colorBig, colorSmall, alpha) {
  const { W, H } = dims;
  const cx = W / 2 + offsetX;
  // cy is fixed relative to BIG (not H) so top padding stays tight
  // regardless of how tall the canvas is.
  const cy = Math.floor(BIG * 0.81) + offsetY;
  ctx.globalAlpha = alpha;

  // ── Large vertically-stretched serif layer ──
  ctx.save();
  ctx.scale(1, 1.55);
  ctx.font = `900 ${sharedBigSize}px "Times New Roman", serif`;
  ctx.fillStyle = colorBig;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy / 1.55);
  ctx.restore();

  // ── Smaller Impact layer centered on the same point ──
  const small = Math.floor(BIG * 0.26);
  const smallY = cy + small * 0.08;
  ctx.font = `900 ${small}px Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // White outline pass
  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
  ctx.lineWidth = Math.max(1.5, small * 0.07);
  ctx.lineJoin = 'round';
  ctx.strokeText(text, cx, smallY);
  // Fill pass
  ctx.fillStyle = colorSmall;
  ctx.fillText(text, cx, smallY);
  ctx.globalAlpha = 1;
}

/**
 * Recursively draw a lightning-style bolt between two points.
 * This function builds a jagged polyline with randomized subdivision points
 * and may spawn short child branches for visual complexity.
 * @param {number} x1 - Start x-coordinate.
 * @param {number} y1 - Start y-coordinate.
 * @param {number} x2 - End x-coordinate.
 * @param {number} y2 - End y-coordinate.
 * @param {number} roughness - Typical displacement for intermediate points.
 * @param {string} color - Stroke color / shadow color for the bolt.
 * @param {number} lw - Line width for the bolt stroke.
 * @param {number} blur - Shadow blur to apply for glow.
 * @param {number} depth - Recursive depth (used to limit branching).
 */
function bolt(x1, y1, x2, y2, roughness, color, lw, blur, depth) {
  if (depth > 3) return;
  const { W, H } = dims;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.lineCap = 'round';

  const pts = [[x1, y1]];
  const steps = 8 + Math.floor(Math.random() * 8);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    pts.push([
      x1 + (x2 - x1) * t + (Math.random() - 0.5) * roughness,
      y1 + (y2 - y1) * t + (Math.random() - 0.5) * roughness * 0.3
    ]);
  }
  pts.push([x2, y2]);

  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.restore();

  if (Math.random() < 0.35 && depth < 2) {
    const bi = Math.floor(Math.random() * (pts.length - 1));
    const bx = pts[bi][0], by = pts[bi][1];
    const ang = (Math.random() - 0.5) * 1.4;
    const len = roughness * 0.5 * (0.3 + Math.random() * 0.5);
    bolt(bx, by, bx + Math.cos(ang) * len, by + Math.sin(ang) * len * 0.4,
      roughness * 0.4, color, lw * 0.5, blur * 0.6, depth + 1);
  }
}

/**
 * Create a single randomized bolt originating from a random canvas edge
 * and terminating roughly near the canvas center. The appearance (color,
 * line width, blur) is randomized and scaled by the provided intensity.
 * @param {number} intensity - Multiplier (0..1) controlling stroke widths.
 */
function randomBolt(intensity) {
  const { W, H } = dims;
  const pad = -80;
  let x1, y1;
  const edge = Math.random();
  if (edge < 0.25)      { x1 = pad + Math.random() * (W - pad * 2); y1 = pad; }
  else if (edge < 0.5)  { x1 = W - pad; y1 = pad + Math.random() * (H - pad * 2); }
  else if (edge < 0.75) { x1 = pad + Math.random() * (W - pad * 2); y1 = H - pad; }
  else                  { x1 = pad; y1 = pad + Math.random() * (H - pad * 2); }

  const x2 = W / 2 + (Math.random() - 0.5) * W * 0.9;
  const y2 = H / 2 + (Math.random() - 0.5) * H * 0.9;

  const r = Math.random();
  let color, lw, blur;
  if (r < 0.55)      { color = '#000000'; lw = 0.4 + Math.random() * 1.2; blur = 6 + Math.random() * 10; }
  else if (r < 0.8)  { color = '#333333'; lw = 0.3 + Math.random() * 0.8; blur = 4 + Math.random() * 8; }
  else if (r < 0.92) { color = '#111111'; lw = 1.0 + Math.random() * 2.0; blur = 14 + Math.random() * 20; }
  else               { color = `rgba(200,0,0,${0.1 + Math.random() * 0.15})`; lw = 0.3 + Math.random() * 0.7; blur = 8; }

  bolt(x1, y1, x2, y2, 70 + Math.random() * 80, color, lw * intensity, blur, 0);
}

/**
 * Draw neon glitch slices — each strip is a different colour from the NEON
 * palette, with a matching shadowBlur glow, displaced by a random offset.
 * @param {string} text
 * @param {number} t - Intensity 0..1.
 * @param {number} [baseAlpha=0.92]
 */
function drawGlitch(text, t, baseAlpha = 0.92) {
  const { W, H } = dims;
  const slices = 4 + Math.floor(Math.random() * 6);
  for (let i = 0; i < slices; i++) {
    const sy  = Math.random() * H;
    const sh  = 1 + Math.random() * BIG * (0.06 + 0.34 * t);
    const ox  = (Math.random() - 0.5) * 72 * t;
    const oy  = (Math.random() - 0.5) * 7  * t;
    const col = Math.random() < 0.75 ? randNeon() : '#000';
    ctx.save();
    ctx.beginPath(); ctx.rect(0, sy, W, sh); ctx.clip();
    drawBase(text, ox, oy, col, col, baseAlpha);
    ctx.restore();
  }
}



/**
 * Draw one frame of the idle state: big serif layer is fully static; the small
 * Impact layer gets a continuous low-level chromatic aberration pulse plus
 * occasional random glitch slices so it never fully settles.
 */
function renderIdleFrame(text) {
  const { W, H } = dims;
  const cx    = W / 2;
  const cy    = Math.floor(BIG * 0.81);
  const small = Math.floor(BIG * 0.26);
  const smallY = cy + small * 0.08;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // Big serif layer — completely static
  ctx.save();
  ctx.scale(1, 1.55);
  ctx.font = `900 ${sharedBigSize}px "Times New Roman", serif`;
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy / 1.55);
  ctx.restore();

  // Neon colour-cycling chroma on the small layer
  const t      = idleFrame * 0.032;
  const pulse  = Math.sin(t) * 0.5 + 0.5;
  const shift  = Math.round(1.4 + pulse * 3.2);
  const colA   = NEON[Math.floor(t * 0.4) % NEON.length];
  const colB   = NEON[(Math.floor(t * 0.4) + 4) % NEON.length];
  ctx.font = `900 ${small}px Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = colA; ctx.fillText(text, cx - shift, smallY);
  ctx.fillStyle = colB; ctx.fillText(text, cx + shift, smallY);
  ctx.globalAlpha = 1;

  // Neon glitch slice (8 % chance per frame)
  if (Math.random() < 0.08) {
    const sy  = smallY - small + Math.random() * small * 2.2;
    const sh  = 1 + Math.random() * 9;
    const ox  = (Math.random() - 0.5) * 20;
    const col = randNeon();
    ctx.save();
    ctx.beginPath(); ctx.rect(0, sy, W, sh); ctx.clip();
    ctx.font = `900 ${small}px Impact, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = col; ctx.fillText(text, cx + ox, smallY);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Small text — normal draw on top
  ctx.font = `900 ${small}px Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
  ctx.lineWidth   = Math.max(1.5, small * 0.07);
  ctx.lineJoin    = 'round';
  ctx.strokeText(text, cx, smallY);
  ctx.fillStyle = '#000';
  ctx.fillText(text, cx, smallY);
}

function stopIdleAnimation() {
  if (idleAnimId) { cancelAnimationFrame(idleAnimId); idleAnimId = null; }
}

/**
 * Start the continuous idle animation loop for the given text.
 * Cancels any previous idle loop first.
 */
function renderIdle(text) {
  stopIdleAnimation();
  idleFrame = 0;
  function step() {
    idleFrame++;
    renderIdleFrame(text);
    idleAnimId = requestAnimationFrame(step);
  }
  step();
}

/**
 * Absolutely unhinged neon glitch transition — white background, 8-colour
 * palette used across every effect simultaneously.
 *
 *  1. Neon background tint flash
 *  2. 8-way chromatic star (one copy of text per NEON colour, all 8 directions)
 *  3. Skewed ghost layers (ctx.transform warp + neon colour)
 *  4. Neon glitch slices (drawGlitch — 75 % chance each slice is neon)
 *  5. fromText fading out / toText fading in
 *  6. Neon inversion strips (black band + glowing neon text inside)
 *  7. VHS bars with neon colours + glow
 *  8. 6 ghost echo copies in random neon colours
 *  9. Neon pixel explosion (up to 80 rectangles at peak)
 * 10. Rainbow scanlines
 */
function renderTransition(fromText, toText, progress) {
  const { W, H } = dims;
  const bell       = Math.sin(progress * Math.PI);
  const bellSq     = bell * bell;
  const bellCu     = bellSq * bell;
  const activeText = progress < 0.5 ? fromText : toText;

  // ── 1. White base + neon background tint at peak ──
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  if (bell > 0.65) {
    ctx.globalAlpha = (bell - 0.65) / 0.35 * 0.15;
    ctx.fillStyle = randNeon();
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // ── 2. 4-way neon chromatic cross (no shadowBlur) ──
  const chromaR = Math.round(bell * 50);
  if (chromaR > 0) {
    ctx.globalAlpha = bell * 0.50;
    const axes = [0, 2, 4, 6]; // E, S, W, N — 4 directions
    for (let i = 0; i < 4; i++) {
      const ang = axes[i] * Math.PI / 4;
      const dx  = Math.round(Math.cos(ang) * chromaR);
      const dy  = Math.round(Math.sin(ang) * chromaR * 0.22);
      drawBase(activeText, dx, dy, NEON[i], NEON[i], 1);
    }
    ctx.globalAlpha = 1;
  }

  // ── 3. Skewed warp ghost (2 layers only) ──
  if (bell > 0.35) {
    for (let s = 0; s < 2; s++) {
      const skX = (Math.random() - 0.5) * 0.16 * bell;
      const skY = (Math.random() - 0.5) * 0.08 * bell;
      const dx  = (Math.random() - 0.5) * 36 * bell;
      const col = randNeon();
      ctx.save();
      ctx.transform(1, skY, skX, 1, 0, 0);
      ctx.globalAlpha = bell * 0.18;
      drawBase(activeText, dx, 0, col, col, 1);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // ── 4. Neon glitch slices ──
  if (progress < 0.65) drawGlitch(fromText, Math.min(progress / 0.52, 1), 0.90);
  if (progress > 0.35) drawGlitch(toText, Math.min((progress - 0.35) / 0.52, 1) * 0.9, 0.90);

  // ── 5. fromText fading out / toText fading in ──
  if (progress < 0.65) drawBase(fromText, 0, 0, '#000', '#000', 1 - Math.min(progress / 0.52, 1) * 0.94);
  if (progress > 0.35) drawBase(toText,   0, 0, '#000', '#000', Math.min((progress - 0.35) / 0.52, 1));

  // ── 6. Neon inversion strips (max 2) ──
  const numInvert = Math.floor(bellSq * 2);
  for (let i = 0; i < numInvert; i++) {
    const iy  = Math.random() * H;
    const ih  = BIG * (0.03 + Math.random() * 0.22);
    const ix  = (Math.random() - 0.5) * 24 * bell;
    const col = randNeon();
    ctx.save();
    ctx.beginPath(); ctx.rect(0, iy, W, ih); ctx.clip();
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, iy, W, ih);
    drawBase(activeText, ix, 0, col, col, 0.96);
    ctx.restore();
  }

  // ── 7. VHS displacement bars (max 4) ──
  const numBars = Math.floor(bell * 4);
  for (let i = 0; i < numBars; i++) {
    const barY = Math.random() * H;
    const barH = BIG * (0.04 + Math.random() * 0.30);
    const barX = (Math.random() - 0.5) * W * 0.17 * bell;
    const col  = Math.random() < 0.7 ? randNeon() : '#000';
    ctx.save();
    ctx.beginPath(); ctx.rect(0, barY, W, barH); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(0, barY, W, barH);
    drawBase(activeText, barX, 0, col, col, 0.82);
    ctx.restore();
  }

  // ── 8. Ghost echo copies (2 neon) ──
  if (bell > 0.30) {
    ctx.globalAlpha = bell * 0.15;
    for (let e = 0; e < 2; e++) {
      const ex  = (Math.random() - 0.5) * 34 * bell;
      const ey  = (Math.random() - 0.5) * 14 * bell;
      drawBase(activeText, ex, ey, randNeon(), randNeon(), 1);
    }
    ctx.globalAlpha = 1;
  }

  // ── 9. Neon pixel explosion (rects only — cheap) ──
  const numPx = Math.floor(bellCu * 35);
  for (let i = 0; i < numPx; i++) {
    ctx.fillStyle   = randNeon();
    ctx.globalAlpha = 0.35 + Math.random() * 0.6;
    ctx.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 52, 1 + Math.random() * 16);
  }
  ctx.globalAlpha = 1;

  // ── 10. Rainbow scanlines (every 4 px, low probability) ──
  ctx.globalAlpha = bell * 0.09;
  for (let y = 0; y < H; y += 4) {
    if (Math.random() < 0.20) {
      ctx.fillStyle = randNeon();
      ctx.fillRect(Math.random() * W * 0.2, y, W * (0.28 + Math.random() * 0.6), 1);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Start the transition animation to the next name in the `states` array.
 * If an animation is already running this function is a no-op. Uses
 * `requestAnimationFrame` to drive the transition frames and updates
 * `phase`/`frame`/`animId` accordingly.
 */
function triggerName() {
  if (phase === 'transitioning') return;
  stopIdleAnimation();
  const fromText = states[idx];
  idx = (idx + 1) % states.length;
  const toText = states[idx];
  phase = 'transitioning';
  frame = 0;
  if (animId) cancelAnimationFrame(animId);

  function step() {
    const progress = Math.min(frame / TOTAL_FRAMES, 1);
    renderTransition(fromText, toText, progress);
    frame++;
    if (frame <= TOTAL_FRAMES) {
      animId = requestAnimationFrame(step);
    } else {
      phase = 'idle';
      renderIdle(toText);
    }
  }
  step();
}

window.addEventListener('resize', () => {
  dims = initCanvas();
  computeSharedBigSize();
  if (phase === 'idle') { stopIdleAnimation(); renderIdle(states[idx]); }
});

/**
 * Mob Psycho style startup: a power-meter count-up (0 -> 100%) that climbs
 * fast then jitters/overshoots right at the end, before the overlay fades
 * out to reveal the name canvas underneath.
 */
function runIntro() {
  const overlay = document.getElementById('introOverlay');
  const pctEl   = document.getElementById('introPct');
  const signEl  = document.getElementById('introPctSign');
  if (!overlay || !pctEl) { renderIdle(states[0]); return; }

  const duration = 900;
  const start = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
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
      requestAnimationFrame(frame);
    } else {
      pctEl.firstChild.textContent = '100';
      pctEl.style.transform = 'none';
      setTimeout(() => {
        overlay.classList.add('hide');
        renderIdle(states[0]);
      }, 150);
    }
  }
  requestAnimationFrame(frame);
}

runIntro();


