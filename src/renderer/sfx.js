/**
 * Original PS1-style field-menu tones. Single AudioContext; sources disconnected on end.
 */
(function (global) {
  'use strict';

  const RECIPES = {
    cursor: { total: 0.09, notes: [{ f: 1480, start: 0, dur: 0.055, vol: 0.32 }, { f: 2220, start: 0, dur: 0.04, vol: 0.12 }] },
    up: { total: 0.08, notes: [{ f: 1560, start: 0, dur: 0.05, vol: 0.3 }] },
    down: { total: 0.09, notes: [{ f: 1320, start: 0, dur: 0.055, vol: 0.3 }] },
    confirm: { total: 0.2, notes: [{ f: 784, start: 0, dur: 0.07, vol: 0.26 }, { f: 1175, start: 0.06, dur: 0.11, vol: 0.3 }] },
    cancel: { total: 0.2, notes: [{ f: 990, start: 0, dur: 0.07, vol: 0.26 }, { f: 587, start: 0.055, dur: 0.12, vol: 0.28 }] },
    open: { total: 0.24, notes: [{ f: 523, start: 0, dur: 0.06, vol: 0.2 }, { f: 784, start: 0.05, dur: 0.07, vol: 0.22 }, { f: 1047, start: 0.1, dur: 0.1, vol: 0.24 }] }
  };

  let ctx = null;
  const buffers = new Map();
  const live = new Set();
  let enabled = true;
  let lastAt = 0;
  let lastCue = null;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function synth(c, cue) {
    const rec = RECIPES[cue];
    const n = Math.max(1, Math.floor(c.sampleRate * rec.total));
    const data = new Float32Array(n);
    rec.notes.forEach((note) => {
      const s0 = Math.floor(note.start * c.sampleRate);
      const sn = Math.floor(note.dur * c.sampleRate);
      for (let i = 0; i < sn; i++) {
        const idx = s0 + i;
        if (idx >= n) break;
        const t = i / c.sampleRate;
        const rel = 1 - i / sn;
        const env = Math.min(1, t / 0.003) * rel * rel;
        const sq = Math.sin(2 * Math.PI * note.f * t) >= 0 ? 1 : -1;
        data[idx] += sq * env * note.vol;
      }
    });
    const buf = c.createBuffer(1, n, c.sampleRate);
    buf.copyToChannel(data, 0);
    return buf;
  }

  function play(cue) {
    if (!enabled || !RECIPES[cue]) return;
    const now = performance.now();
    if (cue === lastCue && now - lastAt < 55) return;
    lastAt = now;
    lastCue = cue;
    const c = getCtx();
    let buf = buffers.get(cue);
    if (!buf) {
      buf = synth(c, cue);
      buffers.set(cue, buf);
    }
    const src = c.createBufferSource();
    const g = c.createGain();
    g.gain.value = 0.5;
    src.buffer = buf;
    src.connect(g);
    g.connect(c.destination);
    live.add(src);
    src.onended = function () {
      try { src.disconnect(); g.disconnect(); } catch (_) {}
      live.delete(src);
    };
    try { src.start(); } catch (_) { live.delete(src); }
  }

  function setEnabled(on) {
    enabled = !!on;
    if (!enabled) {
      live.forEach((src) => {
        try { src.stop(); } catch (_) {}
        try { src.disconnect(); } catch (_) {}
      });
      live.clear();
    }
  }

  function dispose() {
    live.forEach((src) => {
      try { src.stop(); } catch (_) {}
      try { src.disconnect(); } catch (_) {}
    });
    live.clear();
    buffers.clear();
    if (ctx) {
      ctx.close();
      ctx = null;
    }
  }

  global.xenoSfx = { play, setEnabled, dispose };
})(window);
