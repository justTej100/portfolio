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
let animId = null;
let phase = 'idle';
let frame = 0;
const TOTAL_FRAMES = 55;
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
 * Draw horizontal glitch "slices" of the provided text. Each slice is a clipped
 * rectangle with a horizontal offset to create a corrupted/glitchy appearance.
 * @param {string} text - The text to glitch.
 * @param {number} t - Intensity factor (0..1) controlling horizontal offsets.
 */
function drawGlitch(text, t) {
  const { W, H } = dims;
  const slices = 5 + Math.floor(Math.random() * 8);
  for (let i = 0; i < slices; i++) {
    const sy = Math.random() * H;
    const sh = 2 + Math.random() * (BIG * 0.22);
    const ox = (Math.random() - 0.5) * 40 * t;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, sy, W, sh);
    ctx.clip();
    drawBase(text, ox, 0, '#000', '#555', 0.88);
    ctx.restore();
  }
}



/**
 * Render the static (idle) state for a given text value. Clears the canvas to
 * white and paints the base text plus scanlines.
 * @param {string} text - The text to render in the idle state.
 */
function renderIdle(text) {
  const { W, H } = dims;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  drawBase(text, 0, 0, '#000000', '#000000', 1);
}

/**
 * Render a transition animation between two text values.
 * `progress` is expected to be in the 0..1 range where 0 is the start and 1
 * is the end of the transition. The function renders bolts, glitches and
 * crossfades between the old and new text depending on progress.
 * @param {string} fromText - Text value transitioning from.
 * @param {string} toText - Text value transitioning to.
 * @param {number} progress - Normalized progress (0..1) for the transition.
 */
function renderTransition(fromText, toText, progress) {
  const { W, H } = dims;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  const intensity = Math.sin(progress * Math.PI);
  const boltCount = Math.floor(3 + intensity * 18);
  for (let i = 0; i < boltCount; i++) randomBolt(intensity);

  if (progress < 0.45) {
    const corrupt = progress / 0.45;
    drawGlitch(fromText, corrupt);
    const shift = Math.floor(corrupt * 16);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.22 * corrupt;
    drawBase(fromText, -shift, 0, '#000', '#000', 1);
    drawBase(fromText,  shift, 0, '#888', '#888', 1);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  } else if (progress < 0.55) {
    if (Math.random() < 0.6) {
      ctx.globalAlpha = 0.55 + Math.random() * 0.35;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  } else {
    const emerge = (progress - 0.55) / 0.45;
    const corrupt = 1 - emerge;
    drawGlitch(toText, corrupt * 0.7);
    ctx.save();
    ctx.globalAlpha = emerge;
    drawBase(toText, 0, 0, '#000', '#555', 1);
    ctx.globalAlpha = 1;
    ctx.restore();
    const shift = Math.floor(corrupt * 14);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.18 * corrupt;
    drawBase(toText, -shift, 0, '#000', '#000', 1);
    drawBase(toText,  shift, 0, '#aaa', '#aaa', 1);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

}

/**
 * Start the transition animation to the next name in the `states` array.
 * If an animation is already running this function is a no-op. Uses
 * `requestAnimationFrame` to drive the transition frames and updates
 * `phase`/`frame`/`animId` accordingly.
 */
function triggerName() {
  if (phase === 'transitioning') return;
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
  if (phase === 'idle') renderIdle(states[idx]);
});

renderIdle(states[0]);


