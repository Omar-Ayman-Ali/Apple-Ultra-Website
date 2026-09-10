import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll and Animation Orchestrator
 * Integrates Lenis smooth scrolling with GSAP ScrollTrigger
 * Choreographs camera waypoints, section typography reveals, and HUD telemetry.
 */

export function setupScrollOrchestration(watchScene) {
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // =========================================================================
  // 1. LENIS SMOOTH SCROLL INITIALIZATION
  // =========================================================================
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.5,
  });

  // Connect Lenis to ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  // Drive Lenis from GSAP's ticker for perfectly synchronized frame updates
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
    watchScene.render();
  });
  gsap.ticker.lagSmoothing(0);

  // If reduced motion is preferred, we don't bind complex camera scrub
  if (isReducedMotion) {
    setupBasicReveals();
    return {
      lenis,
      playHeroEntrance: () => {
        setupBasicReveals();
      },
    };
  }

  // =========================================================================
  // 2. CAMERA WAYPOINTS CONFIGURATION
  // Tune camera coordinates and target lookAt vectors for each section below.
  // The watch model stays centered at (0, 0, 0) while the camera moves.
  // =========================================================================
  const waypoints = {
    // -----------------------------------------------------------------------
    // Waypoint 0: HERO (Wide, dramatic 3/4 high angle showing full watch)
    // -----------------------------------------------------------------------
    hero: {
      x: 2.2,
      y: 1.8,
      z: 3.8,
      lookX: 0.0,
      lookY: 0.1,
      lookZ: 0.3,
      screenBrightness: 0.5,
    },

    // -----------------------------------------------------------------------
    // Waypoint 1: REVEAL (Pushes in close to the titanium bezel and crystal)
    // -----------------------------------------------------------------------
    reveal: {
      x: 0.8,
      y: 1.5,
      z: 2.5,
      lookX: 0.0,
      lookY: 0.5,
      lookZ: 0.7,
      screenBrightness: 0.8,
    },

    // -----------------------------------------------------------------------
    // Waypoint 2: DISPLAY (Perpendicular face-on view into the AMOLED Retina screen)
    // -----------------------------------------------------------------------
    display: {
      x: -0.05,
      y: 1.85,
      z: 2.65,
      lookX: -0.04,
      lookY: 0.69,
      lookZ: 0.99,
      screenBrightness: 2.2, // Full 2000-nit luminance wake-up
    },

    // -----------------------------------------------------------------------
    // Waypoint 3: MATERIALS / ACTION BUTTON (Side profile showing titanium crown & button)
    // -----------------------------------------------------------------------
    materials: {
      x: -2.4,
      y: 1.1,
      z: 1.5,
      lookX: -0.5,
      lookY: 0.6,
      lookZ: 0.7,
      screenBrightness: 1.2,
    },

    // -----------------------------------------------------------------------
    // Waypoint 4: STRAP & COLORS (Pull-back angle showcasing the Alpine Loop weave)
    // -----------------------------------------------------------------------
    strap: {
      x: 0.0,
      y: -0.4,
      z: 4.1,
      lookX: 0.0,
      lookY: 0.0,
      lookZ: 0.0,
      screenBrightness: 1.0,
    },

    // -----------------------------------------------------------------------
    // Waypoint 5: SPECS (Clean 3/4 isometric technical telemetry view)
    // -----------------------------------------------------------------------
    specs: {
      x: 1.9,
      y: 1.2,
      z: 2.8,
      lookX: 0.1,
      lookY: 0.2,
      lookZ: 0.3,
      screenBrightness: 1.0,
    },

    // -----------------------------------------------------------------------
    // Waypoint 6: OUTRO / CTA (Grand pull-back cinematic hero perspective)
    // -----------------------------------------------------------------------
    outro: {
      x: 0.0,
      y: 1.0,
      z: 4.8,
      lookX: 0.0,
      lookY: 0.0,
      lookZ: 0.2,
      screenBrightness: 1.0,
    },
  };

  // Interpolated camera parameters proxy object
  const camProxy = {
    x: waypoints.hero.x,
    y: waypoints.hero.y,
    z: waypoints.hero.z,
    lookX: waypoints.hero.lookX,
    lookY: waypoints.hero.lookY,
    lookZ: waypoints.hero.lookZ,
    screenBrightness: waypoints.hero.screenBrightness,
  };

  // Apply camera target on every frame of timeline scrub
  function applyWaypoint() {
    watchScene.setCameraTarget(
      camProxy.x,
      camProxy.y,
      camProxy.z,
      camProxy.lookX,
      camProxy.lookY,
      camProxy.lookZ
    );
    watchScene.setScreenBrightness(camProxy.screenBrightness);
  }

  // =========================================================================
  // 3. MASTER CONTINUOUS CAMERA SCRUB TIMELINE
  // Smoothly interpolates the camera along waypoints across the entire page scroll
  // =========================================================================
  const cameraTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: '#scroll-content',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8,
      onUpdate: () => applyWaypoint(),
    },
  });

  cameraTimeline
    // 0% -> 18%: Hero to Reveal
    .to(camProxy, {
      ...waypoints.reveal,
      duration: 1.8,
      ease: 'power1.inOut',
    })
    // 18% -> 38%: Reveal to Display (Screen wake-up)
    .to(camProxy, {
      ...waypoints.display,
      duration: 2.0,
      ease: 'power1.inOut',
    })
    // 38% -> 58%: Display to Materials & Action Button
    .to(camProxy, {
      ...waypoints.materials,
      duration: 2.0,
      ease: 'power1.inOut',
    })
    // 58% -> 76%: Materials to Strap & Colors
    .to(camProxy, {
      ...waypoints.strap,
      duration: 1.8,
      ease: 'power1.inOut',
    })
    // 76% -> 90%: Strap to Specs
    .to(camProxy, {
      ...waypoints.specs,
      duration: 1.6,
      ease: 'power1.inOut',
    })
    // 90% -> 100%: Specs to Outro CTA
    .to(camProxy, {
      ...waypoints.outro,
      duration: 1.2,
      ease: 'power1.inOut',
    });

  // =========================================================================
  // 4. SECTION-SPECIFIC CONTENT ANIMATIONS (SCROLL-TRIGGERED)
  // =========================================================================
  setupSectionReveals();

  // =========================================================================
  // 5. STRAP COLORWAY SCROLL TRIGGER
  // Automatically highlights colors as user reaches Section 4
  // =========================================================================
  setupStrapScrollSync(watchScene);

  // =========================================================================
  // 6. TELEMETRY HUD LIVE SCROLL UPDATES
  // =========================================================================
  setupHudUpdates();

  // =========================================================================
  // 7. SCROLLSPY ACTIVE NAV INDICATORS & SMOOTH ANCHOR NAV
  // =========================================================================
  setupScrollspy(lenis);

  // =========================================================================
  // 7. HERO ENTRANCE ANIMATION (TRIGGERED ON INTRO COMPLETION)
  // =========================================================================
  function playHeroEntrance() {
    if (isReducedMotion) {
      applyWaypoint();
      return;
    }

    // Set initial camera coordinates for cinematic swoop
    camProxy.x = 3.6;
    camProxy.y = 2.7;
    camProxy.z = 5.2;
    camProxy.lookX = 0.0;
    camProxy.lookY = 0.0;
    camProxy.lookZ = 0.2;
    camProxy.screenBrightness = 0.0;
    applyWaypoint();

    const entranceTL = gsap.timeline();

    // 1. Camera swoop into hero waypoint (1.4s with smooth power3.out ease)
    const camTween = gsap.to(camProxy, {
      ...waypoints.hero,
      duration: 1.4,
      ease: 'power3.out',
      onUpdate: () => applyWaypoint(),
    });

    // If user starts scrolling immediately, cancel intro camera tween so ScrollTrigger takes over cleanly
    lenis.on('scroll', () => {
      if (camTween.isActive()) {
        camTween.kill();
      }
    });

    // 2. Header reveal: slides down smoothly from top
    entranceTL.fromTo(
      '.site-header',
      { y: -50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
      0.05
    );

    // 3. Telemetry HUD slide-in from right
    entranceTL.fromTo(
      '.telemetry-hud .hud-item',
      { x: 35, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out' },
      0.15
    );

    // 4. Hero content elements cascade
    entranceTL.fromTo(
      '.hero-top-badge',
      { y: 25, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' },
      0.15
    );

    entranceTL.fromTo(
      '.hero-title-sub',
      { y: 35, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
      0.25
    );

    entranceTL.fromTo(
      '.hero-title-main',
      { y: 45, opacity: 0, scale: 0.94 },
      { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'power3.out' },
      0.35
    );

    entranceTL.fromTo(
      '.hero-subtext',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
      0.45
    );

    entranceTL.fromTo(
      '.hero-actions',
      { y: 25, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
      0.6
    );

    return entranceTL;
  }

  return { lenis, playHeroEntrance };
}

/**
 * Sets up custom entrance animations for each content section
 */
function setupSectionReveals() {
  // Section 1: Reveal
  gsap.from('#reveal .section-heading, #reveal .section-body, #reveal .section-num', {
    scrollTrigger: {
      trigger: '#reveal',
      start: 'top 75%',
      toggleActions: 'play none none reverse',
    },
    y: 40,
    opacity: 0,
    stagger: 0.15,
    duration: 0.9,
    ease: 'power3.out',
  });
  gsap.from('#reveal .metric-card', {
    scrollTrigger: {
      trigger: '#reveal',
      start: 'top 65%',
      toggleActions: 'play none none reverse',
    },
    y: 30,
    opacity: 0,
    stagger: 0.12,
    duration: 0.8,
    ease: 'power3.out',
  });

  // Section 2: Display
  gsap.from('#display .section-heading, #display .section-body, #display .section-num', {
    scrollTrigger: {
      trigger: '#display',
      start: 'top 75%',
      toggleActions: 'play none none reverse',
    },
    y: 40,
    opacity: 0,
    stagger: 0.15,
    duration: 0.9,
    ease: 'power3.out',
  });
  gsap.from('#display .feature-item', {
    scrollTrigger: {
      trigger: '#display',
      start: 'top 65%',
      toggleActions: 'play none none reverse',
    },
    x: 30,
    opacity: 0,
    stagger: 0.15,
    duration: 0.8,
    ease: 'power3.out',
  });

  // Section 3: Materials
  gsap.from('#materials .section-heading, #materials .section-body, #materials .section-num', {
    scrollTrigger: {
      trigger: '#materials',
      start: 'top 75%',
      toggleActions: 'play none none reverse',
    },
    y: 40,
    opacity: 0,
    stagger: 0.15,
    duration: 0.9,
    ease: 'power3.out',
  });
  gsap.from('#materials .callout-card', {
    scrollTrigger: {
      trigger: '#materials',
      start: 'top 65%',
      toggleActions: 'play none none reverse',
    },
    x: -30,
    opacity: 0,
    stagger: 0.15,
    duration: 0.8,
    ease: 'power3.out',
  });

  // Section 4: Strap
  gsap.from('#strap .section-content > *', {
    scrollTrigger: {
      trigger: '#strap',
      start: 'top 75%',
      toggleActions: 'play none none reverse',
    },
    y: 35,
    opacity: 0,
    stagger: 0.15,
    duration: 0.9,
    ease: 'power3.out',
  });

  // Section 5: Specs Grid
  gsap.from('#specs .section-heading, #specs .section-num', {
    scrollTrigger: {
      trigger: '#specs',
      start: 'top 75%',
      toggleActions: 'play none none reverse',
    },
    y: 40,
    opacity: 0,
    stagger: 0.15,
    duration: 0.9,
    ease: 'power3.out',
  });
  gsap.from('#specs .spec-box', {
    scrollTrigger: {
      trigger: '#specs',
      start: 'top 68%',
      toggleActions: 'play none none reverse',
    },
    y: 35,
    opacity: 0,
    stagger: 0.12,
    duration: 0.8,
    ease: 'power3.out',
  });

  // Outro CTA
  gsap.from('#outro .outro-kicker, #outro .outro-heading, #outro .outro-sub, #outro .outro-card', {
    scrollTrigger: {
      trigger: '#outro',
      start: 'top 75%',
      toggleActions: 'play none none reverse',
    },
    y: 40,
    opacity: 0,
    stagger: 0.15,
    duration: 1.0,
    ease: 'power3.out',
  });
}

/**
 * Synchronize strap color selection with user scroll and clicks
 */
function setupStrapScrollSync(watchScene) {
  const chips = document.querySelectorAll('.color-chip');

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const colorKey = chip.getAttribute('data-color');
      watchScene.setStrapColor(colorKey);
    });
  });
}

