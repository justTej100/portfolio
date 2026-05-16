/* ── Name canvas electric effect ── */

const canvas = document.getElementById('nameCanvas');
const ctx = canvas.getContext('2d');

const states = ['TEJINDER', 'TJ'];
let idx = 0;
let animId = null;
let phase = 'idle';
let frame = 0;
const TOTAL_FRAMES = 55;
const BIG = 160;

function initCanvas() {
  const W = Math.min(window.innerWidth - 32, 900);
  const H = Math.floor(BIG * 1.65);
  canvas.width = W;
  canvas.height = H;
  return { W, H };
}

let dims = initCanvas();

function drawBase(text, offsetX, offsetY, colorBig, colorSmall, alpha) {
  const { W, H } = dims;
  const cx = W / 2 + offsetX;
  const cy = H / 2 + offsetY;
  ctx.globalAlpha = alpha;

  ctx.save();
  ctx.scale(1, 1.55);
  ctx.font = `900 ${BIG}px "Times New Roman", serif`;
  ctx.fillStyle = colorBig;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy / 1.55);
  ctx.restore();

  const small = Math.floor(BIG * 0.38);
  ctx.font = `900 ${small}px Impact, sans-serif`;
  ctx.fillStyle = colorSmall;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + small * 0.08);
  ctx.globalAlpha = 1;
}

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

function drawScanlines() {
  const { W, H } = dims;
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
}

function renderIdle(text) {
  const { W, H } = dims;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  drawBase(text, 0, 0, '#000', '#555', 1);
  drawScanlines();
}

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

  drawScanlines();
}

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
  if (phase === 'idle') renderIdle(states[idx]);
});

renderIdle(states[0]);


/* ── Smooth scroll for nav links ── */
const navLinks = document.querySelectorAll('nav ul li a');
for (const link of navLinks) {
  link.addEventListener('click', smoothScroll);
}

function smoothScroll(event) {
  event.preventDefault();
  const targetId = this.getAttribute('href');
  const target = document.querySelector(targetId);
  if (!target) return;
  const targetPosition = target.offsetTop - 80;
  window.scroll({ top: targetPosition, behavior: 'smooth' });
}


/* ── Contact form AJAX submission ── */
const form = document.querySelector('form');
if (form) {
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const formData = new FormData(this);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', this.getAttribute('action'));
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        alert('Thank you for your message!');
      }
    };
    xhr.send(new URLSearchParams(formData).toString());
  });
}