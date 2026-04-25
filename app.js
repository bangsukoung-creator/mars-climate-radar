const CONFIG = {
  refreshInterval: 5000,
  interpolationTime: 250,
  // Rotation configuration
  videoDuration: 7.975, // measured from ffprobe
  // We'll use a sine-based horizontal oscillation to match the sphere's 3D rotation projection
  amplitude: 25, // Max horizontal shift in %
  centerX: 37.0, // Base X position in %
  coordinates: [
    { id: 'val-top-1', x: 37.0, y: 4.0, type: 'temp' },
    { id: 'val-top-2', x: 37.0, y: 8.0, type: 'pres' },
    { id: 'val-top-3', x: 37.0, y: 13.0, type: 'dust' },
    { id: 'val-top-4', x: 37.0, y: 18.0, type: 'temp' },
    { id: 'val-mid-1', x: 37.0, y: 38.0, type: 'temp' },
    { id: 'val-mid-2', x: 37.0, y: 48.0, type: 'pres' },
    { id: 'val-bot-1', x: 37.0, y: 65.0, type: 'temp' },
    { id: 'val-bot-2', x: 37.0, y: 70.0, type: 'dust' },
    { id: 'val-bot-3', x: 37.0, y: 75.0, type: 'temp' }
  ]
};

const state = {
  data: {},
  errorCount: 0,
  isMock: true
};

const video = document.getElementById('mars-video');
const container = document.getElementById('overlay-container');
const toastContainer = document.getElementById('toast-container');

// Initialize overlays
function initOverlays() {
  CONFIG.coordinates.forEach(coord => {
    const el = document.createElement('div');
    el.id = coord.id;
    el.className = 'data-overlay';
    el.style.left = `${coord.x}%`;
    el.style.top = `${coord.y}%`;
    el.textContent = '--';
    container.appendChild(el);
    state.data[coord.id] = { current: 0, target: 0, baseLX: coord.x };
  });
}

// Update container size to match video aspect ratio
function resizeOverlay() {
  const videoRect = video.getBoundingClientRect();
  const videoAspect = 1920 / 1080;
  const containerAspect = videoRect.width / videoRect.height;

  let w, h;
  if (containerAspect > videoAspect) {
    h = videoRect.height;
    w = h * videoAspect;
  } else {
    w = videoRect.width;
    h = w / videoAspect;
  }
  container.style.width = `${w}px`;
  container.style.height = `${h}px`;
}

// Dynamic Position Update (Follow the rotating longitude line)
function syncPosition() {
  if (!video.paused && !video.ended) {
    const time = video.currentTime;
    // Calculate phase based on video duration
    // The longitude line moves horizontally as the sphere rotates.
    // In a 3D sphere projection, the horizontal movement follows a sine wave pattern.
    const phase = (time / CONFIG.videoDuration) * Math.PI * 2;
    const shift = Math.sin(phase) * CONFIG.amplitude;

    CONFIG.coordinates.forEach(coord => {
      const el = document.getElementById(coord.id);
      if (el) {
        // Adjust the X position based on the rotation phase
        const dynamicX = CONFIG.centerX + shift;
        el.style.left = `${dynamicX}%`;
      }
    });
  }
  requestAnimationFrame(syncPosition);
}

// Mock data generator
function getMockData() {
  return CONFIG.coordinates.map(c => {
    let val;
    if (c.type === 'temp') val = -70 + Math.random() * 20;
    else if (c.type === 'pres') val = 700 + Math.random() * 50;
    else val = 0.2 + Math.random() * 0.5;
    return { id: c.id, value: val };
  });
}

// Interpolate values
function updateValues() {
  const newData = getMockData();
  
  newData.forEach(item => {
    const el = document.getElementById(item.id);
    const prev = state.data[item.id].target;
    state.data[item.id].target = item.value;
    
    // Visual feedback
    el.classList.add('updating');
    
    // Smooth interpolation
    const startTime = performance.now();
    const duration = CONFIG.interpolationTime;

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentVal = prev + (item.value - prev) * progress;
      
      const coord = CONFIG.coordinates.find(c => c.id === item.id);
      if (coord.type === 'temp') el.textContent = currentVal.toFixed(1);
      else if (coord.type === 'pres') el.textContent = Math.round(currentVal);
      else el.textContent = currentVal.toFixed(2);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        el.classList.remove('updating');
      }
    }
    requestAnimationFrame(animate);
  });
}

// Clock
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toISOString().split('T')[1].split('.')[0] + ' UTC';
}

// Toast notification
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Event Listeners
window.addEventListener('resize', resizeOverlay);
video.addEventListener('loadedmetadata', resizeOverlay);

// Start
initOverlays();
resizeOverlay();
setInterval(updateValues, CONFIG.refreshInterval);
setInterval(updateClock, 1000);
updateValues();
updateClock();
requestAnimationFrame(syncPosition);
