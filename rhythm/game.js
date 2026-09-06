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
  if (exitLinks.length > 0) {
    if (document.referrer && !document.referrer.includes(window.location.host)) {
      exitLinks.forEach(link => { link.href = document.referrer; });
    } else if (window.location.hostname.includes('.')) {
      const parts = window.location.hostname.split('.');
      if (parts.length > 2 && !/^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)) {
        const rootHost = parts.slice(-2).join('.');
        const rootUrl = window.location.protocol + '//' + rootHost + (window.location.port ? ':' + window.location.port : '') + '/';
        exitLinks.forEach(link => { link.href = rootUrl; });
      }
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
  const AUDIO_LATENCY_OFFSET = 0.034;

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

    const clickOsc = audioCtx.createOscillator();
    const clickGain = audioCtx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.connect(clickGain);
    clickGain.connect(audioCtx.destination);

    const freqStart = type === 'PERFECT' ? 1760 : type === 'GREAT' ? 1320 : 880;
    const freqEnd = type === 'PERFECT' ? 440 : type === 'GREAT' ? 330 : 220;
    clickOsc.frequency.setValueAtTime(freqStart, now);
    clickOsc.frequency.exponentialRampToValueAtTime(freqEnd, now + 0.04);
    clickGain.gain.setValueAtTime(0.35, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    clickOsc.start(now);
    clickOsc.stop(now + 0.05);

    const nBuf = getNoiseBuffer();
    if (nBuf) {
      const snap = audioCtx.createBufferSource();
      snap.buffer = nBuf;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(type === 'PERFECT' ? 5000 : 3500, now);
      const snapGain = audioCtx.createGain();
      snapGain.gain.setValueAtTime(type === 'PERFECT' ? 0.25 : 0.15, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      snap.connect(filter);
      filter.connect(snapGain);
      snapGain.connect(audioCtx.destination);
      snap.start(now);
      snap.stop(now + 0.025);
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
  let shockRings = [];
  let lanePulses = [0, 0, 0, 0];
  let laneBeams = [0, 0, 0, 0];
  let screenShake = 0;
  let comboScale = 1.0;

  function generateBeatmap(song) {
    const map = [];
    const stepSec = (60 / song.bpm) / 4;
    const totalSteps = song.bars * 16;

    function addNote(s, lane, hueShift = 0) {
      map.push({
        time: s * stepSec,
        lane: lane,
        spriteIdx: (map.length % 2),
        hue: (s * 16 + hueShift) % 360,
        judged: false,
        judgement: null
      });
    }

    let alt = 0;
    for (let s = 8; s < totalSteps - 8; s++) {
      const beat = s % 4;
      const sub = s % 2;
      const bar = Math.floor(s / 16);
      const stepInBar = s % 16;

      if (song.id === 0) {
        if (beat === 0) {
          const lane = (alt % 2 === 0) ? 1 : 2;
          addNote(s, lane);
          alt++;
        } else if (beat === 2 && (s % 8 === 2) && bar % 2 === 1) {
          const lane = (alt % 2 === 0) ? 0 : 3;
          addNote(s, lane);
          alt++;
        }
      } else if (song.id === 1) {
        const section = Math.floor(bar / 4) % 4;
        const barInSec = bar % 4;

        if (beat === 0 && sub === 0) {
          if (stepInBar === 0 && (section === 1 || section === 2)) {
            if (barInSec % 2 === 0) {
              addNote(s, 0);
              addNote(s, 3, 180);
            } else {
              addNote(s, 1);
              addNote(s, 2, 180);
            }
          } else {
            const flow = [
              [0, 1, 2, 3],
              [3, 2, 1, 0],
              [0, 2, 1, 3],
              [1, 3, 2, 0],
              [0, 3, 1, 2],
              [1, 2, 0, 3]
            ][(bar + Math.floor(stepInBar / 4)) % 6];
            addNote(s, flow[Math.floor(stepInBar / 4)]);
          }
        } else if (beat === 2 && sub === 0) {
          const p = [1, 2, 3, 0][(bar * 2 + Math.floor(stepInBar / 4)) % 4];
          addNote(s, p);
        } else if (sub === 0 && (beat === 1 || beat === 3)) {
          if (section === 1 || section === 2 || barInSec === 3) {
            if (s % 8 === 2 || s % 8 === 6) {
              addNote(s, (Math.floor(s / 2) % 4));
            }
          }
        } else if (barInSec === 3 && stepInBar >= 12) {
          addNote(s, stepInBar % 4);
        }
      } else {
        const section = Math.floor(bar / 4);
        const barInSec = bar % 4;

        if (sub === 0) {
          const beatIdx = Math.floor(stepInBar / 2);
          if (beatIdx % 2 === 0) {
            if (beatIdx === 0 && (barInSec === 0 || barInSec === 2)) {
              if (section % 2 === 0) {
                addNote(s, 0);
                addNote(s, 3, 180);
              } else {
                addNote(s, 1);
                addNote(s, 2, 180);
              }
            } else {
              const flow = [
                [0, 1, 2, 3],
                [3, 2, 1, 0],
                [0, 2, 1, 3],
                [3, 1, 2, 0],
                [1, 0, 3, 2],
                [2, 3, 0, 1]
              ][(bar + Math.floor(beatIdx / 2)) % 6];
              addNote(s, flow[Math.floor(beatIdx / 2)]);
            }
          } else {
            if (section >= 1 || barInSec >= 2) {
              const stair = (bar % 2 === 0)
                ? (beatIdx % 4)
                : (3 - (beatIdx % 4));
              addNote(s, stair);
            }
          }
        } else if (barInSec === 3 && stepInBar >= 12) {
          addNote(s, (stepInBar % 2 === 0) ? (stepInBar % 4) : (3 - (stepInBar % 4)));
        }
      }
    }

    map.sort((a, b) => a.time - b.time);
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
    shockRings = [];
    lanePulses = [0, 0, 0, 0];
    laneBeams = [0, 0, 0, 0];
    screenShake = 0;
    comboScale = 1.0;

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

    const totalHits = stats.perfect + stats.great + stats.good + stats.miss;
    const acc = totalHits > 0 ? ((stats.perfect * 100 + stats.great * 75 + stats.good * 40) / (totalHits * 100)) * 100 : 0;

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
    const acc = totalHits > 0 ? ((stats.perfect * 100 + stats.great * 75 + stats.good * 40) / (totalHits * 100)) * 100 : 100;
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

  function addHitEffect(lane, type, timingOffset) {
    const laneW = trackW / 4;
    const x = trackLeft + lane * laneW + laneW / 2;
    const y = hitY;

    laneBeams[lane] = 1.0;
    if (type === 'PERFECT') screenShake = 3.5;
    else if (type === 'GREAT') screenShake = 1.8;

    const count = type === 'PERFECT' ? 26 : type === 'GREAT' ? 18 : 10;
    const colors = type === 'PERFECT' ? ['#ffd700', '#ff007f', '#00f0ff', '#ffffff'] : type === 'GREAT' ? ['#00f0ff', '#7000ff', '#ffffff'] : ['#00ff66', '#ffffff'];

    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (type === 'PERFECT' ? 3 : 2) + Math.random() * 8;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: (type === 'PERFECT' ? 3.5 : 2.5) + Math.random() * 4,
        alpha: 1,
        decay: 0.024 + Math.random() * 0.03,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.25
      });
    }

    shockRings.push({
      x: x,
      y: y,
      r: 8,
      maxR: laneW * 0.75,
      alpha: 1,
      color: type === 'PERFECT' ? '#ffd700' : type === 'GREAT' ? '#00f0ff' : '#00ff66'
    });

    let subText = '';
    let subColor = '#ffd700';
    if (type === 'PERFECT') {
      if (Math.abs(timingOffset) <= 0.022) {
        subText = 'CRITICAL';
        subColor = '#ffe600';
      } else if (timingOffset > 0) {
        subText = 'LATE';
        subColor = '#ffb300';
      } else {
        subText = 'EARLY';
        subColor = '#00f0ff';
      }
    } else if (type === 'GREAT') {
      subText = timingOffset > 0 ? 'LATE' : 'EARLY';
      subColor = timingOffset > 0 ? '#ff9900' : '#00f0ff';
    }

    judgements.push({
      text: type,
      subText: subText,
      subColor: subColor,
      x: x,
      y: y - 32,
      alpha: 1,
      scale: 1.5,
      vy: -1.3,
      color: type === 'PERFECT' ? '#ffd700' : type === 'GREAT' ? '#00f0ff' : type === 'GOOD' ? '#00ff66' : '#ff3366'
    });

    if (navigator.vibrate) {
      try { navigator.vibrate(type === 'PERFECT' ? 18 : 10); } catch (e) {}
    }
  }

  function handleHit(lane) {
    if (!isPlaying || isPaused || !audioCtx) return;
    const curSongTime = (audioCtx.currentTime - songStartTime) - AUDIO_LATENCY_OFFSET;
    lanePulses[lane] = 1.0;

    let closestNote = null;
    let minDiff = Infinity;
    let signedDiff = 0;

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (n.lane === lane && !n.judged) {
        const rawDiff = curSongTime - n.time;
        const absDiff = Math.abs(rawDiff);
        if (absDiff < minDiff && absDiff < 0.22) {
          minDiff = absDiff;
          signedDiff = rawDiff;
          closestNote = n;
        }
      }
    }

    if (closestNote) {
      closestNote.judged = true;
      let jType = 'GOOD';
      let pts = 300;

      if (minDiff <= 0.065) {
        jType = 'PERFECT';
        pts = 1000;
        stats.perfect++;
        groove = Math.min(100, groove + 3.2);
      } else if (minDiff <= 0.125) {
        jType = 'GREAT';
        pts = 750;
        stats.great++;
        groove = Math.min(100, groove + 2.0);
      } else {
        jType = 'GOOD';
        pts = 350;
        stats.good++;
        groove = Math.min(100, groove + 0.8);
      }

      combo++;
      comboScale = 1.4;
      if (combo > maxCombo) maxCombo = combo;
      score += pts + Math.min(combo * 20, 600);

      playHitSfx(jType);
      addHitEffect(lane, jType, signedDiff);
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
    if (lane !== undefined && !e.repeat) {
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

  function getLaneFromCoord(clientX, clientY) {
    if (clientY < height * 0.45) return -1;
    const laneW = trackW / 4;
    const rx = clientX - trackLeft;
    if (rx < -20 || rx > trackW + 20) return -1;
    const lane = Math.floor(rx / laneW);
    return Math.max(0, Math.min(3, lane));
  }

  const activeTouches = new Map();

  container.addEventListener('touchstart', (e) => {
    if (e.target.closest('.modal-card') || e.target.closest('.hud-btn')) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const lane = getLaneFromCoord(t.clientX, t.clientY);
      if (lane !== -1) {
        activeTouches.set(t.identifier, lane);
        touchLanes[lane].classList.add('pressed');
        handleHit(lane);
      }
    }
  }, { passive: false });

  container.addEventListener('touchmove', (e) => {
    if (e.target.closest('.modal-card') || e.target.closest('.hud-btn')) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const newLane = getLaneFromCoord(t.clientX, t.clientY);
      const oldLane = activeTouches.get(t.identifier);
      if (newLane !== -1 && newLane !== oldLane) {
        if (oldLane !== undefined) touchLanes[oldLane].classList.remove('pressed');
        activeTouches.set(t.identifier, newLane);
        touchLanes[newLane].classList.add('pressed');
        handleHit(newLane);
      }
    }
  }, { passive: false });

  function onTouchEndOrCancel(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const oldLane = activeTouches.get(t.identifier);
      if (oldLane !== undefined) {
        touchLanes[oldLane].classList.remove('pressed');
        activeTouches.delete(t.identifier);
      }
    }
  }

  container.addEventListener('touchend', onTouchEndOrCancel, { passive: false });
  container.addEventListener('touchcancel', onTouchEndOrCancel, { passive: false });

  touchLanes.forEach((tl, laneIdx) => {
    tl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      tl.classList.add('pressed');
      handleHit(laneIdx);
    });
    tl.addEventListener('mouseup', () => { tl.classList.remove('pressed'); });
    tl.addEventListener('mouseleave', () => { tl.classList.remove('pressed'); });
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

    ctx.save();
    if (screenShake > 0.1) {
      const sx = (Math.random() - 0.5) * screenShake;
      const sy = (Math.random() - 0.5) * screenShake * 1.5;
      ctx.translate(sx, sy);
      screenShake *= 0.84;
    }

    ctx.fillStyle = '#06060c';
    ctx.fillRect(0, 0, width, height);

    const laneW = trackW / 4;
    const topY = height * 0.08;

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
      if (laneBeams[l] > 0.01) {
        const lx = trackLeft + l * laneW;
        const beamGrad = ctx.createLinearGradient(0, hitY, 0, topY);
        beamGrad.addColorStop(0, `rgba(0, 240, 255, ${laneBeams[l] * 0.45})`);
        beamGrad.addColorStop(0.6, `rgba(255, 0, 128, ${laneBeams[l] * 0.25})`);
        beamGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(lx, topY, laneW, hitY - topY);
        laneBeams[l] *= 0.84;
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

    for (let i = shockRings.length - 1; i >= 0; i--) {
      const r = shockRings[i];
      r.r += (r.maxR - r.r) * 0.18 + 2;
      r.alpha -= 0.045;
      if (r.alpha <= 0) {
        shockRings.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = r.alpha;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (isPlaying && audioCtx) {
      const curSongTime = (audioCtx.currentTime - songStartTime) - AUDIO_LATENCY_OFFSET;
      const noteSpeed = (hitY - topY) / 1.05;

      const progress = Math.max(0, Math.min(100, (curSongTime / songDuration) * 100));
      progressBar.style.width = progress + '%';

      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        if (n.judged) continue;

        const timeDiff = n.time - curSongTime;
        const noteY = hitY - timeDiff * noteSpeed;

        if (timeDiff < -0.19) {
          n.judged = true;
          stats.miss++;
          combo = 0;
          groove = Math.max(0, groove - 6);
          updateHUD();
          judgements.push({
            text: 'MISS',
            subText: '',
            subColor: '',
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
        const nw = Math.min(laneW * 0.74, 80);
        const nh = img ? nw * (img.height / img.width) : nw * 0.5;

        ctx.save();
        ctx.translate(noteX, noteY);

        ctx.shadowColor = `hsl(${n.hue}, 100%, 65%)`;
        ctx.shadowBlur = 18;

        ctx.fillStyle = `hsla(${n.hue}, 100%, 50%, 0.35)`;
        ctx.fillRect(-nw / 2 - 3, -nh / 2 - 3, nw + 6, nh + 6);

        if (img) {
          ctx.drawImage(img, -nw / 2, -nh / 2, nw, nh);
        } else {
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(-nw / 2, -nh / 2, nw, nh);
        }

        ctx.strokeStyle = `hsl(${n.hue}, 100%, 80%)`;
        ctx.lineWidth = 2.5;
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
      j.alpha -= 0.022;
      j.scale += (1.0 - j.scale) * 0.14;
      if (j.alpha <= 0) {
        judgements.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = j.alpha;
      ctx.font = `900 ${Math.floor(24 * j.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = j.color;
      ctx.shadowColor = j.color;
      ctx.shadowBlur = 14;
      ctx.fillText(j.text, j.x, j.y);

      if (j.subText) {
        ctx.font = `800 ${Math.floor(11 * j.scale)}px monospace, sans-serif`;
        ctx.fillStyle = j.subColor;
        ctx.shadowColor = j.subColor;
        ctx.shadowBlur = 8;
        ctx.fillText(j.subText, j.x, j.y + 16);
      }
      ctx.restore();
    }

    comboScale += (1.0 - comboScale) * 0.12;

    if (combo > 2) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      const cFontSize = Math.floor(38 * comboScale);
      ctx.font = `900 ${cFontSize}px monospace, sans-serif`;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18;
      ctx.fillText(combo.toString(), trackLeft + trackW / 2, hitY - 85);
      ctx.font = '700 12px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fillText('COMBO', trackLeft + trackW / 2, hitY - 65);
      ctx.restore();
    }

    ctx.restore();

    requestAnimationFrame(render);
  }

  loadAssets(() => {
    requestAnimationFrame(render);
  });

})();
