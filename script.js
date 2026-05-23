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
const TOTAL_FRAMES = 65;
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
 * Draw glitch slices of text with randomised horizontal/vertical offsets and
 * occasional red or blue colour tints to simulate chromatic channel corruption.
 * @param {string} text
 * @param {number} t - Intensity 0..1.
 * @param {number} [baseAlpha=0.92] - Opacity of each slice.
 */
function drawGlitch(text, t, baseAlpha = 0.92) {
  const { W, H } = dims;
  const slices = 8 + Math.floor(Math.random() * 14);
  for (let i = 0; i < slices; i++) {
    const sy  = Math.random() * H;
    const sh  = 1 + Math.random() * BIG * (0.06 + 0.28 * t);
    const ox  = (Math.random() - 0.5) * 58 * t;
    const oy  = (Math.random() - 0.5) * 5  * t;
    const rnd = Math.random();
    const col = rnd < 0.18 ? '#cc0000' : rnd < 0.34 ? '#1122cc' : '#000000';
    const sm  = col === '#000000' ? '#444' : col;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, sy, W, sh);
    ctx.clip();
    drawBase(text, ox, oy, col, sm, baseAlpha);
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

  // Subtle pulsing chroma shift on the small layer
  const pulse  = Math.sin(idleFrame * 0.035) * 0.5 + 0.5;
  const shift  = Math.round(1.2 + pulse * 2.8);
  ctx.font = `900 ${small}px Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = '#cc0000'; ctx.fillText(text, cx - shift, smallY);
  ctx.fillStyle = '#0011cc'; ctx.fillText(text, cx + shift, smallY);
  ctx.globalAlpha = 1;

  // Occasional random glitch slice (4 % chance per frame ≈ every ~1.7 s at 60 fps)
  if (Math.random() < 0.04) {
    const sy = smallY - small + Math.random() * small * 2;
    const sh = 2 + Math.random() * 7;
    const ox = (Math.random() - 0.5) * 14;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, sy, W, sh); ctx.clip();
    ctx.font = `900 ${small}px Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = Math.random() < 0.5 ? '#cc0000' : '#0011cc';
    ctx.fillText(text, cx + ox, smallY);
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
 * Render a chaotic glitch transition — white background throughout.
 * Layers (all intensity-gated by a sin bell curve):
 *  1. Triple RGB chromatic aberration (R left, B right, G up)
 *  2. fromText corrupting out with heavy slice displacement
 *  3. toText phasing in, also corrupted
 *  4. Inversion strips — black bars with white text punched through
 *  5. VHS displacement bars (extreme lateral shift)
 *  6. Ghost echo copies at random offsets
 *  7. Digital noise blocks (red / blue / grey rectangles)
 *  8. Scanline noise with coloured lines
 */
function renderTransition(fromText, toText, progress) {
  const { W, H } = dims;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  const bell       = Math.sin(progress * Math.PI);
  const bellSq     = bell * bell;
  const activeText = progress < 0.5 ? fromText : toText;

  // ── 1. Triple chromatic aberration ──
  const chromaShift = Math.round(bell * 52);
  if (chromaShift > 0) {
    ctx.globalAlpha = bell * 0.58;
    drawBase(activeText, -chromaShift,                  0, '#dd0000', '#dd0000', 1);
    drawBase(activeText,  chromaShift,                  0, '#0011cc', '#0011cc', 1);
    drawBase(activeText,  0,          -Math.round(bell * 10), '#008800', '#008800', 1);
    ctx.globalAlpha = 1;
  }

  // ── 2. fromText glitching out ──
  if (progress < 0.65) {
    const t     = Math.min(progress / 0.55, 1);
    const alpha = 1 - t * 0.94;
    drawGlitch(fromText, t, 0.92);
    drawBase(fromText, 0, 0, '#000', '#000', alpha);
  }

  // ── 3. toText glitching in ──
  if (progress > 0.35) {
    const t      = Math.min((progress - 0.35) / 0.55, 1);
    const corrupt = 1 - t;
    drawGlitch(toText, corrupt, 0.92);
    drawBase(toText, 0, 0, '#000', '#000', t);
  }

  // ── 4. Inversion strips (black band, white text inside) ──
  const numInvert = Math.floor(bellSq * 4);
  for (let i = 0; i < numInvert; i++) {
    const iy = Math.random() * H;
    const ih = BIG * (0.04 + Math.random() * 0.18);
    const ix = (Math.random() - 0.5) * 18 * bell;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, iy, W, ih); ctx.clip();
    ctx.fillStyle = '#111'; ctx.fillRect(0, iy, W, ih);
    drawBase(activeText, ix, 0, '#fff', '#ccc', 0.95);
    ctx.restore();
  }

  // ── 5. VHS displacement bars (extreme lateral shift) ──
  const numBars = Math.floor(bell * 8);
  for (let i = 0; i < numBars; i++) {
    const barY = Math.random() * H;
    const barH = BIG * (0.05 + Math.random() * 0.28);
    const barX = (Math.random() - 0.5) * W * 0.14 * bell;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, barY, W, barH); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(0, barY, W, barH);
    const barCol = Math.random() < 0.3 ? '#cc0000' : Math.random() < 0.5 ? '#0011cc' : '#000';
    drawBase(activeText, barX, 0, barCol, '#444', 0.75);
    ctx.restore();
  }

  // ── 6. Ghost echo copies ──
  if (bell > 0.35) {
    ctx.globalAlpha = bell * 0.14;
    for (let e = 0; e < 4; e++) {
      const ex = (Math.random() - 0.5) * 24 * bell;
      const ey = (Math.random() - 0.5) * 10 * bell;
      drawBase(activeText, ex, ey, '#000', '#000', 1);
    }
    ctx.globalAlpha = 1;
  }

  // ── 7. Digital noise blocks ──
  const numNoise = Math.floor(bellSq * 22);
  for (let i = 0; i < numNoise; i++) {
    const r = Math.random();
    ctx.fillStyle = r < 0.3 ? '#dd0000' : r < 0.6 ? '#0011cc' : r < 0.8 ? '#000' : '#999';
    ctx.globalAlpha = 0.35 + Math.random() * 0.55;
    ctx.fillRect(
      Math.random() * W,
      Math.random() * H,
      2 + Math.random() * 44,
      1 + Math.random() * 14
    );
  }
  ctx.globalAlpha = 1;

  // ── 8. Scanline noise (red-tinted for flavour) ──
  ctx.globalAlpha = bell * 0.07;
  for (let y = 0; y < H; y += 2) {
    if (Math.random() < 0.28) {
      ctx.fillStyle = Math.random() < 0.4 ? '#cc0000' : '#111';
      ctx.fillRect(Math.random() * W * 0.3, y, W * (0.22 + Math.random() * 0.55), 1);
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

renderIdle(states[0]);


