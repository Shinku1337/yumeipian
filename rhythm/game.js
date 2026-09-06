(function () {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const container = document.getElementById('game-container');

  const startModal = document.getElementById('start-modal');
  const pauseModal = document.getElementById('pause-modal');
  const resultModal = document.getElementById('result-modal');
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const restartBtn = document.getElementById('restart-btn');
  const selectSongBtn = document.getElementById('select-song-btn');
  const resRetryBtn = document.getElementById('res-retry-btn');
  const resMenuBtn = document.getElementById('res-menu-btn');

  const hudScore = document.getElementById('hud-score');
  const hudAcc = document.getElementById('hud-acc');
  const hudSongTitle = document.getElementById('hud-song-title');
  const hudSongBpm = document.getElementById('hud-song-bpm');
  const progressBar = document.getElementById('progress-bar');
  const grooveGauge = document.getElementById('groove-gauge');

  const touchLanes = Array.from(document.querySelectorAll('.touch-lane'));
  const songCards = Array.from(document.querySelectorAll('.song-card'));

  const exitLinks = document.querySelectorAll('a[href="../"]');
  if (exitLinks.length > 0 && window.location.hostname.includes('.')) {
    const parts = window.location.hostname.split('.');
    if (parts.length > 2 && !/^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)) {
      const rootHost = parts.slice(1).join('.');
      const rootUrl = window.location.protocol + '//' + rootHost + (window.location.port ? ':' + window.location.port : '') + '/';
      exitLinks.forEach(link => { link.href = rootUrl; });
    }
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let trackW = 0;
  let trackLeft = 0;
  let hitY = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);

    trackW = Math.min(width * 0.94, 520);
    trackLeft = (width - trackW) / 2;
    hitY = height * 0.84;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => { setTimeout(resize, 150); });
  resize();

  const sprites = [];
  function loadAssets(cb) {
    const urls = ['images/YuMeiPian.png', 'images/愈美片.png'];
    let loaded = 0;
    urls.forEach((u, i) => {
      const img = new Image();
      img.onload = () => {
        sprites[i] = img;
        loaded++;
        if (loaded === urls.length && cb) cb();
      };
      img.onerror = () => {
        const fallback = '../' + u;
        const fbImg = new Image();
        fbImg.onload = () => {
          sprites[i] = fbImg;
          loaded++;
          if (loaded === urls.length && cb) cb();
        };
        fbImg.src = fallback;
      };
      img.src = u;
    });
  }

  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  let noiseBuffer = null;
  function getNoiseBuffer() {
    if (!noiseBuffer && audioCtx) {
      const bSize = audioCtx.sampleRate * 2;
      noiseBuffer = audioCtx.createBuffer(1, bSize, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return noiseBuffer;
  }

  function playHitSfx(type) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'PERFECT') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'GREAT') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.09);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'GOOD') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  }

  const SONGS = [
    {
      id: 0,
      title: '愈美幻境',
      sub: 'Euphoria Dream',
      bpm: 128,
      bars: 28,
      badge: 'EASY',
      color: '#00ff66',
      bassNotes: [55, 55, 62, 57, 53, 53, 60, 55],
      leadNotes: [69, 72, 76, 79, 76, 72, 74, 76, 69, 72, 76, 81, 79, 76, 74, 72]
    },
    {
      id: 1,
      title: '速效驱动',
      sub: 'Overdrive',
      bpm: 150,
      bars: 32,
      badge: 'NORMAL',
      color: '#00f0ff',
      bassNotes: [48, 51, 55, 58, 46, 50, 53, 57],
      leadNotes: [72, 75, 79, 82, 84, 82, 79, 75, 70, 74, 77, 82, 84, 82, 77, 74]
    },
    {
      id: 2,
      title: '极限狂想',
      sub: 'Hyper Dose',
      bpm: 175,
      bars: 36,
      badge: 'EXPERT',
      color: '#ff007f',
      bassNotes: [45, 48, 52, 55, 41, 45, 48, 53],
      leadNotes: [69, 72, 76, 81, 84, 81, 76, 72, 65, 69, 72, 77, 81, 77, 72, 69]
    }
  ];

  let selectedSongIdx = 0;
  let currentSong = SONGS[0];

  songCards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      songCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedSongIdx = idx;
      currentSong = SONGS[idx];
    });
  });

  function midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  let synthTimer = null;
  let nextNoteTime = 0;
  let currentStep = 0;
  let songStartTime = 0;
  let isPlaying = false;
  let isPaused = false;
  let songDuration = 0;

  function scheduleSynthStep(step, time) {
    if (!audioCtx) return;
    const song = currentSong;
    const stepInPattern = step % 16;
    const beatInBar = Math.floor(stepInPattern / 4);
    const subBeat = stepInPattern % 4;

    if (subBeat === 0) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);
      gain.gain.setValueAtTime(0.55, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
      osc.start(time);
      osc.stop(time + 0.14);
    }

    if (subBeat === 0 && (beatInBar === 1 || beatInBar === 3)) {
      const nBuf = getNoiseBuffer();
      if (nBuf) {
        const noise = audioCtx.createBufferSource();
        noise.buffer = nBuf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, time);
        filter.Q.setValueAtTime(1.8, time);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start(time);
        noise.stop(time + 0.13);
      }
    }

    if (subBeat === 2 || (song.bpm >= 150 && subBeat % 2 === 1)) {
      const nBuf = getNoiseBuffer();
      if (nBuf) {
        const noise = audioCtx.createBufferSource();
        noise.buffer = nBuf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, time);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(subBeat === 2 ? 0.2 : 0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start(time);
        noise.stop(time + 0.05);
      }
    }

    if (subBeat === 0 || subBeat === 2 || subBeat === 3) {
      const bIdx = (Math.floor(step / 4)) % song.bassNotes.length;
      const bFreq = midiToFreq(song.bassNotes[bIdx]);
      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bFreq, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, time);
      filter.frequency.exponentialRampToValueAtTime(120, time + 0.14);
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(time);
      osc.stop(time + 0.15);
    }

    if (step % 2 === 0) {
      const lIdx = (Math.floor(step / 2)) % song.leadNotes.length;
      const lFreq = midiToFreq(song.leadNotes[lIdx]);
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(lFreq, time);
      osc2.frequency.setValueAtTime(lFreq * 1.004, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, time);
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.18);
      osc2.stop(time + 0.18);
    }
  }

  function audioScheduler() {
    if (!isPlaying || isPaused || !audioCtx) return;
    const secondsPerStep = (60 / currentSong.bpm) / 4;
    const lookAhead = 0.2;
    const totalSteps = currentSong.bars * 16;

    while (nextNoteTime < audioCtx.currentTime + lookAhead && currentStep < totalSteps) {
      scheduleSynthStep(currentStep, nextNoteTime);
      nextNoteTime += secondsPerStep;
      currentStep++;
    }

    if (currentStep >= totalSteps && notes.length > 0 && notes.every(n => n.judged)) {
      setTimeout(endGame, 1200);
      return;
    }
    synthTimer = requestAnimationFrame(audioScheduler);
  }

  let notes = [];
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let stats = { perfect: 0, great: 0, good: 0, miss: 0 };
  let groove = 50;
  let particles = [];
  let judgements = [];
  let lanePulses = [0, 0, 0, 0];

  function generateBeatmap(song) {
    const map = [];
    const stepSec = (60 / song.bpm) / 4;
    const totalSteps = song.bars * 16;
    let seed = song.bpm * 37 + song.bars;
    function rand() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    let lastLane = -1;
    for (let s = 8; s < totalSteps - 8; s++) {
      const beat = s % 4;
      let shouldSpawn = false;
      let lane = Math.floor(rand() * 4);

      if (song.id === 0) {
        if (beat === 0 && rand() > 0.15) shouldSpawn = true;
        else if (beat === 2 && rand() > 0.55) shouldSpawn = true;
      } else if (song.id === 1) {
        if (beat === 0) shouldSpawn = true;
        else if (beat === 2 && rand() > 0.3) shouldSpawn = true;
        else if (beat === 1 && rand() > 0.7) shouldSpawn = true;
      } else {
        if (beat === 0 || beat === 2) shouldSpawn = true;
        else if (rand() > 0.5) shouldSpawn = true;
      }

      if (shouldSpawn) {
        if (lane === lastLane && rand() > 0.3) {
          lane = (lane + 1 + Math.floor(rand() * 3)) % 4;
        }
        lastLane = lane;
        const time = s * stepSec;
        map.push({
          time: time,
          lane: lane,
          spriteIdx: rand() > 0.4 ? 0 : 1,
          hue: (s * 15) % 360,
          judged: false,
          judgement: null
        });

        if (song.id >= 1 && beat === 0 && rand() > 0.72) {
          const secondLane = (lane + 2) % 4;
          map.push({
            time: time,
            lane: secondLane,
            spriteIdx: rand() > 0.5 ? 1 : 0,
            hue: (s * 15 + 180) % 360,
            judged: false,
            judgement: null
          });
        }
      }
    }
    return map;
  }

  function startGame() {
    initAudio();
    currentSong = SONGS[selectedSongIdx];
    hudSongTitle.textContent = currentSong.title;
    hudSongBpm.textContent = currentSong.bpm + ' BPM';

    notes = generateBeatmap(currentSong);
    score = 0;
    combo = 0;
    maxCombo = 0;
    stats = { perfect: 0, great: 0, good: 0, miss: 0 };
    groove = 50;
    particles = [];
    judgements = [];
    lanePulses = [0, 0, 0, 0];

    updateHUD();

    songDuration = (currentSong.bars * 16) * ((60 / currentSong.bpm) / 4);
    songStartTime = audioCtx.currentTime + 1.2;
    nextNoteTime = songStartTime;
    currentStep = 0;
    isPlaying = true;
    isPaused = false;

    startModal.style.display = 'none';
    pauseModal.style.display = 'none';
    resultModal.style.display = 'none';

    audioScheduler();
  }

  function pauseGame() {
    if (!isPlaying || isPaused) return;
    isPaused = true;
    if (synthTimer) cancelAnimationFrame(synthTimer);
    pauseModal.style.display = 'flex';
  }

  function resumeGame() {
    if (!isPlaying || !isPaused) return;
    isPaused = false;
    pauseModal.style.display = 'none';
    audioScheduler();
  }

  function restartGame() {
    if (synthTimer) cancelAnimationFrame(synthTimer);
    startGame();
  }

  function returnToMenu() {
    if (synthTimer) cancelAnimationFrame(synthTimer);
    isPlaying = false;
    isPaused = false;
    pauseModal.style.display = 'none';
    resultModal.style.display = 'none';
    startModal.style.display = 'flex';
  }

  function endGame() {
    isPlaying = false;
    if (synthTimer) cancelAnimationFrame(synthTimer);

    const totalNotes = notes.length;
    const totalHits = stats.perfect + stats.great + stats.good + stats.miss;
    const acc = totalHits > 0 ? ((stats.perfect * 100 + stats.great * 70 + stats.good * 30) / (totalHits * 100)) * 100 : 0;

    let rank = 'F';
    if (score >= 980000 || (stats.miss === 0 && acc >= 98)) rank = 'S+';
    else if (score >= 900000 || acc >= 95) rank = 'S';
    else if (score >= 800000 || acc >= 88) rank = 'A';
    else if (score >= 700000 || acc >= 78) rank = 'B';
    else if (score >= 600000 || acc >= 68) rank = 'C';

    document.getElementById('result-rank').textContent = rank;
    document.getElementById('result-score').textContent = score.toString().padStart(7, '0');
    document.getElementById('stat-perfect').textContent = stats.perfect;
    document.getElementById('stat-great').textContent = stats.great;
    document.getElementById('stat-good').textContent = stats.good;
    document.getElementById('stat-miss').textContent = stats.miss;
    document.getElementById('stat-max-combo').textContent = maxCombo;
    document.getElementById('stat-accuracy').textContent = acc.toFixed(1) + '%';

    resultModal.style.display = 'flex';
  }

  function updateHUD() {
    hudScore.textContent = score.toString().padStart(7, '0');
    const totalHits = stats.perfect + stats.great + stats.good + stats.miss;
    const acc = totalHits > 0 ? ((stats.perfect * 100 + stats.great * 70 + stats.good * 30) / (totalHits * 100)) * 100 : 100;
    hudAcc.textContent = acc.toFixed(1) + '%';

    grooveGauge.style.width = Math.max(0, Math.min(100, groove)) + '%';
    if (groove > 75) {
      grooveGauge.style.background = 'linear-gradient(90deg, #ff007f, #00f0ff, #00ff66)';
    } else if (groove > 30) {
      grooveGauge.style.background = 'linear-gradient(90deg, #ff007f, #00f0ff)';
    } else {
      grooveGauge.style.background = '#ff0055';
    }
  }

  function addHitEffect(lane, type) {
    const laneW = trackW / 4;
    const x = trackLeft + lane * laneW + laneW / 2;
    const y = hitY;

    const count = type === 'PERFECT' ? 24 : type === 'GREAT' ? 16 : 8;
    const colors = type === 'PERFECT' ? ['#ffd700', '#ff007f', '#00f0ff'] : type === 'GREAT' ? ['#00f0ff', '#7000ff'] : ['#00ff66', '#ffffff'];

    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 7;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.03,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.2
      });
    }

    judgements.push({
      text: type,
      x: x,
      y: y - 28,
      alpha: 1,
      scale: 1.4,
      vy: -1.2,
      color: type === 'PERFECT' ? '#ffd700' : type === 'GREAT' ? '#00f0ff' : type === 'GOOD' ? '#00ff66' : '#ff3366'
    });

    if (navigator.vibrate) {
      try { navigator.vibrate(type === 'PERFECT' ? 18 : 10); } catch (e) {}
    }
  }

  function handleHit(lane) {
    if (!isPlaying || isPaused || !audioCtx) return;
    const curSongTime = audioCtx.currentTime - songStartTime;
    lanePulses[lane] = 1.0;

    let closestNote = null;
    let minDiff = Infinity;

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (n.lane === lane && !n.judged) {
        const diff = Math.abs(n.time - curSongTime);
        if (diff < minDiff && diff < 0.20) {
          minDiff = diff;
          closestNote = n;
        }
      }
    }

    if (closestNote) {
      closestNote.judged = true;
      let jType = 'GOOD';
      let pts = 300;

      if (minDiff <= 0.05) {
        jType = 'PERFECT';
        pts = 1000;
        stats.perfect++;
        groove = Math.min(100, groove + 3.5);
      } else if (minDiff <= 0.10) {
        jType = 'GREAT';
        pts = 700;
        stats.great++;
        groove = Math.min(100, groove + 2.0);
      } else {
        jType = 'GOOD';
        pts = 300;
        stats.good++;
        groove = Math.min(100, groove + 0.8);
      }

      combo++;
      if (combo > maxCombo) maxCombo = combo;
      score += pts + Math.min(combo * 15, 500);

      playHitSfx(jType);
      addHitEffect(lane, jType);
      updateHUD();
    }
  }

  const keyMap = {
    'KeyD': 0, 'KeyF': 1, 'KeyJ': 2, 'KeyK': 3,
    'KeyA': 0, 'KeyS': 1, 'KeyL': 3, 'Semicolon': 3,
    'ArrowLeft': 0, 'ArrowDown': 1, 'ArrowUp': 2, 'ArrowRight': 3
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (isPlaying) {
        if (isPaused) resumeGame();
        else pauseGame();
      }
      return;
    }

    const lane = keyMap[e.code];
    if (lane !== undefined) {
      e.preventDefault();
      touchLanes[lane].classList.add('pressed');
      handleHit(lane);
    }
  });

  window.addEventListener('keyup', (e) => {
    const lane = keyMap[e.code];
    if (lane !== undefined) {
      touchLanes[lane].classList.remove('pressed');
    }
  });

  touchLanes.forEach((tl, laneIdx) => {
    function onTouch(e) {
      e.preventDefault();
      e.stopPropagation();
      tl.classList.add('pressed');
      handleHit(laneIdx);
    }
    function offTouch(e) {
      e.preventDefault();
      tl.classList.remove('pressed');
    }

    tl.addEventListener('touchstart', onTouch, { passive: false });
    tl.addEventListener('touchend', offTouch, { passive: false });
    tl.addEventListener('touchcancel', offTouch, { passive: false });
    tl.addEventListener('mousedown', onTouch);
    tl.addEventListener('mouseup', offTouch);
    tl.addEventListener('mouseleave', offTouch);
  });

  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', pauseGame);
  resumeBtn.addEventListener('click', resumeGame);
  restartBtn.addEventListener('click', restartGame);
  selectSongBtn.addEventListener('click', returnToMenu);
  resRetryBtn.addEventListener('click', startGame);
  resMenuBtn.addEventListener('click', returnToMenu);

  function render(time) {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#06060c';
    ctx.fillRect(0, 0, width, height);

    const laneW = trackW / 4;
    const topY = height * 0.08;

    ctx.save();
    const trackGrad = ctx.createLinearGradient(0, topY, 0, height);
    trackGrad.addColorStop(0, 'rgba(10, 10, 22, 0.4)');
    trackGrad.addColorStop(0.7, 'rgba(18, 14, 35, 0.7)');
    trackGrad.addColorStop(1, 'rgba(25, 20, 48, 0.95)');
    ctx.fillStyle = trackGrad;
    ctx.fillRect(trackLeft, topY, trackW, height - topY);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    for (let l = 0; l <= 4; l++) {
      const lx = trackLeft + l * laneW;
      ctx.beginPath();
      ctx.moveTo(lx, topY);
      ctx.lineTo(lx, height);
      ctx.stroke();
    }

    for (let l = 0; l < 4; l++) {
      if (lanePulses[l] > 0.01) {
        const lx = trackLeft + l * laneW;
        ctx.fillStyle = `rgba(0, 240, 255, ${lanePulses[l] * 0.28})`;
        ctx.fillRect(lx, topY, laneW, height - topY);
        lanePulses[l] *= 0.88;
      }
    }

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(trackLeft, hitY);
    ctx.lineTo(trackLeft + trackW, hitY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (let l = 0; l < 4; l++) {
      const hx = trackLeft + l * laneW + laneW / 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hitY, laneW * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    if (isPlaying && audioCtx) {
      const curSongTime = audioCtx.currentTime - songStartTime;
      const noteSpeed = (hitY - topY) / 1.1;

      const progress = Math.max(0, Math.min(100, (curSongTime / songDuration) * 100));
      progressBar.style.width = progress + '%';

      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        if (n.judged) continue;

        const timeDiff = n.time - curSongTime;
        const noteY = hitY - timeDiff * noteSpeed;

        if (timeDiff < -0.16) {
          n.judged = true;
          stats.miss++;
          combo = 0;
          groove = Math.max(0, groove - 5);
          updateHUD();
          judgements.push({
            text: 'MISS',
            x: trackLeft + n.lane * laneW + laneW / 2,
            y: hitY - 20,
            alpha: 1,
            scale: 1.1,
            vy: -0.8,
            color: '#ff3366'
          });
          continue;
        }

        if (noteY < topY - 50 || noteY > height + 60) continue;

        const noteX = trackLeft + n.lane * laneW + laneW / 2;
        const img = sprites[n.spriteIdx];
        const nw = Math.min(laneW * 0.72, 76);
        const nh = img ? nw * (img.height / img.width) : nw * 0.5;

        ctx.save();
        ctx.translate(noteX, noteY);

        ctx.shadowColor = `hsl(${n.hue}, 100%, 65%)`;
        ctx.shadowBlur = 16;

        ctx.fillStyle = `hsla(${n.hue}, 100%, 50%, 0.3)`;
        ctx.fillRect(-nw / 2 - 3, -nh / 2 - 3, nw + 6, nh + 6);

        if (img) {
          ctx.drawImage(img, -nw / 2, -nh / 2, nw, nh);
        } else {
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(-nw / 2, -nh / 2, nw, nh);
        }

        ctx.strokeStyle = `hsl(${n.hue}, 100%, 75%)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(-nw / 2, -nh / 2, nw, nh);

        ctx.restore();
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }

    for (let i = judgements.length - 1; i >= 0; i--) {
      const j = judgements[i];
      j.y += j.vy;
      j.alpha -= 0.024;
      j.scale += (1.0 - j.scale) * 0.12;
      if (j.alpha <= 0) {
        judgements.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = j.alpha;
      ctx.font = `900 ${Math.floor(22 * j.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = j.color;
      ctx.shadowColor = j.color;
      ctx.shadowBlur = 12;
      ctx.fillText(j.text, j.x, j.y);
      ctx.restore();
    }

    if (combo > 2) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = '900 36px monospace, sans-serif';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
      ctx.fillText(combo.toString(), trackLeft + trackW / 2, hitY - 80);
      ctx.font = '700 12px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText('COMBO', trackLeft + trackW / 2, hitY - 60);
      ctx.restore();
    }

    requestAnimationFrame(render);
  }

  loadAssets(() => {
    requestAnimationFrame(render);
  });

})();
