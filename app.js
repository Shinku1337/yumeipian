(function () {
  'use strict';

  const TOTAL_MODES = 50;
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

  const warnModal = document.getElementById('warn-modal');
  const warnBtn = document.getElementById('warn-btn');

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  }

  function setCookie(name, val, days) {
    const maxAge = (days || 365) * 86400;
    document.cookie = name + '=' + encodeURIComponent(val) + '; max-age=' + maxAge + '; path=/; SameSite=Lax';
    try { localStorage.setItem(name, val); } catch (e) {}
  }

  const isAck = getCookie('epilepsy_ack') === '1' || (function () {
    try { return localStorage.getItem('epilepsy_ack') === '1'; } catch (e) { return false; }
  })();

  if (!isAck && warnModal) {
    warnModal.style.display = 'flex';
    if (warnBtn) {
      warnBtn.addEventListener('click', () => {
        setCookie('epilepsy_ack', '1', 365);
        warnModal.style.opacity = '0';
        warnModal.style.visibility = 'hidden';
        setTimeout(() => {
          warnModal.style.display = 'none';
        }, 350);
      });
    }
  } else if (warnModal) {
    warnModal.style.display = 'none';
  }

  let width = 0, height = 0, cx = 0, cy = 0;
  let dpr = 1;
  let uiScale = 1;

  function getScale() {
    return Math.min(1.0, Math.max(0.55, Math.min(width, height) / 750));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);
    cx = width / 2;
    cy = height / 2;
    uiScale = getScale();
    if (activeMode && activeMode.resize) {
      activeMode.resize(width, height);
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => {
    setTimeout(resize, 150);
  });

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

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  function onPointerMove(e) {
    const isTouch = !!e.touches;
    const x = isTouch ? e.touches[0].clientX : e.clientX;
    const y = isTouch ? e.touches[0].clientY : e.clientY;
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

  window.addEventListener('touchmove', (e) => {
    if (e.target.closest('#btn-wrap')) return;
    if (e.cancelable) e.preventDefault();
    onPointerMove(e);
  }, { passive: false });

  function spawnShockwave(x, y) {
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

  window.addEventListener('mousedown', (e) => {
    if (e.target.closest('#btn-wrap')) return;
    mouse.down = true;
    spawnShockwave(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });

  window.addEventListener('touchstart', (e) => {
    if (e.target.closest('#btn-wrap')) return;
    if (e.touches.length === 2) {
      switchMode(currentMode + 1);
      return;
    }
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = performance.now();
    mouse.down = true;
    mouse.x = t.clientX;
    mouse.y = t.clientY;
    mouse.active = true;
    spawnShockwave(t.clientX, t.clientY);
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    mouse.down = false;
    if (e.changedTouches && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const dt = performance.now() - touchStartTime;
      if (dt < 350 && Math.abs(dx) > 60 && Math.abs(dy) < 50) {
        if (dx < -60) switchMode(currentMode + 1);
        else if (dx > 60) switchMode(currentMode - 1);
      }
    }
  }, { passive: true });

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
    if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'ArrowUp' || e.code === 'Enter' || e.code === 'PageDown') {
      switchMode(currentMode + 1);
    } else if (e.code === 'ArrowLeft' || e.code === 'ArrowDown' || e.code === 'PageUp') {
      switchMode(currentMode - 1);
    } else if (e.key >= '1' && e.key <= '9') {
      switchMode(parseInt(e.key, 10) - 1);
    } else if (e.key === '0') switchMode(9);
    else if (e.key === 'q') switchMode(10);
    else if (e.key === 'w') switchMode(11);
    else if (e.key === 'e') switchMode(12);
    else if (e.key === 'r') switchMode(13);
    else if (e.key === 't') switchMode(14);
    else if (e.key === 'y') switchMode(15);
    else if (e.key === 'u') switchMode(16);
    else if (e.key === 'i') switchMode(17);
    else if (e.key === 'o') switchMode(18);
    else if (e.key === 'p') switchMode(19);
    else if (e.key === 'a') switchMode(20);
    else if (e.key === 's') switchMode(21);
    else if (e.key === 'd') switchMode(22);
    else if (e.key === 'f') switchMode(23);
    else if (e.key === 'g') switchMode(24);
    else if (e.key === 'h') switchMode(25);
    else if (e.key === 'j') switchMode(26);
    else if (e.key === 'k') switchMode(27);
    else if (e.key === 'l') switchMode(28);
    else if (e.key === 'z') switchMode(29);
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
      const s = getScale();
      const count = Math.max(7, Math.min(14, Math.floor(width / (width < 600 ? 70 : 130))));
      for (let i = 0; i < count; i++) {
        const spriteIdx = i % sprites.length;
        const sprite = sprites[spriteIdx];
        const baseW = (135 + Math.random() * 70) * s;
        const aspect = sprite.height / sprite.width;
        const baseH = baseW * aspect;
        const speed = 2.0 + Math.random() * 2.5;
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
      const s = getScale();
      for (let i = 0; i < 3; i++) {
        const spriteIdx = Math.floor(Math.random() * sprites.length);
        const sprite = sprites[spriteIdx];
        const baseW = (130 + Math.random() * 60) * s;
        const aspect = sprite.height / sprite.width;
        const ang = Math.random() * Math.PI * 2;
        const spd = 4 + Math.random() * 4;
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
      if (this.items.length > 22) this.items.shift();
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
      const s = getScale();
      this.rings = [
        { radius: 100 * s, count: 5, speed: 0.01, spriteIdx: 0, size: 100 * s, isRainbow: false },
        { radius: 210 * s, count: 8, speed: -0.007, spriteIdx: 1, size: 130 * s, isRainbow: true },
        { radius: 340 * s, count: 10, speed: 0.005, spriteIdx: 0, size: 150 * s, isRainbow: false },
        { radius: 480 * s, count: 14, speed: -0.003, spriteIdx: 1, size: 170 * s, isRainbow: true }
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

      const s = getScale();
      const centerW = 180 * s * (1 + Math.sin(time * 0.004) * 0.15);
      const centerH = centerW * (sprites[1].height / sprites[1].width);
      drawSprite(ctx, 1, false, 0, 0, 0, centerW, centerH, -this.rotAngle * 2, 1.0, 'source-over');

      ctx.restore();
    }
  });

  modes.push({
    stars: [],
    init() {
      this.stars = [];
      const count = Math.max(25, Math.min(55, Math.floor(width / (width < 600 ? 25 : 35))));
      for (let i = 0; i < count; i++) {
        this.stars.push(this.createStar());
      }
    },
    createStar(deep = true) {
      const spriteIdx = Math.floor(Math.random() * sprites.length);
      return {
        x: (Math.random() - 0.5) * width * 2.2,
        y: (Math.random() - 0.5) * height * 2.2,
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

      const s = getScale();
      const fov = 300 * s;
      const speed = 12 + (mouse.down ? 22 : 0);
      const targetCx = cx + (mouse.active ? (mouse.x - cx) * 0.35 : 0);
      const targetCy = cy + (mouse.active ? (mouse.y - cy) * 0.35 : 0);

      this.stars.sort((a, b) => b.z - a.z);

      for (let i = 0; i < this.stars.length; i++) {
        const star = this.stars[i];
        star.pz = star.z;
        star.z -= speed;
        star.rot += star.rotSpeed;
        star.hue = (star.hue + 1.8) % 360;

        if (star.z <= 30) {
          Object.assign(star, this.createStar(false));
          continue;
        }

        const scale = fov / star.z;
        const sx = targetCx + star.x * scale;
        const sy = targetCy + star.y * scale;

        const prevScale = fov / star.pz;
        const psx = targetCx + star.x * prevScale;
        const psy = targetCy + star.y * prevScale;

        ctx.save();
        ctx.strokeStyle = star.isRainbow ? `hsla(${star.hue}, 100%, 70%, ${Math.min(0.8, scale * 1.2)})` : 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = Math.max(1, scale * 3);
        ctx.beginPath();
        ctx.moveTo(psx, psy);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        ctx.restore();

        const sprite = sprites[star.spriteIdx];
        const aspect = sprite.height / sprite.width;
        const boxW = Math.max(50, Math.min(width * 0.75, 180 * s * scale));
        const boxH = boxW * aspect;
        const alpha = Math.min(1, (1300 - star.z) / 300);

        drawSprite(ctx, star.spriteIdx, star.isRainbow, star.hue, sx, sy, boxW, boxH, star.rot, alpha, star.isRainbow ? 'lighter' : 'source-over');
      }
    }
  });

  modes.push({
    orbs: [],
    init() {
      this.orbs = [];
      const s = getScale();
      const count = Math.max(12, Math.min(26, Math.floor(width / (width < 600 ? 32 : 55))));
      for (let i = 0; i < count; i++) {
        const spriteIdx = i % sprites.length;
        const sprite = sprites[spriteIdx];
        const w = (110 + Math.random() * 60) * s;
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
        const force = 200 / dist;
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
      const colWidth = width < 600 ? Math.floor(width / 4) : 130;
      const count = Math.ceil(width / colWidth);
      for (let i = 0; i < count; i++) {
        this.columns.push({
          x: i * colWidth + colWidth / 2,
          y: Math.random() * -height,
          speed: 3 + Math.random() * 3.5,
          length: 3 + Math.floor(Math.random() * 2),
          hueOffset: i * 30,
          spriteIdx: i % sprites.length,
          isRainbow: i % 2 !== 0
        });
      }
    },
    onClick() {
      this.columns.forEach(c => { c.speed = 9 + Math.random() * 6; });
    },
    render(time) {
      ctx.fillStyle = 'rgba(2, 4, 8, 0.25)';
      ctx.fillRect(0, 0, width, height);

      const s = getScale();

      for (let c = 0; c < this.columns.length; c++) {
        const col = this.columns[c];
        col.y += col.speed;

        const sprite = sprites[col.spriteIdx];
        const aspect = sprite.height / sprite.width;
        const boxW = (width < 600 ? (width / 4.4) : 120) * s;
        const boxH = boxW * aspect;

        if (col.y - col.length * (boxH * 1.1) > height) {
          col.y = -boxH;
          col.speed = 3 + Math.random() * 3.5;
        }

        let offsetX = 0;
        if (mouse.active) {
          const dmx = col.x - mouse.x;
          const dmy = col.y - mouse.y;
          const dist = Math.hypot(dmx, dmy);
          if (dist < 140) {
            offsetX = (dmx / dist) * (140 - dist) * 0.7;
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
      const s = getScale();
      const count = Math.max(16, Math.min(32, Math.floor(width / (width < 600 ? 30 : 45))));
      for (let i = 0; i < count; i++) {
        this.nodes.push({
          x: (Math.random() - 0.5) * 10,
          y: (Math.random() - 0.5) * 10,
          z: 20 + (Math.random() - 0.5) * 10,
          spriteIdx: i % sprites.length,
          size: (95 + Math.random() * 35) * s,
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
      for (let i = 0; i < 40; i++) {
        this.stars.push({
          x: Math.random() * width,
          y: Math.random() * (height * 0.55),
          size: Math.random() * 2.5,
          alpha: Math.random()
        });
      }
      const s = getScale();
      const spread = width < 600 ? width * 0.32 : 280;
      this.monoliths = [
        { x: -spread, rot: 0, rotSpd: 0.012, spriteIdx: 1, w: 180 * s, isRainbow: true },
        { x: 0, rot: 0, rotSpd: -0.008, spriteIdx: 0, w: 230 * s, isRainbow: false },
        { x: spread, rot: 0, rotSpd: 0.01, spriteIdx: 1, w: 180 * s, isRainbow: true }
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

      const vCols = width < 600 ? 12 : 18;
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
        const bob = Math.sin(time * 0.0025 + idx * 2) * 24;
        const posY = horizon - 80 * getScale() + bob;
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
      const steps = width < 600 ? 16 : 22;
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

      const s = getScale();
      this.rot += 0.012;
      const radius = Math.min(width, height) * 0.32;
      const stepY = (height * 1.2) / this.nodes.length;
      const startY = -height * 0.1;

      const strandA = [];
      const strandB = [];

      for (let i = 0; i < this.nodes.length; i++) {
        const theta = (i * 0.34) + this.rot;
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
        const depthScale = 0.7 + (pt.z + 1) * 0.35;
        const baseW = 110 * s * depthScale;
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
      const s = getScale();

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
        const w = 220 * s * scale;
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
      const s = getScale();
      const count = width < 600 ? 5 : 7;
      for (let i = 0; i < count; i++) {
        const spriteIdx = i % sprites.length;
        const sprite = sprites[spriteIdx];
        const w = (150 + Math.random() * 70) * s;
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
      const s = getScale();
      const count = Math.max(16, Math.min(32, Math.floor(width / (width < 600 ? 30 : 45))));
      for (let i = 0; i < count; i++) {
        const spriteIdx = i % sprites.length;
        const sprite = sprites[spriteIdx];
        const w = (95 + Math.random() * 35) * s;
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
      const s = getScale();
      this.cols = width < 600 ? 4 : 5;
      this.rows = width < 600 ? 5 : 4;
      const stepX = width / (this.cols + 1);
      const stepY = height / (this.rows + 1);
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const origX = (c + 1) * stepX;
          const origY = (r + 1) * stepY;
          const spriteIdx = (r * this.cols + c) % sprites.length;
          const sprite = sprites[spriteIdx];
          const w = 105 * s;
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
          if (dist < 140) {
            const force = (140 - dist) * 0.1;
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
      const s = getScale();
      const numRings = width < 600 ? 3 : 4;
      for (let r = 1; r <= numRings; r++) {
        const radius = r * (95 * s);
        const count = r * 6;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 / count) * i;
          const spriteIdx = (r + i) % sprites.length;
          const sprite = sprites[spriteIdx];
          const w = (95 + r * 10) * s;
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
      const s = getScale();
      const count = width < 600 ? 7 : 10;
      for (let i = 0; i < count; i++) {
        const spriteIdx = i % sprites.length;
        const sprite = sprites[spriteIdx];
        const w = 150 * s;
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
      const numFrags = width < 600 ? 12 : 16;
      const s = getScale();
      for (let i = 0; i < numFrags; i++) {
        const angle = (Math.PI * 2 / numFrags) * i + (Math.random() - 0.5) * 0.3;
        const spd = 4 + Math.random() * 6;
        const spriteIdx = i % sprites.length;
        const sprite = sprites[spriteIdx];
        const w = (95 + Math.random() * 35) * s;
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

  modes.push({
    shards: [],
    burst: 0,
    init() {
      this.burst = 0;
      const count = width < 600 ? 9 : 14;
      this.shards = Array.from({ length: count }, (_, i) => ({
        lane: (i + 0.5) / count,
        depth: Math.random(),
        speed: 0.0025 + Math.random() * 0.002,
        side: i % 2 ? 1 : -1
      }));
    },
    onClick() { this.burst = 1; },
    render(time) {
      const horizon = height * 0.38;
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#02030a');
      bg.addColorStop(0.55, '#10101a');
      bg.addColorStop(1, '#030305');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      this.burst *= 0.94;
      const drift = mouse.active ? (mouse.x - cx) * 0.08 : 0;
      ctx.save();
      ctx.translate(drift, 0);
      ctx.lineWidth = 1;
      for (let i = -7; i <= 7; i++) {
        const hue = (time * 0.04 + i * 22 + 190) % 360;
        ctx.strokeStyle = `hsla(${hue}, 90%, 70%, 0.24)`;
        ctx.beginPath();
        ctx.moveTo(cx, horizon);
        ctx.lineTo(cx + i * width * 0.16, height);
        ctx.stroke();
      }
      for (let i = 0; i < 11; i++) {
        const p = i / 10;
        const y = horizon + Math.pow(p, 2.2) * (height - horizon);
        ctx.strokeStyle = `rgba(255,255,255,${0.04 + p * 0.18})`;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
      ctx.restore();

      this.shards.forEach((shard, i) => {
        shard.depth = (shard.depth + shard.speed * (1 + this.burst * 5)) % 1;
        const p = Math.pow(shard.depth, 1.8);
        const y = horizon + p * (height - horizon);
        const spread = (40 + p * width * 0.54) * shard.side;
        const x = cx + spread + Math.sin(time * 0.001 + i) * 18;
        const size = (30 + p * 150) * getScale();
        const hue = (185 + i * 17 + time * 0.05) % 360;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(shard.side * 0.45 + time * 0.0003);
        ctx.fillStyle = `hsla(${hue}, 90%, 58%, 0.12)`;
        ctx.strokeStyle = `hsla(${hue}, 100%, 76%, 0.75)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -size); ctx.lineTo(size * 0.48, size * 0.62);
        ctx.lineTo(-size * 0.32, size * 0.34); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      });

      const s = getScale() * (1 + this.burst * 0.22);
      const heroW = Math.min(width * 0.72, 340 * s);
      const heroH = heroW * (sprites[0].height / sprites[0].width);
      const glow = 0.88 + Math.sin(time * 0.003) * 0.1;
      drawSprite(ctx, 0, true, time * 0.08, cx, horizon + (height - horizon) * 0.34,
        heroW, heroH, Math.sin(time * 0.001) * 0.08, glow, 'lighter');
    }
  });

  modes.push({
    ripples: [],
    phase: 0,
    init() { this.ripples = []; this.phase = 0; },
    onClick(x, y) { this.ripples.push({ x, y, r: 5, life: 1 }); },
    render(time) {
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, '#001518');
      bg.addColorStop(0.5, '#05282b');
      bg.addColorStop(1, '#140918');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      this.phase += 0.018;

      const rows = width < 600 ? 9 : 13;
      const stepY = height / (rows + 1);
      const amp = Math.min(width * 0.11, 85);
      for (let row = 0; row < rows; row++) {
        const y0 = (row + 1) * stepY;
        const hue = 160 + row * 8;
        ctx.beginPath();
        for (let x = -20; x <= width + 20; x += 10) {
          const pointer = mouse.active ? Math.max(0, 1 - Math.hypot(x - mouse.x, y0 - mouse.y) / 220) : 0;
          const y = y0 + Math.sin(x * 0.018 + this.phase + row * 0.72) * (amp * 0.34 + pointer * amp);
          if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${hue}, 85%, 66%, ${0.18 + row / rows * 0.2})`;
        ctx.lineWidth = 1.2 + row / rows * 1.8;
        ctx.stroke();

        const px = ((time * (0.025 + row * 0.001) + row * 83) % (width + 220)) - 110;
        const py = y0 + Math.sin(px * 0.018 + this.phase + row * 0.72) * amp * 0.34;
        const spriteIdx = row % 2;
        const w = Math.min(width < 600 ? 104 : 142, stepY * 2.15);
        const h = w * (sprites[spriteIdx].height / sprites[spriteIdx].width);
        drawSprite(ctx, spriteIdx, row % 3 === 0, hue + time * 0.04, px, py, w, h,
          Math.cos(px * 0.018 + this.phase) * 0.35, 0.9, row % 3 === 0 ? 'lighter' : 'source-over');
      }

      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.r += 7; r.life -= 0.018;
        ctx.strokeStyle = `rgba(123,255,224,${r.life * 0.7})`;
        ctx.lineWidth = 1 + r.life * 5;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        if (r.life <= 0) this.ripples.splice(i, 1);
      }
    }
  });

  modes.push({
    angleX: 0,
    angleY: 0,
    kick: 0,
    init() { this.angleX = 0.45; this.angleY = 0; this.kick = 0; },
    onClick() { this.kick = 0.09; },
    render(time) {
      ctx.fillStyle = '#02070b';
      ctx.fillRect(0, 0, width, height);
      this.kick *= 0.95;
      this.angleY += 0.006 + this.kick;
      this.angleX = 0.45 + Math.sin(time * 0.0005) * 0.18 + (mouse.active ? (mouse.y - cy) / height * 0.35 : 0);
      const yaw = this.angleY + (mouse.active ? (mouse.x - cx) / width * 0.5 : 0);
      const unit = Math.min(width, height) * (width < 600 ? 0.29 : 0.34);
      const points = [];
      for (let xi = -1; xi <= 1; xi += 2) for (let yi = -1; yi <= 1; yi += 2) for (let zi = -1; zi <= 1; zi += 2) {
        let x = xi, y = yi, z = zi;
        const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
        const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
        const y1 = y * Math.cos(this.angleX) - z1 * Math.sin(this.angleX);
        const z2 = y * Math.sin(this.angleX) + z1 * Math.cos(this.angleX);
        const perspective = 3.8 / (4.5 + z2);
        points.push({ x: cx + x1 * unit * perspective, y: cy + y1 * unit * perspective, z: z2, xi, yi, zi });
      }
      const edge = (a, b) => Math.abs(a.xi - b.xi) + Math.abs(a.yi - b.yi) + Math.abs(a.zi - b.zi) === 2;
      for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) if (edge(points[i], points[j])) {
        const hue = (time * 0.04 + i * 33) % 360;
        ctx.strokeStyle = `hsla(${hue},85%,68%,0.42)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[j].x, points[j].y); ctx.stroke();
      }
      points.sort((a, b) => b.z - a.z).forEach((p, i) => {
        const spriteIdx = (p.xi + p.yi + p.zi + 3) % 2;
        const w = (58 + (p.z + 1.8) * 13) * getScale();
        const h = w * (sprites[spriteIdx].height / sprites[spriteIdx].width);
        drawSprite(ctx, spriteIdx, i % 3 === 0, time * 0.07 + i * 40, p.x, p.y, w, h,
          yaw * 0.25, 0.78 + (p.z + 1.5) * 0.06, i % 3 === 0 ? 'lighter' : 'source-over');
      });
      const ringR = unit * 1.12;
      ctx.strokeStyle = 'rgba(88,255,211,0.2)';
      ctx.lineWidth = 1;
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath(); ctx.ellipse(cx, cy, ringR * r / 3, ringR * 0.24 * r / 3, yaw, 0, Math.PI * 2); ctx.stroke();
      }
    }
  });

  modes.push({
    spin: 0,
    impact: 0,
    init() { this.spin = 0; this.impact = 0; },
    onClick() { this.impact = 1; },
    render(time) {
      ctx.fillStyle = 'rgba(7,4,8,0.32)';
      ctx.fillRect(0, 0, width, height);
      this.spin += 0.012 + this.impact * 0.03;
      this.impact *= 0.92;
      const maxR = Math.min(width, height) * 0.45;
      const rings = width < 600 ? 7 : 10;
      ctx.save(); ctx.translate(cx, cy);
      for (let r = rings; r >= 1; r--) {
        const radius = maxR * r / rings;
        const hue = (12 + r * 19 + time * 0.025) % 360;
        ctx.strokeStyle = `hsla(${hue},92%,64%,${0.1 + r / rings * 0.2})`;
        ctx.lineWidth = 1 + (r % 3);
        ctx.beginPath(); ctx.arc(0, 0, radius + Math.sin(time * 0.004 + r) * 4, 0, Math.PI * 2); ctx.stroke();
        const bars = width < 600 ? 24 : 36;
        for (let i = 0; i < bars; i++) {
          const a = i / bars * Math.PI * 2 + this.spin * (r % 2 ? 1 : -1);
          const energy = 5 + (Math.sin(i * 1.7 + time * 0.007 + r) + 1) * 8 + this.impact * 28;
          ctx.strokeStyle = `hsla(${hue + i * 2},95%,68%,0.55)`;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
          ctx.lineTo(Math.cos(a) * (radius + energy), Math.sin(a) * (radius + energy));
          ctx.stroke();
        }
      }
      ctx.restore();
      const orbit = maxR * 0.68;
      for (let i = 0; i < 6; i++) {
        const a = this.spin * (i % 2 ? -0.8 : 1) + i * Math.PI / 3;
        const spriteIdx = i % 2;
        const w = (width < 600 ? 78 : 112) * getScale();
        const h = w * (sprites[spriteIdx].height / sprites[spriteIdx].width);
        drawSprite(ctx, spriteIdx, i % 2 === 0, time * 0.06 + i * 50,
          cx + Math.cos(a) * orbit, cy + Math.sin(a) * orbit, w, h, a + Math.PI / 2, 0.92,
          i % 2 === 0 ? 'lighter' : 'source-over');
      }
      const centerW = Math.min(width * 0.42, 190 * getScale());
      drawSprite(ctx, 1, false, 0, cx, cy, centerW,
        centerW * (sprites[1].height / sprites[1].width), -this.spin * 0.45, 1, 'source-over');
    }
  });

  modes.push({
    panels: [],
    snap: 0,
    init() {
      this.snap = 0;
      const cols = width < 600 ? 2 : 4;
      const rows = width < 600 ? 4 : 3;
      this.panels = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        this.panels.push({ x, y, cols, rows, shift: 0, seed: Math.random() * 10 });
      }
    },
    onClick() { this.snap = 1; this.panels.forEach(p => { p.shift = (Math.random() - 0.5) * 70; }); },
    render(time) {
      ctx.fillStyle = '#f2f0e9';
      ctx.fillRect(0, 0, width, height);
      this.snap *= 0.9;
      this.panels.forEach((p, i) => {
        p.shift *= 0.88;
        const gap = width < 600 ? 7 : 10;
        const cellW = width / p.cols;
        const cellH = height / p.rows;
        const x = p.x * cellW + gap / 2 + p.shift;
        const y = p.y * cellH + gap / 2;
        const w = cellW - gap;
        const h = cellH - gap;
        const colors = ['#111111', '#ff244f', '#15b7a8', '#ffd21f', '#3155d9'];
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.fillStyle = colors[(i + Math.floor(time / 900)) % colors.length];
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.34)' : 'rgba(0,0,0,0.2)';
        const dot = width < 600 ? 8 : 10;
        for (let dy = y - dot; dy < y + h + dot; dy += dot) {
          for (let dx = x - dot; dx < x + w + dot; dx += dot) {
            const rr = 1 + Math.sin(dx * 0.04 + dy * 0.03 + time * 0.003 + p.seed) * 1.2;
            ctx.beginPath(); ctx.arc(dx, dy, Math.max(0.4, rr), 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((i % 2 ? -1 : 1) * (0.08 + this.snap * 0.15));
        const spriteIdx = i % 2;
        const imageW = Math.min(w * 1.25, h * 1.65);
        const imageH = imageW * (sprites[spriteIdx].height / sprites[spriteIdx].width);
        drawSprite(ctx, spriteIdx, i % 3 === 0, time * 0.12 + i * 47, 0, 0,
          imageW, imageH, 0, 0.95, i % 3 === 0 ? 'difference' : 'source-over');
        ctx.restore();
      });
      ctx.save();
      ctx.strokeStyle = '#111'; ctx.lineWidth = width < 600 ? 5 : 8;
      ctx.strokeRect(2, 2, width - 4, height - 4);
      ctx.restore();
    }
  });

  modes.push({
    twist: 0, kick: 0,
    init() { this.twist = 0; this.kick = 0; },
    onClick() { this.kick = Math.PI / 5; },
    render(time) {
      ctx.fillStyle = '#07050b'; ctx.fillRect(0, 0, width, height);
      this.twist += 0.004; this.kick *= 0.9;
      const slices = width < 600 ? 10 : 16;
      const radius = Math.hypot(width, height) * 0.55;
      ctx.save(); ctx.translate(cx, cy);
      for (let i = 0; i < slices; i++) {
        const a = i * Math.PI * 2 / slices + this.twist;
        ctx.save(); ctx.rotate(a); if (i % 2) ctx.scale(1, -1);
        const hue = (time * 0.025 + i * 360 / slices) % 360;
        ctx.fillStyle = `hsla(${hue},90%,54%,0.16)`;
        ctx.strokeStyle = `hsla(${hue + 35},100%,72%,0.55)`;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(radius * 0.18, radius * 0.08, radius * 0.5, radius * 0.22, radius, 0);
        ctx.bezierCurveTo(radius * 0.5, -radius * 0.22, radius * 0.18, -radius * 0.08, 0, 0);
        ctx.fill(); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
      const rings = width < 600 ? 2 : 3;
      for (let r = 1; r <= rings; r++) {
        const rr = Math.min(width, height) * (0.12 + r * 0.105);
        const count = r * 4 + 4;
        for (let i = 0; i < count; i++) {
          const a = i / count * Math.PI * 2 + this.twist * (r % 2 ? 2 : -1) + this.kick;
          const si = (i + r) % 2;
          const w = (width < 600 ? 54 : 72) * getScale();
          drawSprite(ctx, si, (i + r) % 3 === 0, time * 0.06 + i * 30,
            cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, w,
            w * (sprites[si].height / sprites[si].width), a + Math.PI / 2, 0.88,
            (i + r) % 3 === 0 ? 'lighter' : 'source-over');
        }
      }
    }
  });

  modes.push({
    pulse: 0,
    init() { this.pulse = 0; },
    onClick() { this.pulse = 1; },
    render(time) {
      ctx.fillStyle = '#07120d'; ctx.fillRect(0, 0, width, height);
      this.pulse *= 0.94;
      const step = width < 600 ? 28 : 34;
      const lines = Math.ceil(height / step) + 4;
      for (let j = -2; j < lines; j++) {
        const baseY = j * step;
        ctx.beginPath();
        for (let x = -10; x <= width + 10; x += 8) {
          const m = mouse.active ? Math.max(0, 1 - Math.hypot(x - mouse.x, baseY - mouse.y) / 230) : 0;
          const terrain = Math.sin(x * 0.012 + j * 0.8 + time * 0.0007) * 13 +
            Math.sin(x * 0.031 - time * 0.0011 + j) * 7;
          const y = baseY + terrain - m * (38 + this.pulse * 45);
          if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = j % 5 === 0 ? 'rgba(255,211,92,0.75)' : 'rgba(99,235,162,0.34)';
        ctx.lineWidth = j % 5 === 0 ? 1.8 : 1; ctx.stroke();
      }
      const count = width < 600 ? 5 : 8;
      for (let i = 0; i < count; i++) {
        const x = (i + 0.5) * width / count;
        const y = height * (0.18 + ((i * 37) % 64) / 100) + Math.sin(time * 0.0015 + i) * 18;
        const si = i % 2; const w = (width < 600 ? 78 : 108) * getScale();
        drawSprite(ctx, si, false, 0, x, y, w, w * (sprites[si].height / sprites[si].width),
          Math.sin(time * 0.001 + i) * 0.15, 0.95, 'source-over');
      }
    }
  });

  modes.push({
    balls: [], bumpers: [],
    init() {
      const count = width < 600 ? 4 : 7;
      this.balls = Array.from({ length: count }, (_, i) => ({ x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, si: i % 2, hue: i * 53 }));
      this.bumpers = Array.from({ length: width < 600 ? 6 : 10 }, (_, i) => ({
        x: width * (0.15 + Math.random() * 0.7), y: height * (0.12 + Math.random() * 0.72),
        r: (22 + Math.random() * 15) * getScale(), hue: i * 41 }));
    },
    onClick(x, y) { this.bumpers.push({ x, y, r: 34 * getScale(), hue: Math.random() * 360 }); if (this.bumpers.length > 12) this.bumpers.shift(); },
    render(time) {
      ctx.fillStyle = 'rgba(4,3,12,0.3)'; ctx.fillRect(0, 0, width, height);
      this.bumpers.forEach((b, i) => {
        const glow = 5 + Math.sin(time * 0.005 + i) * 3;
        ctx.strokeStyle = `hsla(${b.hue + time * 0.04},100%,64%,0.85)`; ctx.lineWidth = 3;
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = glow;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
      });
      this.balls.forEach((b) => {
        b.x += b.vx; b.y += b.vy;
        if (b.x < 35 || b.x > width - 35) b.vx *= -1;
        if (b.y < 35 || b.y > height - 35) b.vy *= -1;
        this.bumpers.forEach(q => {
          const dx = b.x - q.x, dy = b.y - q.y, d = Math.hypot(dx, dy);
          if (d < q.r + 28 && d > 0) { const dot = b.vx * dx / d + b.vy * dy / d; b.vx -= 2 * dot * dx / d; b.vy -= 2 * dot * dy / d; b.x += dx / d * 4; b.y += dy / d * 4; }
        });
        const si = b.si, w = (width < 600 ? 76 : 96) * getScale();
        drawSprite(ctx, si, true, b.hue + time * 0.1, b.x, b.y, w,
          w * (sprites[si].height / sprites[si].width), Math.atan2(b.vy, b.vx), 0.96, 'lighter');
      });
    }
  });

  modes.push({
    tiles: [], flipAll: 0,
    init() {
      const cols = width < 600 ? 3 : 6, rows = width < 600 ? 7 : 5;
      this.tiles = Array.from({ length: cols * rows }, (_, i) => ({ i, cols, rows, phase: Math.random() * Math.PI * 2, flip: 0 }));
    },
    onClick() { this.tiles.forEach((t, i) => { t.flip = 1 + i * 0.025; }); },
    render(time) {
      ctx.fillStyle = '#08090a'; ctx.fillRect(0, 0, width, height);
      this.tiles.forEach((t) => {
        t.flip = Math.max(0, t.flip - 0.035);
        const c = t.i % t.cols, r = Math.floor(t.i / t.cols);
        const cw = width / t.cols, ch = height / t.rows;
        const x = c * cw + 4, y = r * ch + 4, w = cw - 8, h = ch - 8;
        const auto = (Math.sin(time * 0.002 + t.phase) + 1) * 0.5;
        const squash = Math.max(0.08, Math.abs(Math.cos((auto + t.flip) * Math.PI)));
        ctx.fillStyle = (c + r) % 2 ? '#171a1b' : '#222628'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x, y + h / 2 - 1, w, 2);
        const si = (c + r + Math.floor(time / 1400)) % 2;
        const iw = Math.min(w * 0.86, h * 1.55), ih = iw * (sprites[si].height / sprites[si].width);
        ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(1, squash);
        drawSprite(ctx, si, t.i % 4 === 0, time * 0.06 + t.i * 19, 0, 0, iw, ih, 0, 0.94,
          t.i % 4 === 0 ? 'lighter' : 'source-over'); ctx.restore();
      });
    }
  });

  modes.push({
    flare: 0, stars: [],
    init() { this.flare = 0; this.stars = Array.from({ length: width < 600 ? 45 : 80 }, () => ({ x: Math.random() * width, y: Math.random() * height * 0.7, a: Math.random(), s: Math.random() * 1.8 })); },
    onClick() { this.flare = 1; },
    render(time) {
      ctx.fillStyle = '#01070d'; ctx.fillRect(0, 0, width, height); this.flare *= 0.96;
      this.stars.forEach(st => { ctx.fillStyle = `rgba(255,255,255,${st.a * 0.65})`; ctx.fillRect(st.x, st.y, st.s, st.s); });
      const bands = width < 600 ? 4 : 7;
      for (let b = 0; b < bands; b++) {
        const hue = 125 + b * 24 + Math.sin(time * 0.0004) * 18;
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, `hsla(${hue},90%,62%,0)`); grad.addColorStop(0.48, `hsla(${hue},90%,58%,${0.09 + this.flare * 0.05})`); grad.addColorStop(1, `hsla(${hue + 35},90%,48%,0)`);
        ctx.fillStyle = grad; ctx.beginPath();
        ctx.moveTo(-40, 0);
        for (let x = -40; x <= width + 40; x += 18) {
          const y = height * 0.28 + Math.sin(x * 0.009 + time * 0.0008 + b) * (55 + b * 9) + b * 14;
          ctx.lineTo(x, y);
        }
        for (let x = width + 40; x >= -40; x -= 18) {
          const y = height * 0.82 + Math.sin(x * 0.007 + time * 0.0006 + b + 2) * 70;
          ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill();
      }
      const count = width < 600 ? 4 : 7;
      for (let i = 0; i < count; i++) {
        const x = width * (i + 0.5) / count + Math.sin(time * 0.001 + i) * 24;
        const y = height * (0.48 + Math.sin(time * 0.0014 + i * 1.8) * 0.22);
        const si = i % 2, w = (width < 600 ? 82 : 114) * getScale();
        drawSprite(ctx, si, i % 2 === 0, 120 + time * 0.035 + i * 22, x, y, w,
          w * (sprites[si].height / sprites[si].width), Math.sin(time * 0.001 + i) * 0.2, 0.92, i % 2 === 0 ? 'lighter' : 'source-over');
      }
    }
  });

  modes.push({
    shock: 0,
    init() { this.shock = 0; },
    onClick() { this.shock = 1; },
    render(time) {
      ctx.fillStyle = 'rgba(0,8,4,0.34)'; ctx.fillRect(0, 0, width, height); this.shock *= 0.93;
      ctx.strokeStyle = 'rgba(90,255,145,0.08)'; ctx.lineWidth = 1;
      const grid = width < 600 ? 32 : 44;
      for (let x = 0; x < width; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
      for (let y = 0; y < height; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
      const waves = 4;
      for (let wv = 0; wv < waves; wv++) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 4) {
          const pointer = mouse.active ? Math.max(0, 1 - Math.abs(x - mouse.x) / 200) : 0;
          const y = height * (wv + 1) / (waves + 1) + Math.sin(x * (0.014 + wv * 0.004) + time * 0.004) * (18 + wv * 5 + pointer * 45 + this.shock * 60);
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = wv % 2 ? 'rgba(100,255,155,0.72)' : 'rgba(255,213,74,0.7)';
        ctx.lineWidth = 2; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 9; ctx.stroke(); ctx.shadowBlur = 0;
      }
      const scan = (time * 0.12) % height; ctx.fillStyle = 'rgba(180,255,195,0.07)'; ctx.fillRect(0, scan, width, 5);
      const count = width < 600 ? 4 : 7;
      for (let i = 0; i < count; i++) {
        const x = width * (i + 0.5) / count, y = height * (i % 2 ? 0.36 : 0.66) + Math.sin(time * 0.002 + i) * 25;
        const si = i % 2, iw = (width < 600 ? 74 : 104) * getScale();
        drawSprite(ctx, si, false, 0, x, y, iw, iw * (sprites[si].height / sprites[si].width), 0, 0.9, 'source-over');
      }
    }
  });

  modes.push({
    mass: 1,
    init() { this.mass = 1; },
    onClick() { this.mass = 1.8; },
    render(time) {
      ctx.fillStyle = '#020205'; ctx.fillRect(0, 0, width, height); this.mass += (1 - this.mass) * 0.035;
      const mx = cx + (mouse.active ? (mouse.x - cx) * 0.18 : 0), my = cy + (mouse.active ? (mouse.y - cy) * 0.18 : 0);
      const maxR = Math.min(width, height) * 0.46;
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2 + time * 0.00015;
        const r = maxR * (0.42 + (i % 7) / 10);
        ctx.strokeStyle = `hsla(${205 + i * 3},90%,70%,${0.08 + (i % 5) * 0.025})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(mx, my, r, a, a + 0.7 + Math.sin(time * 0.001 + i) * 0.2); ctx.stroke();
      }
      const coreR = Math.min(width, height) * 0.105 * this.mass;
      const halo = ctx.createRadialGradient(mx, my, coreR * 0.45, mx, my, coreR * 2.5);
      halo.addColorStop(0, '#000'); halo.addColorStop(0.42, '#000'); halo.addColorStop(0.55, 'rgba(255,185,80,0.8)'); halo.addColorStop(0.68, 'rgba(80,155,255,0.3)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, coreR * 2.5, 0, Math.PI * 2); ctx.fill();
      const count = width < 600 ? 7 : 11;
      for (let i = 0; i < count; i++) {
        const a = time * (0.00035 + i * 0.000025) + i * 2.4, r = coreR * (1.9 + i * 0.38);
        const si = i % 2, iw = Math.max(45, (88 - i * 2) * getScale());
        drawSprite(ctx, si, i % 3 === 0, 30 + i * 28 + time * 0.03, mx + Math.cos(a) * r, my + Math.sin(a) * r * 0.55,
          iw, iw * (sprites[si].height / sprites[si].width), a + Math.PI / 2, 0.78, i % 3 === 0 ? 'lighter' : 'source-over');
      }
    }
  });

  modes.push({
    trains: [],
    init() { this.trains = Array.from({ length: width < 600 ? 8 : 14 }, (_, i) => ({ line: i % 4, p: Math.random(), speed: 0.0015 + Math.random() * 0.002, si: i % 2 })); },
    onClick() { this.trains.forEach(t => { t.speed *= 1.8; }); },
    render(time) {
      ctx.fillStyle = '#f4f1e8'; ctx.fillRect(0, 0, width, height);
      const pad = width < 600 ? 34 : 70;
      const paths = [
        [[pad,height*.18],[width*.35,height*.18],[width*.62,height*.52],[width-pad,height*.52]],
        [[width*.18,pad],[width*.18,height*.62],[width*.48,height*.78],[width*.82,height-pad]],
        [[pad,height*.82],[width*.38,height*.57],[width*.68,height*.57],[width-pad,height*.25]],
        [[width*.08,height*.42],[width*.42,height*.42],[width*.64,height*.24],[width*.9,height*.72]]
      ];
      const colors = ['#e43d30','#1677b8','#00a56a','#f2aa00'];
      const pointAt = (path, p) => { const n = path.length - 1, pos = Math.min(n - 0.001, p * n), k = Math.floor(pos), q = pos - k; return { x: path[k][0] + (path[k+1][0]-path[k][0])*q, y: path[k][1] + (path[k+1][1]-path[k][1])*q }; };
      paths.forEach((path, li) => {
        ctx.strokeStyle = colors[li]; ctx.lineWidth = width < 600 ? 6 : 9; ctx.lineJoin = 'round'; ctx.beginPath();
        path.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
        path.forEach(p => { ctx.fillStyle = '#f4f1e8'; ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, Math.PI*2); ctx.fill(); ctx.stroke(); });
      });
      this.trains.forEach((t, i) => {
        t.p = (t.p + t.speed) % 1; t.speed += (0.002 - t.speed) * 0.004;
        const p = pointAt(paths[t.line], t.p), iw = (width < 600 ? 58 : 78) * getScale();
        drawSprite(ctx, t.si, false, 0, p.x, p.y, iw, iw * (sprites[t.si].height / sprites[t.si].width), 0, 0.96, 'source-over');
      });
    }
  });

  modes.push({
    offset: 0, boost: 0,
    init() { this.offset = 0; this.boost = 0; },
    onClick() { this.boost = 24; },
    render(time) {
      ctx.fillStyle = '#f5f5f2'; ctx.fillRect(0, 0, width, height);
      this.offset += 2.2 + this.boost; this.boost *= 0.88;
      let x = -(this.offset % 180);
      while (x < width + 180) {
        for (let i = 0; i < 18; i++) { const bw = 2 + ((i * 7) % 9); ctx.fillStyle = i % 5 === 0 ? '#ff3157' : '#111'; ctx.fillRect(x, 0, bw, height); x += bw + 3 + (i % 3); }
        x += 35;
      }
      ctx.fillStyle = 'rgba(245,245,242,0.86)'; ctx.fillRect(0, height * 0.3, width, height * 0.4);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.strokeRect(-2, height * 0.3, width + 4, height * 0.4);
      const count = width < 600 ? 3 : 6;
      for (let i = 0; i < count; i++) {
        const px = ((time * (0.035 + i * 0.002) + i * width / count) % (width + 160)) - 80;
        const py = height * (0.39 + (i % 2) * 0.2), si = i % 2, iw = (width < 600 ? 92 : 125) * getScale();
        drawSprite(ctx, si, i % 3 === 0, time * 0.1 + i * 30, px, py, iw, iw * (sprites[si].height / sprites[si].width), 0, 1, i % 3 === 0 ? 'difference' : 'source-over');
      }
    }
  });

  modes.push({
    bloom: 0,
    init() { this.bloom = 0; },
    onClick() { this.bloom = 1; },
    render(time) {
      ctx.fillStyle = '#09070b'; ctx.fillRect(0, 0, width, height); this.bloom *= 0.94;
      const cols = width < 600 ? 4 : 7, rows = width < 600 ? 7 : 5, cw = width / cols, ch = height / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = c*cw, y = r*ch, inset = 5, hue = (c*42 + r*27 + time*0.012) % 360;
        ctx.fillStyle = `hsla(${hue},78%,${35 + ((c+r)%3)*9}%,${0.72 + this.bloom*0.15})`;
        ctx.strokeStyle = '#171319'; ctx.lineWidth = width < 600 ? 6 : 8; ctx.beginPath();
        if ((c+r)%2) { ctx.moveTo(x+cw/2,y+inset); ctx.lineTo(x+cw-inset,y+ch/2); ctx.lineTo(x+cw/2,y+ch-inset); ctx.lineTo(x+inset,y+ch/2); }
        else { ctx.rect(x+inset,y+inset,cw-inset*2,ch-inset*2); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      const count = width < 600 ? 6 : 10;
      for (let i = 0; i < count; i++) {
        const angle = i/count*Math.PI*2 + time*0.00035, rr = Math.min(width,height)*(0.18 + (i%3)*0.08);
        const si=i%2, iw=(width<600?68:92)*getScale()*(1+this.bloom*0.18);
        drawSprite(ctx,si,true,time*0.05+i*36,cx+Math.cos(angle)*rr,cy+Math.sin(angle)*rr,iw,iw*(sprites[si].height/sprites[si].width),angle,0.9,'lighter');
      }
      const iw=Math.min(width*.38,170*getScale()); drawSprite(ctx,0,false,0,cx,cy,iw,iw*(sprites[0].height/sprites[0].width),0,1,'source-over');
    }
  });


  modes.push({
    pills: [], shockwaves: [],
    init() {
      const s = getScale();
      const count = width < 600 ? 8 : 14;
      this.pills = Array.from({ length: count }, (_, i) => ({
        a: (i / count) * Math.PI * 2,
        r: (120 + i * 22) * s,
        speed: (0.018 - i * 0.0008) * (i % 2 === 0 ? 1 : -1),
        si: i % 2,
        tilt: 0.35 + (i % 3) * 0.15,
        isRainbow: i % 2 === 1,
        hue: (i * 45) % 360,
        trail: []
      }));
      this.shockwaves = [];
    },
    onClick() {
      this.shockwaves.push({ r: 10, maxR: Math.max(width, height) * 0.7, alpha: 1, hue: Math.random() * 360 });
      this.pills.forEach(p => { p.speed *= 2.2; });
    },
    render(time) {
      ctx.fillStyle = '#020108'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      const jHue = (time * 0.08) % 360;
      const jetGrad = ctx.createLinearGradient(cx, 0, cx, height);
      jetGrad.addColorStop(0, `hsla(${jHue}, 100%, 75%, 0.8)`);
      jetGrad.addColorStop(0.4, `hsla(${(jHue + 60) % 360}, 100%, 60%, 0.2)`);
      jetGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
      jetGrad.addColorStop(0.6, `hsla(${(jHue + 120) % 360}, 100%, 60%, 0.2)`);
      jetGrad.addColorStop(1, `hsla(${(jHue + 180) % 360}, 100%, 75%, 0.8)`);
      ctx.save();
      ctx.fillStyle = jetGrad;
      const jw = (20 + Math.sin(time * 0.008) * 8) * s;
      ctx.beginPath();
      ctx.moveTo(cx - jw, 0); ctx.lineTo(cx + jw, 0); ctx.lineTo(cx + 2, cy); ctx.lineTo(cx - 2, cy);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy); ctx.lineTo(cx + 2, cy);
      ctx.lineTo(cx + jw, height); ctx.lineTo(cx - jw, height);
      ctx.closePath(); ctx.fill();
      for (let r = 1; r <= 4; r++) {
        const rad = (80 + r * 55) * s;
        ctx.strokeStyle = `hsla(${(jHue + r * 50) % 360}, 90%, 65%, 0.35)`;
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rad, rad * 0.38, 0.25, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.r += (sw.maxR - sw.r) * 0.08 + 2;
        sw.alpha -= 0.02;
        if (sw.alpha <= 0) { this.shockwaves.splice(i, 1); continue; }
        ctx.strokeStyle = `hsla(${sw.hue}, 100%, 70%, ${sw.alpha})`;
        ctx.lineWidth = 4 * s;
        ctx.beginPath();
        ctx.ellipse(cx, cy, sw.r, sw.r * 0.38, 0.25, 0, Math.PI * 2);
        ctx.stroke();
      }
      this.pills.forEach(p => {
        p.a += p.speed;
        p.speed += ((p.si === 0 ? 0.012 : -0.012) - p.speed) * 0.02;
        p.hue = (p.hue + 1.5) % 360;
        const px = cx + Math.cos(p.a) * p.r;
        const py = cy + Math.sin(p.a) * p.r * p.tilt;
        const depth = Math.sin(p.a);
        const scale = (0.75 + depth * 0.35) * s;
        const pw = (width < 600 ? 55 : 85) * scale;
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        const dopplerHue = (p.hue + (depth > 0 ? 30 : -30) + 360) % 360;
        p.trail.push({ x: px, y: py, h: dopplerHue, rot: p.a, w: pw, ph: ph });
        if (p.trail.length > 5) p.trail.shift();
        for (let t = 0; t < p.trail.length - 1; t++) {
          const tr = p.trail[t];
          drawSprite(ctx, p.si, true, tr.h, tr.x, tr.y, tr.w * 0.85, tr.ph * 0.85, tr.rot, (t / p.trail.length) * 0.3, 'lighter');
        }
        drawSprite(ctx, p.si, p.isRainbow, dopplerHue, px, py, pw, ph, p.a + Math.PI / 2, 0.95, p.isRainbow ? 'lighter' : 'source-over');
      });
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, 38 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `hsla(${jHue}, 100%, 75%, 0.9)`; ctx.lineWidth = 3 * s; ctx.stroke();
      ctx.restore();
    }
  });

  modes.push({
    coreAngle: 0, rods: [], arcs: [], burst: 0,
    init() {
      const s = getScale();
      const count = width < 600 ? 6 : 10;
      this.rods = Array.from({ length: count }, (_, i) => ({
        ang: (i / count) * Math.PI * 2,
        dist: (140 + (i % 2) * 50) * s,
        rot: 0,
        si: i % 2,
        isRainbow: true,
        hue: (i * 36) % 360
      }));
      this.arcs = [];
      this.burst = 0;
    },
    onClick() { this.burst = 1; },
    render(time) {
      ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      this.coreAngle += 0.015;
      this.burst *= 0.92;
      ctx.save();
      for (let ring = 1; ring <= 3; ring++) {
        const rad = (70 + ring * 55) * s * (1 + this.burst * 0.2);
        const sides = 6;
        ctx.strokeStyle = `hsla(${(time * 0.05 + ring * 60) % 360}, 90%, 65%, ${0.35 + this.burst * 0.4})`;
        ctx.lineWidth = 2.5 * s;
        ctx.beginPath();
        for (let j = 0; j <= sides; j++) {
          const a = (j / sides) * Math.PI * 2 + (ring % 2 === 0 ? this.coreAngle : -this.coreAngle * 1.3);
          const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      this.rods.forEach((r, idx) => {
        r.ang += 0.012 * (idx % 2 === 0 ? 1 : -1);
        r.rot += 0.03;
        r.hue = (r.hue + 1.2) % 360;
        const rx = cx + Math.cos(r.ang) * r.dist * (1 + this.burst * 0.35);
        const ry = cy + Math.sin(r.ang) * r.dist * (1 + this.burst * 0.35);
        const rw = (width < 600 ? 58 : 80) * s;
        const rh = rw * (sprites[r.si].height / sprites[r.si].width);
        drawSprite(ctx, r.si, r.isRainbow, r.hue, rx, ry, rw, rh, r.rot, 0.95, 'lighter');
        if (Math.random() < 0.25 || this.burst > 0.2) {
          ctx.strokeStyle = `hsla(${r.hue}, 100%, 75%, 0.85)`;
          ctx.lineWidth = (1.5 + Math.random() * 2) * s;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          const segs = 5;
          for (let k = 1; k <= segs; k++) {
            const t = k / segs;
            const tx = cx + (rx - cx) * t + (Math.random() - 0.5) * 35 * s;
            const ty = cy + (ry - cy) * t + (Math.random() - 0.5) * 35 * s;
            ctx.lineTo(tx, ty);
          }
          ctx.stroke();
        }
      });
      const coreR = (32 + Math.sin(time * 0.01) * 8 + this.burst * 35) * s;
      const cGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreR * 1.8);
      cGrad.addColorStop(0, '#ffffff');
      cGrad.addColorStop(0.3, `hsla(${(time * 0.1) % 360}, 100%, 65%, 0.9)`);
      cGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath(); ctx.arc(cx, cy, coreR * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  });

  modes.push({
    pills: [], streamlines: [],
    init() {
      const s = getScale();
      const count = width < 600 ? 7 : 12;
      this.pills = Array.from({ length: count }, (_, i) => ({
        x: cx + (Math.random() - 0.5) * width * 0.7,
        y: cy + (Math.random() - 0.5) * height * 0.7,
        vx: 0, vy: 0, ang: 0,
        si: i % 2,
        isRainbow: i % 3 !== 0,
        hue: (i * 40) % 360,
        trail: []
      }));
      this.streamlines = Array.from({ length: width < 600 ? 30 : 60 }, () => ({
        x: Math.random() * width, y: Math.random() * height,
        life: Math.random() * 100, maxLife: 60 + Math.random() * 60,
        hue: Math.random() * 360
      }));
    },
    onClick(x, y) {
      this.pills.forEach(p => {
        const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
        p.vx += (dx / d) * 14; p.vy += (dy / d) * 14;
      });
    },
    render(time) {
      ctx.fillStyle = 'rgba(4, 8, 16, 0.28)'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      const v1x = cx + Math.cos(time * 0.0012) * width * 0.22;
      const v1y = cy + Math.sin(time * 0.0016) * height * 0.22;
      const v2x = cx + Math.cos(time * 0.0014 + Math.PI) * width * 0.22;
      const v2y = cy + Math.sin(time * 0.0011 + Math.PI) * height * 0.22;
      function getVelocity(px, py) {
        let vx = 0, vy = 0;
        const dx1 = px - v1x, dy1 = py - v1y, d1sq = dx1 * dx1 + dy1 * dy1 + 400;
        vx += -dy1 / d1sq * 1800; vy += dx1 / d1sq * 1800;
        const dx2 = px - v2x, dy2 = py - v2y, d2sq = dx2 * dx2 + dy2 * dy2 + 400;
        vx += dy2 / d2sq * 1800; vy += -dx2 / d2sq * 1800;
        if (mouse.active) {
          const dmx = px - mouse.x, dmy = py - mouse.y, dmsq = dmx * dmx + dmy * dmy + 600;
          vx += -dmy / dmsq * 2500; vy += dmx / dmsq * 2500;
        }
        return { vx, vy };
      }
      ctx.save();
      this.streamlines.forEach(sl => {
        const v = getVelocity(sl.x, sl.y);
        const nx = sl.x + v.vx * 0.6, ny = sl.y + v.vy * 0.6;
        ctx.strokeStyle = `hsla(${sl.hue}, 90%, 65%, ${Math.sin(sl.life / sl.maxLife * Math.PI) * 0.45})`;
        ctx.lineWidth = 1.8 * s;
        ctx.beginPath(); ctx.moveTo(sl.x, sl.y); ctx.lineTo(nx, ny); ctx.stroke();
        sl.x = nx; sl.y = ny; sl.life++;
        if (sl.life >= sl.maxLife || sl.x < 0 || sl.x > width || sl.y < 0 || sl.y > height) {
          sl.x = Math.random() * width; sl.y = Math.random() * height;
          sl.life = 0; sl.hue = (time * 0.05 + Math.random() * 60) % 360;
        }
      });
      this.pills.forEach(p => {
        const v = getVelocity(p.x, p.y);
        p.vx = p.vx * 0.9 + v.vx * 0.12;
        p.vy = p.vy * 0.9 + v.vy * 0.12;
        p.x += p.vx; p.y += p.vy;
        p.ang = Math.atan2(p.vy, p.vx);
        p.hue = (p.hue + 1.6) % 360;
        if (p.x < -60) p.x = width + 50; if (p.x > width + 60) p.x = -50;
        if (p.y < -60) p.y = height + 50; if (p.y > height + 60) p.y = -50;
        p.trail.push({ x: p.x, y: p.y, ang: p.ang, h: p.hue });
        if (p.trail.length > 6) p.trail.shift();
        const pw = (width < 600 ? 56 : 82) * s;
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        for (let t = 0; t < p.trail.length - 1; t++) {
          const tr = p.trail[t];
          drawSprite(ctx, p.si, true, tr.h, tr.x, tr.y, pw * 0.8, ph * 0.8, tr.ang, (t / p.trail.length) * 0.28, 'lighter');
        }
        drawSprite(ctx, p.si, p.isRainbow, p.hue, p.x, p.y, pw, ph, p.ang, 0.95, p.isRainbow ? 'lighter' : 'source-over');
      });
      ctx.restore();
    }
  });

  modes.push({
    burst: 0,
    init() { this.burst = 0; },
    onClick() { this.burst = 1; },
    render(time) {
      ctx.fillStyle = '#030206'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      this.burst *= 0.93;
      const count = width < 600 ? 36 : 64;
      const phi = 137.5077 * (Math.PI / 180);
      const baseSpacing = (width < 600 ? 18 : 28) * s * (1 + Math.sin(time * 0.0015) * 0.18 + this.burst * 0.5);
      const rot = time * 0.0004;
      ctx.save();
      for (let i = count - 1; i >= 0; i--) {
        const theta = i * phi + rot;
        const r = Math.sqrt(i) * baseSpacing;
        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r;
        const si = i % 2;
        const isRainbow = i % 2 === 0;
        const hue = (i * 9 + time * 0.08) % 360;
        const pScale = (0.45 + (1 - i / count) * 0.6) * s * (1 + this.burst * 0.25);
        const pw = (width < 600 ? 52 : 74) * pScale;
        const ph = pw * (sprites[si].height / sprites[si].width);
        drawSprite(ctx, si, isRainbow, hue, px, py, pw, ph, theta + Math.PI / 2, 0.88, 'lighter');
      }
      const centerR = (30 + Math.sin(time * 0.005) * 8) * s;
      const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, centerR * 2);
      cGrad.addColorStop(0, `hsla(${(time * 0.1) % 360}, 100%, 75%, 0.95)`);
      cGrad.addColorStop(0.5, `hsla(${(time * 0.1 + 60) % 360}, 100%, 60%, 0.4)`);
      cGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath(); ctx.arc(cx, cy, centerR * 2, 0, Math.PI * 2); ctx.fill();
      drawSprite(ctx, 0, false, 0, cx, cy, 75 * s, 75 * s * (sprites[0].height / sprites[0].width), -rot * 2, 1, 'source-over');
      ctx.restore();
    }
  });

  modes.push({
    pills: [], f1: 3, f2: 4, f3: 5,
    init() {
      const s = getScale();
      const count = width < 600 ? 5 : 9;
      this.pills = Array.from({ length: count }, (_, i) => ({
        tOffset: (i / count) * Math.PI * 2,
        si: i % 2,
        isRainbow: i % 2 === 1,
        hue: (i * 40) % 360
      }));
    },
    onClick() {
      this.f1 = 2 + Math.floor(Math.random() * 4);
      this.f2 = 3 + Math.floor(Math.random() * 4);
      this.f3 = 4 + Math.floor(Math.random() * 3);
    },
    render(time) {
      ctx.fillStyle = 'rgba(2, 4, 10, 0.22)'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      const R = Math.min(width, height) * 0.42;
      const t = time * 0.001;
      ctx.save();
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      const steps = 300;
      for (let i = 0; i <= steps; i++) {
        const u = (i / steps) * Math.PI * 2;
        const x = cx + (Math.sin(u * this.f1 + t) * 0.55 + Math.sin(u * this.f2 + t * 0.7) * 0.45) * R;
        const y = cy + (Math.cos(u * this.f2 + t * 0.8) * 0.55 + Math.cos(u * this.f3 + t * 1.1) * 0.45) * R;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${(time * 0.06) % 360}, 95%, 65%, 0.45)`;
      ctx.stroke();
      this.pills.forEach((p, idx) => {
        const u = t * 1.5 + p.tOffset;
        const x = cx + (Math.sin(u * this.f1 + t) * 0.55 + Math.sin(u * this.f2 + t * 0.7) * 0.45) * R;
        const y = cy + (Math.cos(u * this.f2 + t * 0.8) * 0.55 + Math.cos(u * this.f3 + t * 1.1) * 0.45) * R;
        const u2 = u + 0.05;
        const x2 = cx + (Math.sin(u2 * this.f1 + t) * 0.55 + Math.sin(u2 * this.f2 + t * 0.7) * 0.45) * R;
        const y2 = cy + (Math.cos(u2 * this.f2 + t * 0.8) * 0.55 + Math.cos(u2 * this.f3 + t * 1.1) * 0.45) * R;
        const ang = Math.atan2(y2 - y, x2 - x);
        const pw = (width < 600 ? 58 : 84) * s;
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        p.hue = (p.hue + 1.8) % 360;
        ctx.strokeStyle = `hsla(${p.hue}, 100%, 75%, 0.6)`;
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(x - 30 * s, y); ctx.lineTo(x + 30 * s, y);
        ctx.moveTo(x, y - 30 * s); ctx.lineTo(x, y + 30 * s);
        ctx.stroke();
        drawSprite(ctx, p.si, p.isRainbow, p.hue, x, y, pw, ph, ang, 0.95, p.isRainbow ? 'lighter' : 'source-over');
      });
      ctx.restore();
    }
  });

  modes.push({
    cols: 0, rows: 0, grid: [], pills: [],
    init() {
      const s = getScale();
      this.cols = width < 600 ? 8 : 14;
      this.rows = width < 600 ? 12 : 10;
      this.grid = Array.from({ length: this.cols * this.rows }, () => ({ z: 0, vz: 0 }));
      const pCount = width < 600 ? 6 : 12;
      this.pills = Array.from({ length: pCount }, (_, i) => ({
        c: 1 + Math.floor(Math.random() * (this.cols - 2)),
        r: 1 + Math.floor(Math.random() * (this.rows - 2)),
        si: i % 2,
        isRainbow: true,
        hue: (i * 30) % 360
      }));
    },
    onClick(x, y) {
      const col = Math.floor((x / width) * this.cols);
      const row = Math.floor((y / height) * this.rows);
      if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
        this.grid[row * this.cols + col].vz = 25;
      }
    },
    render(time) {
      ctx.fillStyle = '#05040a'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      const cw = width / (this.cols - 1), ch = height / (this.rows - 1);
      if (mouse.active) {
        const mc = Math.floor((mouse.x / width) * this.cols);
        const mr = Math.floor((mouse.y / height) * this.rows);
        if (mc >= 0 && mc < this.cols && mr >= 0 && mr < this.rows) {
          this.grid[mr * this.cols + mc].vz += 3;
        }
      }
      for (let r = 1; r < this.rows - 1; r++) {
        for (let c = 1; c < this.cols - 1; c++) {
          const idx = r * this.cols + c;
          const force = (
            this.grid[idx - 1].z + this.grid[idx + 1].z +
            this.grid[idx - this.cols].z + this.grid[idx + this.cols].z
          ) * 0.25 - this.grid[idx].z;
          this.grid[idx].vz += force * 0.35;
          this.grid[idx].vz *= 0.92;
          this.grid[idx].z += this.grid[idx].vz;
        }
      }
      ctx.save();
      for (let r = 0; r < this.rows; r++) {
        ctx.beginPath();
        for (let c = 0; c < this.cols; c++) {
          const idx = r * this.cols + c;
          const px = c * cw, py = r * ch + this.grid[idx].z * 1.5;
          if (c === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        const gHue = (time * 0.05 + r * 15) % 360;
        ctx.strokeStyle = `hsla(${gHue}, 85%, 60%, 0.4)`;
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();
      }
      for (let c = 0; c < this.cols; c++) {
        ctx.beginPath();
        for (let r = 0; r < this.rows; r++) {
          const idx = r * this.cols + c;
          const px = c * cw, py = r * ch + this.grid[idx].z * 1.5;
          if (r === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        const gHue = (time * 0.05 + c * 15) % 360;
        ctx.strokeStyle = `hsla(${gHue}, 85%, 60%, 0.4)`;
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();
      }
      this.pills.forEach(p => {
        const idx = p.r * this.cols + p.c;
        const node = this.grid[idx];
        const px = p.c * cw, py = p.r * ch + node.z * 1.5;
        p.hue = (p.hue + 1.4) % 360;
        const pw = (width < 600 ? 54 : 78) * s * (1 + Math.abs(node.z) * 0.02);
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        drawSprite(ctx, p.si, p.isRainbow, p.hue, px, py, pw, ph, node.z * 0.04, 0.95, 'lighter');
      });
      ctx.restore();
    }
  });

  modes.push({
    cars: [], buildings: [], boost: 0,
    init() {
      const s = getScale();
      const count = width < 600 ? 5 : 8;
      this.cars = Array.from({ length: count }, (_, i) => ({
        lane: (i % 4) - 1.5,
        z: (i / count) * 800,
        speed: 4 + Math.random() * 3,
        si: i % 2,
        isRainbow: i % 2 === 1,
        hue: (i * 45) % 360
      }));
      this.buildings = Array.from({ length: 16 }, (_, i) => ({
        side: i % 2 === 0 ? -1 : 1,
        z: (i / 16) * 1200,
        w: 60 + Math.random() * 80,
        h: 150 + Math.random() * 250,
        hue: (i * 22) % 360
      }));
      this.boost = 0;
    },
    onClick() { this.boost = 25; },
    render(time) {
      ctx.fillStyle = '#060112'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      this.boost *= 0.92;
      const horizon = height * 0.45;
      const fov = 350;
      const sunR = Math.min(width, height) * 0.22;
      const sGrad = ctx.createLinearGradient(cx, horizon - sunR, cx, horizon);
      sGrad.addColorStop(0, '#ffe600'); sGrad.addColorStop(0.5, '#ff007f'); sGrad.addColorStop(1, '#9900ff');
      ctx.save();
      ctx.fillStyle = sGrad; ctx.beginPath(); ctx.arc(cx, horizon, sunR, Math.PI, 0); ctx.fill();
      for (let sl = 1; sl <= 6; sl++) {
        const sy = horizon - (sl / 7) * sunR;
        ctx.fillStyle = '#060112'; ctx.fillRect(cx - sunR, sy, sunR * 2, (sl * 1.8) * s);
      }
      ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 1.5 * s;
      const lanes = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
      lanes.forEach(l => {
        ctx.beginPath(); ctx.moveTo(cx + l * 40 * s, horizon);
        ctx.lineTo(cx + l * width * 0.6, height); ctx.stroke();
      });
      const gz = (time * (0.3 + this.boost * 0.05)) % 60;
      for (let z = 600; z > 30; z -= 30) {
        const realZ = z - gz; if (realZ <= 0) continue;
        const y = horizon + (fov / realZ) * (height * 0.4);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y);
        ctx.strokeStyle = `hsla(${(time * 0.04 + z) % 360}, 80%, 60%, ${Math.min(1, 400 / realZ) * 0.45})`;
        ctx.stroke();
      }
      this.buildings.forEach(b => {
        b.z -= 4 + this.boost * 0.4; if (b.z < 20) b.z += 1200;
        const scale = fov / b.z;
        const bx = cx + b.side * (width * 0.4 + b.w * scale * 0.5);
        const by = horizon;
        const bw = b.w * scale, bh = b.h * scale;
        ctx.strokeStyle = `hsla(${b.hue}, 80%, 65%, ${Math.min(1, 500 / b.z) * 0.6})`;
        ctx.lineWidth = 1.5 * s;
        ctx.strokeRect(bx - bw / 2, by - bh, bw, bh);
      });
      this.cars.sort((a, b) => b.z - a.z);
      this.cars.forEach(c => {
        c.z -= c.speed + this.boost * 0.3; if (c.z < 30) c.z += 800;
        const scale = fov / c.z;
        const px = cx + c.lane * (85 * scale) * s;
        const py = horizon + (fov / c.z) * (height * 0.38);
        const pw = (width < 600 ? 60 : 90) * scale * s;
        const ph = pw * (sprites[c.si].height / sprites[c.si].width);
        c.hue = (c.hue + 1.8) % 360;
        drawSprite(ctx, c.si, c.isRainbow, c.hue, px, py, pw, ph, 0, Math.min(1, 600 / c.z), c.isRainbow ? 'lighter' : 'source-over');
      });
      ctx.restore();
    }
  });

  modes.push({
    shards: [], pills: [], riftPhase: 0,
    init() {
      const s = getScale();
      const count = width < 600 ? 7 : 12;
      this.pills = Array.from({ length: count }, (_, i) => ({
        z: Math.random() * 600 + 50,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.08,
        si: i % 2,
        isRainbow: true,
        hue: (i * 35) % 360
      }));
      this.shards = [];
    },
    onClick(x, y) {
      const s = getScale();
      for (let i = 0; i < 20; i++) {
        const ang = Math.random() * Math.PI * 2, spd = 3 + Math.random() * 8;
        this.shards.push({
          x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.2,
          size: (10 + Math.random() * 20) * s, alpha: 1, hue: Math.random() * 360
        });
      }
    },
    render(time) {
      ctx.fillStyle = '#040108'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      this.riftPhase += 0.025;
      ctx.save();
      ctx.beginPath();
      const riftH = height * 0.45;
      const points = 14;
      for (let i = 0; i <= points; i++) {
        const t = i / points;
        const ry = cy - riftH / 2 + t * riftH;
        const rx = cx + Math.sin(t * 12 + this.riftPhase) * 22 * s + ((i % 2 === 0 ? 1 : -1) * 12 * s);
        if (i === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
      }
      ctx.strokeStyle = `hsla(${(time * 0.1) % 360}, 100%, 75%, 0.9)`;
      ctx.lineWidth = 4 * s; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5 * s; ctx.stroke();
      for (let i = this.shards.length - 1; i >= 0; i--) {
        const sh = this.shards[i];
        sh.x += sh.vx; sh.y += sh.vy; sh.rot += sh.rotV; sh.alpha -= 0.02;
        if (sh.alpha <= 0) { this.shards.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = sh.alpha;
        ctx.fillStyle = `hsla(${sh.hue}, 95%, 65%, 0.7)`;
        ctx.translate(sh.x, sh.y); ctx.rotate(sh.rot);
        ctx.beginPath();
        ctx.moveTo(-sh.size / 2, -sh.size / 2); ctx.lineTo(sh.size / 2, 0); ctx.lineTo(0, sh.size / 2);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      this.pills.forEach(p => {
        p.z -= 5;
        p.rot += p.rotV;
        p.hue = (p.hue + 1.8) % 360;
        if (p.z <= 20) {
          p.z = 600;
          p.vx = (Math.random() - 0.5) * 6;
          p.vy = (Math.random() - 0.5) * 6;
        }
        const fov = 260;
        const scale = fov / p.z;
        const px = cx + p.vx * (600 - p.z) * 0.35 * s;
        const py = cy + p.vy * (600 - p.z) * 0.35 * s;
        const pw = (width < 600 ? 55 : 85) * scale * s;
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        drawSprite(ctx, p.si, p.isRainbow, p.hue, px, py, pw, ph, p.rot, Math.min(1, scale), 'lighter');
      });
      ctx.restore();
    }
  });

  modes.push({
    coils: [], pills: [], discharge: 0,
    init() {
      const s = getScale();
      this.coils = [
        { x: 40 * s, y: 40 * s }, { x: width - 40 * s, y: 40 * s },
        { x: 40 * s, y: height - 40 * s }, { x: width - 40 * s, y: height - 40 * s }
      ];
      const count = width < 600 ? 6 : 10;
      this.pills = Array.from({ length: count }, (_, i) => ({
        x: cx + (Math.random() - 0.5) * width * 0.6,
        y: cy + (Math.random() - 0.5) * height * 0.6,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        si: i % 2,
        isRainbow: true,
        hue: (i * 36) % 360,
        charge: 0
      }));
      this.discharge = 0;
    },
    onClick() { this.discharge = 1; },
    render(time) {
      ctx.fillStyle = '#03050c'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      this.discharge *= 0.92;
      this.coils = [
        { x: 50 * s, y: 50 * s }, { x: width - 50 * s, y: 50 * s },
        { x: 50 * s, y: height - 50 * s }, { x: width - 50 * s, y: height - 50 * s }
      ];
      function drawLightning(x1, y1, x2, y2, hue, widthScale) {
        ctx.strokeStyle = `hsla(${hue}, 100%, 75%, 0.85)`;
        ctx.lineWidth = widthScale;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const d = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(4, Math.floor(d / (35 * s)));
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const mx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 45 * s;
          const my = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 45 * s;
          ctx.lineTo(mx, my);
        }
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.save();
      this.coils.forEach((c, idx) => {
        const cGrad = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 35 * s);
        cGrad.addColorStop(0, '#ffffff');
        cGrad.addColorStop(0.4, `hsla(${(time * 0.1 + idx * 90) % 360}, 100%, 65%, 0.8)`);
        cGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cGrad;
        ctx.beginPath(); ctx.arc(c.x, c.y, 35 * s, 0, Math.PI * 2); ctx.fill();
        if (Math.random() < 0.4 || this.discharge > 0.2) {
          const target = this.pills[Math.floor(Math.random() * this.pills.length)];
          if (target) {
            drawLightning(c.x, c.y, target.x, target.y, (time * 0.1) % 360, (2 + Math.random() * 2) * s);
            target.charge = 1;
          }
        }
      });
      this.pills.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        p.charge *= 0.94;
        p.hue = (p.hue + 1.6) % 360;
        if (p.x < 60) { p.x = 60; p.vx *= -1; } if (p.x > width - 60) { p.x = width - 60; p.vx *= -1; }
        if (p.y < 60) { p.y = 60; p.vy *= -1; } if (p.y > height - 60) { p.y = height - 60; p.vy *= -1; }
        const pw = (width < 600 ? 58 : 82) * s * (1 + p.charge * 0.25);
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        drawSprite(ctx, p.si, p.isRainbow, p.hue, p.x, p.y, pw, ph, 0, 0.95, 'lighter');
        for (let j = i + 1; j < this.pills.length; j++) {
          const p2 = this.pills[j];
          const dist = Math.hypot(p2.x - p.x, p2.y - p.y);
          if (dist < 180 * s && (Math.random() < 0.18 || this.discharge > 0.3)) {
            drawLightning(p.x, p.y, p2.x, p2.y, p.hue, (1.5 + Math.random()) * s);
          }
        }
      });
      ctx.restore();
    }
  });

  modes.push({
    gears: [], pills: [], rotSpeed: 1,
    init() {
      const s = getScale();
      this.gears = [
        { r: 70 * s, teeth: 12, ratio: 1, color: '#ffd700' },
        { r: 130 * s, teeth: 20, ratio: -0.6, color: '#00f0ff' },
        { r: 210 * s, teeth: 32, ratio: 0.375, color: '#ff007f' },
        { r: 310 * s, teeth: 48, ratio: -0.25, color: '#00ff66' }
      ];
      const count = width < 600 ? 6 : 10;
      this.pills = Array.from({ length: count }, (_, i) => ({
        gIdx: i % this.gears.length,
        angOffset: (i / count) * Math.PI * 2,
        si: i % 2,
        isRainbow: true,
        hue: (i * 36) % 360
      }));
      this.rotSpeed = 1;
    },
    onClick() { this.rotSpeed = this.rotSpeed > 0 ? -2.5 : 2.5; },
    render(time) {
      ctx.fillStyle = '#080608'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      this.rotSpeed += (1 - this.rotSpeed) * 0.03;
      ctx.save();
      this.gears.forEach((g) => {
        const ang = time * 0.001 * g.ratio * this.rotSpeed;
        ctx.strokeStyle = g.color; ctx.lineWidth = 2 * s;
        ctx.beginPath(); ctx.arc(cx, cy, g.r, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < g.teeth; i++) {
          const ta = ang + (i / g.teeth) * Math.PI * 2;
          const tr1 = g.r - 6 * s, tr2 = g.r + 6 * s;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ta) * tr1, cy + Math.sin(ta) * tr1);
          ctx.lineTo(cx + Math.cos(ta) * tr2, cy + Math.sin(ta) * tr2);
          ctx.stroke();
        }
      });
      this.pills.forEach(p => {
        const g = this.gears[p.gIdx];
        const a = time * 0.001 * g.ratio * this.rotSpeed + p.angOffset;
        const px = cx + Math.cos(a) * g.r;
        const py = cy + Math.sin(a) * g.r;
        p.hue = (p.hue + 1.2) % 360;
        const pw = (width < 600 ? 52 : 75) * s;
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        drawSprite(ctx, p.si, p.isRainbow, p.hue, px, py, pw, ph, a + Math.PI / 2, 0.95, 'lighter');
      });
      ctx.restore();
    }
  });

  modes.push({
    ribbons: 5, pills: [], bassPulse: 0,
    init() {
      const s = getScale();
      const count = width < 600 ? 5 : 9;
      this.pills = Array.from({ length: count }, (_, i) => ({
        track: i % 5,
        p: i / count,
        speed: 0.003 + Math.random() * 0.002,
        si: i % 2,
        isRainbow: true,
        hue: (i * 40) % 360
      }));
      this.bassPulse = 0;
    },
    onClick() { this.bassPulse = 1; },
    render(time) {
      ctx.fillStyle = '#020308'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      this.bassPulse *= 0.92;
      const rH = height / (this.ribbons + 1);
      ctx.save();
      for (let r = 0; r < this.ribbons; r++) {
        const baseY = (r + 1) * rH;
        const rHue = (time * 0.06 + r * 50) % 360;
        ctx.strokeStyle = `hsla(${rHue}, 90%, 65%, 0.6)`;
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * width;
          const y = baseY + Math.sin(x * 0.008 + time * 0.003 + r * 1.5) * (35 + this.bassPulse * 45) * s;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      this.pills.forEach(p => {
        p.p = (p.p + p.speed) % 1;
        p.hue = (p.hue + 1.8) % 360;
        const px = p.p * width;
        const baseY = (p.track + 1) * rH;
        const py = baseY + Math.sin(px * 0.008 + time * 0.003 + p.track * 1.5) * (35 + this.bassPulse * 45) * s;
        const dx = 1;
        const dy = Math.cos(px * 0.008 + time * 0.003 + p.track * 1.5) * 0.008 * (35 + this.bassPulse * 45) * s;
        const ang = Math.atan2(dy, dx);
        const pw = (width < 600 ? 56 : 82) * s;
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        drawSprite(ctx, p.si, p.isRainbow, p.hue, px, py, pw, ph, ang, 0.95, 'lighter');
      });
      ctx.restore();
    }
  });

  modes.push({
    pills: [], flares: [],
    init() {
      const s = getScale();
      const count = width < 600 ? 8 : 14;
      this.pills = Array.from({ length: count }, (_, i) => ({
        t: Math.random(),
        speed: 0.002 + Math.random() * 0.002,
        loopIdx: i % 4,
        si: i % 2,
        isRainbow: true,
        hue: (i * 30) % 360
      }));
      this.flares = [];
    },
    onClick() {
      const s = getScale();
      for (let i = 0; i < 15; i++) {
        this.flares.push({
          x: cx + (Math.random() - 0.5) * 200 * s,
          y: height * 0.9,
          vx: (Math.random() - 0.5) * 6,
          vy: -4 - Math.random() * 8,
          size: (6 + Math.random() * 12) * s,
          alpha: 1,
          hue: (Math.random() * 60 + 10) % 360
        });
      }
    },
    render(time) {
      ctx.fillStyle = '#060202'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      const sunCenterY = height * 1.15;
      const sunR = height * 0.45;
      const sGrad = ctx.createRadialGradient(cx, sunCenterY, sunR * 0.4, cx, sunCenterY, sunR);
      sGrad.addColorStop(0, '#ffffff'); sGrad.addColorStop(0.3, '#ffcc00'); sGrad.addColorStop(0.8, '#ff3300'); sGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.fillStyle = sGrad; ctx.beginPath(); ctx.arc(cx, sunCenterY, sunR, 0, Math.PI * 2); ctx.fill();
      const loops = [
        { x: cx - width * 0.25, w: width * 0.25, h: height * 0.35 },
        { x: cx, w: width * 0.35, h: height * 0.45 },
        { x: cx + width * 0.25, w: width * 0.25, h: height * 0.35 },
        { x: cx, w: width * 0.55, h: height * 0.55 }
      ];
      loops.forEach((lp, idx) => {
        ctx.strokeStyle = `hsla(${(time * 0.05 + idx * 40) % 360}, 100%, 65%, 0.5)`;
        ctx.lineWidth = 2.5 * s;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI; a += 0.05) {
          const lx = lp.x + Math.cos(a) * (lp.w / 2);
          const ly = height * 0.88 - Math.sin(a) * lp.h;
          if (a === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      });
      for (let i = this.flares.length - 1; i >= 0; i--) {
        const fl = this.flares[i];
        fl.x += fl.vx; fl.y += fl.vy; fl.vy += 0.15; fl.alpha -= 0.02;
        if (fl.alpha <= 0) { this.flares.splice(i, 1); continue; }
        ctx.fillStyle = `hsla(${fl.hue}, 100%, 70%, ${fl.alpha})`;
        ctx.beginPath(); ctx.arc(fl.x, fl.y, fl.size, 0, Math.PI * 2); ctx.fill();
      }
      this.pills.forEach(p => {
        p.t = (p.t + p.speed) % 1;
        p.hue = (p.hue + 1.8) % 360;
        const lp = loops[p.loopIdx];
        const a = p.t * Math.PI;
        const px = lp.x + Math.cos(a) * (lp.w / 2);
        const py = height * 0.88 - Math.sin(a) * lp.h;
        const pw = (width < 600 ? 54 : 78) * s;
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        drawSprite(ctx, p.si, p.isRainbow, p.hue, px, py, pw, ph, a, 0.95, 'lighter');
      });
      ctx.restore();
    }
  });

  modes.push({
    nodes: [], rotX: 0, rotY: 0,
    init() {
      const coords = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
        [0, 0, -1.4], [0, 0, 1.4], [0, -1.4, 0], [0, 1.4, 0], [-1.4, 0, 0], [1.4, 0, 0]
      ];
      this.nodes = coords.map((c, i) => ({
        x: c[0], y: c[1], z: c[2],
        si: i % 2,
        isRainbow: true,
        hue: (i * 25) % 360
      }));
      this.rotX = 0; this.rotY = 0;
    },
    onClick() { this.rotX += 0.5; this.rotY += 0.5; },
    render(time) {
      ctx.fillStyle = '#020509'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      this.rotX += 0.008; this.rotY += 0.012;
      const size = Math.min(width, height) * 0.28;
      const cosX = Math.cos(this.rotX), sinX = Math.sin(this.rotX);
      const cosY = Math.cos(this.rotY), sinY = Math.sin(this.rotY);
      const proj = this.nodes.map(n => {
        let y1 = n.y * cosX - n.z * sinX, z1 = n.y * sinX + n.z * cosX;
        let x2 = n.x * cosY + z1 * sinY, z2 = -n.x * sinY + z1 * cosY;
        const fov = 3.5;
        const scale = fov / (fov + z2);
        return {
          px: cx + x2 * size * scale,
          py: cy + y1 * size * scale,
          scale: scale,
          z: z2,
          si: n.si,
          hue: n.hue
        };
      });
      ctx.save();
      for (let i = 0; i < proj.length; i++) {
        for (let j = i + 1; j < proj.length; j++) {
          const d = Math.hypot(this.nodes[i].x - this.nodes[j].x, this.nodes[i].y - this.nodes[j].y, this.nodes[i].z - this.nodes[j].z);
          if (d < 2.1) {
            ctx.strokeStyle = `hsla(${(time * 0.05 + i * 20) % 360}, 90%, 65%, 0.4)`;
            ctx.lineWidth = 1.8 * s;
            ctx.beginPath();
            ctx.moveTo(proj[i].px, proj[i].py);
            ctx.lineTo(proj[j].px, proj[j].py);
            ctx.stroke();
          }
        }
      }
      proj.sort((a, b) => b.z - a.z);
      proj.forEach(p => {
        const pw = (width < 600 ? 52 : 76) * s * p.scale;
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        drawSprite(ctx, p.si, true, p.hue + time * 0.05, p.px, p.py, pw, ph, 0, 0.95, 'lighter');
      });
      ctx.restore();
    }
  });

  modes.push({
    suns: [], pills: [],
    init() {
      const s = getScale();
      this.suns = [
        { x: cx - 120 * s, y: cy - 70 * s, vx: 0.8, vy: -0.6, m: 3500, color: '#ff007f' },
        { x: cx + 120 * s, y: cy - 70 * s, vx: -0.5, vy: 0.9, m: 3500, color: '#00f0ff' },
        { x: cx, y: cy + 130 * s, vx: -0.3, vy: -0.3, m: 3500, color: '#ffd700' }
      ];
      const count = width < 600 ? 8 : 14;
      this.pills = Array.from({ length: count }, (_, i) => ({
        x: cx + (Math.random() - 0.5) * 300 * s,
        y: cy + (Math.random() - 0.5) * 300 * s,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        si: i % 2,
        isRainbow: true,
        hue: (i * 36) % 360,
        trail: []
      }));
    },
    onClick() {
      this.pills.forEach(p => {
        p.vx += (Math.random() - 0.5) * 8; p.vy += (Math.random() - 0.5) * 8;
      });
    },
    render(time) {
      ctx.fillStyle = 'rgba(2, 2, 6, 0.25)'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
          const s1 = this.suns[i], s2 = this.suns[j];
          const dx = s2.x - s1.x, dy = s2.y - s1.y, d = Math.hypot(dx, dy) || 1;
          const f = (s1.m * s2.m) / (d * d + 8000) * 0.0001;
          s1.vx += (dx / d) * f; s1.vy += (dy / d) * f;
          s2.vx -= (dx / d) * f; s2.vy -= (dy / d) * f;
        }
      }
      this.suns.forEach(sn => {
        sn.vx += (cx - sn.x) * 0.0002; sn.vy += (cy - sn.y) * 0.0002;
        sn.x += sn.vx; sn.y += sn.vy;
        ctx.fillStyle = sn.color; ctx.shadowColor = sn.color; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(sn.x, sn.y, 16 * s, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });
      this.pills.forEach(p => {
        this.suns.forEach(sn => {
          const dx = sn.x - p.x, dy = sn.y - p.y, d = Math.hypot(dx, dy) || 1;
          const f = sn.m / (d * d + 400) * 0.045;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        });
        const spd = Math.hypot(p.vx, p.vy);
        if (spd > 18) { p.vx = (p.vx / spd) * 18; p.vy = (p.vy / spd) * 18; }
        p.x += p.vx; p.y += p.vy;
        p.hue = (p.hue + 1.8) % 360;
        p.trail.push({ x: p.x, y: p.y, h: p.hue });
        if (p.trail.length > 5) p.trail.shift();
        const pw = (width < 600 ? 50 : 74) * s;
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        for (let t = 0; t < p.trail.length - 1; t++) {
          const tr = p.trail[t];
          drawSprite(ctx, p.si, true, tr.h, tr.x, tr.y, pw * 0.8, ph * 0.8, 0, (t / p.trail.length) * 0.3, 'lighter');
        }
        drawSprite(ctx, p.si, p.isRainbow, p.hue, p.x, p.y, pw, ph, Math.atan2(p.vy, p.vx), 0.95, 'lighter');
      });
    }
  });

  modes.push({
    neurons: [], signals: [],
    init() {
      const s = getScale();
      const count = width < 600 ? 8 : 14;
      this.neurons = Array.from({ length: count }, (_, i) => ({
        x: cx + (Math.random() - 0.5) * width * 0.75,
        y: cy + (Math.random() - 0.5) * height * 0.75,
        si: i % 2,
        isRainbow: true,
        hue: (i * 30) % 360,
        pulse: 0
      }));
      this.signals = [];
    },
    onClick() {
      this.neurons.forEach(n => { n.pulse = 1; });
    },
    render(time) {
      ctx.fillStyle = '#03040a'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      ctx.save();
      for (let i = 0; i < this.neurons.length; i++) {
        for (let j = i + 1; j < this.neurons.length; j++) {
          const n1 = this.neurons[i], n2 = this.neurons[j];
          const d = Math.hypot(n2.x - n1.x, n2.y - n1.y);
          if (d < 260 * s) {
            ctx.strokeStyle = `hsla(${(time * 0.05 + i * 25) % 360}, 85%, 60%, 0.35)`;
            ctx.lineWidth = 1.5 * s;
            ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y); ctx.stroke();
            if (Math.random() < 0.02) {
              this.signals.push({ from: n1, to: n2, t: 0, speed: 0.03, hue: n1.hue });
            }
          }
        }
      }
      for (let i = this.signals.length - 1; i >= 0; i--) {
        const sig = this.signals[i];
        sig.t += sig.speed;
        if (sig.t >= 1) {
          sig.to.pulse = 1;
          this.signals.splice(i, 1);
          continue;
        }
        const sx = sig.from.x + (sig.to.x - sig.from.x) * sig.t;
        const sy = sig.from.y + (sig.to.y - sig.from.y) * sig.t;
        ctx.fillStyle = `hsla(${sig.hue}, 100%, 75%, 0.9)`;
        ctx.beginPath(); ctx.arc(sx, sy, 4 * s, 0, Math.PI * 2); ctx.fill();
      }
      this.neurons.forEach(n => {
        n.pulse *= 0.92;
        n.hue = (n.hue + 1.2) % 360;
        const pw = (width < 600 ? 54 : 78) * s * (1 + n.pulse * 0.3);
        const ph = pw * (sprites[n.si].height / sprites[n.si].width);
        drawSprite(ctx, n.si, n.isRainbow, n.hue, n.x, n.y, pw, ph, 0, 0.95, 'lighter');
      });
      ctx.restore();
    }
  });

  modes.push({
    pills: [],
    init() {
      const s = getScale();
      const count = width < 600 ? 6 : 10;
      this.pills = Array.from({ length: count }, (_, i) => ({
        x: (i / count) * width,
        y: height * 0.3 + (i % 3) * 60 * s,
        vx: 1 + Math.random() * 1.5,
        si: i % 2,
        isRainbow: true,
        hue: (i * 40) % 360
      }));
    },
    onClick() {
      this.pills.forEach(p => { p.vx *= 1.8; });
    },
    render(time) {
      ctx.fillStyle = '#020608'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      ctx.save();
      for (let layer = 0; layer < 4; layer++) {
        const lHue = (time * 0.04 + layer * 70) % 360;
        const grad = ctx.createLinearGradient(0, height * 0.1, 0, height * 0.7);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, `hsla(${lHue}, 90%, 65%, 0.3)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.1);
        for (let x = 0; x <= width; x += 20) {
          const y = height * (0.25 + layer * 0.1) + Math.sin(x * 0.005 + time * 0.0015 + layer) * 45 * s;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height * 0.8); ctx.lineTo(0, height * 0.8);
        ctx.closePath(); ctx.fill();
      }
      this.pills.forEach(p => {
        p.x = (p.x + p.vx) % (width + 100);
        p.vx += (1.5 - p.vx) * 0.02;
        p.hue = (p.hue + 1.5) % 360;
        const py = height * 0.35 + Math.sin(p.x * 0.006 + time * 0.002) * 50 * s;
        const pw = (width < 600 ? 56 : 82) * s;
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        drawSprite(ctx, p.si, p.isRainbow, p.hue, p.x - 50, py, pw, ph, Math.sin(p.x * 0.01) * 0.2, 0.95, 'lighter');
      });
      ctx.restore();
    }
  });

  modes.push({
    pills: [],
    init() {
      const s = getScale();
      const count = width < 600 ? 7 : 11;
      const spacing = (width < 600 ? 46 : 68) * s;
      const startX = cx - (count * spacing) / 2;
      this.pills = Array.from({ length: count }, (_, i) => ({
        x: startX + i * spacing,
        y: cy,
        vx: i === 0 ? -12 : 0,
        si: i % 2,
        isRainbow: true,
        hue: (i * 32) % 360
      }));
    },
    onClick() {
      this.pills[0].vx = -16;
    },
    render(time) {
      ctx.fillStyle = '#060408'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      const radius = (width < 600 ? 22 : 32) * s;
      for (let i = 0; i < this.pills.length - 1; i++) {
        const p1 = this.pills[i], p2 = this.pills[i + 1];
        const d = p2.x - p1.x;
        if (d < radius * 2) {
          const vTemp = p1.vx; p1.vx = p2.vx; p2.vx = vTemp;
          p2.x = p1.x + radius * 2;
        }
      }
      this.pills.forEach((p, idx) => {
        p.vx += ((cx - (this.pills.length * radius) + idx * radius * 2) - p.x) * 0.03;
        p.vx *= 0.96;
        p.x += p.vx;
        p.hue = (p.hue + 1.2) % 360;
        const pw = (width < 600 ? 54 : 78) * s;
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        drawSprite(ctx, p.si, p.isRainbow, p.hue, p.x, p.y + Math.abs(p.vx) * -1.5, pw, ph, p.vx * 0.04, 0.95, 'lighter');
      });
    }
  });

  modes.push({
    pills: [], rot: 0,
    init() {
      const s = getScale();
      const count = width < 600 ? 5 : 8;
      this.pills = Array.from({ length: count }, (_, i) => ({
        z: (i / count) * 500,
        si: i % 2,
        isRainbow: true,
        hue: (i * 45) % 360
      }));
      this.rot = 0;
    },
    onClick() { this.rot += Math.PI / 3; },
    render(time) {
      ctx.fillStyle = '#030206'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      this.rot += 0.008;
      const sectors = 6;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.rot);
      for (let sec = 0; sec < sectors; sec++) {
        ctx.save();
        ctx.rotate((sec / sectors) * Math.PI * 2);
        this.pills.forEach(p => {
          p.z = (p.z + 2) % 500;
          const scale = (p.z / 500);
          const px = scale * width * 0.35;
          const py = Math.sin(time * 0.002 + p.z * 0.02) * 40 * s * scale;
          const pw = (width < 600 ? 46 : 68) * s * scale;
          const ph = pw * (sprites[p.si].height / sprites[p.si].width);
          drawSprite(ctx, p.si, p.isRainbow, p.hue + time * 0.05, px, py, pw, ph, p.z * 0.02, scale, 'lighter');
        });
        ctx.restore();
      }
      ctx.restore();
    }
  });

  modes.push({
    particles: [], morphT: 0, targetShape: 0,
    init() {
      const s = getScale();
      const count = width < 600 ? 24 : 40;
      this.particles = Array.from({ length: count }, (_, i) => ({
        x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0,
        si: i % 2,
        isRainbow: true,
        hue: (i * 12) % 360
      }));
      this.setShape(0);
    },
    setShape(idx) {
      const count = this.particles.length;
      this.particles.forEach((p, i) => {
        const u = (i / count) * Math.PI * 2;
        if (idx === 0) {
          p.tx = Math.cos(u) * 160; p.ty = Math.sin(u) * 160; p.tz = Math.sin(u * 2) * 60;
        } else if (idx === 1) {
          const v = (i % 8) / 8 * Math.PI * 2;
          p.tx = (140 + 50 * Math.cos(v)) * Math.cos(u);
          p.ty = (140 + 50 * Math.cos(v)) * Math.sin(u);
          p.tz = 50 * Math.sin(v);
        } else {
          p.tx = 16 * Math.pow(Math.sin(u), 3) * 10;
          p.ty = -(13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)) * 10;
          p.tz = Math.sin(u * 3) * 40;
        }
      });
    },
    onClick() {
      this.targetShape = (this.targetShape + 1) % 3;
      this.setShape(this.targetShape);
    },
    render(time) {
      ctx.fillStyle = '#04030a'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      const rot = time * 0.001;
      ctx.save();
      this.particles.forEach(p => {
        p.x += (p.tx - p.x) * 0.08;
        p.y += (p.ty - p.y) * 0.08;
        p.z += (p.tz - p.z) * 0.08;
        const x1 = p.x * Math.cos(rot) - p.z * Math.sin(rot);
        const z1 = p.x * Math.sin(rot) + p.z * Math.cos(rot);
        const fov = 350;
        const scale = fov / (fov + z1);
        const px = cx + x1 * s * scale;
        const py = cy + p.y * s * scale;
        const pw = (width < 600 ? 48 : 70) * s * scale;
        const ph = pw * (sprites[p.si].height / sprites[p.si].width);
        drawSprite(ctx, p.si, p.isRainbow, p.hue + time * 0.04, px, py, pw, ph, rot, 0.95, 'lighter');
      });
      ctx.restore();
    }
  });

  modes.push({
    meteors: [],
    init() {
      const s = getScale();
      const count = width < 600 ? 8 : 15;
      this.meteors = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width * 1.5,
        y: Math.random() * -height,
        spd: 12 + Math.random() * 10,
        si: i % 2,
        isRainbow: true,
        hue: (i * 24) % 360,
        trail: []
      }));
    },
    onClick() {
      this.meteors.forEach(m => { m.spd *= 2; });
    },
    render(time) {
      ctx.fillStyle = 'rgba(2, 2, 6, 0.25)'; ctx.fillRect(0, 0, width, height);
      const s = getScale();
      const ang = Math.PI * 0.7;
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      ctx.save();
      this.meteors.forEach(m => {
        m.x += cosA * m.spd;
        m.y += sinA * m.spd;
        m.hue = (m.hue + 2) % 360;
        if (m.x < -100 || m.y > height + 100) {
          m.x = width * 0.5 + Math.random() * width;
          m.y = -80 - Math.random() * 200;
          m.spd = 12 + Math.random() * 10;
          m.trail = [];
        }
        m.trail.push({ x: m.x, y: m.y, h: m.hue });
        if (m.trail.length > 8) m.trail.shift();
        const pw = (width < 600 ? 54 : 78) * s;
        const ph = pw * (sprites[m.si].height / sprites[m.si].width);
        for (let t = 0; t < m.trail.length - 1; t++) {
          const tr = m.trail[t];
          drawSprite(ctx, m.si, true, tr.h, tr.x, tr.y, pw * 0.7, ph * 0.7, ang, (t / m.trail.length) * 0.35, 'lighter');
        }
        drawSprite(ctx, m.si, m.isRainbow, m.hue, m.x, m.y, pw, ph, ang, 0.95, 'lighter');
      });
      ctx.restore();
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
