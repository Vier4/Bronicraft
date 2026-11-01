'use strict';

// Скин игрока: картинка 16×32, нарисованная «спереди».
// Голова, тело, руки и ноги — это прямоугольники на картинке.
const Skin = (() => {
  const W = 16, H = 32;
  const PARTS = {
    head: { x: 4, y: 0, w: 8, h: 8 },
    body: { x: 4, y: 8, w: 8, h: 12 },
    armL: { x: 0, y: 8, w: 4, h: 12 },
    armR: { x: 12, y: 8, w: 4, h: 12 },
    legL: { x: 4, y: 20, w: 4, h: 12 },
    legR: { x: 8, y: 20, w: 4, h: 12 },
  };
  const PART_NAMES = { head: 'Голова', body: 'Тело', armL: 'Рука', armR: 'Рука', legL: 'Нога', legR: 'Нога' };

  function partAt(x, y) {
    for (const k in PARTS) {
      const p = PARTS[k];
      if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return k;
    }
    return null;
  }

  function defaultSkin() {
    const s = new Array(W * H).fill(null);
    const set = (x, y, c) => { s[y * W + x] = c; };
    const rect = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c); };
    const SKIN = '#f2c29b', HAIR = '#5b3a1e', SHIRT = '#ff7eb6';
    rect(4, 0, 8, 8, SKIN);
    rect(4, 0, 8, 2, HAIR);
    rect(4, 2, 1, 3, HAIR); rect(11, 2, 1, 3, HAIR);
    set(5, 4, '#ffffff'); set(6, 4, '#3a5bd9'); set(9, 4, '#3a5bd9'); set(10, 4, '#ffffff');
    rect(7, 6, 2, 1, '#c0605a');
    rect(4, 8, 8, 12, SHIRT);
    rect(4, 19, 8, 1, '#d9579a');
    [[6, 11], [8, 11], [5, 12], [6, 12], [7, 12], [8, 12], [9, 12], [6, 13], [7, 13], [8, 13], [7, 14]].forEach(([x, y]) => set(x, y, '#ffffff'));
    rect(0, 8, 4, 4, SHIRT); rect(12, 8, 4, 4, SHIRT);
    rect(0, 12, 4, 8, SKIN); rect(12, 12, 4, 8, SKIN);
    rect(4, 20, 8, 9, '#3557a8');
    rect(4, 29, 8, 3, '#444444');
    return s;
  }

  function isValid(skin) {
    return Array.isArray(skin) && skin.length === W * H;
  }

  const px = (skin, x, y) => skin[y * W + x] || '#888888';

  function canvasOf(w, h, colorAt) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      ctx.fillStyle = colorAt(x, y);
      ctx.fillRect(x, y, 1, 1);
    }
    return c;
  }

  function tex(c) {
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  }

  // Материалы для 6 граней части тела: +x, -x, верх, низ, перед, зад
  function partMaterials(skin, part, extra) {
    const p = PARTS[part];
    const front = canvasOf(p.w, p.h, (x, y) => px(skin, p.x + x, p.y + y));
    const top = canvasOf(1, 1, () => px(skin, p.x + 1, p.y));
    const bottom = canvasOf(1, 1, () => px(skin, p.x + 1, p.y + p.h - 1));
    let side = front, back = front;
    if (part === 'head') {
      side = canvasOf(8, 8, (x, y) => px(skin, p.x, p.y + y));
      back = canvasOf(1, 1, () => px(skin, p.x + 1, p.y));
    } else if (part === 'body') {
      // спина без рисунка: каждая строка цвета левого края
      back = canvasOf(p.w, p.h, (x, y) => px(skin, p.x, p.y + y));
    }
    const mk = c => new THREE.MeshBasicMaterial(Object.assign({ map: tex(c) }, extra || {}));
    return [mk(side), mk(side), mk(top), mk(bottom), mk(front), mk(back)];
  }

  // Модель человечка: смотрит вдоль +Z, ноги в точке (0,0,0), рост 1.8
  function buildModel(skin) {
    const s = 1.8 / 32;
    const root = new THREE.Group();
    const mats = [];
    const box = (part, w, h, d) => {
      const m = partMaterials(skin, part);
      mats.push(...m);
      return new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, d * s), m);
    };
    const pivot = (mesh, x, y, oy) => {
      const g = new THREE.Group();
      g.position.set(x * s, y * s, 0);
      mesh.position.y = oy * s;
      g.add(mesh);
      root.add(g);
      return g;
    };
    const body = box('body', 8, 12, 4);
    body.position.y = 18 * s;
    root.add(body);
    const model = {
      root, materials: mats,
      head: pivot(box('head', 8, 8, 8), 0, 24, 4),
      armL: pivot(box('armL', 4, 12, 4), -6, 24, -6),
      armR: pivot(box('armR', 4, 12, 4), 6, 24, -6),
      legL: pivot(box('legL', 4, 12, 4), -2, 12, -6),
      legR: pivot(box('legR', 4, 12, 4), 2, 12, -6),
      dispose() {
        root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        mats.forEach(m => { m.map.dispose(); m.dispose(); });
      },
    };
    return model;
  }

  function headIcon(skin, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const k = size / 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      ctx.fillStyle = px(skin, 4 + x, y);
      ctx.fillRect(x * k, y * k, k, k);
    }
    return c.toDataURL();
  }

  // Редактор: рисуем мышкой по сетке
  function createEditor(cv, opts) {
    const S = 14;
    cv.width = W * S; cv.height = H * S;
    const ctx = cv.getContext('2d');
    const ed = { skin: defaultSkin(), color: '#ff7eb6', tool: 'brush' };

    ed.redraw = () => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        ctx.fillStyle = partAt(x, y) ? (ed.skin[y * W + x] || '#888888') : ((x + y) % 2 ? '#262626' : '#2e2e2e');
        ctx.fillRect(x * S, y * S, S, S);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 1; x < W; x++) { ctx.moveTo(x * S + 0.5, 0); ctx.lineTo(x * S + 0.5, H * S); }
      for (let y = 1; y < H; y++) { ctx.moveTo(0, y * S + 0.5); ctx.lineTo(W * S, y * S + 0.5); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      for (const k in PARTS) {
        const p = PARTS[k];
        ctx.strokeRect(p.x * S + 1, p.y * S + 1, p.w * S - 2, p.h * S - 2);
      }
    };

    const cell = e => {
      const r = cv.getBoundingClientRect();
      return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)];
    };

    function fill(x0, y0) {
      const part = PARTS[partAt(x0, y0)];
      const from = ed.skin[y0 * W + x0];
      if (from === ed.color) return;
      const stack = [[x0, y0]];
      while (stack.length) {
        const [x, y] = stack.pop();
        if (x < part.x || y < part.y || x >= part.x + part.w || y >= part.y + part.h) continue;
        if (ed.skin[y * W + x] !== from) continue;
        ed.skin[y * W + x] = ed.color;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }

    function apply(x, y) {
      if (!partAt(x, y)) return;
      const i = y * W + x;
      if (ed.tool === 'pick') {
        ed.color = ed.skin[i] || '#888888';
        if (opts.onPick) opts.onPick(ed.color);
        return;
      }
      if (ed.tool === 'fill') fill(x, y);
      else ed.skin[i] = ed.color;
      ed.redraw();
    }

    let down = false;
    cv.addEventListener('pointerdown', e => {
      down = true;
      cv.setPointerCapture(e.pointerId);
      apply(...cell(e));
    });
    cv.addEventListener('pointermove', e => {
      if (down && ed.tool === 'brush') apply(...cell(e));
      const [x, y] = cell(e);
      const part = partAt(x, y);
      cv.title = part ? PART_NAMES[part] : '';
    });
    const up = () => { down = false; };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    ed.setSkin = skin => { ed.skin = skin.slice(); ed.redraw(); };
    ed.redraw();
    return ed;
  }

  return { W, H, PARTS, defaultSkin, isValid, partMaterials, buildModel, headIcon, createEditor };
})();
