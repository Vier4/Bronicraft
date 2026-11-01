'use strict';

// Существа мира: ночные Буки, домашние животные и жители деревень.
// Модель каждого собирается из цветных коробочек: [ширина, высота, глубина, x, y, z, цвет, часть]
// часть: 'body' — тело (сплющивается при прыжке у Буки), 'leg' — ноги (качаются при ходьбе), 'head'
const MOB_TYPES = {
  buka: {
    name: 'Бука', hostile: true, hp: 10, hw: 0.45, h: 1.2,
    parts: [
      [0.9, 0.85, 0.9, 0, 0.745, 0, 0x46306a, 'body'],
      [0.16, 0.2, 0.04, -0.2, 0.92, 0.452, 0xd6ff3a, 'glow'], [0.16, 0.2, 0.04, 0.2, 0.92, 0.452, 0xd6ff3a, 'glow'],
      [0.42, 0.07, 0.04, 0, 0.6, 0.452, 0x140a1f],
      [0.22, 0.32, 0.22, -0.22, 0.16, 0, 0x2c1d45, 'leg'], [0.22, 0.32, 0.22, 0.22, 0.16, 0, 0x2c1d45, 'leg'],
    ],
  },
  pig: {
    name: 'Свинка', hp: 8, hw: 0.4, h: 0.9, speed: 1.2, drops: [[ITEM.PORK, 1, 3]],
    parts: [
      [0.6, 0.55, 0.9, 0, 0.575, 0, 0xf0a0b0],
      [0.5, 0.5, 0.45, 0, 0.72, 0.6, 0xf0a0b0, 'head'],
      [0.26, 0.16, 0.06, 0, 0.64, 0.85, 0xd47a8a],
      [0.08, 0.08, 0.02, -0.13, 0.82, 0.83, 0x222222], [0.08, 0.08, 0.02, 0.13, 0.82, 0.83, 0x222222],
      [0.18, 0.3, 0.18, -0.18, 0.15, 0.28, 0xe08f9f, 'leg'], [0.18, 0.3, 0.18, 0.18, 0.15, 0.28, 0xe08f9f, 'leg'],
      [0.18, 0.3, 0.18, -0.18, 0.15, -0.28, 0xe08f9f, 'leg'], [0.18, 0.3, 0.18, 0.18, 0.15, -0.28, 0xe08f9f, 'leg'],
    ],
  },
  cow: {
    name: 'Корова', hp: 10, hw: 0.45, h: 1.3, speed: 1.0, drops: [[ITEM.MEAT, 1, 3]],
    parts: [
      [0.7, 0.65, 1.1, 0, 0.85, 0, 0xf2f2f2],
      [0.72, 0.3, 0.4, 0, 0.95, 0.15, 0x2a2a2a], [0.72, 0.25, 0.3, 0, 0.8, -0.3, 0x2a2a2a],
      [0.5, 0.5, 0.4, 0, 1.05, 0.72, 0xf2f2f2, 'head'],
      [0.3, 0.18, 0.06, 0, 0.92, 0.94, 0xf2b8b8],
      [0.08, 0.08, 0.02, -0.14, 1.15, 0.93, 0x222222], [0.08, 0.08, 0.02, 0.14, 1.15, 0.93, 0x222222],
      [0.06, 0.16, 0.06, -0.2, 1.36, 0.72, 0xe8e0c8], [0.06, 0.16, 0.06, 0.2, 1.36, 0.72, 0xe8e0c8],
      [0.2, 0.52, 0.2, -0.2, 0.26, 0.38, 0xf2f2f2, 'leg'], [0.2, 0.52, 0.2, 0.2, 0.26, 0.38, 0xf2f2f2, 'leg'],
      [0.2, 0.52, 0.2, -0.2, 0.26, -0.38, 0xf2f2f2, 'leg'], [0.2, 0.52, 0.2, 0.2, 0.26, -0.38, 0xf2f2f2, 'leg'],
    ],
  },
  sheep: {
    name: 'Овечка', hp: 8, hw: 0.4, h: 1.1, speed: 1.0, drops: [[B.WOOL_WHITE, 1, 2], [ITEM.MUTTON, 1, 2]],
    parts: [
      [0.75, 0.62, 1.0, 0, 0.72, 0, 0xf4f4f0],
      [0.4, 0.42, 0.4, 0, 0.92, 0.6, 0xd8c0a8, 'head'],
      [0.08, 0.08, 0.02, -0.11, 0.98, 0.81, 0x222222], [0.08, 0.08, 0.02, 0.11, 0.98, 0.81, 0x222222],
      [0.16, 0.42, 0.16, -0.2, 0.21, 0.3, 0xd8c0a8, 'leg'], [0.16, 0.42, 0.16, 0.2, 0.21, 0.3, 0xd8c0a8, 'leg'],
      [0.16, 0.42, 0.16, -0.2, 0.21, -0.3, 0xd8c0a8, 'leg'], [0.16, 0.42, 0.16, 0.2, 0.21, -0.3, 0xd8c0a8, 'leg'],
    ],
  },
  chicken: {
    name: 'Курочка', hp: 4, hw: 0.25, h: 0.75, speed: 1.1, drops: [[ITEM.CHICKEN_MEAT, 1, 1], [ITEM.EGG, 0, 2], [ITEM.FEATHER, 0, 2]],
    parts: [
      [0.36, 0.34, 0.46, 0, 0.42, 0, 0xfafafa],
      [0.24, 0.26, 0.22, 0, 0.68, 0.2, 0xfafafa, 'head'],
      [0.1, 0.07, 0.1, 0, 0.66, 0.35, 0xf0a020], [0.06, 0.1, 0.12, 0, 0.84, 0.2, 0xdd2222],
      [0.05, 0.05, 0.02, -0.08, 0.72, 0.31, 0x222222], [0.05, 0.05, 0.02, 0.08, 0.72, 0.31, 0x222222],
      [0.06, 0.25, 0.06, -0.08, 0.125, 0, 0xf0a020, 'leg'], [0.06, 0.25, 0.06, 0.08, 0.125, 0, 0xf0a020, 'leg'],
    ],
  },
  villager: {
    name: 'Житель', hp: 20, hw: 0.3, h: 1.9, speed: 0.9,
    parts: [
      [0.5, 0.75, 0.32, 0, 1.12, 0, 'robe'],
      [0.46, 0.46, 0.46, 0, 1.73, 0, 0xd9a77a, 'head'],
      [0.1, 0.2, 0.1, 0, 1.64, 0.27, 0xc48e62],
      [0.09, 0.07, 0.02, -0.11, 1.78, 0.235, 0x2a6a2a], [0.09, 0.07, 0.02, 0.11, 1.78, 0.235, 0x2a6a2a],
      [0.56, 0.18, 0.22, 0, 1.25, 0.22, 'robeDark'],
      [0.2, 0.75, 0.22, -0.12, 0.375, 0, 'robeDark', 'leg'], [0.2, 0.75, 0.22, 0.12, 0.375, 0, 'robeDark', 'leg'],
    ],
  },
};
// Мелкие существа: живут сами по себе — жуки и улитки в траве, ящерицы на песке, черепахи у воды
Object.assign(MOB_TYPES, {
  beetle: {
    name: 'Жук', hp: 2, hw: 0.2, h: 0.3, speed: 0.8, critter: true,
    parts: [
      [0.36, 0.18, 0.5, 0, 0.17, 0, 0x2a6b3a], [0.02, 0.19, 0.5, 0, 0.17, 0, 0x163a20],
      [0.2, 0.14, 0.14, 0, 0.16, 0.3, 0x1a1a1a, 'head'],
      [0.02, 0.02, 0.16, -0.06, 0.22, 0.43, 0x111111], [0.02, 0.02, 0.16, 0.06, 0.22, 0.43, 0x111111],
      [0.04, 0.1, 0.04, -0.2, 0.05, 0.15, 0x111111, 'leg'], [0.04, 0.1, 0.04, 0.2, 0.05, 0.15, 0x111111, 'leg'],
      [0.04, 0.1, 0.04, -0.2, 0.05, 0, 0x111111, 'leg'], [0.04, 0.1, 0.04, 0.2, 0.05, 0, 0x111111, 'leg'],
      [0.04, 0.1, 0.04, -0.2, 0.05, -0.15, 0x111111, 'leg'], [0.04, 0.1, 0.04, 0.2, 0.05, -0.15, 0x111111, 'leg'],
    ],
  },
  snail: {
    name: 'Улитка', hp: 3, hw: 0.2, h: 0.45, speed: 0.25, critter: true,
    parts: [
      [0.24, 0.1, 0.62, 0, 0.05, 0.05, 0xc8b090],
      [0.3, 0.34, 0.34, 0, 0.27, -0.08, 0xa0522d], [0.31, 0.06, 0.24, 0, 0.3, -0.06, 0x6e3418], [0.31, 0.2, 0.06, 0, 0.27, -0.02, 0x6e3418],
      [0.14, 0.18, 0.12, 0, 0.16, 0.3, 0xc8b090, 'head'],
      [0.03, 0.14, 0.03, -0.04, 0.31, 0.32, 0xc8b090], [0.03, 0.14, 0.03, 0.04, 0.31, 0.32, 0xc8b090],
      [0.05, 0.05, 0.05, -0.04, 0.39, 0.32, 0x111111], [0.05, 0.05, 0.05, 0.04, 0.39, 0.32, 0x111111],
    ],
  },
  turtle: {
    name: 'Черепаха', hp: 10, hw: 0.4, h: 0.45, speed: 0.5, critter: true,
    parts: [
      [0.8, 0.26, 0.9, 0, 0.3, 0, 0x3f7a3a], [0.6, 0.1, 0.7, 0, 0.47, 0, 0x5a9a50], [0.3, 0.04, 0.3, 0, 0.53, 0, 0x7ab86a],
      [0.74, 0.1, 0.84, 0, 0.13, 0, 0xd8d090],
      [0.22, 0.2, 0.26, 0, 0.3, 0.55, 0x7ab06a, 'head'],
      [0.05, 0.05, 0.02, -0.07, 0.35, 0.68, 0x111111], [0.05, 0.05, 0.02, 0.07, 0.35, 0.68, 0x111111],
      [0.18, 0.16, 0.22, -0.36, 0.08, 0.3, 0x7ab06a, 'leg'], [0.18, 0.16, 0.22, 0.36, 0.08, 0.3, 0x7ab06a, 'leg'],
      [0.18, 0.16, 0.22, -0.36, 0.08, -0.3, 0x7ab06a, 'leg'], [0.18, 0.16, 0.22, 0.36, 0.08, -0.3, 0x7ab06a, 'leg'],
      [0.08, 0.08, 0.16, 0, 0.2, -0.5, 0x7ab06a],
    ],
  },
  lizard: {
    name: 'Ящерица', hp: 3, hw: 0.2, h: 0.25, speed: 1.6, critter: true,
    parts: [
      [0.22, 0.14, 0.6, 0, 0.12, 0, 0x7aa83a], [0.08, 0.02, 0.6, 0, 0.2, 0, 0xd8c040],
      [0.1, 0.08, 0.5, 0, 0.1, -0.52, 0x6a982a], [0.05, 0.05, 0.25, 0, 0.09, -0.86, 0x6a982a],
      [0.18, 0.12, 0.24, 0, 0.14, 0.41, 0x7aa83a, 'head'],
      [0.04, 0.04, 0.02, -0.06, 0.17, 0.53, 0x111111], [0.04, 0.04, 0.02, 0.06, 0.17, 0.53, 0x111111],
      [0.06, 0.12, 0.06, -0.15, 0.06, 0.2, 0x5a8a2a, 'leg'], [0.06, 0.12, 0.06, 0.15, 0.06, 0.2, 0x5a8a2a, 'leg'],
      [0.06, 0.12, 0.06, -0.15, 0.06, -0.2, 0x5a8a2a, 'leg'], [0.06, 0.12, 0.06, 0.15, 0.06, -0.2, 0x5a8a2a, 'leg'],
    ],
  },
});
const CRITTERS = ['beetle', 'snail', 'turtle', 'lizard'];
// Зомби (мод «Превращения»): в мире сами не появляются, в них можно только превратиться.
// Руки вытянуты вперёд, как у настоящих зомби.
const zombieParts = (skin, shirt, pants, eye, robe) => [
  [0.22, 0.75, 0.22, -0.12, 0.375, 0, pants, 'leg'], [0.22, 0.75, 0.22, 0.12, 0.375, 0, pants, 'leg'],
  robe ? [0.5, 0.75, 0.32, 0, 1.12, 0, shirt] : [0.5, 0.75, 0.28, 0, 1.125, 0, shirt],
  [0.46, 0.46, 0.46, 0, 1.73, 0, skin, 'head'],
  ...(robe ? [[0.1, 0.2, 0.1, 0, 1.64, 0.27, skin]] : []),
  [0.09, 0.07, 0.02, -0.11, 1.78, 0.235, eye, eye === 0x50fff0 ? 'glow' : undefined], [0.09, 0.07, 0.02, 0.11, 1.78, 0.235, eye, eye === 0x50fff0 ? 'glow' : undefined],
  [0.2, 0.05, 0.02, 0, 1.6, 0.235, 0x1a2a18],
  [0.18, 0.18, 0.72, -0.34, 1.38, 0.3, skin], [0.18, 0.18, 0.72, 0.34, 1.38, 0.3, skin],
  [0.19, 0.19, 0.2, -0.34, 1.38, 0.0, shirt], [0.19, 0.19, 0.2, 0.34, 1.38, 0.0, shirt],
];
Object.assign(MOB_TYPES, {
  zombie: { name: 'Зомби', hostile: true, morphOnly: true, chase: 0.8, hp: 20, hw: 0.3, h: 1.9, parts: zombieParts(0x5fa35a, 0x2f9fa8, 0x3a3fa0, 0x1a1a1a) },
  zombieVillager: { name: 'Зомби-житель', hostile: true, morphOnly: true, chase: 0.8, hp: 20, hw: 0.3, h: 1.9, parts: zombieParts(0x6aa860, 0x6b4a2a, 0x4e3620, 0xd03030, true) },
  husk: { name: 'Пустынный зомби', hostile: true, morphOnly: true, chase: 0.8, hp: 20, hw: 0.3, h: 1.9, parts: zombieParts(0xc8b07a, 0x8a7350, 0x6a5a40, 0x2a2010) },
  drowned: { name: 'Утопленник', hostile: true, morphOnly: true, chase: 0.8, hp: 20, hw: 0.3, h: 1.9, parts: zombieParts(0x58a8a0, 0x2a6f7a, 0x3d5f5a, 0x50fff0) },
  babyZombie: { name: 'Малыш-зомби', hostile: true, morphOnly: true, chase: 1.45, hp: 10, hw: 0.17, h: 1.0, scale: 0.53, parts: zombieParts(0x5fa35a, 0x2f9fa8, 0x3a3fa0, 0x1a1a1a) },
});
const ROBES = [[0x7a5230, 0x5e3e22], [0x3f7d3a, 0x2f5e2b], [0xe8e8e0, 0xbdbdb0], [0x7a3f8f, 0x5c2e6c], [0x3a5f9a, 0x2a4673]];
const ANIMALS = ['pig', 'cow', 'sheep', 'chicken'];
const GREETINGS = [
  'Привет, {name}!', 'Хорошая сегодня погода!', 'Ночью тут бродят Буки, будь осторожен!',
  'В нашем колодце самая вкусная вода.', 'Хм-м-м!', 'Ты построил что-нибудь красивое?',
  'На верстаке можно сделать кирку.', 'Заходи в гости!',
];

