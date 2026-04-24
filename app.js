/* =========================================================
   MARS CLIMATE RADAR — app.js
   Interactive controls, data simulation, canvas overlays
   ========================================================= */

'use strict';

// ── DOM refs ──────────────────────────────────────────────
const video       = document.getElementById('mars-video');
const btnPlay     = document.getElementById('btn-play');
const btnMute     = document.getElementById('btn-mute');
const volSlider   = document.getElementById('vol-slider');
const speedSlider = document.getElementById('speed-slider');
const speedVal    = document.getElementById('speed-val');
const toggleGrid  = document.getElementById('toggle-grid');
const toggleData  = document.getElementById('toggle-data');
const toggleGlitch= document.getElementById('toggle-glitch');
const btnShare    = document.getElementById('btn-share');
const shareToast  = document.getElementById('share-toast');
const overlayCanvas = document.getElementById('overlay-canvas');
const glitchCanvas  = document.getElementById('glitch-canvas');
const dataOverlay   = document.getElementById('data-overlay');
const videoWrapper  = document.getElementById('video-wrapper');
const frameCounter  = document.getElementById('frame-counter');
const utcTime       = document.getElementById('utc-time');

// ── State ─────────────────────────────────────────────────
const state = {
  playing:     false,
  muted:       true,
  gridVisible: true,
  dataVisible: true,
  glitchOn:    true,
  speed:       1.0,
  frame:       0,
};

// ── Climate data simulation ───────────────────────────────
// Base values extracted from original video
const BASE = {
  tempMain: -68.35, presMain: 767.89, windMain: 0.576, tauMain: 1.324,
  ingT: -61.6,  ingP: 753,  ingTau: 1.71,
  olyT: -45.7,  olyP: 691,  olyTau: 0.49,
  curT: -64.5,  curP: 764,  curTau: 0.79,
  ls: 242.9,    rng: 7.68,
};

// Sparkline history buffers
const history = {
  pressure: Array.from({length: 40}, (_, i) => BASE.presMain + Math.sin(i * 0.3) * 8),
  temp:     Array.from({length: 40}, (_, i) => BASE.tempMain + Math.cos(i * 0.25) * 5),
  tau:      Array.from({length: 40}, (_, i) => BASE.tauMain  + Math.sin(i * 0.4) * 0.2),
  wind:     Array.from({length: 40}, (_, i) => BASE.windMain + Math.abs(Math.sin(i * 0.5)) * 0.3),
};

function randWalk(val, amplitude, min, max) {
  const delta = (Math.random() - 0.5) * amplitude;
  return Math.min(max, Math.max(min, val + delta));
}

function updateClimateData() {
  const now = Date.now() / 1000;

  // Slowly drift values
  const temp  = BASE.tempMain  + Math.sin(now * 0.05) * 4 + (Math.random() - 0.5) * 0.5;
  const pres  = BASE.presMain  + Math.sin(now * 0.03) * 12 + (Math.random() - 0.5) * 1;
  const wind  = Math.max(0.1, BASE.windMain + Math.sin(now * 0.08) * 0.2 + (Math.random() - 0.5) * 0.05);
  const tau   = Math.max(0.1, BASE.tauMain  + Math.sin(now * 0.04) * 0.3 + (Math.random() - 0.5) * 0.03);
  const ls    = (BASE.ls + (now * 0.001)) % 360;
  const rng   = BASE.rng + Math.sin(now * 0.07) * 0.5;

  const ingT  = BASE.ingT  + Math.sin(now * 0.06) * 3;
  const ingP  = BASE.ingP  + Math.sin(now * 0.04) * 10;
  const ingTau= Math.max(0.1, BASE.ingTau + Math.sin(now * 0.05) * 0.2);
  const olyT  = BASE.olyT  + Math.cos(now * 0.05) * 2;
  const olyP  = BASE.olyP  + Math.cos(now * 0.04) * 8;
  const olyTau= Math.max(0.1, BASE.olyTau + Math.cos(now * 0.06) * 0.1);
  const curT  = BASE.curT  + Math.sin(now * 0.07 + 1) * 3;
  const curP  = BASE.curP  + Math.sin(now * 0.05 + 1) * 9;
  const curTau= Math.max(0.1, BASE.curTau + Math.sin(now * 0.04 + 1) * 0.15);

  // Update DOM
  setText('temp-main',  fmt(temp, 2) + ' °C');
  setText('pres-main',  fmt(pres, 2) + ' Pa');
  setText('wind-main',  fmt(wind, 3) + ' m/s');
  setText('tau-main',   fmt(tau, 3));
  setText('pres-left',  fmt(pres, 2));
  setText('temp-left',  fmt(temp, 2));
  setText('tau-left',   fmt(tau, 3));
  setText('wind-left',  fmt(wind, 3));
  setText('ls-val',     fmt(ls, 1) + '°');
  setText('ls-right',   fmt(ls, 1) + '°');
  setText('rng-val',    fmt(rng, 2) + ' NM');

  setText('ing-t',   fmt(ingT, 1) + '°C');
  setText('ing-p',   Math.round(ingP) + ' Pa');
  setText('ing-tau', fmt(ingTau, 2));
  setText('oly-t',   fmt(olyT, 1) + '°C');
  setText('oly-p',   Math.round(olyP) + ' Pa');
  setText('oly-tau', fmt(olyTau, 2));
  setText('cur-t',   fmt(curT, 1) + '°C');
  setText('cur-p',   Math.round(curP) + ' Pa');
  setText('cur-tau', fmt(curTau, 2));

  // Storm index
  const stormPct = Math.min(100, Math.max(0, (tau - 0.5) / 2 * 100));
  document.getElementById('storm-bar').style.width = stormPct + '%';
  const stormLabel = stormPct < 30 ? 'LOW' : stormPct < 60 ? 'MODERATE' : stormPct < 85 ? 'HIGH' : 'SEVERE';
  setText('storm-idx', stormLabel);

  // Push to history
  history.pressure.push(pres);  history.pressure.shift();
  history.temp.push(temp);      history.temp.shift();
  history.tau.push(tau);        history.tau.shift();
  history.wind.push(wind);      history.wind.shift();

  // Redraw sparklines
  drawSparkline('spark-pressure', history.pressure, '#00CC33');
  drawSparkline('spark-temp',     history.temp,     '#00FF41');
  drawSparkline('spark-tau',      history.tau,      '#00882A');
  drawSparkline('spark-wind',     history.wind,     '#00CC33');
}

