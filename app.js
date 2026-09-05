(function () {
  'use strict';

  const TOTAL_MODES = 15;
  const STORAGE_KEY = 'yump_style_idx';
  const HUE_STEPS = 18;

  let currentMode = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  if (isNaN(currentMode) || currentMode < 0 || currentMode >= TOTAL_MODES) {
    currentMode = 0;
  }
  localStorage.setItem(STORAGE_KEY, ((currentMode + 1) % TOTAL_MODES).toString());

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const btn = document.getElementById('btn');
  const btnWrap = document.getElementById('btn-wrap');
  const btnImg = document.getElementById('btn-img');

  function updateBtnStyle() {
    btn.className = 'style-' + currentMode;
    if (btnImg) {
      btnImg.src = currentMode % 2 === 0 ? 'images/YuMeiPian.png' : 'images/愈美片.png';
    }
  }
  updateBtnStyle();

  let width = 0, height = 0, cx = 0, cy = 0;
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);
    cx = width / 2;
    cy = height / 2;
    if (activeMode && activeMode.resize) {
      activeMode.resize(width, height);
    }
  }

  window.addEventListener('resize', resize);

  const mouse = {
    x: -9999,
    y: -9999,
    prevX: -9999,
    prevY: -9999,
    vx: 0,
    vy: 0,
    down: false,
    active: false,
    lastTime: performance.now()
  };

  const cursorParticles = [];

  function onPointerMove(e) {
    const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const now = performance.now();
    const dt = Math.max(1, now - mouse.lastTime);
    mouse.vx = (x - (mouse.x === -9999 ? x : mouse.x)) / dt * 16;
    mouse.vy = (y - (mouse.y === -9999 ? y : mouse.y)) / dt * 16;
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
    mouse.x = x;
    mouse.y = y;
    mouse.active = true;
    mouse.lastTime = now;

    if (Math.hypot(mouse.vx, mouse.vy) > 0.8 && cursorParticles.length < 25) {
      cursorParticles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 1.5 - mouse.vx * 0.1,
        vy: (Math.random() - 0.5) * 1.5 - mouse.vy * 0.1,
        size: 3 + Math.random() * 4,
        hue: (now * 0.2 + cursorParticles.length * 20) % 360,
        life: 1.0,
        decay: 0.04 + Math.random() * 0.03
      });
    }
  }

  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('touchmove', onPointerMove, { passive: true });

  function onPointerDown(e) {
    if (e.target.closest('#btn-wrap')) return;
    mouse.down = true;
    const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    if (activeMode && activeMode.onClick) {
      activeMode.onClick(x, y);
    }
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 5;
      cursorParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 3 + Math.random() * 5,
        hue: Math.random() * 360,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.03
      });
    }
  }

  window.addEventListener('mousedown', onPointerDown);
  window.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  window.addEventListener('touchend', () => { mouse.down = false; });

  function switchMode(idx) {
    currentMode = (idx + TOTAL_MODES) % TOTAL_MODES;
    localStorage.setItem(STORAGE_KEY, ((currentMode + 1) % TOTAL_MODES).toString());
    updateBtnStyle();
    initCurrentMode();
  }

  btnWrap.addEventListener('click', (e) => {
    e.stopPropagation();
    switchMode(currentMode + 1);
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'Enter') {
      switchMode(currentMode + 1);
    } else if (e.code === 'ArrowLeft') {
      switchMode(currentMode - 1);
    } else if (e.key >= '1' && e.key <= '9') {
      switchMode(parseInt(e.key, 10) - 1);
    } else if (e.key === '0') switchMode(9);
    else if (e.key === 'q') switchMode(10);
    else if (e.key === 'w') switchMode(11);
    else if (e.key === 'e') switchMode(12);
    else if (e.key === 'r') switchMode(13);
    else if (e.key === 't') switchMode(14);
  });

  let sprites = [];
  const rainbowCache = [[], []];

  function buildRainbowCache() {
    for (let s = 0; s < sprites.length; s++) {
      const src = sprites[s];
      for (let h = 0; h < HUE_STEPS; h++) {
        const deg = h * (360 / HUE_STEPS);
        const c = document.createElement('canvas');
        c.width = src.naturalWidth || src.width;
        c.height = src.naturalHeight || src.height;
        const cCtx = c.getContext('2d');

        cCtx.drawImage(src, 0, 0);

        cCtx.globalCompositeOperation = 'multiply';
        cCtx.fillStyle = `hsl(${deg}, 100%, 55%)`;
        cCtx.fillRect(0, 0, c.width, c.height);

        cCtx.globalCompositeOperation = 'destination-in';
        cCtx.drawImage(src, 0, 0);

        rainbowCache[s].push(c);
      }
    }
  }

  function loadAssets(callback) {
    let loaded = 0;
    const img1 = new Image();
    const img2 = new Image();

    function check() {
      loaded++;
      if (loaded === 2) {
        sprites = [img1, img2];
        buildRainbowCache();
        callback();
      }
    }

    img1.onload = check;
    img2.onload = check;
    img1.src = 'images/YuMeiPian.png';
    img2.src = 'images/愈美片.png';
  }

  function drawSprite(targetCtx, spriteIdx, isRainbow, hue, x, y, w, h, angle, alpha = 1.0, blendMode = 'source-over') {
    targetCtx.save();
    targetCtx.globalAlpha = alpha;
    targetCtx.globalCompositeOperation = blendMode;
    targetCtx.translate(x, y);
    if (angle !== 0) targetCtx.rotate(angle);

    let img;
    if (!isRainbow || !rainbowCache[spriteIdx] || rainbowCache[spriteIdx].length === 0) {
      img = sprites[spriteIdx];
    } else {
      const step = ((Math.round((hue % 360) / (360 / HUE_STEPS)) % HUE_STEPS) + HUE_STEPS) % HUE_STEPS;
      img = rainbowCache[spriteIdx][step] || sprites[spriteIdx];
    }

    targetCtx.drawImage(img, -w / 2, -h / 2, w, h);
    targetCtx.restore();
  }

  const modes = [];

  modes.push({
    items: [],
    flashes: [],
    init() {
      this.items = [];
      this.flashes = [];
      const count = Math.max(9, Math.min(16, Math.floor(width / 130)));
      for (let i = 0; i < count; i++) {
        const spriteIdx = i % sprites.length;
        const sprite = sprites[spriteIdx];
        const baseW = 160 + Math.random() * 80;
        const aspect = sprite.height / sprite.width;
        const baseH = baseW * aspect;
        const speed = 2.2 + Math.random() * 2.8;
        const angle = (Math.random() * 0.8 + 0.1) * Math.PI + (Math.random() > 0.5 ? 0 : Math.PI);
        this.items.push({
          spriteIdx,
          w: baseW,
          h: baseH,
          x: Math.random() * (width - baseW) + baseW / 2,
          y: Math.random() * (height - baseH) + baseH / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          hue: Math.random() * 360,
          isRainbow: i % 3 !== 0,
          rot: 0,
          rotSpeed: (Math.random() - 0.5) * 0.02,
          scalePulse: 1.0,
          trail: []
        });
      }
    },
    onClick(x, y) {
      for (let i = 0; i < 3; i++) {
        const spriteIdx = Math.floor(Math.random() * sprites.length);
        const sprite = sprites[spriteIdx];
        const baseW = 150 + Math.random() * 70;
        const aspect = sprite.height / sprite.width;
        const ang = Math.random() * Math.PI * 2;
        const spd = 5 + Math.random() * 4;
        this.items.push({
          spriteIdx,
          w: baseW,
          h: baseW * aspect,
          x: x,
          y: y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          hue: Math.random() * 360,
          isRainbow: Math.random() > 0.4,
          rot: 0,
          rotSpeed: (Math.random() - 0.5) * 0.04,
          scalePulse: 1.3,
          trail: []
        });
      }
      if (this.items.length > 25) this.items.shift();
    },
    render() {
      ctx.fillStyle = 'rgba(3, 3, 6, 0.22)';
      ctx.fillRect(0, 0, width, height);

      for (let i = this.flashes.length - 1; i >= 0; i--) {
        const f = this.flashes[i];
        f.alpha -= 0.05;
        if (f.alpha <= 0) {
          this.flashes.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.strokeStyle = `hsla(${f.hue}, 100%, 65%, ${f.alpha})`;
        ctx.lineWidth = 10;
        ctx.strokeRect(0, 0, width, height);
        ctx.restore();
      }

      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i];
        item.x += item.vx;
        item.y += item.vy;
        item.rot += item.rotSpeed;
        item.hue = (item.hue + 1.8) % 360;
        item.scalePulse += (1.0 - item.scalePulse) * 0.1;

        let hit = false;
        const halfW = item.w / 2;
        const halfH = item.h / 2;

        if (item.x - halfW <= 0) {
          item.x = halfW;
          item.vx = Math.abs(item.vx);
          hit = true;
        } else if (item.x + halfW >= width) {
          item.x = width - halfW;
          item.vx = -Math.abs(item.vx);
          hit = true;
        }

        if (item.y - halfH <= 0) {
          item.y = halfH;
          item.vy = Math.abs(item.vy);
          hit = true;
        } else if (item.y + halfH >= height) {
          item.y = height - halfH;
          item.vy = -Math.abs(item.vy);
          hit = true;
        }

        if (hit) {
          item.hue = (item.hue + 60) % 360;
          item.scalePulse = 1.25;
          this.flashes.push({ hue: item.hue, alpha: 0.6 });
        }

        item.trail.push({ x: item.x, y: item.y, rot: item.rot, hue: item.hue });
        if (item.trail.length > 5) item.trail.shift();

        for (let t = 0; t < item.trail.length - 1; t++) {
          const tr = item.trail[t];
          const tAlpha = (t / item.trail.length) * 0.25;
          drawSprite(ctx, item.spriteIdx, item.isRainbow, tr.hue, tr.x, tr.y, item.w, item.h, tr.rot, tAlpha, 'lighter');
        }

        const curW = item.w * item.scalePulse;
        const curH = item.h * item.scalePulse;
        drawSprite(ctx, item.spriteIdx, item.isRainbow, item.hue, item.x, item.y, curW, curH, item.rot, 0.95, item.isRainbow ? 'lighter' : 'source-over');
      }
    }
  });

  modes.push({
    rotAngle: 0,
    rings: [],
    init() {
      this.rings = [
        { radius: 130, count: 6, speed: 0.01, spriteIdx: 0, size: 120, isRainbow: false },
        { radius: 260, count: 8, speed: -0.007, spriteIdx: 1, size: 150, isRainbow: true },
        { radius: 420, count: 12, speed: 0.005, spriteIdx: 0, size: 170, isRainbow: false },
        { radius: 600, count: 16, speed: -0.003, spriteIdx: 1, size: 190, isRainbow: true }
      ];
    },
    onClick() {
      this.rings.forEach(r => { r.speed = -r.speed * 1.3; });
    },
    render(time) {
      ctx.fillStyle = 'rgba(3, 1, 8, 0.28)';
      ctx.fillRect(0, 0, width, height);

      const targetX = mouse.active ? mouse.x : cx;
      const targetY = mouse.active ? mouse.y : cy;

      this.rotAngle += 0.006;

      ctx.save();
      ctx.translate(targetX, targetY);

      for (let r = 0; r < this.rings.length; r++) {
        const ring = this.rings[r];
        const pulse = 1 + Math.sin(time * 0.0025 + r) * 0.08;
        const currentR = ring.radius * pulse;

        for (let i = 0; i < ring.count; i++) {
          const angle = (Math.PI * 2 / ring.count) * i + time * ring.speed;
          const px = Math.cos(angle) * currentR;
          const py = Math.sin(angle) * currentR;
          const hue = (time * 0.15 + r * 60 + i * 30) % 360;
          const sprite = sprites[ring.spriteIdx];
          const aspect = sprite.height / sprite.width;
          const w = ring.size * pulse;
          const h = w * aspect;

          drawSprite(ctx, ring.spriteIdx, ring.isRainbow, hue, px, py, w, h, angle + Math.PI / 2, 0.9, ring.isRainbow ? 'lighter' : 'source-over');
        }
      }

      const centerW = 210 * (1 + Math.sin(time * 0.004) * 0.15);
      const centerH = centerW * (sprites[1].height / sprites[1].width);
      drawSprite(ctx, 1, false, 0, 0, 0, centerW, centerH, -this.rotAngle * 2, 1.0, 'source-over');

      ctx.restore();
    }
  });

  modes.push({
    stars: [],
    init() {
      this.stars = [];
      const count = Math.max(35, Math.min(65, Math.floor(width / 35)));
      for (let i = 0; i < count; i++) {
        this.stars.push(this.createStar());
      }
    },
    createStar(deep = true) {
      const spriteIdx = Math.floor(Math.random() * sprites.length);
      return {
        x: (Math.random() - 0.5) * width * 2.5,
        y: (Math.random() - 0.5) * height * 2.5,
        z: deep ? Math.random() * 1200 + 100 : 1300,
        pz: 1300,
        spriteIdx,
        isRainbow: Math.random() > 0.4,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        hue: Math.random() * 360
      };
    },
    onClick() {
      this.stars.forEach(s => { s.z = Math.random() * 300 + 60; });
    },
    render() {
      ctx.fillStyle = 'rgba(2, 2, 5, 0.28)';
      ctx.fillRect(0, 0, width, height);

      const fov = 320;
      const speed = 14 + (mouse.down ? 25 : 0);
      const targetCx = cx + (mouse.active ? (mouse.x - cx) * 0.35 : 0);
      const targetCy = cy + (mouse.active ? (mouse.y - cy) * 0.35 : 0);

      this.stars.sort((a, b) => b.z - a.z);

      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        s.pz = s.z;
        s.z -= speed;
        s.rot += s.rotSpeed;
        s.hue = (s.hue + 1.8) % 360;

        if (s.z <= 30) {
          Object.assign(s, this.createStar(false));
          continue;
        }

        const scale = fov / s.z;
        const sx = targetCx + s.x * scale;
        const sy = targetCy + s.y * scale;

        const prevScale = fov / s.pz;
        const psx = targetCx + s.x * prevScale;
        const psy = targetCy + s.y * prevScale;

        ctx.save();
        ctx.strokeStyle = s.isRainbow ? `hsla(${s.hue}, 100%, 70%, ${Math.min(0.8, scale * 1.2)})` : 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = Math.max(1, scale * 3);
        ctx.beginPath();
        ctx.moveTo(psx, psy);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        ctx.restore();

        const sprite = sprites[s.spriteIdx];
        const aspect = sprite.height / sprite.width;
        const boxW = Math.max(70, Math.min(width * 0.7, 210 * scale));
        const boxH = boxW * aspect;
        const alpha = Math.min(1, (1300 - s.z) / 300);

        drawSprite(ctx, s.spriteIdx, s.isRainbow, s.hue, sx, sy, boxW, boxH, s.rot, alpha, s.isRainbow ? 'lighter' : 'source-over');
      }
    }
  });

  modes.push({
    orbs: [],
    init() {
      this.orbs = [];
      const count = Math.max(18, Math.min(32, Math.floor(width / 55)));
      for (let i = 0; i < count; i++) {
        const spriteIdx = i % sprites.length;
        const sprite = sprites[spriteIdx];
        const w = 130 + Math.random() * 70;
        this.orbs.push({
          spriteIdx,
          w,
          h: w * (sprite.height / sprite.width),
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.03,
          hue: Math.random() * 360,
          isRainbow: i % 2 === 0
        });
      }
    },
    onClick(x, y) {
      this.orbs.forEach(o => {
        const dx = o.x - x;
        const dy = o.y - y;
        const dist = Math.max(20, Math.hypot(dx, dy));
        const force = 220 / dist;
        o.vx += (dx / dist) * force;
        o.vy += (dy / dist) * force;
      });
    },
    render() {
      ctx.fillStyle = 'rgba(3, 2, 7, 0.25)';
      ctx.fillRect(0, 0, width, height);

      const targetX = mouse.active ? mouse.x : cx;
      const targetY = mouse.active ? mouse.y : cy;

      for (let i = 0; i < this.orbs.length; i++) {
        const o = this.orbs[i];
        const dx = targetX - o.x;
        const dy = targetY - o.y;
        const dist = Math.hypot(dx, dy);

        const G = 0.7;
        const f = G / Math.max(50, dist * 0.09);
        o.vx += (dx / dist) * f;
        o.vy += (dy / dist) * f;

        o.vx += (-dy / dist) * 0.25;
        o.vy += (dx / dist) * 0.25;

        o.vx *= 0.988;
        o.vy *= 0.988;

        o.x += o.vx;
        o.y += o.vy;
        o.rot += o.rotSpeed;
        o.hue = (o.hue + 1.6) % 360;

        if (dist < 260) {
          ctx.save();
          ctx.strokeStyle = o.isRainbow ? `hsla(${o.hue}, 100%, 65%, ${(1 - dist / 260) * 0.4})` : `rgba(255, 255, 255, ${(1 - dist / 260) * 0.3})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(o.x, o.y);
          ctx.lineTo(targetX, targetY);
          ctx.stroke();
          ctx.restore();
        }

        drawSprite(ctx, o.spriteIdx, o.isRainbow, o.hue, o.x, o.y, o.w, o.h, o.rot, 0.95, o.isRainbow ? 'lighter' : 'source-over');
      }
    }
  });

  modes.push({
    columns: [],
    init() {
      this.columns = [];
      const colWidth = 140;
      const count = Math.ceil(width / colWidth);
      for (let i = 0; i < count; i++) {
        this.columns.push({
          x: i * colWidth + colWidth / 2,
          y: Math.random() * -height,
          speed: 3 + Math.random() * 4,
          length: 3 + Math.floor(Math.random() * 3),
          hueOffset: i * 30,
          spriteIdx: i % sprites.length,
          isRainbow: i % 2 !== 0
        });
      }
    },
    onClick() {
      this.columns.forEach(c => { c.speed = 10 + Math.random() * 8; });
    },
    render(time) {
      ctx.fillStyle = 'rgba(2, 4, 8, 0.25)';
      ctx.fillRect(0, 0, width, height);

      for (let c = 0; c < this.columns.length; c++) {
        const col = this.columns[c];
        col.y += col.speed;

        const sprite = sprites[col.spriteIdx];
        const aspect = sprite.height / sprite.width;
        const boxW = 125;
        const boxH = boxW * aspect;

        if (col.y - col.length * (boxH * 1.1) > height) {
          col.y = -boxH;
          col.speed = 3 + Math.random() * 4;
        }

        let offsetX = 0;
        if (mouse.active) {
          const dmx = col.x - mouse.x;
          const dmy = col.y - mouse.y;
          const dist = Math.hypot(dmx, dmy);
          if (dist < 160) {
            offsetX = (dmx / dist) * (160 - dist) * 0.7;
          }
        }

        for (let j = 0; j < col.length; j++) {
          const itemY = col.y - j * (boxH * 1.15);
          if (itemY < -boxH || itemY > height + boxH) continue;

          const progress = 1 - (j / col.length);
          const hue = (time * 0.15 + col.hueOffset + j * 25) % 360;
          const alpha = progress * (j === 0 ? 1 : 0.75);

          drawSprite(ctx, col.spriteIdx, col.isRainbow, hue, col.x + offsetX, itemY, boxW, boxH, 0, alpha, col.isRainbow ? 'lighter' : 'source-over');
        }
      }
    }
  });

  modes.push({
    nodes: [],
    rotX: 0,
    rotY: 0,
    init() {
      this.nodes = [];
      const count = Math.max(22, Math.min(36, Math.floor(width / 45)));
      for (let i = 0; i < count; i++) {
        this.nodes.push({
          x: (Math.random() - 0.5) * 10,
          y: (Math.random() - 0.5) * 10,
          z: 20 + (Math.random() - 0.5) * 10,
          spriteIdx: i % sprites.length,
          size: 110 + Math.random() * 40,
          hue: (i / count) * 360,
          isRainbow: i % 2 === 0,
          trail: []
        });
      }
    },
    onClick() {
      this.nodes.forEach(n => {
        n.x = (Math.random() - 0.5) * 25;
        n.y = (Math.random() - 0.5) * 25;
      });
    },
    render() {
      ctx.fillStyle = 'rgba(3, 1, 6, 0.25)';
      ctx.fillRect(0, 0, width, height);

      this.rotX += 0.005;
      this.rotY += 0.004;

      const sigma = 10;
      const rho = 28;
      const beta = 8 / 3;
      const dt = 0.007;
      const scale = Math.min(width, height) * 0.02;

      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        n.hue = (n.hue + 1.8) % 360;

        for (let step = 0; step < 2; step++) {
          const dx = sigma * (n.y - n.x);
          const dy = n.x * (rho - n.z) - n.y;
          const dz = n.x * n.y - beta * n.z;
          n.x += dx * dt;
          n.y += dy * dt;
          n.z += dz * dt;
        }

        let rx = n.x;
        let ry = n.y * Math.cos(this.rotX) - (n.z - 25) * Math.sin(this.rotX);
        let rz = n.y * Math.sin(this.rotX) + (n.z - 25) * Math.cos(this.rotX);

        let finalX = rx * Math.cos(this.rotY) + rz * Math.sin(this.rotY);
        let finalY = ry;
        let finalZ = -rx * Math.sin(this.rotY) + rz * Math.cos(this.rotY);

        const screenX = cx + finalX * scale;
        const screenY = cy + finalY * scale;

        const depthScale = Math.max(0.7, 1 + finalZ * 0.02);
        const w = n.size * depthScale;
        const sprite = sprites[n.spriteIdx];
        const aspect = sprite.height / sprite.width;
        drawSprite(ctx, n.spriteIdx, n.isRainbow, n.hue, screenX, screenY, w, w * aspect, this.rotX + this.rotY, Math.min(1, depthScale), n.isRainbow ? 'lighter' : 'source-over');
      }
    }
  });

  modes.push({
    stars: [],
    gridOffset: 0,
    monoliths: [],
    init() {
      this.stars = [];
      for (let i = 0; i < 50; i++) {
        this.stars.push({
          x: Math.random() * width,
          y: Math.random() * (height * 0.55),
          size: Math.random() * 2.5,
          alpha: Math.random()
        });
      }
      this.monoliths = [
        { x: -280, rot: 0, rotSpd: 0.012, spriteIdx: 1, w: 200, isRainbow: true },
        { x: 0, rot: 0, rotSpd: -0.008, spriteIdx: 0, w: 260, isRainbow: false },
        { x: 280, rot: 0, rotSpd: 0.01, spriteIdx: 1, w: 200, isRainbow: true }
      ];
    },
    onClick() {
      this.monoliths.forEach(m => { m.rotSpd *= -1.5; });
    },
    render(time) {
      const horizon = height * 0.55;
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
      skyGrad.addColorStop(0, '#0a0017');
      skyGrad.addColorStop(0.6, '#28003b');
      skyGrad.addColorStop(1, '#ff007f');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, horizon);

      this.stars.forEach(st => {
        ctx.fillStyle = `rgba(255, 255, 255, ${st.alpha * (0.6 + Math.sin(time * 0.004 + st.x) * 0.4)})`;
        ctx.fillRect(st.x, st.y, st.size, st.size);
      });

      const sunR = Math.min(width, height) * 0.22;
      const sunGrad = ctx.createLinearGradient(0, horizon - sunR * 1.5, 0, horizon);
      sunGrad.addColorStop(0, '#fffb00');
      sunGrad.addColorStop(0.5, '#ff0077');
      sunGrad.addColorStop(1, '#660099');

      ctx.save();
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(cx, horizon, sunR, Math.PI, 0);
      ctx.fill();

      for (let bar = 1; bar < 8; bar++) {
        const barY = horizon - (bar / 8) * (sunR * 0.85);
        ctx.fillStyle = '#0a0017';
        ctx.fillRect(cx - sunR, barY, sunR * 2, bar * 2);
      }
      ctx.restore();

      const floorGrad = ctx.createLinearGradient(0, horizon, 0, height);
      floorGrad.addColorStop(0, '#0d001a');
      floorGrad.addColorStop(1, '#020008');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, horizon, width, height - horizon);

      this.gridOffset = (this.gridOffset + 2.5) % 40;

      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;

      const vCols = 18;
      for (let i = -vCols; i <= vCols; i++) {
        const bottomX = cx + i * (width / vCols * 1.4);
        ctx.beginPath();
        ctx.moveTo(cx, horizon);
        ctx.lineTo(bottomX, height);
        ctx.stroke();
      }

      const numHoriz = 12;
      for (let j = 0; j < numHoriz; j++) {
        const p = Math.pow((j + (this.gridOffset / 40)) / numHoriz, 2.5);
        const y = horizon + p * (height - horizon);
        ctx.strokeStyle = `rgba(255, 0, 128, ${p * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      this.monoliths.forEach((m, idx) => {
        m.rot += m.rotSpd;
        const bob = Math.sin(time * 0.0025 + idx * 2) * 28;
        const posY = horizon - 90 + bob;
        const posX = cx + m.x;
        const hue = (time * 0.15 + idx * 90) % 360;
        const sprite = sprites[m.spriteIdx];
        const aspect = sprite.height / sprite.width;
        const h = m.w * aspect;

        ctx.save();
        ctx.translate(posX, horizon + (horizon - posY));
        ctx.scale(1, -0.65);
        drawSprite(ctx, m.spriteIdx, m.isRainbow, hue, 0, 0, m.w, h, m.rot, 0.35, 'source-over');
        ctx.restore();

        drawSprite(ctx, m.spriteIdx, m.isRainbow, hue, posX, posY, m.w, h, m.rot, 0.98, m.isRainbow ? 'lighter' : 'source-over');
      });
    }
  });

  modes.push({
    nodes: [],
    rot: 0,
    init() {
      this.nodes = [];
      const steps = 22;
      for (let i = 0; i < steps; i++) {
        this.nodes.push({ step: i, spriteA: 0, spriteB: 1 });
      }
    },
    onClick() {
      this.rot += Math.PI;
    },
    render(time) {
      ctx.fillStyle = 'rgba(2, 3, 7, 0.28)';
      ctx.fillRect(0, 0, width, height);

      this.rot += 0.012;
      const radius = Math.min(width, height) * 0.3;
      const stepY = (height * 1.2) / this.nodes.length;
      const startY = -height * 0.1;

      const strandA = [];
      const strandB = [];

      for (let i = 0; i < this.nodes.length; i++) {
        const theta = (i * 0.32) + this.rot;
        const y = startY + i * stepY;

        const xA = cx + Math.cos(theta) * radius;
        const zA = Math.sin(theta);

        const xB = cx + Math.cos(theta + Math.PI) * radius;
        const zB = Math.sin(theta + Math.PI);

        const hue = (time * 0.15 + i * 20) % 360;

        ctx.save();
        ctx.strokeStyle = `hsla(${hue}, 100%, 65%, 0.45)`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(xA, y);
        ctx.lineTo(xB, y);
        ctx.stroke();
        ctx.restore();

        strandA.push({ x: xA, y, z: zA, hue, spriteIdx: 0, isRainbow: false });
        strandB.push({ x: xB, y, z: zB, hue: (hue + 180) % 360, spriteIdx: 1, isRainbow: true });
      }

      const allPoints = strandA.concat(strandB).sort((a, b) => a.z - b.z);

      allPoints.forEach(pt => {
        const scale = 0.7 + (pt.z + 1) * 0.35;
        const baseW = 125 * scale;
        const sprite = sprites[pt.spriteIdx];
        const aspect = sprite.height / sprite.width;
        drawSprite(ctx, pt.spriteIdx, pt.isRainbow, pt.hue, pt.x, pt.y, baseW, baseW * aspect, pt.z * 0.4, 0.4 + (pt.z + 1) * 0.3, pt.isRainbow ? 'lighter' : 'source-over');
      });
    }
  });

  modes.push({
    zoom: 0,
    init() {},
    onClick() {
      this.zoom += 1.5;
    },
    render(time) {
      ctx.fillStyle = 'rgba(2, 1, 6, 0.28)';
      ctx.fillRect(0, 0, width, height);

      this.zoom += 0.005;
      const layers = 10;
      const rot = time * 0.0006;

      ctx.save();
      ctx.translate(cx, cy);

      for (let i = layers; i >= 0; i--) {
        const progress = (i + (this.zoom % 1)) / layers;
        const scale = Math.pow(progress, 3.2) * (Math.max(width, height) / 110);
        if (scale < 0.1) continue;

        const spriteIdx = i % sprites.length;
        const sprite = sprites[spriteIdx];
        const hue = (time * 0.18 + i * 40) % 360;
        const angle = rot * (i % 2 === 0 ? 1 : -1) * 2 + i * 0.15;
        const aspect = sprite.height / sprite.width;
        const w = 240 * scale;
        const h = w * aspect;
        const isRainbow = i % 2 === 0;

        drawSprite(ctx, spriteIdx, isRainbow, hue, 0, 0, w, h, angle, Math.min(1, progress * 1.5), isRainbow ? 'lighter' : 'source-over');
      }

      ctx.restore();
    }
  });

  modes.push({
    scanY: 0,
    targets: [],
    init() {
      this.targets = [];
      for (let i = 0; i < 7; i++) {
        const spriteIdx = i % sprites.length;
        const sprite = sprites[spriteIdx];
        const w = 180 + Math.random() * 80;
        this.targets.push({
          x: Math.random() * (width - w) + w / 2,
          y: Math.random() * (height - w) + w / 2,
          w,
          h: w * (sprite.height / sprite.width),
          spriteIdx,
          hue: Math.random() * 360,
          isRainbow: i % 2 === 0,
          glitchTimer: 0
        });
      }
    },
    onClick() {
      this.targets.forEach(t => { t.glitchTimer = 12; });
    },
    render(time) {
      ctx.fillStyle = 'rgba(1, 4, 8, 0.3)';
      ctx.fillRect(0, 0, width, height);

      this.scanY = (this.scanY + 5) % height;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.fillRect(0, this.scanY - 8, width, 16);
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, this.scanY);
      ctx.lineTo(width, this.scanY);
      ctx.stroke();
      ctx.restore();

      this.targets.forEach((t, idx) => {
        t.glitchTimer = Math.max(0, t.glitchTimer - 1);
        const isGlitching = t.glitchTimer > 0 || Math.random() < 0.03;
        const glitchShift = isGlitching ? (Math.random() - 0.5) * 20 : 0;
        const curHue = (time * 0.18 + idx * 50) % 360;

        ctx.save();
        ctx.strokeStyle = t.isRainbow ? `hsla(${curHue}, 100%, 60%, 0.7)` : '#00ff88';
        ctx.lineWidth = 1.5;
        const bPad = 12;
        const bx = t.x - t.w / 2 - bPad;
        const by = t.y - t.h / 2 - bPad;
        const bw = t.w + bPad * 2;
        const bh = t.h + bPad * 2;

        const cLen = 12;
        ctx.beginPath();
        ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by);
        ctx.moveTo(bx + bw - cLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cLen);
        ctx.moveTo(bx, by + bh - cLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cLen, by + bh);
        ctx.moveTo(bx + bw - cLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cLen);
        ctx.stroke();
        ctx.restore();

        if (isGlitching) {
          drawSprite(ctx, t.spriteIdx, true, curHue, t.x + glitchShift, t.y, t.w, t.h, 0, 0.8, 'lighter');
          drawSprite(ctx, t.spriteIdx, false, 0, t.x - glitchShift, t.y + 3, t.w, t.h, 0, 0.7, 'source-over');
        } else {
          drawSprite(ctx, t.spriteIdx, t.isRainbow, curHue, t.x, t.y, t.w, t.h, 0, 0.95, t.isRainbow ? 'lighter' : 'source-over');
        }
      });
    }
  });

  modes.push({
    boids: [],
    init() {
      this.boids = [];
      const count = Math.max(20, Math.min(35, Math.floor(width / 45)));
      for (let i = 0; i < count; i++) {
        const spriteIdx = i % sprites.length;
        const sprite = sprites[spriteIdx];
        const w = 110 + Math.random() * 40;
        this.boids.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          w,
          h: w * (sprite.height / sprite.width),
          spriteIdx,
          isRainbow: i % 2 === 0,
          hue: (i / count) * 360
        });
      }
    },
    onClick() {
      this.boids.forEach(b => {
        b.vx += (Math.random() - 0.5) * 16;
        b.vy += (Math.random() - 0.5) * 16;
      });
    },
    render() {
      ctx.fillStyle = 'rgba(2, 1, 5, 0.25)';
      ctx.fillRect(0, 0, width, height);

      const targetX = mouse.active ? mouse.x : cx;
      const targetY = mouse.active ? mouse.y : cy;

      for (let i = 0; i < this.boids.length; i++) {
        const b = this.boids[i];

        const dx = targetX - b.x;
        const dy = targetY - b.y;
        const dist = Math.max(40, Math.hypot(dx, dy));
        b.vx += (dx / dist) * 0.22;
        b.vy += (dy / dist) * 0.22;

        const spd = Math.hypot(b.vx, b.vy);
        const maxSpd = 7;
        if (spd > maxSpd) {
          b.vx = (b.vx / spd) * maxSpd;
          b.vy = (b.vy / spd) * maxSpd;
        }

        b.x += b.vx;
        b.y += b.vy;
        b.hue = (b.hue + 1.8) % 360;

        if (b.x < -b.w) b.x = width + b.w;
        if (b.x > width + b.w) b.x = -b.w;
        if (b.y < -b.h) b.y = height + b.h;
        if (b.y > height + b.h) b.y = -b.h;

        const angle = Math.atan2(b.vy, b.vx);
        drawSprite(ctx, b.spriteIdx, b.isRainbow, b.hue, b.x, b.y, b.w, b.h, angle, 0.95, b.isRainbow ? 'lighter' : 'source-over');
      }
    }
  });

  modes.push({
    cols: 5,
    rows: 4,
    nodes: [],
    init() {
      this.nodes = [];
      const stepX = width / (this.cols + 1);
      const stepY = height / (this.rows + 1);
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const origX = (c + 1) * stepX;
          const origY = (r + 1) * stepY;
          const spriteIdx = (r * this.cols + c) % sprites.length;
          const sprite = sprites[spriteIdx];
          const w = 120;
          this.nodes.push({
            origX, origY,
            x: origX, y: origY,
            vx: 0, vy: 0,
            w, h: w * (sprite.height / sprite.width),
            spriteIdx,
            isRainbow: (r + c) % 2 === 0,
            hue: ((r * this.cols + c) * 20) % 360
          });
        }
      }
    },
    onClick(x, y) {
      this.nodes.forEach(n => {
        const dx = n.x - x;
        const dy = n.y - y;
        const dist = Math.max(10, Math.hypot(dx, dy));
        n.vx += (dx / dist) * 22;
        n.vy += (dy / dist) * 22;
      });
    },
    render() {
      ctx.fillStyle = 'rgba(2, 2, 6, 0.28)';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        n.hue = (n.hue + 1.8) % 360;

        const k = 0.045;
        n.vx += (n.origX - n.x) * k;
        n.vy += (n.origY - n.y) * k;

        if (mouse.active) {
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 150) {
            const force = (150 - dist) * 0.1;
            n.vx += (dx / dist) * force;
            n.vy += (dy / dist) * force;
          }
        }

        n.vx *= 0.92;
        n.vy *= 0.92;
        n.x += n.vx;
        n.y += n.vy;
      }

      ctx.save();
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const idx = r * this.cols + c;
          const n = this.nodes[idx];

          if (c < this.cols - 1) {
            const right = this.nodes[idx + 1];
            ctx.strokeStyle = n.isRainbow ? `hsla(${n.hue}, 100%, 65%, 0.45)` : 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(right.x, right.y);
            ctx.stroke();
          }

          if (r < this.rows - 1) {
            const down = this.nodes[idx + this.cols];
            ctx.strokeStyle = n.isRainbow ? `hsla(${n.hue}, 100%, 65%, 0.45)` : 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(down.x, down.y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      this.nodes.forEach(n => {
        drawSprite(ctx, n.spriteIdx, n.isRainbow, n.hue, n.x, n.y, n.w, n.h, (n.vx + n.vy) * 0.03, 0.95, n.isRainbow ? 'lighter' : 'source-over');
      });
    }
  });

  modes.push({
    rings: [],
    pulses: [],
    init() {
      this.rings = [];
      this.pulses = [];
      const numRings = 4;
      for (let r = 1; r <= numRings; r++) {
        const radius = r * 115;
        const count = r * 6;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 / count) * i;
          const spriteIdx = (r + i) % sprites.length;
          const sprite = sprites[spriteIdx];
          const w = 110 + r * 10;
          this.rings.push({
            baseR: radius,
            angle,
            spriteIdx,
            w,
            h: w * (sprite.height / sprite.width),
            isRainbow: r % 2 === 0,
            hue: (r * 60 + i * 25) % 360,
            kick: 0
          });
        }
      }
    },
    onClick() {
      this.pulses.push({ r: 0, maxR: Math.max(width, height), speed: 16 });
    },
    render(time) {
      ctx.fillStyle = 'rgba(3, 1, 7, 0.28)';
      ctx.fillRect(0, 0, width, height);

      if (Math.floor(time / 550) !== Math.floor((time - 16) / 550)) {
        this.pulses.push({ r: 0, maxR: Math.max(width, height) * 0.9, speed: 10 });
      }

      for (let p = this.pulses.length - 1; p >= 0; p--) {
        const pulse = this.pulses[p];
        pulse.r += pulse.speed;

        ctx.save();
        ctx.strokeStyle = `hsla(${(time * 0.18 + pulse.r) % 360}, 100%, 65%, ${1 - pulse.r / pulse.maxR})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, pulse.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        this.rings.forEach(b => {
          if (Math.abs(b.baseR - pulse.r) < 25) {
            b.kick = 26;
          }
        });

        if (pulse.r >= pulse.maxR) {
          this.pulses.splice(p, 1);
        }
      }

      this.rings.forEach(b => {
        b.kick *= 0.9;
        b.angle += 0.004;
        const currentR = b.baseR + b.kick;
        const px = cx + Math.cos(b.angle) * currentR;
        const py = cy + Math.sin(b.angle) * currentR;
        const scale = 1 + b.kick * 0.015;
        const hue = (time * 0.18 + b.hue) % 360;

        drawSprite(ctx, b.spriteIdx, b.isRainbow, hue, px, py, b.w * scale, b.h * scale, b.angle + Math.PI / 2, 0.95, b.isRainbow ? 'lighter' : 'source-over');
      });
    }
  });

  modes.push({
    items: [],
    history: [],
    init() {
      this.items = [];
      this.history = [];
      const count = 10;
      for (let i = 0; i < count; i++) {
        const spriteIdx = i % sprites.length;
        const sprite = sprites[spriteIdx];
        const w = 170;
        this.items.push({
          spriteIdx,
          w,
          h: w * (sprite.height / sprite.width),
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.04,
          hue: (i * 36) % 360,
          isRainbow: i % 2 === 0
        });
      }
    },
    onClick() {
      this.items.forEach(it => {
        it.vx = (Math.random() - 0.5) * 14;
        it.vy = (Math.random() - 0.5) * 14;
      });
    },
    render() {
      ctx.fillStyle = 'rgba(2, 2, 5, 0.25)';
      ctx.fillRect(0, 0, width, height);

      const mouseSpeed = Math.hypot(mouse.vx, mouse.vy);
      const timeScale = 0.08 + Math.min(1.0, mouseSpeed * 0.14);

      this.items.forEach(it => {
        it.x += it.vx * timeScale;
        it.y += it.vy * timeScale;
        it.rot += it.rotSpeed * timeScale;
        it.hue = (it.hue + 1.8 * timeScale) % 360;

        if (it.x <= it.w / 2 || it.x >= width - it.w / 2) it.vx *= -1;
        if (it.y <= it.h / 2 || it.y >= height - it.h / 2) it.vy *= -1;
      });

      const snapshot = this.items.map(it => ({ x: it.x, y: it.y, rot: it.rot, hue: it.hue }));
      this.history.unshift(snapshot);
      if (this.history.length > 8) this.history.pop();

      for (let h = this.history.length - 1; h >= 0; h--) {
        const snap = this.history[h];
        const alpha = (1 - h / this.history.length) * 0.25;
        snap.forEach((s, idx) => {
          const it = this.items[idx];
          drawSprite(ctx, it.spriteIdx, true, s.hue, s.x, s.y, it.w, it.h, s.rot, alpha, 'lighter');
        });
      }

      this.items.forEach(it => {
        drawSprite(ctx, it.spriteIdx, it.isRainbow, it.hue, it.x, it.y, it.w, it.h, it.rot, 0.98, it.isRainbow ? 'lighter' : 'source-over');
      });
    }
  });

  modes.push({
    rockets: [],
    fragments: [],
    init() {
      this.rockets = [];
      this.fragments = [];
    },
    spawnRocket(targetX, targetY) {
      this.rockets.push({
        x: targetX || Math.random() * width,
        y: height,
        targetY: targetY || Math.random() * (height * 0.45) + 60,
        vy: -11 - Math.random() * 5,
        hue: Math.random() * 360
      });
    },
    explode(x, y, hue) {
      const numFrags = 16;
      for (let i = 0; i < numFrags; i++) {
        const angle = (Math.PI * 2 / numFrags) * i + (Math.random() - 0.5) * 0.3;
        const spd = 4 + Math.random() * 6;
        const spriteIdx = i % sprites.length;
        const sprite = sprites[spriteIdx];
        const w = 110 + Math.random() * 40;
        this.fragments.push({
          x, y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          spriteIdx,
          isRainbow: i % 2 === 0,
          w,
          h: w * (sprite.height / sprite.width),
          rot: Math.random() * Math.PI * 2,
          rotSpd: (Math.random() - 0.5) * 0.08,
          hue: (hue + Math.random() * 60) % 360,
          alpha: 1.0,
          decay: 0.015 + Math.random() * 0.008
        });
      }
    },
    onClick(x, y) {
      this.explode(x, y, Math.random() * 360);
    },
    render() {
      ctx.fillStyle = 'rgba(2, 2, 5, 0.28)';
      ctx.fillRect(0, 0, width, height);

      if (Math.random() < 0.035) {
        this.spawnRocket();
      }

      for (let r = this.rockets.length - 1; r >= 0; r--) {
        const rkt = this.rockets[r];
        rkt.y += rkt.vy;

        ctx.fillStyle = `hsla(${rkt.hue}, 100%, 75%, 0.8)`;
        ctx.fillRect(rkt.x - 2, rkt.y, 4, 10);

        if (rkt.y <= rkt.targetY) {
          this.explode(rkt.x, rkt.y, rkt.hue);
          this.rockets.splice(r, 1);
        }
      }

      for (let f = this.fragments.length - 1; f >= 0; f--) {
        const frag = this.fragments[f];
        frag.x += frag.vx;
        frag.y += frag.vy;
        frag.vy += 0.1;
        frag.vx *= 0.985;
        frag.rot += frag.rotSpd;
        frag.hue = (frag.hue + 2.0) % 360;
        frag.alpha -= frag.decay;

        if (frag.alpha <= 0) {
          this.fragments.splice(f, 1);
          continue;
        }

        drawSprite(ctx, frag.spriteIdx, frag.isRainbow, frag.hue, frag.x, frag.y, frag.w, frag.h, frag.rot, frag.alpha, frag.isRainbow ? 'lighter' : 'source-over');
      }
    }
  });

  let activeMode = null;

  function initCurrentMode() {
    activeMode = modes[currentMode];
    if (activeMode && activeMode.init) {
      activeMode.init();
    }
  }

  function renderCursorParticles() {
    for (let i = cursorParticles.length - 1; i >= 0; i--) {
      const p = cursorParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        cursorParticles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function loop(now) {
    if (activeMode && activeMode.render) {
      activeMode.render(now);
    }
    renderCursorParticles();
    requestAnimationFrame(loop);
  }

  loadAssets(() => {
    resize();
    initCurrentMode();
    requestAnimationFrame(loop);
  });

})();