/**
 * Subtle dynamic telemetry readouts that change as user traverses mountain elevations
 */
function setupHudUpdates() {
  const elevEl = document.getElementById('hudElevation');
  const coordsEl = document.getElementById('hudCoords');

  ScrollTrigger.create({
    trigger: '#scroll-content',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const progress = self.progress;
      // Simulate elevation rising as you ascend the mountain route
      const elevation = Math.round(1840 + progress * 2970);
      if (elevEl) elevEl.textContent = `${elevation.toLocaleString()} M`;

      // Telemetry coordinate shifts
      if (coordsEl) {
        const lat = (37.334 + progress * 0.05).toFixed(4);
        const lng = (-122.009 - progress * 0.04).toFixed(4);
        coordsEl.textContent = `${lat}°N ${Math.abs(lng)}°W`;
      }
    },
  });
}

/**
 * Simple reduced motion fallback
 */
function setupBasicReveals() {
  const sections = document.querySelectorAll('.scene-section');
  sections.forEach((sec) => {
    sec.style.opacity = '1';
  });
}

/**
 * ScrollSpy: Dynamically updates active state on top nav links based on scroll position
 */
function setupScrollspy(lenis) {
  const sectionIds = ["reveal", "display", "materials", "strap", "specs"];
  const allNavLinks = document.querySelectorAll(".nav-link");

  function updateActiveLink(scrollY) {
    const vhCenter = scrollY + window.innerHeight * 0.45;
    let activeId = null;

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) {
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (vhCenter >= top && vhCenter < bottom) {
          activeId = id;
          break;
        }
      }
    }

    allNavLinks.forEach((link) => {
      if (activeId && link.getAttribute("href") === "#" + activeId) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  // Update on Lenis scroll tick & native scroll fallback
  if (lenis) {
    lenis.on("scroll", ({ scroll }) => {
      updateActiveLink(scroll);
    });
  }
  window.addEventListener("scroll", () => updateActiveLink(window.scrollY), { passive: true });

  // Initial check
  updateActiveLink(window.scrollY);

  // Smooth click scroll via Lenis for all anchor links
  document.querySelectorAll("a[href^=\"#\"]").forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const targetId = anchor.getAttribute("href");
      if (targetId && targetId !== "#") {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          if (lenis) {
            lenis.scrollTo(targetElement, {
              offset: 0,
              duration: 1.4,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            });
          }
        }
      }
    });
  });
}