function fmt(n, decimals) {
  const s = Math.abs(n).toFixed(decimals);
  return (n < 0 ? '−' : '') + s;
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Sparkline drawing ─────────────────────────────────────
function drawSparkline(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = W / (data.length - 1);

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;

  data.forEach((v, i) => {
    const x = i * step;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}

// ── Overlay canvas: grid lines ────────────────────────────
const octx = overlayCanvas.getContext('2d');

function resizeCanvases() {
  const rect = videoWrapper.getBoundingClientRect();
  overlayCanvas.width  = rect.width;
  overlayCanvas.height = rect.height;
  glitchCanvas.width   = rect.width;
  glitchCanvas.height  = rect.height;
}

function drawGrid() {
  if (!state.gridVisible) { octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); return; }
  const W = overlayCanvas.width, H = overlayCanvas.height;
  octx.clearRect(0, 0, W, H);

  // Determine video display area (letterboxed)
  const videoAspect = 1936 / 1060;
  const canvasAspect = W / H;
  let vw, vh, vx, vy;
  if (canvasAspect > videoAspect) {
    vh = H; vw = H * videoAspect;
    vx = (W - vw) / 2; vy = 0;
  } else {
    vw = W; vh = W / videoAspect;
    vx = 0; vy = (H - vh) / 2;
  }

  octx.save();
  octx.strokeStyle = 'rgba(0,255,65,0.12)';
  octx.lineWidth = 0.5;
  octx.setLineDash([3, 6]);

  // Vertical grid lines
  const cols = 12;
  for (let i = 0; i <= cols; i++) {
    const x = vx + (vw / cols) * i;
    octx.beginPath(); octx.moveTo(x, vy); octx.lineTo(x, vy + vh); octx.stroke();
  }
  // Horizontal grid lines
  const rows = 8;
  for (let j = 0; j <= rows; j++) {
    const y = vy + (vh / rows) * j;
    octx.beginPath(); octx.moveTo(vx, y); octx.lineTo(vx + vw, y); octx.stroke();
  }

  // Corner brackets
  octx.setLineDash([]);
  octx.strokeStyle = 'rgba(0,255,65,0.35)';
  octx.lineWidth = 1;
  const bLen = 16;
  [[vx, vy], [vx+vw, vy], [vx, vy+vh], [vx+vw, vy+vh]].forEach(([cx, cy], idx) => {
    const sx = idx % 2 === 0 ? 1 : -1;
    const sy = idx < 2 ? 1 : -1;
    octx.beginPath();
    octx.moveTo(cx + sx * bLen, cy); octx.lineTo(cx, cy); octx.lineTo(cx, cy + sy * bLen);
    octx.stroke();
  });

  octx.restore();
}

// ── Glitch effect ─────────────────────────────────────────
const gctx = glitchCanvas.getContext('2d');
let glitchTimer = 0;

function drawGlitch(timestamp) {
  if (!state.glitchOn) { gctx.clearRect(0, 0, glitchCanvas.width, glitchCanvas.height); return; }
  const W = glitchCanvas.width, H = glitchCanvas.height;

  // Trigger glitch randomly ~every 2–6 seconds
  if (timestamp - glitchTimer > (2000 + Math.random() * 4000)) {
    glitchTimer = timestamp;
    gctx.clearRect(0, 0, W, H);

    // Draw 2–5 horizontal scan slices
    const slices = 2 + Math.floor(Math.random() * 4);
    for (let s = 0; s < slices; s++) {
      const y = Math.random() * H;
      const h = 1 + Math.random() * 4;
      const shift = (Math.random() - 0.5) * 20;
      gctx.fillStyle = `rgba(0,${Math.floor(180 + Math.random()*75)},${Math.floor(Math.random()*40)},${0.15 + Math.random()*0.25})`;
      gctx.fillRect(shift, y, W, h);
    }

    // Fade out
    setTimeout(() => gctx.clearRect(0, 0, W, H), 80 + Math.random() * 120);
  }
}

// ── UTC clock ─────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  if (utcTime) utcTime.textContent = `${hh}:${mm}:${ss} UTC`;
}

// ── Frame counter ─────────────────────────────────────────
function updateFrameCounter() {
  if (!video) return;
  const frame = Math.floor(video.currentTime * 30);
  state.frame = frame;
  const fc = document.querySelector('#frame-counter .val');
  if (fc) fc.textContent = String(frame).padStart(4, '0');
}

// ── Play / Pause ──────────────────────────────────────────
function setPlayIcon(playing) {
  const icon = document.getElementById('play-icon');
  if (!icon) return;
  icon.setAttribute('d', playing
    ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z'   // pause
    : 'M8 5v14l11-7z'                       // play
  );
  btnPlay.setAttribute('aria-label', playing ? '일시정지 (스페이스바)' : '재생 (스페이스바)');
}

function togglePlay() {
  if (video.paused) {
    video.play().catch(() => {});
    state.playing = true;
  } else {
    video.pause();
    state.playing = false;
  }
  setPlayIcon(state.playing);
}

btnPlay.addEventListener('click', togglePlay);
btnPlay.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePlay(); } });

