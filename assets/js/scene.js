/* ==========================================================================
   agnogad — hero scene
   A 4,200-point cloud starts as a slow galaxy and assembles into a cube as you
   scroll. One lime core, one wireframe, a grid, and a few distant stars.
   Three.js is self-hosted. No addons, no post-processing.
   ========================================================================== */

import * as THREE from "../vendor/three.module.min.js";

const canvas = document.getElementById("scene");
const hero = document.querySelector(".hero");

if (canvas && hero) {
  init();
}

function init() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const small = window.innerWidth < 900;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    document.documentElement.classList.add("no-webgl");
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07080a, 0.032);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  const group = new THREE.Group();
  scene.add(group);

  const ACCENT = new THREE.Color("#d8ff3e");
  const PAPER = new THREE.Color("#f2f1ea");
  const CUBE = 1.55;
  const POINTS = small ? 2600 : 4200;

  /* ------------------------------------------------------------------------
     The cloud
     ------------------------------------------------------------------------ */

  const positions = new Float32Array(POINTS * 3);
  const targets = new Float32Array(POINTS * 3);
  const accents = new Float32Array(POINTS);
  const scales = new Float32Array(POINTS);

  for (let i = 0; i < POINTS; i += 1) {
    const i3 = i * 3;

    // Start: a loose spiral galaxy.
    const radius = Math.pow(Math.random(), 0.62) * 5.8;
    const angle = Math.random() * Math.PI * 2 + radius * 0.95;
    positions[i3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.35;
    positions[i3 + 1] =
      (Math.random() - 0.5) * (0.5 + (1 - Math.min(radius / 5.8, 1)) * 1.8);
    positions[i3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.35;

    // End: a point on one face of a cube shell.
    const face = Math.floor(Math.random() * 6);
    const u = (Math.random() * 2 - 1) * CUBE;
    const v = (Math.random() * 2 - 1) * CUBE;
    const w = CUBE * (0.965 + Math.random() * 0.035);
    let tx;
    let ty;
    let tz;

    switch (face) {
      case 0:
        tx = w;
        ty = u;
        tz = v;
        break;
      case 1:
        tx = -w;
        ty = u;
        tz = v;
        break;
      case 2:
        tx = u;
        ty = w;
        tz = v;
        break;
      case 3:
        tx = u;
        ty = -w;
        tz = v;
        break;
      case 4:
        tx = u;
        ty = v;
        tz = w;
        break;
      default:
        tx = u;
        ty = v;
        tz = -w;
    }

    targets[i3] = tx;
    targets[i3 + 1] = ty;
    targets[i3 + 2] = tz;

    // Corners and edges get the accent so the cube reads from a distance.
    const edge =
      (Math.abs(Math.abs(tx) - CUBE) < 0.08 ? 1 : 0) +
      (Math.abs(Math.abs(ty) - CUBE) < 0.08 ? 1 : 0) +
      (Math.abs(Math.abs(tz) - CUBE) < 0.08 ? 1 : 0);
    const accent = edge >= 2 || Math.random() < 0.055 ? 1 : 0;
    accents[i] = accent;
    scales[i] = 0.65 + Math.random() * 0.9 + accent * 0.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aTarget", new THREE.BufferAttribute(targets, 3));
  geometry.setAttribute("aAccent", new THREE.BufferAttribute(accents, 1));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  geometry.computeBoundingSphere();

  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uSize: { value: 3 },
    uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
  };

  const cloudMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uProgress;
      uniform float uSize;
      uniform float uDpr;

      attribute vec3 aTarget;
      attribute float aAccent;
      attribute float aScale;

      varying float vAlpha;
      varying float vAccent;

      void main() {
        vec3 start = position;

        float radius = length(start.xz);
        float angle = (1.0 - uProgress) * (uTime * 0.08 + radius * 0.14);
        float s = sin(angle);
        float c = cos(angle);
        vec3 swirl = vec3(
          start.x * c - start.z * s,
          start.y,
          start.x * s + start.z * c
        );

        float turbulence = (1.0 - uProgress) * 0.16;
        swirl.x += sin(uTime * 0.45 + start.y * 1.3) * turbulence;
        swirl.y += cos(uTime * 0.4 + start.z * 1.1) * turbulence;
        swirl.z += sin(uTime * 0.5 + start.x * 1.2) * turbulence;

        vec3 pos = mix(swirl, aTarget, uProgress);

        // A very small idle breath once the cube is assembled.
        pos.y += sin(uTime * 0.7 + aTarget.x * 2.0 + aTarget.z * 1.6) * 0.014 * uProgress;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float depth = max(0.1, -mvPosition.z);
        gl_PointSize = uSize * aScale * uDpr * (6.5 / depth);

        // Near points are strongest; the assembly is brighter than the galaxy.
        vAlpha = smoothstep(22.0, 5.0, depth) * mix(0.55, 0.95, uProgress);
        vAccent = aAccent;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying float vAccent;

      void main() {
        vec2 coord = gl_PointCoord - 0.5;
        float distanceToCenter = length(coord);
        float alpha = smoothstep(0.5, 0.05, distanceToCenter);

        if (alpha < 0.02) discard;

        vec3 paper = vec3(0.949, 0.945, 0.918);
        vec3 lime = vec3(0.847, 1.0, 0.243);
        vec3 color = mix(paper, lime, vAccent);

        gl_FragColor = vec4(color, alpha * vAlpha);
      }
    `,
  });

  const cloud = new THREE.Points(geometry, cloudMaterial);
  group.add(cloud);

  /* ------------------------------------------------------------------------
     Core
     ------------------------------------------------------------------------ */

  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const glowContext = glowCanvas.getContext("2d");
  const gradient = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(216,255,62,0.95)");
  gradient.addColorStop(0.18, "rgba(216,255,62,0.5)");
  gradient.addColorStop(0.5, "rgba(216,255,62,0.1)");
  gradient.addColorStop(1, "rgba(216,255,62,0)");
  glowContext.fillStyle = gradient;
  glowContext.fillRect(0, 0, 128, 128);

  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  );
  glow.scale.set(2, 2, 1);
  group.add(glow);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.07, 1),
    new THREE.MeshBasicMaterial({ color: ACCENT, toneMapped: false })
  );
  group.add(core);

  /* ------------------------------------------------------------------------
     Wireframe cube + rings
     ------------------------------------------------------------------------ */

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE * 2, CUBE * 2, CUBE * 2)),
    new THREE.LineBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    })
  );
  group.add(edges);

  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(2.9, 0.004, 6, 220),
    new THREE.MeshBasicMaterial({
      color: PAPER,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  );
  ringA.rotation.set(Math.PI / 2.35, 0.2, 0);

  const ringB = new THREE.Mesh(
    new THREE.TorusGeometry(3.55, 0.003, 6, 220),
    new THREE.MeshBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  );
  ringB.rotation.set(Math.PI / 1.9, 0, 0.5);
  group.add(ringA, ringB);

  /* ------------------------------------------------------------------------
     Stars + floor grid
     ------------------------------------------------------------------------ */

  const starPositions = new Float32Array(520 * 3);
  for (let i = 0; i < 520; i += 1) {
    const radius = 12 + Math.random() * 18;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.cos(phi);
    starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0x6c746a,
      size: 0.035,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      toneMapped: false,
    })
  );
  scene.add(stars);

  const grid = new THREE.GridHelper(60, 60, 0x1b2a1e, 0x101813);
  grid.position.y = -3.2;
  grid.material.transparent = true;
  grid.material.opacity = 0.45;
  grid.material.depthWrite = false;
  scene.add(grid);

  /* ------------------------------------------------------------------------
     Layout
     ------------------------------------------------------------------------ */

  let baseScale = 1;
  let baseZ = 9.6;
  let baseY = 1.15;

  const layout = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    const isSmall = width < 900;
    const isMedium = width < 1200;

    if (isSmall) {
      group.position.set(0, -1.55, 0);
      baseScale = 0.72;
      baseZ = 11.4;
      baseY = 1.0;
    } else if (isMedium) {
      group.position.set(2.1, -0.55, 0);
      baseScale = 0.9;
      baseZ = 10.2;
      baseY = 1.08;
    } else {
      group.position.set(2.7, -0.05, 0);
      baseScale = 1;
      baseZ = 9.6;
      baseY = 1.15;
    }

    group.scale.setScalar(baseScale);
    camera.aspect = width / height;
    camera.position.set(0, baseY, baseZ);
    camera.lookAt(0, 0.15, 0);
    camera.updateProjectionMatrix();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    uniforms.uDpr.value = dpr;
  };

  /* ------------------------------------------------------------------------
     Scroll + pointer state
     ------------------------------------------------------------------------ */

  const label = document.querySelector("[data-scroll-label]");
  let labelState = label ? label.textContent : "";
  let visible = true;
  let p = 0;
  let targetP = 0;
  let time = 0;
  let last = performance.now();
  const mouse = { x: 0, y: 0 };
  const tilt = { x: 0, y: 0 };

  const setLabel = (text) => {
    if (!label || text === labelState) return;
    labelState = text;
    label.textContent = text;
  };

  const updateScroll = () => {
    const sticky = hero.querySelector(".hero__sticky");
    const range = hero.offsetHeight - (sticky ? sticky.offsetHeight : window.innerHeight);
    targetP = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
  };

  if ("IntersectionObserver" in window) {
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    visibilityObserver.observe(hero);
  }

  if (!reduceMotion) {
    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();

    if (finePointer) {
      window.addEventListener(
        "pointermove",
        (event) => {
          mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
          mouse.y = (event.clientY / window.innerHeight) * 2 - 1;
        },
        { passive: true }
      );
      document.documentElement.addEventListener("pointerleave", () => {
        mouse.x = 0;
        mouse.y = 0;
      });
    }
  }

  /* ------------------------------------------------------------------------
     Static frame (reduced motion)
     ------------------------------------------------------------------------ */

  const drawStatic = () => {
    p = 1;
    targetP = 1;
    time = 0;
    uniforms.uTime.value = 0;
    uniforms.uProgress.value = 1;
    group.rotation.set(0, 0, 0);
    group.scale.setScalar(baseScale);
    camera.position.set(0, baseY, baseZ);
    camera.lookAt(0, 0.15, 0);
    edges.material.opacity = 0.5;
    glow.material.opacity = 0.72;
    glow.scale.set(2.4, 2.4, 1);
    core.scale.setScalar(1.05);
    hero.style.setProperty("--p", "1");
    setLabel("Built · ship more");
    renderer.render(scene, camera);
  };

  /* ------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------ */

  const tick = (now) => {
    const delta = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (!visible || document.hidden) return;

    time += delta;
    p += (targetP - p) * Math.min(1, delta * 4);

    const assemble = THREE.MathUtils.smoothstep(p, 0.02, 0.82);
    uniforms.uTime.value = time;
    uniforms.uProgress.value = assemble;

    edges.material.opacity = assemble * 0.5;
    glow.material.opacity = 0.34 + assemble * 0.38;
    glow.scale.set(1.5 + assemble * 0.9, 1.5 + assemble * 0.9, 1);
    core.scale.setScalar(1 + Math.sin(time * 1.4) * 0.08 + (1 - assemble) * 0.3);

    tilt.x += (mouse.y * 0.16 - tilt.x) * Math.min(1, delta * 3);
    tilt.y += (mouse.x * 0.22 - tilt.y) * Math.min(1, delta * 3);

    group.rotation.x = tilt.x + Math.sin(time * 0.13) * 0.035;
    group.rotation.y = time * 0.055 + tilt.y + p * 0.35;
    group.scale.setScalar(baseScale * (1 - p * 0.04));

    ringA.rotation.z = time * 0.04;
    ringB.rotation.z = -time * 0.03;
    stars.rotation.y = time * 0.005;

    camera.position.x = mouse.x * 0.18;
    camera.position.y = baseY + mouse.y * 0.06;
    camera.position.z = baseZ + p * 0.6;
    camera.lookAt(0, 0.15, 0);

    hero.style.setProperty("--p", p.toFixed(3));
    setLabel(
      p < 0.04 ? "Scroll to build" : p < 0.9 ? "Building" : "Built · ship more"
    );

    renderer.render(scene, camera);
  };

  layout();
  document.documentElement.classList.add("webgl");

  if (reduceMotion) {
    renderer.setAnimationLoop(null);
    drawStatic();
  } else {
    renderer.setAnimationLoop(tick);
  }

  window.addEventListener("resize", () => {
    layout();
    if (reduceMotion) drawStatic();
  });
}
