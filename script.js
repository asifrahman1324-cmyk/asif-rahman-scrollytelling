/**
 * Md Asif Rahman - Interactive Scrollytelling Engine
 * 240 Frame Canvas Animation with Lerp Interpolation
 */

// Configuration
const TOTAL_FRAMES = 240;
const FRAME_PATH_PREFIX = 'asifrahman-jpg/ezgif-frame-';
const FRAME_PATH_SUFFIX = '.jpg';
const LERP_SPEED = 0.09; // Fluid ease factor

// State
let images = new Array(TOTAL_FRAMES + 1);
let loadedFrames = new Set();
let loadedCount = 0;
let currentFrame = 1;
let targetFrame = 1;
let isAutoPlaying = false;
let autoPlaySpeed = 0.5; // Frames per frame loop
let fitMode = 'cover'; // 'cover' or 'contain'
let isAudioPlaying = false;
let audioContext = null;
let ambientGainNode = null;

// DOM Elements
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d');
const preloader = document.getElementById('preloader');
const preloaderFill = document.getElementById('preloader-fill');
const preloaderPercent = document.getElementById('preloader-percent');
const preloaderCounter = document.getElementById('preloader-counter');
const frameDisplay = document.getElementById('current-frame-num');
const scrubSlider = document.getElementById('scrub-slider');
const playBtn = document.getElementById('btn-play');
const fitBtn = document.getElementById('btn-fit');
const audioBtn = document.getElementById('btn-audio');
const fullscreenBtn = document.getElementById('btn-fullscreen');
const toastNotice = document.getElementById('toast-notice');
const toastMessage = document.getElementById('toast-message');

const storySections = [
  { id: 'section-hero', start: 1, end: 50 },
  { id: 'section-essence', start: 62, end: 115 },
  { id: 'section-precision', start: 128, end: 178 },
  { id: 'section-connect', start: 188, end: 240 }
];

/**
 * Format frame index to 3 digits e.g. 1 -> "001"
 */
function getFramePath(index) {
  const padded = String(index).padStart(3, '0');
  return `${FRAME_PATH_PREFIX}${padded}${FRAME_PATH_SUFFIX}`;
}

/**
 * Resize canvas to match viewport and DPI
 */
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);

  drawCurrentFrame(Math.round(currentFrame));
}

/**
 * Draw frame on canvas with aspect ratio handling
 */
function drawImageProp(ctx, img, x, y, w, h, offsetX = 0.5, offsetY = 0.32, mode = 'cover') {
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const r = nw / nh;
  let dw = w;
  let dh = h;

  if (mode === 'contain') {
    if (w / h > r) {
      dw = h * r;
    } else {
      dh = w / r;
    }
  } else {
    // cover mode
    if (w / h < r) {
      dw = h * r;
    } else {
      dh = w / r;
    }
  }

  const dx = x + (w - dw) * offsetX;
  const dy = y + (h - dh) * offsetY;

  // Background fill
  ctx.fillStyle = '#08080a';
  ctx.fillRect(0, 0, w, h);

  // Render Image
  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Render requested frame, falling back to closest loaded frame if not yet ready
 */
function drawCurrentFrame(frameIndex) {
  const clamped = Math.min(TOTAL_FRAMES, Math.max(1, frameIndex));
  let imgToDraw = images[clamped];

  // Fallback to nearest loaded frame if current isn't ready
  if (!imgToDraw || !imgToDraw.complete) {
    let nearest = null;
    let minDiff = Infinity;
    for (const loadedIdx of loadedFrames) {
      const diff = Math.abs(loadedIdx - clamped);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = loadedIdx;
      }
    }
    if (nearest) {
      imgToDraw = images[nearest];
    }
  }

  if (imgToDraw && imgToDraw.complete) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawImageProp(ctx, imgToDraw, 0, 0, window.innerWidth, window.innerHeight, 0.5, 0.32, fitMode);
    ctx.restore();
  }
}

/**
 * Preload all 240 frame images
 */
