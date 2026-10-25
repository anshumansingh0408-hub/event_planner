/**
 * Utsav - Festive Celebration Background Animation Engine
 * Creates an authentic Indian celebratory ambiance with floating marigold (genda phool) & rose petals,
 * twinkling golden diya sparkles, celebratory motes, and interactive air currents.
 */

(function () {
  'use strict';

  // Check user preference for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Festive color palettes matching Utsav branding
  const PETAL_COLORS = [
    { top: '#F5B83D', bottom: '#E67E22', type: 'marigold' },     // Warm Marigold Gold
    { top: '#FFA726', bottom: '#D35400', type: 'saffron' },      // Festive Saffron
    { top: '#FFD54F', bottom: '#F39C12', type: 'haldi' },        // Haldi Yellow
    { top: '#C2185B', bottom: '#8B1E3F', type: 'rose' },         // Royal Festive Rose
    { top: '#D81B60', bottom: '#6B1530', type: 'crimson' }       // Deep Crimson
  ];

  const SPARKLE_COLORS = [
    'rgba(245, 184, 61, ',   // Accent Gold
    'rgba(255, 213, 79, ',   // Light Gold
    'rgba(255, 238, 173, ',  // Warm White-Gold
    'rgba(255, 171, 64, '    // Amber Glow
  ];

  /* ==========================================================================
     1. HERO CELEBRATION ENGINE (Landing Page)
     ========================================================================== */

  class HeroCelebration {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.width = 0;
      this.height = 0;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.animId = null;
      this.isRunning = false;

      // Mouse interaction
      this.mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false };

      this.init();
    }

    init() {
      this.resize();
      this.createParticles();
      this.bindEvents();
      if (!prefersReducedMotion) {
        this.start();
      } else {
        this.renderStaticFrame();
      }
    }

    resize() {
      const parent = this.canvas.parentElement;
      this.width = parent ? parent.clientWidth : window.innerWidth;
      this.height = parent ? parent.clientHeight : 600;

      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';

      this.ctx.scale(this.dpr, this.dpr);
    }

    createParticles() {
      this.particles = [];
      const isMobile = this.width < 768;
      const petalCount = isMobile ? 18 : 34;
      const sparkleCount = isMobile ? 22 : 45;

      // Create falling celebratory petals
      for (let i = 0; i < petalCount; i++) {
        this.particles.push(this.createPetal(true));
      }

      // Create floating golden sparkles / diya motes
      for (let i = 0; i < sparkleCount; i++) {
        this.particles.push(this.createSparkle(true));
      }
    }

    createPetal(initial = false) {
      const colorScheme = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
      const size = 7 + Math.random() * 8; // 7px to 15px length

      return {
        kind: 'petal',
        x: Math.random() * this.width,
        y: initial ? Math.random() * this.height : -20 - Math.random() * 30,
        size: size,
        colorTop: colorScheme.top,
        colorBottom: colorScheme.bottom,
        type: colorScheme.type,
        opacity: 0.55 + Math.random() * 0.4,
        // Physics
        vy: 0.7 + Math.random() * 1.4, // gentle falling speed
        vx: (Math.random() - 0.5) * 0.4,
        swayAmplitude: 0.6 + Math.random() * 1.2,
        swaySpeed: 0.015 + Math.random() * 0.025,
        swayPhase: Math.random() * Math.PI * 2,
        // 3D rotation flutter
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        flip: Math.random() * Math.PI,
        flipSpeed: 0.02 + Math.random() * 0.04
      };
    }

    createSparkle(initial = false) {
      const colorBase = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
      const isStar = Math.random() > 0.45;

      return {
        kind: 'sparkle',
        x: Math.random() * this.width,
        y: initial ? Math.random() * this.height : this.height + 15 + Math.random() * 20,
        size: isStar ? 2.5 + Math.random() * 3.5 : 1.5 + Math.random() * 2.5,
        isStar: isStar,
        colorBase: colorBase,
        baseAlpha: 0.35 + Math.random() * 0.55,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.03 + Math.random() * 0.06,
        vy: -(0.3 + Math.random() * 0.8), // ascends slowly
        vx: (Math.random() - 0.5) * 0.3,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.02
      };
    }

    burst(x, y) {
      const count = 16;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const speed = 2 + Math.random() * 3.5;
        const colorScheme = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];

        const p = {
          kind: 'petal',
          x: x,
          y: y,
          size: 6 + Math.random() * 7,
          colorTop: colorScheme.top,
          colorBottom: colorScheme.bottom,
          opacity: 0.95,
          vy: Math.sin(angle) * speed - 1.5,
          vx: Math.cos(angle) * speed,
          swayAmplitude: 0.8,
          swaySpeed: 0.03,
          swayPhase: Math.random() * Math.PI * 2,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.06,
          flip: Math.random() * Math.PI,
          flipSpeed: 0.04 + Math.random() * 0.05
        };
        this.particles.push(p);
      }
    }

    bindEvents() {
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          this.resize();
        }, 150);
      });

      // Mouse tracking for gentle air currents
      const heroContainer = this.canvas.parentElement;
      if (heroContainer) {
        heroContainer.addEventListener('mousemove', (e) => {
          const rect = heroContainer.getBoundingClientRect();
          this.mouse.x = e.clientX - rect.left;
          this.mouse.y = e.clientY - rect.top;
          this.mouse.active = true;
        });

        heroContainer.addEventListener('mouseleave', () => {
          this.mouse.active = false;
        });

        // Click / tap celebration petal burst
        heroContainer.addEventListener('click', (e) => {
          // If clicking an interactive button/link, don't interrupt
          if (e.target.closest('a, button, input')) return;
          const rect = heroContainer.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          this.burst(clickX, clickY);
        });
      }

      // Pause when tab is inactive to preserve resources
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        } else if (!prefersReducedMotion) {
          this.start();
        }
      });
    }

    start() {
      if (!this.isRunning) {
        this.isRunning = true;
        this.loop();
      }
    }

    stop() {
      this.isRunning = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }

    renderStaticFrame() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      for (const p of this.particles) {
        if (p.kind === 'petal') {
          this.drawPetal(p);
        } else {
          this.drawSparkle(p);
        }
      }
    }

    loop() {
      if (!this.isRunning) return;

      this.update();
      this.render();

      this.animId = requestAnimationFrame(() => this.loop());
    }

    update() {
      const mouse = this.mouse;

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];

        if (p.kind === 'petal') {
          p.swayPhase += p.swaySpeed;
          p.rotation += p.rotationSpeed;
          p.flip += p.flipSpeed;

          // Wind sway + gravity
          const wind = Math.sin(p.swayPhase) * p.swayAmplitude;
          p.x += p.vx + wind;
          p.y += p.vy;

          // Mouse air displacement
          if (mouse.active) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 110 && dist > 0) {
              const force = (1 - dist / 110) * 2.2;
              p.x += (dx / dist) * force;
              p.y += (dy / dist) * force;
            }
          }

          // Boundary check
          if (p.y > this.height + 25 || p.x < -30 || p.x > this.width + 30) {
            // If it's a burst petal and we have plenty, remove; otherwise recycle
            if (this.particles.length > 60) {
              this.particles.splice(i, 1);
            } else {
              Object.assign(p, this.createPetal(false));
            }
          }
        } else if (p.kind === 'sparkle') {
          p.y += p.vy;
          p.x += p.vx;
          p.twinklePhase += p.twinkleSpeed;
          p.rot += p.rotSpeed;

          // Gentle mouse attraction/shimmer
          if (mouse.active) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 90 && dist > 0) {
              p.x += (dx / dist) * 0.8;
            }
          }

          if (p.y < -20 || p.x < -20 || p.x > this.width + 20) {
            Object.assign(p, this.createSparkle(false));
          }
        }
      }
    }

    render() {
      this.ctx.clearRect(0, 0, this.width, this.height);

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.kind === 'petal') {
          this.drawPetal(p);
        } else {
          this.drawSparkle(p);
        }
      }
    }

    drawPetal(p) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      // 3D flutter effect using cosine scaling
      const scaleY = Math.cos(p.flip);
      ctx.scale(1, Math.max(0.2, Math.abs(scaleY)));
      ctx.globalAlpha = p.opacity;

      // Authentic teardrop / curved flower petal shape
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.85, -p.size * 0.5, p.size * 0.9, p.size * 0.6, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.9, p.size * 0.6, -p.size * 0.85, -p.size * 0.5, 0, -p.size);
      ctx.closePath();

      // Festive radial/linear gradient
      const grad = ctx.createLinearGradient(0, -p.size, 0, p.size);
      grad.addColorStop(0, p.colorTop);
      grad.addColorStop(1, p.colorBottom);
      ctx.fillStyle = grad;
      ctx.fill();

      // Delicate center vein
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 0.7);
      ctx.lineTo(0, p.size * 0.6);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      ctx.restore();
    }

    drawSparkle(p) {
      const ctx = this.ctx;
      const alpha = Math.max(0.1, p.baseAlpha + Math.sin(p.twinklePhase) * 0.35);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = alpha;

      if (p.isStar) {
        ctx.rotate(p.rot);
        ctx.fillStyle = p.colorBase + alpha + ')';
        ctx.shadowColor = 'rgba(245, 184, 61, 0.8)';
        ctx.shadowBlur = 6;

        // 4-pointed celebratory star sparkle
        const r = p.size;
        const inner = r * 0.28;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          ctx.lineTo(Math.cos(angle + Math.PI / 4) * inner, Math.sin(angle + Math.PI / 4) * inner);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        // Soft glowing diya / festive light mote
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 1.8);
        grad.addColorStop(0, p.colorBase + '0.9)');
        grad.addColorStop(0.5, p.colorBase + '0.4)');
        grad.addColorStop(1, p.colorBase + '0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  /* ==========================================================================
     2. AMBIENT CELEBRATION ENGINE (All Pages - create, plan, about, landing)
     ========================================================================== */

  class AmbientCelebration {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.width = 0;
      this.height = 0;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.animId = null;
      this.isRunning = false;

      this.init();
    }

    init() {
      this.resize();
      this.createParticles();
      this.bindEvents();
      if (!prefersReducedMotion) {
        this.start();
      } else {
        this.renderStaticFrame();
      }
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';

      this.ctx.scale(this.dpr, this.dpr);
    }

    createParticles() {
      this.particles = [];
      const count = Math.min(Math.floor(this.width / 50), 30);

      // Light ambient celebration motes & subtle drifting petals
      for (let i = 0; i < count; i++) {
        const isPetal = i % 4 === 0;
        if (isPetal) {
          const colorScheme = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
          this.particles.push({
            kind: 'ambient-petal',
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            size: 5 + Math.random() * 5,
            colorTop: colorScheme.top,
            colorBottom: colorScheme.bottom,
            opacity: 0.25 + Math.random() * 0.25, // Soft, non-intrusive
            vy: 0.4 + Math.random() * 0.6,
            swayPhase: Math.random() * Math.PI * 2,
            swaySpeed: 0.01 + Math.random() * 0.015,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.015,
            flip: Math.random() * Math.PI,
            flipSpeed: 0.015 + Math.random() * 0.02
          });
        } else {
          const colorBase = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
          this.particles.push({
            kind: 'ambient-sparkle',
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            size: 1.2 + Math.random() * 2,
            colorBase: colorBase,
            baseAlpha: 0.2 + Math.random() * 0.4,
            twinklePhase: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.02 + Math.random() * 0.04,
            vy: -(0.2 + Math.random() * 0.4),
            vx: (Math.random() - 0.5) * 0.2
          });
        }
      }
    }

    bindEvents() {
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          this.resize();
        }, 200);
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        } else if (!prefersReducedMotion) {
          this.start();
        }
      });
    }

    start() {
      if (!this.isRunning) {
        this.isRunning = true;
        this.loop();
      }
    }

    stop() {
      this.isRunning = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }

    renderStaticFrame() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      for (const p of this.particles) {
        this.drawParticle(p);
      }
    }

    loop() {
      if (!this.isRunning) return;

      this.update();
      this.render();

      this.animId = requestAnimationFrame(() => this.loop());
    }

    update() {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.kind === 'ambient-petal') {
          p.swayPhase += p.swaySpeed;
          p.rotation += p.rotSpeed;
          p.flip += p.flipSpeed;
          p.x += Math.sin(p.swayPhase) * 0.5;
          p.y += p.vy;

          if (p.y > this.height + 20) {
            p.y = -20;
            p.x = Math.random() * this.width;
          }
        } else {
          p.y += p.vy;
          p.x += p.vx;
          p.twinklePhase += p.twinkleSpeed;

          if (p.y < -15) {
            p.y = this.height + 15;
            p.x = Math.random() * this.width;
          }
        }
      }
    }

    render() {
      this.ctx.clearRect(0, 0, this.width, this.height);

      for (let i = 0; i < this.particles.length; i++) {
        this.drawParticle(this.particles[i]);
      }
    }

    drawParticle(p) {
      const ctx = this.ctx;
      if (p.kind === 'ambient-petal') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const scaleY = Math.cos(p.flip);
        ctx.scale(1, Math.max(0.2, Math.abs(scaleY)));
        ctx.globalAlpha = p.opacity;

        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.5, p.size * 0.8, p.size * 0.6, 0, p.size);
        ctx.bezierCurveTo(-p.size * 0.8, p.size * 0.6, -p.size * 0.8, -p.size * 0.5, 0, -p.size);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, -p.size, 0, p.size);
        grad.addColorStop(0, p.colorTop);
        grad.addColorStop(1, p.colorBottom);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      } else {
        const alpha = Math.max(0.08, p.baseAlpha + Math.sin(p.twinklePhase) * 0.25);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.colorBase + alpha + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /* ==========================================================================
     3. INITIALIZATION ON DOM READY
     ========================================================================== */

  function boot() {
    // 1. Initialize Hero celebration if hero canvas is present (Landing page)
    const heroCanvas = document.getElementById('utsav-hero-canvas');
    if (heroCanvas) {
      new HeroCelebration(heroCanvas);
    }

    // 2. Initialize Ambient celebration if ambient canvas is present (Site-wide)
    const ambientCanvas = document.getElementById('utsav-ambient-canvas');
    if (ambientCanvas) {
      new AmbientCelebration(ambientCanvas);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
