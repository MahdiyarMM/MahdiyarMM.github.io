/**
 * Loss Landscape background — interactive hero canvas.
 *
 * A faint, tilted optimization landscape rendered with Canvas 2D. Probes
 * spawn periodically (and on click) and descend the loss surface via
 * gradient descent with momentum. Designed to sit BEHIND the hero
 * composition: subtle, framerate-invariant motion, theme-aware palette,
 * `prefers-reduced-motion` aware.
 *
 * Mounts automatically on any <canvas data-loss-landscape> in the DOM.
 * Exposes the instance on window.heroLandscape for live tweaking.
 *
 * Pointer / scroll parallax is driven by the surrounding CSS (the
 * .hero-layer--lattice container reads --hero-px / --hero-py / --hero-sp
 * and applies transform + opacity). The canvas inherits both, so clicks
 * still map correctly through getBoundingClientRect().
 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // ----------------------------------------------------------------
  // 1. Math helpers
  // ----------------------------------------------------------------
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // World extents.
  //   FOCAL_HALF — where the descent lives and the wells are placed.
  //   GRID_HALF  — how far the rendered mesh extends, just past the mask.
  const FOCAL_HALF = 1.0;
  const GRID_HALF = 1.42;
  // Edge mask in world units (radial). Inside MASK_KEEP everything is
  // kept; past MASK_GONE everything is fully erased to alpha=0.
  const MASK_KEEP = 0.84;
  const MASK_GONE = 1.22;

  // Reference projection scale (≈ what we hit on a typical 1440-wide
  // desktop). Drives amplitude → world-units conversion and the per-element
  // visual scaling so the whole composition shrinks uniformly on phones.
  const REF_SCALE = 420;

  // Reference simulation step (60 fps). The descent integrator below is
  // framerate-invariant: at this dt the dynamics match the original
  // per-frame formulation; at any other dt the trajectory unfolds in
  // the same wall-clock time.
  const DT_REF = 1 / 60;

  // Smooth deterministic pseudo-random (no Math.random churn during render).
  function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
      t = (t + 0x6d2b79f5) >>> 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ----------------------------------------------------------------
  // 2. Loss landscape — sum of anisotropic Gaussian wells/hills, plus
  //    very gentle low-frequency variation. Smooth everywhere.
  // ----------------------------------------------------------------
  const WELLS = [
    { x: 0.08, z: -0.15, sx: 0.34, sz: 0.42, a: -1.25 },
    { x: -0.55, z: 0.45, sx: 0.32, sz: 0.34, a: -0.65 },
    { x: 0.62, z: 0.55, sx: 0.36, sz: 0.36, a: -0.5 },
    { x: -0.7, z: -0.55, sx: 0.42, sz: 0.36, a: 0.7 },
    { x: 0.55, z: -0.7, sx: 0.46, sz: 0.4, a: 0.6 },
    { x: 0.0, z: 0.85, sx: 0.5, sz: 0.3, a: 0.35 },
  ];

  // Rim potential — zero in the focal interior, rises smoothly toward the
  // perimeter, saturates outside. Creates a soft "bowl" so descents always
  // flow back inward and never stick on the edges.
  const RIM_HEIGHT = 0.7;
  const RIM_INNER = 0.78;
  const RIM_OUTER = 1.2;
  // Drift potential — a small linear ramp providing a constant inward
  // gradient even past the rim's saturation point. Safety net for probes
  // spawned in the back corners.
  const DRIFT_R0 = 0.7;
  const DRIFT_K = 0.18;
  function rim(x, z) {
    const r = Math.sqrt(x * x + z * z);
    const wall = RIM_HEIGHT * smoothstep(RIM_INNER, RIM_OUTER, r);
    const drift = DRIFT_K * Math.max(0, r - DRIFT_R0);
    return wall + drift;
  }

  function loss(x, z) {
    let v = 0;
    for (let i = 0; i < WELLS.length; i++) {
      const w = WELLS[i];
      const dx = (x - w.x) / w.sx;
      const dz = (z - w.z) / w.sz;
      v += w.a * Math.exp(-0.5 * (dx * dx + dz * dz));
    }
    v += 0.06 * Math.sin(x * 1.7 + 0.3) * Math.cos(z * 1.4 - 0.6);
    v += rim(x, z);
    return v;
  }

  // Numerical gradient via central differences.
  const EPS = 0.006;
  function gradient(x, z) {
    const gx = (loss(x + EPS, z) - loss(x - EPS, z)) / (2 * EPS);
    const gz = (loss(x, z + EPS) - loss(x, z - EPS)) / (2 * EPS);
    return [gx, gz];
  }

  // ----------------------------------------------------------------
  // 3. Projection — orthographic with a yaw + pitch rotation.
  //    Closed-form invertible on the y = 0 plane.
  // ----------------------------------------------------------------
  const VIEW = { yaw: 0.32, pitch: 0.78 };

  class Projector {
    constructor() {
      this.cx = 0;
      this.cy = 0;
      this.scale = 1;
      this.cyOffset = 0;
      this._sinY = Math.sin(VIEW.yaw);
      this._cosY = Math.cos(VIEW.yaw);
      this._sinP = Math.sin(VIEW.pitch);
      this._cosP = Math.cos(VIEW.pitch);
    }
    configure(w, h) {
      // min(sx, sy) preserves aspect — the mesh shrinks uniformly as the
      // viewport shrinks instead of distorting.
      const padX = 0.7;
      const padY = 0.95;
      const sx = (w * padX) / 2.2;
      const sy = (h * padY) / 2.2;
      this.scale = Math.min(sx, sy);
      this.cx = w * 0.5;
      this.cyOffset = h * 0.08;
      this.cy = h * 0.5 + this.cyOffset;
    }
    project(x, y, z) {
      const xr = x * this._cosY - z * this._sinY;
      const zr = x * this._sinY + z * this._cosY;
      const yr = y * this._cosP - zr * this._sinP;
      const zd = y * this._sinP + zr * this._cosP;
      return {
        x: xr * this.scale + this.cx,
        y: -yr * this.scale + this.cy,
        depth: zd,
      };
    }
    unprojectGround(sx, sy) {
      const xr = (sx - this.cx) / this.scale;
      const yr = -(sy - this.cy) / this.scale;
      const zr = -yr / this._sinP;
      const x = xr * this._cosY + zr * this._sinY;
      const z = -xr * this._sinY + zr * this._cosY;
      return [x, z];
    }
  }

  // ----------------------------------------------------------------
  // 4. Probe — a small object that walks downhill with momentum,
  //    leaves a fading trail, and signals convergence.
  // ----------------------------------------------------------------
  class Probe {
    constructor(x, z, opts) {
      this.x = clamp(x, -0.95, 0.95);
      this.z = clamp(z, -0.95, 0.95);
      this.vx = 0;
      this.vz = 0;
      this.age = 0;
      this.life = 1;
      this.trail = [];
      this.maxTrail = opts.trails ? 70 : 0;
      this.lr = opts.lr;
      this.momentum = 0.86;
      this.converged = false;
      this.holdTimer = 0;
      this.spawnPulse = 1;
      this.color = opts.color || 'accent';
    }
    step(dt) {
      this.age += dt;
      this.spawnPulse = Math.max(0, this.spawnPulse - dt * 1.6);
      if (!this.converged) {
        const [gx, gz] = gradient(this.x, this.z);
        const gmag = Math.hypot(gx, gz);
        const ease = clamp(gmag * 1.4, 0.18, 1.0);
        // Framerate-invariant integration. v retains its original
        // "world-units per reference-frame" units, so at dt = DT_REF
        // (60 fps) this matches the per-frame formulation exactly.
        const tn = dt / DT_REF;
        const decay = Math.pow(this.momentum, tn);
        this.vx = decay * this.vx - this.lr * gx * ease * tn;
        this.vz = decay * this.vz - this.lr * gz * ease * tn;
        this.x = clamp(this.x + this.vx * tn, -0.98, 0.98);
        this.z = clamp(this.z + this.vz * tn, -0.98, 0.98);

        const speed = Math.hypot(this.vx, this.vz);
        if (gmag < 0.06 && speed < 0.0009) {
          this.holdTimer += dt;
          if (this.holdTimer > 0.6) this.converged = true;
        } else {
          this.holdTimer = 0;
        }
      } else {
        this.holdTimer += dt;
        if (this.holdTimer > 1.1) {
          this.life = Math.max(0, this.life - dt * 0.55);
        }
      }
    }
    pushTrail(screenX, screenY, depth) {
      if (this.maxTrail === 0) return;
      this.trail.push({ x: screenX, y: screenY, depth, t: this.age });
      if (this.trail.length > this.maxTrail) this.trail.shift();
    }
    get dead() {
      return this.life <= 0.001;
    }
  }

  // ----------------------------------------------------------------
  // 5. Theme palettes — read by the renderer each frame so a theme
  //    toggle is reflected immediately without needing to rebuild.
  // ----------------------------------------------------------------
  const PALETTES = {
    light: {
      // Slate stroke for the grid; reads cleanly on near-white pages.
      gridRgb: '71, 85, 120',
      gridAlpha: 0.22,
      textRelief: 1,
      probeAccent: '37, 99, 235', // blue-600
      probeWarm: '194, 134, 42', // amber-700
    },
    dark: {
      // Cool light-blue grid for a dark page; slightly brighter alpha to
      // hold against a near-black background without becoming loud.
      gridRgb: '186, 211, 246',
      gridAlpha: 0.32,
      textRelief: 0.25,
      probeAccent: '96, 165, 250', // blue-400
      probeWarm: '251, 191, 36', // amber-400
    },
  };
  function activePalette() {
    const t = document.documentElement.getAttribute('data-theme');
    return PALETTES[t === 'dark' ? 'dark' : 'light'];
  }

  // ----------------------------------------------------------------
  // 6. The component itself.
  // ----------------------------------------------------------------
  class LossLandscapeBackground {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.options = {
        interactive: true,
        autoSpawn: true,
        trails: true,
        density: 25,
        amplitude: 94,
        speed: 100,
        pointCount: 2,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        ...options,
      };
      this.proj = new Projector();
      this.probes = [];
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.last = 0;
      this.spawnCooldown = 0.8;
      this.rng = mulberry32(1729);
      this.running = false;
      this.palette = activePalette();
      this._onResize = this._onResize.bind(this);
      this._frame = this._frame.bind(this);
      this._onPointerDown = this._onPointerDown.bind(this);
      this._onMediaChange = (e) => {
        this.options.reducedMotion = e.matches;
        this._restart();
      };
      this._onThemeChange = () => {
        this.palette = activePalette();
      };
    }

    mount() {
      window.addEventListener('resize', this._onResize, { passive: true });
      if (this.options.interactive) {
        this.canvas.addEventListener('pointerdown', this._onPointerDown);
      }
      this._mql = matchMedia('(prefers-reduced-motion: reduce)');
      if (this._mql.addEventListener) {
        this._mql.addEventListener('change', this._onMediaChange);
      }
      // Watch <html data-theme> so the palette updates the moment the
      // user (or the page-load script) flips themes.
      this._themeObserver = new MutationObserver(this._onThemeChange);
      this._themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
      this._onResize();
      this._seed();
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this._frame);
    }

    destroy() {
      this.running = false;
      window.removeEventListener('resize', this._onResize);
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
      if (this._mql && this._mql.removeEventListener) {
        this._mql.removeEventListener('change', this._onMediaChange);
      }
      if (this._themeObserver) this._themeObserver.disconnect();
      this.probes.length = 0;
    }

    update(opts) {
      Object.assign(this.options, opts);
      for (const p of this.probes) {
        p.maxTrail = this.options.trails ? 70 : 0;
        if (!this.options.trails) p.trail.length = 0;
      }
      while (this.probes.length > this.options.pointCount) {
        this.probes.shift();
      }
    }

    // World-units height per loss-unit. Constant across viewports so the
    // landscape's bumps stay a fixed proportion of the mesh.
    get ampWorld() {
      return this.options.amplitude / REF_SCALE;
    }

    // Pixel-size multiplier for line widths, probes, glows and trails.
    // Driven by the projection scale so the entire composition scales
    // uniformly and small UI elements stay legible on a phone.
    get visScale() {
      return clamp(this.proj.scale / REF_SCALE, 0.7, 1.15);
    }

    reset() {
      this.probes.length = 0;
      this.spawnCooldown = 0.4;
      this._seed();
    }

    spawnAtClient(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      let [wx, wz] = this.proj.unprojectGround(sx, sy);
      // Confine spawn to the climbable focal area. A click in the void
      // outside the visible mesh still lands a probe — never dropped in
      // the dead zone where wells push outward.
      const r = Math.hypot(wx, wz);
      const SPAWN_R_MAX = 0.92;
      if (r > SPAWN_R_MAX) {
        wx = (wx * SPAWN_R_MAX) / r;
        wz = (wz * SPAWN_R_MAX) / r;
      }
      this._spawnAt(wx, wz);
    }

    // ------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------
    _onResize() {
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (w === 0 || h === 0) return;
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.proj.configure(w, h);
      this._effectiveDensity = this.options.density;
    }

    _restart() {
      this.probes.length = 0;
      this.spawnCooldown = 0.6;
    }

    _seed() {
      if (this.options.reducedMotion) return;
      const [sx, sz] = this._pickHighSpot();
      this._spawnAt(sx, sz);
    }

    _spawnAt(x, z) {
      if (this.probes.length >= this.options.pointCount) {
        this.probes.shift();
      }
      const lr = lerp(0.0004, 0.0035, clamp((this.options.speed - 20) / 200, 0, 1));
      const color = this.rng() > 0.8 ? 'warm' : 'accent';
      this.probes.push(new Probe(x, z, { trails: this.options.trails, lr, color }));
    }

    _pickHighSpot() {
      let best = [0, 0];
      let bestVal = -Infinity;
      const RMAX = 0.92;
      for (let i = 0; i < 16; i++) {
        const r = Math.sqrt(this.rng()) * RMAX;
        const theta = this.rng() * TAU;
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        const v = loss(x, z);
        if (v > bestVal) {
          bestVal = v;
          best = [x, z];
        }
      }
      return best;
    }

    _onPointerDown(e) {
      this.spawnAtClient(e.clientX, e.clientY);
    }

    _frame(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this._update(dt);
      this._render();
      requestAnimationFrame(this._frame);
    }

    _update(dt) {
      if (this.options.reducedMotion) return;
      for (const p of this.probes) p.step(dt);
      this.probes = this.probes.filter((p) => !p.dead);
      if (this.options.autoSpawn) {
        this.spawnCooldown -= dt;
        const allConverged = this.probes.length > 0 && this.probes.every((p) => p.converged);
        const empty = this.probes.length === 0;
        if ((empty || allConverged) && this.spawnCooldown <= 0) {
          if (this.probes.length < this.options.pointCount) {
            const [sx, sz] = this._pickHighSpot();
            this._spawnAt(sx, sz);
          }
          this.spawnCooldown = 1.6 + this.rng() * 1.4;
        }
      }
    }

    _render() {
      const ctx = this.ctx;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (w === 0 || h === 0) return;
      ctx.clearRect(0, 0, w, h);
      this._drawGrid(w, h);
      this._drawProbes();
      this._drawTextReliefMask(w, h);
      this._drawEdgeMask(w, h);
    }

    _drawTextReliefMask(w, h) {
      const ctx = this.ctx;
      const reliefX = w * 0.25;
      const reliefY = h * 0.45;
      const innerR = Math.min(w, h) * 0.2;
      const outerR = Math.min(w, h) * 0.47;
      const reliefStrength = this.palette.textRelief ?? 1;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.translate(reliefX, reliefY);
      ctx.scale(1.32, 0.72);
      const grad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
      grad.addColorStop(0, `rgba(0, 0, 0, ${(0.28 * reliefStrength).toFixed(3)})`);
      grad.addColorStop(0.45, `rgba(0, 0, 0, ${(0.16 * reliefStrength).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(-outerR, -outerR, outerR * 2, outerR * 2);
      ctx.restore();
    }

    _drawEdgeMask(w, h) {
      const ctx = this.ctx;
      const cx = this.proj.cx;
      const cy = this.proj.cy;
      const scale = this.proj.scale;
      const squish = Math.sin(VIEW.pitch);
      const innerR = scale * MASK_KEEP;
      const outerR = scale * MASK_GONE;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.translate(cx, cy);
      ctx.scale(1, squish);
      const grad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.55)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = grad;
      const big = Math.max(w, h) * 4;
      ctx.fillRect(-big, -big, big * 2, big * 2);
      ctx.restore();
    }

    _drawGrid(w, h) {
      const ctx = this.ctx;
      const N = Math.round(
        (this._effectiveDensity || this.options.density) * (GRID_HALF / FOCAL_HALF)
      );
      const SEG = 70;
      const half = GRID_HALF;

      const rows = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        rows.push({ kind: 'z', z: lerp(-half, half, t) });
      }
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        rows.push({ kind: 'x', x: lerp(-half, half, t) });
      }

      for (const r of rows) {
        if (r.kind === 'z') {
          const p0 = this.proj.project(-half, 0, r.z);
          const p1 = this.proj.project(half, 0, r.z);
          r.depth = (p0.depth + p1.depth) * 0.5;
        } else {
          const p0 = this.proj.project(r.x, 0, -half);
          const p1 = this.proj.project(r.x, 0, half);
          r.depth = (p0.depth + p1.depth) * 0.5;
        }
      }
      rows.sort((a, b) => a.depth - b.depth);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const ampWorld = this.ampWorld;
      const vs = this.visScale;
      const pal = this.palette;
      for (const r of rows) {
        ctx.beginPath();
        for (let s = 0; s <= SEG; s++) {
          const t = s / SEG;
          let x, z;
          if (r.kind === 'z') {
            x = lerp(-half, half, t);
            z = r.z;
          } else {
            x = r.x;
            z = lerp(-half, half, t);
          }
          const y = loss(x, z) * ampWorld;
          const p = this.proj.project(x, y, z);
          if (s === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        const depthN = clamp((r.depth + 1.8) / 3.4, 0, 1);
        const depthFade = lerp(0.5, 1.0, 1 - depthN);
        const alpha = pal.gridAlpha * depthFade;
        ctx.lineWidth = lerp(0.55, 1.0, 1 - depthN) * vs;
        ctx.strokeStyle = `rgba(${pal.gridRgb}, ${alpha.toFixed(3)})`;
        ctx.stroke();
      }
    }

    _drawProbes() {
      const ctx = this.ctx;
      const ampWorld = this.ampWorld;
      const vs = this.visScale;
      const pal = this.palette;

      for (const p of this.probes) {
        const y = loss(p.x, p.z) * ampWorld;
        const sp = this.proj.project(p.x, y, p.z);
        p.pushTrail(sp.x, sp.y, sp.depth);

        const baseColor = p.color === 'warm' ? pal.probeWarm : pal.probeAccent;

        if (p.trail.length > 1) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          for (let i = 1; i < p.trail.length; i++) {
            const a = p.trail[i - 1];
            const b = p.trail[i];
            const t = i / p.trail.length;
            const alpha = t * 0.55 * p.life;
            if (alpha < 0.01) continue;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${baseColor}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = lerp(0.6, 1.6, t) * vs;
            ctx.stroke();
          }
        }

        if (p.spawnPulse > 0) {
          const groundProj = this.proj.project(p.x, 0, p.z);
          const pulseR = ((1 - p.spawnPulse) * 36 + 4) * vs;
          ctx.beginPath();
          ctx.arc(groundProj.x, groundProj.y, pulseR, 0, TAU);
          ctx.strokeStyle = `rgba(${baseColor}, ${(p.spawnPulse * 0.35).toFixed(3)})`;
          ctx.lineWidth = 1 * vs;
          ctx.stroke();
        }

        const ground = this.proj.project(p.x, 0, p.z);
        ctx.beginPath();
        ctx.moveTo(ground.x, ground.y);
        ctx.lineTo(sp.x, sp.y);
        ctx.strokeStyle = `rgba(${baseColor}, ${(0.18 * p.life).toFixed(3)})`;
        ctx.lineWidth = 0.8 * vs;
        ctx.stroke();

        const glowR = 16 * vs;
        const grad = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, glowR);
        grad.addColorStop(0, `rgba(${baseColor}, ${(0.35 * p.life).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${baseColor}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, glowR, 0, TAU);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 3.4 * vs, 0, TAU);
        ctx.fillStyle = `rgba(${baseColor}, ${(0.95 * p.life).toFixed(3)})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 1.2 * vs, 0, TAU);
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.9 * p.life).toFixed(3)})`;
        ctx.fill();
      }
    }
  }

  // ----------------------------------------------------------------
  // 7. Auto-mount on any <canvas data-loss-landscape>.
  // ----------------------------------------------------------------
  function init() {
    const canvas = document.querySelector('canvas[data-loss-landscape]');
    if (!canvas) return;
    const bg = new LossLandscapeBackground(canvas, {
      interactive: true,
      autoSpawn: true,
      trails: true,
      pointCount: 2,
    });
    bg.mount();
    // Expose for live inspection / future controls.
    window.heroLandscape = bg;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