class Mobs {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.timers = { buka: 0, animal: 0, villager: 0, critter: 0 };
    this.geoCache = {};
  }

  box(w, h, d) {
    const k = w + ',' + h + ',' + d;
    return this.geoCache[k] || (this.geoCache[k] = new THREE.BoxGeometry(w, h, d));
  }

  spawn(type, x, y, z, extra) {
    const def = MOB_TYPES[type];
    const { g, mats, legs, body } = this.buildModel(type, extra);
    g.position.set(x, y, z);
    this.scene.add(g);
    const m = Object.assign({
      type, def, pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), yaw: Math.random() * Math.PI * 2,
      hp: def.hp, attackCd: 0, hurtT: 0, hopCd: 0, wanderT: 0, wanderYaw: 0, wanderMove: false, panic: 0,
      onGround: false, dying: 0, walk: 0, group: g, body, legs, mats,
    }, extra || {});
    this.list.push(m);
    return m;
  }

  // модель существа из коробочек (ей же пользуется мод «Превращения»)
  buildModel(type, extra) {
    const def = MOB_TYPES[type];
    const g = new THREE.Group();
    const mats = [], legs = [];
    let body = null;
    const robe = extra && extra.robe ? extra.robe : ROBES[0];
    for (const p of def.parts) {
      const color = p[6] === 'robe' ? robe[0] : p[6] === 'robeDark' ? robe[1] : p[6];
      const mat = new THREE.MeshBasicMaterial({ color });
      mat.userData.base = new THREE.Color(color);
      mat.userData.glow = p[7] === 'glow';
      mats.push(mat);
      const mesh = new THREE.Mesh(this.box(p[0], p[1], p[2]), mat);
      if (p[7] === 'leg') {
        const pivot = new THREE.Group();
        pivot.position.set(p[3], p[4] + p[1] / 2, p[5]);
        mesh.position.y = -p[1] / 2;
        pivot.add(mesh);
        g.add(pivot);
        legs.push(pivot);
      } else {
        mesh.position.set(p[3], p[4], p[5]);
        g.add(mesh);
        if (p[7] === 'body' && !body) body = mesh;
      }
    }
    // глаза Буки сидят на теле, чтобы сплющиваться вместе с ним
    if (type === 'buka' && body) {
      g.children.filter(c => c !== body && c.isMesh && c.position.y > 0.5).forEach(c => {
        c.position.y -= body.position.y; c.position.z = 0.452;
        body.add(c);
      });
    }
    g.scale.setScalar(def.scale || 1);
    return { g, mats, legs, body };
  }

  count(fn) { return this.list.filter(m => !m.dying && fn(m)).length; }

  surfaceSpot(world, player, rMin, rMax, needGrass) {
    const a = Math.random() * Math.PI * 2, r = rMin + Math.random() * (rMax - rMin);
    const x = Math.floor(player.pos.x + Math.cos(a) * r), z = Math.floor(player.pos.z + Math.sin(a) * r);
    const c = world.getChunk(Math.floor(x / CS), Math.floor(z / CS));
    if (!c || !c.meshed) return null;
    const y = world.topSolid(x, z) + 1;
    if (y <= 1 || world.getBlock(x, y, z) !== B.AIR || world.getBlock(x, y + 1, z) !== B.AIR) return null;
    if (needGrass && world.getBlock(x, y - 1, z) !== B.GRASS) return null;
    return { x: x + 0.5, y, z: z + 0.5 };
  }

  spawnTick(dt, world, player, o) {
    const t = this.timers;
    t.buka -= dt; t.animal -= dt; t.villager -= dt; t.critter -= dt;
    // мелкие существа: на траве — жуки и улитки, на песке — ящерицы, а у воды — черепахи
    if (t.critter <= 0) {
      t.critter = 4;
      if (this.count(m => CRITTERS.includes(m.type)) < 8) {
        const s = this.surfaceSpot(world, player, 12, 34, false);
        if (s) {
          const under = world.getBlock(Math.floor(s.x), s.y - 1, Math.floor(s.z));
          let type = null;
          if (under === B.GRASS) type = Math.random() < 0.55 ? 'beetle' : 'snail';
          else if (under === B.SAND || under === B.SANDSTONE) {
            let water = false;
            for (let dz = -4; dz <= 4 && !water; dz++) for (let dx = -4; dx <= 4; dx++) if (world.getBlock(Math.floor(s.x) + dx, s.y - 1, Math.floor(s.z) + dz) === B.WATER) { water = true; break; }
            type = water ? 'turtle' : 'lizard';
          }
          if (type) this.spawn(type, s.x, s.y + 0.05, s.z);
        }
      }
    }
    // Буки — только ночью и не на «Мирном»
    if (t.buka <= 0) {
      t.buka = 2;
      if (o.diff.mobs > 0 && o.day < 0.3 && this.count(m => m.type === 'buka') < o.diff.mobs) {
        const s = this.surfaceSpot(world, player, 16, 34, false);
        if (s && !world.inVillage(s.x, s.z)) this.spawn('buka', s.x, s.y, s.z);
      }
    }
    // животные пасутся на траве небольшими стайками
    if (t.animal <= 0) {
      t.animal = 3;
      if (this.count(m => ANIMALS.includes(m.type)) < 12) {
        const s = this.surfaceSpot(world, player, 20, 42, true);
        if (s) {
          const type = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
          const n = 2 + Math.floor(Math.random() * 2);
          for (let i = 0; i < n; i++) this.spawn(type, s.x + Math.random() * 2 - 1, s.y + 0.1, s.z + Math.random() * 2 - 1);
        }
      }
    }
    // жители живут возле своего колодца
    if (t.villager <= 0) {
      t.villager = 1;
      for (const v of world.villagesNear(player.pos.x, player.pos.z, 90)) {
        const want = Math.min(6, v.houses + 1);
        if (this.count(m => m.home === v.id) >= want) continue;
        const a = Math.random() * Math.PI * 2;
        const x = Math.floor(v.x + Math.cos(a) * 6), z = Math.floor(v.z + Math.sin(a) * 6);
        const c = world.getChunk(Math.floor(x / CS), Math.floor(z / CS));
        if (!c || !c.meshed) continue;
        const y = world.topSolid(x, z) + 1;
        this.spawn('villager', x + 0.5, y, z + 0.5, { home: v.id, homeX: v.x, homeZ: v.z, robe: ROBES[Math.floor(Math.random() * ROBES.length)] });
      }
    }
  }

  // o: { diff, day, light, canAttack, hurt(dmg, x, z), onPoof(mob) }
  update(dt, world, player, o) {
    this.spawnTick(dt, world, player, o);

    for (let i = this.list.length - 1; i >= 0; i--) {
      const m = this.list[i], def = m.def;
      if (m.dying > 0) {
        m.dying -= dt;
        m.group.scale.setScalar(Math.max(0.01, m.dying / 0.4) * (m.size || 1) * (def.scale || 1));
        if (m.dying <= 0) this.remove(i);
        continue;
      }
      const dx = player.pos.x - m.pos.x, dz = player.pos.z - m.pos.z;
      const dist = Math.hypot(dx, dz);
      const far = m.home ? 120 : 90;
      if (dist > far || m.pos.y < -20 || (def.hostile && o.diff.mobs === 0)) { this.remove(i); continue; }
      // утром Буки исчезают
      if (m.type === 'buka' && o.day > 0.6 && Math.random() < dt * 0.3) { o.onPoof(m); this.remove(i); continue; }
      const c = world.getChunk(Math.floor(m.pos.x / CS), Math.floor(m.pos.z / CS));
      if (!c || !c.meshed) continue;
      if (m.held || m.frozen) { m.group.position.copy(m.pos); m.vel.set(0, 0, 0); continue; }     // в луче физгана

      m.attackCd -= dt; m.hopCd -= dt; m.hurtT -= dt; m.panic -= dt;
      let speed = 0;
      if (def.hostile && o.canAttack && dist < 24) {
        m.yaw = Math.atan2(dx, dz);
        speed = dist > 0.9 ? o.diff.speed * (def.chase || 1) : 0;   // не залезаем в игрока
      } else if (m.panic > 0) {
        m.yaw = Math.atan2(-dx, -dz) + Math.sin(m.panic * 3) * 0.6;   // убегаем от игрока
        speed = 3.2;
      } else {
        m.wanderT -= dt;
        if (m.home && Math.hypot(m.pos.x - m.homeX, m.pos.z - m.homeZ) > 18) {
          m.wanderYaw = Math.atan2(m.homeX - m.pos.x, m.homeZ - m.pos.z);
          m.wanderMove = true;
          m.wanderT = 1;
        } else if (m.wanderT <= 0) {
          m.wanderT = 2 + Math.random() * 4;
          m.wanderYaw = Math.random() * Math.PI * 2;
          m.wanderMove = Math.random() < 0.55;
        }
        // жители поворачиваются к игроку, когда он рядом
        if (m.type === 'villager' && dist < 4) { m.wanderYaw = Math.atan2(dx, dz); m.wanderMove = false; }
        m.yaw = m.wanderYaw;
        speed = m.wanderMove ? (def.speed || 1) : 0;
      }

      if (m.size < 1) speed *= 0.5;     // маленькие ходят медленнее
      if (m.hurtT <= 0) {
        const k = Math.min(1, dt * (m.onGround ? 10 : 2));
        m.vel.x += (Math.sin(m.yaw) * speed - m.vel.x) * k;
        m.vel.z += (Math.cos(m.yaw) * speed - m.vel.z) * k;
      }
      const inWater = isWaterB(world.getBlock(Math.floor(m.pos.x), Math.floor(m.pos.y + 0.4), Math.floor(m.pos.z)));
      if (inWater) m.vel.y = Math.min(m.vel.y + 25 * dt, 2.5);
      else m.vel.y = Math.max(m.vel.y - 28 * dt, -40);

      const sz = m.size || 1;
      const r = moveBox(world, m.pos, m.vel, def.hw * sz, def.h * sz, dt);
      if (isLavaB(world.getBlock(Math.floor(m.pos.x), Math.floor(m.pos.y + 0.2), Math.floor(m.pos.z)))) {   // в лаве долго не живут
        m.lavaT = (m.lavaT || 0) + dt; m.hurtT = 0.2;
        if (m.lavaT > 1.5) { m.dying = 0.4; continue; }
      }
      m.onGround = r.onGround;
      if (m.onGround && speed > 0) {
        if (r.hitWall) m.vel.y = sz < 1 ? 4.5 : 8;
        else if (m.type === 'buka' && m.hopCd <= 0) { m.vel.y = 5.5; m.hopCd = 0.5 + Math.random() * 0.4; }
      }

      if (def.hostile && o.canAttack && dist < 1.3 && Math.abs(player.pos.y - m.pos.y) < 1.5 && m.attackCd <= 0) {
        m.attackCd = 1;
        o.hurt(o.diff.dmg, m.pos.x, m.pos.z);
      }

      // внешний вид
      m.group.position.copy(m.pos);
      let dy = m.yaw - m.group.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      m.group.rotation.y += dy * Math.min(1, dt * 10);
      const hs = Math.hypot(m.vel.x, m.vel.z);
      m.walk += hs * dt * 4;
      const swing = hs > 0.2 && m.onGround ? Math.sin(m.walk) * 0.6 : 0;
      m.legs.forEach((l, k) => { l.rotation.x = (k % 2 === (k < 2 ? 0 : 1) ? swing : -swing); });
      if (m.body && def.hostile) {
        const sq = m.onGround ? 1 : 1.12;
        m.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      }
      const hurt = m.hurtT > 0;
      for (const mat of m.mats) {
        if (mat.userData.glow) continue;
        if (hurt) mat.color.setHex(0xff5050);
        else mat.color.copy(mat.userData.base).multiplyScalar(o.light);
      }
    }
  }

  // Мод «Мини-мир»: уменьшить или вернуть обычный размер
  resize(m, size) {
    m.size = size;
    m.group.scale.setScalar(size * (m.def.scale || 1));
  }

  // Луч из глаз игрока: в кого попали
  raycast(o, d, maxDist) {
    let best = null;
    for (const m of this.list) {
      if (m.dying) continue;
      const sz = m.size || 1, hw = m.def.hw * sz;
      const min = [m.pos.x - hw, m.pos.y, m.pos.z - hw], max = [m.pos.x + hw, m.pos.y + m.def.h * sz, m.pos.z + hw];
      const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
      let t0 = 0, t1 = maxDist;
      for (let a = 0; a < 3 && t0 <= t1; a++) {
        if (Math.abs(dd[a]) < 1e-9) { if (oo[a] < min[a] || oo[a] > max[a]) t0 = Infinity; continue; }
        let ta = (min[a] - oo[a]) / dd[a], tb = (max[a] - oo[a]) / dd[a];
        if (ta > tb) { const t = ta; ta = tb; tb = t; }
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      }
      if (t0 <= t1 && (!best || t0 < best.t)) best = { mob: m, t: t0 };
    }
    return best;
  }

  // Возвращает true, если существо побеждено
  hit(m, dmg, dx, dz) {
    m.hp -= dmg;
    m.hurtT = 0.3;
    m.vel.set(dx * 7, 5, dz * 7);
    if (!m.def.hostile) m.panic = 4;
    if (m.hp <= 0) { m.dying = 0.4; return true; }
    return false;
  }

  greeting(name) {
    return GREETINGS[Math.floor(Math.random() * GREETINGS.length)].replace('{name}', name);
  }

  remove(i) {
    const m = this.list[i];
    this.scene.remove(m.group);
    m.mats.forEach(mt => mt.dispose());
    this.list.splice(i, 1);
  }

  clear() {
    for (let i = this.list.length - 1; i >= 0; i--) this.remove(i);
  }
}
