# Apple Watch Ultra — 3D Product Showcase

An ultra-premium, interactive 3D product website for the **Apple Watch Ultra**, engineered with **Three.js**, **Lenis** smooth scrolling, and **GSAP ScrollTrigger** animation orchestration.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the local development server
npm run dev

# 3. Build for production
npm run build
```

---

## 📁 3D Model Architecture & Swapping Models

The project currently uses the **"Apple Watch Ultra - Orange"** glTF asset:
- **Location:** `public/models/apple_watch_ultra_orange/`
  - `scene.gltf`
  - `scene.bin`
  - `textures/` (PBR textures, normal maps, roughness/metalness, emissive Wayfinder display)

### Dropping in a single `.glb` file
If you prefer to use a single packed `.glb` file:
1. Drop your `.glb` file into `public/models/` (e.g., `public/models/apple_watch_ultra.glb`).
2. Open [`src/scene.js`](file:///mnt/programming/anti-gravity/smartwatch-website/src/scene.js) and locate the `modelPath` variable in `loadModel()`:
   ```javascript
   // Change:
   const modelPath = '/models/apple_watch_ultra_orange/scene.gltf';
   // To:
   const modelPath = '/models/apple_watch_ultra.glb';
   ```
3. The model loader automatically:
   - Computes the bounding box with `THREE.Box3` and centers it at `(0, 0, 0)` in world space.
   - Normalizes and auto-scales the model to a standardized `targetSize = 2.85`, ensuring consistent framing regardless of native units or export scales.
   - The watch model **remains static** in world space — the **camera** moves between waypoints.

---

## 🎥 Camera Waypoints & How to Tune Them

All camera positions and look-at targets are centralized with extensive comments in [`src/scroll.js`](file:///mnt/programming/anti-gravity/smartwatch-website/src/scroll.js) under the `waypoints` object:

```javascript
const waypoints = {
  // Hero: Wide, dramatic 3/4 high angle showing full watch
  hero: { x: 2.2, y: 1.8, z: 3.8, lookX: 0.0, lookY: 0.1, lookZ: 0.3, screenBrightness: 0.5 },

  // Section 1 (Reveal): Pushes in close to the titanium bezel and sapphire lip
  reveal: { x: 0.8, y: 1.5, z: 2.5, lookX: 0.0, lookY: 0.5, lookZ: 0.7, screenBrightness: 0.8 },

  // Section 2 (Display): Perpendicular view into the AMOLED Always-On screen
  display: { x: -0.05, y: 1.85, z: 2.65, lookX: -0.04, lookY: 0.69, lookZ: 0.99, screenBrightness: 2.2 },

  // Section 3 (Materials): 3/4 side profile showing Orange Action Button & Crown Guard
  materials: { x: -2.4, y: 1.1, z: 1.5, lookX: -0.5, lookY: 0.6, lookZ: 0.7, screenBrightness: 1.2 },

  // Section 4 (Strap): Pull-back framing displaying full Alpine Loop weave
  strap: { x: 0.0, y: -0.4, z: 4.1, lookX: 0.0, lookY: 0.0, lookZ: 0.0, screenBrightness: 1.0 },

  // Section 5 (Specs): Isometric technical telemetry perspective
  specs: { x: 1.9, y: 1.2, z: 2.8, lookX: 0.1, lookY: 0.2, lookZ: 0.3, screenBrightness: 1.0 },

  // Outro: Grand cinematic pull-back for final purchase CTA
  outro: { x: 0.0, y: 1.0, z: 4.8, lookX: 0.0, lookY: 0.0, lookZ: 0.2, screenBrightness: 1.0 },
};
```

### Camera Damping & Lerping
Camera transitions do not snap or jitter. In [`src/scene.js`](file:///mnt/programming/anti-gravity/smartwatch-website/src/scene.js), the render loop lerps the current camera position towards the target coordinates on every frame (`lerpFactor = 0.075`), creating a silky, weighted camera movement.

---

## ✍️ Where to Edit Copy & Content

All textual content, headlines, telemetry numbers, and metrics reside in [`index.html`](file:///mnt/programming/anti-gravity/smartwatch-website/index.html):

| Section | Element ID / Class | Description |
|---|---|---|
| **Header** | `.brand-logo`, `.nav-links` | Navigation labels and CTAs |
| **Telemetry HUD** | `#telemetryHud` | Real-time elevation, GPS coordinates, case temp |
| **Hero** | `#hero` | Main headline, subhead, and exploration prompt |
| **Section 1: Reveal** | `#reveal` | Case geometry copy and titanium metric chips |
| **Section 2: Display** | `#display` | 2000 Nits brightness and Wayfinder feature cards |
| **Section 3: Build** | `#materials` | Action button, crown guard, and 86dB siren copy |
| **Section 4: Strap** | `#strap` | Alpine Loop weave narrative and color swatches |
| **Section 5: Specs** | `#specs` | Battery, GPS, water rating, temperature specs |
| **Outro & CTA** | `#outro` | Final tagline, pricing, and purchase buttons |
| **Attribution** | `footer.site-footer` | Sketchfab 3D model attribution credit |

---

## ➕ Adding or Removing Scroll Sections

To add a new section:
1. **Add Section HTML**: Insert a new `<section id="your-section" class="scene-section">` in [`index.html`](file:///mnt/programming/anti-gravity/smartwatch-website/index.html).
2. **Define Waypoint**: In [`src/scroll.js`](file:///mnt/programming/anti-gravity/smartwatch-website/src/scroll.js), add your new waypoint coordinates into `waypoints`:
   ```javascript
   yourSection: {
     x: 1.5,
     y: 0.8,
     z: 3.0,
     lookX: 0.0,
     lookY: 0.2,
     lookZ: 0.0,
     screenBrightness: 1.0
   }
   ```
3. **Add to Master Timeline**: In the `cameraTimeline` chain in [`src/scroll.js`](file:///mnt/programming/anti-gravity/smartwatch-website/src/scroll.js), chain a `.to(camProxy, { ...waypoints.yourSection, duration: 1.5, ease: 'power1.inOut' })`.
4. **Add Reveal Animation (optional)**: In `setupSectionReveals()`, add a `gsap.from('#your-section .your-elements', { ... })` bound to a `ScrollTrigger`.

To remove a section, simply delete its `<section>` tag in `index.html` and remove its corresponding step from `cameraTimeline` in `src/scroll.js`.

---

## 🎨 Visual Design System & Palette

- **Background Space:** Deep titanium obsidian `#07080a` with dynamic radial ambient vignette and subtle telemetry grid.
- **Accent Orange:** International Orange `#ff6200` matching the physical Action Button and Alpine Loop stitching.
- **Titanium Metals:** `#8f96a3`, `#ccd3de`, `#1a2130`.
- **Display Emissive:** Synced to scroll depth — gently glows in standby (0.5) and blazes to 2.2 intensity in the Display section.
- **Typography:** Modern neo-grotesque sans-serif (`Plus Jakarta Sans`) paired with monospace technical readouts (`Space Mono`).
- **Accessibility:** Fully supports `@media (prefers-reduced-motion: reduce)`.

---

## 📜 Model Attribution
The 3D asset is ["Apple Watch Ultra - Orange"](https://sketchfab.com/3d-models/apple-watch-ultra-orange-4656191de2e94767a8c16003fca1f268) by **alboxer2000_** on Sketchfab, licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). Small credit included in the site footer.