function preloadFrames() {
  // Load Frame 1 first for immediate display
  const firstImg = new Image();
  firstImg.src = getFramePath(1);
  firstImg.onload = () => {
    images[1] = firstImg;
    loadedFrames.add(1);
    loadedCount++;
    drawCurrentFrame(1);
    checkLoadProgress();
  };

  // Preload remaining frames
  for (let i = 2; i <= TOTAL_FRAMES; i++) {
    const img = new Image();
    img.src = getFramePath(i);
    img.onload = () => {
      images[i] = img;
      loadedFrames.add(i);
      loadedCount++;
      checkLoadProgress();
    };
    img.onerror = () => {
      console.warn(`Could not load frame ${i}`);
      loadedCount++;
      checkLoadProgress();
    };
  }
}

function checkLoadProgress() {
  const percent = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100));
  preloaderFill.style.width = `${percent}%`;
  preloaderPercent.textContent = `${percent}%`;
  preloaderCounter.textContent = `${loadedCount} / ${TOTAL_FRAMES}`;

  // Once first 35 frames or 80% are ready, dismiss preloader smoothly
  if ((loadedCount >= 35 || percent >= 80) && !preloader.classList.contains('hidden')) {
    setTimeout(() => {
      preloader.classList.add('hidden');
    }, 350);
  }
}

/**
 * Update UI elements (frame numbers, scrub slider, story sections)
 */
function updateUI(frameNum) {
  frameDisplay.textContent = String(frameNum).padStart(3, '0');
  scrubSlider.value = frameNum;

  // Story sections activation
  storySections.forEach(section => {
    const el = document.getElementById(section.id);
    if (!el) return;
    if (frameNum >= section.start && frameNum <= section.end) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

/**
 * Main Render & Lerp Loop
 */
function animationLoop() {
  if (isAutoPlaying) {
    targetFrame += autoPlaySpeed;
    if (targetFrame > TOTAL_FRAMES) {
      targetFrame = 1;
    }
    // Synchronize document scroll position smoothly
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollTarget = ((targetFrame - 1) / (TOTAL_FRAMES - 1)) * maxScroll;
    window.scrollTo({ top: scrollTarget, behavior: 'instant' });
  } else {
    // Compute target frame from window scroll
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
    targetFrame = 1 + scrollProgress * (TOTAL_FRAMES - 1);
  }

  // Smooth linear interpolation
  currentFrame += (targetFrame - currentFrame) * LERP_SPEED;
  const roundedFrame = Math.round(currentFrame);

  drawCurrentFrame(roundedFrame);
  updateUI(roundedFrame);

  requestAnimationFrame(animationLoop);
}

/**
 * Event Handlers
 */
function initEvents() {
  window.addEventListener('resize', resizeCanvas);

  // If user scrolls or touches during auto-play, seamlessly release auto-play
  window.addEventListener('wheel', () => {
    if (isAutoPlaying) toggleAutoPlay(false);
  }, { passive: true });

  window.addEventListener('touchstart', () => {
    if (isAutoPlaying) toggleAutoPlay(false);
  }, { passive: true });

  // Slider scrubber input
  scrubSlider.addEventListener('input', (e) => {
    const selectedFrame = parseInt(e.target.value, 10);
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const targetScroll = ((selectedFrame - 1) / (TOTAL_FRAMES - 1)) * maxScroll;
    
    if (isAutoPlaying) toggleAutoPlay(false);
    window.scrollTo({ top: targetScroll, behavior: 'instant' });
    targetFrame = selectedFrame;
  });

  // Play/Pause Auto-Play
  playBtn.addEventListener('click', () => {
    toggleAutoPlay(!isAutoPlaying);
  });

  // Toggle Fit Mode (Cover vs Contain)
  fitBtn.addEventListener('click', () => {
    fitMode = fitMode === 'cover' ? 'contain' : 'cover';
    fitBtn.classList.toggle('active', fitMode === 'contain');
    showToast(fitMode === 'contain' ? 'Display Mode: Original 16:9 Letterbox' : 'Display Mode: Fullscreen Cinematic Cover');
    drawCurrentFrame(Math.round(currentFrame));
  });

  // Fullscreen Toggle
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      fullscreenBtn.classList.add('active');
    } else {
      document.exitFullscreen().catch(() => {});
      fullscreenBtn.classList.remove('active');
    }
  });

  // Ambient Sound Synth Toggle
  audioBtn.addEventListener('click', () => {
    toggleAmbientSound();
  });

  // Nav Links smooth scroll
  document.querySelectorAll('[data-scroll-target]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-scroll-target');
      const section = storySections.find(s => s.id === targetId);
      if (section) {
        const midFrame = Math.round((section.start + section.end) / 2);
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const targetScroll = ((midFrame - 1) / (TOTAL_FRAMES - 1)) * maxScroll;
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    });
  });

  // Copy Email Button
  const copyBtn = document.getElementById('btn-copy-email');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const email = 'asifrahman@example.com';
      navigator.clipboard.writeText(email).then(() => {
        showToast(`Copied: ${email}`);
      }).catch(() => {
        showToast(`Email: ${email}`);
      });
    });
  }

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      toggleAutoPlay(!isAutoPlaying);
    } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
      e.preventDefault();
      if (isAutoPlaying) toggleAutoPlay(false);
      const nextFrame = Math.min(TOTAL_FRAMES, targetFrame + 4);
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: ((nextFrame - 1) / (TOTAL_FRAMES - 1)) * maxScroll, behavior: 'smooth' });
    } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (isAutoPlaying) toggleAutoPlay(false);
      const prevFrame = Math.max(1, targetFrame - 4);
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: ((prevFrame - 1) / (TOTAL_FRAMES - 1)) * maxScroll, behavior: 'smooth' });
    } else if (e.key.toLowerCase() === 'f') {
      fullscreenBtn.click();
    } else if (e.key.toLowerCase() === 'm') {
      audioBtn.click();
    }
  });
}

