import * as THREE from 'three';
import gsap from 'gsap';
import { WatchScene } from './scene.js';
import { setupScrollOrchestration } from './scroll.js';

// Ensure GSAP ticker advances smoothly even if the tab is running in headless or unfocused preview
setInterval(() => {
  if (typeof document !== 'undefined' && (!document.hasFocus() || document.hidden)) {
    gsap.ticker.tick();
  }
}, 16);

/**
 * Main Application Bootstrapper
 * Coordinates scene loading, UI triggers, audio generator, and navigation
 */

function init() {
  const canvas = document.getElementById('webgl-canvas');
  const loader = document.getElementById('loader');
  const loaderPercent = document.getElementById('loaderPercent');
  const loaderRing = document.getElementById('loaderRing');
  const loaderStatus = document.getElementById('loaderStatus');

  // Initialize Three.js scene
  const watchScene = new WatchScene(canvas);
  window.watchScene = watchScene;

  // Circumference of loader ring (2 * PI * 42)
  const ringCircumference = 263.89;

  // Track GLTF model loading progress
  watchScene.loadModel(
    // On Progress
    (percent) => {
      if (loaderPercent) loaderPercent.textContent = `${percent}%`;
      if (loaderRing) {
        const offset = ringCircumference - (percent / 100) * ringCircumference;
        loaderRing.style.strokeDashoffset = offset;
      }
      if (loaderStatus) {
        if (percent < 40) {
          loaderStatus.textContent = 'FETCHING GEOMETRY (108K VERTS)...';
        } else if (percent < 80) {
          loaderStatus.textContent = 'DECODING PBR WEAVE TEXTURES...';
        } else {
          loaderStatus.textContent = 'CALIBRATING DUAL GPS SENSORS...';
        }
      }
    },
    // On Loaded
    () => {
      if (loaderStatus) loaderStatus.textContent = 'SYSTEMS ONLINE';
      if (loaderRing) loaderRing.style.strokeDashoffset = '0';
      if (loaderPercent) loaderPercent.textContent = '100%';

      // Micro-pause so user sees 100% / SYSTEMS ONLINE, then trigger GSAP transition
      setTimeout(() => {
        // USE GSAP to transition the intro out in half a second (0.5s)
        const introTL = gsap.timeline({
          onComplete: () => {
            loader.style.display = 'none';
            loader.classList.add('loaded');

            // Initialize Lenis + GSAP scroll orchestration
            const { lenis, playHeroEntrance } = setupScrollOrchestration(watchScene);
            window.lenis = lenis;
            setupInteractiveControls(watchScene);
            setupHotspots(watchScene);

            // Trigger the entrance animation when the intro transition completes
            playHeroEntrance();
          },
        });

        // Exactly 0.5s transition using GSAP
        introTL
          .to('.loader-content', {
            opacity: 0,
            y: -18,
            scale: 0.95,
            duration: 0.25,
            ease: 'power2.in',
          })
          .to(
            loader,
            {
              opacity: 0,
              duration: 0.5,
              ease: 'power2.inOut',
            },
            0.0
          );
      }, 150);
    }
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 * Setup 3D Interactive Hotspots Overlay
 */
function setupHotspots(watchScene) {
  const hotspotsLayer = document.getElementById('hotspotsLayer');
  const hotspotsToggle = document.getElementById('hotspotsToggle');

  // Register the 4 precision hardware features
  const pinAction = document.getElementById('pinActionButton');
  const pinCrown = document.getElementById('pinDigitalCrown');
  const pinDisplay = document.getElementById('pinDisplay');
  const pinSiren = document.getElementById('pinSiren');

  if (pinAction) watchScene.registerHotspot('action-button', new THREE.Vector3(-0.95, 0.05, 0.02), pinAction);
  if (pinCrown) watchScene.registerHotspot('digital-crown', new THREE.Vector3(0.95, 0.42, 0.02), pinCrown);
  if (pinDisplay) watchScene.registerHotspot('retina-display', new THREE.Vector3(0.0, 0.05, 0.65), pinDisplay);
  if (pinSiren) watchScene.registerHotspot('emergency-siren', new THREE.Vector3(-0.95, 0.55, 0.12), pinSiren);

  // Pin click toggle
  const pins = [pinAction, pinCrown, pinDisplay, pinSiren].filter(Boolean);
  pins.forEach((pin) => {
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      playTactileClick('click');
      const wasActive = pin.classList.contains('active');
      pins.forEach((p) => p.classList.remove('active'));
      if (!wasActive) pin.classList.add('active');
    });
  });

  // Dismiss cards on outside click
  window.addEventListener('click', () => {
    pins.forEach((p) => p.classList.remove('active'));
  });

  // Hotspots Toggle button in header
  if (hotspotsToggle && hotspotsLayer) {
    let visible = true;
    hotspotsToggle.addEventListener('click', () => {
      visible = !visible;
      playTactileClick('toggle');
      hotspotsLayer.classList.toggle('hidden', !visible);
      hotspotsToggle.classList.toggle('active', visible);
    });
  }
}

