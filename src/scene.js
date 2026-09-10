import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * WatchScene — Manages Three.js WebGL rendering, lighting, materials, and camera navigation
 */
export class WatchScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.model = null;
    this.screenMaterial = null;
    this.strapMaterials = [];
    this.originalStrapMaps = [];
    this.neutralStrapMaps = [];
    this.hotspots = [];

    // Camera waypoint targets and current interpolated state
    // The watch stays STILL at (0, 0, 0) while the camera moves around it
    this.cameraState = {
      current: {
        x: 2.2,
        y: 1.8,
        z: 3.8,
        lookX: 0.0,
        lookY: 0.1,
        lookZ: 0.3,
      },
      target: {
        x: 2.2,
        y: 1.8,
        z: 3.8,
        lookX: 0.0,
        lookY: 0.1,
        lookZ: 0.3,
      },
      // Subtle mouse parallax dampening
      mouseParallax: { x: 0, y: 0, targetX: 0, targetY: 0 },
    };

    // Orbit state for 360 inspect mode
    this.orbit = {
      isDragging: false,
      prevX: 0,
      prevY: 0,
      theta: 0.6,
      phi: 1.25,
      targetTheta: 0.6,
      targetPhi: 1.25,
      radius: 3.6,
    };

    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isMobile = window.innerWidth <= 768;
    this.isRotating360 = false;
    this.rotationAngle = 0;

    this.init();
  }

  init() {
    // 1. Scene setup
    this.scene = new THREE.Scene();

    // 2. Camera setup (FOV 38° for cinematic product perspective)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
    this.camera.position.set(
      this.cameraState.current.x,
      this.cameraState.current.y,
      this.cameraState.current.z
    );
    this.camera.lookAt(
      this.cameraState.current.lookX,
      this.cameraState.current.lookY,
      this.cameraState.current.lookZ
    );

    // 3. Renderer with ACESFilmicToneMapping & sRGB output
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // 4. Studio Lighting setup (Three-point + ambient + top specular)
    this.setupLighting();

    // 5. Contact Shadow Plane
    this.createContactShadow();

    // 6. Mouse parallax and 360 drag listeners
    this.setupMouseEvents();

    // 7. Resize handling
    window.addEventListener('resize', this.onResize.bind(this));
  }

  setupLighting() {
    // Soft ambient fill - dark cool tone
    const ambientLight = new THREE.AmbientLight(0x1a2130, 1.4);
    this.scene.add(ambientLight);

    // Key Light - bright neutral light from top right front
    this.keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    this.keyLight.position.set(4, 5, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 20;
    this.keyLight.shadow.bias = -0.001;
    this.scene.add(this.keyLight);

    // Fill Light - subtle cool tone from lower left
    this.fillLight = new THREE.DirectionalLight(0x406085, 1.8);
    this.fillLight.position.set(-4, -1, 3);
    this.scene.add(this.fillLight);

    // Rim / Edge Light - sharp warm accent from behind to define titanium silhouette
    this.rimLight = new THREE.DirectionalLight(0xff9944, 2.8);
    this.rimLight.position.set(0, 4, -4.5);
    this.scene.add(this.rimLight);

    // Specular Highlight Light - directly above to catch the sapphire crystal bevel
    this.topLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.topLight.position.set(0, 6, 1);
    this.scene.add(this.topLight);
  }

  createContactShadow() {
    // Soft procedural radial gradient for realistic grounded shadow under watch
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.4)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.12)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const shadowTexture = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(4.5, 4.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });

    this.shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.set(0, -1.5, 0);
    this.scene.add(this.shadowPlane);
  }

  setupMouseEvents() {
    window.addEventListener('mousemove', (e) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      this.cameraState.mouseParallax.targetX = normX * 0.18;
      this.cameraState.mouseParallax.targetY = normY * 0.14;

      if (this.isRotating360 && this.orbit.isDragging) {
        const deltaX = e.clientX - this.orbit.prevX;
        const deltaY = e.clientY - this.orbit.prevY;
        this.orbit.prevX = e.clientX;
        this.orbit.prevY = e.clientY;

        this.orbit.targetTheta -= deltaX * 0.007;
        this.orbit.targetPhi = Math.max(0.3, Math.min(2.8, this.orbit.targetPhi - deltaY * 0.007));
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (this.isRotating360) {
        this.orbit.isDragging = true;
        this.orbit.prevX = e.clientX;
        this.orbit.prevY = e.clientY;
        document.body.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isRotating360) {
        this.orbit.isDragging = false;
        document.body.style.cursor = 'grab';
      }
    });

    // Touch support for 360 orbit dragging
    window.addEventListener('touchstart', (e) => {
      if (this.isRotating360 && e.touches.length === 1) {
        this.orbit.isDragging = true;
        this.orbit.prevX = e.touches[0].clientX;
        this.orbit.prevY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.isRotating360 && this.orbit.isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - this.orbit.prevX;
        const deltaY = e.touches[0].clientY - this.orbit.prevY;
        this.orbit.prevX = e.touches[0].clientX;
        this.orbit.prevY = e.touches[0].clientY;

        this.orbit.targetTheta -= deltaX * 0.007;
        this.orbit.targetPhi = Math.max(0.3, Math.min(2.8, this.orbit.targetPhi - deltaY * 0.007));
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.orbit.isDragging = false;
    });
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.isMobile = width <= 768;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  loadModel(onProgress, onLoad) {
    const loadingManager = new THREE.LoadingManager(
      () => {
        if (onLoad) onLoad();
      },
      (itemUrl, itemsLoaded, itemsTotal) => {
        const percent = Math.round((itemsLoaded / itemsTotal) * 100);
        if (onProgress) onProgress(percent);
      }
    );

    const loader = new GLTFLoader(loadingManager);
    const textureLoader = new THREE.TextureLoader();

    // Load pre-generated neutral fabric textures for strap recoloring
    const neutral1 = textureLoader.load('/models/apple_watch_ultra_orange/textures/Pwlvr_neutral.jpg');
    const neutral2 = textureLoader.load('/models/apple_watch_ultra_orange/textures/zWSbk_neutral.jpg');
    neutral1.flipY = false;
    neutral2.flipY = false;
    neutral1.colorSpace = THREE.SRGBColorSpace;
    neutral2.colorSpace = THREE.SRGBColorSpace;
    this.neutralStrapMaps = [neutral1, neutral2];

    const modelPath = '/models/apple_watch_ultra_orange/scene.gltf';

    loader.load(
      modelPath,
      (gltf) => {
        const root = gltf.scene;
        this.model = root;

        // 1. Calculate bounding box and center the model exactly at (0, 0, 0)
        const bbox = new THREE.Box3().setFromObject(root);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        root.position.sub(center);

        // 2. Normalize scale to consistent product frame regardless of raw scale
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 2.85; // Standardized view height
        const scale = targetSize / maxDim;
        root.scale.set(scale, scale, scale);

        // 3. Inspect and enhance meshes and materials
        let triangleCount = 0;
        root.traverse((child) => {
          if (child.isMesh) {
            triangleCount += child.geometry.index
              ? child.geometry.index.count / 3
              : child.geometry.attributes.position.count / 3;

            child.castShadow = true;
            child.receiveShadow = true;

            const mat = child.material;
            if (mat) {
              // Screen material identification
              if (
                child.name === 'wmnqxNpNCdRfDfA' ||
                (mat.name && mat.name.includes('UlFjqascpPnJnyb')) ||
                (mat.emissiveMap && mat.emissiveMap.image && mat.emissiveMap.image.src && mat.emissiveMap.image.src.includes('UlFjqascpPnJnyb'))
              ) {
                this.screenMaterial = mat;
                mat.emissive = new THREE.Color(0xffffff);
                mat.emissiveIntensity = 0.5; // Starts in dim Always-On state
              }

              // Strap material identification
              if (
                child.name === 'yFPJxjHCZaMTTSP' ||
                child.name === 'hFurRdLJljkLFkB' ||
                (mat.name && (mat.name.includes('Pwlvr') || mat.name.includes('zWSb')))
              ) {
                if (!this.strapMaterials.includes(mat)) {
                  this.strapMaterials.push(mat);
                  this.originalStrapMaps.push(mat.map);
                }
              }

              // Enhance titanium body reflections
              if (mat.roughness !== undefined && !this.strapMaterials.includes(mat)) {
                mat.envMapIntensity = 1.3;
              }
            }
          }
        });

        console.log(`[WatchScene] Apple Watch Ultra loaded. Triangles: ${Math.round(triangleCount)}.`);

        // Adjust shadow plane position based on scaled watch bottom
        const updatedBox = new THREE.Box3().setFromObject(root);
        this.shadowPlane.position.y = updatedBox.min.y - 0.02;

        this.scene.add(root);
      },
      undefined,
      (error) => {
        console.error('[WatchScene] Failed to load watch model:', error);
      }
    );
  }

  /**
   * Set target camera waypoint (called by GSAP ScrollTrigger timeline)
   */
  setCameraTarget(x, y, z, lookX, lookY, lookZ) {
    // If mobile, pull camera slightly further back for narrow viewport
    const distanceMultiplier = this.isMobile ? 1.3 : 1.0;

    this.cameraState.target.x = x * distanceMultiplier;
    this.cameraState.target.y = y;
    this.cameraState.target.z = z * distanceMultiplier;
    this.cameraState.target.lookX = lookX;
    this.cameraState.target.lookY = lookY;
    this.cameraState.target.lookZ = lookZ;

    if (this.isReducedMotion) {
      // Immediate snap if user prefers reduced motion
      this.cameraState.current.x = this.cameraState.target.x;
      this.cameraState.current.y = this.cameraState.target.y;
      this.cameraState.current.z = this.cameraState.target.z;
      this.cameraState.current.lookX = this.cameraState.target.lookX;
      this.cameraState.current.lookY = this.cameraState.target.lookY;
      this.cameraState.current.lookZ = this.cameraState.target.lookZ;
    }
  }

  /**
   * Modulate the AMOLED display emissive intensity (e.g. waking up on scroll)
   */
  setScreenBrightness(intensity) {
    if (this.screenMaterial) {
      this.screenMaterial.emissiveIntensity = intensity;
    }
  }

  /**
   * Switch the Alpine Loop strap colorway
   * @param {string} colorKey - 'orange' | 'starlight' | 'midnight' | 'ocean'
   */
  setStrapColor(colorKey) {
    if (!this.strapMaterials.length) return;

    const colors = {
      orange: { isOriginal: true, hex: 0xffffff },
      starlight: { isOriginal: false, hex: 0xe6e0d3, mapIdx: 0 },
      midnight: { isOriginal: false, hex: 0x22262f, mapIdx: 1 },
      ocean: { isOriginal: false, hex: 0x1d3557, mapIdx: 1 },
    };

    const target = colors[colorKey] || colors.orange;

    this.strapMaterials.forEach((mat, i) => {
      if (target.isOriginal) {
        // Restore original authentic orange map
        if (this.originalStrapMaps[i]) {
          mat.map = this.originalStrapMaps[i];
        }
        mat.color.setHex(0xffffff);
      } else {
        // Use neutral base weave map and tint with target color
        const neutralMap = this.neutralStrapMaps[i % this.neutralStrapMaps.length];
        if (neutralMap) {
          mat.map = neutralMap;
        }
        mat.color.setHex(target.hex);
      }
      mat.needsUpdate = true;
    });
  }

  /**
   * Toggle 360 preview inspection mode
   */
  toggle360Inspect() {
    this.isRotating360 = !this.isRotating360;
    if (this.isRotating360) {
      document.body.style.cursor = 'grab';
      // Sync orbit angles with current camera position
      const r = Math.sqrt(
        this.camera.position.x ** 2 +
        this.camera.position.y ** 2 +
        this.camera.position.z ** 2
      ) || 3.6;
      this.orbit.radius = r;
      this.orbit.phi = Math.acos(Math.max(-1, Math.min(1, this.camera.position.y / r)));
      this.orbit.theta = Math.atan2(this.camera.position.x, this.camera.position.z);
      this.orbit.targetPhi = this.orbit.phi;
      this.orbit.targetTheta = this.orbit.theta;
    } else {
      document.body.style.cursor = '';
    }
  }

  /**
   * Register a 3D hotspot to project onto 2D screen coordinates
   */
  registerHotspot(id, worldPos, element) {
    this.hotspots.push({ id, worldPos, element });
  }

  /**
   * Update screen coordinates of all registered 3D hotspots
   */
  updateHotspots() {
    if (!this.hotspots || !this.hotspots.length) return;
    const tempV = new THREE.Vector3();
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (let i = 0; i < this.hotspots.length; i++) {
      const h = this.hotspots[i];
      if (!h.element) continue;
      tempV.copy(h.worldPos);
      tempV.project(this.camera);

      // Occlusion / behind camera check
      if (tempV.z >= 1.0) {
        h.element.style.opacity = '0';
        h.element.style.pointerEvents = 'none';
        continue;
      }

      const screenX = (tempV.x * 0.5 + 0.5) * width;
      const screenY = (-(tempV.y * 0.5) + 0.5) * height;

      h.element.style.left = `${screenX.toFixed(1)}px`;
      h.element.style.top = `${screenY.toFixed(1)}px`;
    }
  }

  /**
   * Main render loop, called by Lenis/GSAP ticker
   */
  render() {
    // 1. Mouse parallax damping
    const p = this.cameraState.mouseParallax;
    p.x += (p.targetX - p.x) * 0.05;
    p.y += (p.targetY - p.y) * 0.05;

    // 2. Camera coordinate lerping (damped camera movement)
    const cur = this.cameraState.current;
    const tgt = this.cameraState.target;
    const lerpFactor = this.isReducedMotion ? 1 : 0.075;

    cur.x += (tgt.x - cur.x) * lerpFactor;
    cur.y += (tgt.y - cur.y) * lerpFactor;
    cur.z += (tgt.z - cur.z) * lerpFactor;
    cur.lookX += (tgt.lookX - cur.lookX) * lerpFactor;
    cur.lookY += (tgt.lookY - cur.lookY) * lerpFactor;
    cur.lookZ += (tgt.lookZ - cur.lookZ) * lerpFactor;

    // 3. Apply coordinates + 360 orbit or scroll waypoint
    if (this.isRotating360 && this.model) {
      if (!this.orbit.isDragging) {
        this.orbit.targetTheta += 0.008; // smooth auto-rotation when not dragging
      }
      this.orbit.theta += (this.orbit.targetTheta - this.orbit.theta) * 0.1;
      this.orbit.phi += (this.orbit.targetPhi - this.orbit.phi) * 0.1;

      const r = this.orbit.radius;
      const sinPhi = Math.sin(this.orbit.phi);
      this.camera.position.x = r * sinPhi * Math.sin(this.orbit.theta);
      this.camera.position.y = r * Math.cos(this.orbit.phi);
      this.camera.position.z = r * sinPhi * Math.cos(this.orbit.theta);
      this.camera.lookAt(0, 0.15, 0);
    } else {
      this.camera.position.set(cur.x + p.x, cur.y + p.y, cur.z);
      this.camera.lookAt(cur.lookX, cur.lookY, cur.lookZ);
    }

    // 4. Update 3D projected hotspots
    this.updateHotspots();

    // 5. Render the scene
    this.renderer.render(this.scene, this.camera);
  }
}
