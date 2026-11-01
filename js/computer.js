'use strict';

// Мод «Компьютер»: свой маленький рабочий стол BroniOS с программами
const Computer = (() => {
  let root, desk, win, winTitle, winBody, clockEl, opts;
  let cleanup = null;

  const APPS = [
    { id: 'snake', name: 'Змейка', icon: '🐍', run: snake },
    { id: 'paint', name: 'Рисовалка', icon: '🎨', run: paint },
    { id: 'calc', name: 'Калькулятор', icon: '🧮', run: calc },
    { id: 'piano', name: 'Пианино', icon: '🎹', run: piano },
    { id: 'notes', name: 'Блокнот', icon: '📝', run: notes },
    { id: 'world', name: 'Мой мир', icon: '🌍', run: myWorld },
  ];

  const store = {
    get(k, d) { try { const v = localStorage.getItem('bronicraft-pc-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('bronicraft-pc-' + k, JSON.stringify(v)); } catch (e) { /* ничего */ } },
  };
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  function init(o) {
    opts = o;
    root = document.getElementById('computer');
    root.innerHTML = '';
    const monitor = h('div', 'pc-monitor');
    const screen = h('div', 'pc-screen');
    desk = h('div', 'pc-desktop');
    desk.appendChild(h('div', 'pc-wallpaper', 'BroniOS'));
    const icons = h('div', 'pc-icons');
    for (const app of APPS) {
      const b = h('button', 'pc-icon');
      b.appendChild(h('span', 'pc-emoji', app.icon));
      b.appendChild(h('span', '', app.name));
      b.addEventListener('click', () => openApp(app));
      icons.appendChild(b);
    }
    desk.appendChild(icons);
    win = h('div', 'pc-window hidden');
    const bar = h('div', 'pc-titlebar');
    winTitle = h('span', '', '');
    const closeBtn = h('button', 'pc-x', '✕');
    closeBtn.addEventListener('click', closeApp);
    bar.append(winTitle, closeBtn);
    winBody = h('div', 'pc-body');
    win.append(bar, winBody);
    const task = h('div', 'pc-taskbar');
    const start = h('span', 'pc-start', 'BroniOS');
    clockEl = h('span', 'pc-clock', '');
    const off = h('button', 'pc-off', 'Выключить');
    off.addEventListener('click', () => opts.onClose());
    task.append(start, clockEl, off);
    screen.append(desk, win, task);
    monitor.appendChild(screen);
    monitor.appendChild(h('div', 'pc-brand', 'BRONI-PC'));
    root.appendChild(monitor);
  }

  function open() {
    closeApp();
    tick();
  }
  function tick() { clockEl.textContent = opts.clock(); }

  function openApp(app) {
    closeApp();
    winTitle.textContent = app.icon + ' ' + app.name;
    winBody.innerHTML = '';
    win.classList.remove('hidden');
    cleanup = app.run(winBody) || null;
    opts.click();
  }
  function closeApp() {
    if (cleanup) cleanup();
    cleanup = null;
    if (win) win.classList.add('hidden');
  }

  // ---------- Змейка ----------
  function snake(body) {
    const N = 18, S = 16;
    const info = h('div', 'pc-row');
    const score = h('span', '', '');
    const best = h('span', '', '');
    info.append(score, best);
    const cv = h('canvas', 'pc-canvas');
    cv.width = cv.height = N * S;
    const hint = h('div', 'pc-hint', 'Стрелки или WASD. Собирай яблоки!');
    body.append(info, cv, hint);
    const ctx = cv.getContext('2d');
    let sn, dir, next, apple, dead, pts;
    const reset = () => {
      sn = [[8, 9], [7, 9], [6, 9]]; dir = [1, 0]; next = dir; dead = false; pts = 0;
      placeApple();
    };
    const placeApple = () => {
      do apple = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)];
      while (sn.some(c => c[0] === apple[0] && c[1] === apple[1]));
    };
    const draw = () => {
      ctx.fillStyle = '#123'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#e33'; ctx.fillRect(apple[0] * S + 2, apple[1] * S + 2, S - 4, S - 4);
      sn.forEach((c, i) => { ctx.fillStyle = i ? '#5c5' : '#8f8'; ctx.fillRect(c[0] * S + 1, c[1] * S + 1, S - 2, S - 2); });
      score.textContent = 'Очки: ' + pts;
      best.textContent = 'Рекорд: ' + store.get('snake', 0);
      if (dead) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = '#fff'; ctx.font = '14px "Press Start 2P", monospace'; ctx.textAlign = 'center';
        ctx.fillText('Конец игры!', cv.width / 2, cv.height / 2 - 10);
        ctx.font = '9px "Press Start 2P", monospace';
        ctx.fillText('Пробел — ещё раз', cv.width / 2, cv.height / 2 + 16);
      }
    };
    const step = () => {
      if (dead) return;
      dir = next;
      const hd = [(sn[0][0] + dir[0] + N) % N, (sn[0][1] + dir[1] + N) % N];
      if (sn.some(c => c[0] === hd[0] && c[1] === hd[1])) {
        dead = true;
        if (pts > store.get('snake', 0)) store.set('snake', pts);
        opts.tone(180, 0.3);
      } else {
        sn.unshift(hd);
        if (hd[0] === apple[0] && hd[1] === apple[1]) { pts++; placeApple(); opts.tone(880, 0.08); }
        else sn.pop();
      }
      draw();
    };
    const key = e => {
      const k = e.code;
      const d = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] }[k];
      if (d) { e.preventDefault(); if (d[0] !== -dir[0] || d[1] !== -dir[1]) next = d; }
      if (k === 'Space') { e.preventDefault(); if (dead) { reset(); draw(); } }
    };
    reset(); draw();
    const timer = setInterval(step, 140);
    document.addEventListener('keydown', key);
    return () => { clearInterval(timer); document.removeEventListener('keydown', key); };
  }

  // ---------- Рисовалка ----------
  function paint(body) {
    const tools = h('div', 'pc-row');
    const cv = h('canvas', 'pc-canvas paint');
    cv.width = 360; cv.height = 230;
    const ctx = cv.getContext('2d');
    const saved = store.get('paint', null);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    if (saved) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0); img.src = saved; }
    let color = '#e33', size = 6, down = false, last = null;
    ['#000', '#fff', '#e33', '#f90', '#fd3', '#4c4', '#39f', '#36c', '#a4c', '#f7b', '#8b5a2b'].forEach(c => {
      const b = h('button', 'pc-swatch');
      b.style.background = c;
      b.addEventListener('click', () => { color = c; });
      tools.appendChild(b);
    });
    [3, 6, 12].forEach(sz => {
      const b = h('button', 'pc-btn', sz === 3 ? 'тонко' : sz === 6 ? 'средне' : 'толсто');
      b.addEventListener('click', () => { size = sz; });
      tools.appendChild(b);
    });
    const clear = h('button', 'pc-btn', 'Стереть всё');
    clear.addEventListener('click', () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); });
    tools.appendChild(clear);
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * cv.width, (e.clientY - r.top) / r.height * cv.height]; };
    const line = p => {
      ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(...(last || p)); ctx.lineTo(...p); ctx.stroke();
      last = p;
    };
    cv.addEventListener('pointerdown', e => { down = true; last = null; cv.setPointerCapture(e.pointerId); line(pos(e)); });
    cv.addEventListener('pointermove', e => { if (down) line(pos(e)); });
    cv.addEventListener('pointerup', () => { down = false; store.set('paint', cv.toDataURL()); });
    body.append(tools, cv);
    return () => store.set('paint', cv.toDataURL());
  }

  // ---------- Калькулятор ----------
  function calc(body) {
    const disp = h('div', 'pc-display', '0');
    const grid = h('div', 'pc-calc');
    let cur = '0', acc = null, op = null, fresh = false;
    const show = () => { disp.textContent = cur; };
    const apply = () => {
      const a = acc, b = parseFloat(cur);
      if (op === '+') return a + b;
      if (op === '−') return a - b;
      if (op === '×') return a * b;
      if (op === '÷') return b === 0 ? NaN : a / b;
      return b;
    };
    const fmt = v => (isNaN(v) || !isFinite(v) ? 'Ошибка' : String(Math.round(v * 1e8) / 1e8));
    ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+', 'C'].forEach(k => {
      const b = h('button', 'pc-btn' + (k === 'C' ? ' wide' : ''), k);
      b.addEventListener('click', () => {
        if (/[0-9]/.test(k)) { cur = (fresh || cur === '0' || cur === 'Ошибка') ? k : cur + k; fresh = false; }
        else if (k === '.') { if (fresh) { cur = '0'; fresh = false; } if (!cur.includes('.')) cur += '.'; }
        else if (k === 'C') { cur = '0'; acc = null; op = null; }
        else if (k === '=') { if (op) { cur = fmt(apply()); acc = null; op = null; fresh = true; } }
        else { if (op && !fresh) cur = fmt(apply()); acc = parseFloat(cur); op = k; fresh = true; }
        show();
        opts.tone(600, 0.03);
      });
      grid.appendChild(b);
    });
    body.append(disp, grid);
  }

  // ---------- Пианино ----------
  function piano(body) {
    const NOTES = [['До', 261.6, 'KeyA'], ['Ре', 293.7, 'KeyS'], ['Ми', 329.6, 'KeyD'], ['Фа', 349.2, 'KeyF'],
      ['Соль', 392, 'KeyG'], ['Ля', 440, 'KeyH'], ['Си', 493.9, 'KeyJ'], ['До', 523.3, 'KeyK']];
    const keys = h('div', 'pc-piano');
    const els = NOTES.map(([n, f, code]) => {
      const k = h('button', 'pc-key');
      k.appendChild(h('b', '', n));
      k.appendChild(h('small', '', code.slice(3)));
      const play = () => { opts.tone(f, 0.6, 'triangle'); k.classList.add('down'); setTimeout(() => k.classList.remove('down'), 150); };
      k.addEventListener('pointerdown', play);
      keys.appendChild(k);
      return { code, play };
    });
    const key = e => { const n = els.find(x => x.code === e.code); if (n && !e.repeat) { e.preventDefault(); n.play(); } };
    document.addEventListener('keydown', key);
    body.append(keys, h('div', 'pc-hint', 'Нажимай на клавиши мышкой или кнопками A S D F G H J K'));
    return () => document.removeEventListener('keydown', key);
  }

  // ---------- Блокнот ----------
  function notes(body) {
    const t = h('textarea', 'pc-notes');
    t.value = store.get('notes', 'Мои заметки:\n');
    t.addEventListener('input', () => store.set('notes', t.value));
    body.appendChild(t);
    setTimeout(() => t.focus(), 0);
  }

  // ---------- Мой мир ----------
  function myWorld(body) {
    const list = h('div', 'pc-info');
    for (const [k, v] of opts.worldInfo()) {
      const row = h('div', 'pc-info-row');
      row.append(h('span', '', k), h('b', '', v));
      list.appendChild(row);
    }
    body.appendChild(list);
  }

  // программы можно запускать и в телефоне
  return { init, open, closeApp, tick, apps: { snake, paint, calc, piano, notes } };
})();