// Keyboard shortcut: spacebar
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
  if (e.key === ' ') { e.preventDefault(); togglePlay(); }
});

// ── Mute / Volume ─────────────────────────────────────────
function setMuteIcon(muted) {
  const icon = document.getElementById('mute-icon');
  if (!icon) return;
  icon.setAttribute('d', muted
    ? 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'
    : 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z'
  );
  btnMute.setAttribute('aria-label', muted ? '음소거 해제' : '음소거');
}

btnMute.addEventListener('click', () => {
  state.muted = !state.muted;
  video.muted = state.muted;
  setMuteIcon(state.muted);
});

volSlider.addEventListener('input', () => {
  video.volume = parseFloat(volSlider.value);
  if (video.volume === 0) { state.muted = true; video.muted = true; }
  else { state.muted = false; video.muted = false; }
  setMuteIcon(state.muted);
});

// ── Speed ─────────────────────────────────────────────────
speedSlider.addEventListener('input', () => {
  state.speed = parseFloat(speedSlider.value);
  video.playbackRate = state.speed;
  speedVal.textContent = state.speed.toFixed(1) + 'x';
});

// ── Layer toggles ─────────────────────────────────────────
function toggleLayer(btn, key, el) {
  state[key] = !state[key];
  btn.setAttribute('aria-pressed', String(state[key]));
  btn.classList.toggle('active', state[key]);
  if (el) el.style.display = state[key] ? '' : 'none';
}

toggleGrid.addEventListener('click',   () => toggleLayer(toggleGrid,   'gridVisible', null));
toggleData.addEventListener('click',   () => toggleLayer(toggleData,   'dataVisible', dataOverlay));
toggleGlitch.addEventListener('click', () => toggleLayer(toggleGlitch, 'glitchOn',   null));

// ── Share ─────────────────────────────────────────────────
btnShare.addEventListener('click', async () => {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Mars Climate Radar', url });
    } else {
      await navigator.clipboard.writeText(url);
      showToast('URL COPIED');
    }
  } catch {
    showToast('URL: ' + url.slice(0, 30) + '…');
  }
});

function showToast(msg) {
  shareToast.textContent = msg;
  shareToast.classList.add('show');
  setTimeout(() => shareToast.classList.remove('show'), 2500);
}

// ── Video init ────────────────────────────────────────────
video.muted  = true;  // start muted (autoplay policy)
video.volume = 0.7;
setMuteIcon(true);

// Attempt autoplay (muted)
video.addEventListener('canplay', () => {
  if (!state.playing) {
    video.play().then(() => {
      state.playing = true;
      setPlayIcon(true);
    }).catch(() => {
      state.playing = false;
      setPlayIcon(false);
    });
  }
}, { once: true });

// ── Resize handler ────────────────────────────────────────
const ro = new ResizeObserver(() => { resizeCanvases(); drawGrid(); });
ro.observe(videoWrapper);
resizeCanvases();

// ── Animation loop ────────────────────────────────────────
let dataTimer = 0;
let clockTimer = 0;

function loop(timestamp) {
  // Update clock every second
  if (timestamp - clockTimer > 1000) {
    clockTimer = timestamp;
    updateClock();
    updateFrameCounter();
  }
  // Update climate data every 1.5s
  if (timestamp - dataTimer > 1500) {
    dataTimer = timestamp;
    updateClimateData();
  }
  // Draw grid every frame (cheap)
  drawGrid();
  // Glitch
  drawGlitch(timestamp);

  requestAnimationFrame(loop);
}

// Initial draw
updateClock();
updateClimateData();
requestAnimationFrame(loop);
