(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  if (typeof THREE === 'undefined') {
    document.body.insertAdjacentHTML('beforeend',
      '<div class="screen"><p>Не удалось загрузить three.js — проверь интернет и обнови страницу.</p></div>');
    return;
  }

  // ---------- Настройки ----------
  const RENDER_DIST = 6;
  const DAY_LENGTH = 600;          // секунд на сутки
  const SENS = 0.0022;
  let PW = 0.3, PH = 1.8, EYE = 1.62;
  let pScale = 1;                  // мод «Мини-мир»: 0.25, когда герой уменьшился
  const REACH = 5, ATTACK_REACH = 3.5;
  const MAX_HP = 20, MAX_AIR = 10;
  const MENU_SEED = 20251;
  const CREATIVE_HOTBAR = [B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.PLANKS, B.LOG, B.GLASS, B.BRICK, B.STONE_BRICKS];
  const DIFFICULTY = {
    peaceful: { name: 'Мирный', mobs: 0, dmg: 0, regen: 1, speed: 0 },
    easy: { name: 'Лёгкий', mobs: 3, dmg: 1, regen: 4, speed: 2.0 },
    normal: { name: 'Нормальный', mobs: 5, dmg: 2, regen: 8, speed: 2.5 },
    hard: { name: 'Сложный', mobs: 9, dmg: 4, regen: 16, speed: 3.0, loseItems: true },
  };
  const MODES = { survival: 'Выживание', creative: 'Творчество' };

  // ---------- Рендер ----------
  const canvas = $('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const FOG_NEAR = RENDER_DIST * CS * 0.55, FOG_FAR = RENDER_DIST * CS - 4;
  scene.fog = new THREE.Fog(0x87bdf5, FOG_NEAR, FOG_FAR);
  const skyColor = new THREE.Color(0x87bdf5);
  scene.background = skyColor;

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 1200);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  const nearest = t => { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
  const atlasTex = nearest(new THREE.CanvasTexture(ATLAS.canvas));

  const materials = {
    opaque: new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true }),
    cutout: new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: 0.5 }),
    water: new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide }),
  };
  // свет факелов и ламп в обычных (без шейдеров) материалах мира
  for (const k in materials) {
    materials[k].onBeforeCompile = sh => {
      sh.vertexShader = 'attribute float aLight; varying float vBlockLight;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBlockLight = aLight;');
      sh.fragmentShader = 'varying float vBlockLight;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + Shaders.BLOCK_LIGHT_GLSL);
    };
    materials[k].customProgramCacheKey = () => 'bronicraft-light-' + k;
  }
  // материалы, которые темнеют ночью (кроме блоков мира)
  const litMaterials = [];

  // ---------- Моды ----------
  const shaderFx = Shaders.create(renderer, materials);
  scene.add(shaderFx.sky, shaderFx.clouds);
  let mods = Store.getMods();
  const modOn = id => !!(mods[id] && mods[id].installed && mods[id].enabled);
  const worldMaterials = () => (modOn('shaders') ? shaderFx.materials : materials);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- Небо: солнце, луна, звёзды, облака ----------
  const SKY_DAY = new THREE.Color(0x87bdf5), SKY_NIGHT = new THREE.Color(0x0b1026), SKY_SUNSET = new THREE.Color(0xf08a4b);
  const WATER_FOG = new THREE.Color(0x1a3a80);
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }));
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: 0xe6ecff, fog: false }));
  scene.add(sun, moon);

  const starPos = [];
  for (let i = 0; i < 900; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    starPos.push(r * Math.cos(th) * 500, u * 500, r * Math.sin(th) * 500);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0, depthWrite: false,
  }));
  scene.add(stars);

  // снегопад для зимних карт: снежинки падают вокруг камеры
  const SNOW_N = 1600, SNOW_BOX = 36;
  const snowPos = new Float32Array(SNOW_N * 3);
  for (let i = 0; i < SNOW_N; i++) {
    snowPos[i * 3] = (Math.random() - 0.5) * SNOW_BOX;
    snowPos[i * 3 + 1] = Math.random() * SNOW_BOX;
    snowPos[i * 3 + 2] = (Math.random() - 0.5) * SNOW_BOX;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowfall = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.9, depthWrite: false }));
  snowfall.frustumCulled = false;
  snowfall.visible = false;
  scene.add(snowfall);
  function updateSnow(dt) {
    snowfall.visible = !!worldMeta && (worldMeta.preset === 'lenin_winter' || worldMeta.preset === 'rus_winter') && !player.headInWater;
    if (!snowfall.visible) return;
    const t = performance.now() / 1000;
    for (let i = 0; i < SNOW_N; i++) {
      let y = snowPos[i * 3 + 1] - dt * (1.4 + (i % 5) * 0.25);
      if (y < 0) y += SNOW_BOX;
      snowPos[i * 3 + 1] = y;
      snowPos[i * 3] += Math.sin(t + i) * dt * 0.3;
    }
    snowGeo.attributes.position.needsUpdate = true;
    snowfall.position.set(camera.position.x, camera.position.y - SNOW_BOX / 2, camera.position.z);
  }

  // Облака: бесшовная текстура + шейдер, который растворяет их вдали
  const cloudTex = (() => {
    const N = 128, c = document.createElement('canvas');
    c.width = c.height = N;
    const ctx = c.getContext('2d'), img = ctx.createImageData(N, N);
    const pn = Noise.createPerlin(4242);
    const f = (x, y) => pn.fbm2(x / 9, y / 9, 3);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = (f(x, y) * (N - x) * (N - y) + f(x - N, y) * x * (N - y) + f(x, y - N) * (N - x) * y + f(x - N, y - N) * x * y) / (N * N);
      const k = (y * N + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
      img.data[k + 3] = v > 0.06 ? 255 : 0;
    }
    ctx.putImageData(img, 0, 0);
    const t = nearest(new THREE.CanvasTexture(c));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const CLOUD_SIZE = 640;   // 5 блоков на пиксель текстуры
  const cloudMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTex: { value: cloudTex }, uCam: { value: new THREE.Vector2() }, uWind: { value: 0 }, uColor: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: `
      varying vec2 vW;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform sampler2D uTex; uniform float uWind; uniform vec3 uColor; uniform vec2 uCam; varying vec2 vW;
      void main() {
        float a = texture2D(uTex, vec2(vW.x + uWind, vW.y) / ${CLOUD_SIZE.toFixed(1)}).a;
        a *= 0.85 * (1.0 - smoothstep(250.0, 650.0, length(vW - uCam)));
        if (a < 0.02) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  const clouds = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), cloudMat);
  clouds.rotation.x = -Math.PI / 2;
  clouds.frustumCulled = false;
  scene.add(clouds);

  // ---------- Рамка выбранного блока и трещины ----------
  const highlight = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
    new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }));
  highlight.visible = false;
  scene.add(highlight);

  const crackTextures = (() => {
    const out = [], rnd = Noise.mulberry32(77);
    let prev = null;
    for (let st = 0; st < 6; st++) {
      const c = document.createElement('canvas');
      c.width = c.height = 16;
      const ctx = c.getContext('2d');
      if (prev) ctx.drawImage(prev, 0, 0);
      ctx.fillStyle = '#000';
      for (let k = 0; k < 3; k++) {
        let x = 4 + rnd() * 8, y = 4 + rnd() * 8;
        for (let i = 0; i < 5 + st; i++) {
          ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
          x += Math.round(rnd() * 2 - 1); y += Math.round(rnd() * 2 - 1);
        }
      }
      prev = c;
      out.push(nearest(new THREE.CanvasTexture(c)));
    }
    return out;
  })();
  const crackMat = new THREE.MeshBasicMaterial({ map: crackTextures[0], transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const crack = new THREE.Mesh(new THREE.BoxGeometry(1.002, 1.002, 1.002), crackMat);
  crack.visible = false;
  scene.add(crack);

  // ---------- Рука и предмет в руке ----------
  const geoCache = [];
  function blockGeometry(id) {
    if (geoCache[id]) return geoCache[id];
    const pos = [], uv = [], col = [], idx = [];
    const b = BLOCKS[id];
    if (b.quads) {
      for (const q of b.quads) {
        const base = pos.length / 3;
        for (let k = 0; k < 4; k++) {
          pos.push(q.pos[k * 3] - 0.5, q.pos[k * 3 + 1] - 0.5, q.pos[k * 3 + 2] - 0.5);
          uv.push(q.uv[k * 2], q.uv[k * 2 + 1]);
          col.push(q.shade, q.shade, q.shade);
        }
        idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
      }
    } else for (const f of FACES) {
      const base = pos.length / 3;
      for (const c of f.corners) {
        pos.push(c[0] - 0.5, c[1] - 0.5, c[2] - 0.5);
        const t = tileUV(b.tex[f.texSlot], c[3], c[4]);
        uv.push(t[0], t[1]);
        col.push(f.shade, f.shade, f.shade);
      }
      idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    geoCache[id] = g;
    return g;
  }
  const hand = new THREE.Group();
  camera.add(hand);
  const heldMat = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: 0.5, depthTest: false, fog: false });
  litMaterials.push(heldMat);
  const heldBlock = new THREE.Mesh(blockGeometry(B.GRASS), heldMat);
  heldBlock.scale.setScalar(0.4);
  heldBlock.rotation.set(0.15, 0.75, 0);
  const itemMats = {};
  function itemMaterial(id) {
    if (!itemMats[id]) {
      itemMats[id] = new THREE.MeshBasicMaterial({ map: nearest(new THREE.CanvasTexture(itemCanvas(id))), alphaTest: 0.5, side: THREE.DoubleSide, depthTest: false, fog: false });
      litMaterials.push(itemMats[id]);
    }
    return itemMats[id];
  }
  const heldItem = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), itemMaterial(ITEM.STICK));
  heldItem.scale.setScalar(0.6);
  heldItem.position.set(0.05, 0.12, 0);
  heldItem.rotation.set(0, -0.6, 0.35);
  let heldArm = null;
  hand.add(heldBlock, heldItem);
  [heldBlock, heldItem].forEach(m => { m.renderOrder = 999; });
  let swingT = 0, bobPhase = 0;

  // ---------- Модель игрока (видна в меню и при виде со стороны) ----------
  let playerModel = null, nameTag = null;
  function makeNameTag(text) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.font = '28px "Press Start 2P", monospace';
    const w = Math.ceil(ctx.measureText(text).width) + 24;
    c.width = w; c.height = 44;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, w, 44);
    ctx.font = '28px "Press Start 2P", monospace';
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 12, 24);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: true }));
    s.scale.set(w / 44 * 0.35, 0.35, 1);
    s.position.y = 2.15;
    return s;
  }
  function rebuildPlayer() {
    const skin = profile && Skin.isValid(profile.skin) ? profile.skin : Skin.defaultSkin();
    if (playerModel) {
      scene.remove(playerModel.root);
      playerModel.materials.forEach(m => litMaterials.splice(litMaterials.indexOf(m), 1));
      playerModel.dispose();
    }
    playerModel = Skin.buildModel(skin);
    litMaterials.push(...playerModel.materials);
    nameTag = makeNameTag(profile ? profile.name : 'Игрок');
    playerModel.root.add(nameTag);
    scene.add(playerModel.root);

    if (heldArm) {
      hand.remove(heldArm);
      heldArm.material.forEach(m => { litMaterials.splice(litMaterials.indexOf(m), 1); m.map.dispose(); m.dispose(); });
    }
    const armMats = Skin.partMaterials(skin, 'armR', { depthTest: false, fog: false });
    litMaterials.push(...armMats);
    heldArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.28), armMats);
    heldArm.renderOrder = 999;
    heldArm.position.set(0.1, -0.15, 0.1);
    heldArm.rotation.set(-1.1, 0.1, 0.25);
    hand.add(heldArm);
    updateHand();
  }

  // ---------- Парашют ----------
  const chute = new THREE.Group();
  {
    const cols = [0xff5a5a, 0xffffff, 0x4a8cff, 0xffffff, 0xff5a5a];
    cols.forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 3.2), new THREE.MeshBasicMaterial({ color: c }));
      m.position.set(-1.4 + i * 0.7, 3.2 - Math.abs(i - 2) * 0.25, 0);
      m.rotation.z = (i - 2) * 0.25;
      chute.add(m);
    });
    for (const [x, z] of [[-1.5, -1.4], [1.5, -1.4], [-1.5, 1.4], [1.5, 1.4]]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2, 0.03), new THREE.MeshBasicMaterial({ color: 0x333333 }));
      line.position.set(x / 2, 2, z / 2);
      line.rotation.set(-z * 0.25, 0, x * 0.25);
      chute.add(line);
    }
  }
  chute.visible = false;
  scene.add(chute);

  // ---------- Частицы ----------
  const particleGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);
  const particleMats = {};
  const particles = [];
  function spawnParticles(x, y, z, key, color, count) {
    if (!particleMats[key]) {
      particleMats[key] = new THREE.MeshBasicMaterial({ color: color.clone() });
      particleMats[key].userData.base = color.clone();
    }
    for (let i = 0; i < (count || 14); i++) {
      const m = new THREE.Mesh(particleGeo, particleMats[key]);
      m.position.set(x + 0.2 + Math.random() * 0.6, y + 0.2 + Math.random() * 0.6, z + 0.2 + Math.random() * 0.6);
      scene.add(m);
      particles.push({
        m, life: 0.5 + Math.random() * 0.4,
        v: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4 + 1, (Math.random() - 0.5) * 4),
      });
    }
  }
  function blockParticles(x, y, z, id) {
    const a = ATLAS.avg[BLOCKS[id].tex[2]];
    spawnParticles(x, y, z, 'b' + id, new THREE.Color(a[0], a[1], a[2]));
  }
  const MOB_COLOR = new THREE.Color(0x5a3d85);
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { scene.remove(p.m); particles.splice(i, 1); continue; }
      p.v.y -= 18 * dt;
      const nx = p.m.position.x + p.v.x * dt, ny = p.m.position.y + p.v.y * dt, nz = p.m.position.z + p.v.z * dt;
      if (IS_SOLID[world.getBlock(Math.floor(nx), Math.floor(ny), Math.floor(nz))]) p.v.set(0, 0, 0);
      else p.m.position.set(nx, ny, nz);
      p.m.scale.setScalar(Math.min(1, p.life * 2));
    }
  }
  function clearParticles() {
    for (const p of particles) scene.remove(p.m);
    particles.length = 0;
  }

  // ---------- Звуки (синтезируются на лету) ----------
  let actx = null;
  function audio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function noiseBurst(dur, freq, vol) {
    const a = audio(); if (!a) return;
    const len = Math.max(1, (a.sampleRate * dur) | 0);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = a.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start();
  }
  function tone(freq, dur, vol, type, slideTo) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur);
  }
  const SOUND = {
    stone: { freq: 1600 }, soft: { freq: 700 }, wood: { freq: 1000, tone: 190 },
    glass: { freq: 5000, tone: 1400 }, wool: { freq: 420 }, water: { freq: 900 },
  };
  function blockSound(id, kind) {
    const cfg = SOUND[BLOCKS[id].sound] || SOUND.stone;
    const vol = kind === 'step' || kind === 'hit' ? 0.06 : kind === 'place' ? 0.25 : 0.35;
    const dur = kind === 'step' || kind === 'hit' ? 0.07 : kind === 'place' ? 0.09 : 0.2;
    noiseBurst(dur, cfg.freq * (0.9 + Math.random() * 0.2), vol);
    if (cfg.tone && kind !== 'step' && kind !== 'hit') tone(cfg.tone * (0.95 + Math.random() * 0.1), 0.12, vol * 0.4);
  }
  const popSound = () => tone(600 + Math.random() * 200, 0.08, 0.12, 'square', 900);

  // ---------- Состояние игры ----------
  let world = null;
  let worldMeta = null;            // null — это фоновый мир меню
  let state = 'menu';              // profile | menu | create | loading | playing | paused | inventory | dead
  let timeOfDay = 0.3;
  let inv = new Inventory(), slot = 0, cursor = null;
  let worldReady = false, playerPlaced = false;
  let spawnPoint = null;
  let profile = null;
  let health = MAX_HP, air = MAX_AIR, regenTimer = 0, drownTimer = 0, invuln = 0, hurtFlash = 0, lavaTimer = 0;
  let fallStartY = null;
  let camMode = 0;                 // 0 — глазами героя, 1 — сзади, 2 — спереди
  const CAM_NAMES = ['Камера: глазами героя', 'Камера: сзади', 'Камера: спереди'];
  let showInfo = true, menuAngle = 0, dayFactor = 1, lightLevel = 1;
  const keys = {};
  const player = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0,
    onGround: false, flying: false, inWater: false, headInWater: false, moving: false, sprinting: false,
  };
  const mobs = new Mobs(scene);
  const cars = new Cars(scene);
  const planes = new Planes(scene);
  const trains = new Trains(scene);
  let riding = null, atTable = false, parachute = false, camHint = false;

  const isCreative = () => !!worldMeta && worldMeta.mode === 'creative';
  const difficulty = () => DIFFICULTY[(worldMeta && worldMeta.difficulty) || 'peaceful'];
  const current = () => inv.slots[slot];
  const currentId = () => (current() ? current().id : 0);

  function loadWorldInstance(seed, edits, preset) {
    physClear();
    WE.p1 = WE.p2 = null; WE.undo.length = 0; WE.redo.length = 0;
    if (typeof weUpdateBox === 'function') weUpdateBox();
    if (world) world.dispose();
    clearParticles();
    mobs.clear();
    world = new World(scene, worldMaterials(), seed, edits, preset);
    cars.clear();
    planes.clear();
    trains.clear();
    for (const p of primed) scene.remove(p.mesh);
    primed.length = 0;
    leaveCar();
    parachute = false;
    world.setRenderDist(RENDER_DIST);
    worldReady = false;
  }

  function startMenuWorld() {
    worldMeta = null;
    loadWorldInstance(MENU_SEED, {});
    const s = world.findSpawn();
    player.pos.set(s.x + 0.5, world.heightAt(s.x, s.z) + 1, s.z + 0.5);
    playerPlaced = false;
    timeOfDay = 0.3;
  }

  function playWorld(meta) {
    const data = Store.loadWorld(meta.id) || {};
    worldMeta = meta;
    loadWorldInstance(meta.seed, data.edits || {}, meta.preset);
    world.loadMinis(data.minis);
    for (const k in data.boxes || {}) world.boxes.set(k, data.boxes[k]);
    cams.clear(); camSel = null;
    for (const [x, y, z, name] of data.cams || []) addCam(x, y, z, name);
    miniBank = data.miniBank || {};
    miniMode = false;
    setSmall(!!data.small, true);
    setMorph(data.morph && MOB_TYPES[data.morph] ? data.morph : null, true);
    if (data.spawn) spawnPoint = data.spawn;
    else { const s = world.findSpawn(); spawnPoint = { x: s.x + 0.5, z: s.z + 0.5 }; }
    player.vel.set(0, 0, 0);
    if (data.player) {
      const p = data.player;
      player.pos.set(p.x, p.y, p.z);
      player.yaw = p.yaw || 0; player.pitch = p.pitch || 0;
      player.flying = !!p.flying && isCreative();
      playerPlaced = true;
    } else {
      player.pos.set(spawnPoint.x, world.heightAt(Math.floor(spawnPoint.x), Math.floor(spawnPoint.z)) + 1, spawnPoint.z);
      player.yaw = 0; player.pitch = 0; player.flying = false;
      playerPlaced = false;
    }
    (data.cars || []).forEach(c => cars.add(c.x, c.y, c.z, c.yaw, c.color, c.style));
    (data.planes || []).forEach(p => planes.add(p.x, p.y, p.z, p.yaw, p.colors, p.type));
    (data.trains || []).forEach(t => trains.add(t));
    metroSpawned = !!data.metroV1;
    phoneState = Object.assign({ battery: 0, installed: [], wallpaper: 0, photos: [] }, data.phone || {});   // новый телефон — разряжен
    flashlightOn = false;
    if (meta.preset === 'city' && !data.metroV1 && modOn('metro')) {
      // поезд на линии и запасные поезда в депо
      trains.add({ axis: 'z', cross: METRO.cross + 0.5, y: METRO.y, s: 2 * 32 + 19, dir: 1, color: 0xd03030 });
      [[-9, 0x3070d0], [-3, 0x30a050], [9, 0xf09020], [15, 0x9050c0]].forEach(([x, c]) =>
        trains.add({ axis: 'z', cross: x + 0.5, y: METRO.y, s: 395, dir: 1, color: c, parked: true }));
      metroSpawned = true;
    }
    if (meta.preset === 'city' && !data.cars) {
      // в новом городе на дорогах уже стоят машины
      const colors = [0xdd3030, 0x3570dd, 0xf2c228, 0xf0f0f0, 0x2a2a2e];
      for (let i = 0; i < 8; i++) {
        const lane = i % 2 ? 1.5 : 5.5;
        cars.add(Math.floor(i / 2) * 32 - 32 + lane, FLAT_G + 1, 14 + (i % 4) * 4, i % 2 ? Math.PI : 0, colors[i % colors.length]);
      }
    }
    if (meta.preset === 'samo' && !data.cars) {
      const colors = [0xf0f0f0, 0x2a2a2e, 0xdd3030, 0x3570dd, 0x808890, 0xf2c228];
      let n = 0;
      // многоуровневый паркинг: машины на всех шести уровнях
      for (let f = 0; f < 6; f++) for (let z = -50; z <= -4; z += 3) for (const x of [108.5, 116.5]) {
        if (Noise.hash3(z, f, x, meta.seed) > 0.5) continue;
        cars.add(x, FLAT_G + 3 * f + 1, z + 0.5, 0, colors[n++ % colors.length]);
      }
      // гостевая парковка по периметру (во двор машины не заезжают)
      for (let z = -70; z <= 70; z += 6) for (const x of [-101.5, 101.5]) {
        if (x > 0 && z >= -62 && z <= 2) continue;
        if (Noise.hash3(z, 7, x, meta.seed) < 0.55) cars.add(x, FLAT_G + 1, z + 0.5, Math.PI / 2, colors[n++ % colors.length]);
      }
    }
    if (meta.preset === 'river' && !data.cars) {
      // машины у тротуаров на набережных острова
      const colors = [0xf0f0f0, 0x2a2a2e, 0xdd3030, 0x3570dd, 0x808890, 0xf2c228];
      let n = 0;
      for (const z of [-74.5, 63.5]) for (let x = -108; x <= 108; x += 9) {
        if (RIVER.XL.some(l => Math.abs(x - l) < 14) || Noise.hash3(x, z, 5, meta.seed) > 0.55) continue;
        cars.add(x + 0.5, FLAT_G + 1, z + 0.5, Math.PI / 2 * (z < 0 ? 1 : -1), colors[n++ % colors.length]);
      }
    }
    if ((meta.preset === 'rus' || meta.preset === 'rus_winter') && !data.cars) {
      // машины на стихийных парковках во дворах хрущёвок
      const colors = [0xf0f0f0, 0x2a2a2e, 0xdd3030, 0x3570dd, 0x808890, 0x3f7d3a];
      [[0, 0], [2, 0], [2, 1], [2, 2]].forEach(([bx, bz], bi) => {
        for (let k = 0; k < 6; k++) {
          if (Noise.hash3(bx * 5 + k, bz, 7, meta.seed) > 0.6) continue;
          const x = RUS.T0 + bx * RUS.P + 9 + 37 + k * 5, z = RUS.T0 + bz * RUS.P + 9 + 25 + (k % 2) * 8;
          cars.add(x + 0.5, FLAT_G + 1, z + 0.5, k % 2 ? 0 : Math.PI, colors[(bi * 2 + k) % colors.length]);
        }
      });
    }
    if ((meta.preset === 'lenin' || meta.preset === 'lenin_winter') && !data.cars) {
      // машины на парковках во дворах
      const colors = [0xdd3030, 0x3570dd, 0xf2c228, 0xf0f0f0, 0x2a2a2e];
      for (const seg of [-1, 0, 1]) for (const side of [1, -1]) for (const row of [0, 1]) for (let k = 0; k < 6; k++) {
        if (Noise.hash3(seg * 13 + k, row, side, meta.seed) > 0.55) continue;
        const az = row ? 39 : 25;
        const z = side > 0 ? az + 0.5 : -az + 0.5;
        const yaw = (row === 0) === (side > 0) ? 0 : Math.PI;
        cars.add(seg * 64 + 36 + 4 * k + 0.5, FLAT_G + 1, z, yaw, colors[(k + row * 2 + (side > 0 ? 0 : 1)) % colors.length]);
      }
    }
    if (meta.preset === 'zhk' && !data.cars) {
      // машины жильцов стоят на подземной парковке
      const colors = [0x2a2a2e, 0xf0f0f0, 0x3570dd, 0xdd3030, 0x808890, 0xf2c228];
      let n = 0;
      for (const z of [-34, -22, -10, 2, 14, 26]) for (let x = -52; x <= 56; x += 4) {
        if (Noise.hash3(x, z, 3, meta.seed) > 0.28) continue;
        if (ZHK.buildings.some(b => x >= b.x0 + 8 && x <= b.x0 + b.sections * ZHK.SW && ((x - b.x0) % ZHK.SW >= 8 && (x - b.x0) % ZHK.SW <= 13))) continue;   // не загораживаем лифты
        cars.add(x + 0.5, ZHK.PF + 1, z + 0.5, Noise.hash3(x, z, 4, meta.seed) < 0.5 ? 0 : Math.PI, colors[n++ % colors.length]);
      }
    }
    if (meta.preset === 'city' && !data.cityV2) {
      // полиция у участка и скорая у больницы (и в старых городах тоже)
      const lot = (l, ix, iz) => [l[0] * 32 + 9 + ix + 0.5, l[1] * 32 + 9 + iz + 0.5];
      for (const ix of [6, 13]) { const [x, z] = lot(POLICE_LOT, ix, 2); cars.add(x, FLAT_G + 1, z, Math.PI / 2, 0xf0f0f0, 'police'); }
      { const [x, z] = lot(HOSPITAL_LOT, 4, 1.5); cars.add(x, FLAT_G + 1, z, Math.PI / 2, 0xf0f0f0, 'ambulance'); }
      // самолёты на перроне аэропорта
      const ap = (ax, az) => [AIRPORT.x0 + ax + 0.5, AIRPORT.z0 + az + 0.5];
      { const [x, z] = ap(66, 60); planes.add(x, FLAT_G + 1, z, -Math.PI / 2, [0xf2f2f5, 0x2a5ad0], 'boeing'); }
      { const [x, z] = ap(36, 56); planes.add(x, FLAT_G + 1, z, Math.PI, [0xe03535, 0xf5f5f5]); }
      { const [x, z] = ap(100, 56); planes.add(x, FLAT_G + 1, z, Math.PI, [0xf2c828, 0xc83c28]); }
    }
    inv = Inventory.from(data.inv);
    inv.slots.forEach(st => { if (st && st.id === B.BRONYA) st.id = B.CONCRETE_PINK; });   // Броня-блок убран
    if (!data.inv && isCreative()) CREATIVE_HOTBAR.forEach((id, i) => { inv.slots[i] = { id, n: 64 }; });
    slot = data.slot >= 0 && data.slot < 9 ? data.slot : 0;
    cursor = null;
    timeOfDay = typeof data.time === 'number' ? data.time : 0.06;
    health = typeof data.health === 'number' && data.health > 0 ? data.health : MAX_HP;
    air = MAX_AIR; fallStartY = null; invuln = 0;
    meta.played = Date.now();
    Store.updateMeta(meta);
    $('loading-title').textContent = meta.name;
    camHint = true;
    setState('loading');
    renderHotbar();
    renderBars();
  }

  function saveCurrent() {
    if (!worldMeta || !world || !worldReady) return;
    physSettleAll();
    if (cursor) { inv.add(cursor.id, cursor.n); cursor = null; }
    const saved = Store.saveWorld(worldMeta.id, {
      edits: world.edits, inv: inv.slots, slot, time: timeOfDay, health, spawn: spawnPoint, cars: cars.serialize(), planes: planes.serialize(), trains: trains.serialize(), cityV2: true,
      metroV1: metroSpawned || undefined, phone: phoneState, minis: world.saveMinis(), miniBank, boxes: Object.fromEntries(world.boxes), cams: [...cams.values()].map(c => [c.x, c.y, c.z, c.name]), morph: morphType || undefined, small: pScale < 1 || undefined,
      player: { x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw, pitch: player.pitch, flying: player.flying },
    });
    if (!saved) toast('⚠️ Мир не сохранился: в браузере кончилось место');
    worldMeta.played = Date.now();
    Store.updateMeta(worldMeta);
  }

  function exitToMenu() {
    saveCurrent();
    leaveCar();
    worldMeta = null;      // мир остаётся фоном меню, но больше не сохраняется
    weUpdateBox();
    mobs.clear();
    camMode = 0;
    setSmall(false, true);
    setMorph(null, true);
    setState('menu');
  }

  // ---------- Экраны ----------
  const SCREEN_OF = { profile: 'profile', menu: 'menu', create: 'create', loading: 'loading', paused: 'pause', inventory: 'inventory', dead: 'death', computer: 'computer', lift: 'lift', phone: 'phone', we: 'we', cams: 'cams', morph: 'morph' };
  function setState(s) {
    state = s;
    for (const id of Object.values(SCREEN_OF)) $(id).classList.toggle('hidden', id !== SCREEN_OF[s]);
    const inGame = s === 'playing' || s === 'paused' || s === 'inventory' || s === 'dead';
    $('hud').classList.toggle('hidden', !inGame);
    $('crosshair').classList.toggle('hidden', s !== 'playing');
    if (s !== 'playing') {
      for (const k in keys) keys[k] = false;
      mouseLeft = mouseRight = false;
      mining = null;
    }
    if (s !== 'inventory') {
      if (cursor) { inv.add(cursor.id, cursor.n); cursor = null; renderHotbar(); }
      $('tooltip').classList.add('hidden');
      updateCursorEl();
    }
    if (s === 'inventory') renderInventory();
    if (s === 'playing' && camHint) { camHint = false; setTimeout(() => toast('Нажми V, чтобы смотреть на героя сзади или спереди'), 1800); }
    if (s === 'menu') renderMenu();
    if (s === 'loading') updateLoading();
    $('info').classList.toggle('hidden', !showInfo);
    updateHand();
  }

  // ---------- Захват мыши ----------
  // Если браузер не даёт захватить мышь, играем в режиме «свободной мыши»:
  // смотреть — перетаскивая мышь или стрелками.
  let freeMouse = false, everLocked = false;
  function lock() {
    if (freeMouse) { setState('playing'); return; }
    try {
      const p = canvas.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(lockFailed);
    } catch (e) { lockFailed(); }
  }
  function lockFailed() {
    if (!everLocked) {
      freeMouse = true;
      canvas.classList.add('free-mouse');
      setState('playing');
      toast('Тяни мышью, чтобы смотреть');
      return;
    }
    if (state !== 'playing' && state !== 'inventory') return;
    setState('paused');
    $('pause-hint').textContent = 'Нажми «Продолжить» ещё раз';
  }
  document.addEventListener('pointerlockerror', lockFailed);
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      everLocked = true;
      $('pause-hint').textContent = '';
      setState('playing');
    } else if (state === 'playing') {
      setState('paused');
      saveCurrent();
    }
  });

  // ---------- Профиль: скин и ник ----------
  const PALETTE = ['#000000', '#444444', '#888888', '#ffffff', '#5b3a1e', '#8b5a2b', '#f2c29b', '#c68642',
    '#ff3b3b', '#ff8c1a', '#ffd93b', '#4cd137', '#1e90ff', '#3557a8', '#9b59b6', '#ff7eb6'];
  const editor = Skin.createEditor($('skin-editor'), { onPick: c => setColor(c) });
  const paletteEl = $('palette');
  PALETTE.forEach(c => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.style.background = c;
    b.dataset.color = c;
    b.addEventListener('click', () => setColor(c));
    paletteEl.appendChild(b);
  });
  function setColor(c) {
    editor.color = c;
    $('color-input').value = c;
    [...paletteEl.children].forEach(b => b.classList.toggle('selected', b.dataset.color === c));
    if (editor.tool === 'pick') setTool('brush');
  }
  function setTool(t) {
    editor.tool = t;
    document.querySelectorAll('.tool').forEach(b => b.classList.toggle('selected', b.dataset.tool === t));
  }
  $('color-input').addEventListener('input', e => setColor(e.target.value));
  document.querySelectorAll('.tool').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
  $('btn-skin-reset').addEventListener('click', () => editor.setSkin(Skin.defaultSkin()));
  function openProfile() {
    editor.setSkin(profile && Skin.isValid(profile.skin) ? profile.skin : Skin.defaultSkin());
    $('nick-input').value = profile ? profile.name : '';
    setColor(editor.color);
    setState('profile');
  }
  $('btn-profile-done').addEventListener('click', () => {
    const name = $('nick-input').value.trim();
    if (!name) {
      $('nick-input').classList.add('error');
      $('nick-input').placeholder = 'Напиши свой никнейм!';
      $('nick-input').focus();
      return;
    }
    $('nick-input').classList.remove('error');
    profile = { name, skin: editor.skin.slice() };
    Store.setProfile(profile);
    rebuildPlayer();
    setState('menu');
  });
  $('nick-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-profile-done').click(); });

  // ---------- Главное меню и список миров ----------
  const fmtDate = t => new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  function renderMenu() {
    const skin = profile && Skin.isValid(profile.skin) ? profile.skin : Skin.defaultSkin();
    $('badge-head').src = Skin.headIcon(skin, 32);
    $('badge-name').textContent = profile ? profile.name : 'Игрок';
    const list = $('world-list');
    list.innerHTML = '';
    const worlds = Store.listWorlds();
    if (!worlds.length) {
      list.innerHTML = '<p class="empty">Пока нет ни одного мира.<br>Нажми «Создать новый мир»!</p>';
      return;
    }
    for (const w of worlds) {
      const row = document.createElement('div');
      row.className = 'world-card';
      const d = DIFFICULTY[w.difficulty] || DIFFICULTY.normal;
      const mapName = w.preset ? ' · ' + ({ city: 'Город', village: 'Реалистичная деревня', flat: 'Плоский мир', lenin: 'Улица Ленина', lenin_winter: 'Улица Ленина Винтер', zhk: 'Три новых ЖК', rus: 'Русский город', rus_winter: 'Русский городок Зима', river: 'Дома на Москве-реке', samo: 'ЖК «Самоцветы»' }[w.preset] || '') : '';
      row.innerHTML = `<div class="w-info"><b></b><small>${MODES[w.mode] || ''} · ${d.name}${mapName}</small><small>${fmtDate(w.played)}</small></div>` +
        '<button class="small w-play">Играть</button><button class="small danger w-del" title="Удалить мир">✕</button>';
      row.querySelector('b').textContent = w.name;
      row.querySelector('.w-play').addEventListener('click', () => { audio(); playWorld(w); });
      row.querySelector('.w-del').addEventListener('click', () => {
        if (!window.confirm(`Удалить мир «${w.name}»? Его нельзя будет вернуть.`)) return;
        Store.deleteWorld(w.id);
        renderMenu();
      });
      list.appendChild(row);
    }
  }
  $('btn-edit-profile').addEventListener('click', openProfile);

  // ---------- Вкладка «Моды» ----------
  const sunIcon = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffb02e';
    for (let k = 0; k < 8; k++) {
      ctx.save(); ctx.translate(24, 24); ctx.rotate(k * Math.PI / 4);
      ctx.fillRect(-3, -23, 6, 10);
      ctx.restore();
    }
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(12, 12, 24, 24);
    ctx.fillStyle = '#fff6b0'; ctx.fillRect(15, 15, 8, 8);
    return c.toDataURL();
  })();
  const MODS = [
    { id: 'shaders', name: 'Шейдеры «Солнышко»', size: 18, icon: () => sunIcon,
      desc: 'Свет и тени от солнца, качающаяся листва, волны на воде, небо с сиянием, сочные цвета и красивые закаты.' },
    { id: 'cars', name: 'Машины', size: 9, icon: () => itemIcon(ITEM.CAR_RED),
      desc: 'Красная, синяя, жёлтая, белая и чёрная машины. Делаются на верстаке из железа и угля. Садись и катайся!' },
    { id: 'planes', name: 'Самолёты', size: 14, icon: () => itemIcon(ITEM.PLANE_RED),
      desc: 'Красный, синий и жёлтый самолёты и большой Боинг. Разгонись по земле и взлетай! Выпрыгнешь в небе — раскроется парашют.' },
    { id: 'metro', name: 'Метро', size: 16, icon: () => blockIcon(B.METRO_SIGN),
      desc: 'Поезда метро и рельсы. В «Городе» появится линия под землёй с 4 станциями и депо, а поезд будет ездить сам. Можно сесть или вести самому.' },
    { id: 'phone', name: 'Телефон', size: 33, icon: () => itemIcon(ITEM.PHONE),
      desc: 'Смартфон BroniPhone: звонки, сообщения, камера, магазин приложений и браузер. Плюс зарядная станция и Wi-Fi роутер. Телефон приходит разряженным!' },
    { id: 'lift', name: 'Лифт', size: 5, icon: () => blockIcon(B.LIFT_BUTTON),
      desc: 'Лифты с кнопками. Поставь кнопки лифта друг над другом на разных этажах — нажимаешь и едешь. В ЖК лифты уже есть, даже на парковку и крышу.' },
    { id: 'bath', name: 'Ванная и туалет', size: 7, icon: () => blockIcon(B.TOILET),
      desc: 'Унитаз, раковина, ванна, душевая кабина, стиральная машина и зеркало. Уже стоят во всех квартирах ЖК и на улице Ленина.' },
    { id: 'computer', name: 'Компьютер', size: 11, icon: () => blockIcon(B.COMPUTER),
      desc: 'Настоящий компьютер BroniOS: змейка, рисовалка, калькулятор, пианино, блокнот. Делается на верстаке.' },
    { id: 'realtransport', name: 'Реалистичный транспорт', size: 64, icon: () => itemIcon(ITEM.REAL_SEDAN),
      desc: 'Подробные седан, внедорожник и спорткар с коробкой передач, фарами и стоп-сигналами; городской автобус с салоном и дверями; катер и теплоход, которые плавают по воде; самолёт «Сессна» и пассажирский лайнер с рычагом газа и убирающимися шасси. Спидометр на экране.' },
    { id: 'morph', name: 'Превращения', size: 6, icon: () => itemIcon(ITEM.PORK),
      desc: 'Нажми R и превратись в свинку, корову, овечку, курочку, жителя, Буку или в одного из пяти зомби: обычного, зомби-жителя, пустынного, утопленника или малыша. У каждого свой рост, скорость и умения.' },
    { id: 'cameras', name: 'Камеры видеонаблюдения', size: 7, icon: () => blockIcon(B.CAMERA),
      desc: 'Повесь камеры на стены — они по-настоящему записывают всё, что видят (последние 2 минуты). На экране для камер смотри прямой эфир или перематывай запись. Экран можно открыть правой кнопкой или из инвентаря.' },
    { id: 'worldchanging', name: 'World changing', size: 4, icon: () => itemIcon(ITEM.WAND),
      desc: 'Редактор мира для творческого режима. Палочкой выбери два угла (левая и правая кнопка), нажми G — и заполняй, заменяй, строй стены, копируй и вставляй, делай шары, цилиндры и пирамиды. Есть «Отменить».' },
    { id: 'physgun', name: 'Физган', size: 6, icon: () => itemIcon(ITEM.PHYSGUN),
      desc: 'Физическая пушка! Зажми левую кнопку — схватишь блок, моба или машину и понесёшь по воздуху. Колесо — ближе или дальше. Отпусти — бросишь. Правая кнопка — заморозить прямо в воздухе.' },
    { id: 'mini', name: 'Мини-мир', size: 8, icon: () => itemIcon(ITEM.SHRINKER),
      desc: 'Уменьшатель и мини-блоки! Правой кнопкой — стань крошечным (или уменьши моба), левой по блоку — он рассыпется на 64 мини-блока. Маленький герой строит мини-блоками, а обычный — если нажать M.' },
    { id: 'interior', name: 'Уютный дом', size: 6, icon: () => blockIcon(B.SOFA),
      desc: 'Мебель: стул, стол, диван, телевизор, холодильник, шкаф, ковёр, торшер и цветок в горшке. Делается на верстаке.' },
  ];
  const downloading = {};
  function saveMods() {
    Store.setMods(mods);
    if (world) world.setMaterials(worldMaterials());
  }
  function renderMods() {
    const list = $('mod-list');
    list.innerHTML = '';
    for (const mod of MODS) {
      const st = mods[mod.id] || {};
      const card = document.createElement('div');
      card.className = 'mod-card' + (st.installed && st.enabled ? ' on' : '');
      card.innerHTML = `<img src="${mod.icon()}" alt=""><div class="mod-info"><b>${mod.name}</b><small>${mod.desc}</small></div><div class="mod-actions"></div>`;
      const actions = card.querySelector('.mod-actions');
      if (downloading[mod.id] !== undefined) {
        actions.innerHTML = `<div class="progress"><div style="width:${downloading[mod.id]}%"></div></div><small>Скачивание… ${Math.floor(downloading[mod.id])}%</small>`;
      } else if (!st.installed) {
        const b = document.createElement('button');
        b.className = 'small';
        b.textContent = `Скачать (${mod.size} МБ)`;
        b.addEventListener('click', () => downloadMod(mod));
        actions.appendChild(b);
      } else {
        const t = document.createElement('button');
        t.className = 'small' + (st.enabled ? ' on' : '');
        t.textContent = st.enabled ? 'Включён ✓' : 'Выключен';
        t.addEventListener('click', () => { st.enabled = !st.enabled; saveMods(); renderMods(); popSound(); });
        const d = document.createElement('button');
        d.className = 'small danger';
        d.textContent = 'Удалить';
        d.addEventListener('click', () => { delete mods[mod.id]; saveMods(); renderMods(); });
        actions.append(t, d);
      }
      list.appendChild(card);
    }
  }
  function downloadMod(mod) {
    audio();
    downloading[mod.id] = 0;
    renderMods();
    const timer = setInterval(() => {
      downloading[mod.id] = Math.min(100, downloading[mod.id] + 6 + Math.random() * 10);
      if (downloading[mod.id] >= 100) {
        clearInterval(timer);
        delete downloading[mod.id];
        mods[mod.id] = { installed: true, enabled: true };
        saveMods();
        tone(660, 0.12, 0.15, 'square', 990);
        setTimeout(() => tone(990, 0.15, 0.15, 'square', 1320), 130);
      }
      if (!$('tab-mods').classList.contains('hidden')) renderMods();
    }, 160);
  }
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('selected', x === t));
    $('tab-worlds').classList.toggle('hidden', t.dataset.tab !== 'worlds');
    $('tab-mods').classList.toggle('hidden', t.dataset.tab !== 'mods');
    $('tab-maps').classList.toggle('hidden', t.dataset.tab !== 'maps');
    if (t.dataset.tab === 'mods') renderMods();
    if (t.dataset.tab === 'maps') renderMaps();
  }));

  // ---------- Вкладка «Карты» ----------
  function mapIcon(draw) {
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const ctx = c.getContext('2d');
    const r = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    draw(r);
    return c.toDataURL();
  }
  const MAPS = [
    { id: 'city', name: 'Город', size: 32,
      desc: 'Бесконечный город: небоскрёбы, магазины, дома, парки, полицейский участок, больница, набережная у канала и аэропорт с самолётами.',
      icon: () => mapIcon(r => {
        r(0, 0, 48, 48, '#2c3e78'); r(0, 38, 48, 10, '#222'); r(0, 42, 48, 1, '#f2c228');
        [[2, 14, 10, 24], [14, 6, 12, 32], [28, 18, 8, 20], [38, 10, 9, 28]].forEach(([x, y, w, h]) => {
          r(x, y, w, h, '#9aa3b5');
          for (let wy = y + 2; wy < y + h - 2; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3) r(wx, wy, 2, 2, '#ffe680');
        });
      }) },
    { id: 'village', name: 'Реалистичная деревня', size: 21,
      desc: 'Большие деревни на каждом шагу: дома из разных материалов с мебелью, поля пшеницы и тыкв, загоны, каменная башня и жители.',
      icon: () => mapIcon(r => {
        r(0, 0, 48, 48, '#8fc7ff'); r(36, 4, 8, 8, '#ffe14d'); r(0, 32, 48, 16, '#5c9e34');
        r(6, 20, 16, 14, '#b88a52'); r(4, 16, 20, 4, '#b03a2e'); r(8, 12, 12, 4, '#b03a2e'); r(12, 26, 4, 8, '#5b3a1e'); r(8, 23, 3, 3, '#bfe6ff');
        for (let x = 26; x < 46; x += 3) r(x, 30, 2, 10, '#e2c060');
      }) },
    { id: 'zhk', name: 'Супер! Три новых ЖК', size: 64,
      desc: 'Три новых ЖК «Небо», «Сад» и «Река»: подъезды с лифтами, современные квартиры с кухней и ванной, кафе и магазины на первых этажах, подземная парковка и двор без машин с фонтаном.',
      icon: () => mapIcon(r => {
        r(0, 0, 48, 48, '#7fb8ff'); r(0, 38, 48, 10, '#5c9e34'); r(0, 44, 48, 4, '#3a3a40');
        [[3, 6, 13, 32, '#e8eef6', '#5a9cff'], [18, 14, 12, 24, '#b0553a', '#bfe6ff'], [32, 10, 13, 28, '#26262c', '#f2c228']].forEach(([x, y, w, h, wall, win]) => {
          r(x, y, w, h, wall);
          for (let yy = y + 2; yy < y + h - 4; yy += 3) r(x + 1, yy, w - 2, 1, win);
          r(x, y + h - 3, w, 3, '#ff9a3a');
        });
      }) },
    { id: 'samo', name: 'ЖК «Самоцветы»', size: 58,
      desc: 'Миниполис «Самоцветы» (Люберцы, ул. Кирова, 12): три Г-образных корпуса по 23 этажа — красный, жёлтый и зелёный, в каждом два подъезда с тремя лифтами. Внизу магазины, кафе, банк, поликлиника, выше — квартиры с кухнями-гостиными. Двор без машин за КПП, спортполе под сеткой, многоуровневый паркинг и ФОК «С.С.С.Р.» с тремя бассейнами.',
      icon: () => mapIcon(samoIcon) },
    { id: 'river', name: 'Дома на Москве-реке', size: 52,
      desc: 'Остров посреди Москвы-реки: гранитные набережные, мосты, большой серый дом на набережной, кирпичная фабрика-лофт, стеклянные башни, храм и «Стрелка» с памятником. Во всех домах — подъезды, лестницы и квартиры с мебелью. Дороги как настоящие: полосы, разметка, зебры, светофоры.',
      icon: () => mapIcon(riverIcon) },
    { id: 'rus', name: 'Русский город', size: 45,
      desc: 'Город Новобронск: хрущёвки и новостройки, храм с золотыми куполами, рынок, гаражи, парк с прудом и дороги с ямами и лужами. Вокруг три деревни — «Малые Ёлки», «Берёзовка» и «Пирожково».',
      icon: () => mapIcon(r => rusIcon(r, false)) },
    { id: 'rus_winter', name: 'Русский городок Зима', size: 47,
      desc: 'Тот же Новобронск с деревнями, но зимой: снег на крышах и дорогах, лёд в лужах и на пруду, ёлка на площади и снеговики во дворах.',
      icon: () => mapIcon(r => rusIcon(r, true)) },
    { id: 'lenin', name: 'Улица Ленина', size: 27,
      desc: 'Улица с девятиэтажками: в каждом подъезде лестница, в квартирах диваны, телевизоры, кровати, холодильники и компьютеры. Во дворах площадки, футбольное поле и парковки с машинами.',
      icon: () => mapIcon(r => leninIcon(r, false)) },
    { id: 'lenin_winter', name: 'Улица Ленина Винтер', size: 29,
      desc: 'Та же улица Ленина, но зимой: всё в снегу, идёт снег, во дворах каток со снеговиками, а за домами — нарядные ёлки.',
      icon: () => mapIcon(r => leninIcon(r, true)) },
  ];
  function samoIcon(r) {
    r(0, 0, 48, 48, '#8fc7ff'); r(0, 40, 48, 8, '#5c9e34'); r(0, 44, 48, 4, '#2e2e33');
    [[3, '#dd3030'], [18, '#f2c228'], [33, '#3fae5a']].forEach(([x, c]) => {          // три высоких корпуса
      r(x, 3, 12, 37, '#f0f0f0');
      for (let y = 5; y < 39; y += 3) { r(x + 1, y, 10, 1, c); r(x + 2, y + 1, 8, 1, '#9fd0ff'); }
      r(x, 2, 12, 2, c);
    });
  }
  function riverIcon(r) {
    r(0, 0, 48, 48, '#8fc7ff');
    r(0, 30, 48, 18, '#3d7cc4'); for (let x = 2; x < 48; x += 7) r(x, 36 + (x % 3) * 3, 4, 1, '#6aa4e0');    // река
    r(4, 27, 40, 4, '#9a9aa0'); r(4, 26, 40, 1, '#c8c8cc');                                                  // набережная
    r(6, 6, 14, 20, '#8d8d92'); for (let y = 8; y < 24; y += 3) for (let x = 8; x < 19; x += 3) r(x, y, 2, 2, '#ffe680');   // серый дом
    r(22, 12, 10, 14, '#a8553c'); r(28, 2, 3, 10, '#a8553c');                                                 // фабрика с трубой
    r(34, 4, 10, 22, '#2b3442'); for (let y = 6; y < 25; y += 2) r(35, y, 8, 1, '#5a9cff');                  // башня
    r(14, 31, 14, 3, '#5a5a60'); for (let x = 15; x < 28; x += 3) r(x, 34, 1, 6, '#5a5a60');                // мост
  }
  function rusIcon(r, winter) {
    r(0, 0, 48, 48, winter ? '#b6c9dc' : '#8fc7ff');
    r(0, 36, 48, 12, winter ? '#f2f6fa' : '#5c9e34'); r(0, 41, 48, 4, '#2e2e33');
    r(13, 44, 4, 1, winter ? '#cfe3f5' : '#4f78a8'); r(30, 42, 3, 1, '#7a7a7a');           // ямы и лужи
    r(2, 16, 16, 20, '#a8553c'); for (let y = 19; y < 34; y += 4) for (let x = 4; x < 17; x += 4) r(x, y, 2, 2, '#ffe680');   // хрущёвка
    r(32, 8, 12, 28, '#e8e8ee'); for (let y = 10; y < 34; y += 3) r(33, y, 10, 1, '#5a9cff');                                  // новостройка
    r(21, 20, 8, 16, '#f4f4f4'); r(23, 14, 4, 6, '#f2c228'); r(24, 10, 2, 4, '#f2c228');                                      // храм
    if (winter) { r(2, 15, 16, 1, '#ffffff'); r(32, 7, 12, 1, '#ffffff'); for (let i = 0; i < 12; i++) r((i * 19) % 46, (i * 13) % 30, 1, 1, '#fff'); }
  }
  function leninIcon(r, winter) {
    r(0, 0, 48, 48, winter ? '#a9c4de' : '#8fc7ff');
    r(0, 36, 48, 12, winter ? '#f2f6fa' : '#5c9e34'); r(0, 40, 48, 5, '#2a2a2e');
    r(4, 6, 40, 30, '#b9bcc2'); if (winter) r(4, 4, 40, 2, '#ffffff');
    for (let y = 9; y < 33; y += 4) for (let x = 7; x < 42; x += 5) r(x, y, 3, 2, (x + y) % 3 ? '#9fd0ff' : '#ffe680');
    if (winter) for (let i = 0; i < 14; i++) r((i * 17) % 46, (i * 23) % 30, 1, 1, '#ffffff');
  }
  let mapsDownloaded = (() => { try { return JSON.parse(localStorage.getItem('bronicraft-maps')) || {}; } catch (e) { return {}; } })();
  const mapsLoading = {};
  function renderMaps() {
    const list = $('map-list');
    list.innerHTML = '';
    for (const mp of MAPS) {
      const card = document.createElement('div');
      card.className = 'mod-card' + (mapsDownloaded[mp.id] ? ' on' : '');
      card.innerHTML = `<img src="${mp.icon()}" alt=""><div class="mod-info"><b>${mp.name}</b><small>${mp.desc}</small></div><div class="mod-actions"></div>`;
      const actions = card.querySelector('.mod-actions');
      if (mapsLoading[mp.id] !== undefined) {
        actions.innerHTML = `<div class="progress"><div style="width:${mapsLoading[mp.id]}%"></div></div><small>Скачивание… ${Math.floor(mapsLoading[mp.id])}%</small>`;
      } else if (!mapsDownloaded[mp.id]) {
        const b = document.createElement('button');
        b.className = 'small';
        b.textContent = `Скачать (${mp.size} МБ)`;
        b.addEventListener('click', () => downloadMap(mp));
        actions.appendChild(b);
      } else {
        const b = document.createElement('button');
        b.className = 'small on';
        b.textContent = 'Играть на карте';
        b.addEventListener('click', () => openCreate(mp));
        const d = document.createElement('button');
        d.className = 'small danger';
        d.textContent = 'Удалить';
        d.addEventListener('click', () => { delete mapsDownloaded[mp.id]; saveMaps(); renderMaps(); });
        actions.append(b, d);
      }
      list.appendChild(card);
    }
  }
  function saveMaps() { try { localStorage.setItem('bronicraft-maps', JSON.stringify(mapsDownloaded)); } catch (e) { /* ничего */ } }
  function downloadMap(mp) {
    audio();
    mapsLoading[mp.id] = 0;
    renderMaps();
    const timer = setInterval(() => {
      mapsLoading[mp.id] = Math.min(100, mapsLoading[mp.id] + 5 + Math.random() * 9);
      if (mapsLoading[mp.id] >= 100) {
        clearInterval(timer);
        delete mapsLoading[mp.id];
        mapsDownloaded[mp.id] = true;
        saveMaps();
        tone(660, 0.12, 0.15, 'square', 990);
        setTimeout(() => tone(990, 0.15, 0.15, 'square', 1320), 130);
      }
      if (!$('tab-maps').classList.contains('hidden')) renderMaps();
    }, 160);
  }

  // ---------- Создание мира ----------
  let newMode = 'survival', newDiff = 'normal', newPreset = null, newType = 'normal';
  document.querySelectorAll('#type-options .opt').forEach(b => b.addEventListener('click', () => { newType = b.dataset.type; pickOption('type-options', 'type', newType); }));
  function openCreate(map) {
    newPreset = map ? map.id : null;
    newType = 'normal';
    pickOption('type-options', 'type', newType);
    $('type-row').classList.toggle('hidden', !!map);
    $('world-name').value = map ? map.name : 'Мир ' + (Store.listWorlds().length + 1);
    $('world-seed').value = '';
    $('create-map').textContent = map ? `Карта: «${map.name}»` : '';
    $('create-map').classList.toggle('hidden', !map);
    if (map && map.id !== 'village') { newMode = 'creative'; pickOption('mode-options', 'mode', newMode); }
    setState('create');
  }
  function pickOption(groupId, attr, value) {
    document.querySelectorAll(`#${groupId} .opt`).forEach(b => b.classList.toggle('selected', b.dataset[attr] === value));
  }
  document.querySelectorAll('#mode-options .opt').forEach(b => b.addEventListener('click', () => { newMode = b.dataset.mode; pickOption('mode-options', 'mode', newMode); }));
  document.querySelectorAll('#diff-options .opt').forEach(b => b.addEventListener('click', () => { newDiff = b.dataset.diff; pickOption('diff-options', 'diff', newDiff); }));
  $('btn-create').addEventListener('click', () => openCreate(null));
  $('btn-create-cancel').addEventListener('click', () => setState('menu'));
  function seedFrom(text) {
    text = text.trim();
    if (!text) return (Math.random() * 2147483647) | 0;
    if (/^-?\d+$/.test(text)) return parseInt(text, 10) | 0;
    let h = 5381;
    for (const ch of text) h = (Math.imul(h, 33) + ch.charCodeAt(0)) | 0;
    return h;
  }
  $('btn-create-go').addEventListener('click', () => {
    audio();
    const meta = Store.createWorld({
      name: $('world-name').value.trim() || 'Мой мир',
      seed: seedFrom($('world-seed').value),
      mode: newMode, difficulty: newDiff, preset: newPreset || (newType === 'flat' ? 'flat' : null),
    });
    playWorld(meta);
  });

  // ---------- Загрузка, пауза, смерть ----------
  $('btn-start').addEventListener('click', () => { if (worldReady) { audio(); lock(); } });
  $('btn-resume').addEventListener('click', () => lock());
  $('btn-menu').addEventListener('click', exitToMenu);
  $('btn-death-menu').addEventListener('click', exitToMenu);
  $('btn-respawn').addEventListener('click', respawn);

  // ---------- Полоски здоровья и воздуха ----------
  function pixelIcon(rows, pal, scale) {
    const c = document.createElement('canvas');
    c.width = rows[0].length * scale; c.height = rows.length * scale;
    const ctx = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, x) => {
      if (!pal[ch]) return;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }));
    return c.toDataURL();
  }
  const HEART = ['.OO.OO.', 'OLHOHHO', 'OHHHHHO', '.OHHHO.', '..OHO..', '...O...'];
  const HEART_HALF = ['.OO.OO.', 'OLHOEEO', 'OHHEEEO', '.OHEEO.', '..OEO..', '...O...'];
  const ICON = {
    full: pixelIcon(HEART, { O: '#1a0000', H: '#e8262b', L: '#ffb3b3' }, 3),
    half: pixelIcon(HEART_HALF, { O: '#1a0000', H: '#e8262b', L: '#ffb3b3', E: '#3d1212' }, 3),
    empty: pixelIcon(HEART, { O: '#1a0000', H: '#3d1212', L: '#3d1212' }, 3),
    bubble: pixelIcon(['.OOO.', 'OLHHO', 'OHHHO', 'OHHHO', '.OOO.'], { O: '#1b3d8f', H: '#8ec5ff', L: '#ffffff' }, 3),
  };
  const heartEls = [], bubbleEls = [];
  for (let i = 0; i < 10; i++) {
    const h = document.createElement('img'); $('hearts').appendChild(h); heartEls.push(h);
    const b = document.createElement('img'); b.src = ICON.bubble; $('air').appendChild(b); bubbleEls.push(b);
  }
  function renderBars() {
    $('bars').classList.toggle('hidden', isCreative());
    heartEls.forEach((el, i) => {
      const hp = health - i * 2;
      el.src = hp >= 2 ? ICON.full : hp === 1 ? ICON.half : ICON.empty;
    });
    const showAir = air < MAX_AIR - 0.01;
    $('air').classList.toggle('hidden', !showAir);
    if (showAir) bubbleEls.forEach((el, i) => { el.style.visibility = i < Math.ceil(air) ? 'visible' : 'hidden'; });
  }

  // ---------- Панель быстрого доступа ----------
  function fillSlot(el, stack) {
    const img = el.querySelector('img'), cnt = el.querySelector('.cnt');
    if (stack) {
      img.src = itemIcon(stack.id);
      img.style.visibility = 'visible';
      cnt.textContent = stack.n > 1 ? stack.n : '';
      el.dataset.name = itemName(stack.id);
    } else {
      img.removeAttribute('src');
      img.style.visibility = 'hidden';
      cnt.textContent = '';
      delete el.dataset.name;
    }
  }
  function makeSlotEl(numberLabel) {
    const d = document.createElement('div');
    d.className = 'slot';
    d.innerHTML = `<img alt="" draggable="false"><span class="cnt"></span>${numberLabel ? `<span class="num">${numberLabel}</span>` : ''}`;
    return d;
  }
  const hotbarEl = $('hotbar');
  for (let i = 0; i < 9; i++) hotbarEl.appendChild(makeSlotEl(i + 1));
  function renderHotbar() {
    [...hotbarEl.children].forEach((d, i) => {
      d.classList.toggle('selected', i === slot);
      fillSlot(d, inv.slots[i]);
    });
    updateHand();
  }
  function updateHand() {
    const id = currentId();
    const show = (state === 'playing' || state === 'paused' || state === 'inventory' || state === 'dead') && camMode === 0;
    hand.visible = show;
    heldBlock.visible = isBlockId(id);
    heldItem.visible = !!id && !isBlockId(id);
    if (heldArm) heldArm.visible = !id;
    if (isBlockId(id)) heldBlock.geometry = blockGeometry(id);
    else if (id) heldItem.material = itemMaterial(id);
    if (playerModel) playerModel.root.visible = !show && !(riding && worldMeta);
    if (morphModel && playerModel) { morphModel.g.visible = playerModel.root.visible; playerModel.root.visible = false; }
  }
  let toastTimer = 0;
  function toast(text) {
    const el = $('blockname');
    el.textContent = text;
    el.classList.add('show');
    toastTimer = 1.6;
  }
  function selectSlot(i) {
    slot = i;
    renderHotbar();
    if (current()) toast(itemName(current().id));
    mining = null;
  }

  // ---------- Инвентарь и крафт ----------
  const invMain = $('inv-main'), invHot = $('inv-hot');
  const invSlotEls = [];
  for (let i = 0; i < 36; i++) {
    const el = makeSlotEl(i < 9 ? i + 1 : null);
    el.dataset.index = i;
    el.addEventListener('mousedown', e => { e.preventDefault(); clickSlot(i, e.button === 2); });
    invSlotEls.push(el);
    (i < 9 ? invHot : invMain).appendChild(el);
  }
  // взять/положить вещь в ячейку любого списка (инвентарь, сундук, печка)
  function clickIn(arr, i, one) {
    const s = arr[i];
    if (!cursor) {
      if (!s) return;
      if (one && s.n > 1) {
        const half = Math.ceil(s.n / 2);
        cursor = { id: s.id, n: half };
        s.n -= half;
      } else { cursor = s; arr[i] = null; }
    } else if (!s) {
      if (one) {
        arr[i] = { id: cursor.id, n: 1 };
        if (!--cursor.n) cursor = null;
      } else { arr[i] = cursor; cursor = null; }
    } else if (s.id === cursor.id) {
      const k = Math.min(one ? 1 : cursor.n, maxStack(s.id) - s.n);
      s.n += k; cursor.n -= k;
      if (!cursor.n) cursor = null;
    } else {
      arr[i] = cursor; cursor = s;
    }
  }
  function clickSlot(i, one) {
    clickIn(inv.slots, i, one);
    popSound();
    renderInventory();
    renderHotbar();
  }

  const recipesEl = $('recipes');
  const recipeEls = RECIPES.map(r => {
    const row = document.createElement('div');
    row.className = 'recipe';
    row.dataset.name = itemName(r.out[0]);
    const ins = r.in.map(([id, n]) =>
      `<span class="ing" data-name="${itemName(id)}"><img src="${itemIcon(id)}" alt=""><i>${n}</i></span>`).join('');
    row.innerHTML = `<span class="r-out"><img src="${itemIcon(r.out[0])}" alt="">${r.out[1] > 1 ? `<i>${r.out[1]}</i>` : ''}</span>` +
      `<span class="r-name">${itemName(r.out[0])}<small>нужен верстак</small></span><span class="r-in">${ins}</span>`;
    row.addEventListener('click', () => {
      if (!r.hand && !atTable) { toast('Нужен верстак! Поставь его и нажми на него правой кнопкой'); return; }
      if (!inv.canCraft(r)) { toast('Не хватает материалов'); return; }
      if (inv.craft(r)) { toast(`Сделано: ${itemName(r.out[0])}`); tone(880, 0.12, 0.15, 'square', 1320); }
      else toast('Инвентарь полон');
      renderInventory();
      renderHotbar();
    });
    recipesEl.appendChild(row);
    return row;
  });

  const paletteBlocks = $('palette-blocks');
  const creativeIds = [];
  for (let id = 1; id < BLOCKS.length; id++) if (BLOCKS[id] && !BLOCKS[id].variant && !BLOCKS[id].hidden) creativeIds.push(id);
  Object.keys(ITEMS).forEach(id => creativeIds.push(+id));
  const NATURE = [B.GRASS, B.DIRT, B.SAND, B.STONE, B.LOG, B.LEAVES, B.WATER, B.BEDROCK, B.COAL, B.IRON, B.GOLD, B.DIAMOND,
    B.SNOW, B.CACTUS, B.EMERALD, B.GRAVEL, B.CLAY, B.ICE, B.PUMPKIN, B.MELON, B.HAY, B.SNOW_BLOCK, B.SNOW_LAYER, B.LAVA,
    B.CORAL_RED, B.CORAL_PINK, B.CORAL_YELLOW, B.CORAL_BLUE, B.CORAL_PURPLE, B.CORAL_FAN_RED, B.CORAL_FAN_PINK, B.CORAL_FAN_YELLOW, B.CORAL_FAN_BLUE, B.CORAL_FAN_PURPLE];
  function categoryOf(id) {
    if (!isBlockId(id)) {
      const it = ITEMS[id];
      return it.tool ? 'tools' : it.food ? 'food' : (it.car || it.plane) ? 'transport' : 'misc';
    }
    if (BLOCKS[id].boxes || id === B.CRAFTING_TABLE || id === B.BOOKSHELF || id === B.LAMP) return 'home';
    return NATURE.includes(id) ? 'nature' : 'build';
  }
  const CATS = [['all', 'Всё'], ['build', 'Стройка'], ['nature', 'Природа'], ['home', 'Дом'], ['tools', 'Инструменты'],
    ['food', 'Еда'], ['transport', 'Транспорт'], ['misc', 'Разное']];
  let paletteCat = 'all';
  CATS.forEach(([k, n]) => {
    const b = document.createElement('button');
    b.className = 'small cat' + (k === 'all' ? ' selected' : '');
    b.textContent = n;
    b.dataset.cat = k;
    b.addEventListener('click', () => { paletteCat = k; renderInventory(); });
    $('palette-cats').appendChild(b);
  });
  $('palette-search').addEventListener('input', () => renderInventory());
  const MOD_NAMES = { cars: 'Машины', planes: 'Самолёты', interior: 'Уютный дом', computer: 'Компьютер', mini: 'Мини-мир',
    phone: 'Телефон', metro: 'Метро', lift: 'Лифт', bath: 'Ванная и туалет', physgun: 'Физган', worldchanging: 'World changing', cameras: 'Камеры', morph: 'Превращения', realtransport: 'Реалистичный транспорт' };
  for (const id of creativeIds) {
    const el = makeSlotEl(null);
    fillSlot(el, { id, n: 1 });
    el.dataset.mod = (BLOCKS[id] && BLOCKS[id].mod) || (ITEMS[id] && ITEMS[id].mod) || '';
    el.dataset.cat = categoryOf(id);
    if (el.dataset.mod) el.insertAdjacentHTML('beforeend', '<span class="badge">мод</span>');
    el.addEventListener('mousedown', e => {
      e.preventDefault();
      const mod = el.dataset.mod;
      if (mod && !modOn(mod)) { toast(`Скачай мод «${MOD_NAMES[mod]}» во вкладке «Моды»`); return; }
      if (cursor) cursor = null;
      else inv.slots[slot] = { id, n: maxStack(id) };
      popSound();
      renderInventory();
      renderHotbar();
    });
    paletteBlocks.appendChild(el);
  }

  function renderInventory() {
    invSlotEls.forEach((el, i) => {
      fillSlot(el, inv.slots[i]);
      el.classList.toggle('selected', i === slot);
    });
    $('inv-cams').classList.toggle('hidden', !(modOn('cameras') && inv.count(ITEM.MONITOR) > 0));
    const box = openBox ? openBox.box : null;
    $('box-ui').classList.toggle('hidden', !box);
    if (box) {
      $('inv-right-title').textContent = box.kind === 'chest' ? 'Сундук' : 'Печка';
      $('inv-table-hint').classList.add('hidden');
      recipesEl.classList.add('hidden');
      paletteBlocks.classList.add('hidden');
      $('palette-tools').classList.add('hidden');
      renderBox();
      updateCursorEl();
      return;
    }
    const creative = isCreative();
    $('inv-right-title').textContent = creative ? 'Все блоки и вещи' : atTable ? 'Верстак' : 'Крафт';
    $('inv-table-hint').classList.toggle('hidden', creative || atTable);
    recipesEl.classList.toggle('hidden', creative);
    paletteBlocks.classList.toggle('hidden', !creative);
    $('palette-tools').classList.toggle('hidden', !creative);
    const q = $('palette-search').value.trim().toLowerCase();
    document.querySelectorAll('#palette-cats .cat').forEach(b => b.classList.toggle('selected', b.dataset.cat === paletteCat));
    [...paletteBlocks.children].forEach(el => {
      el.classList.toggle('hidden', (paletteCat !== 'all' && el.dataset.cat !== paletteCat) || (!!q && !el.dataset.name.toLowerCase().includes(q)));
      el.classList.toggle('locked', !!el.dataset.mod && !modOn(el.dataset.mod));
    });
    if (!creative) {
      RECIPES.forEach((r, k) => {
        const locked = !r.hand && !atTable;
        const ok = !locked && inv.canCraft(r);
        recipeEls[k].classList.toggle('hidden', !!r.mod && !modOn(r.mod));
        recipeEls[k].classList.toggle('locked', locked);
        recipeEls[k].classList.toggle('can', ok);
        recipeEls[k].querySelectorAll('.ing').forEach((ing, j) => {
          const [id, n] = r.in[j];
          ing.classList.toggle('missing', inv.count(id) < n);
        });
      });
    }
    updateCursorEl();
  }
  function openInventory(table) {
    atTable = !!table;
    openBox = null;
    setState('inventory');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  // ---------- Сундуки и печки ----------
  let openBox = null;          // { key, box } — что сейчас открыто
  const chestEls = [], furEls = {};
  for (let i = 0; i < 27; i++) {
    const el = makeSlotEl(null);
    el.addEventListener('mousedown', e => { e.preventDefault(); clickBox(i, e.button === 2); });
    chestEls.push(el);
    $('chest-grid').appendChild(el);
  }
  [['in', 0], ['fuel', 1], ['out', 2]].forEach(([name, i]) => {
    const el = makeSlotEl(null);
    el.addEventListener('mousedown', e => { e.preventDefault(); clickBox(i, e.button === 2); });
    furEls[i] = el;
    $('fur-' + name).appendChild(el);
  });
  const boxKey = (x, y, z) => x + ',' + y + ',' + z;
  function newBox(kind) {
    return kind === 'chest' ? { kind, slots: new Array(27).fill(null) } : { kind, slots: [null, null, null], burn: 0, burnMax: 1, prog: 0 };
  }
  // сундуки в деревнях не пустые: немного еды, угля и руды
  function villageLoot(x, y, z) {
    const b = newBox('chest');
    const r = k => Noise.hash3(x * 3 + k, y, z * 5 - k, worldMeta.seed);
    const loot = [[ITEM.BREAD, 3], [ITEM.APPLE, 4], [ITEM.COAL, 6], [B.IRON, 4], [ITEM.WHEAT, 6], [ITEM.EMERALD_GEM, 2], [B.LAMP, 2], [ITEM.CARROT, 4], [B.GOLD, 2]];
    loot.forEach(([id, max], k) => {
      if (!id || r(k) > 0.5) return;
      b.slots[Math.floor(r(k + 20) * 27)] = { id, n: 1 + Math.floor(r(k + 40) * max) };
    });
    return b;
  }
  function getBox(x, y, z, kind) {
    const key = boxKey(x, y, z);
    let b = world.boxes.get(key);
    if (!b || b.kind !== kind) {
      b = kind === 'chest' && !world.isEdited(x, y, z) ? villageLoot(x, y, z) : newBox(kind);
      world.boxes.set(key, b);
    }
    return b;
  }
  function openContainer(tg) {
    const bd = BLOCKS[tg.id];
    const kind = bd.chest ? 'chest' : 'furnace';
    openInventory();
    openBox = { key: boxKey(tg.x, tg.y, tg.z), box: getBox(tg.x, tg.y, tg.z, kind) };
    tone(kind === 'chest' ? 330 : 200, 0.12, 0.1, 'triangle', kind === 'chest' ? 440 : 150);
    renderInventory();
  }
  function clickBox(i, one) {
    if (!openBox) return;
    const b = openBox.box;
    if (b.kind === 'furnace') {
      if (i === 2) {                       // из готового можно только забрать
        const s = b.slots[2];
        if (!s) return;
        if (!cursor) { cursor = s; b.slots[2] = null; }
        else if (cursor.id === s.id && cursor.n + s.n <= maxStack(s.id)) { cursor.n += s.n; b.slots[2] = null; }
        else return;
      } else if (cursor && i === 0 && !SMELT[cursor.id]) { toast('Это нельзя переплавить'); return; }
      else if (cursor && i === 1 && !FUEL[cursor.id]) { toast('Это не горит. Подойдёт уголь, дерево или доски'); return; }
      else clickIn(b.slots, i, one);
    } else clickIn(b.slots, i, one);
    popSound();
    renderInventory();
    renderHotbar();
  }
  function renderBox() {
    const b = openBox.box, chest = b.kind === 'chest';
    $('chest-grid').classList.toggle('hidden', !chest);
    $('furnace-ui').classList.toggle('hidden', chest);
    if (chest) chestEls.forEach((el, i) => fillSlot(el, b.slots[i]));
    else {
      for (let i = 0; i < 3; i++) fillSlot(furEls[i], b.slots[i]);
      $('fur-flame-fill').style.height = (b.burn > 0 ? Math.ceil(100 * b.burn / b.burnMax) : 0) + '%';
      $('fur-arrow-fill').style.width = Math.floor(b.prog * 100) + '%';
    }
    $('box-hint').textContent = chest
      ? 'Клади сюда вещи — они останутся в сундуке, даже если уйдёшь.'
      : 'Сверху — что переплавить (руда, песок, сырое мясо, булыжник, бревно), снизу — топливо (уголь, дерево). Готовое появится справа.';
  }
  // все печки в мире горят и плавят, даже когда их окно закрыто
  let boxRenderT = 0;
  function updateFurnaces(dt) {
    for (const [key, b] of world.boxes) {
      if (b.kind !== 'furnace') continue;
      const [x, y, z] = key.split(',').map(Number);
      const id = world.getBlock(x, y, z);
      const bd = BLOCKS[id];
      if (!bd || !bd.furnace) { if (world.chunks.has(Math.floor(x / CS) + ',' + Math.floor(z / CS))) world.boxes.delete(key); continue; }
      const [inp, fuel, out] = b.slots;
      const res = inp && SMELT[inp.id];
      const fits = res && (!out || (out.id === res && out.n < maxStack(res)));
      if (b.burn <= 0 && fits && fuel && FUEL[fuel.id]) {
        b.burn = b.burnMax = FUEL[fuel.id];
        if (!--fuel.n) b.slots[1] = null;
      }
      if (b.burn > 0) {
        b.burn = Math.max(0, b.burn - dt);
        if (fits) {
          b.prog += dt / SMELT_TIME;
          if (b.prog >= 1) {
            b.prog = 0;
            if (!--inp.n) b.slots[0] = null;
            if (out) out.n++; else b.slots[2] = { id: res, n: 1 };
          }
        } else b.prog = 0;
      } else b.prog = Math.max(0, b.prog - dt / 2);
      // горящая печка светится огнём
      const lit = b.burn > 0, base = lit ? B.FURNACE_LIT : B.FURNACE;
      if (bd.base !== base) world.setBlock(x, y, z, base + bd.facing);
    }
    if (openBox && state === 'inventory' && openBox.box.kind === 'furnace') {
      boxRenderT -= dt;
      if (boxRenderT <= 0) { boxRenderT = 0.1; renderBox(); }
    }
  }
  // сломали сундук или печку — всё, что лежало внутри, достаётся игроку
  function spillBox(x, y, z) {
    const key = boxKey(x, y, z), b = world.boxes.get(key);
    if (!b) return;
    world.boxes.delete(key);
    for (const st of b.slots) if (st) give(st.id, st.n);
  }
  $('btn-inv-close').addEventListener('click', () => lock());

  // Подсказка с названием и вещь «в руке» под курсором
  const tooltip = $('tooltip'), cursorEl = $('cursor-stack');
  let mouseX = 0, mouseY = 0;
  function updateCursorEl() {
    cursorEl.classList.toggle('hidden', !cursor);
    if (!cursor) return;
    cursorEl.querySelector('img').src = itemIcon(cursor.id);
    cursorEl.querySelector('span').textContent = cursor.n > 1 ? cursor.n : '';
    cursorEl.style.left = mouseX + 'px';
    cursorEl.style.top = mouseY + 'px';
  }
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    if (state !== 'inventory') return;
    if (cursor) { cursorEl.style.left = mouseX + 'px'; cursorEl.style.top = mouseY + 'px'; }
    const t = e.target.closest && e.target.closest('[data-name]');
    if (t && !cursor) {
      tooltip.textContent = t.dataset.name;
      tooltip.classList.remove('hidden');
      tooltip.style.left = (mouseX + 14) + 'px';
      tooltip.style.top = (mouseY + 14) + 'px';
    } else tooltip.classList.add('hidden');
  });

  // ---------- Управление ----------
  let lastSpace = 0;
  function toggleFly() {
    if (!isCreative()) return;
    player.flying = !player.flying;
    player.vel.y = 0;
    toast(player.flying ? 'Полёт включён' : 'Полёт выключен');
  }

  document.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      if ((state === 'computer' || state === 'phone') && e.code === 'Escape') lock();
      return;
    }
    if (state === 'computer' || state === 'phone') { if (e.code === 'Escape') lock(); return; }
    if (state === 'playing') {
      keys[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) {
          const now = performance.now();
          if (now - lastSpace < 280 && !riding) toggleFly();
          lastSpace = now;
        }
      }
      if (e.code === 'KeyF' && !e.repeat) toggleFly();
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && riding && !e.repeat) {
        if (riding.kind === 'train' && riding.cart) riding.v = 0;     // из вагонетки можно вылезти всегда
        if (riding.kind === 'train' && !trains.exitSpot(world, riding)) toast('Выйти можно, когда поезд стоит у платформы');
        else leaveCar();
      }
      if (e.code === 'KeyE' && !e.repeat) openInventory();
      if (e.code === 'KeyG' && !e.repeat) openWE();
      if (e.code === 'KeyR' && !e.repeat) openMorph();
      if (e.code === 'KeyM' && !e.repeat) {
        if (!modOn('mini')) toast('Скачай мод «Мини-мир» во вкладке «Моды»');
        else if (pScale < 1) toast('Маленький герой всегда строит мини-блоками');
        else { miniMode = !miniMode; toast(miniMode ? 'Стройка мини-блоками: включена' : 'Стройка мини-блоками: выключена'); }
      }
      if (e.code === 'KeyV' && !e.repeat) { camMode = (camMode + 1) % 3; updateHand(); toast(CAM_NAMES[camMode]); }
      if (e.code === 'Escape' && freeMouse) { setState('paused'); saveCurrent(); }
      if (freeMouse && e.code.startsWith('Arrow')) e.preventDefault();
      if (e.code === 'F3' || e.code === 'Backquote') {
        e.preventDefault();
        showInfo = !showInfo;
        $('info').classList.toggle('hidden', !showInfo);
      }
    } else if (state === 'morph') {
      if ((e.code === 'KeyR' || e.code === 'Escape') && !e.repeat) lock();
    } else if (state === 'cams') {
      if (e.code === 'Escape' && !e.repeat) lock();
    } else if (state === 'we') {
      if ((e.code === 'KeyG' || e.code === 'Escape') && !e.repeat) lock();
    } else if (state === 'inventory') {
      if (e.code === 'KeyE' && !e.repeat) lock();
      else if (e.code === 'Escape') setState('paused');
    }
    if ((state === 'playing' || state === 'inventory') && /^Digit[1-9]$/.test(e.code)) {
      selectSlot(+e.code.slice(5) - 1);
      if (state === 'inventory') renderInventory();
    }
  });
  document.addEventListener('keyup', e => { keys[e.code] = false; });

  // ---------- Телефон и планшет: джойстик, обзор пальцем, кнопки ----------
  // Касание экрана: коротко — поставить блок или использовать, подержать — ломать (или схватить физганом).
  const TOUCH = /[?&]touch=1/.test(location.search) ||
    (('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.matchMedia && matchMedia('(pointer: coarse)').matches);
  if (TOUCH) {
    document.body.classList.add('touch');
    freeMouse = true;                                    // мыши нет — игра идёт без захвата курсора
    const stick = $('t-stick'), knob = $('t-knob'), jumpBtn = $('t-jump'), downBtn = $('t-down');
    const stop = e => { e.preventDefault(); e.stopPropagation(); };
    // джойстик
    let stickId = null;
    const stickMove = t => {
      const r = stick.getBoundingClientRect(), R = r.width / 2;
      let dx = t.clientX - (r.left + R), dy = t.clientY - (r.top + R);
      const len = Math.hypot(dx, dy), max = R * 0.75;
      if (len > max) { dx *= max / len; dy *= max / len; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const x = dx / max, y = dy / max, dead = 0.3;
      keys.KeyW = y < -dead; keys.KeyS = y > dead; keys.KeyA = x < -dead; keys.KeyD = x > dead;
    };
    const stickEnd = () => { stickId = null; knob.style.transform = ''; keys.KeyW = keys.KeyS = keys.KeyA = keys.KeyD = false; };
    stick.addEventListener('touchstart', e => { stop(e); audio(); const t = e.changedTouches[0]; stickId = t.identifier; stickMove(t); }, { passive: false });
    stick.addEventListener('touchmove', e => { stop(e); for (const t of e.changedTouches) if (t.identifier === stickId) stickMove(t); }, { passive: false });
    stick.addEventListener('touchend', e => { stop(e); for (const t of e.changedTouches) if (t.identifier === stickId) stickEnd(); }, { passive: false });
    stick.addEventListener('touchcancel', e => { stop(e); stickEnd(); }, { passive: false });
    // прыжок; два быстрых нажатия в творческом режиме — включить или выключить полёт
    jumpBtn.addEventListener('touchstart', e => {
      stop(e); audio();
      const now = performance.now();
      if (now - lastSpace < 300 && !riding) toggleFly();
      lastSpace = now;
      keys.Space = true; jumpBtn.classList.add('on');
    }, { passive: false });
    const jumpEnd = e => { stop(e); keys.Space = false; jumpBtn.classList.remove('on'); };
    jumpBtn.addEventListener('touchend', jumpEnd, { passive: false });
    jumpBtn.addEventListener('touchcancel', jumpEnd, { passive: false });
    // вниз в полёте, а в машине — выйти
    let downHeld = false;
    downBtn.addEventListener('touchstart', e => {
      stop(e);
      if (riding) {
        if (riding.kind === 'train' && riding.cart) riding.v = 0;
        if (riding.kind === 'train' && !trains.exitSpot(world, riding)) toast('Выйти можно, когда поезд стоит у платформы');
        else leaveCar();
        return;
      }
      downHeld = true; keys.ShiftLeft = true; downBtn.classList.add('on');
    }, { passive: false });
    const downEnd = e => { stop(e); downHeld = false; keys.ShiftLeft = false; downBtn.classList.remove('on'); };
    downBtn.addEventListener('touchend', downEnd, { passive: false });
    downBtn.addEventListener('touchcancel', downEnd, { passive: false });
    // пауза, инвентарь, камера
    const tap = (id, fn) => $(id).addEventListener('touchstart', e => { stop(e); audio(); if (state === 'playing') fn(); }, { passive: false });
    tap('t-pause', () => { setState('paused'); saveCurrent(); });
    tap('t-inv', () => openInventory());
    tap('t-cam', () => { camMode = (camMode + 1) % 3; updateHand(); toast(CAM_NAMES[camMode]); });
    tap('t-morph', () => openMorph());
    // ячейки хотбара
    [...hotbarEl.children].forEach((el, i) => el.addEventListener('touchstart', e => { stop(e); if (state === 'playing') selectSlot(i); }, { passive: false }));
    // обзор пальцем по экрану; коротко коснулся — поставить, подержал — ломать
    let look = null;
    const holdEnd = () => {
      if (!look || !look.holding) return;
      look.holding = false;
      if (physHeld) physRelease();
      physTried = false; weTried = false;
      mouseLeft = false; mining = null;
    };
    canvas.addEventListener('touchstart', e => {
      stop(e);
      if (state !== 'playing' || look) return;
      audio();
      const t = e.changedTouches[0];
      look = { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t0: performance.now(), moved: 0, holding: false };
      look.timer = setTimeout(() => {
        if (look && look.moved < 14 && state === 'playing') { look.holding = true; mouseLeft = true; breakRepeat = 1; }
      }, 280);
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      stop(e);
      if (!look) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== look.id) continue;
        const dx = t.clientX - look.x, dy = t.clientY - look.y;
        look.x = t.clientX; look.y = t.clientY;
        look.moved = Math.max(look.moved, Math.hypot(t.clientX - look.sx, t.clientY - look.sy));
        if (state !== 'playing') continue;
        player.yaw -= dx * 0.0055;
        player.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, player.pitch - dy * 0.0055));
      }
    }, { passive: false });
    const lookEnd = e => {
      stop(e);
      if (!look) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== look.id) continue;
        clearTimeout(look.timer);
        const quick = !look.holding && look.moved < 14 && performance.now() - look.t0 < 280;
        holdEnd();
        look = null;
        if (quick && state === 'playing') useItem();
      }
    };
    canvas.addEventListener('touchend', lookEnd, { passive: false });
    canvas.addEventListener('touchcancel', lookEnd, { passive: false });
  }
  // кнопки видны только во время игры; «Прыжок» в полёте становится «Полёт ▲», и появляется «▼»
  function updateTouchUI() {
    if (!TOUCH) return;
    const show = state === 'playing' && !!worldMeta;
    $('touch').classList.toggle('hidden', !show);
    $('t-morph').classList.toggle('hidden', !modOn('morph'));
    if (!show) return;
    const jb = $('t-jump'), fly = player.flying && !riding;
    const label = fly ? 'Полёт ▲' : 'Прыжок';
    if (jb.textContent !== label) jb.textContent = label;
    jb.classList.toggle('hidden', !!riding);                // в машине едем джойстиком
    jb.classList.toggle('fly', fly);
    const db = $('t-down'), dl = riding ? 'Выйти' : '▼';
    db.classList.toggle('hidden', !fly && !riding);
    if (db.textContent !== dl) db.textContent = dl;
  }


  let dragging = false, dragDist = 0;
  document.addEventListener('mousemove', e => {
    if (state !== 'playing') return;
    if (freeMouse && !dragging) return;
    const dx = e.movementX || 0, dy = e.movementY || 0;
    if (Math.abs(dx) > 400 || Math.abs(dy) > 400) return;   // защита от рывков браузера
    const k = freeMouse ? 2.2 : 1;
    dragDist += Math.abs(dx) + Math.abs(dy);
    player.yaw -= dx * SENS * k;
    player.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, player.pitch - dy * SENS * k));
  });

  let mouseLeft = false, mouseRight = false, breakRepeat = 0, placeRepeat = 0, attackCd = 0;
  let mining = null;
  canvas.addEventListener('mousedown', e => {
    if (state !== 'playing') return;
    audio();
    if (e.button === 0) {
      mouseLeft = true;
      breakRepeat = 1;
      if (freeMouse) { dragging = true; dragDist = 0; }
    } else if (e.button === 2) {
      mouseRight = true;
      placeRepeat = 0;
      useItem();
    } else if (e.button === 1) {
      e.preventDefault();
      pickBlock();
    }
  });
  document.addEventListener('mouseup', e => {
    if (e.button === 0) {
      if (physHeld) physRelease();
      physTried = false;
      weTried = false;
      if (freeMouse && isCreative() && dragging && dragDist < 6 && state === 'playing') creativeBreak();
      mouseLeft = false;
      dragging = false;
      mining = null;
    }
    if (e.button === 2) mouseRight = false;
  });
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('wheel', e => {
    if (state !== 'playing') return;
    if (e.deltaY === 0) return;
    if (physHeld) { physDist = Math.max(2, Math.min(14, physDist - Math.sign(e.deltaY))); return; }   // колесо — ближе/дальше
    selectSlot((slot + (e.deltaY > 0 ? 1 : -1) + 9) % 9);
  }, { passive: true });

  // ---------- Взгляд: луч по клеткам ----------
  const eye = new THREE.Vector3(), lookDir = new THREE.Vector3();
  function updateLook() {
    eye.set(player.pos.x, player.pos.y + EYE, player.pos.z);
    const cp = Math.cos(player.pitch);
    lookDir.set(-Math.sin(player.yaw) * cp, Math.sin(player.pitch), -Math.cos(player.yaw) * cp);
  }
  function raycast(reach) {
    const REACH_ = reach || REACH;
    const o = eye, d = lookDir;
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const tdx = sx ? Math.abs(1 / d.x) : Infinity, tdy = sy ? Math.abs(1 / d.y) : Infinity, tdz = sz ? Math.abs(1 / d.z) : Infinity;
    let tmx = sx > 0 ? (x + 1 - o.x) * tdx : sx < 0 ? (o.x - x) * tdx : Infinity;
    let tmy = sy > 0 ? (y + 1 - o.y) * tdy : sy < 0 ? (o.y - y) * tdy : Infinity;
    let tmz = sz > 0 ? (z + 1 - o.z) * tdz : sz < 0 ? (o.z - z) * tdz : Infinity;
    let n = [0, 0, 0], t = 0;
    while (t <= REACH_) {
      const id = world.getBlock(x, y, z);
      if (id === B.MINI) { const h = miniRay(x, y, z, t, n); if (h) return h; }
      else if (id !== B.AIR && !isLiquidB(id)) return { x, y, z, id, n, t };
      if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; n = [-sx, 0, 0]; }
      else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; n = [0, -sy, 0]; }
      else { z += sz; t = tmz; tmz += tdz; n = [0, 0, -sz]; }
    }
    return null;
  }
  // луч внутри клетки с мини-блоками: такие же шаги, только по четвертинкам
  function miniRay(cx, cy, cz, t0, n0) {
    const a = world.getMini(cx, cy, cz);
    if (!a) return null;
    const o = eye, d = lookDir;
    const px = (o.x + d.x * t0 - cx) * 4, py = (o.y + d.y * t0 - cy) * 4, pz = (o.z + d.z * t0 - cz) * 4;
    const cl = v => Math.max(0, Math.min(3, Math.floor(v)));
    let x = cl(px), y = cl(py), z = cl(pz);
    const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const tdx = sx ? Math.abs(0.25 / d.x) : Infinity, tdy = sy ? Math.abs(0.25 / d.y) : Infinity, tdz = sz ? Math.abs(0.25 / d.z) : Infinity;
    let tmx = t0 + (sx > 0 ? (x + 1 - px) * tdx : sx < 0 ? (px - x) * tdx : Infinity);
    let tmy = t0 + (sy > 0 ? (y + 1 - py) * tdy : sy < 0 ? (py - y) * tdy : Infinity);
    let tmz = t0 + (sz > 0 ? (z + 1 - pz) * tdz : sz < 0 ? (pz - z) * tdz : Infinity);
    let n = n0, t = t0;
    while (t <= REACH && x >= 0 && x < 4 && y >= 0 && y < 4 && z >= 0 && z < 4) {
      const id = a[(y * 4 + z) * 4 + x];
      if (id) return { x: cx, y: cy, z: cz, id: B.MINI, mini: { sx: x, sy: y, sz: z, id }, n, t };
      if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; n = [-sx, 0, 0]; }
      else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; n = [0, -sy, 0]; }
      else { z += sz; t = tmz; tmz += tdz; n = [0, 0, -sz]; }
    }
    return null;
  }
  // куда встанет новый блок: точка чуть перед гранью, в которую смотрим
  function placeSpot(tg) {
    const k = tg.t + 0.0, q = 0.01;
    const px = eye.x + lookDir.x * k + tg.n[0] * q, py = eye.y + lookDir.y * k + tg.n[1] * q, pz = eye.z + lookDir.z * k + tg.n[2] * q;
    const x = Math.floor(px), y = Math.floor(py), z = Math.floor(pz);
    const cl = v => Math.max(0, Math.min(3, Math.floor(v)));
    return { x, y, z, sx: cl((px - x) * 4), sy: cl((py - y) * 4), sz: cl((pz - z) * 4) };
  }
  const miniOk = id => isBlockId(id) && id < 256 && BLOCKS[id] && !BLOCKS[id].quads && !BLOCKS[id].door && !isLiquidB(id) && id !== B.MINI;
  let target = null;
  function mobTarget() {
    const h = mobs.raycast(eye, lookDir, ATTACK_REACH);
    if (!h) return null;
    if (target && target.t < h.t) return null;
    return h;
  }

  // ---------- Добыча и постройка ----------
  const toolOf = id => (ITEMS[id] && ITEMS[id].tool) || null;
  function mineTime(id) {
    const m = mineInfo(id), tool = toolOf(currentId());
    if (m.pick === undefined) {
      if (tool && tool.kind === toolKindFor(id)) return m.t / PICK_SPEED[tool.tier];   // топор для дерева, лопата для земли
      return m.t;
    }
    if (tool && tool.kind === 'pick' && tool.tier >= m.pick) return m.t / PICK_SPEED[tool.tier];
    return m.t * 5;
  }
  function canHarvest(id) {
    const m = mineInfo(id), tool = toolOf(currentId());
    return m.pick === undefined || (tool && tool.kind === 'pick' && tool.tier >= m.pick);
  }

  function breakBlock(x, y, z, id) {
    // у двери ломается и вторая половинка
    const door = BLOCKS[id] && BLOCKS[id].door;
    if (door) {
      const py = door.half === 'b' ? y + 1 : y - 1;
      const other = BLOCKS[world.getBlock(x, py, z)];
      if (other && other.door) world.setBlock(x, py, z, B.AIR);
    }
    // у душа тоже две половинки
    const bd0 = BLOCKS[id];
    if (bd0 && (bd0.tall || bd0.tallTop)) {
      const py = bd0.tall ? y + 1 : y - 1, other = BLOCKS[world.getBlock(x, py, z)];
      if (other && (other.tall || other.tallTop)) world.setBlock(x, py, z, B.AIR);
    }
    if (BLOCKS[id] && (BLOCKS[id].chest || BLOCKS[id].furnace)) spillBox(x, y, z);
    if (BLOCKS[id] && BLOCKS[id].camera) cams.delete(x + ',' + y + ',' + z);
    world.setBlock(x, y, z, B.AIR);                // если рядом вода или лава — они сами затекут в дырку
    blockParticles(x, y, z, id);
    blockSound(id, 'break');
    swingT = 1;
  }
  // мини-блок ломается по одному кубику
  function breakMini(tg) {
    const m = tg.mini;
    world.setMini(tg.x, tg.y, tg.z, m.sx, m.sy, m.sz, 0);
    const a = ATLAS.avg[BLOCKS[m.id].tex[2]];
    spawnParticles(tg.x + (m.sx - 1.5) / 4, tg.y + (m.sy - 1.5) / 4, tg.z + (m.sz - 1.5) / 4, 'b' + m.id, new THREE.Color(a[0], a[1], a[2]), 5);
    blockSound(m.id, 'break');
    swingT = 1;
  }
  // в выживании мини-блоки копятся: 64 сломанных кубика — это один целый блок
  let miniBank = {};
  function bankMini(id, d) {
    if (isCreative()) return true;
    const b = miniBank[id] || 0;
    if (d < 0 && b <= 0) {
      const st = current();
      if (!st || st.id !== id) return false;
      if (!--st.n) inv.slots[slot] = null;
      renderHotbar();
      miniBank[id] = 63;
      return true;
    }
    miniBank[id] = b + d;
    if (miniBank[id] >= 64) { miniBank[id] -= 64; give(id, 1); }
    return true;
  }
  function creativeBreak() {
    if (!target || target.y === 0) return;
    if (ITEMS[currentId()] && (ITEMS[currentId()].physgun || ITEMS[currentId()].wand)) return;
    if (current() && ITEMS[currentId()] && ITEMS[currentId()].shrinker) { shrinkBlock(); return; }
    if (target.mini) { breakMini(target); updateLook(); target = raycast(); return; }
    breakBlock(target.x, target.y, target.z, target.id);
    updateLook();
    target = raycast();
  }
  function finishMining() {
    if (mining.mini) {
      const tg = { x: mining.x, y: mining.y, z: mining.z, mini: mining.mini };
      breakMini(tg);
      if (canHarvest(mining.mini.id)) bankMini(mining.mini.id, 1);
      return;
    }
    const { x, y, z, id } = mining;
    const harvest = canHarvest(id);
    breakBlock(x, y, z, id);
    if (!harvest) {
      const m = mineInfo(id);
      toast(`Нужна ${PICK_NAMES[m.pick]} кирка или лучше`);
      return;
    }
    const m = mineInfo(id);
    for (const [bid, ch] of m.bonus || []) if (Math.random() < ch) give(bid, 1);
    if (m.chance !== undefined && Math.random() > m.chance) return;
    const n = m.n ? m.n[0] + Math.floor(Math.random() * (m.n[1] - m.n[0] + 1)) : 1;
    give(m.drop !== undefined ? m.drop : (BLOCKS[id].base || id), n);
  }
  function give(id, n) {
    if (n <= 0) return;
    if (inv.add(id, n)) toast('Инвентарь полон!');
    else { toast(`+${n} ${itemName(id)}`); popSound(); }
    renderHotbar();
  }
  function updateMining(dt) {
    if (!target) { mining = null; return; }
    if (ITEMS[currentId()] && ITEMS[currentId()].shrinker) {
      if (breakRepeat > 0) { breakRepeat = 0; shrinkBlock(); }
      mining = null;
      return;
    }
    const tm = target.mini;
    const key = target.x + ',' + target.y + ',' + target.z + (tm ? ':' + tm.sx + tm.sy + tm.sz : '');
    if (!mining || mining.key !== key || mining.slotId !== currentId()) {
      const id = tm ? tm.id : target.id;
      mining = { key, x: target.x, y: target.y, z: target.z, id, mini: tm, progress: 0, time: tm ? Math.max(0.05, mineTime(id) / 4) : mineTime(id), slotId: currentId(), tick: 0 };
    }
    if (!isFinite(mining.time)) return;
    mining.progress += dt / mining.time;
    mining.tick -= dt;
    if (mining.tick <= 0) { mining.tick = 0.25; blockSound(mining.id, 'hit'); swingT = 1; }
    if (mining.progress >= 1) { finishMining(); mining = null; }
  }

  function intersectsPlayer(x, y, z) {
    const p = player.pos;
    return x < p.x + PW && x + 1 > p.x - PW && y < p.y + PH && y + 1 > p.y && z < p.z + PW && z + 1 > p.z - PW;
  }
  // Правая кнопка: сначала пробуем что-то «использовать», иначе ставим блок
  function useItem() {
    if (riding) return;
    if (holdingWand()) { weWandRight(); return; }                  // палочка: точка 2 или кисть
    if (ITEMS[currentId()] && ITEMS[currentId()].monitor) { openCams(); return; }   // экран камер
    if (ITEMS[currentId()] && ITEMS[currentId()].physgun) {        // физган: правая кнопка — заморозить
      if (!modOn('physgun')) { toast('Скачай мод «Физган» во вкладке «Моды»'); return; }
      if (physHeld) physFreeze();
      else toast('Зажми левую кнопку, чтобы схватить. Правая — заморозить в воздухе');
      return;
    }
    const ch = carTarget();
    if (ch) { enterCar(ch.car); return; }
    const mh = mobTarget();
    if (mh && mh.mob.type === 'villager') {
      toast(`${mh.mob.def.name}: ${mobs.greeting(profile ? profile.name : 'друг')}`);
      tone(300 + Math.random() * 120, 0.15, 0.12, 'triangle', 420);
      return;
    }
    const shift = keys.ShiftLeft || keys.ShiftRight;
    if (target && !shift) {
      if (target.id === B.CRAFTING_TABLE) { openInventory(true); return; }
      if (BLOCKS[target.id].chest || BLOCKS[target.id].furnace) { openContainer(target); return; }
      if (BLOCKS[target.id].door) { toggleDoor(target.x, target.y, target.z); return; }
      if (BLOCKS[target.id].trapdoor) { toggleTrapdoor(target.x, target.y, target.z); return; }
      if (BLOCKS[target.id].base === B.BED) { sleep(target); return; }
      if (BLOCKS[target.id].base === B.COMPUTER) { openComputer(); return; }
      if (BLOCKS[target.id].base === B.LIFT_BUTTON) { openLift(target); return; }
    }
    const it = ITEMS[currentId()];
    if (it && it.shrinker) {
      if (!modOn('mini')) { toast('Скачай мод «Мини-мир» во вкладке «Моды»'); return; }
      zap();
      const mob = mobs.raycast(eye, lookDir, 8);
      if (mob && !mob.mob.dying) { mobs.resize(mob.mob, mob.mob.size === 1 || !mob.mob.size ? 0.3 : 1); toast(mob.mob.size < 1 ? `${mob.mob.def.name}: теперь крошка!` : `${mob.mob.def.name}: снова обычного размера`); return; }
      setSmall(pScale === 1);
      return;
    }
    if (it && it.phone) { openPhone(); return; }
    if (target && target.id === B.CHARGER) { toast(hasPhone() ? '📱 Постой рядом — телефон заряжается' : 'Зарядная станция для телефона'); return; }
    if (it && it.lighter) {
      tone(1800, 0.04, 0.08, 'square');
      if (target && target.id === B.DYNAMITE) igniteDynamite(target.x, target.y, target.z, 3);
      else toast('Зажигалкой можно поджечь динамит');
      swingT = 1;
      return;
    }
    if (it && it.minecart) { placeOnRail('cart'); return; }
    if (it && it.spawnEgg) { spawnFromEgg(it); return; }
    if (it && it.bucket) { useBucket(it); return; }
    if (it && it.snowball) { throwSnowball(); return; }
    if (it && it.food && !isCreative()) {
      if (health >= MAX_HP) { toast('Ты не голоден'); return; }
      health = Math.min(MAX_HP, health + it.food);
      const s = current();
      if (!--s.n) inv.slots[slot] = null;
      noiseBurst(0.12, 900, 0.3); setTimeout(() => noiseBurst(0.12, 800, 0.3), 150);
      toast(`Ням! +${it.food / 2} ♥`);
      renderHotbar(); renderBars();
      return;
    }
    if (it && it.car) { placeVehicle(it, 'car'); return; }
    if (it && it.plane) { placeVehicle(it, 'plane'); return; }
    if (it && it.train) { placeOnRail('train'); return; }
    if (morphType && !currentId()) { morphVoice(); return; }       // пустая рука: голос существа
    usePlace();
  }

  // ---------- Вёдра ----------
  // первая вода или лава на пути взгляда (обычный луч их пропускает)
  function liquidRay() {
    updateLook();
    for (let t = 0; t <= REACH; t += 0.1) {
      const x = Math.floor(eye.x + lookDir.x * t), y = Math.floor(eye.y + lookDir.y * t), z = Math.floor(eye.z + lookDir.z * t);
      const id = world.getBlock(x, y, z);
      if (isLiquidB(id)) return { x, y, z, id };
      if (IS_SOLID[id]) return null;
    }
    return null;
  }
  // вода и лава встречаются — лава застывает в обсидиан
  function liquidReact(x, y, z) {
    const id = world.getBlock(x, y, z), list = [];
    for (const f of FACES) {
      const nx = x + f.dir[0], ny = y + f.dir[1], nz = z + f.dir[2], n = world.getBlock(nx, ny, nz);
      if (isLavaB(id) && isWaterB(n)) list.push([x, y, z, LIQ_LEVEL[id] ? B.COBBLE : B.OBSIDIAN]);
      if (isWaterB(id) && isLavaB(n)) list.push([nx, ny, nz, LIQ_LEVEL[n] ? B.COBBLE : B.OBSIDIAN]);
    }
    if (!list.length) return;
    world.setBlocks(list);
    noiseBurst(0.5, 2500, 0.25);
    spawnParticles(x - 0.5, y, z - 0.5, 'steam', new THREE.Color(0xdddddd), 14);
    toast('Пш-ш-ш! Лава застыла в обсидиан');
  }
  function useBucket(it) {
    const survival = !isCreative();
    if (it.bucket === 'empty') {
      const l = liquidRay();
      if (!l) { toast('Зачерпни ведром воду или лаву'); return; }
      if (LIQ_LEVEL[l.id]) { toast('Это течение — зачерпни там, откуда течёт'); return; }
      world.setBlock(l.x, l.y, l.z, B.AIR);
      noiseBurst(0.2, isWaterB(l.id) ? 900 : 300, 0.2);
      if (survival) {
        const st = current(), full = isWaterB(l.id) ? ITEM.WATER_BUCKET : ITEM.LAVA_BUCKET;
        if (st.n > 1) { st.n--; give(full, 1); } else inv.slots[slot] = { id: full, n: 1 };
        renderHotbar();
      } else toast(isWaterB(l.id) ? 'Вода зачерпнута' : 'Лава зачерпнута');
      swingT = 1;
      return;
    }
    if (!target) { toast('Вылей ведро на землю или на блок'); return; }
    const x = target.x + target.n[0], y = target.y + target.n[1], z = target.z + target.n[2];
    const cur = world.getBlock(x, y, z);
    if (cur !== B.AIR && !isLiquidB(cur) && cur !== B.SNOW_LAYER) return;
    const id = it.bucket === 'water' ? B.WATER : B.LAVA;
    world.setBlock(x, y, z, id);
    liquidReact(x, y, z);
    noiseBurst(0.25, id === B.WATER ? 900 : 300, 0.2);
    if (survival) { inv.slots[slot] = { id: ITEM.BUCKET, n: 1 }; renderHotbar(); }
    swingT = 1;
  }

  // ---------- Снежки ----------
  const snowballs = [];
  const ballMat = new THREE.MeshBasicMaterial({ color: 0xf4f8ff });
  const ballGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  function throwSnowball() {
    updateLook();
    const m = new THREE.Mesh(ballGeo, ballMat);
    const pos = eye.clone().addScaledVector(lookDir, 0.6);
    m.position.copy(pos);
    scene.add(m);
    snowballs.push({ m, pos, vel: lookDir.clone().multiplyScalar(22), life: 4 });
    tone(500, 0.08, 0.06, 'triangle', 300);
    swingT = 1;
    if (!isCreative()) { const st = current(); if (!--st.n) inv.slots[slot] = null; renderHotbar(); }
  }
  function updateSnowballs(dt) {
    for (let i = snowballs.length - 1; i >= 0; i--) {
      const s = snowballs[i];
      s.vel.y -= 18 * dt;
      s.pos.addScaledVector(s.vel, dt);
      s.life -= dt;
      s.m.position.copy(s.pos);
      const id = world.getBlock(Math.floor(s.pos.x), Math.floor(s.pos.y), Math.floor(s.pos.z));
      // попадание в моба: отталкивает, злых немного ранит
      const hit = mobs.list.find(m => !m.dying && Math.abs(m.pos.x - s.pos.x) < m.def.hw * (m.size || 1) + 0.15 && Math.abs(m.pos.z - s.pos.z) < m.def.hw * (m.size || 1) + 0.15
        && s.pos.y > m.pos.y && s.pos.y < m.pos.y + m.def.h * (m.size || 1));
      if (hit) {
        const l = Math.hypot(s.vel.x, s.vel.z) || 1;
        if (hit.def.hostile) mobs.hit(hit, 1, s.vel.x / l, s.vel.z / l);
        else { hit.vel.x += s.vel.x / l * 4; hit.vel.z += s.vel.z / l * 4; hit.vel.y = 3; hit.hurtT = 0.2; hit.panic = 2; }
      }
      if (hit || IS_SOLID[id] || isLiquidB(id) || s.life <= 0) {
        spawnParticles(s.pos.x - 0.5, s.pos.y - 0.5, s.pos.z - 0.5, 'snow', new THREE.Color(0xf4f8ff), 8);
        tone(300, 0.05, 0.05, 'triangle', 200);
        scene.remove(s.m);
        snowballs.splice(i, 1);
      }
    }
  }

  // Яйцо призыва: существо появляется там, куда нажал. В мирном режиме злые не появляются.
  function spawnFromEgg(it) {
    const type = it.spawnEgg, def = MOB_TYPES[type];
    if (def.hostile && difficulty().mobs === 0) { toast(`В мирном режиме ${type === 'buka' ? 'Буки' : 'зомби'} не появляются`); tone(160, 0.15, 0.08, 'square'); return; }
    if (!target) { toast('Нажми яйцом на землю или на блок'); return; }
    const x = target.x + target.n[0] + 0.5, y = target.y + target.n[1], z = target.z + target.n[2] + 0.5;
    if (boxCollides(world, new THREE.Vector3(x, y, z), def.hw, def.h)) { toast('Тут мало места'); return; }
    const m = mobs.spawn(type, x, y, z, type === 'villager' ? { robe: ROBES[Math.floor(Math.random() * ROBES.length)] } : undefined);
    m.yaw = Math.atan2(player.pos.x - x, player.pos.z - z);              // смотрит на того, кто его позвал
    m.group.rotation.y = m.yaw;
    spawnParticles(x - 0.5, y, z - 0.5, 'egg_' + type, new THREE.Color(...it.colors.H.map(c => c / 255)), 14);
    tone(def.hostile ? 140 : 520, 0.2, 0.1, def.hostile ? 'sawtooth' : 'triangle', def.hostile ? 90 : 780);
    toast(`Появилось существо: ${def.name}`);
    swingT = 1;
    if (!isCreative()) { const st = current(); if (!--st.n) inv.slots[slot] = null; renderHotbar(); }
  }

  function openComputer() {
    setState('computer');
    if (document.pointerLockElement) document.exitPointerLock();
    Computer.open();
    tone(520, 0.1, 0.12, 'square', 780);
  }
  // ---------- Телефон ----------
  let phoneState = { battery: 0, installed: [], wallpaper: 0, photos: [] };
  let flashlightOn = false, phoneScanT = 0, nearCharger = false, wifiBars = 0, chargeToast = false;
  const hasPhone = () => inv.count(ITEM.PHONE) > 0;
  function openPhone() {
    if (!modOn('phone')) { toast('Скачай мод «Телефон» во вкладке «Моды»'); return; }
    setState('phone');
    if (document.pointerLockElement) document.exitPointerLock();
    Phone.open();
  }
  // раз в секунду ищем рядом зарядку (до 3 блоков) и роутер (до 20 блоков)
  function scanPhoneDevices() {
    const px = Math.floor(player.pos.x), py = Math.floor(player.pos.y), pz = Math.floor(player.pos.z);
    let best = Infinity, charger = false;
    for (let y = py - 6; y <= py + 6; y++) for (let z = pz - 20; z <= pz + 20; z++) for (let x = px - 20; x <= px + 20; x++) {
      const id = world.getBlock(x, y, z);
      if (id === B.ROUTER) best = Math.min(best, Math.hypot(x - px, y - py, z - pz));
      else if (id === B.CHARGER && Math.abs(x - px) <= 3 && Math.abs(z - pz) <= 3 && Math.abs(y - py) <= 2) charger = true;
    }
    wifiBars = best < 8 ? 3 : best < 14 ? 2 : best < 20 ? 1 : 0;
    nearCharger = charger;
  }
  // «Русский город»: здороваемся при въезде в деревню или в город
  let placeT = 0, placeName = null;
  function updatePlace(dt) {
    if (!worldMeta || (worldMeta.preset !== 'rus' && worldMeta.preset !== 'rus_winter')) return;
    placeT -= dt;
    if (placeT > 0) return;
    placeT = 1;
    const p = player.pos;
    const v = RUS.villages.find(vv => Math.hypot(p.x - vv.x, p.z - vv.z) < 70);
    const inTown = p.x >= RUS.T0 && p.x <= RUS.T0 + RUS.N * RUS.P + 6 && p.z >= RUS.T0 && p.z <= RUS.T0 + RUS.N * RUS.P + 6;
    const name = v ? 'Деревня «' + v.name + '»' : inTown ? 'Город ' + RUS.town : null;
    if (name && name !== placeName) toast('Добро пожаловать! ' + name);
    placeName = name;
  }

  function updatePhone(dt) {
    if (!worldMeta) return;
    phoneScanT -= dt;
    if (phoneScanT <= 0) { phoneScanT = 1; scanPhoneDevices(); }
    const ps = phoneState;
    if (nearCharger && hasPhone() && ps.battery < 100) {
      ps.battery = Math.min(100, ps.battery + dt * 4);
      if (!chargeToast && state === 'playing') { toast('📱 Телефон заряжается…'); chargeToast = true; }
    } else chargeToast = false;
    if (state === 'phone') ps.battery = Math.max(0, ps.battery - dt / 6);
    if (flashlightOn) {
      ps.battery = Math.max(0, ps.battery - dt / 4);
      if (ps.battery <= 0 || !hasPhone()) flashlightOn = false;
    }
    if (state === 'phone') Phone.tick(dt);
  }
  Phone.init({
    onClose: () => lock(),
    state: () => phoneState,
    save: () => saveCurrent(),
    wifi: () => (phoneState.battery > 0 ? wifiBars : 0),
    charging: () => nearCharger,
    clock: () => gameClock(),
    tone: (f, d, type) => tone(f, d, 0.12, type || 'square'),
    flashlight: v => { if (v !== undefined) flashlightOn = v && phoneState.battery > 0; return flashlightOn; },
    photo: () => {
      draw();
      const c = document.createElement('canvas');
      c.width = 240; c.height = Math.round(240 * canvas.height / canvas.width);
      c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.7);
    },
    compass: () => ({ yaw: player.yaw, x: player.pos.x, y: player.pos.y, z: player.pos.z }),
    mapColor: (dx, dz) => {
      const x = Math.floor(player.pos.x) + dx, z = Math.floor(player.pos.z) + dz;
      if (!world.getChunk(Math.floor(x / CS), Math.floor(z / CS))) return '#202024';
      for (let y = CH - 1; y > 0; y--) {
        const id = world.getBlock(x, y, z);
        if (!id) continue;
        const a = ATLAS.avg[BLOCKS[id].tex[0]];
        return `rgb(${a[0] * 255 | 0},${a[1] * 255 | 0},${a[2] * 255 | 0})`;
      }
      return '#000';
    },
    weather: () => {
      const winter = worldMeta && (worldMeta.preset === 'lenin_winter' || worldMeta.preset === 'rus_winter');
      if (winter) return { icon: '❄️', text: 'Идёт снег', temp: -7 };
      if (dayFactor < 0.3) return { icon: '🌙', text: 'Ночь, ясно. Берегись Бук!', temp: 12 };
      return { icon: timeOfDay > 0.4 && timeOfDay < 0.5 ? '🌇' : '☀️', text: 'Солнечно', temp: 22 };
    },
    recipes: () => RECIPES.filter(r => !r.mod || modOn(r.mod)).map(r =>
      `${itemName(r.out[0])}${r.out[1] > 1 ? ' ×' + r.out[1] : ''} ← ${r.in.map(([id, n]) => itemName(id) + ' ×' + n).join(', ')}${r.hand ? '' : ' (верстак)'}`),
  });

  const gameClock = () => {
    const hours = Math.floor(((timeOfDay * 24) + 6) % 24), mins = Math.floor((timeOfDay * 24 * 60) % 60);
    return String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
  };
  Computer.init({
    onClose: () => lock(),
    clock: gameClock,
    click: () => popSound(),
    tone: (f, d, type) => tone(f, d, 0.15, type || 'square'),
    worldInfo: () => [
      ['Игрок', profile ? profile.name : 'Игрок'],
      ['Мир', worldMeta ? worldMeta.name : '—'],
      ['Режим', worldMeta ? MODES[worldMeta.mode] : '—'],
      ['Сложность', difficulty().name],
      ['Время', gameClock()],
      ['Где ты', `X ${Math.round(player.pos.x)}, Y ${Math.round(player.pos.y)}, Z ${Math.round(player.pos.z)}`],
      ['Здоровье', `${health / 2} из ${MAX_HP / 2} ♥`],
      ['Изменено блоков', String(Object.values(world.edits).reduce((a, e) => a + Object.keys(e).length, 0))],
      ['Машин', String(cars.list.length)], ['Самолётов', String(planes.list.length)],
    ],
  });

  // ---------- Лифт ----------
  // Все кнопки лифта в одном столбике — это этажи. Едем на выбранный этаж в ту же кабину.
  let liftRide = null, liftFloors = [], liftFrom = 0;
  function liftLabel(y, i, floors) {
    if (worldMeta && world.flatMap() && y < FLAT_G) return 'П';
    const ground = floors.filter(f => !(world.flatMap() && f < FLAT_G));
    const n = ground.indexOf(y) + 1;
    if (n === ground.length && n > 2 && worldMeta && ['zhk', 'rus', 'rus_winter', 'river'].includes(worldMeta.preset)) return 'Крыша';
    return String(n || i + 1);
  }
  function openLift(t) {
    if (!modOn('lift')) { toast('Скачай мод «Лифт» во вкладке «Моды»'); return; }
    liftFloors = [];
    for (let y = 1; y < CH; y++) if (BLOCKS[world.getBlock(t.x, y, t.z)] && BLOCKS[world.getBlock(t.x, y, t.z)].base === B.LIFT_BUTTON) liftFloors.push(y);
    liftFrom = t.y;
    if (liftFloors.length < 2) { toast('Поставь ещё одну кнопку лифта выше или ниже в том же столбике'); return; }
    const grid = $('lift-floors');
    grid.innerHTML = '';
    [...liftFloors].reverse().forEach(y => {
      const i = liftFloors.indexOf(y);
      const b = document.createElement('button');
      b.className = 'lift-btn' + (y === t.y ? ' here' : '');
      b.textContent = liftLabel(y, i, liftFloors);
      b.addEventListener('click', () => {
        if (y === liftFrom) { lock(); return; }
        liftRide = { t: 0, dur: Math.min(4, 0.8 + Math.abs(liftFloors.indexOf(y) - liftFloors.indexOf(liftFrom)) * 0.35), dy: y - liftFrom,
          from: liftFloors.indexOf(liftFrom), to: liftFloors.indexOf(y), label: b.textContent };
        $('lift-ride').classList.remove('hidden');
        tone(880, 0.12, 0.12, 'sine', 880);
        lock();
      });
      grid.appendChild(b);
    });
    tone(660, 0.08, 0.1, 'sine');
    setState('lift');
    if (document.pointerLockElement) document.exitPointerLock();
  }
  $('lift-close').addEventListener('click', () => lock());
  function updateLift(dt) {
    if (!liftRide) return;
    const r = liftRide;
    r.t += dt;
    const k = Math.min(1, r.t / r.dur);
    const idx = Math.round(r.from + (r.to - r.from) * k);
    $('lift-ride-floor').textContent = (r.to > r.from ? '▲ ' : '▼ ') + liftLabel(liftFloors[idx], idx, liftFloors);
    if (k >= 1) {
      player.pos.y += r.dy;
      player.vel.set(0, 0, 0);
      fallStartY = null;
      liftRide = null;
      $('lift-ride').classList.add('hidden');
      tone(1320, 0.25, 0.12, 'sine', 1320);
      toast('Этаж: ' + r.label);
    }
  }

  // люк: открыть (поднять к стенке) или закрыть
  function toggleTrapdoor(x, y, z) {
    const b = BLOCKS[world.getBlock(x, y, z)], t = b.trapdoor;
    if (t.open && intersectsPlayer(x, y, z)) return;                  // закрыть, стоя в проёме, нельзя
    world.setBlock(x, y, z, t.base + (t.open ? 0 : 4) + b.facing);
    tone(t.base === B.TRAPDOOR ? 330 : 180, 0.12, 0.12, 'square', t.open ? 220 : 140);
    swingT = 1;
  }
  // открыть или закрыть дверь — сразу обе половинки
  function toggleDoor(x, y, z) {
    const d = BLOCKS[world.getBlock(x, y, z)].door;
    const by = d.half === 'b' ? y : y - 1;
    const list = [];
    for (const yy of [by, by + 1]) {
      const b = BLOCKS[world.getBlock(x, yy, z)];
      if (!b || !b.door) continue;
      const half = b.door.half === 'b';
      const base = b.door.open ? (half ? B.DOOR : B.DOOR_TOP) : (half ? B.DOOR_OPEN : B.DOOR_TOP_OPEN);
      list.push([x, yy, z, base + b.facing]);
    }
    // закрыть дверь нельзя, если стоишь прямо в проёме
    if (d.open && list.some(([bx, byy, bz]) => intersectsPlayer(bx, byy, bz))) { toast('Отойди из дверного проёма'); return; }
    world.setBlocks(list);
    noiseBurst(0.12, d.open ? 700 : 1100, 0.25);
    tone(d.open ? 160 : 220, 0.08, 0.08, 'square');
    swingT = 1;
  }

  function sleep(t) {
    spawnPoint = { x: t.x + 0.5, z: t.z + 0.5 };
    if (dayFactor < 0.35) {
      timeOfDay = 0.02;
      mobs.list.filter(m => m.def.hostile).forEach(m => { m.dying = 0.4; });
      toast('Доброе утро! Ты выспался');
    } else toast('Спать можно только ночью. Здесь ты будешь появляться');
  }

  // мебель поворачивается «лицом» к игроку
  function facingId(id, x, z) {
    const b = BLOCKS[id];
    if (!b.boxes || !BLOCKS[id + 1] || BLOCKS[id + 1].base !== id) return id;
    const dx = player.pos.x - (x + 0.5), dz = player.pos.z - (z + 0.5);
    const f = Math.abs(dz) >= Math.abs(dx) ? (dz > 0 ? 0 : 2) : (dx > 0 ? 1 : 3);
    return id + f;
  }

  // ---------- Мод «Превращения» ----------
  // Герой становится свинкой, коровой, курочкой, Букой или одним из зомби: другой рост, скорость и умения.
  const MORPHS = [
    [null, '🧑', 'Стать собой', 'обычный герой'],
    ['pig', '🐷', 'Свинка', 'бегает чуть быстрее'],
    ['cow', '🐮', 'Корова', 'большая и неторопливая'],
    ['sheep', '🐑', 'Овечка', 'мягкая и пушистая'],
    ['chicken', '🐔', 'Курочка', 'плавно падает, несёт яйца'],
    ['villager', '🧑‍🌾', 'Житель', 'с большим носом'],
    ['buka', '👾', 'Бука', 'Буки принимают за своего'],
    ['zombie', '🧟', 'Зомби', 'Буки не нападают'],
    ['zombieVillager', '🧟‍♂️', 'Зомби-житель', 'Буки не нападают'],
    ['husk', '🏜️', 'Пустынный зомби', 'Буки не нападают'],
    ['drowned', '🌊', 'Утопленник', 'дышит под водой, быстро плавает'],
    ['babyZombie', '👶', 'Малыш-зомби', 'маленький и очень быстрый'],
    ['beetle', '🪲', 'Жук', 'крошечный, летает (держи прыжок)'],
    ['snail', '🐌', 'Улитка', 'медленная, ползает по стенам'],
    ['turtle', '🐢', 'Черепаха', 'быстро плавает, дышит под водой'],
    ['lizard', '🦎', 'Ящерица', 'очень быстрая, лазает по стенам'],
  ];
  const MORPH_SPEED = { pig: 1.15, cow: 0.85, sheep: 0.95, chicken: 0.85, zombie: 0.9, zombieVillager: 0.9, husk: 0.9, drowned: 0.9, babyZombie: 1.35,
    beetle: 0.8, snail: 0.35, turtle: 0.55, lizard: 1.45 };
  const morphSwims = () => morphType === 'drowned' || morphType === 'turtle';         // быстро плавают и дышат под водой
  const morphClimbs = () => morphType === 'snail' || morphType === 'lizard';         // ползают по стенам
  const morphGlides = () => morphType === 'chicken' || morphType === 'beetle';       // мягко падают
  const MORPH_VOICE = {
    pig: ['Хрю-хрю!', 260, 140], cow: ['Му-у-у!', 140, 110], sheep: ['Бе-е-е!', 420, 380], chicken: ['Ко-ко-ко!', 900, 700],
    villager: ['Хм-м-м!', 220, 180], buka: ['Бу-у!', 120, 60], zombie: ['Ррр-а-а!', 110, 80], zombieVillager: ['Хм-р-р-р!', 150, 90],
    husk: ['Хр-р-р...', 100, 70], drowned: ['Буль-буль!', 300, 120], babyZombie: ['Р-р-р!', 260, 180],
    beetle: ['Жжж-жжж!', 600, 640], snail: ['Шшш...', 900, 850], turtle: ['Ф-ф-ф!', 200, 160], lizard: ['Тсс!', 1200, 900],
  };
  let morphType = null, morphModel = null, eggCd = 0;
  const morphFriend = () => !!morphType && (morphType === 'buka' || MOB_TYPES[morphType].morphOnly);
  function setMorph(type, quiet) {
    if (type && pScale < 1) setSmall(false, true);
    const def = type ? MOB_TYPES[type] : null;
    const pw = def ? def.hw : 0.3, ph = def ? def.h * 0.98 : 1.8;
    if (!quiet && worldMeta && ph > PH) {                     // вырасти можно, только если хватает места
      const test = player.pos.clone();
      if (boxCollides(world, test, pw, ph)) {
        test.y = Math.floor(test.y + 0.99);
        if (boxCollides(world, test, pw, ph)) { toast('Тут мало места для такого превращения'); return; }
        player.pos.copy(test);
      }
    }
    if (morphModel) { scene.remove(morphModel.g); morphModel.mats.forEach(m => m.dispose()); morphModel = null; }
    morphType = type;
    PW = pw; PH = ph; EYE = def ? def.h * 0.85 : 1.62;
    camera.near = def && def.h < 0.8 ? 0.02 : 0.08;
    camera.updateProjectionMatrix();
    if (def) {
      morphModel = mobs.buildModel(type, type === 'villager' ? { robe: ROBES[1] } : null);
      morphModel.g.scale.setScalar(def.scale || 1);
      scene.add(morphModel.g);
    }
    updateHand();
    if (quiet) return;
    if (def && camMode === 0) { camMode = 1; updateHand(); }
    toast(def ? `Ты превратился: ${def.name}! (V — камера)` : 'Ты снова герой');
    spawnParticles(player.pos.x - 0.5, player.pos.y, player.pos.z - 0.5, 'zap', new THREE.Color(0xc8ff8f), 18);
    tone(def ? 300 : 600, 0.3, 0.1, 'triangle', def ? 900 : 300);
  }
  function morphVoice() {
    const v = MORPH_VOICE[morphType];
    if (!v) return;
    tone(v[1], 0.25, 0.12, morphType.includes('ombie') || morphType === 'husk' || morphType === 'buka' ? 'sawtooth' : 'triangle', v[2]);
    setTimeout(() => tone(v[1] * 1.1, 0.18, 0.1, 'triangle', v[2]), 220);
    if (morphType === 'chicken') {
      if (eggCd > 0) { toast('Яйцо ещё не готово'); return; }
      eggCd = 4;
      give(ITEM.EGG, 1);
      return;
    }
    toast(v[0]);
  }
  function updateMorph(dt) {
    eggCd -= dt;
    if (!morphModel) return;
    const m = morphModel;
    m.g.position.copy(player.pos);
    m.g.rotation.y = player.yaw + Math.PI;
    const walk = player.moving && player.onGround ? Math.sin(bobPhase * 2) * 0.6 : 0;
    m.legs.forEach((l, k) => { l.rotation.x = (k % 2 === (k < 2 ? 0 : 1) ? walk : -walk); });
    for (const mat of m.mats) if (!mat.userData.glow) mat.color.copy(mat.userData.base).multiplyScalar(lightLevel);
  }
  // меню
  MORPHS.forEach(([type, em, name, about]) => {
    const b = document.createElement('button');
    b.className = 'small morph-card';
    b.dataset.type = type || '';
    b.innerHTML = `<span class="em">${em}</span><b>${name}</b><small>${about}</small>`;
    b.addEventListener('click', () => { lock(); setMorph(type); });
    $('morph-grid').appendChild(b);
  });
  function openMorph() {
    if (!modOn('morph')) { toast('Скачай мод «Превращения» во вкладке «Моды»'); return; }
    if (riding) { toast('Сначала выйди из машины'); return; }
    document.querySelectorAll('.morph-card').forEach(c => c.classList.toggle('selected', c.dataset.type === (morphType || '')));
    setState('morph');
    if (document.pointerLockElement) document.exitPointerLock();
  }
  $('morph-close').addEventListener('click', () => lock());

  // ---------- Мод «Камеры видеонаблюдения» ----------
  // Каждая камера раз в секунду делает снимок того, что видит (последние 2 минуты), а экран показывает
  // прямой эфир или запись. Записи живут, пока открыт мир; камеры сохраняются вместе с миром.
  const cams = new Map();                 // "x,y,z" → { x, y, z, name, frames: [{ img, time }] }
  const CAM_W = 192, CAM_H = 144, CAM_FRAMES = 120;
  const camRT = new THREE.WebGLRenderTarget(CAM_W, CAM_H);
  const camView = new THREE.PerspectiveCamera(70, CAM_W / CAM_H, 0.1, 160);
  const camCanvas = document.createElement('canvas');
  camCanvas.width = CAM_W; camCanvas.height = CAM_H;
  const camCtx = camCanvas.getContext('2d');
  const camPixels = new Uint8Array(CAM_W * CAM_H * 4);
  let camRecT = 0, camSel = null, camLive = true, camIdx = 0, camPlay = false, camPlayT = 0, camLiveT = 0;
  const CAM_DIR = [[0, 1], [1, 0], [0, -1], [-1, 0]];        // куда смотрит камера с поворотом 0..3

  function addCam(x, y, z, name) {
    const key = x + ',' + y + ',' + z;
    if (!cams.has(key)) {
      let n = cams.size + 1;
      const used = new Set([...cams.values()].map(c => c.name));
      while (used.has('Камера ' + n)) n++;
      cams.set(key, { x, y, z, name: name || 'Камера ' + n, frames: [] });
    }
    return cams.get(key);
  }
  // снимок с камеры: картинка с подписью и красной точкой записи
  function shootCam(c) {
    const b = BLOCKS[world.getBlock(c.x, c.y, c.z)];
    if (!b || !b.camera) return null;
    const [dx, dz] = CAM_DIR[b.facing];
    camView.position.set(c.x + 0.5 + dx * 0.45, c.y + 0.6, c.z + 0.5 + dz * 0.45);
    camView.lookAt(c.x + 0.5 + dx * 3, c.y - 0.6, c.z + 0.5 + dz * 3);
    camView.updateMatrixWorld();
    // на записи виден сам герой, но не его рука
    const pmVis = playerModel && playerModel.root.visible, handVis = hand.visible;
    if (playerModel && !riding) {
      playerModel.root.visible = true;
      playerModel.root.position.copy(player.pos);
      playerModel.root.rotation.y = player.yaw + Math.PI;
      playerModel.root.scale.setScalar(pScale);
    }
    hand.visible = false;
    renderer.setRenderTarget(camRT);
    renderer.render(scene, camView);
    renderer.readRenderTargetPixels(camRT, 0, 0, CAM_W, CAM_H, camPixels);
    renderer.setRenderTarget(null);
    if (playerModel) playerModel.root.visible = pmVis;
    hand.visible = handVis;
    const img = camCtx.createImageData(CAM_W, CAM_H);
    for (let y = 0; y < CAM_H; y++) img.data.set(camPixels.subarray((CAM_H - 1 - y) * CAM_W * 4, (CAM_H - y) * CAM_W * 4), y * CAM_W * 4);
    camCtx.putImageData(img, 0, 0);
    camCtx.font = '10px "Press Start 2P", monospace';
    camCtx.fillStyle = 'rgba(0,0,0,0.45)'; camCtx.fillRect(0, CAM_H - 16, CAM_W, 16);
    camCtx.fillStyle = '#fff'; camCtx.fillText(c.name.toUpperCase(), 4, CAM_H - 4);
    camCtx.fillText(gameClock(), CAM_W - 48, CAM_H - 4);
    if (Math.floor(performance.now() / 500) % 2) { camCtx.fillStyle = '#f33'; camCtx.beginPath(); camCtx.arc(10, 10, 4, 0, 7); camCtx.fill(); camCtx.fillStyle = '#fff'; camCtx.fillText('REC', 18, 14); }
    return camCtx.canvas.toDataURL('image/jpeg', 0.7);
  }
  function updateCams(dt) {
    if (!worldMeta || !cams.size || !modOn('cameras')) return;
    camRecT -= dt;
    if (camRecT <= 0) {
      camRecT = 1;
      // пишут ближайшие камеры (до 6 штук в 100 блоках)
      const near = [...cams.values()].map(c => ({ c, d: Math.hypot(c.x - player.pos.x, c.z - player.pos.z) }))
        .filter(o => o.d < 100 && world.chunks.has(Math.floor(o.c.x / CS) + ',' + Math.floor(o.c.z / CS))).sort((a, b) => a.d - b.d).slice(0, 6);
      for (const { c } of near) {
        const b = BLOCKS[world.getBlock(c.x, c.y, c.z)];
        if (!b || !b.camera) { cams.delete(c.x + ',' + c.y + ',' + c.z); continue; }
        const img = shootCam(c);
        if (!img) continue;
        c.frames.push({ img, time: gameClock() });
        if (c.frames.length > CAM_FRAMES) c.frames.shift();
      }
    }
    if (state === 'cams') updateCamView(dt);
  }

  // экран: список камер, прямой эфир и перемотка записи
  function openCams() {
    if (!modOn('cameras')) { toast('Скачай мод «Камеры» во вкладке «Моды»'); return; }
    setState('cams');
    if (document.pointerLockElement) document.exitPointerLock();
    if (!camSel || !cams.has(camSel)) camSel = cams.size ? [...cams.keys()][0] : null;
    camLive = true; camPlay = false;
    renderCamList();
    updateCamView(1);
  }
  function renderCamList() {
    const list = $('cams-list');
    list.innerHTML = '';
    for (const [key, c] of cams) {
      const b = document.createElement('button');
      b.className = 'small' + (key === camSel ? ' selected' : '');
      b.textContent = `${c.name} (${c.x}, ${c.y}, ${c.z})`;
      b.addEventListener('click', () => { camSel = key; camLive = true; camPlay = false; renderCamList(); updateCamView(1); });
      list.appendChild(b);
    }
  }
  function updateCamView(dt) {
    const c = camSel && cams.get(camSel);
    const empty = $('cams-empty'), img = $('cams-img'), range = $('cams-time');
    if (!c) {
      img.style.visibility = 'hidden';
      empty.textContent = 'Камер пока нет. Сделай камеру на верстаке (2 железа, стекло, чёрная шерсть) и повесь на стену — она смотрит туда, где ты стоял.';
      return;
    }
    empty.textContent = '';
    img.style.visibility = 'visible';
    range.max = Math.max(0, c.frames.length - 1);
    $('cams-live').classList.toggle('on', camLive);
    $('cams-play').textContent = camPlay ? '⏸' : '▶';
    if (camLive) {
      camLiveT -= dt;
      if (camLiveT <= 0) { camLiveT = 0.2; const s = shootCam(c); if (s) img.src = s; }
      range.value = range.max;
      $('cams-label').textContent = 'сейчас ' + gameClock();
      return;
    }
    if (camPlay) {
      camPlayT -= dt;
      if (camPlayT <= 0) { camPlayT = 0.5; camIdx++; if (camIdx >= c.frames.length) { camIdx = c.frames.length - 1; camPlay = false; } }
    }
    camIdx = Math.max(0, Math.min(camIdx, c.frames.length - 1));
    const f = c.frames[camIdx];
    if (f && img.dataset.idx !== camSel + ':' + camIdx) { img.src = f.img; img.dataset.idx = camSel + ':' + camIdx; }
    range.value = camIdx;
    $('cams-label').textContent = f ? `запись ${f.time} (${camIdx + 1}/${c.frames.length})` : 'записи пока нет';
  }
  $('cams-live').addEventListener('click', () => { camLive = true; camPlay = false; updateCamView(1); });
  $('cams-play').addEventListener('click', () => {
    const c = camSel && cams.get(camSel);
    if (!c || !c.frames.length) return;
    if (camLive) { camLive = false; camIdx = 0; }
    camPlay = !camPlay;
    if (camPlay && camIdx >= c.frames.length - 1) camIdx = 0;
    updateCamView(0);
  });
  $('cams-time').addEventListener('input', e => { camLive = false; camPlay = false; camIdx = +e.target.value; updateCamView(0); });
  $('cams-close').addEventListener('click', () => lock());
  $('inv-cams').addEventListener('click', () => openCams());

  // ---------- Мод «World changing» ----------
  // Палочка: левая кнопка — точка 1, правая — точка 2 (или кисть-шар). Клавиша G — панель с командами.
  const WE = { p1: null, p2: null, block: B.STONE, mask: null, clip: null, undo: [], redo: [], MAX: 150000 };
  const weLine = new THREE.LineBasicMaterial({ color: 0xffd23f, depthTest: false, transparent: true, opacity: 0.9, fog: false });
  const weBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), weLine);
  const weP1 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04)), new THREE.LineBasicMaterial({ color: 0xff5050, depthTest: false, fog: false }));
  const weP2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04)), new THREE.LineBasicMaterial({ color: 0x50a0ff, depthTest: false, fog: false }));
  for (const m of [weBox, weP1, weP2]) { m.visible = false; m.renderOrder = 10; m.frustumCulled = false; scene.add(m); }
  let weTried = false;
  const holdingWand = () => !!(ITEMS[currentId()] && ITEMS[currentId()].wand);

  function weSel(quiet) {
    if (!WE.p1 || !WE.p2) { if (!quiet) toast('Сначала выбери палочкой две точки: левая и правая кнопка'); return null; }
    const s = { x0: Math.min(WE.p1[0], WE.p2[0]), x1: Math.max(WE.p1[0], WE.p2[0]), y0: Math.min(WE.p1[1], WE.p2[1]), y1: Math.max(WE.p1[1], WE.p2[1]),
      z0: Math.min(WE.p1[2], WE.p2[2]), z1: Math.max(WE.p1[2], WE.p2[2]) };
    s.w = s.x1 - s.x0 + 1; s.h = s.y1 - s.y0 + 1; s.d = s.z1 - s.z0 + 1; s.n = s.w * s.h * s.d;
    return s;
  }
  function weUpdateBox() {
    const s = weSel(true);
    weBox.visible = !!s && !!worldMeta;
    if (s) { weBox.position.set((s.x0 + s.x1 + 1) / 2, (s.y0 + s.y1 + 1) / 2, (s.z0 + s.z1 + 1) / 2); weBox.scale.set(s.w + 0.04, s.h + 0.04, s.d + 0.04); }
    weP1.visible = !!WE.p1 && !!worldMeta; weP2.visible = !!WE.p2 && !!worldMeta;
    if (WE.p1) weP1.position.set(WE.p1[0] + 0.5, WE.p1[1] + 0.5, WE.p1[2] + 0.5);
    if (WE.p2) weP2.position.set(WE.p2[0] + 0.5, WE.p2[1] + 0.5, WE.p2[2] + 0.5);
  }
  function weSetPoint(k, p) {
    WE['p' + k] = p;
    weUpdateBox();
    const s = weSel(true);
    toast(`Точка ${k}: ${p.join(', ')}` + (s ? ` · ${s.w}×${s.h}×${s.d} = ${s.n} блоков` : ''));
    tone(k === 1 ? 700 : 900, 0.08, 0.08, 'square');
    swingT = 1;
  }
  // мебель и двери поворачиваются и отражаются вместе с постройкой
  const weTurn = (id, n) => { const b = BLOCKS[id]; return b && b.base && b.facing !== undefined && BLOCKS[b.base + 3] && BLOCKS[b.base + 3].base === b.base ? b.base + (b.facing + n) % 4 : id; };
  const weMirror = id => { const b = BLOCKS[id]; return b && b.base && b.facing !== undefined && BLOCKS[b.base + 3] && BLOCKS[b.base + 3].base === b.base ? b.base + [0, 3, 2, 1][b.facing] : id; };
  const weMatch = id => WE.mask === null || (WE.mask === B.AIR ? id === B.AIR || isLiquidB(id) : (BLOCKS[id] && (BLOCKS[id].base || id)) === WE.mask);
  const weN = () => Math.max(1, Math.min(48, parseInt($('we-n').value, 10) || 5));
  const weH = () => Math.max(1, Math.min(100, parseInt($('we-h').value, 10) || 5));
  function weDir() {
    updateLook();
    const v = [lookDir.x, lookDir.y, lookDir.z], a = v.map(Math.abs), i = a.indexOf(Math.max(...a)), d = [0, 0, 0];
    d[i] = Math.sign(v[i]);
    return d;
  }
  // записать изменения одним махом и запомнить, как было (для «Отменить»)
  function weApply(list, label) {
    list = list.filter(c => c[1] > 0 && c[1] < CH && world.getBlock(c[0], c[1], c[2]) !== c[3]);
    if (!list.length) { toast(label + ': ничего не поменялось'); return; }
    if (list.length > WE.MAX) { toast(`Слишком много: ${list.length} блоков (можно до ${WE.MAX})`); return; }
    const before = list.map(([x, y, z]) => { const id = world.getBlock(x, y, z); return [x, y, z, id === B.MINI ? B.AIR : id]; });
    world.setBlocks(list);
    WE.undo.push(before); if (WE.undo.length > 30) WE.undo.shift();
    WE.redo.length = 0;
    toast(`${label}: ${list.length} блоков`);
    tone(520, 0.15, 0.1, 'triangle', 1040);
  }
  function weEach(s, fn) { for (let y = s.y0; y <= s.y1; y++) for (let z = s.z0; z <= s.z1; z++) for (let x = s.x0; x <= s.x1; x++) fn(x, y, z); }
  // где строить фигуру: блок, на который смотрим (до 40 блоков), иначе — под ногами
  function weCenter(onTop) {
    updateLook();
    const t = raycast(40);
    if (t) return onTop ? [t.x + t.n[0], t.y + t.n[1], t.z + t.n[2]] : [t.x, t.y, t.z];
    return [Math.floor(player.pos.x), Math.floor(player.pos.y), Math.floor(player.pos.z)];
  }
  function weSphere(c, r, hollow, id, label) {
    const list = [];
    for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y + z * z);
      if (d > r + 0.5 || (hollow && d < r - 0.5)) continue;
      const cur = world.getBlock(c[0] + x, c[1] + y, c[2] + z);
      if (weMatch(cur)) list.push([c[0] + x, c[1] + y, c[2] + z, id]);
    }
    weApply(list, label);
  }

  const WE_ACTIONS = [
    ['Выделение'],
    ['Точка 1 здесь (//pos1)', () => weSetPoint(1, [Math.floor(player.pos.x), Math.floor(player.pos.y), Math.floor(player.pos.z)])],
    ['Точка 2 здесь (//pos2)', () => weSetPoint(2, [Math.floor(player.pos.x), Math.floor(player.pos.y), Math.floor(player.pos.z)])],
    ['Растянуть куда смотрю (//expand)', () => {
      const s = weSel(); if (!s) return;
      const d = weDir(), n = weN();
      for (let a = 0; a < 3; a++) if (d[a]) {
        const far = d[a] > 0 ? Math.max(WE.p1[a], WE.p2[a]) : Math.min(WE.p1[a], WE.p2[a]);
        const P = WE.p1[a] === far ? WE.p1 : WE.p2;
        P[a] += d[a] * n;
      }
      weUpdateBox(); const t = weSel(true); toast(`Выделение: ${t.w}×${t.h}×${t.d}`);
    }],
    ['Снять выделение (//sel)', () => { WE.p1 = WE.p2 = null; weUpdateBox(); toast('Выделение снято'); }],
    ['Изменить'],
    ['Заполнить (//set)', () => { const s = weSel(); if (!s) return; const l = []; weEach(s, (x, y, z) => l.push([x, y, z, WE.block])); weApply(l, 'Заполнено'); }],
    ['Заменить (//replace)', () => {
      const s = weSel(); if (!s) return;
      if (WE.mask === null) { toast('Выбери в «Менять только», какой блок заменить'); return; }
      const l = []; weEach(s, (x, y, z) => { if (weMatch(world.getBlock(x, y, z))) l.push([x, y, z, WE.block]); }); weApply(l, 'Заменено');
    }],
    ['Очистить (//set air)', () => { const s = weSel(); if (!s) return; const l = []; weEach(s, (x, y, z) => { if (weMatch(world.getBlock(x, y, z))) l.push([x, y, z, B.AIR]); }); weApply(l, 'Очищено'); }],
    ['Стены (//walls)', () => { const s = weSel(); if (!s) return; const l = []; weEach(s, (x, y, z) => { if (x === s.x0 || x === s.x1 || z === s.z0 || z === s.z1) l.push([x, y, z, WE.block]); }); weApply(l, 'Стены'); }],
    ['Коробка (//faces)', () => { const s = weSel(); if (!s) return; const l = []; weEach(s, (x, y, z) => { if (x === s.x0 || x === s.x1 || z === s.z0 || z === s.z1 || y === s.y0 || y === s.y1) l.push([x, y, z, WE.block]); }); weApply(l, 'Коробка'); }],
    ['Повторить N раз туда, куда смотрю (//stack)', () => {
      const s = weSel(); if (!s) return;
      const d = weDir(), n = weN(), size = [s.w, s.h, s.d], l = [];
      for (let k = 1; k <= n; k++) weEach(s, (x, y, z) => l.push([x + d[0] * size[0] * k, y + d[1] * size[1] * k, z + d[2] * size[2] * k, world.getBlock(x, y, z)]));
      weApply(l, 'Повторено');
    }],
    ['Сдвинуть на N туда, куда смотрю (//move)', () => {
      const s = weSel(); if (!s) return;
      const d = weDir(), n = weN(), put = new Map();
      weEach(s, (x, y, z) => put.set(x + ',' + y + ',' + z, [x, y, z, B.AIR]));
      weEach(s, (x, y, z) => { const nx = x + d[0] * n, ny = y + d[1] * n, nz = z + d[2] * n; put.set(nx + ',' + ny + ',' + nz, [nx, ny, nz, world.getBlock(x, y, z)]); });
      weApply([...put.values()], 'Сдвинуто');
      for (const P of [WE.p1, WE.p2]) for (let a = 0; a < 3; a++) P[a] += d[a] * n;
      weUpdateBox();
    }],
    ['Буфер'],
    ['Копировать (//copy)', () => weCopy(false)],
    ['Вырезать (//cut)', () => weCopy(true)],
    ['Вставить у меня (//paste)', () => {
      if (!WE.clip) { toast('Сначала скопируй что-нибудь'); return; }
      const px = Math.floor(player.pos.x), py = Math.floor(player.pos.y), pz = Math.floor(player.pos.z);
      weApply(WE.clip.filter(c => c[3] !== B.AIR).map(([x, y, z, id]) => [px + x, py + y, pz + z, id]), 'Вставлено');
    }],
    ['Повернуть копию на 90° (//rotate)', () => {
      if (!WE.clip) { toast('Сначала скопируй что-нибудь'); return; }
      WE.clip = WE.clip.map(([x, y, z, id]) => [-z, y, x, weTurn(id, 3)]);
      toast('Копия повёрнута на 90°');
    }],
    ['Отразить копию (//flip)', () => {
      if (!WE.clip) { toast('Сначала скопируй что-нибудь'); return; }
      WE.clip = WE.clip.map(([x, y, z, id]) => [-x, y, z, weMirror(id)]);
      toast('Копия отражена');
    }],
    ['Фигуры'],
    ['Шар радиусом N (//sphere)', () => weSphere(weCenter(false), weN(), $('we-hollow').checked, WE.block, 'Шар')],
    ['Цилиндр N × высота (//cyl)', () => {
      const c = weCenter(true), r = weN(), h = weH(), hollow = $('we-hollow').checked, l = [];
      for (let y = 0; y < h; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
        const d = Math.hypot(x, z);
        if (d > r + 0.5 || (hollow && d < r - 0.5)) continue;
        if (weMatch(world.getBlock(c[0] + x, c[1] + y, c[2] + z))) l.push([c[0] + x, c[1] + y, c[2] + z, WE.block]);
      }
      weApply(l, 'Цилиндр');
    }],
    ['Пирамида высотой N (//pyramid)', () => {
      const c = weCenter(true), n = weN(), hollow = $('we-hollow').checked, l = [];
      for (let y = 0; y < n; y++) { const r = n - 1 - y; for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
        if (hollow && Math.max(Math.abs(x), Math.abs(z)) < r && y > 0) continue;
        if (weMatch(world.getBlock(c[0] + x, c[1] + y, c[2] + z))) l.push([c[0] + x, c[1] + y, c[2] + z, WE.block]);
      } }
      weApply(l, 'Пирамида');
    }],
    ['Убрать воду вокруг (//drain)', () => {
      const r = weN() * 2, c = [Math.floor(player.pos.x), Math.floor(player.pos.y), Math.floor(player.pos.z)], l = [];
      for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) if (isWaterB(world.getBlock(c[0] + x, c[1] + y, c[2] + z))) l.push([c[0] + x, c[1] + y, c[2] + z, B.AIR]);
      weApply(l, 'Вода убрана');
    }],
    ['История'],
    ['Отменить (//undo)', () => {
      const u = WE.undo.pop(); if (!u) { toast('Отменять нечего'); return; }
      WE.redo.push(u.map(([x, y, z]) => [x, y, z, world.getBlock(x, y, z)]));
      world.setBlocks(u); toast(`Отменено: ${u.length} блоков`);
    }],
    ['Вернуть (//redo)', () => {
      const r = WE.redo.pop(); if (!r) { toast('Возвращать нечего'); return; }
      WE.undo.push(r.map(([x, y, z]) => [x, y, z, world.getBlock(x, y, z)]));
      world.setBlocks(r); toast(`Возвращено: ${r.length} блоков`);
    }],
  ];
  function weCopy(cut) {
    const s = weSel(); if (!s) return;
    if (s.n > WE.MAX) { toast(`Слишком большое выделение: ${s.n} блоков`); return; }
    const px = Math.floor(player.pos.x), py = Math.floor(player.pos.y), pz = Math.floor(player.pos.z);
    WE.clip = [];
    weEach(s, (x, y, z) => { const id = world.getBlock(x, y, z); WE.clip.push([x - px, y - py, z - pz, id === B.MINI ? B.AIR : id]); });
    if (cut) { const l = []; weEach(s, (x, y, z) => l.push([x, y, z, B.AIR])); weApply(l, 'Вырезано'); }
    else toast(`Скопировано: ${s.n} блоков. Вставка — относительно того, где ты стоишь сейчас`);
  }

  // панель
  WE_ACTIONS.forEach(([name, fn]) => {
    if (!fn) { const h = document.createElement('h3'); h.textContent = name; $('we-actions').appendChild(h); return; }
    const b = document.createElement('button');
    b.className = 'small';
    b.textContent = name;
    b.addEventListener('click', () => { lock(); fn(); });
    $('we-actions').appendChild(b);
  });
  function wePickers() {
    const ids = [];
    for (let i = 0; i < 36; i++) { const st = inv.slots[i]; if (st && isBlockId(st.id) && !ids.includes(st.id)) ids.push(st.id); }
    const fill = (el, opts, cur, set) => {
      el.innerHTML = '';
      for (const [id, label] of opts) {
        const b = document.createElement('button');
        b.className = id === cur ? 'selected' : '';
        b.title = label;
        if (id > 0) b.innerHTML = `<img src="${itemIcon(id)}" alt="">`; else { b.textContent = label; b.classList.add('txt'); }
        b.addEventListener('click', () => { set(id); wePickers(); });
        el.appendChild(b);
      }
    };
    fill($('we-block'), [...ids.map(id => [id, itemName(id)]), [B.AIR, 'Воздух']], WE.block, id => { WE.block = id; });
    fill($('we-mask'), [[null, 'Любой'], ...ids.map(id => [BLOCKS[id].base || id, itemName(id)]), [B.AIR, 'Воздух']], WE.mask, id => { WE.mask = id; });
    const s = weSel(true);
    $('we-status').innerHTML = (WE.p1 ? `Точка 1: ${WE.p1.join(', ')}` : 'Точка 1: левая кнопка палочкой') + '<br>' +
      (WE.p2 ? `Точка 2: ${WE.p2.join(', ')}` : 'Точка 2: правая кнопка палочкой') + '<br>' +
      (s ? `Выделено: ${s.w}×${s.h}×${s.d} = ${s.n} блоков` : '') + (WE.clip ? ` · в буфере ${WE.clip.length}` : '') +
      ` · отменить можно ${WE.undo.length} раз`;
  }
  function openWE() {
    if (!modOn('worldchanging')) { toast('Скачай мод «World changing» во вкладке «Моды»'); return; }
    if (!isCreative()) { toast('World changing работает в творческом режиме'); return; }
    if (isBlockId(currentId())) WE.block = currentId();
    wePickers();
    setState('we');
    if (document.pointerLockElement) document.exitPointerLock();
  }
  $('we-close').addEventListener('click', () => lock());
  // палочка в руке
  function weWandLeft() {
    updateLook();
    const t = raycast(64);
    if (t) weSetPoint(1, [t.x, t.y, t.z]);
  }
  function weWandRight() {
    if (!modOn('worldchanging')) { toast('Скачай мод «World changing» во вкладке «Моды»'); return; }
    updateLook();
    const t = raycast(64);
    if (!t) return;
    if ($('we-brush').checked) {
      if (!isCreative()) { toast('World changing работает в творческом режиме'); return; }
      weSphere([t.x, t.y, t.z], weN(), $('we-hollow').checked, WE.block, 'Кисть');
      return;
    }
    weSetPoint(2, [t.x, t.y, t.z]);
  }

  // ---------- Мод «Физган» ----------
  // В луче можно держать: летающий блок, моба или машину. Блок, пока летит, — отдельный кубик,
  // а когда упадёт или его заморозят — снова становится блоком мира.
  const physBlocks = [];
  const physMat = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: 0.5 });
  litMaterials.push(physMat);
  let physHeld = null, physDist = 5, physTried = false;
  const physPrev = new THREE.Vector3(), physVel = new THREE.Vector3();
  const beamPts = 24;
  const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new Array(beamPts).fill(0).map(() => new THREE.Vector3())),
    new THREE.LineBasicMaterial({ color: 0x5ff0ff, fog: false }));
  beam.frustumCulled = false; beam.visible = false;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xaaffff, fog: false }));
  glow.visible = false;
  scene.add(beam, glow);
  const noGrab = id => !id || id === B.BEDROCK || isLiquidB(id) || id === B.MINI || (BLOCKS[id] && (BLOCKS[id].door || BLOCKS[id].chest || BLOCKS[id].furnace));

  // размеры коробки того, что держим: [полуширина, высота]
  function physBox(h) {
    if (h.kind === 'mob') return [h.obj.def.hw * (h.obj.size || 1), h.obj.def.h * (h.obj.size || 1)];
    if (h.kind === 'car') return [CAR_HW, CAR_H];
    return [0.49, 0.98];
  }
  function physGrab() {
    if (!modOn('physgun')) { toast('Скачай мод «Физган» во вкладке «Моды»'); return; }
    updateLook();
    const far = 14;
    const mh = mobs.raycast(eye, lookDir, far), ch = cars.list.length ? cars.raycast(eye, lookDir, far) : null;
    const fb = physBlocks.map(b => ({ b, t: rayBox(b.pos, 0.49, 0.98) })).filter(x => x.t !== null).sort((a, b) => a.t - b.t)[0];
    const bt = raycast(far);
    let best = null;
    const consider = (h, t) => { if (h && t !== null && (!best || t < best.t)) best = Object.assign(h, { t }); };
    if (mh && !mh.mob.dying) consider({ kind: 'mob', obj: mh.mob, pos: mh.mob.pos }, mh.t);
    if (ch && ch.car !== riding) consider({ kind: 'car', obj: ch.car, pos: ch.car.pos }, ch.t);
    if (fb) consider({ kind: 'block', obj: fb.b, pos: fb.b.pos }, fb.t);
    if (bt && !bt.mini && !noGrab(bt.id) && bt.y > 0) consider({ kind: 'cell', cell: bt }, bt.t);
    if (!best) { tone(180, 0.1, 0.06, 'square'); return; }
    if (best.kind === 'cell') {                               // блок мира превращается в летающий кубик
      const c = best.cell;
      world.setBlock(c.x, c.y, c.z, B.AIR);
      const b = physSpawn(c.id, c.x + 0.5, c.y, c.z + 0.5);
      best = { kind: 'block', obj: b, pos: b.pos, t: best.t };
    }
    physHeld = best;
    best.obj.held = true;
    best.obj.frozen = false;
    physDist = Math.max(2, Math.min(14, best.t + 0.5));
    physPrev.copy(best.pos);
    physVel.set(0, 0, 0);
    tone(260, 0.18, 0.1, 'sawtooth', 620);
    swingT = 1;
  }
  // луч против коробки (летающие блоки)
  function rayBox(p, hw, h) {
    const min = [p.x - hw, p.y, p.z - hw], max = [p.x + hw, p.y + h, p.z + hw], o = [eye.x, eye.y, eye.z], d = [lookDir.x, lookDir.y, lookDir.z];
    let t0 = 0, t1 = 14;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(d[a]) < 1e-9) { if (o[a] < min[a] || o[a] > max[a]) return null; continue; }
      let ta = (min[a] - o[a]) / d[a], tb = (max[a] - o[a]) / d[a];
      if (ta > tb) { const t = ta; ta = tb; tb = t; }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      if (t0 > t1) return null;
    }
    return t0;
  }
  function physSpawn(id, x, y, z) {
    const mesh = new THREE.Mesh(blockGeometry(id), physMat);
    scene.add(mesh);
    const b = { id, mesh, pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), held: false, frozen: false, spin: 0 };
    physBlocks.push(b);
    return b;
  }
  function physRelease() {
    const h = physHeld;
    physHeld = null;
    h.obj.held = false;
    const v = physVel.clone().clampLength(0, 30);               // бросок: с какой скоростью тащили, с такой и летит
    if (h.kind === 'mob') h.obj.vel.copy(v);
    else if (h.kind === 'car') { h.obj.vy = v.y; h.obj.px = v.x; h.obj.pz = v.z; h.obj.speed = 0; }
    else h.obj.vel.copy(v);
    tone(620, 0.15, 0.08, 'sawtooth', 240);
  }
  function physFreeze() {
    const h = physHeld;
    physHeld = null;
    h.obj.held = false;
    if (h.kind === 'block') physSettle(h.obj, true);
    else { h.obj.frozen = true; if (h.kind === 'mob') h.obj.vel.set(0, 0, 0); }
    tone(1200, 0.12, 0.08, 'sine', 1500);
    toast(h.kind === 'block' ? 'Блок заморожен' : h.kind === 'mob' ? `${h.obj.def.name}: заморожен в воздухе` : 'Машина заморожена в воздухе');
    spawnParticles(h.pos.x - 0.5, h.pos.y, h.pos.z - 0.5, 'zap', new THREE.Color(0x8fefff), 10);
  }
  // летающий блок встаёт в ближайшую свободную клетку
  function physSettle(b, here) {
    const x = Math.floor(b.pos.x), z = Math.floor(b.pos.z);
    let y = here ? Math.round(b.pos.y) : Math.floor(b.pos.y + 0.2);
    for (let k = 0; k < 6; k++, y++) {
      const cur = world.getBlock(x, y, z);
      if (cur === B.AIR || isLiquidB(cur)) {
        if (y >= 0 && y < CH && !intersectsPlayer(x, y, z)) { world.setBlock(x, y, z, b.id); break; }
      }
    }
    scene.remove(b.mesh);
    physBlocks.splice(physBlocks.indexOf(b), 1);
  }
  function physSettleAll() { while (physBlocks.length) { const b = physBlocks[0]; b.held = false; physSettle(b, true); } physHeld = null; }
  function physClear() { for (const b of physBlocks) scene.remove(b.mesh); physBlocks.length = 0; physHeld = null; beam.visible = glow.visible = false; }

  function updatePhysgun(dt) {
    const h = physHeld;
    if (h && (!(ITEMS[currentId()] && ITEMS[currentId()].physgun) || (h.kind === 'mob' && h.obj.dying) || state !== 'playing' && state !== 'inventory')) physRelease();
    if (physHeld) {
      updateLook();
      const [hw, hh] = physBox(h);
      const goal = eye.clone().addScaledVector(lookDir, physDist);
      goal.y -= hh / 2;
      // тянем к точке перед глазами, но сквозь стены не проходим
      const v = goal.clone().sub(h.pos).multiplyScalar(14).clampLength(0, 40);
      physPrev.copy(h.pos);
      moveBox(world, h.pos, v, hw, hh, dt);
      physVel.lerp(h.pos.clone().sub(physPrev).divideScalar(Math.max(dt, 1e-3)), 0.5);
      if (h.kind === 'mob') h.obj.group.position.copy(h.pos);
      if (h.kind === 'car') h.obj.group.position.copy(h.pos);
    }
    // падающие блоки
    for (let i = physBlocks.length - 1; i >= 0; i--) {
      const b = physBlocks[i];
      if (!b.held) {
        b.vel.y = Math.max(b.vel.y - 28 * dt, -40);
        const r = moveBox(world, b.pos, b.vel, 0.49, 0.98, dt);
        if (r.hitWall) { b.vel.x *= 0.5; b.vel.z *= 0.5; }
        if (r.onGround && Math.abs(b.vel.x) + Math.abs(b.vel.z) < 2) { physSettle(b, false); continue; }
        if (r.onGround) { b.vel.x *= 0.6; b.vel.z *= 0.6; }
        if (b.pos.y < -10) { scene.remove(b.mesh); physBlocks.splice(i, 1); continue; }
      }
      b.spin += dt * (b.held ? 1.5 : 4);
      b.mesh.position.set(b.pos.x, b.pos.y + 0.49, b.pos.z);
      b.mesh.rotation.set(b.held ? Math.sin(b.spin) * 0.15 : 0, b.held ? b.spin * 0.6 : 0, 0);
    }
    // луч: изогнутая линия от пушки до того, что держим
    beam.visible = glow.visible = !!physHeld;
    if (physHeld) {
      const [, hh] = physBox(physHeld);
      const end = physHeld.pos.clone(); end.y += hh / 2;
      const start = new THREE.Vector3(0.55, -0.45, -0.9).applyMatrix4(camera.matrixWorld);
      const mid = eye.clone().addScaledVector(lookDir, physDist * 0.6);
      const p = beam.geometry.attributes.position;
      const wob = performance.now() / 120;
      for (let i = 0; i < beamPts; i++) {
        const t = i / (beamPts - 1), a = (1 - t) * (1 - t), b2 = 2 * (1 - t) * t, c = t * t;
        p.setXYZ(i, a * start.x + b2 * mid.x + c * end.x + Math.sin(wob + i) * 0.02, a * start.y + b2 * mid.y + c * end.y + Math.cos(wob + i * 1.3) * 0.02, a * start.z + b2 * mid.z + c * end.z);
      }
      p.needsUpdate = true;
      glow.position.copy(end);
      glow.scale.setScalar(1 + Math.sin(wob) * 0.2);
    }
  }

  // ---------- Мод «Мини-мир» ----------
  let miniMode = false;            // строить мини-блоками (клавиша M); маленький герой строит ими всегда
  const miniBuild = () => modOn('mini') && (miniMode || pScale < 1);
  function zap() {
    tone(1400, 0.25, 0.12, 'sine', 300);
    swingT = 1;
  }
  function setSmall(on, quiet) {
    if (on && morphType) setMorph(null, true);
    const s = on ? 0.25 : 1;
    if (!on && pScale < 1 && !quiet) {
      // вырасти можно, только если над головой хватает места
      const test = player.pos.clone();
      let ok = !boxCollides(world, test, 0.3, 1.8);
      if (!ok) { test.y = Math.floor(test.y + 0.99); ok = !boxCollides(world, test, 0.3, 1.8); }
      if (!ok) { toast('Тут мало места, чтобы вырасти!'); return; }
      player.pos.copy(test);
    }
    pScale = s;
    PW = 0.3 * s; PH = 1.8 * s; EYE = 1.62 * s;
    camera.near = on ? 0.02 : 0.08;
    camera.updateProjectionMatrix();
    if (!quiet) {
      toast(on ? 'Ты уменьшился! Теперь ты строишь мини-блоками' : 'Ты снова обычного роста');
      spawnParticles(player.pos.x - 0.5, player.pos.y, player.pos.z - 0.5, 'zap', new THREE.Color(0x8fefff), 16);
    }
  }
  // Уменьшатель + левая кнопка: блок рассыпается на 64 мини-блока
  function shrinkBlock() {
    if (!target || target.mini || target.y === 0) return;
    if (!modOn('mini')) { toast('Скачай мод «Мини-мир» во вкладке «Моды»'); return; }
    if (!miniOk(target.id)) { toast('Этот блок нельзя уменьшить'); return; }
    world.splitBlock(target.x, target.y, target.z);
    zap();
    spawnParticles(target.x, target.y, target.z, 'zap', new THREE.Color(0x8fefff), 10);
    toast(`${BLOCKS[target.id].name}: 64 мини-блока`);
    updateLook();
    target = raycast();
  }

  function usePlace() {
    if (!target) return;
    const item = currentId();
    if (!isBlockId(item)) return;
    const sp = placeSpot(target);
    if (miniBuild() && miniOk(item)) { placeMini(item, sp); return; }
    const { x, y, z } = sp;
    if (target.mini && x === target.x && y === target.y && z === target.z) return;
    if (y < 0 || y >= CH) return;
    const cur = world.getBlock(x, y, z);
    if (cur !== B.AIR && !isLiquidB(cur)) return;
    const id = facingId(item, x, z);
    if (BLOCKS[item].door || BLOCKS[item].tall) {  // дверь и душ ставятся сразу в два блока высотой
      const up = world.getBlock(x, y + 1, z);
      if ((up !== B.AIR && !isLiquidB(up)) || y + 1 >= CH) { toast(BLOCKS[item].door ? 'Для двери нужно два блока высоты' : 'Нужно два блока высоты'); return; }
      if (BLOCKS[item].door && (intersectsPlayer(x, y, z) || intersectsPlayer(x, y + 1, z))) return;
      world.setBlocks([[x, y, z, id], [x, y + 1, z, (BLOCKS[item].door ? B.DOOR_TOP : BLOCKS[item].tall) + BLOCKS[id].facing]]);
      if (!isCreative()) { const st = current(); if (!--st.n) inv.slots[slot] = null; renderHotbar(); }
      blockSound(id, 'place');
      swingT = 1;
      updateLook();
      target = raycast();
      return;
    }
    if (IS_SOLID[id] && intersectsPlayer(x, y, z)) return;
    if (IS_SOLID[id] && mobs.list.some(m => !m.dying && x < m.pos.x + m.def.hw && x + 1 > m.pos.x - m.def.hw && y < m.pos.y + m.def.h && y + 1 > m.pos.y && z < m.pos.z + m.def.hw && z + 1 > m.pos.z - m.def.hw)) return;
    world.setBlock(x, y, z, id);
    if (BLOCKS[id].chest || BLOCKS[id].furnace) world.boxes.set(boxKey(x, y, z), newBox(BLOCKS[id].chest ? 'chest' : 'furnace'));
    if (BLOCKS[id].camera) toast(`${addCam(x, y, z).name}: запись идёт. Смотри на экране для камер`);
    if (!isCreative()) {
      const s = current();
      if (!--s.n) inv.slots[slot] = null;
      renderHotbar();
    }
    blockSound(id, 'place');
    swingT = 1;
    updateLook();
    target = raycast();
  }
  function placeMini(item, sp) {
    const { x, y, z, sx, sy, sz } = sp;
    if (y < 0 || y >= CH) return;
    const cur = world.getBlock(x, y, z);
    if (cur === B.MINI) { const a = world.getMini(x, y, z); if (a && a[(sy * 4 + sz) * 4 + sx]) return; }
    else if (cur !== B.AIR && !isLiquidB(cur)) return;
    // не ставим кубик внутрь героя
    const p = player.pos, bx = x + sx / 4, by = y + sy / 4, bz = z + sz / 4;
    if (IS_SOLID[item] && bx < p.x + PW && bx + 0.25 > p.x - PW && by < p.y + PH && by + 0.25 > p.y && bz < p.z + PW && bz + 0.25 > p.z - PW) return;
    if (!bankMini(item, -1)) return;
    world.setMini(x, y, z, sx, sy, sz, item);
    blockSound(item, 'place');
    swingT = 1;
    updateLook();
    target = raycast();
  }
  function pickBlock() {
    if (!target || !isCreative()) return;
    const tid = target.mini ? target.mini.id : target.id;
    let id = (BLOCKS[tid].door ? B.DOOR : BLOCKS[tid].base) || tid;
    if (id === B.FURNACE_LIT) id = B.FURNACE;
    if (BLOCKS[id] && BLOCKS[id].trapdoor) id = BLOCKS[id].trapdoor.base;
    if (BLOCKS[id] && BLOCKS[id].tallTop) id = BLOCKS[id].tallTop;
    const i = inv.slots.findIndex((s, k) => k < 9 && s && s.id === id);
    if (i >= 0) { selectSlot(i); return; }
    inv.slots[slot] = { id, n: 64 };
    selectSlot(slot);
  }

  function attack(h) {
    attackCd = 0.4;
    swingT = 1;
    const it = ITEMS[currentId()];
    const dmg = it && it.damage ? it.damage : 1;
    const dx = h.mob.pos.x - player.pos.x, dz = h.mob.pos.z - player.pos.z, l = Math.hypot(dx, dz) || 1;
    noiseBurst(0.08, 1200, 0.25);
    const mob = h.mob;
    if (mobs.hit(mob, dmg, dx / l, dz / l)) {
      const col = mob.def.hostile ? MOB_COLOR : new THREE.Color(mob.mats[0].userData.base);
      spawnParticles(mob.pos.x - 0.5, mob.pos.y, mob.pos.z - 0.5, 'mob-' + mob.type, col, 20);
      tone(300, 0.25, 0.2, 'square', 80);
      if (isCreative()) return;
      if (mob.def.hostile && Math.random() < 0.5) give(ITEM.COAL, 1);
      for (const [id, a, b] of mob.def.drops || []) give(id, a + Math.floor(Math.random() * (b - a + 1)));
    } else if (mob.type === 'villager') toast('Житель: Ай! Не дерись!');
  }

  // ---------- Машины и самолёты ----------
  const managerOf = v => (v.kind === 'plane' ? planes : v.kind === 'train' ? trains : cars);
  function carTarget() {
    let h = null;
    for (const hit of [cars.list.length && cars.raycast(eye, lookDir, 8), planes.list.length && planes.raycast(eye, lookDir, 8),
      trains.list.length && trains.raycast(eye, lookDir, 5)]) if (hit && (!h || hit.t < h.t)) h = hit;
    if (!h || (target && target.t < h.t)) return null;
    return h;
  }
  function placeVehicle(it, kind) {
    const isPlane = kind === 'plane';
    const spec = !isPlane && it.carStyle ? REAL_CARS[it.carStyle] : null;
    const name = isPlane ? 'самолёт' : spec && spec.boat ? 'корабль' : 'машину';
    const mod = it.mod || (isPlane ? 'planes' : 'cars');
    if (!modOn(mod)) { toast(`Включи мод «${MOD_NAMES[mod] || mod}» в главном меню`); return; }
    if (!target || target.n[1] !== 1) { toast(spec && spec.boat ? 'Поставь корабль на воду: нажми на дно под водой' : `Поставь ${name} на землю`); return; }
    let x = target.x + 0.5, y = target.y + 1, z = target.z + 0.5;
    if (spec && spec.boat) {                                     // корабль — только на воду
      if (!isWaterB(world.getBlock(target.x, target.y + 1, target.z))) { toast('Корабль ставится на воду: нажми на дно под водой'); return; }
      let top = target.y + 1;
      while (isWaterB(world.getBlock(target.x, top + 1, target.z))) top++;
      y = top + 0.88 - spec.draft;
    }
    const pt = PLANE_TYPES[it.planeType || 'small'];
    const hw = isPlane ? pt.hw : spec ? spec.hw : CAR_HW, h = isPlane ? pt.h : spec ? spec.h : CAR_H;
    if (boxCollides(world, new THREE.Vector3(x, y, z), hw, h) || intersectsPlayer(x - hw, y, z - hw)) { toast(`Тут мало места для ${isPlane ? 'самолёта' : 'машины'}`); return; }
    if (isPlane) planes.add(x, y, z, player.yaw + Math.PI, it.plane, it.planeType);
    else cars.add(x, y, z, player.yaw + Math.PI, it.car, it.carStyle);
    if (!isCreative()) { const s = current(); if (!--s.n) inv.slots[slot] = null; renderHotbar(); }
    tone(200, 0.2, 0.15, 'square', 400);
    toast(`Нажми правой кнопкой на ${name}, чтобы сесть`);
  }
  // поезд метро ставится на рельсы и сам выбирает направление по рельсам
  // поезд метро или вагонетка ставятся на рельсы и едут вдоль них
  function placeOnRail(kind) {
    const cart = kind === 'cart';
    if (!cart && !modOn('metro')) { toast('Включи мод «Метро» в главном меню'); return; }
    if (!target || BLOCKS[target.id].base !== B.RAIL) { toast(cart ? 'Поставь вагонетку на рельсы' : 'Поставь поезд на рельсы'); return; }
    const along = BLOCKS[target.id].facing % 2 === 0 ? 'z' : 'x';
    // едем туда, куда смотрит игрок
    const look = along === 'z' ? lookDir.z : lookDir.x;
    trains.add({
      axis: along, cross: (along === 'z' ? target.x : target.z) + 0.5, y: target.y,
      s: (along === 'z' ? target.z : target.x) + 0.5, dir: look >= 0 ? 1 : -1, color: 0xd03030, cart,
    });
    if (!isCreative()) { const st = current(); if (!--st.n) inv.slots[slot] = null; renderHotbar(); }
    tone(200, 0.2, 0.15, 'square', 400);
    toast(cart ? 'Садись в вагонетку правой кнопкой' : 'Поезд поедет сам. Положи мрамор под рельсы — там будут остановки');
  }

  // ---------- Динамит ----------
  const primed = [];
  const primedGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
  function igniteDynamite(x, y, z, fuse) {
    if (world.getBlock(x, y, z) === B.DYNAMITE) world.setBlock(x, y, z, B.AIR);
    const mesh = new THREE.Mesh(blockGeometry(B.DYNAMITE), new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true }));
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    scene.add(mesh);
    primed.push({ x, y, z, t: fuse, mesh });
    noiseBurst(fuse, 3000, 0.06);       // шипит фитиль
  }
  function updatePrimed(dt) {
    for (let i = primed.length - 1; i >= 0; i--) {
      const p = primed[i];
      p.t -= dt;
      const blink = Math.floor(p.t * 6) % 2 === 0;
      p.mesh.material.color.setScalar(blink ? 2.2 : lightLevel);
      p.mesh.scale.setScalar(1 + (p.t < 0.6 ? (0.6 - p.t) * 0.3 : 0));
      if (p.t <= 0) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
        primed.splice(i, 1);
        explode(p.x + 0.5, p.y + 0.5, p.z + 0.5, 4);
      }
    }
  }
  let shake = 0;
  function explode(cx, cy, cz, power) {
    const list = [];
    const r = Math.ceil(power);
    for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dy, dz);
      if (d > power - Math.random() * 0.9) continue;
      const x = Math.floor(cx) + dx, y = Math.floor(cy) + dy, z = Math.floor(cz) + dz;
      const id = world.getBlock(x, y, z);
      if (!id || id === B.BEDROCK || id === B.OBSIDIAN || isLiquidB(id)) continue;   // обсидиан не берёт даже динамит
      if (id === B.DYNAMITE) { igniteDynamite(x, y, z, 0.3 + Math.random() * 0.5); continue; }
      list.push([x, y, z, B.AIR]);
    }
    world.setBlocks(list);
    // огонь и дым
    spawnParticles(cx - 0.5, cy - 0.5, cz - 0.5, 'boom', new THREE.Color(0xffa030), 40);
    spawnParticles(cx - 0.5, cy, cz - 0.5, 'smoke', new THREE.Color(0x555555), 40);
    noiseBurst(1.2, 300, 0.9);
    tone(70, 0.8, 0.5, 'sawtooth', 30);
    // урон и отбрасывание
    const pd = Math.hypot(player.pos.x - cx, player.pos.y + 0.9 - cy, player.pos.z - cz);
    if (pd < power * 2) {
      shake = Math.max(shake, 1 - pd / (power * 2));
      if (!riding) {
        const k = (1 - pd / (power * 2)) * 14;
        const l = pd || 1;
        player.vel.x += (player.pos.x - cx) / l * k;
        player.vel.z += (player.pos.z - cz) / l * k;
        player.vel.y = Math.max(player.vel.y, k * 0.7);
      }
      hurtPlayer(Math.round((1 - pd / (power * 2)) * 18));
    }
    for (const m of mobs.list) {
      if (m.dying) continue;
      const md = Math.hypot(m.pos.x - cx, m.pos.y - cy, m.pos.z - cz);
      if (md < power * 2) {
        const l = md || 1;
        if (mobs.hit(m, Math.round((1 - md / (power * 2)) * 16), (m.pos.x - cx) / l, (m.pos.z - cz) / l)) {
          spawnParticles(m.pos.x - 0.5, m.pos.y, m.pos.z - 0.5, 'mob-' + m.type, new THREE.Color(m.mats[0].userData.base), 12);
        }
      }
    }
  }
  let metroSpawned = false;
  let engine = null;
  function enterCar(v) {
    riding = v;
    lastCarYaw = v.yaw;
    updateHand();
    player.vel.set(0, 0, 0);
    player.flying = false;
    parachute = false;
    if (v.kind === 'train' && v.cart) {
      toast('Вагонетка! W — толкать вперёд, S — тормоз и назад, Shift — вылезти');
    } else if (v.kind === 'train') {
      toast('Поезд едет сам! W — вести самому, S — тормоз, Shift — выйти на станции');
    } else if (v.kind === 'plane') {
      player.yaw = v.yaw - Math.PI;
      player.pitch = 0;
      toast('W — газ, S — тормоз, мышь — куда лететь. Разгонись, чтобы взлететь! Shift — выйти');
    } else if (v.real && v.spec.boat) toast(`${v.spec.name}: W — вперёд, S — назад, A/D — руль. Плавает только по воде. Shift — выйти`);
    else if (v.real) toast(`${v.spec.name}: W — газ, S — тормоз и задний ход, A/D — руль${v.spec.bus ? '. На остановке двери откроются сами' : ''}. Shift — выйти`);
    else toast('W/S — газ и тормоз, A/D — руль, Shift — выйти');
    if (v.kind === 'plane' && v.t.real) toast('W — прибавить газ, S — убавить (на земле — тормоз), мышь — куда лететь. Набери скорость для взлёта! Shift — выйти');
    const a = audio();
    if (a && !engine) {
      const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = 50;
      f.type = 'lowpass'; f.frequency.value = 400;
      g.gain.value = 0.035;
      o.connect(f); f.connect(g); g.connect(a.destination);
      o.start();
      engine = { o, g };
    }
  }
  function leaveCar() {
    if (engine) { engine.o.stop(); engine = null; }
    if (!riding) return;
    const c = riding;
    riding = null;
    updateHand();
    if (c.kind === 'train') {
      const spot = trains.exitSpot(world, c);
      if (spot) player.pos.copy(spot);
      player.vel.set(0, 0, 0);
      return;
    }
    const isPlane = c.kind === 'plane';
    // выходим слева
    const side = isPlane ? c.t.hw + 1.8 : c.real ? c.t.hw + 1.2 : 1.4;
    $('speedo').classList.add('hidden');
    const sx = c.pos.x + Math.cos(c.yaw) * side, sz = c.pos.z - Math.sin(c.yaw) * side;
    player.pos.set(sx, c.pos.y + 0.2, sz);
    if (boxCollides(world, player.pos, PW, PH)) player.pos.set(c.pos.x, c.pos.y + (isPlane || c.real ? c.t.h : CAR_H) + 0.1, c.pos.z);
    player.vel.set(0, 0, 0);
    // из летящего самолёта прыгаем с парашютом
    if (isPlane && !c.onGround) {
      parachute = true;
      toast('Парашют раскрылся!');
      noiseBurst(0.4, 500, 0.3);
    }
  }
  function hitCar(h) {
    attackCd = 0.4;
    swingT = 1;
    const v = h.car;
    v.hp--;
    v.shake = 1;
    noiseBurst(0.1, 2500, 0.25);
    if (v.hp > 0) return;
    if (v.kind === 'train') {
      const p = trains.point(v, v.s, 1);
      spawnParticles(p.x - 0.5, p.y, p.z - 0.5, 'train', new THREE.Color(v.cart ? 0x9a9ca2 : v.color), v.cart ? 12 : 30);
      trains.remove(v);
      if (!isCreative()) give(v.cart ? ITEM.MINECART : ITEM.METRO_TRAIN, 1);
      return;
    }
    const color = v.kind === 'plane' ? v.colors[0] : v.color;
    spawnParticles(v.pos.x - 0.5, v.pos.y, v.pos.z - 0.5, 'veh' + color, new THREE.Color(color), 24);
    const item = Object.values(ITEMS).find(it => (v.kind === 'plane'
      ? it.plane && it.plane[0] === color && (it.planeType || 'small') === v.type : it.car === color && (it.carStyle || undefined) === (v.real ? v.style : undefined)));
    managerOf(v).remove(v);
    if (!isCreative() && item) give(item.id, 1);
  }

  function updateInteraction(dt) {
    attackCd -= dt;
    const looking = freeMouse && dragDist > 6;
    if (riding) { mining = null; return; }
    if (holdingWand()) {                                           // палочка World changing: ЛКМ — точка 1
      mining = null;
      if (mouseLeft && !weTried) { weTried = true; weWandLeft(); }
      return;
    }
    if (ITEMS[currentId()] && ITEMS[currentId()].physgun) {          // физган: ЛКМ — схватить, отпустить — бросить
      mining = null;
      if (mouseLeft && !physHeld && !physTried) { physTried = true; physGrab(); }
      return;
    }
    if (mouseLeft && !looking) {
      const ch = carTarget();
      const mh = ch ? null : mobTarget();
      if (ch) {
        mining = null;
        if (attackCd <= 0) hitCar(ch);
      } else if (mh) {
        mining = null;
        if (attackCd <= 0) attack(mh);
      } else if (isCreative()) {
        if (!freeMouse || TOUCH) {                                   // на телефоне держишь палец — ломаешь
          breakRepeat += dt;
          if (breakRepeat > 0.25) { breakRepeat = 0; creativeBreak(); }
        }
      } else updateMining(dt);
    } else mining = null;
    if (mouseRight) {
      placeRepeat += dt;
      if (placeRepeat > 0.22) { placeRepeat = 0; usePlace(); }
    }
  }

  // ---------- Здоровье ----------
  function hurtPlayer(dmg, sx, sz) {
    if (isCreative() || state === 'dead' || invuln > 0 || dmg <= 0) return;
    health = Math.max(0, health - dmg);
    invuln = 0.6;
    hurtFlash = 1;
    regenTimer = 0;
    tone(260, 0.2, 0.25, 'sawtooth', 120);
    if (sx !== undefined) {
      const dx = player.pos.x - sx, dz = player.pos.z - sz, l = Math.hypot(dx, dz) || 1;
      player.vel.x += dx / l * 7;
      player.vel.z += dz / l * 7;
      player.vel.y = Math.max(player.vel.y, 5);
    }
    renderBars();
    if (health <= 0) die();
  }
  function die() {
    const d = difficulty();
    let text = 'Не грусти, попробуй ещё раз!';
    if (d.loseItems) { inv = new Inventory(); text = 'На сложном уровне вещи пропадают. Придётся собирать заново!'; }
    $('death-text').textContent = text;
    setState('dead');
    if (document.pointerLockElement) document.exitPointerLock();
    renderHotbar();
  }
  function respawn() {
    health = MAX_HP; air = MAX_AIR; fallStartY = null; invuln = 1;
    player.vel.set(0, 0, 0);
    player.pos.set(spawnPoint.x, CH, spawnPoint.z);
    playerPlaced = false;
    worldReady = false;
    renderBars();
    setState('loading');
  }
  function updateHealth(dt) {
    invuln -= dt;
    if (isCreative()) return;
    // лава обжигает
    if (player.inLava) {
      lavaTimer -= dt;
      if (lavaTimer <= 0) { lavaTimer = 0.5; hurtPlayer(3); toast('🔥 Горячо! Скорее из лавы!'); }
    } else lavaTimer = 0;
    // утонуть
    if (player.headInWater && !morphSwims()) {                       // утопленнику и черепахе воздух не нужен
      air = Math.max(0, air - dt);
      if (air <= 0) {
        drownTimer += dt;
        if (drownTimer > 1) { drownTimer = 0; hurtPlayer(2); }
      }
    } else air = Math.min(MAX_AIR, air + dt * 4);
    // восстановление
    if (health < MAX_HP) {
      regenTimer += dt;
      if (regenTimer > difficulty().regen) { regenTimer = 0; health++; }
    }
    renderBars();
  }

  // ---------- Физика игрока ----------
  let stepDist = 0, wasInWater = false;
  // в машине: игрок сидит на водительском месте, камера поворачивает вместе с машиной
  let lastCarYaw = 0;
  function carInput() {
    if (state !== 'playing' || !riding || riding.kind !== 'car') return null;
    return {
      fwd: (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0),
      turn: (keys.KeyA || (!freeMouse && keys.ArrowLeft) ? 1 : 0) - (keys.KeyD || (!freeMouse && keys.ArrowRight) ? 1 : 0),
    };
  }
  function planeInput() {
    if (state !== 'playing' || !riding || riding.kind !== 'plane') return null;
    return {
      throttle: (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0),
      yaw: player.yaw + Math.PI, pitch: player.pitch,
    };
  }
  function trainInput() {
    if (state !== 'playing' || !riding || riding.kind !== 'train') return null;
    return { throttle: (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) };
  }
  function followCar(dt) {
    const c = riding;
    if (!managerOf(c).list.includes(c)) { riding = null; return; }
    if (c.kind === 'train') {
      player.pos.copy(trains.seat(c));
      if (freeMouse) player.yaw -= ((keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0)) * 1.6 * dt;
    } else if (c.kind === 'plane') {
      // пилот сидит в кабине и сам выбирает, куда смотреть
      if (freeMouse) player.yaw -= ((keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0)) * 1.6 * dt;
      else player.yaw -= ((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0)) * 1.6 * dt;
      const cp = Math.cos(c.pitch), [, sy, sz] = c.t.seat;
      player.pos.set(c.pos.x + Math.sin(c.yaw) * cp * sz, c.pos.y + sy + Math.sin(c.pitch) * sz, c.pos.z + Math.cos(c.yaw) * cp * sz);
    } else if (c.real) {
      // место водителя (капитана): слева в машине, в рубке у корабля
      let dy = c.yaw - lastCarYaw;
      if (Math.abs(dy) < 1) player.yaw += dy;
      const [sx, sy, sz] = c.spec.seat, cy = Math.cos(c.yaw), syw = Math.sin(c.yaw);
      player.pos.set(c.pos.x + cy * sx + syw * sz, c.pos.y + sy - EYE, c.pos.z - syw * sx + cy * sz);
    } else {
      let dy = c.yaw - lastCarYaw;
      if (Math.abs(dy) < 1) player.yaw += dy;
      player.pos.set(c.pos.x - Math.sin(c.yaw) * 0.15, c.pos.y - 0.25, c.pos.z - Math.cos(c.yaw) * 0.15);
    }
    // спидометр
    const sp = $('speedo');
    if (c.real || (c.kind === 'plane' && c.t.real)) {
      sp.classList.remove('hidden');
      const kmh = Math.round(Math.abs(c.speed) * 3.6);
      if (c.kind === 'plane') {
        const alt = Math.max(0, Math.round(c.pos.y - world.topSolid(Math.floor(c.pos.x), Math.floor(c.pos.z)) - 1));
        sp.innerHTML = `<b>${kmh}</b> км/ч\nвысота ${alt} м\nгаз ${Math.round(c.throttle * 100)}%` + (!c.onGround && c.speed < c.t.lift ? '\n⚠ мало скорости!' : '');
      } else sp.innerHTML = `<b>${kmh}</b> км/ч` + (c.spec.gears ? `\n${c.speed < -0.1 ? 'задний ход' : c.gear + '-я передача'}` : c.speed < -0.1 ? '\nназад' : '');
    } else sp.classList.add('hidden');
    lastCarYaw = c.yaw;
    player.vel.set(0, 0, 0);
    player.onGround = true; player.inWater = false; player.headInWater = false;
    player.moving = false; player.sprinting = false;
    fallStartY = null;
    if (freeMouse) {
      player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch + ((keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0)) * 1.8 * dt));
    }
    if (engine) engine.o.frequency.value = c.kind === 'train' ? 40 + c.v * 7
      : c.real ? (c.spec.boat ? 32 + c.rpm * 60 : 38 + c.rpm * 120 + c.gear * 6)
      : c.kind === 'plane' && c.t.real ? 60 + c.throttle * 110 + c.speed
      : (c.kind === 'plane' ? 70 : 45) + Math.abs(c.speed) * (c.kind === 'plane' ? 6 : 9);
  }

  function updatePlayer(dt) {
    const p = player.pos, v = player.vel;
    // пока чанк под ногами не готов — стоим на месте
    const chunk = world.getChunk(Math.floor(p.x / CS), Math.floor(p.z / CS));
    if (!chunk || !chunk.meshed) return;
    if (liftRide) return;                 // в едущем лифте стоим
    if (riding) { followCar(dt); return; }

    let fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    let str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const ax = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    const ay = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
    if (freeMouse) {
      // стрелки поворачивают камеру
      player.yaw -= ax * 2.4 * dt;
      player.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, player.pitch + ay * 1.8 * dt));
    } else {
      fwd = fwd || ay;
      str = str || ax;
    }
    const shift = keys.ShiftLeft || keys.ShiftRight;
    const jump = keys.Space;
    const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
    let mx = -sin * fwd + cos * str, mz = -cos * fwd - sin * str;
    const len = Math.hypot(mx, mz);
    if (len > 0) { mx /= len; mz /= len; }

    const bx = Math.floor(p.x), bz = Math.floor(p.z);
    const feetB = world.getBlock(bx, Math.floor(p.y + 0.3 * pScale), bz), bodyB = world.getBlock(bx, Math.floor(p.y + pScale), bz);
    player.inLava = isLavaB(feetB) || isLavaB(bodyB);
    player.inWater = isWaterB(feetB) || isWaterB(bodyB) || player.inLava;
    player.headInWater = isWaterB(world.getBlock(bx, Math.floor(p.y + EYE), bz));
    if (player.inWater && !wasInWater && v.y < -4) noiseBurst(0.35, 900, 0.3);
    wasInWater = player.inWater;

    const sprinting = shift && fwd > 0 && !player.flying;
    if (player.flying) {
      const k = Math.min(1, dt * 10), sp = pScale < 1 ? 4 : 11;
      v.x += (mx * sp - v.x) * k;
      v.z += (mz * sp - v.z) * k;
      v.y += (((jump ? 1 : 0) - (shift ? 1 : 0)) * 9 - v.y) * k;
    } else if (player.inWater) {
      const k = Math.min(1, dt * 8), sp = (sprinting ? 4.2 : 3) * (morphSwims() ? 1.9 : 1) * (player.inLava ? 0.45 : 1);
      v.x += (mx * sp - v.x) * k;
      v.z += (mz * sp - v.z) * k;
      v.y -= 10 * dt;
      if (jump) v.y = Math.min(v.y + 32 * dt, 3.4);
      v.y = Math.max(v.y, -3.5);
    } else {
      const k = Math.min(1, dt * (player.onGround ? 14 : 3.5));
      const sp = (sprinting ? 6.3 : 4.4) * (pScale < 1 ? 0.45 : 1) * ((morphType && MORPH_SPEED[morphType]) || 1);
      v.x += (mx * sp - v.x) * k;
      v.z += (mz * sp - v.z) * k;
      v.y = Math.max(v.y - 28 * dt, parachute || morphGlides() ? -3 : -50);   // курочка и жук плавно планируют
      if (jump && player.onGround) v.y = pScale < 1 ? 4.6 : 8.6;
      else if (jump && morphType === 'beetle') v.y = Math.max(v.y, 3.2);       // жук летает, пока держишь прыжок
    }

    const ox = p.x, oy = p.y, oz = p.z, vx0 = v.x, vz0 = v.z, wasGround = player.onGround;
    const r = moveBox(world, p, v, PW, PH, dt);
    player.onGround = r.onGround;
    // невысокие ступеньки из мини-блоков (до половины блока) перешагиваем сами
    if (r.hitWall && wasGround && !player.flying && !player.inWater) {
      const up = new THREE.Vector3(ox, oy + 0.55 * pScale, oz);
      if (!boxCollides(world, up, PW, PH)) {
        const v2 = new THREE.Vector3(vx0, 0, vz0);
        moveBox(world, up, v2, PW, PH, dt);
        if (Math.hypot(up.x - ox, up.z - oz) > Math.hypot(p.x - ox, p.z - oz) + 1e-3) {
          moveBox(world, up, new THREE.Vector3(0, -0.55 * pScale, 0), PW, PH, 1);
          p.copy(up);
          v.x = v2.x; v.z = v2.z;
          player.onGround = true;
        }
      }
    }
    // выбраться из воды на берег
    if (player.inWater && r.hitWall && jump) v.y = 6.5;
    if (morphClimbs() && r.hitWall && len > 0 && !player.flying) { v.y = 2.6; player.onGround = false; }   // улитка и ящерица ползут вверх по стене
    if (player.flying && player.onGround && shift) player.flying = false;

    // урон от падения
    if (parachute && (player.onGround || player.inWater)) parachute = false;
    if (!player.onGround && !player.inWater && !player.flying && !parachute && !morphGlides()) {
      if (fallStartY === null || p.y > fallStartY) fallStartY = p.y;
    } else {
      if (fallStartY !== null && player.onGround && !player.inWater) {
        const h = fallStartY - p.y;
        if (h > 3.5) hurtPlayer(Math.floor(h - 3));
      }
      fallStartY = null;
    }

    if (player.onGround && !player.inWater) {
      stepDist += Math.hypot(p.x - ox, p.z - oz);
      if (stepDist > 1.9) {
        stepDist = 0;
        const below = world.getBlock(Math.floor(p.x), Math.floor(p.y - 0.5), Math.floor(p.z));
        if (below) blockSound(below, 'step');
      }
    }
    if (p.y < -30) {
      if (isCreative()) { p.y = world.topSolid(Math.floor(p.x), Math.floor(p.z)) + 2; v.set(0, 0, 0); }
      else { health = 0; renderBars(); die(); }
    }

    const hs = Math.hypot(v.x, v.z);
    if (player.onGround && hs > 0.5) bobPhase += hs * dt * 1.6;
    player.moving = hs > 0.5;
    player.sprinting = sprinting && hs > 0.5;
  }

  // ---------- Камера ----------
  function updateCamera(dt) {
    const p = player.pos;
    if (state === 'menu' || state === 'profile' || state === 'create' || state === 'loading') {
      // камера чуть снизу смотрит поверх героя — он стоит в нижней части экрана, под меню
      menuAngle += dt * 0.06;
      const cx = p.x + Math.cos(menuAngle) * 6, cz = p.z + Math.sin(menuAngle) * 6;
      const cy = Math.max(p.y + 1.6, world.topSolid(Math.floor(cx), Math.floor(cz)) + 1.6);
      camera.position.set(cx, cy, cz);
      camera.lookAt(p.x, cy + 1.4, p.z);
      if (camera.fov !== 75) { camera.fov = 75; camera.updateProjectionMatrix(); }
      if (playerModel) {
        playerModel.root.position.copy(p);
        playerModel.root.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
        playerModel.head.rotation.x = -0.15;
        const sw = Math.sin(performance.now() / 600) * 0.08;
        playerModel.armL.rotation.x = sw; playerModel.armR.rotation.x = -sw;
        playerModel.legL.rotation.x = 0; playerModel.legR.rotation.x = 0;
      }
      return;
    }
    updateLook();
    if (camMode > 0) {
      // камера отъезжает назад (или вперёд, чтобы видеть героя в лицо), но не проходит сквозь стены
      const maxD = riding && riding.t ? riding.t.cam : riding ? 6 : 4 * pScale;
      const sgn = camMode === 1 ? -1 : 1;
      let d = maxD;
      for (let t = 0.3; t <= maxD; t += 0.1) {
        if (IS_SOLID[world.getBlock(Math.floor(eye.x + sgn * lookDir.x * t), Math.floor(eye.y + sgn * lookDir.y * t), Math.floor(eye.z + sgn * lookDir.z * t))]) { d = Math.max(0.2, t - 0.3); break; }
      }
      camera.position.set(eye.x + sgn * lookDir.x * d, eye.y + sgn * lookDir.y * d, eye.z + sgn * lookDir.z * d);
    } else camera.position.copy(eye);
    if (camMode === 2) camera.rotation.set(-player.pitch, player.yaw + Math.PI, 0);
    else camera.rotation.set(player.pitch, player.yaw, hurtFlash > 0.5 ? (hurtFlash - 0.5) * 0.12 : 0);
    if (shake > 0) {      // тряска от взрыва
      camera.position.x += (Math.random() - 0.5) * shake * 0.5;
      camera.position.y += (Math.random() - 0.5) * shake * 0.5;
      shake = Math.max(0, shake - dt * 1.5);
    }

    const targetFov = 75 + (player.sprinting ? 8 : 0) + (player.flying && player.moving ? 5 : 0);
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 8);
      camera.updateProjectionMatrix();
    }

    // рука
    swingT = Math.max(0, swingT - dt * 5);
    const sw = Math.sin(swingT * Math.PI);
    hand.position.set(0.62 + Math.cos(bobPhase) * 0.025, -0.55 - sw * 0.12 + Math.abs(Math.sin(bobPhase)) * 0.025, -1.0 - sw * 0.1);
    hand.rotation.set(-sw * 0.7, 0, 0);

    // модель игрока при виде со стороны
    if (playerModel) playerModel.root.scale.setScalar(riding ? 1 : pScale);
    updateMorph(dt);
    if (playerModel && camMode > 0) {
      const m = playerModel;
      m.root.position.copy(p);
      m.root.rotation.y = player.yaw + Math.PI;
      m.head.rotation.x = -player.pitch;
      const walk = player.moving && player.onGround ? Math.sin(bobPhase * 2) * 0.7 : 0;
      m.legL.rotation.x = walk; m.legR.rotation.x = -walk;
      m.armL.rotation.x = -walk; m.armR.rotation.x = walk - sw * 1.2;
    }
  }

  // ---------- Небо и время суток ----------
  const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let cloudWind = 0;
  function updateSky(dt) {
    if (state !== 'paused' && state !== 'dead' && state !== 'profile') timeOfDay = (timeOfDay + dt / DAY_LENGTH) % 1;
    const ang = timeOfDay * Math.PI * 2, sh = Math.sin(ang);
    dayFactor = smoothstep(-0.15, 0.2, sh);
    const sunset = Math.max(0, 1 - Math.abs(sh) / 0.3) * 0.5;
    skyColor.copy(SKY_NIGHT).lerp(SKY_DAY, dayFactor).lerp(SKY_SUNSET, sunset * Math.max(dayFactor, 0.3));
    lightLevel = 0.2 + 0.8 * dayFactor;
    if (flashlightOn && worldMeta) lightLevel = Math.max(lightLevel, 0.75);   // фонарик телефона
    for (const k in materials) {
      materials[k].color.setScalar(lightLevel);
      shaderFx.materials[k].color.setScalar(lightLevel);
    }
    for (const m of litMaterials) m.color.setScalar(Math.max(lightLevel, 0.45));
    for (const k in particleMats) particleMats[k].color.copy(particleMats[k].userData.base).multiplyScalar(lightLevel);

    const underwater = player.headInWater && !!worldMeta && state !== 'loading';
    if (underwater) {
      scene.fog.color.copy(WATER_FOG).multiplyScalar(0.4 + lightLevel * 0.6);
      scene.fog.near = 0.5; scene.fog.far = 16;
      scene.background = scene.fog.color;
    } else {
      scene.background = skyColor;
      scene.fog.color.copy(skyColor);
      scene.fog.near = FOG_NEAR; scene.fog.far = FOG_FAR;
    }
    const shadersOn = modOn('shaders');
    shaderFx.sky.visible = shadersOn && !underwater;
    if (shadersOn) {
      const sunDir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0.15).normalize();
      const horizon = shaderFx.update(performance.now() / 1000, sunDir, dayFactor, sunset * 2, skyColor, camera);
      if (!underwater) scene.fog.color.copy(horizon);
    }

    stars.visible = !underwater;
    sun.visible = moon.visible = !underwater && !shadersOn;   // с шейдерами солнце и луна рисуются на небе по-настоящему
    clouds.visible = !underwater && !shadersOn;               // кубические облака — без шейдеров
    shaderFx.clouds.visible = !underwater && shadersOn;       // настоящие — с шейдерами
    const cp = camera.position;
    sun.position.set(cp.x + Math.cos(ang) * 400, cp.y + Math.sin(ang) * 400, cp.z + 60);
    sun.lookAt(cp);
    moon.position.set(cp.x - Math.cos(ang) * 400, cp.y - Math.sin(ang) * 400, cp.z - 60);
    moon.lookAt(cp);
    stars.position.copy(cp);
    stars.rotation.z = ang;
    stars.material.opacity = 1 - dayFactor;
    updateSnow(dt);

    cloudWind += dt * 1.5;
    clouds.position.set(cp.x, 126, cp.z);
    cloudMat.uniforms.uCam.value.set(cp.x, cp.z);
    cloudMat.uniforms.uWind.value = cloudWind;
    cloudMat.uniforms.uColor.value.setScalar(0.25 + 0.75 * dayFactor);
  }

  // ---------- Интерфейс ----------
  let fpsFrames = 0, fpsTime = 0, fps = 0;
  function updateHUD(dt) {
    fpsFrames++; fpsTime += dt;
    if (fpsTime >= 0.5) {
      fps = Math.round(fpsFrames / fpsTime); fpsFrames = 0; fpsTime = 0;
      if (showInfo && worldMeta) {
        const p = player.pos;
        const hours = Math.floor(((timeOfDay * 24) + 6) % 24), mins = Math.floor((timeOfDay * 24 * 60) % 60);
        $('info').innerHTML = `X ${p.x.toFixed(1)}  Y ${p.y.toFixed(1)}  Z ${p.z.toFixed(1)}<br>` +
          `FPS ${fps} · ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}` +
          `<br>${MODES[worldMeta.mode]} · ${difficulty().name}` + (player.flying ? ' · полёт' : '');
      }
    }
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) $('blockname').classList.remove('show');
    }
    hurtFlash = Math.max(0, hurtFlash - dt * 2.5);
    $('hurt-overlay').style.opacity = hurtFlash * 0.6;
    $('water-overlay').classList.toggle('show', player.headInWater && !!worldMeta);
  }

  function updateLoading() {
    if (!world) return;
    if (!worldReady) {
      const r = world.readiness(player.pos.x, player.pos.z, 2);
      if (r >= 1) {
        if (!playerPlaced) {
          player.pos.y = world.topSolid(Math.floor(player.pos.x), Math.floor(player.pos.z)) + 1;
          playerPlaced = true;
        }
        worldReady = true;
      }
      if (state === 'loading') $('loading-status').textContent = worldReady ? 'Мир готов!' : `Строим мир… ${Math.round(r * 100)}%`;
    } else if (state === 'loading') $('loading-status').textContent = 'Мир готов!';
    if (state === 'loading') $('btn-start').disabled = !worldReady;
  }

  // ---------- Главный цикл ----------
  let last = performance.now(), saveTimer = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    step(dt);
    draw();
  }
  function draw() {
    if (modOn('shaders')) shaderFx.render(scene, camera);
    else renderer.render(scene, camera);
  }

  function step(dt) {
    const active = state === 'playing' || state === 'inventory';
    chute.visible = parachute && !!worldMeta;
    updateLift(dt);
    updatePhone(dt);
    updatePlace(dt);
    if (worldMeta && world) updateFurnaces(dt);
    if (worldMeta && world) updateCams(dt);
    if (worldMeta && world && state !== 'paused') world.tickFluids(dt);
    if (worldMeta && active) updatePrimed(dt);
    if (chute.visible) { chute.position.copy(player.pos); chute.rotation.y = player.yaw; }
    if (worldMeta && active) {
      cars.update(dt, world, riding, carInput(), lightLevel);
      planes.update(dt, world, riding, planeInput(), lightLevel);
      trains.update(dt, world, riding, trainInput(), lightLevel, t => {
        const name = world.stationName(t);
        if (riding === t) toast(name ? `Станция «${name}»` : 'Остановка');
        tone(660, 0.15, 0.1, 'sine', 520);
      });
    }
    if (state === 'playing') updatePlayer(dt);
    updateCamera(dt);
    world.update(camera.position.x, camera.position.z, worldReady && worldMeta ? 5 : 14);
    updateLoading();

    if (worldMeta && (active || state === 'paused')) {
      target = raycast();
      if (target) {
        const m = target.mini;
        if (m) highlight.position.set(target.x + (m.sx + 0.5) / 4, target.y + (m.sy + 0.5) / 4, target.z + (m.sz + 0.5) / 4);
        else highlight.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
        highlight.scale.setScalar(m ? 0.25 : 1);
        highlight.visible = state === 'playing';
      } else highlight.visible = false;
    } else { target = null; highlight.visible = false; }

    if (state === 'playing') updateInteraction(dt);
    updateTouchUI();
    crack.visible = !!mining && mining.progress > 0;
    if (crack.visible) {
      const m = mining.mini;
      if (m) crack.position.set(mining.x + (m.sx + 0.5) / 4, mining.y + (m.sy + 0.5) / 4, mining.z + (m.sz + 0.5) / 4);
      else crack.position.set(mining.x + 0.5, mining.y + 0.5, mining.z + 0.5);
      crack.scale.setScalar(m ? 0.25 : 1);
      crackMat.map = crackTextures[Math.min(5, Math.floor(mining.progress * 6))];
    }

    if (worldMeta && active) {
      updateHealth(dt);
      updatePhysgun(dt);
      updateSnowballs(dt);
      mobs.update(dt, world, player, {
        diff: difficulty(), day: dayFactor, light: lightLevel,
        canAttack: !isCreative() && !morphFriend(),
        hurt: hurtPlayer,
        onPoof: m => spawnParticles(m.pos.x - 0.5, m.pos.y, m.pos.z - 0.5, 'mob', MOB_COLOR, 10),
      });
    } else if (!worldMeta && worldReady && state !== 'loading') {
      // в меню вокруг героя гуляют животные и жители
      mobs.update(dt, world, player, { diff: DIFFICULTY.peaceful, day: dayFactor, light: lightLevel, canAttack: false, hurt() {}, onPoof() {} });
    }

    updateSky(dt);
    updateParticles(dt);
    updateHUD(dt);

    if (state === 'playing') {
      saveTimer += dt;
      if (saveTimer > 15) { saveTimer = 0; saveCurrent(); }
    }
  }

  window.addEventListener('beforeunload', saveCurrent);

  // Для отладки из консоли браузера
  window.bronicraft = {
    player, mobs, clouds, cars, planes, trains, shaderFx,
    get riding() { return riding; },
    use() { useItem(); },
    play() { if (worldReady) setState('playing'); },
    get world() { return world; }, get state() { return state; }, get inv() { return inv; },
    get time() { return timeOfDay; }, set time(t) { timeOfDay = t; },
    get health() { return health; },
    simulate(seconds) { for (let t = 0; t < seconds; t += 1 / 60) step(1 / 60); draw(); },
  };

  // ---------- Запуск ----------
  Store.migrate();
  profile = Store.getProfile();
  if (profile && !Skin.isValid(profile.skin)) profile.skin = Skin.defaultSkin();
  startMenuWorld();
  rebuildPlayer();
  renderHotbar();
  renderBars();
  if (profile) setState('menu');
  else openProfile();
  requestAnimationFrame(frame);
})();