/**
 * Setup buttons: 360 orbit inspect, pre-order modal, audio synthesis, tactile clicks
 */
function setupInteractiveControls(watchScene) {
  // 360 degree AR / Orbit inspect button
  const arBtn = document.getElementById('arBtn');
  if (arBtn) {
    let inspecting = false;
    arBtn.addEventListener('click', () => {
      inspecting = !inspecting;
      playTactileClick('toggle');
      watchScene.toggle360Inspect();
      arBtn.textContent = inspecting ? 'EXIT 360° ORBIT' : 'VIEW IN 360°';
      arBtn.classList.toggle('active', inspecting);
    });
  }

  // Pre-order button feedback
  const buyBtn = document.getElementById('buyBtn');
  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      playTactileClick('haptic');
      const originalText = buyBtn.textContent;
      buyBtn.textContent = 'ADDED TO BAG ✓';
      buyBtn.style.background = '#22c55e';
      setTimeout(() => {
        buyBtn.textContent = originalText;
        buyBtn.style.background = '';
      }, 2500);
    });
  }

  // Strap color chips tactile feedback
  document.querySelectorAll('.color-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      playTactileClick('haptic');
    });
  });

  // Ambient telemetry audio generator using Web Audio API
  setupTelemetryAudio();
}

/**
 * Synthesized Micro-Haptic Audio Click Generator
 * Creates realistic mechanical switch transients & haptic feedback using Web Audio API
 */
let sharedAudioCtx = null;
function getSharedAudioContext() {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

export function playTactileClick(type = 'click') {
  try {
    const ctx = getSharedAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'haptic') {
      // Deep resonant Taptic thump (140Hz -> 40Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.04);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } else if (type === 'toggle') {
      // Dual-frequency chirp for mode switches
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.035);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else {
      // Crisp mechanical micro-switch transient (900Hz -> 220Hz)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.025);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    }
  } catch (e) {
    // Ignore audio policy errors
  }
}

/**
 * Minimalist generative ambient sound drone (no external audio files needed)
 */
function setupTelemetryAudio() {
  const toggle = document.getElementById('soundToggle');
  if (!toggle) return;

  let audioCtx = null;
  let isPlaying = false;
  let masterGain = null;

  toggle.addEventListener('click', () => {
    playTactileClick('toggle');

    if (!audioCtx) {
      audioCtx = getSharedAudioContext();

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      // Low sub frequency sine wave (55Hz - A1 note)
      const osc1 = audioCtx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(55, audioCtx.currentTime);

      // Subtle atmospheric harmonic (165Hz - E3)
      const osc2 = audioCtx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(165, audioCtx.currentTime);

      const gain2 = audioCtx.createGain();
      gain2.gain.setValueAtTime(0.02, audioCtx.currentTime);

      osc1.connect(masterGain);
      osc2.connect(gain2);
      gain2.connect(masterGain);

      osc1.start();
      osc2.start();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    isPlaying = !isPlaying;

    if (isPlaying) {
      masterGain.gain.setTargetAtTime(0.06, audioCtx.currentTime, 0.2);
      toggle.querySelector('.sound-label').textContent = 'AUDIO: ON';
      toggle.classList.add('active');
    } else {
      masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
      toggle.querySelector('.sound-label').textContent = 'AUDIO: OFF';
      toggle.classList.remove('active');
    }
  });
}