function toggleAutoPlay(state) {
  isAutoPlaying = state;
  playBtn.classList.toggle('active', isAutoPlaying);
  const icon = playBtn.querySelector('.play-icon');
  if (icon) {
    icon.innerHTML = isAutoPlaying
      ? `<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />`
      : `<polygon points="6 3 20 12 6 21 6 3"></polygon>`;
  }
  showToast(isAutoPlaying ? 'Auto-play started (Space to pause)' : 'Auto-play paused');
}

/**
 * Built-in Ambient Audio Generator (Web Audio API)
 * Generates a warm, deep cinematic ambient sound
 */
function toggleAmbientSound() {
  if (!isAudioPlaying) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();

      // Master gain
      ambientGainNode = audioContext.createGain();
      ambientGainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
      ambientGainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 2.5);
      ambientGainNode.connect(audioContext.destination);

      // Low frequency warm pad
      const osc1 = audioContext.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(110, audioContext.currentTime); // A2

      const osc2 = audioContext.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(164.81, audioContext.currentTime); // E3

      // Subtle slow low-pass filter
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, audioContext.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(ambientGainNode);

      osc1.start();
      osc2.start();

      isAudioPlaying = true;
      audioBtn.classList.add('active');
      showToast('Ambient Atmosphere: Active');
    } catch (e) {
      console.warn('Web Audio error:', e);
      showToast('Audio unavailable');
    }
  } else {
    if (ambientGainNode && audioContext) {
      ambientGainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.6);
      setTimeout(() => {
        if (audioContext && audioContext.state !== 'closed') audioContext.close();
      }, 700);
    }
    isAudioPlaying = false;
    audioBtn.classList.remove('active');
    showToast('Atmosphere Muted');
  }
}

/**
 * Toast Notification System
 */
let toastTimeout;
function showToast(msg) {
  clearTimeout(toastTimeout);
  toastMessage.textContent = msg;
  toastNotice.classList.add('show');
  toastTimeout = setTimeout(() => {
    toastNotice.classList.remove('show');
  }, 2400);
}

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  preloadFrames();
  initEvents();
  animationLoop();
});
