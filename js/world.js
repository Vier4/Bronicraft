'use strict';

const CS = 16;          // размер чанка по X и Z
const CH = 128;         // высота мира (было 96; горы и облака остались на прежней высоте)
const SEA = 40;         // уровень моря
const SNOW_LINE = 70;   // выше — снег
const VCELL = 160;
const FLAT_G = 40;      // высота земли на плоских картах
// аэропорт в городе: прямоугольник западнее места появления
const AIRPORT = { x0: -192, z0: -32, w: 128, d: 96 };
// особые здания возле места появления: [квартал x, квартал z]
const POLICE_LOT = [0, 0], HOSPITAL_LOT = [0, 1];
// «Русский город»: город Новобронск 3×3 квартала по 80 блоков и три деревни вокруг
const RUS = {
  T0: -120, P: 80, N: 3,
  // что стоит в квартале [x][z]
  blocks: [['khrush', 'market', 'new'], ['new', 'square', 'park'], ['khrushPanel', 'khrush', 'khrushGarage']],
  villages: [
    { name: 'Малые Ёлки', x: 0, z: -300, axis: 'z' },
    { name: 'Берёзовка', x: 300, z: 0, axis: 'x' },
    { name: 'Пирожково', x: -300, z: 0, axis: 'x' },
  ],
  town: 'Новобронск',
};
// «Дома на Москве-реке»: остров, со всех сторон окружённый рекой, мосты и берега с домами.
// Улицы на острове идут по линиям x = XL и z = ZL, на берегу — по линиям x = ML.
const RIVER = {
  HALF: 80, BANK: 128, WEST: -224, EAST: 208,       // полуширина острова, где начинается берег
  XL: [-120, -40, 40, 120], ZL: [-69, 0, 69], ML: [-200, -120, -40, 40, 120, 200],
  // кварталы острова [x][север/юг]
  blocks: [['stalin', 'yellow'], ['factory', 'church'], ['glass', 'panel']],
};
// ЖК «Самоцветы» (Миниполис, Люберцы, ул. Кирова, 12): три Г-образных корпуса по 23 этажа — красный, жёлтый
// и зелёный, в каждом два подъезда. Двор без машин за вторым контуром с КПП, вокруг — первый контур
// с гостевой парковкой, многоуровневый паркинг и физкультурно-оздоровительный комплекс «С.С.С.Р.».
const SAMO = {
  IN: { x0: -95, x1: 95, z0: -80, z1: 80 },          // двор (второй контур)
  OUT: { x0: -130, x1: 150, z0: -115, z1: 125 },     // первый контур
  XS: [-115, 135], ZS: [-100, 110],                  // объездная дорога внутри первого контура
  W: 32, D: 20, H: 3, NF: 23,                         // секция (подъезд): 32×20, этажи по 3 блока
  // корпус — буква «Г» из двух секций; ox, oz — внешний угол, r — поворот на четверть оборота
  corpuses: [
    { color: B.CONCRETE_RED, ox: -95, oz: -80, r: 0 },
    { color: B.CONCRETE_YELLOW, ox: 95, oz: -80, r: 1 },
    { color: B.CONCRETE_GREEN, ox: -95, oz: 80, r: 3 },
  ],
  FOK: { x0: 41, x1: 95, z0: 51, z1: 80 },           // «С.С.С.Р.»: бассейны, тренажёрный зал, сауна
  PARK: { x0: 98, x1: 122, z0: -60, z1: 0 },         // многоуровневый паркинг
  // план типового этажа секции: # стена, c коридор, A B C D — квартиры, L лифты, E шахта, S лестница,
  // x и y — подсобки; a b p q — двери квартир, o — проход к лифтам и лестнице
  PLAN: (() => {
    const rows = [];
    const wall = (doors) => { const r = '#'.repeat(32).split(''); for (const [i, ch] of doors) r[i] = ch; return r.join(''); };
    rows.push('#'.repeat(32));
    for (let i = 0; i < 7; i++) rows.push('#' + 'A'.repeat(15) + '#' + 'B'.repeat(14) + '#');
    rows.push(wall([[8, 'a'], [23, 'b']]));
    rows.push('#' + 'c'.repeat(30) + '#'); rows.push('#' + 'c'.repeat(30) + '#');
    rows.push(wall([[4, 'p'], [9, 'o'], [10, 'o'], [12, 'o'], [13, 'o'], [15, 'o'], [16, 'o'], [17, 'o'], [19, 'o'], [27, 'q']]));
    rows.push('#CCCCCCC#LL#LL#LLL#SSS##DDDDDDD#'); rows.push('#CCCCCCC#LL#LL#LLL#SSS##DDDDDDD#');
    rows.push('#CCCCCCC#EEEEEEEEE#SSS##DDDDDDD#'); rows.push('#CCCCCCC#xxxxxxxxx#SSS##DDDDDDD#');
    rows.push('#CCCCCCC#xxxxxxxxx######DDDDDDD#');
    rows.push('#CCCCCCC#xxxxxxxxx#yyyy#DDDDDDD#'); rows.push('#CCCCCCC#xxxxxxxxx#yyyy#DDDDDDD#');
    rows.push('#'.repeat(32));
    return rows;
  })(),
  // квартиры: строка — ряд от двери к окну. U унитаз, N раковина, A ванна, ~ плитка, K кухня, O плита, F холодильник,
  // t стол, c стул, S диван, T телевизор, B кровать, W шкаф, R ковёр, L торшер, P цветок, d дверь
  FLATS: {
    A: ['U~N#W...P#KKOKF', 'AA~d.....d.....', '####d#####.tt..', 'W........#.cc..', '.RRR.....#....T', '.RBR.....#S....', 'L.B.WW..P#S..P.'],
    B: ['KKOKF#...#N~~U', '.....d...d~~AA', '.tt..#.d######', '.cc..#W......W', 'T....#..RRR...', '...S.#..RBR...', 'P..S.#L..B..P.'],
    S: ['U~#...K', 'N~d...O', 'AA#..tK', '###.ccF', 'B.R...T', 'B.R....', 'W..S.LP'],
  },
  SHOPS: ['Продукты', 'Аптека', 'Кафе', 'Банк', 'Почта', 'Продукты'],
  OFFICES: ['Детская поликлиника', 'Женская консультация', 'Нотариус', 'Развивающий центр', 'Реабилитационный центр', 'Банк'],
};
// «Супер! Три новых ЖК»: три дома вокруг общего двора, под всем — подземная парковка
const ZHK = {
  SW: 19, D: 16, PF: 34,                    // ширина подъезда, глубина дома, пол парковки
  buildings: [
    { name: 'Небо', x0: -54, z0: -36, sections: 2, floors: 16, front: 'n',
      frame: B.CONCRETE_WHITE, band: B.CONCRETE_WHITE, glass: B.GLASS_BLUE, crown: B.GLASS_BLUE },
    { name: 'Сад', x0: 19, z0: -36, sections: 2, floors: 12, front: 'n',
      frame: B.BRICK, band: B.DARK_PLANKS, glass: B.GLASS, crown: B.LEAVES, garden: true },
    { name: 'Река', x0: -29, z0: 20, sections: 3, floors: 14, front: 's',
      frame: B.CONCRETE_BLACK, band: B.GOLD_BLOCK, glass: B.GLASS, crown: B.GOLD_BLOCK },
  ],
  park: { x0: -60, x1: 64, z0: -37, z1: 36 },
  ramp: { x0: 58, x1: 62, z0: -34 },
  shops: [
    ['Кафе', B.WOOL_ORANGE], ['Пекарня', B.WOOL_YELLOW], ['Аптека', B.CONCRETE_GREEN], ['Продукты', B.CONCRETE_RED],
    ['Цветы', B.CONCRETE_PINK], ['Барбершоп', B.CONCRETE_BLACK], ['Фитнес', B.CONCRETE_BLUE], ['Пункт выдачи', B.WOOL_PURPLE],
  ],
};
// метро: линия под дорогой x = 0..6, станции в кварталах z из списка, депо на южном конце
const METRO = {
  cross: 3, y: FLAT_G - 7, zN: -186, zS: 353, stations: [-6, -2, 2, 6],
  names: { '-6': 'Северная', '-2': 'Парковая', '2': 'Центральная', '6': 'Южная' },
  depot: { x0: -16, x1: 22, z0: 352, z1: 447 },
};      // мир поделён на клетки 160×160, в некоторых — деревня

// дверь в клетке: k — 1 нижняя половинка, 2 верхняя; f — куда смотрит лицевая сторона
const doorAt = (k, f) => (k === 1 ? B.DOOR : B.DOOR_TOP) + f;

class World {
  // preset — готовая карта: 'city' (город), 'village' (реалистичная деревня), 'flat' (плоский мир)
  constructor(scene, materials, seed, edits, preset) {
    this.preset = preset || null;
    this.scene = scene;
    this.materials = materials;
    this.seed = seed | 0;
    this.perlin = Noise.createPerlin(this.seed);
    this.chunks = new Map();
    this.edits = edits || {};   // изменения игрока: { "cx,cz": { индекс: id } }
    for (const k in this.edits) for (const i in this.edits[k]) if (this.edits[k][i] === B.BRONYA) this.edits[k][i] = B.CONCRETE_PINK;
    this.villages = new Map();
    this.minis = new Map();     // мини-блоки: "x,y,z" → 64 номера блоков (0 — пусто)
    this.boxes = new Map();     // сундуки и печки: "x,y,z" → что лежит внутри
    this.lights = new Map();    // источники света по чанкам: "cx,cz" → [[x, y, z, сила], ...]
    this.fluidQ = new Map();    // жидкости, которые скоро потекут: "x,y,z" → когда
    this.fluidTime = 0;
    this.frame = 0;
    this.setRenderDist(6);
  }

  setRenderDist(r) {
    this.renderDist = r;
    const R = r + 1, offs = [];
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) offs.push([dx, dz]);
    offs.sort((a, b) => (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1]));
    this.offsets = offs;
  }

  // ---------- Рельеф ----------
  // ровные карты: город, плоский мир и «Улица Ленина»
  flatMap() {
    return this.preset === 'city' || this.preset === 'flat' || this.preset === 'lenin' || this.preset === 'lenin_winter' || this.preset === 'zhk' ||
      this.preset === 'rus' || this.preset === 'rus_winter' || this.preset === 'river' || this.preset === 'samo';
  }

  heightAt(x, z) {
    if (this.flatMap()) return FLAT_G;
    if (this.preset === 'village') {
      const f = this.perlin.fbm2;
      return Math.floor(SEA + 5 + f(x * 0.006, z * 0.006, 4) * 10 + f(x * 0.03 + 50, z * 0.03, 2) * 2);
    }
    const f = this.perlin.fbm2;
    const c = f(x * 0.004, z * 0.004, 4);
    const d = f(x * 0.02 + 100, z * 0.02, 3);
    const m = f(x * 0.008 + 300, z * 0.008 - 200, 4);
    let h = SEA + 3 + c * 45 + d * 8;
    if (m > 0.12) h += (m - 0.12) * 110;
    return Math.floor(Math.max(4, Math.min(86, h)));
  }

  isDesert(x, z) {
    if (this.preset) return false;
    return this.perlin.fbm2(x * 0.0025 + 700, z * 0.0025 - 300, 2) > 0.16;
  }

  isCave(x, y, z, h) {
    if (this.flatMap()) return false;
    if (this.preset === 'village' && y > h - 8) return false;
    if (y <= 2 || y > h) return false;
    if (h <= SEA + 2 && y > h - 6) return false;   // не дырявим дно морей
    return this.perlin.noise3(x * 0.045, y * 0.07, z * 0.045) > 0.38;
  }

  findSpawn() {
    if (this.preset === 'city') return { x: 3, z: 20 };
    if (this.preset === 'flat') return { x: 0, z: 0 };
    if (this.preset === 'lenin' || this.preset === 'lenin_winter') return { x: 30, z: 5 };
    if (this.preset === 'zhk') return { x: 0, z: 8 };
    if (this.preset === 'rus' || this.preset === 'rus_winter') return { x: 3, z: 6 };
    if (this.preset === 'river') return { x: -2, z: 8 };
    if (this.preset === 'samo') return { x: 0, z: 10 };
    // если рядом есть деревня — появляемся прямо возле колодца
    const near = [];
    for (let vz = -3; vz <= 3; vz++) for (let vx = -3; vx <= 3; vx++) {
      const p = this.villagePlan(vx, vz);
      if (p) near.push(p);
    }
    if (near.length) {
      near.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
      return { x: near[0].x + 3, z: near[0].z + 3 };
    }
    for (let r = 0; r < 600; r += 4) {
      const n = Math.max(1, r * 2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
        const h = this.heightAt(x, z);
        if (h <= SEA + 2 || h >= SNOW_LINE - 4 || this.isDesert(x, z)) continue;
        let cave = false;
        for (let y = h - 4; y <= h; y++) if (this.isCave(x, y, z, h)) cave = true;
        if (!cave) return { x, z };
      }
    }
    return { x: 0, z: 0 };
  }

  // ---------- Генерация чанка ----------
  generate(cx, cz) {
    if (this.flatMap()) return this.generateFlat(cx, cz);
    const data = new Uint16Array(CS * CS * CH);
    const ox = cx * CS, oz = cz * CS, s = this.seed;
    const idx = (x, y, z) => (y * CS + z) * CS + x;

    for (let lz = 0; lz < CS; lz++) {
      for (let lx = 0; lx < CS; lx++) {
        const wx = ox + lx, wz = oz + lz;
        const h = this.heightAt(wx, wz);
        const desert = this.isDesert(wx, wz);
        let top, filler;
        if (h <= SEA + 1 || desert) { top = B.SAND; filler = B.SAND; }
        else if (h >= SNOW_LINE) { top = B.SNOW; filler = B.DIRT; }
        else { top = B.GRASS; filler = B.DIRT; }

        // кораллы растут на дне неглубокого тёплого моря, пятнами
        const reef = h <= SEA - 3 && h >= SEA - 14 && !this.isDesert(wx, wz) && this.perlin.noise2(wx * 0.04 + 300, wz * 0.04 - 200) > 0.18;
        const coral = B.CORAL_RED + Math.floor(((this.perlin.noise2(wx * 0.09 - 50, wz * 0.09 + 70) + 1) / 2) * 4.99);
        const maxY = Math.max(h, SEA);
        for (let y = 0; y <= maxY; y++) {
          let id;
          if (y === 0 || (y <= 2 && Noise.hash3(wx, y, wz, s) < 0.5)) id = B.BEDROCK;
          else if (y < h - 3) {
            id = B.STONE;
          }
          else if (y < h) id = filler;
          else if (y === h) id = top;
          else id = B.WATER;
          // под пустыней — песчаник, на дне морей — гравий и глина
          if (desert && id === B.STONE && y >= h - 7) id = B.SANDSTONE;
          if (y === h && h < SEA - 1) {
            const g = Noise.hash3(wx, 3, wz, s + 6);
            if (g < 0.25) id = B.GRAVEL; else if (g < 0.35) id = B.CLAY;
            if (reef) id = coral;                                          // коралловый риф
          }
          if (id !== B.WATER && id !== B.BEDROCK && this.isCave(wx, y, wz, h)) id = y <= 10 ? B.LAVA : B.AIR;   // глубоко в пещерах — озёра лавы
          if (id) data[idx(lx, y, lz)] = id;
        }
        if (reef) {                                                        // на рифе — столбики и кустики кораллов
          const r = Noise.hash3(wx, 11, wz, s + 8);
          let top = h + 1;
          if (r < 0.12) { data[idx(lx, top, lz)] = coral; top++; if (r < 0.05 && top < SEA - 1) { data[idx(lx, top, lz)] = coral; top++; } }
          if (r < 0.45 && top < SEA) data[idx(lx, top, lz)] = B.CORAL_FAN_RED + Math.floor(Noise.hash3(wx, 12, wz, s + 8) * 4.99);
        }
      }
    }

    this.oreVeins(data, cx, cz);
    this.mineshafts(data, ox, oz);

    // Деревья и кактусы (с запасом в 2 блока, чтобы кроны с соседних чанков тоже попадали)
    const put = (lx, y, lz, id, onlyAir) => {
      if (lx < 0 || lz < 0 || lx >= CS || lz >= CS || y < 0 || y >= CH) return;
      const i = idx(lx, y, lz);
      if (onlyAir && data[i] !== B.AIR) return;
      data[i] = id;
    };
    for (let tz = -2; tz < CS + 2; tz++) {
      for (let tx = -2; tx < CS + 2; tx++) {
        const wx = ox + tx, wz = oz + tz;
        const r = Noise.hash3(wx, 7, wz, s + 2);
        if (r > 0.045) continue;
        if (this.inVillage(wx, wz)) continue;
        const desert = this.isDesert(wx, wz);
        const h = this.heightAt(wx, wz);
        if (h <= SEA + 1 || this.isCave(wx, h, wz, h)) continue;
        if (desert) {
          if (r < 0.005 && tx >= 0 && tz >= 0 && tx < CS && tz < CS) {
            const ch = 1 + Math.floor(Noise.hash3(wx, 9, wz, s + 3) * 3);
            for (let y = 1; y <= ch; y++) put(tx, h + y, tz, B.CACTUS);
          }
          continue;
        }
        if (h >= SNOW_LINE - 2) continue;
        // иногда на траве лежат тыквы и арбузы
        if (r < 0.0012 && tx >= 0 && tz >= 0 && tx < CS && tz < CS) {
          put(tx, h + 1, tz, Noise.hash3(wx, 10, wz, s + 3) < 0.5 ? B.PUMPKIN : B.MELON, true);
          continue;
        }
        const dens = 0.004 + Math.max(0, this.perlin.noise2(wx * 0.01 + 40, wz * 0.01 - 40)) * 0.08;
        if (r > dens) continue;
        const th = 4 + Math.floor(Noise.hash3(wx, 8, wz, s + 3) * 3);
        for (let dy = th - 2; dy <= th + 1; dy++) {
          const rad = dy >= th ? 1 : 2;
          for (let dz = -rad; dz <= rad; dz++) {
            for (let dx = -rad; dx <= rad; dx++) {
              if (rad === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && Noise.hash3(wx + dx, h + dy, wz + dz, s + 4) < 0.6) continue;
              if (dy === th + 1 && dx !== 0 && dz !== 0) continue;
              put(tx + dx, h + dy, tz + dz, B.LEAVES, true);
            }
          }
        }
        for (let dy = 1; dy <= th; dy++) put(tx, h + dy, tz, B.LOG);
        put(tx, h, tz, B.DIRT);
      }
    }

    // деревни
    const v0x = Math.floor(ox / VCELL), v1x = Math.floor((ox + CS - 1) / VCELL);
    const v0z = Math.floor(oz / VCELL), v1z = Math.floor((oz + CS - 1) / VCELL);
    for (let vz = v0z; vz <= v1z; vz++) for (let vx = v0x; vx <= v1x; vx++) {
      const plan = this.villagePlan(vx, vz);
      if (!plan || plan.maxX < ox || plan.minX >= ox + CS || plan.maxZ < oz || plan.minZ >= oz + CS) continue;
      for (const c of plan.cells) {
        const lx = c[0] - ox, lz = c[2] - oz;
        if (lx >= 0 && lz >= 0 && lx < CS && lz < CS && c[1] >= 0 && c[1] < CH) data[idx(lx, c[1], lz)] = c[3];
      }
    }

    const key = cx + ',' + cz;
    const ed = this.edits[key];
    if (ed) for (const k in ed) data[+k] = ed[k];

    this.findLights(cx, cz, data);
    return { cx, cz, key, data, meshes: {}, dirty: true, meshed: false };
  }

  // ---------- Руда: жилы из нескольких блоков рядом ----------
  oreVeins(data, cx, cz) {
    // [руда, жил на чанк, глубина от и до, размер жилы]
    const ORES = [
      [B.COAL, 12, 5, 72, 10], [B.IRON, 9, 5, 56, 7], [B.GOLD, 4, 3, 32, 6],
      [B.DIAMOND, 3, 3, 18, 5], [B.EMERALD, 2, 4, 30, 4],
      [B.OBSIDIAN, 2, 2, 12, 6],
    ];
    const rnd = Noise.mulberry32((Math.imul(cx, 668265263) ^ Math.imul(cz, 374761393) ^ (this.seed + 99)) | 0);
    for (const [ore, count, y0, y1, size] of ORES) {
      for (let v = 0; v < count; v++) {
        let x = rnd() * CS, y = y0 + rnd() * (y1 - y0), z = rnd() * CS;
        const n = Math.ceil(size * (0.5 + rnd() * 0.5));
        for (let k = 0; k < n; k++) {
          const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
          if (bx >= 0 && bz >= 0 && bx < CS && bz < CS && by > 0 && by < CH) {
            const i = (by * CS + bz) * CS + bx;
            if (data[i] === B.STONE || data[i] === B.SANDSTONE) data[i] = ore;
          }
          x += rnd() * 2 - 1; y += rnd() * 2 - 1; z += rnd() * 2 - 1;
        }
      }
    }
  }

  // ---------- Заброшенные шахты: коридоры с подпорками и фонарями ----------
  mineshafts(data, ox, oz) {
    if (this.flatMap()) return;
    const MS = 48, s = this.seed + 123;
    const set = (lx, y, lz, id, onlySolid) => {
      if (lx < 0 || lz < 0 || lx >= CS || lz >= CS || y <= 1 || y >= CH) return;
      const i = (y * CS + lz) * CS + lx;
      if (onlySolid && data[i] === B.AIR) return;
      data[i] = id;
    };
    for (let rz = Math.floor((oz - MS) / MS); rz <= Math.floor((oz + CS) / MS); rz++) {
      for (let rx = Math.floor((ox - MS) / MS); rx <= Math.floor((ox + CS) / MS); rx++) {
        if (Noise.hash3(rx, 1, rz, s) > 0.55) continue;
        const alongX = Noise.hash3(rx, 2, rz, s) < 0.5;
        const y = 12 + Math.floor(Noise.hash3(rx, 3, rz, s) * 18);
        const c = (alongX ? rz : rx) * MS + 8 + Math.floor(Noise.hash3(rx, 4, rz, s) * 32);   // поперечная координата
        const a0 = (alongX ? rx : rz) * MS, a1 = a0 + MS + 8;                                  // вдоль коридора
        for (let a = a0; a < a1; a++) {
          for (let d = -1; d <= 1; d++) {
            const wx = alongX ? a : c + d, wz = alongX ? c + d : a;
            const lx = wx - ox, lz = wz - oz;
            if (lx < 0 || lz < 0 || lx >= CS || lz >= CS) continue;
            set(lx, y - 1, lz, B.PLANKS);
            for (let yy = y; yy <= y + 2; yy++) set(lx, yy, lz, B.AIR);
            if (a % 4 === 0) {                     // деревянная рама
              if (d !== 0) { set(lx, y, lz, B.LOG); set(lx, y + 1, lz, B.LOG); }
              set(lx, y + 2, lz, B.PLANKS);
              if (d === 0 && a % 12 === 0) set(lx, y + 2, lz, B.LAMP);
            }
          }
        }
      }
    }
  }

  // ---------- Деревни ----------
  villagePlan(vx, vz) {
    const key = vx + ',' + vz;
    if (this.villages.has(key)) return this.villages.get(key);
    let plan = null;
    const s = this.seed + 5;
    if (this.flatMap()) { this.villages.set(key, null); return null; }
    if (this.preset === 'village' || Noise.hash3(vx, 11, vz, s) < 0.65) {
      const x = vx * VCELL + 40 + Math.floor(Noise.hash3(vx, 12, vz, s) * 80);
      const z = vz * VCELL + 40 + Math.floor(Noise.hash3(vx, 13, vz, s) * 80);
      const h = this.heightAt(x, z);
      let ok = h > SEA + 2 && h < SNOW_LINE - 8 && !this.isDesert(x, z);
      for (let k = 0; k < 8 && ok; k++) {
        const a = k / 8 * Math.PI * 2;
        const hh = this.heightAt(x + Math.round(Math.cos(a) * 20), z + Math.round(Math.sin(a) * 20));
        if (Math.abs(hh - h) > 8 || hh <= SEA + 1) ok = false;
      }
      if (ok) plan = this.buildVillage(key, vx, vz, x, z, h);
    }
    this.villages.set(key, plan);
    return plan;
  }

  inVillage(x, z) {
    const p = this.villagePlan(Math.floor(x / VCELL), Math.floor(z / VCELL));
    return !!p && Math.abs(x - p.x) < p.radius && Math.abs(z - p.z) < p.radius;
  }

  villagesNear(x, z, r) {
    const out = [];
    const cx = Math.floor(x / VCELL), cz = Math.floor(z / VCELL);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const p = this.villagePlan(cx + dx, cz + dz);
      if (p && Math.hypot(p.x - x, p.z - z) < r) out.push(p);
    }
    return out;
  }

  buildVillage(id, vx, vz, x, z, h) {
    const rnd = Noise.mulberry32((Math.imul(vx, 73856093) ^ Math.imul(vz, 19349663) ^ this.seed) | 0);
    const cells = [];
    const put = (bx, by, bz, b) => cells.push([bx, by, bz, b]);

    const rich = this.preset === 'village';      // «Реалистичная деревня» — больше и богаче
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const houses = [];
    const n = rich ? 9 + Math.floor(rnd() * 3) : 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + rnd() * 0.3;
      const dist = rich ? (i % 2 ? 25 + rnd() * 3 : 14 + rnd() * 3) : 13 + rnd() * 6;
      const w = rnd() < 0.5 ? 5 : 7, d = rnd() < 0.5 ? 5 : 7;
      const hcx = Math.round(x + Math.cos(a) * dist), hcz = Math.round(z + Math.sin(a) * dist);
      if (this.heightAt(hcx, hcz) <= SEA + 1) continue;
      houses.push({ hx: hcx - (w >> 1), hz: hcz - (d >> 1), w, d, cx: hcx, cz: hcz });
    }

    // тропинки от дверей к колодцу (рисуем первыми — дома их перекроют)
    for (const ho of houses) {
      const dx = x - ho.cx, dz = z - ho.cz;
      if (Math.abs(dx) > Math.abs(dz)) { ho.door = dx > 0 ? 'px' : 'nx'; } else { ho.door = dz > 0 ? 'pz' : 'nz'; }
      const steps = Math.ceil(Math.hypot(dx, dz));
      for (let k = 0; k <= steps; k++) {
        const px = Math.round(ho.cx + dx * k / steps), pz = Math.round(ho.cz + dz * k / steps);
        const py = this.heightAt(px, pz);
        put(px, py, pz, B.PATH);
        put(px, py + 1, pz, B.AIR); put(px, py + 2, pz, B.AIR);
        if (k === Math.floor(steps / 2)) {        // фонарь у тропинки
          const lx = px + (Math.abs(dx) > Math.abs(dz) ? 0 : 1), lz = pz + (Math.abs(dx) > Math.abs(dz) ? 1 : 0);
          const ly = this.heightAt(lx, lz);
          put(lx, ly + 1, lz, B.LOG); put(lx, ly + 2, lz, B.LOG); put(lx, ly + 3, lz, B.LAMP);
        }
      }
    }

    // колодец
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const edge = Math.max(Math.abs(dx), Math.abs(dz)) === 2, corner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
      for (let yy = h - 3; yy < h - 1; yy++) put(x + dx, yy, z + dz, B.COBBLE);
      put(x + dx, h - 1, z + dz, edge ? B.COBBLE : B.WATER);
      put(x + dx, h, z + dz, edge ? B.COBBLE : B.WATER);
      put(x + dx, h + 1, z + dz, corner ? B.LOG : edge ? B.COBBLE : B.AIR);
      put(x + dx, h + 2, z + dz, corner ? B.LOG : B.AIR);
      put(x + dx, h + 3, z + dz, corner ? B.LOG : B.AIR);
      put(x + dx, h + 4, z + dz, B.PLANKS);
    }

    // в большой деревне: поля, загоны и башня (рисуем до домов)
    if (rich) this.villageExtras(put, rnd, x, z, houses);

    // дома
    for (const ho of houses) {
      const y = this.heightAt(ho.cx, ho.cz);
      const { hx, hz, w, d } = ho;
      const wall = rich ? pick([B.PLANKS, B.BIRCH_PLANKS, B.DARK_PLANKS, B.STONE_BRICKS]) : B.PLANKS;
      const corner = wall === B.STONE_BRICKS ? B.COBBLE : B.LOG;
      const roof = rich ? pick([B.BRICK, B.DARK_PLANKS, B.CONCRETE_RED, B.BRICK]) : B.BRICK;
      for (let bz = hz; bz < hz + d; bz++) for (let bx = hx; bx < hx + w; bx++) {
        const ex = bx === hx || bx === hx + w - 1, ez = bz === hz || bz === hz + d - 1;
        for (let yy = y - 4; yy < y; yy++) put(bx, yy, bz, yy === y - 1 ? B.COBBLE : B.DIRT);
        put(bx, y, bz, B.PLANKS);
        for (let yy = y + 1; yy <= y + 3; yy++) {
          let b = B.AIR;
          if (ex && ez) b = corner;
          else if (ex || ez) b = (yy === y + 2 && ((ex ? bz - hz : bx - hx) % 2 === 0)) ? B.GLASS : wall;
          put(bx, yy, bz, b);
        }
      }
      for (let k = 0; ; k++) {          // крыша-пирамидка
        const x0 = hx - 1 + k, x1 = hx + w - k, z0 = hz - 1 + k, z1 = hz + d - k;
        if (x0 > x1 || z0 > z1) break;
        for (let bz = z0; bz <= z1; bz++) for (let bx = x0; bx <= x1; bx++) put(bx, y + 4 + k, bz, roof);
      }
      // дверной проём и дорожка перед ним
      const mx = hx + (w >> 1), mz = hz + (d >> 1);
      const door = { px: [hx + w - 1, mz, 1, 0], nx: [hx, mz, -1, 0], pz: [mx, hz + d - 1, 0, 1], nz: [mx, hz, 0, -1] }[ho.door];
      const df = door[2] > 0 ? 1 : door[2] < 0 ? 3 : door[3] > 0 ? 0 : 2;
      put(door[0], y + 1, door[1], doorAt(1, df)); put(door[0], y + 2, door[1], doorAt(2, df));
      put(door[0] + door[2], y, door[1] + door[3], B.PATH);
      put(door[0] + door[2], y + 1, door[1] + door[3], B.AIR); put(door[0] + door[2], y + 2, door[1] + door[3], B.AIR);
      // внутри: лампа, верстак, кровать
      put(mx, y + 3, mz, B.LAMP);
      const ix = door[2] ? (door[2] > 0 ? hx + 1 : hx + w - 2) : hx + 1;
      const iz = door[3] ? (door[3] > 0 ? hz + 1 : hz + d - 2) : hz + 1;
      put(ix, y + 1, iz, B.CRAFTING_TABLE);
      // сундук и печка у стены, лицом в комнату
      const cf = door[2] > 0 ? 1 : door[2] < 0 ? 3 : door[3] > 0 ? 0 : 2;
      put(door[2] ? ix : ix + 1, y + 1, door[2] ? iz + 1 : iz, B.CHEST + cf);
      put(door[2] ? ix : ix + 2, y + 1, door[2] ? iz + 2 : iz, B.FURNACE + cf);
      put(door[2] ? ix : hx + w - 2, y + 1, door[3] ? iz : hz + d - 2, B.BED + Math.floor(rnd() * 4));
      if (rich) {                        // стол со стулом, полка и цветок
        const tx = door[2] ? hx + (w >> 1) - door[2] : hx + w - 2, tz = door[3] ? hz + (d >> 1) - door[3] : hz + 1;
        put(tx, y + 1, tz, B.TABLE);
        put(door[2] ? tx : tx - 1, y + 1, door[3] ? tz : tz + 1, B.CHAIR + Math.floor(rnd() * 4));
        put(door[2] ? ix : hx + 1, y + 1, door[3] ? iz + (door[3] > 0 ? 1 : -1) : hz + d - 2, B.BOOKSHELF);
      }
    }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const c of cells) {
      if (c[0] < minX) minX = c[0]; if (c[0] > maxX) maxX = c[0];
      if (c[2] < minZ) minZ = c[2]; if (c[2] > maxZ) maxZ = c[2];
    }
    return { id, x, z, y: h, cells, minX, maxX, minZ, maxZ, houses: houses.length, radius: rich ? 40 : 30 };
  }

  villageExtras(put, rnd, x, z, houses) {
    // поля пшеницы с канавкой воды посередине
    for (let f = 0; f < 3; f++) {
      const a = (f / 3) * Math.PI * 2 + Math.PI / 6 + rnd() * 0.3;
      const fx = Math.round(x + Math.cos(a) * 34), fz = Math.round(z + Math.sin(a) * 34);
      const y = this.heightAt(fx, fz);
      if (y <= SEA) continue;
      for (let dz = -4; dz <= 4; dz++) for (let dx = -5; dx <= 5; dx++) {
        const edge = Math.abs(dx) === 5 || Math.abs(dz) === 4;
        for (let yy = y - 2; yy < y; yy++) put(fx + dx, yy, fz + dz, B.DIRT);
        put(fx + dx, y, fz + dz, edge ? B.GRASS : dz === 0 ? B.WATER : B.DIRT);
        put(fx + dx, y + 1, fz + dz, edge ? (Math.abs(dx) === 5 && Math.abs(dz) === 4 ? B.LOG : B.AIR) : dz === 0 ? B.AIR : (f === 2 && Math.abs(dz) > 2 ? B.PUMPKIN : B.WHEAT_CROP));
        for (let yy = y + 2; yy <= y + 6; yy++) put(fx + dx, yy, fz + dz, B.AIR);
      }
    }
    // загон из брёвен
    {
      const a = Math.PI * 1.5 + rnd() * 0.3;
      const px = Math.round(x + Math.cos(a) * 36), pz = Math.round(z + Math.sin(a) * 36);
      const y = this.heightAt(px, pz);
      if (y > SEA) for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
        const edge = Math.abs(dx) === 4 || Math.abs(dz) === 4;
        put(px + dx, y, pz + dz, B.GRASS);
        put(px + dx, y + 1, pz + dz, edge && !(dx === 0 && dz === 4) ? B.LOG : B.AIR);
        for (let yy = y + 2; yy <= y + 5; yy++) put(px + dx, yy, pz + dz, B.AIR);
        if (dx === 2 && dz === -2) put(px + dx, y + 1, pz + dz, B.HAY);
      }
    }
    // каменная башня с часами-лампой
    {
      const tx = x, tz = z - 8, y = this.heightAt(tx, tz);
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        for (let yy = y - 3; yy <= y; yy++) put(tx + dx, yy, tz + dz, B.STONE_BRICKS);
        for (let yy = y + 1; yy <= y + 11; yy++) {
          const win = (yy === y + 9) && (dx === 0 || dz === 0);
          put(tx + dx, yy, tz + dz, edge ? (win ? B.GLASS : B.STONE_BRICKS) : B.AIR);
        }
      }
      put(tx, y + 1, tz + 2, doorAt(1, 0)); put(tx, y + 2, tz + 2, doorAt(2, 0));
      for (let k = 0; k <= 3; k++) for (let dz = -3 + k; dz <= 3 - k; dz++) for (let dx = -3 + k; dx <= 3 - k; dx++) put(tx + dx, y + 12 + k, tz + dz, B.DARK_PLANKS);
      put(tx, y + 16, tz, B.GOLD_BLOCK);
      put(tx, y + 10, tz, B.LAMP);
    }
  }

  // ---------- Плоские карты: город и плоский мир ----------
  generateFlat(cx, cz) {
    const data = new Uint16Array(CS * CS * CH);
    const ox = cx * CS, oz = cz * CS, G = FLAT_G;
    for (let lz = 0; lz < CS; lz++) for (let lx = 0; lx < CS; lx++) {
      const set = (y, id) => { if (y >= 0 && y < CH) data[(y * CS + lz) * CS + lx] = id; };
      set(0, B.BEDROCK);
      for (let y = 1; y < G - 3; y++) set(y, B.STONE);
      for (let y = G - 3; y < G; y++) set(y, B.DIRT);
      set(G, B.GRASS);
      if (this.preset === 'city') {
        this.cityColumn(ox + lx, oz + lz, set);
        this.metroColumn(ox + lx, oz + lz, set);
      }
      if (this.preset === 'lenin' || this.preset === 'lenin_winter') this.leninColumn(ox + lx, oz + lz, set, this.preset === 'lenin_winter');
      if (this.preset === 'zhk') this.zhkColumn(ox + lx, oz + lz, set);
      if (this.preset === 'rus' || this.preset === 'rus_winter') this.rusColumn(ox + lx, oz + lz, set, this.preset === 'rus_winter');
      if (this.preset === 'river') this.riverColumn(ox + lx, oz + lz, set);
      if (this.preset === 'samo') this.samoColumn(ox + lx, oz + lz, set);
    }
    const key = cx + ',' + cz;
    const ed = this.edits[key];
    if (ed) for (const k in ed) data[+k] = ed[k];
    this.findLights(cx, cz, data);
    return { cx, cz, key, data, meshes: {}, dirty: true, meshed: false };
  }

  // Город: кварталы 32×32 — дорога, тротуар и участок с небоскрёбом, магазином, домом или парком
  cityColumn(wx, wz, set) {
    const G = FLAT_G, P = 32;
    const mod = (a, n) => ((a % n) + n) % n;
    const lx = mod(wx, P), lz = mod(wz, P), bx = Math.floor(wx / P), bz = Math.floor(wz / P);
    // аэропорт
    if (wx >= AIRPORT.x0 && wx < AIRPORT.x0 + AIRPORT.w && wz >= AIRPORT.z0 && wz < AIRPORT.z0 + AIRPORT.d) {
      this.airportColumn(wx - AIRPORT.x0, wz - AIRPORT.z0, set);
      return;
    }
    // канал с набережной: каждый шестой ряд кварталов, течёт под мостами дорог
    if (mod(bx, 6) === 2 && lx >= 9 && lx <= 29) {
      this.canalColumn(lx - 9, lz, set);
      return;
    }
    // дороги с разметкой и зебрами
    if (lx < 7 || lz < 7) {
      let top = B.CONCRETE_BLACK;
      if (lx < 7 && lz >= 9 && lx === 3 && mod(wz, 4) < 2) top = B.CONCRETE_YELLOW;
      if (lz < 7 && lx >= 9 && lz === 3 && mod(wx, 4) < 2) top = B.CONCRETE_YELLOW;
      if (lx < 7 && (lz === 7 || lz === 8) && lx % 2 === 0) top = B.CONCRETE_WHITE;
      if (lz < 7 && (lx === 7 || lx === 8) && lz % 2 === 0) top = B.CONCRETE_WHITE;
      set(G, top);
      return;
    }
    // тротуар и фонари
    if (lx <= 8 || lx >= 30 || lz <= 8 || lz >= 30) {
      set(G, B.CONCRETE);
      if (((lx === 8 || lx === 30) && lz % 8 === 4) || ((lz === 8 || lz === 30) && lx % 8 === 4)) {
        for (let y = G + 1; y <= G + 4; y++) set(y, B.COAL_BLOCK);
        set(G + 5, B.LAMP);
      }
      return;
    }
    const ix = lx - 9, iz = lz - 9;          // 0..20 внутри участка
    const h = k => Noise.hash3(bx, k, bz, this.seed + 31);
    const r = h(1);
    const tree = (tx, tz) => {
      const dx = Math.abs(ix - tx), dz = Math.abs(iz - tz), d = Math.max(dx, dz);
      if (d === 0) { for (let y = G + 1; y <= G + 4; y++) set(y, B.LOG); set(G + 5, B.LEAVES); set(G + 6, B.LEAVES); }
      else if (d === 1) for (let y = G + 3; y <= G + 6; y++) set(y, B.LEAVES);
      else if (d === 2 && !(dx === 2 && dz === 2)) for (let y = G + 3; y <= G + 5; y++) set(y, B.LEAVES);
    };

    if (bx === 0 && METRO.stations.includes(bz)) {
      // площадь со входом в метро
      set(G, (ix + iz) % 4 === 0 ? B.STONE_BRICKS : B.CONCRETE);
      tree(15, 5); tree(15, 15);
      if (ix === 7 && iz % 4 === 0) set(G + 1, B.FLOWER_POT);
      if (ix === 20 && iz % 5 === 2) set(G + 1, B.CHAIR + 3);
      return;
    }
    const special = (bx === POLICE_LOT[0] && bz === POLICE_LOT[1]) || (r >= 0.42 && r < 0.45) ? 'police'
      : (bx === HOSPITAL_LOT[0] && bz === HOSPITAL_LOT[1]) || (r >= 0.62 && r < 0.65) ? 'hospital' : null;
    if (special === 'police') { this.policeColumn(ix, iz, set); return; }
    if (special === 'hospital') { this.hospitalColumn(ix, iz, set); return; }

    if (r < 0.42) {
      // небоскрёб: этажи по 4 блока, стеклянные окна, вход спереди
      const H = 12 + Math.floor(h(2) * 9) * 4;
      const wall = [B.CONCRETE_WHITE, B.CONCRETE, B.STONE_BRICKS, B.MARBLE, B.CONCRETE_BLACK, B.CONCRETE_BLUE][Math.floor(h(3) * 6)];
      const glass = h(4) < 0.5 ? B.GLASS_BLUE : B.GLASS;
      if (ix < 2 || ix > 18 || iz < 2 || iz > 18) {
        set(G, iz < 2 && ix >= 8 && ix <= 12 ? B.CONCRETE : B.GRASS);
        if ((ix === 0 || ix === 20) && (iz === 0 || iz === 20)) set(G + 1, B.FLOWER_POT);
        return;
      }
      const edge = ix === 2 || ix === 18 || iz === 2 || iz === 18;
      const corner = (ix === 2 || ix === 18) && (iz === 2 || iz === 18);
      set(G, B.CONCRETE);
      for (let y = 1; y <= H; y++) {
        const floorLevel = y % 4 === 0;
        let b = B.AIR;
        if (edge) b = (corner || floorLevel) ? wall : glass;
        else if (floorLevel) b = B.CONCRETE;
        else if (y % 4 === 3 && ix % 6 === 4 && iz % 6 === 4) b = B.LAMP;      // светильники на потолке
        if (edge && iz === 2 && ix >= 9 && ix <= 11 && y <= 2) b = doorAt(y, 2);     // вход
        set(G + y, b);
      }
      if (edge) set(G + H + 1, wall);
      if (ix === 10 && iz === 10) set(G + H + 1, B.LAMP);
      return;
    }
    if (r < 0.62) {
      // магазин: стеклянная витрина, полосатый навес и бело-розовая вывеска
      const wall = [B.CONCRETE_WHITE, B.CONCRETE_YELLOW, B.CONCRETE_PINK, B.BRICK][Math.floor(h(5) * 4)];
      if (ix >= 3 && ix <= 17 && iz === 2) {
        set(G, B.CONCRETE);
        set(G + 4, ix % 2 ? B.WOOL_RED : B.WOOL_WHITE);
        return;
      }
      if (ix < 3 || ix > 17 || iz < 3 || iz > 15) { set(G, iz < 3 ? B.CONCRETE : B.GRASS); return; }
      const edge = ix === 3 || ix === 17 || iz === 3 || iz === 15;
      const corner = (ix === 3 || ix === 17) && (iz === 3 || iz === 15);
      set(G, B.CONCRETE);
      for (let y = 1; y <= 8; y++) {
        let b = B.AIR;
        if (edge) {
          b = wall;
          if (!corner && iz === 3 && y <= 3) b = B.GLASS;                            // витрина
          if (!corner && iz !== 3 && (y === 2 || y === 6) && (ix + iz) % 3 === 0) b = B.GLASS;
          if (iz === 3 && ix >= 9 && ix <= 10 && y <= 2) b = doorAt(y, 2);          // дверь
        } else if (y === 4 || y === 8) b = B.CONCRETE;
        if (!edge && y === 1 && iz === 13 && ix > 4 && ix < 16) b = B.BOOKSHELF;   // полки с товарами
        set(G + y, b);
      }
      if (edge) set(G + 9, wall);
      if (iz === 3 && ix >= 6 && ix <= 14) set(G + 9, ix % 2 ? B.CONCRETE_PINK : B.CONCRETE_WHITE);
      return;
    }
    if (r < 0.82) {
      // жилой дом в 2 этажа с садом и деревом
      const wall = [B.BRICK, B.BIRCH_PLANKS, B.PLANKS, B.STONE_BRICKS][Math.floor(h(6) * 4)];
      tree(2, 17); tree(17, 17);
      if (ix === 10 && iz < 5) { set(G, B.PATH); return; }
      if (ix < 4 || ix > 16 || iz < 4 || iz > 14) {
        if (!(ix >= 0 && ix <= 4 && iz >= 15) && !(ix >= 15 && iz >= 15)) set(G, B.GRASS);
        if ((ix === 0 || ix === 20) && iz % 4 === 0 && iz < 14) set(G + 1, B.LEAVES);   // кустики
        return;
      }
      const edge = ix === 5 || ix === 15 || iz === 5 || iz === 13;
      const inside = ix > 5 && ix < 15 && iz > 5 && iz < 13;
      if (edge || inside) {
        const corner = (ix === 5 || ix === 15) && (iz === 5 || iz === 13);
        set(G, B.PLANKS);
        for (let y = 1; y <= 8; y++) {
          let b = B.AIR;
          if (edge) {
            b = corner ? B.LOG : wall;
            if (!corner && (y === 2 || y === 6) && (ix + iz) % 2 === 0) b = B.GLASS;
            if (iz === 5 && ix === 10 && y <= 2) b = doorAt(y, 2);
          } else if (y === 4) b = B.PLANKS;
          if (inside && y === 1 && ix === 13 && iz === 11) b = B.SOFA + 3;
          if (inside && y === 1 && ix === 7 && iz === 11) b = B.TV + 1;
          if (inside && y === 5 && ix === 7 && iz === 7) b = B.BED + 2;
          set(G + y, b);
        }
      }
      // крыша-пирамидка
      const k = Math.min(ix - 4, 16 - ix, iz - 4, 14 - iz);
      if (k >= 0) set(G + 9 + k, B.DARK_PLANKS);
      return;
    }
    // парк с фонтаном, дорожками и деревьями
    const dc = Math.max(Math.abs(ix - 10), Math.abs(iz - 10));
    if (dc <= 2) {
      if (dc === 2) { set(G, B.STONE_BRICKS); set(G + 1, B.STONE_BRICKS); }
      else { set(G, B.WATER); set(G - 1, B.STONE_BRICKS); }
      if (dc === 0) { set(G, B.STONE_BRICKS); set(G + 1, B.STONE_BRICKS); set(G + 2, B.STONE_BRICKS); set(G + 3, B.WATER); }
      return;
    }
    if (ix === 10 || iz === 10) { set(G, B.PATH); return; }
    if ((ix === 9 || ix === 11) && iz % 5 === 0) set(G + 1, B.FLOWER_POT);
    tree(4, 4); tree(16, 4); tree(4, 16); tree(16, 16);
  }

  // ---------- «Улица Ленина»: девятиэтажки с квартирами, дворы, площадки, парковки ----------
  // Улица идёт вдоль x; дома и дворы зеркально по обе стороны дороги (az — расстояние от середины улицы).
  leninColumn(wx, wz, set, winter) {
    const G = FLAT_G, P = 64;
    const mod = (a, n) => ((a % n) + n) % n;
    const lx = mod(wx, P), seg = Math.floor(wx / P);
    const side = wz >= 0 ? 1 : -1, az = wz >= 0 ? wz : -wz;
    const mz = f => (side > 0 ? f : [2, 1, 0, 3][f]);      // на другой стороне улицы мебель смотрит наоборот
    const GROUND = winter ? B.SNOW : B.GRASS;
    const tree = (tx, tz) => {
      const dx = Math.abs(lx - tx), dz = Math.abs(az - tz), d = Math.max(dx, dz);
      if (d === 0) { for (let y = G + 1; y <= G + 4; y++) set(y, B.LOG); set(G + 5, B.LEAVES); set(G + 6, B.LEAVES); if (winter) set(G + 7, B.SNOW); }
      else if (d === 1) { for (let y = G + 3; y <= G + 6; y++) set(y, B.LEAVES); if (winter) set(G + 7, B.SNOW); }
      else if (d === 2 && !(dx === 2 && dz === 2)) { for (let y = G + 3; y <= G + 5; y++) set(y, B.LEAVES); if (winter) set(G + 6, B.SNOW); }
    };
    const streetTrees = () => { for (const tx of [10, 26, 58]) if (Math.abs(lx - tx) <= 2 && az >= 3 && az <= 7) tree(tx, 5); };
    set(G, GROUND);

    if (az <= 3) {                                            // дорога с разметкой и зеброй
      let b = B.CONCRETE_BLACK;
      if (lx >= 29 && lx <= 34) b = az % 2 === 1 ? B.CONCRETE_WHITE : B.CONCRETE_BLACK;
      else if (az === 0 && lx % 6 < 3) b = B.CONCRETE_WHITE;
      set(G, b);
      streetTrees();
      return;
    }
    if (az <= 6) {                                            // тротуар, фонари, остановка
      set(G, B.CONCRETE);
      if (az === 6 && lx % 16 === 2) { for (let y = G + 1; y <= G + 4; y++) set(y, B.COAL_BLOCK); set(G + 5, B.LAMP); }
      if (lx >= 40 && lx <= 45 && az >= 5) {
        if (lx === 40 || lx === 45) for (let y = G + 1; y <= G + 3; y++) set(y, B.GLASS);
        else if (az === 6) set(G + 1, B.CHAIR + mz(2));
        set(G + 4, B.GLASS_BLUE);
        if (winter) set(G + 5, B.SNOW);
      }
      streetTrees();
      return;
    }
    if (az === 7) {                                           // газон с цветами
      if (!winter && lx % 8 === 4) set(G + 1, B.FLOWER_POT);
      streetTrees();
      return;
    }
    if (az >= 8 && az <= 21 && (lx >= 63 || lx <= 1)) { set(G, B.PATH); return; }   // проход во двор
    if (az >= 8 && az <= 19) { this.leninHouse(lx - 2, az, set, side, winter, seg); return; }
    if (az <= 21) {                                           // у подъездов: козырьки, балконы, скамейки
      set(G, B.CONCRETE);
      const bx2 = lx - 2, sec = Math.min(3, Math.floor(bx2 / 15)), sx = bx2 - sec * 15;
      if (az === 20) {
        if (sx >= 6 && sx <= 9) { set(G + 3, sx === 7 || sx === 8 ? B.LAMP : B.CONCRETE_RED); if (winter) set(G + 4, B.SNOW); }
        if ((sx >= 2 && sx <= 4) || (sx >= 11 && sx <= 13)) {
          for (let f = 1; f < 9; f++) { set(G + 3 * f, B.CONCRETE_WHITE); set(G + 3 * f + 1, B.GLASS); }
        }
      } else if (sx === 5 || sx === 10) set(G + 1, B.CHAIR + mz(0));
      return;
    }
    if (az <= 46) {                                           // двор
      if (az === 22 || lx === 31 || lx === 32) set(G, B.PATH);
      if (lx >= 6 && lx <= 28 && az >= 24 && az <= 38) { this.leninPlayground(lx - 6, az - 24, set, winter, mz); return; }
      if (lx >= 6 && lx <= 28 && az >= 40 && az <= 46) { this.leninField(lx - 6, az - 40, set, winter); return; }
      if (lx >= 34 && lx <= 61 && az >= 23 && az <= 42) { this.leninParking(lx - 34, az - 23, set, winter); return; }
      for (const [tx, tz] of [[2, 30], [2, 42], [63, 36]]) if (Math.abs(lx - tx) <= 2 && Math.abs(az - tz) <= 2) tree(tx, tz);
      if (lx === 30 && az % 6 === 0) set(G + 1, B.CHAIR + 1);
      return;
    }
    if (az === 47) {                                          // забор двора с калиткой
      if (!(lx === 31 || lx === 32)) set(G + 1, lx % 4 === 0 ? B.COAL_BLOCK : B.GLASS);
      return;
    }
    // за домами: зимой — нарядная ёлка, летом — клумба с деревом
    const ex = lx - 32, ez = az - 54;
    if (Math.abs(ex) <= 4 && Math.abs(ez) <= 4) {
      if (winter) this.leninYolka(ex, ez, set);
      else { tree(32, 54); if (Math.max(Math.abs(ex), Math.abs(ez)) === 3) set(G + 1, B.FLOWER_POT); }
      return;
    }
    if (az <= 60 && lx % 12 === 6 && az % 8 === 4) tree(lx, az);
  }

  // Подъезд: 9 этажей по 3 блока, 4 подъезда по 15 блоков, в каждом лестница и две квартиры
  // opt: { floors — этажей (по умолчанию 9), panel — материал стен }
  leninHouse(bx2, az, set, side, winter, seg, opt) {
    const NF = (opt && opt.floors) || 9;
    const G = FLAT_G, TOP = 3 * NF;
    const sec = Math.min(3, Math.floor(bx2 / 15)), sx = bx2 - sec * 15;
    const endWall = bx2 === 0 || bx2 === 60;
    const zl = az;
    const outer = endWall || zl === 8 || zl === 19;
    const panel = (opt && opt.panel) || [B.CONCRETE, B.CONCRETE_WHITE, B.CONCRETE_YELLOW, B.BRICK][Math.floor(Noise.hash3(seg, 5, side, this.seed) * 4)];
    const mz = f => (side > 0 ? f : [2, 1, 0, 3][f]);
    const machine = !outer && (sx === 7 || sx === 8) && zl >= 9 && zl <= 12;     // будка лифта на крыше
    set(G, B.CONCRETE);
    for (let rel = 1; rel <= TOP + 3; rel++) {
      const y = G + rel, f = Math.floor(rel / 3), k = rel % 3;
      let b = B.AIR;
      if (rel === TOP) b = B.CONCRETE;
      else if (rel > TOP) {
        if (machine) b = rel === TOP + 3 ? B.CONCRETE_WHITE : B.CONCRETE;
        else if (rel === TOP + 1) b = outer ? B.CONCRETE_WHITE : (winter ? B.SNOW : B.AIR);
      } else if (outer) {
        if (k === 0) b = B.CONCRETE_WHITE;                                     // межэтажный пояс
        else {
          const win = endWall ? (zl === 11 || zl === 16) : ((sx >= 2 && sx <= 4) || (sx >= 11 && sx <= 13));
          const stairWin = !endWall && (sx === 7 || sx === 8) && k === 2;
          b = win || stairWin ? B.GLASS : panel;
          if (!endWall && zl === 19 && f === 0 && (sx === 7 || sx === 8)) b = doorAt(k, mz(0));   // дверь подъезда
        }
      } else {
        const st = this.leninStair(sx, zl, rel, NF);
        if (k === 0) {
          b = B.CONCRETE;                                                      // пол
          if ((sx === 3 || sx === 12) && (zl === 10 || zl === 16)) b = B.LAMP;  // люстра у соседей снизу
          if (st === 'hole') b = B.AIR;
          if (st === 'step') b = B.STONE_BRICKS;
        } else {
          if (sx === 0 || sx === 6 || sx === 9) b = (sx === 6 || sx === 9) && zl === 16 ? doorAt(k, sx === 6 ? 1 : 3) : B.CONCRETE_WHITE;
          else if (zl === 13 && sx !== 7 && sx !== 8) b = sx === 3 || sx === 12 ? doorAt(k, mz(0)) : B.CONCRETE_WHITE;
          if (st === 'step') b = B.STONE_BRICKS;
          if (b === B.AIR && sx !== 7 && sx !== 8) b = this.leninFurniture(sx, zl, f, sec, mz, k);
        }
      }
      set(y, b);
    }
  }

  // Лестница: чётные пролёты в колонке 7 идут к улице, нечётные в колонке 8 — обратно
  leninStair(sx, zl, rel, NF) {
    if (sx !== 7 && sx !== 8) return null;
    for (const g of [Math.floor(rel / 3), Math.floor(rel / 3) - 1]) {
      if (g < 0 || g > (NF || 9) - 2) continue;
      const h = rel - 3 * g;
      if (g % 2 === 0 && sx === 7) {
        const i = zl - 12;
        if (i >= 0 && i <= 2 && h === 1 + i) return 'step';
        if (h === 3 && zl >= 11 && zl <= 13) return 'hole';
      }
      if (g % 2 === 1 && sx === 8) {
        const i = 14 - zl;
        if (i >= 0 && i <= 2 && h === 1 + i) return 'step';
        if (h === 3 && zl >= 13 && zl <= 15) return 'hole';
      }
    }
    return null;
  }

  // Квартира: гостиная у окна на улицу, за стенкой — спальня с рабочим столом и кухней
  leninFurniture(sx, zl, f, sec, mz, k) {
    const left = sx <= 5;
    const ax = left ? sx : 15 - sx;                       // правая квартира — зеркальная
    const F = d => mz(left ? d : [0, 3, 2, 1][d]);
    if (k === 2) return ax === 3 && zl === 18 ? B.MIRROR + F(2) : B.AIR;      // зеркало над раковиной
    const v = Noise.hash3(f, sec, left ? 1 : 2, this.seed + 9);   // у соседей немного по-разному
    const map = {
      '1,10': B.SOFA + F(1), '1,11': B.SOFA + F(1), '5,10': B.TV + F(3),
      '2,10': B.CARPET, '3,10': B.CARPET, '4,10': B.CARPET, '2,11': B.CARPET, '3,11': B.CARPET, '4,11': B.CARPET,
      '1,9': B.FLOOR_LAMP, '5,12': B.FRIDGE + F(3), '5,9': v < 0.5 ? B.BOOKSHELF : B.FLOWER_POT,
      '1,14': B.WARDROBE + F(1), '1,16': B.BED + F(v < 0.5 ? 0 : 2),
      '4,15': B.TABLE, '3,15': B.CHAIR + F(1), '5,14': v < 0.7 ? B.COMPUTER + F(3) : B.BOOKSHELF,
      // уголок ванной: ванна, унитаз, раковина с зеркалом, стиральная машина
      '1,18': B.BATHTUB + F(2), '2,18': B.TOILET + F(2), '3,18': B.SINK + F(2), '5,18': B.WASHER + F(2),
    };
    return map[ax + ',' + zl] || B.AIR;
  }

  // Детская площадка: песочница, горка, качели, карусель, скамейки (зимой — снеговик)
  leninPlayground(px, pz, set, winter, mz) {
    const G = FLAT_G;
    set(G, winter ? B.SNOW : B.CONCRETE_GREEN);
    if (px === 0 || px === 22 || pz === 0 || pz === 14) { if (!(pz === 0 && px >= 10 && px <= 12)) set(G + 1, B.PLANKS); return; }
    if (px >= 2 && px <= 6 && pz >= 2 && pz <= 6) {
      if (px === 2 || px === 6 || pz === 2 || pz === 6) set(G + 1, B.PLANKS);
      else set(G, winter ? B.SNOW : B.SAND);
      return;
    }
    if (px === 14 && pz === 3) for (let y = G + 1; y <= G + 3; y++) set(y, B.IRON_BLOCK);          // лесенка
    if ((px === 14 || px === 15) && (pz === 3 || pz === 4)) set(G + 4, B.PLANKS);                    // площадка горки
    if (px === 15 && pz >= 5 && pz <= 7) set(G + 3 - (pz - 5), B.CONCRETE_RED);                    // скат
    if ((px === 3 || px === 9) && pz === 10) for (let y = G + 1; y <= G + 4; y++) set(y, B.COAL_BLOCK);  // качели
    if (px > 3 && px < 9 && pz === 10) { set(G + 4, B.COAL_BLOCK); if (px === 5 || px === 7) set(G + 1, B.CHAIR + mz(0)); }
    const d = Math.max(Math.abs(px - 18), Math.abs(pz - 10));                                          // карусель
    if (d <= 2) {
      set(G + 1, [B.WOOL_RED, B.WOOL_YELLOW, B.WOOL_BLUE][(px + pz) % 3]);
      if (d === 0) { set(G + 2, B.IRON_BLOCK); set(G + 3, B.IRON_BLOCK); }
      if (d <= 1) set(G + 4, B.WOOL_RED);
    }
    if (px === 1 && (pz === 4 || pz === 9)) set(G + 1, B.CHAIR + 1);
    if (winter && px === 11 && pz === 8) { set(G + 1, B.SNOW); set(G + 2, B.SNOW); set(G + 3, B.SNOW); set(G + 4, B.COAL_BLOCK); }  // снеговик
  }

  // Футбольное поле, а зимой — каток с хоккейными воротами
  leninField(px, pz, set, winter) {
    const G = FLAT_G;
    const edge = px === 0 || px === 22 || pz === 0 || pz === 6;
    set(G, winter ? B.ICE : (px === 11 || edge ? B.CONCRETE_WHITE : B.CONCRETE_GREEN));
    if (edge) { if (winter) set(G + 1, B.PLANKS); return; }
    if ((px === 1 || px === 21) && pz >= 2 && pz <= 4) { if (pz !== 3) set(G + 1, B.IRON_BLOCK); set(G + 2, B.IRON_BLOCK); }
  }

  // Парковка с разметкой мест (машины появляются отдельно)
  leninParking(px, pz, set, winter) {
    const G = FLAT_G;
    set(G, B.CONCRETE_BLACK);
    if ((pz <= 5 || pz >= 14) && px % 4 === 0) set(G, B.CONCRETE_WHITE);
    if (winter && (px === 0 || px === 27) && pz % 3 !== 0) set(G + 1, B.SNOW);       // сугробы
  }

  // Новогодняя ёлка с игрушками и золотой звездой
  leninYolka(dx, dz, set) {
    const G = FLAT_G;
    const d = Math.max(Math.abs(dx), Math.abs(dz));
    if (d === 0) { set(G + 1, B.LOG); set(G + 2, B.LOG); set(G + 13, B.GOLD_BLOCK); }
    for (let k = 0; k < 10; k++) {
      const r = Math.floor((10 - k) / 2.5);
      if (d > r || (d === r && r > 1 && Math.abs(dx) === Math.abs(dz))) continue;
      const toy = d === r && Noise.hash3(dx, k, dz, 5) < 0.3;
      set(G + 3 + k, toy ? [B.WOOL_RED, B.WOOL_YELLOW, B.WOOL_BLUE, B.LAMP][Math.floor(Noise.hash3(dz, k, dx, 6) * 4)] : B.LEAVES);
    }
    if (d === 4 && (dx + dz) % 2 === 0) set(G + 1, B.LAMP);                           // огоньки вокруг
  }

  // ---------- «Русский город» и «Русский городок Зима» ----------
  rusColumn(wx, wz, set, winter) {
    const G = FLAT_G, R = RUS;
    const GROUND = winter ? B.SNOW : B.GRASS;
    set(G, GROUND);
    const end = R.T0 + R.N * R.P;                     // 120 — дальний край города
    if (wx >= R.T0 && wx <= end + 6 && wz >= R.T0 && wz <= end + 6) { this.rusTown(wx, wz, set, winter); return; }
    for (const v of R.villages) {
      const u = v.axis === 'z' ? wz - v.z : wx - v.x, w = v.axis === 'z' ? wx - v.x : wz - v.z;
      if (Math.abs(u) <= 72 && Math.abs(w) <= 30) { this.rusVillage(u, w, set, winter, v); return; }
      // разбитая дорога от города до деревни
      const along = v.axis === 'z' ? wz : wx, across = v.axis === 'z' ? wx - v.x : wz - v.z;
      const lo = Math.min(v.axis === 'z' ? v.z : v.x, 0), hi = Math.max(v.axis === 'z' ? v.z : v.x, 0);
      if (Math.abs(across) <= 3 && along > lo + 72 * (lo < 0 ? 1 : 0) - 1 && along < hi - 72 * (hi > 0 ? 1 : 0) + 1) {
        this.rusRoad(wx, wz, set, winter, across === 0, true);
        return;
      }
      if (Math.abs(across) === 5 && ((along % 20) + 20) % 20 === 0 && along > lo && along < hi) {   // столбы вдоль дороги
        for (let y = G + 1; y <= G + 6; y++) set(y, B.LOG);
        set(G + 6, B.COAL_BLOCK);
      }
    }
    // берёзы в поле
    if (Noise.hash3(wx, 1, wz, this.seed + 41) < 0.004) this.rusBirch(0, 0, set, winter);
    else if (!winter && Noise.hash3(wx, 2, wz, this.seed + 41) < 0.01) set(G + 1, B.FLOWER_POT);
  }

  // ---------- «Дома на Москве-реке» ----------
  // полуширина острова на этом x (у западной стрелки остров сужается в точку, восточный край закруглён)
  riverHalf(x) {
    if (x < -176 || x > 160) return -1;
    if (x < -128) return Math.floor(80 * (x + 176) / 48);
    if (x > 128) return Math.floor(80 * Math.sqrt(1 - ((x - 128) / 32) ** 2));
    return 80;
  }
  riverIsBank(x, z) { return Math.abs(z) >= RIVER.BANK || x <= RIVER.WEST || x >= RIVER.EAST; }

  riverColumn(wx, wz, set) {
    const G = FLAT_G, R = RIVER;
    const h = this.riverHalf(wx), az = Math.abs(wz);
    if (az <= h) { this.riverIsland(wx, wz, h, set); return; }
    if (this.riverIsBank(wx, wz)) { this.riverBank(wx, wz, set); return; }
    // река: вода на два блока ниже набережной, дно из песка и гравия
    for (let y = G - 9; y <= G; y++) set(y, y === G - 9 ? (Noise.hash3(wx, 4, wz, this.seed) < 0.5 ? B.SAND : B.GRAVEL) : y <= G - 2 ? B.WATER : B.AIR);
    // мосты: два на север, два на юг и один на восток
    for (const l of [-40, 40]) if (wx - l >= -8 && wx - l <= 7 && az > 70) { this.riverBridge(wz, wx - l, set); return; }
    if (wx > 120 && wz >= -8 && wz <= 7) { this.riverBridge(wx, wz, set); return; }
    // пешеходный мостик из досок
    if (wx >= -1 && wx <= 1 && wz < 0) {
      set(G, B.PLANKS); set(G - 1, B.DARK_PLANKS);
      if (wx !== 0) set(G + 1, B.DARK_PLANKS);
      if (wx !== 0 && ((wz % 12) + 12) % 12 === 0) { set(G + 2, B.DARK_PLANKS); set(G + 3, B.LAMP); }
      if (((wz % 16) + 16) % 16 === 0) for (let y = G - 8; y < G - 1; y++) set(y, B.DARK_PLANKS);
    }
  }

  // Мост: дорога с тротуарами и каменными перилами, внизу — опоры
  riverBridge(u, v, set) {
    const G = FLAT_G;
    set(G - 1, B.STONE_BRICKS);
    if (((u % 16) + 16) % 16 < 2) for (let y = G - 8; y < G - 1; y++) set(y, B.STONE_BRICKS);
    if (v === -8 || v === 7) {
      set(G, B.STONE_BRICKS); set(G + 1, B.STONE_BRICKS);
      if (((u % 16) + 16) % 16 === 8) { for (let y = G + 2; y <= G + 5; y++) set(y, B.COAL_BLOCK); set(G + 6, B.LAMP); }
      return;
    }
    if (v < -6 || v > 5) { set(G, B.CONCRETE); return; }
    this.riverRoad(u, v, 99, set);
  }

  // Настоящая дорога: 4 полосы, сплошная посередине, прерывистые между полосами,
  // перед перекрёстком — стоп-линия и зебра. d — сколько блоков до перекрёстка.
  riverRoad(u, v, d, set) {
    const G = FLAT_G;
    let b = B.CONCRETE_BLACK;
    if (d >= 0 && d < 4) b = (v & 1) ? B.CONCRETE_BLACK : B.CONCRETE_WHITE;               // зебра
    else if (d === 5) b = B.CONCRETE_WHITE;                                                 // стоп-линия
    else if (v === 0) b = B.CONCRETE_WHITE;                                                 // двойная сплошная
    else if ((v === -3 || v === 3) && ((u % 6) + 6) % 6 < 3) b = B.CONCRETE_WHITE;         // прерывистая
    else if ((v === -5 || v === 2) && d > 8 && d < 99 && ((u % 37) + 37) % 37 === 18) {                // люк посреди полосы
      set(G, B.MANHOLE); for (let y = G - 3; y < G; y++) set(y, B.WATER); set(G - 4, B.STONE_BRICKS);
      return;
    }
    set(G, b);
  }

  // Тротуар: бордюр, плитка, фонари, деревья и светофоры у перекрёстков
  riverWalk(u, v, d, set, noTrees) {
    const G = FLAT_G, side = v < 0 ? -1 : 1, k = side < 0 ? -7 - v : v - 6;   // k: 0 — бордюр, 3 — дальний край
    const m = ((u % 24) + 24) % 24;
    set(G, k === 0 ? B.STONE : ((u + v) & 1) ? B.CONCRETE : B.STONE_BRICKS);
    if (d === 1 && k === 1 && side > 0) {                                    // светофор — по одному у каждого угла
      for (let y = G + 1; y <= G + 3; y++) set(y, B.COAL_BLOCK);
      set(G + 4, B.CONCRETE_GREEN); set(G + 5, B.CONCRETE_YELLOW); set(G + 6, B.CONCRETE_RED); set(G + 7, B.COAL_BLOCK);
      return;
    }
    if (d < 6) return;
    if (k === 1 && m === 6) { for (let y = G + 1; y <= G + 5; y++) set(y, B.COAL_BLOCK); set(G + 6, B.LAMP); }
    if (!noTrees && k === 3 && m === 18) { set(G, B.DIRT); for (let y = G + 1; y <= G + 3; y++) set(y, B.LOG); for (let y = G + 4; y <= G + 6; y++) set(y, B.LEAVES); }
  }

  // где клетка относительно улиц: { road, walk, u, v, d } или null
  riverStreet(wx, wz, xs, zs, xRange, zRange) {
    const band = (c, lines) => { for (const l of lines) { const v = c - l; if (v >= -10 && v <= 9) return { l, v }; } return null; };
    const sx = band(wx, xs), sz = band(wz, zs);
    const ax = sx && wz >= xRange(sx.l)[0] && wz <= xRange(sx.l)[1] ? sx : null;
    const az = sz && wx >= zRange(sz.l)[0] && wx <= zRange(sz.l)[1] ? sz : null;
    if (!ax && !az) return null;
    const isRoad = s => s.v >= -6 && s.v <= 5;
    if (ax && az) {
      if (isRoad(ax) || isRoad(az)) return { road: true, u: 0, v: 99, d: -1 };     // сам перекрёсток
      return { walk: true, u: wx + wz, v: ax.v, d: 0 };                              // угол тротуара
    }
    const s = ax || az, u = ax ? wz : wx;
    // расстояние до ближайшей поперечной улицы (от края её тротуара)
    const cross = ax ? zs : xs;
    let d = 99;
    for (const l of cross) d = Math.min(d, Math.abs(u - l) - 10);
    return isRoad(s) ? { road: true, u, v: s.v, d } : { walk: true, u, v: s.v, d };
  }

  riverIsland(wx, wz, h, set) {
    const G = FLAT_G, R = RIVER, az = Math.abs(wz);
    set(G, B.GRASS);
    // гранитная набережная с парапетом (у мостов — проезд)
    const bridgeGap = h === 80 && (Math.abs(wx + 40) <= 8 || Math.abs(wx - 40) <= 8 || (Math.abs(wx) <= 1 && wz < 0)) || (wx > 120 && wz >= -8 && wz <= 7);
    if (az > h - 3 && !bridgeGap) {
      for (let y = G - 8; y <= G; y++) set(y, B.STONE_BRICKS);
      if (az > h - 1) {
        set(G + 1, B.STONE_BRICKS);
        if (((wx % 20) + 20) % 20 === 0) { for (let y = G + 2; y <= G + 4; y++) set(y, B.COAL_BLOCK); set(G + 5, B.LAMP); }
      }
      return;
    }
    if (az > h - 3) for (let y = G - 8; y < G; y++) set(y, B.STONE_BRICKS);
    // улицы: набережные z = ±69, проспект z = 0 и поперечные улицы
    const st = this.riverStreet(wx, wz, R.XL, R.ZL,
      l => (l === -40 || l === 40 ? [-99, 99] : [-75, 75]),
      l => (l === 0 ? [-134, 999] : [-130, 130]));
    if (st) {
      if (st.road) { if (st.d < 0) set(G, B.CONCRETE_BLACK); else this.riverRoad(st.u, st.v, st.d, set); }
      else this.riverWalk(st.u, st.v, st.d, set, false);
      return;
    }
    if (wx < -130) { this.riverPark(wx, wz, set, true); return; }
    if (wx > 130) { this.riverPark(wx, wz, set, false); return; }
    // квартал: 61×50 клеток
    const xi = R.XL.findIndex((l, i) => wx >= l + 10 && wx <= l + 70 && i < 3);
    if (xi < 0) return;
    const ix = wx - (R.XL[xi] + 10), north = wz < 0;
    const iz = north ? wz - (-59) : wz - 10;
    if (iz < 0 || iz > 49) return;
    this.riverBlock(R.blocks[xi][north ? 0 : 1], ix, iz, set, xi * 2 + (north ? 0 : 1));
  }

  riverBlock(kind, ix, iz, set, seed) {
    const G = FLAT_G;
    const lenin = (floors, panel) => {                       // два дома с подъездами и квартирами, между ними двор
      if (iz <= 11) { this.leninHouse(ix, iz + 8, set, 1, false, seed, { floors, panel }); return true; }
      if (iz >= 38) { this.leninHouse(ix, 49 - iz + 8, set, -1, false, seed + 7, { floors, panel }); return true; }
      return false;
    };
    const zhk = (style, sections) => {
      const W = sections * ZHK.SW + 1, bx = ix - Math.floor((61 - W) / 2);
      if (bx < 0 || bx >= W) return false;
      if (iz <= 15) { this.zhkBuilding(seed % 3, Object.assign({ front: 'n', sections, noParking: true }, style), bx, iz, set); return true; }
      if (iz >= 34) { this.zhkBuilding((seed + 1) % 3, Object.assign({ front: 's', sections, noParking: true }, style), bx, 49 - iz, set); return true; }
      return false;
    };
    const yard = () => {                                     // двор: площадка, деревья, дорожки
      if (ix >= 4 && ix <= 26 && iz >= 18 && iz <= 32) { this.leninPlayground(ix - 4, iz - 18, set, false, f => f); return; }
      if (ix >= 34 && ix <= 58 && iz >= 18 && iz <= 32) {    // парковка во дворе
        set(G, (iz === 18 || iz === 32 || (ix % 4 === 2 && (iz < 22 || iz > 28))) ? B.CONCRETE_WHITE : B.CONCRETE_BLACK); return;
      }
      if (iz === 15 || iz === 35 || ix === 30) set(G, B.PATH);
      else if (ix % 9 === 4 && (iz === 13 || iz === 36)) this.rusBirch(0, 0, set, false);
    };
    if (kind === 'stalin') {             // большой серый дом на набережной
      if (lenin(12, B.CONCRETE)) return;
      yard();
    } else if (kind === 'yellow') {      // жёлтый сталинский дом
      if (lenin(8, B.CONCRETE_YELLOW)) return;
      yard();
    } else if (kind === 'panel') {       // панельная девятиэтажка
      if (lenin(9, B.CONCRETE_WHITE)) return;
      yard();
    } else if (kind === 'factory') {     // старая кирпичная фабрика — теперь лофты с кафе внизу
      const chim = Math.hypot(ix - 30, iz - 25);
      if (chim < 2.6) { for (let y = G + 1; y <= G + 38; y++) set(y, chim < 1.5 && y > G + 1 ? B.AIR : B.BRICK); set(G + 38, chim < 1.5 ? B.AIR : B.CONCRETE_WHITE); return; }
      if (zhk({ floors: 6, frame: B.BRICK, band: B.BRICK, glass: B.GLASS, crown: B.BRICK }, 3)) return;
      set(G, (ix + iz) % 3 ? B.STONE_BRICKS : B.COBBLE);
      if (ix % 10 === 5 && (iz === 20 || iz === 30)) this.rusBirch(0, 0, set, false);
    } else if (kind === 'glass') {       // новые стеклянные башни
      if (zhk({ floors: 16, frame: B.CONCRETE_BLACK, band: B.CONCRETE_WHITE, glass: B.GLASS_BLUE, crown: B.GLASS_BLUE }, 2)) return;
      if (ix >= 18 && ix <= 42 && iz >= 20 && iz <= 30) { set(G, B.GRASS); if ((ix + iz) % 7 === 0) set(G + 1, B.FLOWER_POT); return; }
      set(G, B.CONCRETE);
    } else if (kind === 'church') {      // храм на площади, фонтан и сквер
      const cx = ix - 30, cz = iz - 18;
      if (Math.abs(cx) <= 7 && Math.abs(cz) <= 7) { this.rusChurch(cx, cz, set, false); return; }
      set(G, (ix + iz) % 4 === 0 ? B.STONE_BRICKS : B.CONCRETE);
      const fx = ix - 30, fz = iz - 38, fd = Math.max(Math.abs(fx), Math.abs(fz));
      if (fd <= 4) {
        if (fd === 4) set(G + 1, B.MARBLE); else { set(G - 1, B.MARBLE); set(G, B.WATER); }
        if (fd === 0) { set(G + 1, B.MARBLE); set(G + 2, B.MARBLE); set(G + 3, B.WATER); }
        return;
      }
      if (fd === 6 && (Math.abs(fx) === 2 || Math.abs(fz) === 2)) set(G + 1, B.CHAIR + (Math.abs(fx) === 6 ? (fx > 0 ? 3 : 1) : (fz > 0 ? 2 : 0)));
      if ((ix < 4 || ix > 56) && iz % 8 === 2) this.rusBirch(0, 0, set, false);
    }
  }

  // Сквер на краю острова; на западе — «Стрелка» с памятником
  riverPark(wx, wz, set, west) {
    const G = FLAT_G;
    const mx = west ? -150 : 145, d = Math.hypot(wx - mx, wz);
    if (west && Math.max(Math.abs(wx - mx), Math.abs(wz)) <= 2) {            // памятник
      for (let y = G + 1; y <= G + 2; y++) set(y, B.STONE_BRICKS);
      if (Math.abs(wx - mx) <= 1 && Math.abs(wz) <= 1) for (let y = G + 3; y <= G + 12; y++) set(y, B.MARBLE);
      if (wx === mx && wz === 0) { set(G + 13, B.GOLD_BLOCK); set(G + 14, B.GOLD_BLOCK); }
      return;
    }
    if (Math.abs(d - 8) < 1.2) { set(G, B.PATH); return; }
    if (Math.abs(d - 9.5) < 0.5 && ((wx + wz) & 3) === 0) { set(G + 1, B.CHAIR + (Math.abs(wx - mx) > Math.abs(wz) ? (wx > mx ? 3 : 1) : (wz > 0 ? 2 : 0))); return; }
    if (Math.abs(wz) <= 1 && d > 9) { set(G, B.PATH); return; }
    if (Noise.hash3(wx, 6, wz, this.seed + 3) < 0.03 && d > 11) this.rusBirch(0, 0, set, false);
  }

  // Берег: гранитная набережная, дорога вдоль реки и ряд домов с квартирами
  riverBank(wx, wz, set) {
    const G = FLAT_G, R = RIVER;
    const northSouth = Math.abs(wz) >= R.BANK;
    const bd = northSouth ? Math.abs(wz) - R.BANK : wx >= R.EAST ? wx - R.EAST : R.WEST - wx;   // от края реки
    // проезд к мосту (или к пешеходному мостику) — без парапета
    const bridge = northSouth ? (Math.abs(wx + 40) <= 9 || Math.abs(wx - 40) <= 9 || (Math.abs(wx) <= 1 && wz < 0)) : wx >= R.EAST && wz >= -10 && wz <= 9;
    if (bd < 2 && !bridge) {
      const river = northSouth ? !this.riverIsBank(wx, wz - Math.sign(wz)) : true;
      for (let y = G - 8; y <= G; y++) set(y, B.STONE_BRICKS);
      if (bd === 0 && river) {
        set(G + 1, B.STONE_BRICKS);
        if ((((northSouth ? wx : wz) % 20) + 20) % 20 === 10) { for (let y = G + 2; y <= G + 4; y++) set(y, B.COAL_BLOCK); set(G + 5, B.LAMP); }
      }
      return;
    }
    if (bd < 2) for (let y = G - 8; y < G; y++) set(y, B.STONE_BRICKS);
    // набережная улица: центр в 12 блоках от реки
    const sgn = northSouth ? Math.sign(wz) : Math.sign(wx);
    const lineNS = sgn * (R.BANK + 12), lineEW = wx >= R.EAST ? R.EAST + 12 : R.WEST - 12;
    const st = northSouth
      ? this.riverStreet(wx, wz, R.ML, [lineNS], () => [-9999, 9999], () => [-9999, 9999])
      : this.riverStreet(wx, wz, [lineEW], [0], () => [-R.BANK, R.BANK], () => (wx >= R.EAST ? [R.EAST, 9999] : [1, 0]));
    if (st) {
      if (st.road) { if (st.d < 0) set(G, B.CONCRETE_BLACK); else this.riverRoad(st.u, st.v, st.d, set); }
      else this.riverWalk(st.u, st.v, st.d, set, false);
      return;
    }
    if (!northSouth) { if (Noise.hash3(wx, 6, wz, this.seed + 9) < 0.01) this.rusBirch(0, 0, set, false); return; }
    // ряд домов вдоль набережной (между проспектами)
    const xi = R.ML.findIndex(l => wx >= l + 10 && wx <= l + 70);
    const hz = bd - 22;
    if (xi >= 0 && R.ML[xi] < 200 && hz >= 0 && hz <= 11) {
      this.leninHouse(wx - (R.ML[xi] + 10), hz + 8, set, wz < 0 ? -1 : 1, false, xi + (wz < 0 ? 20 : 40), { floors: 7 + (xi % 3) * 2 });
      return;
    }
    if (hz > 14 && Noise.hash3(wx, 7, wz, this.seed + 11) < 0.02) this.rusBirch(0, 0, set, false);
  }

  // ---------- ЖК «Самоцветы» ----------
  samoColumn(wx, wz, set) {
    const G = FLAT_G, S = SAMO, I = S.IN, O = S.OUT;
    set(G, B.GRASS);
    // корпуса
    for (let i = 0; i < 3; i++) {
      const c = S.corpuses[i], a = wx - c.ox, b = wz - c.oz;
      const [cx, cz] = [[a, b], [b, -a], [-a, -b], [-b, a]][c.r];
      if (cx < 0 || cz < 0 || cx > 51 || cz > 51) continue;
      let lx, lz, turn;
      if (cx <= 31 && cz <= 19) { lx = cx; lz = cz; turn = 0; }               // первая секция
      else if (cx <= 19 && cz >= 20) { lx = 51 - cz; lz = cx; turn = 1; }     // вторая секция — под прямым углом
      else continue;
      const n = (turn + 3 * c.r) % 4;
      const rset = n === 0 ? set : (y, id) => {
        const bd = BLOCKS[id];
        if (bd && bd.base && bd.facing !== undefined && BLOCKS[bd.base + 3] && BLOCKS[bd.base + 3].base === bd.base) id = bd.base + (bd.facing + n) % 4;
        set(y, id);
      };
      this.samoSection(lx, lz, rset, c.color, i * 2 + turn);
      return;
    }
    const F = S.FOK;
    if (wx >= F.x0 && wx <= F.x1 && wz >= F.z0 && wz <= F.z1) { this.samoFok(wx - F.x0, F.z1 - wz, set); return; }
    const P = S.PARK;
    if (wx >= P.x0 && wx <= P.x1 && wz >= P.z0 && wz <= P.z1) { this.samoParking(wz - P.z0, wx - P.x0, set); return; }
    if (wx >= I.x0 && wx <= I.x1 && wz >= I.z0 && wz <= I.z1) { this.samoYard(wx, wz, set); return; }
    if (wx < O.x0 || wx > O.x1 || wz < O.z0 || wz > O.z1) return;                // за оградой — просто трава
    // первый контур: низкая ограда, объездная дорога, гостевая парковка и тротуары у магазинов
    if (wx === O.x0 || wx === O.x1 || wz === O.z0 || wz === O.z1) {
      const gate = (wz === O.z1 && Math.abs(wx - 10) <= 8) || (wx === O.x1 && Math.abs(wz - 5) <= 8);
      if (!gate) { set(G + 1, ((wx + wz) & 3) === 0 ? B.COAL_BLOCK : B.GLASS); }
      return;
    }
    const st = this.riverStreet(wx, wz, S.XS, S.ZS, () => [O.z0 + 5, O.z1 - 5], () => [O.x0 + 5, O.x1 - 5]);
    if (st) {
      if (st.road) { if (st.d < 0) set(G, B.CONCRETE_BLACK); else this.riverRoad(st.u, st.v, st.d, set); }
      else this.riverWalk(st.u, st.v, st.d, set, false);
      return;
    }
    const dIn = Math.max(I.x0 - wx, wx - I.x1, I.z0 - wz, wz - I.z1);
    if (dIn <= 3) { set(G, (wx + wz) & 1 ? B.STONE_BRICKS : B.CONCRETE); return; }      // тротуар у витрин
    const along = Math.abs(wx - (wx < I.x0 ? I.x0 : I.x1)) < Math.abs(wz - (wz < I.z0 ? I.z0 : I.z1)) ? wz : wx;
    set(G, ((along % 3) + 3) % 3 === 0 && dIn > 4 ? B.CONCRETE_WHITE : B.CONCRETE_BLACK);     // гостевая парковка
  }

  // Подъезд: 23 этажа. 1-й — магазины и вход в подъезд, 2-й — офисы, выше — по 4 квартиры на этаже.
  samoSection(lx, lz, set, col, sec) {
    const G = FLAT_G, S = SAMO, W = S.W, D = S.D, H = S.H, NF = S.NF, TOP = NF * H;
    const ch = S.PLAN[lz][lx];
    const outer = lx === 0 || lx === W - 1 || lz === 0 || lz === D - 1;
    const along = lz === 0 || lz === D - 1 ? lx : lz;
    const coreWall = lz >= 12 && lz <= 14 && lx >= 8 && lx <= 18 && ch !== 'L';
    for (let rel = 0; rel <= TOP + 3; rel++) {
      const y = G + rel, f = Math.floor(rel / H), k = rel % H;
      let b = B.AIR;
      if (rel >= TOP) {                                       // крыша, парапет, машинное отделение лифтов
        if (rel === TOP) b = B.CONCRETE;
        else if (outer) b = rel === TOP + 1 ? col : B.AIR;
        else if (lz >= 12 && lz <= 14 && lx >= 8 && lx <= 18) b = rel === TOP + 3 ? B.CONCRETE : B.CONCRETE_WHITE;
        set(y, b);
        continue;
      }
      if (outer) {
        if (k === 0) b = f < 2 ? B.CONCRETE : B.CONCRETE_WHITE;
        else if (f < 2) {                                     // витрины магазинов и вход в подъезд
          b = along % 5 === 0 ? B.CONCRETE : B.GLASS;
          if (f === 0 && lz === 0 && (lx === 8 || lx === 23)) b = k === 1 ? B.DOOR + 2 : B.DOOR_TOP + 2;
          if (f === 0 && lz === D - 1 && (lx === 26 || lx === 27)) b = k === 1 ? B.DOOR : B.DOOR_TOP;
          if (f === 0 && lz === D - 1 && lx >= 24 && lx <= 29 && b === B.GLASS) b = B.GLASS;
        } else {                                              // минимализм: окна в пол и цветные панели
          const win = along % 4 === 1 || along % 4 === 2;
          b = win ? B.GLASS : ((Math.floor(along / 4) + Math.floor(f / 3)) % 3 === 0 ? col : B.CONCRETE_WHITE);
        }
        set(y, b);
        continue;
      }
      if (k === 0) { set(y, this.samoFloor(ch, lx, lz, f, col)); continue; }
      set(y, this.samoCell(ch, lx, lz, f, k, col, sec));
    }
  }

  // пол этажа (он же потолок нижнего)
  samoFloor(ch, lx, lz, f, col) {
    if (ch === 'L' || ch === 'E') return B.ELEVATOR_WALL;
    if (ch === 'S') {                                         // проёмы над лестничными маршами
      const below = f - 1;
      if (f > 0 && below % 2 === 0 && lx === 20 && (lz === 13 || lz === 14)) return B.AIR;
      if (f > 0 && below % 2 === 1 && lx === 21 && (lz === 13 || lz === 14)) return B.AIR;
      return B.STONE_BRICKS;
    }
    if (ch === 'c' || ch === 'o') return f > 0 && lz === 9 && lx % 6 === 3 ? B.LAMP : B.MARBLE;
    if (f === 0) return ch === 'D' ? B.MARBLE : B.CONCRETE_WHITE;
    if (f === 1) return B.BIRCH_PLANKS;
    const fl = this.samoFlatAt(ch, lx, lz);
    if (fl && '~UNA'.includes(fl.c)) return B.METRO_TILE;
    return ch === 'x' || ch === 'y' ? B.CONCRETE : B.PLANKS;
  }

  // какая клетка квартиры: тип, символ плана и поворот (передние квартиры отражены — окно у них с другой стороны)
  samoFlatAt(ch, lx, lz) {
    const L = SAMO.FLATS;
    let lay, fx, fz, front;
    if (ch === 'A') { lay = L.A; fx = lx - 1; fz = 7 - lz; front = true; }
    else if (ch === 'B') { lay = L.B; fx = lx - 17; fz = 7 - lz; front = true; }
    else if (ch === 'C') { lay = L.S; fx = lx - 1; fz = lz - 12; front = false; }
    else if (ch === 'D') { lay = L.S; fx = lx - 24; fz = lz - 12; front = false; }
    else return null;
    if (fz < 0 || fz >= lay.length || fx < 0 || fx >= lay[0].length) return null;
    return { c: lay[fz][fx], fx, fz, lay, front };
  }

  samoCell(ch, lx, lz, f, k, col, sec) {
    const S = SAMO;
    // лифты: по три в подъезде (два пассажирских и грузовой), кнопка в каждой кабине на каждом этаже
    if (ch === 'L') return k === 2 && lz === 13 && (lx === 10 || lx === 13 || lx === 16) ? B.LIFT_BUTTON + 2 : B.AIR;
    if (ch === 'E' || (ch === '#' && lz >= 12 && lz <= 14 && lx >= 8 && lx <= 18 && lx !== 8)) return B.ELEVATOR_WALL;
    if (ch === 'S') {                                         // лестница: марши по очереди вверх и вниз
      if (f >= S.NF - 1) return B.AIR;
      if (f % 2 === 0 && lx === 20) return (lz === 13 && k === 1) || lz === 14 ? B.STONE_BRICKS : B.AIR;
      if (f % 2 === 1 && lx === 21) return (lz === 14 && k === 1) || lz === 13 ? B.STONE_BRICKS : B.AIR;
      return B.AIR;
    }
    if (ch === 'c') return B.AIR;
    if (ch === 'o') return f === 0 || lx !== 19 || true ? B.AIR : B.AIR;
    const lobby = f === 0;
    if (ch === '#') {
      // стены коридора: в холле 1-го этажа — цвета корпуса, выше — светлые
      if (lobby && (lz === 8 || lz === 11) ) return lz === 11 && lx >= 24 ? B.AIR : col;
      return B.CONCRETE_WHITE;
    }
    if (ch === 'a' || ch === 'b' || ch === 'p' || ch === 'q') {
      if (f === 0 && (ch === 'a' || ch === 'b')) return col;              // магазины открываются на улицу, не в подъезд
      if (f === 0 && ch === 'q') return B.AIR;                             // холл открыт
      return k === 1 ? B.DOOR + (ch === 'a' || ch === 'b' ? 2 : 0) : B.DOOR_TOP + (ch === 'a' || ch === 'b' ? 2 : 0);
    }
    if (ch === 'x' || ch === 'y') return B.AIR;
    if (f === 0) return this.samoGround(ch, lx, lz, k, col, sec);
    if (f === 1) return this.samoOffice(S.OFFICES[(sec + 'ABCD'.indexOf(ch)) % S.OFFICES.length], ch, lx, lz, k);
    // квартира
    const fl = this.samoFlatAt(ch, lx, lz);
    if (!fl) return B.AIR;
    return this.samoFurniture(fl, k);
  }

  samoFurniture(fl, k) {
    const { c, fx, fz, lay, front } = fl;
    const w = lay[0].length, d = lay.length;
    const M = f => (front ? [2, 1, 0, 3][f] : f);           // поворот из квартиры в секцию
    const wallFace = () => (fz === 0 ? 0 : fz === d - 1 ? 2 : fx === 0 ? 1 : fx === w - 1 ? 3 : 0);
    const find = ch => { for (let z = 0; z < d; z++) { const x = lay[z].indexOf(ch); if (x >= 0) return [x, z]; } return null; };
    const toward = ([x, z]) => (Math.abs(x - fx) >= Math.abs(z - fz) ? (x > fx ? 1 : 3) : (z > fz ? 0 : 2));
    if (c === '#') return B.CONCRETE_WHITE;
    if (c === 'd') {
      const horiz = (lay[fz][fx - 1] === '#') || (lay[fz][fx + 1] === '#');
      return (k === 1 ? B.DOOR : B.DOOR_TOP) + M(horiz ? 0 : 1);
    }
    if (k === 2) {
      if (c === 'N') return B.MIRROR + M(wallFace());
      return B.AIR;
    }
    switch (c) {
      case 'U': return B.TOILET + M(wallFace());
      case 'N': return B.SINK + M(wallFace());
      case 'A': return B.BATHTUB + M(wallFace());
      case 'K': return B.KITCHEN + M(wallFace());
      case 'O': return B.STOVE + M(wallFace());
      case 'F': return B.FRIDGE + M(wallFace());
      case 'W': return B.WARDROBE + M(wallFace());
      case 'B': return B.BED + M(wallFace());
      case 't': return B.TABLE;
      case 'c': { const t = find('t'); return B.CHAIR + M(t ? toward(t) : 0); }
      case 'S': { const t = find('T'); return B.SOFA + M(t ? toward(t) : 0); }
      case 'T': { const s = find('S'); return B.TV + M(s ? toward(s) : 0); }
      case 'R': return B.CARPET;
      case 'L': return B.FLOOR_LAMP;
      case 'P': return B.FLOWER_POT;
      default: return B.AIR;
    }
  }

  // 1-й этаж: магазины (вход с улицы), колясочная и холл подъезда цвета корпуса
  samoGround(ch, lx, lz, k, col, sec) {
    const S = SAMO;
    if (ch === 'D') {                                         // холл: стойка консьержа, цветы, яркие стены
      if (k === 1 && lx === 29 && lz === 14) return B.TABLE;
      if (k === 1 && lx === 30 && lz === 14) return B.CHAIR + 3;
      if (k === 1 && lx === 29 && lz === 13) return B.COMPUTER + 3;
      if (k === 1 && (lx === 24 || lx === 30) && lz === 17) return B.FLOWER_POT;
      if (lx === 30 && k === 2 && lz >= 12 && lz <= 18 && lz !== 14) return col;
      return B.AIR;
    }
    if (ch === 'C') {                                         // колясочная: коляски и велосипеды
      if (k === 1 && lz >= 15 && lx % 2 === 1) return [B.WOOL_BLUE, B.WOOL_PINK, B.COAL_BLOCK][(lx + lz) % 3];
      return B.AIR;
    }
    const kind = ch === 'A' ? S.SHOPS[sec % S.SHOPS.length] : S.SHOPS[(sec + 3) % S.SHOPS.length];
    return this.samoShop(kind, ch === 'A' ? lx - 1 : lx - 17, 7 - lz, ch === 'A' ? 15 : 14, k);
  }

  // магазин или кафе: x — вдоль витрины, z — от стены коридора (0) к витрине (6)
  samoShop(kind, x, z, w, k) {
    if (k !== 1) return B.AIR;
    const door = (w === 15 ? 7 : 6);
    if (Math.abs(x - door) <= 1) return B.AIR;               // проход от двери
    if (kind === 'Кафе') {
      if (z === 0 && x < 5) return x === 2 ? B.STOVE : B.KITCHEN;
      if (z === 1 && x < 5) return B.TABLE;                   // стойка
      if (z >= 3 && z <= 5 && x % 3 === 1) return z === 4 ? B.TABLE : B.CHAIR + (z === 3 ? 0 : 2);
      return B.AIR;
    }
    if (kind === 'Банк') {
      if (z === 1 && x >= 2 && x < door - 2) return B.TABLE;
      if (z === 0 && x >= 2 && x < door - 2) return x % 2 ? B.COMPUTER : B.CHAIR;
      if (z === 5 && x > door + 2) return x % 2 ? B.IRON_BLOCK : B.AIR;          // банкоматы
      return B.AIR;
    }
    if (kind === 'Почта') {
      if (z === 1 && x < door - 1) return B.TABLE;
      if (z === 0 && x < door - 1) return B.CHEST;
      if (z <= 1 && x > door + 1) return B.CHEST;
      return B.AIR;
    }
    // продукты и аптека: стеллажи рядами, холодильники у стены, касса у входа
    if (z === 0) return kind === 'Продукты' ? B.FRIDGE : B.BOOKSHELF;
    if ((z === 2 || z === 4) && x !== 0 && x !== w - 1) return B.BOOKSHELF;
    if (z === 6 && x === door + 2) return B.COMPUTER + 2;
    return B.AIR;
  }

  // 2-й этаж: офисы и кабинеты
  samoOffice(kind, ch, lx, lz, k) {
    if (k !== 1) return B.AIR;
    const fl = { A: [lx - 1, 7 - lz], B: [lx - 17, 7 - lz], C: [lx - 1, lz - 12], D: [lx - 24, lz - 12] }[ch];
    if (!fl) return B.AIR;
    const [x, z] = fl;
    if (z <= 1) return B.AIR;                                 // проход у двери
    const m = x % 5;
    if (kind === 'Детская поликлиника' || kind === 'Женская консультация' || kind === 'Реабилитационный центр') {
      if (z === 6 && m === 1) return B.BED + 1;
      if (z === 4 && m === 3) return B.TABLE;
      if (z === 5 && m === 3) return B.COMPUTER;
      if (z === 3 && m === 3) return B.CHAIR + 0;
      if (z === 6 && m === 4) return kind === 'Реабилитационный центр' ? B.IRON_BLOCK : B.SINK + 2;
      return B.AIR;
    }
    if (kind === 'Развивающий центр') {
      if (z >= 4 && m >= 1 && m <= 3) return z === 5 ? B.TABLE : B.CHAIR + (z === 4 ? 0 : 2);
      if (z === 3) return B.CARPET;
      return B.AIR;
    }
    if (z === 6) return B.BOOKSHELF;                          // нотариус, банк — шкафы, столы, компьютеры
    if (z === 4 && m === 2) return B.TABLE;
    if (z === 5 && m === 2) return B.COMPUTER + 2;
    if (z === 3 && m === 2) return B.CHAIR;
    return B.AIR;
  }

  // ФОК «С.С.С.Р.»: внизу три бассейна, наверху тренажёрный зал, сауна и соляная комната
  samoFok(fx, fz, set) {
    const G = FLAT_G, W = 55, D = 30, H0 = 5, TOP = 9;
    const outer = fx === 0 || fx === W - 1 || fz === 0 || fz === D - 1;
    const pool = (fx >= 3 && fx <= 30 && fz >= 9 && fz <= 26) ? 3 : (fx >= 34 && fx <= 51 && fz >= 9 && fz <= 19) ? 2 : (fx >= 34 && fx <= 46 && fz >= 22 && fz <= 27) ? 1 : 0;
    const stairs = fz >= 2 && fz <= 3 && fx >= 40 && fx <= 44;
    set(G, B.METRO_TILE);
    if (pool && !outer) {
      const rim = (pool === 3 && (fx === 3 || fx === 30 || fz === 9 || fz === 26)) || (pool === 2 && (fx === 34 || fx === 51 || fz === 9 || fz === 19)) || (pool === 1 && (fx === 34 || fx === 46 || fz === 22 || fz === 27));
      if (!rim) {
        for (let y = G - pool + 1; y <= G; y++) set(y, B.WATER);
        set(G - pool, pool === 3 && fz % 3 === 0 ? B.CONCRETE_BLUE : B.METRO_TILE);    // дорожки на дне большого бассейна
      }
    }
    for (let rel = 1; rel <= TOP + 1; rel++) {
      const y = G + rel;
      let b = B.AIR;
      if (rel === TOP) b = B.CONCRETE;
      else if (rel === TOP + 1) b = outer ? B.CONCRETE_RED : B.AIR;
      else if (outer) {
        b = rel === H0 ? B.CONCRETE_RED : fx % 6 === 0 || fz % 6 === 0 && (fx === 0 || fx === W - 1) ? B.CONCRETE_WHITE : B.GLASS;
        if (fz === 0 && (fx === 27 || fx === 28) && rel <= 2) b = rel === 1 ? B.DOOR + 2 : B.DOOR_TOP + 2;
      } else if (rel === H0) {                                 // перекрытие второго этажа
        b = stairs ? B.AIR : (fx % 7 === 3 && fz % 7 === 3 ? B.LAMP : B.BIRCH_PLANKS);
      } else if (rel < H0) {
        if (stairs) b = rel <= fx - 40 + 1 ? B.STONE_BRICKS : B.AIR;
        else if (fz === 3 && fx >= 24 && fx <= 31) b = rel === 1 ? (fx === 27 || fx === 28 ? B.AIR : B.TABLE) : B.AIR;   // ресепшн
        else if (fz === 2 && fx === 30 && rel === 1) b = B.COMPUTER + 2;
        else if (!pool && rel === 1 && (fz === 7 || fz === 28) && fx % 4 === 1 && fx > 2) b = B.CHAIR + (fz === 7 ? 0 : 2);
      } else {                                               // второй этаж
        const k = rel - H0;
        const sauna = fx >= 33 && fx <= 40 && fz >= 14 && fz <= 22, salt = fx >= 43 && fx <= 52 && fz >= 14 && fz <= 22;
        if (fz === 4 && fx >= 39 && fx <= 45 && k === 1) b = B.GLASS;                 // перила у лестницы
        else if (sauna) {
          const e = fx === 33 || fx === 40 || fz === 14 || fz === 22;
          b = e ? (fz === 14 && fx === 36 && k <= 2 ? (k === 1 ? B.DOOR : B.DOOR_TOP) : B.DARK_PLANKS) : (k === 1 && fx === 37 && fz === 18 ? B.STOVE : k === 1 && fz === 21 ? B.PLANKS : B.AIR);
        } else if (salt) {
          const e = fx === 43 || fx === 52 || fz === 14 || fz === 22;
          b = e ? (fz === 14 && fx === 47 && k <= 2 ? (k === 1 ? B.DOOR : B.DOOR_TOP) : B.SANDSTONE) : (k === 1 && fz === 20 && fx % 2 === 0 ? B.CHAIR + 2 : B.AIR);
        } else if (fx <= 30 && fz >= 8 && k === 1) {                                  // тренажёрный зал
          if (fz % 4 === 0 && fx % 3 === 1) b = fx % 2 ? B.IRON_BLOCK : B.COAL_BLOCK;
          else if (fz === 26 && fx % 2 === 0) b = B.CONCRETE_BLACK;                    // беговые дорожки
        }
      }
      set(y, b);
    }
  }

  // Двор без машин: площадки, огороженное сеткой спортполе, газоны, ели, клумбы, дорожки, фонари
  samoYard(wx, wz, set) {
    const G = FLAT_G, I = SAMO.IN, ax = Math.abs(wx), az = Math.abs(wz);
    const edge = wx === I.x0 || wx === I.x1 || wz === I.z0 || wz === I.z1;
    if (edge) {                                               // второй контур: ограда, КПП со шлагбаумом
      const gate = wz === I.z1 && ax <= 3;
      if (gate) { set(G, B.STONE_BRICKS); return; }
      set(G, B.STONE);
      const post = ((wx + wz) & 3) === 0;
      set(G + 1, post ? B.COAL_BLOCK : B.GLASS); set(G + 2, post ? B.COAL_BLOCK : B.GLASS);
      if (post && ((wx + wz) & 15) === 0) set(G + 3, B.LAMP);
      return;
    }
    if (wz === I.z1 - 1 && (wx === -4 || wx === 4)) { for (let y = G + 1; y <= G + 4; y++) set(y, y & 1 ? B.CONCRETE_RED : B.CONCRETE_WHITE); return; }
    if (wx >= 6 && wx <= 9 && wz >= 74 && wz <= 78) {                             // будка охраны (КПП)
      const e = wx === 6 || wx === 9 || wz === 74 || wz === 78;
      set(G, B.CONCRETE);
      for (let y = G + 1; y <= G + 2; y++) set(y, e ? (wx === 6 && wz === 76 ? (y === G + 1 ? B.DOOR + 3 : B.DOOR_TOP + 3) : B.GLASS) : (y === G + 1 && wz === 76 && wx === 8 ? B.COMPUTER + 3 : B.AIR));
      set(G + 3, B.CONCRETE_WHITE);
      return;
    }
    // плитка у подъездов (со стороны двора)
    const nearHouse = (x0, x1, z0, z1) => wx >= x0 && wx <= x1 && wz >= z0 && wz <= z1;
    if (nearHouse(-94, -64, -60, -58) || nearHouse(-75, -73, -58, -28) || nearHouse(44, 75, -60, -58) || nearHouse(73, 75, -58, -48)
      || nearHouse(-75, -73, 48, 79) || nearHouse(-73, -43, 58, 60)) { set(G, (wx + wz) & 1 ? B.STONE_BRICKS : B.CONCRETE); return; }
    // спортивное поле, огороженное сеткой со всех сторон и сверху
    if (wx >= 8 && wx <= 38 && wz >= 12 && wz <= 40) {
      const e = wx === 8 || wx === 38 || wz === 12 || wz === 40;
      set(G, e ? B.CONCRETE : (wx === 23 || wz === 26 || wx === 10 || wx === 36 || wz === 14 || wz === 38) ? B.CONCRETE_WHITE : B.CONCRETE_GREEN);
      if (e && !(wx === 8 && wz >= 25 && wz <= 27)) for (let y = G + 1; y <= G + 4; y++) set(y, B.GLASS);
      set(G + 5, B.GLASS);
      if (!e && (wz === 13 || wz === 39) && wx >= 21 && wx <= 25) { set(G + 1, wx === 21 || wx === 25 ? B.WOOL_WHITE : B.AIR); set(G + 2, B.WOOL_WHITE); }
      return;
    }
    // детские площадки во дворах корпусов
    if (wx >= -70 && wx <= -48 && wz >= -52 && wz <= -38) { this.leninPlayground(wx + 70, wz + 52, set, false, f => f); return; }
    if (wx >= 48 && wx <= 70 && wz >= -52 && wz <= -38) { this.leninPlayground(wx - 48, wz + 52, set, false, f => f); return; }
    if (wx >= -70 && wx <= -48 && wz >= 38 && wz <= 52) { this.leninPlayground(wx + 70, wz - 38, set, false, f => f); return; }
    // воркаут: турники на красном покрытии
    if (wx >= -40 && wx <= -20 && wz >= 14 && wz <= 32) {
      set(G, B.CONCRETE_RED);
      if ((wx === -36 || wx === -24) && wz % 6 === 2) { for (let y = G + 1; y <= G + 3; y++) set(y, B.COAL_BLOCK); }
      if (wx > -36 && wx < -24 && wz % 6 === 2) set(G + 3, B.COAL_BLOCK);
      return;
    }
    // бульвар крестом и клумба в центре
    const cd = Math.hypot(wx, wz);
    if (cd <= 7) {
      set(G, cd <= 4 ? B.DIRT : B.STONE_BRICKS);
      if (cd <= 4) set(G + 1, cd <= 1.5 ? B.FLOWER_POT : [B.WOOL_RED, B.WOOL_YELLOW, B.WOOL_PINK, B.WOOL_PURPLE][(Math.round(Math.atan2(wz, wx) * 3) + 8) % 4]);
      if (cd > 6 && ((wx + wz) & 3) === 0) set(G + 1, B.CHAIR + (ax > az ? (wx > 0 ? 3 : 1) : (wz > 0 ? 2 : 0)));
      return;
    }
    if (az <= 2 || ax <= 2) {
      set(G, (wx + wz) & 1 ? B.STONE_BRICKS : B.CONCRETE);
      if ((az === 2 || ax === 2) && ((wx + wz) % 12 === 0)) { for (let y = G + 1; y <= G + 4; y++) set(y, B.COAL_BLOCK); set(G + 5, B.LAMP); }
      return;
    }
    if (az === 3 || ax === 3) { set(G + 1, B.LEAVES); return; }                         // кусты вдоль бульвара
    // газон, ели и клумбы
    const r = Noise.hash3(wx, 8, wz, this.seed + 17);
    if (r < 0.004) this.samoFir(set);
    else if (r < 0.015) set(G + 1, B.FLOWER_POT);
  }
  samoFir(set) {
    const G = FLAT_G;
    set(G + 1, B.LOG);
    for (let y = G + 2; y <= G + 7; y++) set(y, B.LEAVES);
    set(G + 8, B.LEAVES);
  }

  // Многоуровневый паркинг: 6 уровней, между ними пандусы-ступеньки (машина заезжает сама)
  samoParking(px, pz, set) {
    const G = FLAT_G, W = 61, D = 25, L = 6;
    const edge = px === 0 || px === W - 1 || pz === 0 || pz === D - 1;
    set(G, B.CONCRETE);
    for (let f = 0; f < L; f++) {
      const base = G + 3 * f;
      const rampX = 4 + 6 * f, onRamp = pz >= 1 && pz <= 4 && px >= rampX && px <= rampX + 1;
      const hole = f > 0 && pz >= 1 && pz <= 4 && px >= rampX - 6 && px <= rampX - 5;     // проём над пандусом снизу
      const lines = !edge && pz >= 8 && (pz - 8) % 3 === 0 && px % 6 !== 0;
      if (f > 0) set(base, hole ? B.AIR : lines ? B.CONCRETE_WHITE : B.CONCRETE);
      else if (lines) set(base, B.CONCRETE_WHITE);
      for (let k = 1; k <= 2; k++) {
        let b = B.AIR;
        if (f < L - 1 && onRamp) b = k <= px - rampX + 1 ? B.CONCRETE : B.AIR;   // две ступеньки вверх
        else if (px % 6 === 0 && pz % 8 === 0) b = B.CONCRETE_WHITE;              // колонны
        else if (edge && f > 0 && k === 1) b = B.CONCRETE_YELLOW;                // бортик
        set(base + k, b);
      }
    }
    // на крыше — цветы в кадках по краю
    if (edge && (px + pz) % 4 === 0) set(G + 3 * L - 2, B.FLOWER_POT);
  }

  // Дорога с ямами, лужами, заплатками и стёртой разметкой
  rusRoad(wx, wz, set, winter, center, country) {
    const G = FLAT_G;
    set(G, B.CONCRETE_BLACK);
    const n = this.perlin.noise3(wx * 0.31, 7.7, wz * 0.31);
    const r = Noise.hash3(wx, 9, wz, this.seed + 55);
    if (n > (country ? 0.34 : 0.4)) {                // яма, а в глубокой — лужа
      set(G, B.AIR);
      set(G - 1, n > 0.5 ? (winter ? B.ICE : B.WATER) : B.GRAVEL);
      return;
    }
    if (!center && !country && r > 0.996) {          // канализационный люк, под ним колодец с водой
      set(G, B.MANHOLE + Math.floor(r * 4000) % 4);
      for (let y = G - 3; y < G; y++) set(y, B.WATER);
      set(G - 4, B.STONE_BRICKS);
      return;
    }
    if (r < 0.08) set(G, B.CONCRETE);                // заплатка
    else if (r < 0.13) set(G, B.GRAVEL);             // крошка асфальта
    else if (center && ((wx + wz) % 6 + 6) % 6 < 3 && r > 0.45) set(G, B.CONCRETE_WHITE);   // стёртая разметка
    if (winter && r > 0.88) set(G + 1, B.SNOW);       // снежная каша
  }

  rusBirch(dx, dz, set, winter) {
    const G = FLAT_G, d = Math.max(Math.abs(dx), Math.abs(dz));
    if (d === 0) { for (let y = G + 1; y <= G + 5; y++) set(y, y % 2 ? B.WOOL_WHITE : B.CONCRETE_WHITE); set(G + 6, B.LEAVES); set(G + 7, B.LEAVES); if (winter) set(G + 8, B.SNOW); }
    else if (d === 1) { for (let y = G + 4; y <= G + 7; y++) set(y, B.LEAVES); if (winter) set(G + 8, B.SNOW); }
  }

  // Город: кварталы 80×80 с дорогами и тротуарами
  rusTown(wx, wz, set, winter) {
    const G = FLAT_G, R = RUS;
    const ux = wx - R.T0, uz = wz - R.T0;
    const lx = ux % R.P, lz = uz % R.P, bx = Math.floor(ux / R.P), bz = Math.floor(uz / R.P);
    const edge = bx >= R.N || bz >= R.N;
    if (lx <= 6 || lz <= 6 || edge) { this.rusRoad(wx, wz, set, winter, lx === 3 || lz === 3, false); return; }
    if (lx <= 8 || lz <= 8 || lx >= 78 || lz >= 78) {                         // старый тротуар
      const r = Noise.hash3(wx, 3, wz, this.seed + 13);
      set(G, r < 0.07 ? B.GRAVEL : r < 0.11 ? (winter ? B.SNOW : B.GRASS) : B.CONCRETE);
      if ((lx === 8 || lz === 8) && (lx + lz) % 16 === 4) { for (let y = G + 1; y <= G + 4; y++) set(y, B.COAL_BLOCK); set(G + 5, B.LAMP); }
      return;
    }
    const ix = lx - 9, iz = lz - 9;            // 0..68 внутри квартала
    const kind = R.blocks[bx][bz];
    if (kind.startsWith('khrush')) this.rusKhrushBlock(ix, iz, set, winter, kind, bx * 7 + bz);
    else if (kind === 'new') this.rusNewBlock(ix, iz, set, winter, bx * 7 + bz);
    else if (kind === 'square') this.rusSquare(ix, iz, set, winter);
    else if (kind === 'park') this.rusPark(ix, iz, set, winter);
    else this.rusMarket(ix, iz, set, winter);
  }

  // Хрущёвки: два пятиэтажных дома, между ними двор с площадкой, лавочками и машинами
  rusKhrushBlock(ix, iz, set, winter, kind, seed) {
    const G = FLAT_G;
    const panel = kind === 'khrushPanel' ? B.CONCRETE : B.BRICK;
    const house = (zl, side) => { if (ix >= 4 && ix <= 64) this.leninHouse(ix - 4, zl, set, side, winter, seed, { floors: 5, panel }); };
    if (iz >= 4 && iz <= 15) { if (ix >= 4 && ix <= 64) { house(iz + 4, 1); return; } }
    if (iz >= 53 && iz <= 64) { if (ix >= 4 && ix <= 64) { house(72 - iz, -1); return; } }
    // у подъездов: козырьки, балконы (часть застеклена досками) и лавочки
    const porch = (zl, side) => {
      const bx2 = ix - 4, sec = Math.min(3, Math.floor(bx2 / 15)), sx = bx2 - sec * 15;
      set(G, B.CONCRETE);
      if (zl === 20) {
        if (sx >= 6 && sx <= 9) { set(G + 3, sx === 7 || sx === 8 ? B.LAMP : B.CONCRETE); if (winter) set(G + 4, B.SNOW); }
        if ((sx >= 2 && sx <= 4) || (sx >= 11 && sx <= 13)) for (let f = 1; f < 5; f++) {
          const glazed = Noise.hash3(f, sec * 2 + (sx > 9 ? 1 : 0), side + seed, this.seed) < 0.4;
          set(G + 3 * f, B.CONCRETE); set(G + 3 * f + 1, glazed ? B.PLANKS : B.IRON_BLOCK);
          if (glazed) set(G + 3 * f + 2, B.GLASS);
        }
      } else if (sx === 5 || sx === 10) set(G + 1, B.CHAIR + (side > 0 ? 0 : 2));
    };
    if ((iz === 16 || iz === 17) && ix >= 4 && ix <= 64) { porch(iz === 16 ? 20 : 21, 1); return; }
    if ((iz === 51 || iz === 52) && ix >= 4 && ix <= 64) { porch(iz === 52 ? 20 : 21, -1); return; }
    if (iz === 18 || iz === 50) { set(G, B.PATH); return; }
    // двор
    if (ix >= 4 && ix <= 26 && iz >= 22 && iz <= 36) { this.leninPlayground(ix - 4, iz - 22, set, winter, f => f); return; }
    if (ix >= 34 && ix <= 64 && iz >= 22 && iz <= 36) {                                // стихийная парковка
      set(G, (ix + iz) % 9 === 0 ? B.GRAVEL : B.CONCRETE_BLACK);
      return;
    }
    if (ix === 30 && iz % 4 === 0 && iz > 20 && iz < 48) { set(G + 1, B.CONCRETE_GREEN); set(G + 2, B.CONCRETE_GREEN); return; }   // мусорные баки
    if (kind === 'khrushGarage' && iz >= 40 && iz <= 46 && ix >= 4 && ix <= 64) { this.rusGarage(ix - 4, iz - 40, set, winter); return; }
    if (ix % 12 === 2 && iz === 44) this.rusBirch(0, 0, set, winter);
    else if (Math.abs(ix % 12 - 2) <= 1 && Math.abs(iz - 44) <= 1) this.rusBirch(ix % 12 - 2, iz - 44, set, winter);
  }

  // Гаражи-ракушки в ряд
  rusGarage(gx, gz, set, winter) {
    const G = FLAT_G, k = gx % 5;
    set(G, B.CONCRETE);
    if (gz === 0) return;                                      // проезд
    const wall = k === 0 || gz === 6;
    for (let y = G + 1; y <= G + 2; y++) set(y, wall ? B.IRON_BLOCK : (gz === 1 ? [B.CONCRETE_GREEN, B.CONCRETE_BLUE, B.IRON_BLOCK, B.CONCRETE_RED][Math.floor(gx / 5) % 4] : B.AIR));
    set(G + 3, winter ? B.SNOW : B.IRON_BLOCK);
  }

  // Новостройки: две высокие башни с магазинами внизу и лифтами
  rusNewBlock(ix, iz, set, winter, seed) {
    const G = FLAT_G;
    const style = { sections: 2, floors: 16, frame: B.CONCRETE_WHITE, band: seed % 2 ? B.CONCRETE_RED : B.WOOL_ORANGE,
      glass: B.GLASS_BLUE, crown: B.CONCRETE_RED, noParking: true, winter };
    if (ix >= 2 && ix <= 40 && iz >= 2 && iz <= 17) { this.zhkBuilding(seed % 3, Object.assign({ front: 'n' }, style), ix - 2, iz - 2, set); return; }
    if (ix >= 28 && ix <= 66 && iz >= 51 && iz <= 66) { this.zhkBuilding((seed + 1) % 3, Object.assign({ front: 's' }, style), ix - 28, 66 - iz, set); return; }
    if (ix >= 6 && ix <= 28 && iz >= 26 && iz <= 40) { this.leninPlayground(ix - 6, iz - 26, set, winter, f => f); return; }
    if (ix >= 36 && ix <= 64 && iz >= 24 && iz <= 44) { set(G, (iz - 24) % 10 < 5 && ix % 4 === 0 ? B.CONCRETE_WHITE : B.CONCRETE_BLACK); return; }
    if (iz === 20 || iz === 48) set(G, B.STONE_BRICKS);
  }

  // Центральная площадь: храм с золотыми куполами, фонтан (зимой — ёлка), лавочки
  rusSquare(ix, iz, set, winter) {
    const G = FLAT_G;
    set(G, (ix + iz) % 4 === 0 ? B.STONE_BRICKS : B.CONCRETE);
    const cx = ix - 34, cz = iz - 14;
    if (Math.abs(cx) <= 7 && Math.abs(cz) <= 7) { this.rusChurch(cx, cz, set, winter); return; }
    const fx = ix - 34, fz = iz - 46, fd = Math.max(Math.abs(fx), Math.abs(fz));
    if (fd <= 4) {
      if (winter) { set(G, B.SNOW); this.leninYolka(fx, fz, set); }
      else { if (fd === 4) set(G + 1, B.MARBLE); else { set(G - 1, B.MARBLE); set(G, B.WATER); } if (fd === 0) { set(G + 1, B.MARBLE); set(G + 2, B.MARBLE); set(G + 3, B.WATER); } }
      return;
    }
    if (fd === 6 && (Math.abs(fx) === 2 || Math.abs(fz) === 2)) set(G + 1, B.CHAIR + (Math.abs(fx) === 6 ? (fx > 0 ? 3 : 1) : (fz > 0 ? 2 : 0)));
    if ((ix === 4 || ix === 64) && iz % 8 === 4) { for (let y = G + 1; y <= G + 4; y++) set(y, B.COAL_BLOCK); set(G + 5, B.LAMP); }
    if ((ix === 10 || ix === 58) && iz % 10 === 5) this.rusBirch(0, 0, set, winter);
    if (!winter && (ix === 20 || ix === 48) && iz % 3 === 0 && iz > 28) set(G + 1, B.FLOWER_POT);
  }

  // Храм: белые стены, высокий барабан и золотые купола-луковки с крестами
  rusChurch(cx, cz, set, winter) {
    const G = FLAT_G, d = Math.max(Math.abs(cx), Math.abs(cz));
    if (d <= 6) {
      const wall = d === 6;
      for (let y = 1; y <= 10; y++) {
        let b = B.AIR;
        if (wall) b = (y >= 3 && y <= 6 && (cx + cz) % 3 === 0) ? B.GLASS : B.CONCRETE_WHITE;
        if (cz === 6 && Math.abs(cx) <= 1 && y <= 3) b = y === 3 ? B.GOLD_BLOCK : doorAt(y, 0);   // вход
        if (y === 10) b = B.CONCRETE_WHITE;
        if (!wall && y === 1 && Math.abs(cx) % 3 === 0 && cz < 3 && cz > -4) b = B.CHAIR + 2;
        if (!wall && y === 9 && cx === 0 && cz === 0) b = B.LAMP;
        set(G + y, b);
      }
      set(G, B.MARBLE);
    }
    const dome = (ox, oz, base, r) => {        // купол-луковка
      const dx = Math.abs(cx - ox), dz = Math.abs(cz - oz), dd = Math.max(dx, dz);
      const prof = r === 2 ? [2, 3, 3, 2, 1, 0] : [1, 1, 0];
      prof.forEach((pr, k) => { if (dd <= pr) set(G + base + k, B.GOLD_BLOCK); });
      if (dd === 0) { set(G + base + prof.length, B.GOLD_BLOCK); set(G + base + prof.length + 1, B.GOLD_BLOCK); }
      if (dd === 0) set(G + base + prof.length + 2, B.GOLD_BLOCK);
      if (dx === 1 && dz === 0 && cz === oz) set(G + base + prof.length + 1, B.GOLD_BLOCK);   // крест
    };
    if (Math.abs(cx) <= 2 && Math.abs(cz) <= 2) {                           // барабан
      for (let y = 11; y <= 15; y++) set(G + y, (Math.abs(cx) === 2 || Math.abs(cz) === 2) ? (y === 13 && (cx === 0 || cz === 0) ? B.GLASS : B.CONCRETE_WHITE) : B.AIR);
      dome(0, 0, 16, 2);
    }
    for (const [ox, oz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) if (Math.abs(cx - ox) <= 1 && Math.abs(cz - oz) <= 1) {
      for (let y = 11; y <= 12; y++) set(G + y, B.CONCRETE_WHITE);
      dome(ox, oz, 13, 1);
    }
    const nearDome = (Math.abs(cx) <= 2 && Math.abs(cz) <= 2) || (Math.abs(Math.abs(cx) - 4) <= 1 && Math.abs(Math.abs(cz) - 4) <= 1);
    if (winter && d <= 6 && !nearDome) set(G + 11, B.SNOW);
  }

  // Парк с прудом (зимой — каток), дорожками и берёзами
  rusPark(ix, iz, set, winter) {
    const G = FLAT_G;
    const px = ix - 34, pz = iz - 34, pd = Math.hypot(px, pz);
    if (pd < 12) { set(G - 1, B.GRAVEL); set(G, winter ? B.ICE : B.WATER); return; }
    if (pd < 14) { set(G, B.PATH); if (pd > 13.3 && Math.round(Math.atan2(pz, px) * 8) % 4 === 0) set(G + 1, B.CHAIR + (Math.abs(px) > Math.abs(pz) ? (px > 0 ? 3 : 1) : (pz > 0 ? 2 : 0))); return; }
    if (ix === 34 || iz === 34) { set(G, B.PATH); return; }
    const cx = Math.round((ix - 4) / 9) * 9 + 4, cz = Math.round((iz - 4) / 9) * 9 + 4;
    if (Math.hypot(cx - 34, cz - 34) > 17 && cx !== 34 && cz !== 34 && Math.abs(ix - cx) <= 1 && Math.abs(iz - cz) <= 1) this.rusBirch(ix - cx, iz - cz, set, winter);
    if (winter && ix === 20 && iz === 20) { set(G + 1, B.SNOW); set(G + 2, B.SNOW); set(G + 3, B.SNOW); set(G + 4, B.COAL_BLOCK); }
  }

  // Рынок, магазин «Продукты» и ряд гаражей
  rusMarket(ix, iz, set, winter) {
    const G = FLAT_G;
    if (iz >= 2 && iz <= 8 && ix >= 2 && ix <= 66) { this.rusGarage(ix - 2, iz - 2, set, winter); return; }
    if (ix >= 6 && ix <= 26 && iz >= 20 && iz <= 34) {            // магазин «Продукты»
      const wall = ix === 6 || ix === 26 || iz === 20 || iz === 34;
      set(G, B.CONCRETE);
      for (let y = 1; y <= 4; y++) {
        let b = B.AIR;
        if (wall) b = y === 4 ? B.CONCRETE_RED : (y >= 2 && y <= 3 && iz === 34 && ix % 3 !== 0) ? B.GLASS : B.BRICK;
        if (iz === 34 && ix === 16 && y <= 2) b = doorAt(y, 0);
        if (!wall && y === 1) b = (ix === 8 && iz < 32) ? B.FRIDGE + 1 : (ix === 12 || ix === 13 || ix === 19 || ix === 20) && iz < 30 && iz > 22 ? B.BOOKSHELF : (iz === 22 && ix > 14) ? B.KITCHEN + 2 : B.AIR;
        set(G + y, b);
      }
      set(G + 5, winter ? B.SNOW : B.AIR);
      return;
    }
    if (ix >= 34 && ix <= 64 && iz >= 18 && iz <= 60) {              // рынок: прилавки под тентами
      set(G, B.CONCRETE);
      const sx = (ix - 34) % 8, sz = (iz - 18) % 10;
      if (sz >= 2 && sz <= 4 && sx >= 1 && sx <= 6) {
        if (sz === 3) set(G + 1, [B.PUMPKIN, B.MELON, B.HAY, B.FLOWER_POT][(ix + iz) % 4]);
        else set(G + 1, B.PLANKS);
        set(G + 4, (sx % 2) ? B.WOOL_RED : (winter ? B.SNOW : B.WOOL_WHITE));
      } else if (sz === 3 && (sx === 0 || sx === 7)) for (let y = G + 1; y <= G + 3; y++) set(y, B.LOG);
      return;
    }
    if (ix % 10 === 3 && iz === 50) this.rusBirch(0, 0, set, winter);
  }

  // Деревня: изба за забором, огород, баня, туалет во дворе; посередине улицы колодец
  rusVillage(u, w, set, winter, v) {
    const G = FLAT_G;
    const side = w >= 0 ? 1 : -1, pv = Math.abs(w) - 3;              // от забора вглубь двора
    // поворот вещей: u — вдоль улицы, w — поперёк; для улицы вдоль z оси меняются местами
    const SF = d => { const f = side > 0 ? d : [2, 1, 0, 3][d]; return v.axis === 'z' ? [1, 0, 3, 2][f] : f; };
    // улица — грунтовка с лужами, колодец посередине
    if (Math.abs(w) <= 2) {
      set(G, B.PATH);
      if (Math.abs(u) <= 1 && Math.abs(w) <= 1) {
        const rim = Math.abs(u) === 1 || Math.abs(w) === 1;
        set(G, rim ? B.COBBLE : B.WATER); set(G - 1, rim ? B.COBBLE : B.WATER);
        set(G + 1, rim ? B.COBBLE : B.AIR);
        if (Math.abs(u) === 1 && Math.abs(w) === 1) { set(G + 2, B.LOG); set(G + 3, B.LOG); }
        set(G + 4, rim ? B.DARK_PLANKS : B.AIR);
        return;
      }
      if (this.perlin.noise3(u * 0.4, 3.3, w * 0.4 + v.x) > 0.35) set(G, winter ? B.ICE : B.WATER);
      return;
    }
    if (Math.abs(u) > 64 || pv > 26) {                                 // края: таблички и берёзы
      if (Math.abs(u) === 66 && w === 3) { set(G + 1, B.COAL_BLOCK); set(G + 2, B.COAL_BLOCK); set(G + 3, B.WOOL_WHITE); set(G + 4, B.WOOL_BLUE); }
      return;
    }
    const n = Math.floor((u + 64) / 16), pu = u + 64 - n * 16;          // участок и место на нём
    const h = Noise.hash3(n, side, v.x + v.z, this.seed + 3);
    if (pv === 0) {                                                    // забор из досок с калиткой
      if (pu !== 7) { set(G + 1, B.PLANKS); if (pu % 2 === 0) set(G + 2, B.PLANKS); if (winter) set(G + (pu % 2 === 0 ? 3 : 2), B.SNOW); }
      return;
    }
    if (pu === 7 && pv >= 1 && pv <= 1) { set(G, B.PATH); return; }
    if (pu >= 3 && pu <= 11 && pv >= 2 && pv <= 8) { this.rusIzba(pu - 3, pv - 2, set, winter, SF, h); return; }
    if (pu >= 13 && pu <= 15 && pv >= 9 && pv <= 11) {                // деревенский туалет
      const wall = pu !== 14 || pv !== 10;
      for (let y = 1; y <= 3; y++) set(G + y, wall ? (pv === 9 && pu === 14 ? (y <= 2 ? doorAt(y, SF(2)) : B.PLANKS) : B.PLANKS) : (y === 1 ? B.TOILET + SF(2) : B.AIR));
      set(G + 4, winter ? B.SNOW : B.DARK_PLANKS);
      return;
    }
    if (h < 0.6 && pu >= 1 && pu <= 5 && pv >= 13 && pv <= 17) {     // баня
      const wall = pu === 1 || pu === 5 || pv === 13 || pv === 17;
      for (let y = 1; y <= 3; y++) set(G + y, wall ? (pv === 13 && pu === 3 && y <= 2 ? doorAt(y, SF(2)) : B.LOG) : (y === 1 && pu === 4 && pv === 16 ? B.STOVE + SF(2) : y === 1 && pu === 2 ? B.CHAIR + SF(1) : B.AIR));
      set(G + 4, winter ? B.SNOW : B.DARK_PLANKS);
      return;
    }
    if (pu >= 7 && pu <= 15 && pv >= 13 && pv <= 22) {                // огород: грядки
      set(G, B.DIRT);
      if (winter) { set(G, B.SNOW); return; }
      if (pv % 2 === 1) set(G + 1, (pu + n) % 5 === 0 ? B.PUMPKIN : B.WHEAT_CROP);
      return;
    }
    if (pv === 25 && pu % 8 === 4) this.rusBirch(0, 0, set, winter);
    else if (pv >= 24 && pv <= 26 && Math.abs(pu % 8 - 4) <= 1) this.rusBirch(pu % 8 - 4, pv - 25, set, winter);
    if (winter && pu === 2 && pv === 10) { set(G + 1, B.SNOW); set(G + 2, B.SNOW); set(G + 3, B.SNOW); set(G + 4, B.COAL_BLOCK); }   // снеговик
  }

  // Изба: бревенчатые стены, резные наличники, крыша двускатная (зелёная, синяя или тёмная), внутри печь
  rusIzba(a, b, set, winter, F, h) {
    const G = FLAT_G;                                  // a — 0..8 вдоль улицы, b — 0..6 от улицы
    const wall = a === 0 || a === 8 || b === 0 || b === 6;
    const roof = [B.CONCRETE_GREEN, B.CONCRETE_BLUE, B.DARK_PLANKS, B.CONCRETE_RED][Math.floor(h * 4)];
    const trim = [B.WOOL_BLUE, B.WOOL_WHITE, B.WOOL_GREEN][Math.floor(h * 7) % 3];
    set(G, B.PLANKS);
    for (let y = 1; y <= 3; y++) {
      let blk = B.AIR;
      if (wall) {
        blk = B.LOG;
        if (b === 0 && (a === 2 || a === 6) && y === 2) blk = B.GLASS;                     // окна на улицу
        if (b === 0 && (a === 1 || a === 3 || a === 5 || a === 7) && y === 2) blk = trim;  // наличники
        if (b === 0 && (a === 2 || a === 6) && y === 3) blk = trim;
        if (b === 0 && a === 4 && y <= 2) blk = doorAt(y, F(2));                          // дверь
        if ((a === 0 || a === 8) && b === 3 && y === 2) blk = B.GLASS;
      } else if (y === 1) {
        const M = { '1,1': B.BRICK, '2,1': B.BRICK, '1,2': B.BRICK, '2,2': B.BRICK,      // русская печь
          '6,1': B.TABLE, '5,1': B.CHAIR + F(1), '7,2': B.CHAIR + F(2), '1,5': B.BED + F(1), '7,5': B.WARDROBE + F(3),
          '4,4': B.CARPET, '5,4': B.CARPET, '4,5': B.FLOWER_POT, '6,5': B.TV + F(2) };
        blk = M[a + ',' + b] || B.AIR;
      } else if (y === 2 && (a === 1 || a === 2) && (b === 1 || b === 2)) blk = B.BRICK;
      else if (y === 3 && a === 1 && b === 1) blk = B.BRICK;
      set(G + y, blk);
    }
    if (a === 1 && b === 1) { set(G + 4, B.BRICK); set(G + 5, B.BRICK); set(G + 6, B.BRICK); set(G + 7, B.BRICK); }   // труба
    // двускатная крыша: конёк вдоль улицы
    for (let k = 0; k <= 3; k++) {
      if (b === k || b === 6 - k) set(G + 4 + k, roof);
      else if ((a === 0 || a === 8) && b > k && b < 6 - k) set(G + 4 + k, B.PLANKS);   // фронтон
    }
    if (b === 3) set(G + 7, roof);
    if (winter) { const top = b <= 3 ? 4 + b : 4 + 6 - b; if (!(a === 1 && b === 1)) set(G + top + 1, B.SNOW); }
  }

  // ---------- «Супер! Три новых ЖК» ----------
  zhkColumn(wx, wz, set) {
    const G = FLAT_G, P = ZHK.park;
    if (wx >= P.x0 && wx <= P.x1 && wz >= P.z0 && wz <= P.z1) this.zhkParking(wx, wz, set);
    for (let i = 0; i < ZHK.buildings.length; i++) {
      const b = ZHK.buildings[i], W = b.sections * ZHK.SW + 1;
      if (wx >= b.x0 && wx < b.x0 + W && wz >= b.z0 && wz < b.z0 + ZHK.D) {
        this.zhkBuilding(i, b, wx - b.x0, b.front === 'n' ? wz - b.z0 : b.z0 + ZHK.D - 1 - wz, set);
        return;
      }
    }
    const R = ZHK.ramp;
    if (wx >= R.x0 - 1 && wx <= R.x1 + 1 && wz >= R.z0 && wz <= R.z0 + 13) {      // въезд на парковку
      const k = Math.floor((wz - R.z0) / 2), fy = G - k;
      if (wx < R.x0 || wx > R.x1) { for (let y = fy; y <= G + 1; y++) set(y, B.CONCRETE); return; }
      set(fy, B.CONCRETE_BLACK);
      for (let y = fy + 1; y <= G + 4; y++) set(y, B.AIR);
      return;
    }
    const road = (wz >= -45 && wz <= -39) || (wz >= 38 && wz <= 44);
    if (Math.abs(wx) <= 90 && road) {
      const c = wz < 0 ? -42 : 41;
      let b = B.CONCRETE_BLACK;
      if (wx >= -2 && wx <= 3) b = (wz - c) % 2 === 0 ? B.CONCRETE_WHITE : B.CONCRETE_BLACK;
      else if (wz === c && ((wx % 6) + 6) % 6 < 3) b = B.CONCRETE_WHITE;
      set(G, b);
      return;
    }
    if (Math.abs(wx) <= 90 && (wz === -38 || wz === -37 || wz === 36 || wz === 37)) {
      set(G, B.CONCRETE);
      if ((wz === -38 || wz === 37) && ((wx % 12) + 12) % 12 === 6) { for (let y = G + 1; y <= G + 4; y++) set(y, B.COAL_BLOCK); set(G + 5, B.LAMP); }
      return;
    }
    if (Math.abs(wx) <= 60 && wz >= -36 && wz <= 35) { this.zhkYard(wx, wz, set); return; }
  }

  // Подземная парковка: колонны, разметка, свет
  zhkParking(x, z, set) {
    const P = ZHK.park, F = ZHK.PF;
    const m = (a, n) => ((a % n) + n) % n;
    set(F - 1, B.CONCRETE);
    set(F, B.CONCRETE_BLACK);
    for (let y = F + 1; y <= F + 4; y++) set(y, B.AIR);
    set(F + 5, B.CONCRETE);
    if (x === P.x0 || x === P.x1 || z === P.z0 || z === P.z1) { for (let y = F; y <= F + 5; y++) set(y, B.CONCRETE); return; }
    if (m(x, 8) === 0 && m(z, 8) === 0) for (let y = F + 1; y <= F + 4; y++) set(y, B.CONCRETE_WHITE);
    else if (m(x, 8) === 4 && m(z, 8) === 4) set(F + 4, B.LAMP);
    if (m(z, 12) <= 4 && m(x, 4) === 2) set(F, B.CONCRETE_YELLOW);
  }

  // Двор без машин: фонтан, дорожки, детская площадка, спортплощадка, деревья и скамейки
  zhkYard(x, z, set) {
    const G = FLAT_G;
    set(G, B.GRASS);
    const tree = (tx, tz) => {
      const dx = Math.abs(x - tx), dz = Math.abs(z - tz), d = Math.max(dx, dz);
      if (d === 0) { for (let y = G + 1; y <= G + 4; y++) set(y, B.LOG); set(G + 5, B.LEAVES); set(G + 6, B.LEAVES); }
      else if (d === 1) for (let y = G + 3; y <= G + 6; y++) set(y, B.LEAVES);
      else if (d === 2 && !(dx === 2 && dz === 2)) for (let y = G + 3; y <= G + 5; y++) set(y, B.LEAVES);
    };
    const fd = Math.max(Math.abs(x), Math.abs(z));
    if (fd <= 4) {                                              // фонтан
      if (fd === 4) { set(G, B.MARBLE); set(G + 1, B.MARBLE); }
      else { set(G - 1, B.MARBLE); set(G, B.WATER); }
      if (fd === 0) { for (let y = G; y <= G + 3; y++) set(y, B.MARBLE); set(G + 4, B.WATER); }
      return;
    }
    if (x >= -44 && x <= -22 && z >= -14 && z <= 0) { this.leninPlayground(x + 44, z + 14, set, false, f => f); return; }
    if (x >= 20 && x <= 42 && z >= -12 && z <= -6) { this.leninField(x - 20, z + 12, set, false); return; }
    if (Math.abs(x) <= 1 || Math.abs(z) <= 1 || (fd === 6)) {    // дорожки из плитки
      set(G, B.STONE_BRICKS);
      if (fd === 6 && (x === 0 || z === 0)) set(G + 1, B.AIR);
      return;
    }
    if (fd === 7 && (Math.abs(x) === 3 || Math.abs(z) === 3)) {   // скамейки смотрят на фонтан
      set(G + 1, B.CHAIR + (Math.abs(x) === 7 ? (x > 0 ? 3 : 1) : (z > 0 ? 2 : 0)));
      return;
    }
    if ((Math.abs(x) === 2 || Math.abs(z) === 2) && (((x + z) % 10) + 10) % 10 === 0) { for (let y = G + 1; y <= G + 3; y++) set(y, B.COAL_BLOCK); set(G + 4, B.LAMP); return; }
    if ((Math.abs(x) === 2 || Math.abs(z) === 2) && (((x - z) % 4) + 4) % 4 === 1) set(G + 1, B.FLOWER_POT);
    // деревья — в узлах сетки 10×10, но не на дорожках, фонтане и площадках
    const cx = Math.round((x - 5) / 10) * 10 + 5, cz = Math.round((z - 5) / 10) * 10 + 5;
    const busy = (Math.abs(cx) <= 9 && Math.abs(cz) <= 9) || Math.abs(cx) <= 3 || Math.abs(cz) <= 3 ||
      (cx >= -47 && cx <= -19 && cz >= -17 && cz <= 3) || (cx >= 17 && cx <= 45 && cz >= -15 && cz <= -3);
    if (!busy && Math.abs(x - cx) <= 2 && Math.abs(z - cz) <= 2) tree(cx, cz);
  }

  // Дом ЖК: на первом этаже магазины и холл с лифтом, выше — квартиры, на крыше терраса
  zhkBuilding(i, b, bx, bz, set) {
    const G = FLAT_G, SW = ZHK.SW, N = b.floors, TOP = 3 * N, W = b.sections * SW + 1, F = ZHK.PF;
    const sec = Math.min(b.sections - 1, Math.floor(bx / SW)), sx = bx - sec * SW;
    const endWall = bx === 0 || bx === W - 1;
    const frontW = bz === 0, backW = bz === ZHK.D - 1;
    const outer = endWall || frontW || backW;
    const mz = f => (b.front === 'n' ? f : [2, 1, 0, 3][f]);
    const liftCell = (sx === 10 || sx === 11) && (bz === 11 || bz === 12);
    const liftWall = (sx === 10 || sx === 11) && (bz === 10 || bz === 13);
    const left = sx >= 1 && sx <= 6, right = sx >= 13 && sx <= 18;
    const shop = ZHK.shops[(i * 4 + sec * 2 + (right ? 1 : 0)) % ZHK.shops.length];
    // лифт спускается на парковку
    if ((liftCell || liftWall) && !b.noParking) {
      set(F, B.ELEVATOR_WALL);
      for (let y = F + 1; y <= F + 3; y++) set(y, liftWall ? B.ELEVATOR_WALL : B.AIR);
      set(F + 4, B.ELEVATOR_WALL);
      if (sx === 11 && bz === 11) set(F + 2, B.LIFT_BUTTON + 3);
    }
    for (let rel = 0; rel <= TOP + 3; rel++) {
      const y = G + rel, f = Math.floor(rel / 3), k = rel % 3;
      let blk = B.AIR;
      if (rel >= TOP) {                                         // крыша с террасой и выходом из лифта
        if (liftCell || liftWall) blk = rel === TOP || rel === TOP + 3 || liftWall ? B.ELEVATOR_WALL : (sx === 11 && bz === 11 && rel === TOP + 2 ? B.LIFT_BUTTON + 3 : B.AIR);
        else if (rel === TOP) blk = B.CONCRETE;
        else if (rel === TOP + 1) {
          if (outer) blk = b.crown === B.LEAVES ? B.GLASS : b.crown;
          else if (b.garden && sx % 5 === 2 && bz % 5 === 2) blk = B.LEAVES;
          else if (!b.garden && sx % 6 === 3 && bz === 7) blk = B.CHAIR + mz(0);
          else if (b.winter) blk = B.SNOW;
        } else if (rel === TOP + 2 && outer && (bx === 0 || bx === W - 1) && (frontW || backW)) blk = B.LAMP;
        set(y, blk);
        continue;
      }
      if (outer) {
        if (k === 0) {
          blk = b.band;
          if (f === 1 && frontW && (left || right)) blk = shop[1];            // вывеска магазина
        } else {
          const pillar = endWall ? bz % 3 === 0 : (sx === 0 || sx === 7 || sx === 12);
          blk = pillar ? b.frame : b.glass;
          if (f === 0 && (frontW || backW) && (sx === 9 || sx === 10)) blk = doorAt(k, mz(frontW ? 2 : 0));   // двери подъезда
          if (f === 0 && frontW && (sx === 3 || sx === 16)) blk = doorAt(k, mz(2));                         // двери магазинов
        }
        set(y, blk);
        continue;
      }
      // лифт на каждом этаже
      if (liftWall) { set(y, B.ELEVATOR_WALL); continue; }
      if (liftCell) { set(y, k === 0 ? B.ELEVATOR_WALL : (k === 2 && sx === 11 && bz === 11 ? B.LIFT_BUTTON + 3 : B.AIR)); continue; }
      const hall = sx >= 8 && sx <= 11;
      const st = hall ? this.zhkStair(sx, bz, rel, N) : null;
      if (k === 0) {
        if (st === 'hole') blk = B.AIR;
        else if (st === 'step') blk = B.STONE_BRICKS;
        else if (hall || f === 0) blk = B.MARBLE;
        else {
          const ax = left ? sx : 19 - sx;
          blk = ax >= 4 && bz >= 9 && bz <= 11 ? B.METRO_TILE : B.BIRCH_PLANKS;          // в ванной — плитка
          if (f > 0 && ((ax === 3 && bz === 4) || (ax === 2 && bz === 12) || (ax === 5 && bz === 10))) blk = B.LAMP;
        }
        if (hall && f > 0 && sx === 10 && bz === 6) blk = B.LAMP;
        set(y, blk);
        continue;
      }
      // стены между квартирами, подъездом и соседним подъездом
      if (sx === 0) blk = B.CONCRETE_WHITE;
      else if (sx === 7 || sx === 12) blk = f > 0 && bz === 8 ? doorAt(k, sx === 7 ? 1 : 3) : B.CONCRETE_WHITE;
      else if (hall) {
        if (st === 'step') blk = B.STONE_BRICKS;
        else if (f === 0 && k === 1) blk = this.zhkLobby(sx, bz, mz);
      } else if (f === 0) blk = this.zhkShop(shop[0], left ? sx : 19 - sx, bz, k, left, mz);
      else blk = this.zhkFlat(left ? sx : 19 - sx, bz, k, left, mz);
      set(y, blk);
    }
  }

  // Лестница в подъезде ЖК: те же пролёты, что на «Улице Ленина», но высота дома своя
  zhkStair(sx, bz, rel, N) {
    if (sx !== 8 && sx !== 9) return null;
    const col = sx - 1, zl = bz + 8;
    for (const g of [Math.floor(rel / 3), Math.floor(rel / 3) - 1]) {
      if (g < 0 || g > N - 2) continue;
      const h = rel - 3 * g;
      if (g % 2 === 0 && col === 7) {
        const i = zl - 12;
        if (i >= 0 && i <= 2 && h === 1 + i) return 'step';
        if (h === 3 && zl >= 11 && zl <= 13) return 'hole';
      }
      if (g % 2 === 1 && col === 8) {
        const i = 14 - zl;
        if (i >= 0 && i <= 2 && h === 1 + i) return 'step';
        if (h === 3 && zl >= 13 && zl <= 15) return 'hole';
      }
    }
    return null;
  }

  zhkLobby(sx, bz, mz) {
    const L = { '11,2': B.FLOWER_POT, '11,5': B.SOFA + 3, '11,6': B.SOFA + 3, '11,14': B.IRON_BLOCK, '11,1': B.IRON_BLOCK, '10,1': B.FLOWER_POT };
    return L[sx + ',' + bz] || B.AIR;
  }

  // Современная квартира: кухня-гостиная у окна, ванная с сантехникой, спальня с рабочим местом
  zhkFlat(ax, bz, k, left, mz) {
    const F = d => mz(left ? d : [0, 3, 2, 1][d]);
    const wall = (bz === 7 && ax !== 3) ||
      ((ax === 3 && (bz === 9 || bz === 11)) || (bz === 12 && ax >= 3));
    if (wall) return bz === 7 ? B.CONCRETE_WHITE : B.METRO_TILE;
    if (bz === 7 && ax === 3) return doorAt(k, F(0));          // дверь в спальню
    if (ax === 3 && bz === 10) return doorAt(k, F(1));         // дверь в ванную
    if (k === 2) return ax === 6 && bz === 10 ? B.MIRROR + F(3) : ax === 6 && bz === 11 ? B.SHOWER_TOP + F(3) : B.AIR;
    const M = {
      '1,1': B.KITCHEN + F(1), '1,2': B.KITCHEN + F(1), '1,3': B.STOVE + F(1), '1,4': B.KITCHEN + F(1), '1,6': B.FRIDGE + F(1),
      '3,2': B.TABLE, '3,1': B.CHAIR + F(0), '3,3': B.CHAIR + F(2),
      '6,4': B.SOFA + F(3), '6,5': B.SOFA + F(3), '4,4': B.TV + F(1), '5,4': B.CARPET, '5,5': B.CARPET,
      '6,6': B.FLOOR_LAMP, '6,1': B.FLOWER_POT,
      '6,9': B.TOILET + F(3), '6,10': B.SINK + F(3), '6,11': B.SHOWER + F(3), '4,11': B.WASHER + F(2), '5,11': B.BATHTUB + F(2),
      '1,9': B.WARDROBE + F(1), '1,13': B.BED + F(0), '2,14': B.FLOWER_POT,
      '6,14': B.TABLE, '5,14': B.CHAIR + F(1), '6,13': B.COMPUTER + F(3),
      '1,5': B.ROUTER, '2,13': B.CHARGER,
    };
    return M[ax + ',' + bz] || B.AIR;
  }

  // Магазины и кафе на первом этаже — у каждого своя обстановка
  zhkShop(name, ax, bz, k, left, mz) {
    const F = d => mz(left ? d : [0, 3, 2, 1][d]);
    const key = ax + ',' + bz;
    if (k === 2) {
      if (name === 'Барбершоп' && ax === 6 && bz % 3 === 0 && bz <= 9) return B.MIRROR + F(3);
      if (name === 'Фитнес' && key === '1,13') return B.SHOWER_TOP + F(1);
      if (name === 'Пункт выдачи' && (ax <= 2 || ax >= 5) && bz >= 3 && bz <= 12) return B.PLANKS;
      return B.AIR;
    }
    const S = {
      'Кафе': () => ({ '2,4': B.TABLE, '5,4': B.TABLE, '2,9': B.TABLE, '5,9': B.TABLE, '2,3': B.CHAIR + F(0), '2,5': B.CHAIR + F(2),
        '5,3': B.CHAIR + F(0), '5,5': B.CHAIR + F(2), '2,8': B.CHAIR + F(0), '2,10': B.CHAIR + F(2), '5,8': B.CHAIR + F(0), '5,10': B.CHAIR + F(2),
        '1,13': B.KITCHEN + F(2), '2,13': B.KITCHEN + F(2), '3,13': B.KITCHEN + F(2), '5,13': B.STOVE + F(2), '6,13': B.FRIDGE + F(2), '6,1': B.FLOWER_POT, '1,1': B.FLOWER_POT })[key],
      'Пекарня': () => (bz === 8 && ax !== 6 ? B.KITCHEN + F(2) : bz === 13 ? B.HAY : ({ '2,3': B.TABLE, '5,3': B.TABLE, '2,2': B.CHAIR + F(0), '5,2': B.CHAIR + F(0) })[key]),
      'Аптека': () => ((ax === 1 || ax === 6) && bz >= 3 && bz <= 12 ? B.BOOKSHELF : bz === 11 && ax >= 2 && ax <= 5 ? B.KITCHEN + F(2) : key === '2,2' ? B.FLOWER_POT : undefined),
      'Продукты': () => ((ax === 3 || ax === 4) && bz >= 3 && bz <= 10 ? B.BOOKSHELF : (ax === 1 && bz >= 3 && bz <= 12) ? B.FRIDGE + F(1) : (ax === 6 && bz >= 3 && bz <= 12) ? B.FRIDGE + F(3) : bz === 13 && ax <= 3 ? B.KITCHEN + F(2) : undefined),
      'Цветы': () => (ax % 2 === 1 && bz % 2 === 1 && bz < 13 ? B.FLOWER_POT : ax === 6 && bz >= 2 && bz <= 12 ? B.LEAVES : bz === 13 && ax >= 4 ? B.KITCHEN + F(2) : undefined),
      'Барбершоп': () => (ax === 5 && bz % 3 === 0 && bz <= 9 ? B.CHAIR + F(1) : ax === 6 && bz % 3 === 1 && bz <= 10 ? B.SINK + F(3) : ax === 1 && bz >= 3 && bz <= 5 ? B.SOFA + F(1) : key === '1,12' ? B.FLOWER_POT : undefined),
      'Фитнес': () => (({ '2,3': B.IRON_BLOCK, '5,3': B.IRON_BLOCK, '2,7': B.IRON_BLOCK, '5,7': B.IRON_BLOCK, '1,13': B.SHOWER + F(1) })[key] || (ax >= 2 && ax <= 5 && bz >= 10 && bz <= 12 ? B.CARPET : undefined)),
      'Пункт выдачи': () => ((ax <= 2 || ax >= 5) && bz >= 3 && bz <= 12 ? B.PLANKS : bz === 13 && (ax === 3 || ax === 4) ? B.KITCHEN + F(2) : undefined),
    };
    return (S[name] && S[name]()) || B.AIR;
  }

  // ---------- Метро ----------
  metroColumn(wx, wz, set) {
    const D = METRO.depot;
    if (wx >= D.x0 && wx <= D.x1 && wz >= D.z0 && wz <= D.z1) { this.depotColumn(wx, wz, set); return; }
    const bz = Math.floor(wz / 32), lz = ((wz % 32) + 32) % 32;
    if (METRO.stations.includes(bz) && lz >= 10 && lz <= 28 && wx >= -6 && wx <= 12) { this.stationColumn(wx, lz, set); return; }
    if (wx >= 0 && wx <= 6 && wz >= METRO.zN && wz <= METRO.zS) this.tunnelColumn(wx, wz, set);
  }

  tunnelColumn(x, z, set) {
    const R = METRO.y;
    if (z === METRO.zN || x === 0 || x === 6) { for (let y = R - 1; y <= R + 5; y++) set(y, B.STONE_BRICKS); return; }
    set(R - 1, B.CONCRETE);
    for (let y = R; y <= R + 4; y++) set(y, B.AIR);
    set(R + 5, B.CONCRETE);
    if (x === 3) set(R, B.RAIL);
    if (x === 3 && ((z % 10) + 10) % 10 === 0) set(R + 4, B.LAMP);
  }

  // Станция: две платформы с жёлтой линией, плитка, знаки «М», скамейки и лестница наверх
  stationColumn(x, lz, set) {
    const R = METRO.y, G = FLAT_G;
    const end = lz === 10 || lz === 28;
    const wall = x === -6 || x === 12;
    if (wall || (end && (x < 0 || x > 6))) {
      for (let y = R - 1; y <= R + 6; y++) set(y, y === R + 3 ? B.CONCRETE_RED : (y === R + 2 && wall && lz % 6 === 1) ? B.METRO_SIGN : B.METRO_TILE);
      return;
    }
    if (end && (x === 0 || x === 6)) { for (let y = R - 1; y <= R + 5; y++) set(y, B.STONE_BRICKS); set(R + 6, B.METRO_TILE); return; }
    set(R + 6, B.CONCRETE_WHITE);                                      // потолок
    if (x >= 1 && x <= 5) {                                            // пути: под рельсами мрамор — тут поезд остановится
      set(R - 1, x === 3 ? B.MARBLE : B.CONCRETE);
      for (let y = R; y <= R + 5; y++) set(y, B.AIR);
      if (x === 3) set(R, B.RAIL);
    } else {                                                           // платформы
      set(R - 1, B.STONE);
      set(R, x === 0 || x === 6 ? B.CONCRETE_YELLOW : B.MARBLE);
      for (let y = R + 1; y <= R + 5; y++) set(y, B.AIR);
      if (x === -5 && lz % 5 === 0) set(R + 1, B.CHAIR + 1);
      if (x === 11 && lz % 5 === 0) set(R + 1, B.CHAIR + 3);
    }
    if ((x === -3 || x === 3 || x === 9) && lz % 4 === 0) set(R + 5, B.LAMP);
    // лестница наверх (x 9..10) со стенками (x 8 и 11) и павильоном над входом
    if (lz >= 11 && lz <= 20 && x >= 8 && x <= 11) {
      for (let y = G + 1; y <= G + 6; y++) set(y, B.AIR);
      const stairs = (x === 9 || x === 10) && lz >= 12 && lz <= 19;
      if (stairs) {
        const fy = G - (lz - 12);
        for (let y = R + 1; y < fy; y++) set(y, B.METRO_TILE);
        set(fy, B.STONE_BRICKS);
        for (let y = fy + 1; y <= G; y++) set(y, B.AIR);
      } else if ((x === 8 || x === 11) && lz >= 12) {
        for (let y = R + 1; y < G; y++) set(y, B.METRO_TILE);
        set(G + 1, B.GLASS);
      } else if (lz === 20) set(G + 1, B.GLASS);
      if ((x === 8 || x === 11) && (lz === 11 || lz === 20)) for (let y = G + 1; y <= G + 3; y++) set(y, B.COAL_BLOCK);
      set(G + 4, B.GLASS_BLUE);                                        // стеклянная крыша павильона
      if (x === 11 && lz === 11) set(G + 5, B.METRO_SIGN);
    }
  }

  stationName(t) {
    if (this.preset !== 'city' || t.axis !== 'z' || Math.floor(t.cross) !== METRO.cross) return null;
    if (t.s > METRO.depot.z0) return 'Депо';
    return METRO.names[Math.floor(t.s / 32)] || null;
  }

  // Депо: подземный зал с пятью путями и запасными поездами, наверху — большое здание с лестницей вниз
  depotColumn(x, z, set) {
    const R = METRO.y, G = FLAT_G;
    for (let y = G + 1; y < CH; y++) set(y, B.AIR);
    set(G, B.CONCRETE);
    const hall = x >= -14 && x <= 20 && z >= 354 && z <= 420;
    if (x >= 0 && x <= 6 && z < 354) this.tunnelColumn(x, z, set);
    else if (hall) {
      const wall = x === -14 || x === 20 || z === 420 || (z === 354 && !(x >= 1 && x <= 5));
      if (wall) for (let y = R - 1; y <= R + 6; y++) set(y, B.STONE_BRICKS);
      else {
        set(R - 1, B.CONCRETE);
        for (let y = R; y <= R + 6; y++) set(y, B.AIR);
        if ([-9, -3, 3, 9, 15].includes(x) && z <= 418) { set(R, B.RAIL); set(R - 1, B.CONCRETE_BLACK); }
        if (((x % 6) + 6) % 6 === 0 && z % 6 === 0) set(R + 6, B.LAMP);
        if (x === -13 && z % 8 === 0) set(R, B.CRAFTING_TABLE);
        if (x === 19 && z % 3 === 0) set(R, B.IRON_BLOCK);
      }
    }
    // здание депо
    const inB = x >= -14 && x <= 20 && z >= 356 && z <= 418;
    if (inB) {
      const edge = x === -14 || x === 20 || z === 356 || z === 418;
      for (let y = 1; y <= 10; y++) {
        let b = B.AIR;
        if (edge) {
          b = y === 5 || y === 9 ? B.CONCRETE_RED : B.IRON_BLOCK;
          if (y === 7 && (x + z) % 4 === 0) b = B.GLASS;
          if (z === 356 && x >= -2 && x <= 8 && y <= 7) b = B.AIR;              // ворота
          if (z === 356 && y === 9 && x % 4 === 0) b = B.METRO_SIGN;
        } else if (y === 10 && x % 8 === 4 && z % 8 === 4) b = B.LAMP;
        set(G + y, b);
      }
      set(G + 11, x % 8 === 2 && !edge ? B.GLASS : B.CONCRETE);
      // лестница в подземный зал
      if ((x === 17 || x === 18) && z >= 360 && z <= 368) {
        const fy = G - (z - 360);
        set(fy, B.STONE_BRICKS);
        for (let y = fy + 1; y <= G; y++) set(y, B.AIR);
      }
      if ((x === 16 || x === 19) && z >= 360 && z <= 368) set(G + 1, B.GLASS);
    } else if (x === METRO.depot.x0 || x === METRO.depot.x1 || z === METRO.depot.z1) {
      set(G + 1, (x + z) % 3 === 0 ? B.COAL_BLOCK : B.GLASS);           // забор
    }
  }

  // Полицейский участок: сине-белое здание с мигалками на крыше и парковкой перед входом
  policeColumn(ix, iz, set) {
    const G = FLAT_G;
    if (iz < 5) {                                     // парковка с разметкой
      set(G, B.CONCRETE_BLACK);
      if (iz === 4 || (ix % 5 === 0 && iz > 0)) set(G, B.CONCRETE_WHITE);
      return;
    }
    if (ix < 2 || ix > 18 || iz > 18) { set(G, B.GRASS); return; }
    const edge = ix === 2 || ix === 18 || iz === 5 || iz === 18;
    const corner = (ix === 2 || ix === 18) && (iz === 5 || iz === 18);
    set(G, B.CONCRETE);
    for (let y = 1; y <= 9; y++) {
      let b = B.AIR;
      if (edge) {
        b = y === 4 || y === 9 ? B.CONCRETE_BLUE : B.CONCRETE_WHITE;   // синие полосы
        if (!corner && (y === 2 || y === 6 || y === 7) && (ix + iz) % 3 !== 0) b = B.GLASS;
        if (iz === 5 && ix >= 9 && ix <= 11 && y <= 3) b = y === 3 ? B.CONCRETE_BLUE : doorAt(y, 2);   // вход
      } else if (y === 5) b = B.CONCRETE;
      else if (y === 1 && iz === 15 && ix >= 4 && ix <= 16) b = ix % 4 === 0 ? B.COMPUTER + 2 : B.TABLE;    // столы с компьютерами
      else if (y === 1 && ix === 4 && iz >= 8 && iz <= 12) b = B.IRON_BLOCK;                              // решётка камеры
      set(G + y, b);
    }
    if (edge) set(G + 10, B.CONCRETE_BLUE);
    if (iz === 5 && ix >= 7 && ix <= 13) set(G + 10, ix % 2 ? B.CONCRETE_WHITE : B.CONCRETE_BLUE);   // вывеска
    if (iz === 6 && (ix === 9 || ix === 11)) set(G + 10, ix === 9 ? B.GLASS_RED : B.GLASS_BLUE);       // мигалки
    if (iz === 6 && ix === 10) set(G + 10, B.LAMP);
  }

  // Больница: высокое белое здание с красным крестом и вертолётной площадкой на крыше
  hospitalColumn(ix, iz, set) {
    const G = FLAT_G, H = 20;
    if (iz < 4) {
      set(G, B.CONCRETE);
      if (iz === 3 && ix >= 7 && ix <= 13) set(G + 4, B.CONCRETE_RED);       // навес над входом
      if (iz === 0 && ix % 4 === 2) set(G + 1, B.FLOWER_POT);
      return;
    }
    if (ix < 2 || ix > 18 || iz > 18) { set(G, B.GRASS); return; }
    const edge = ix === 2 || ix === 18 || iz === 4 || iz === 18;
    const corner = (ix === 2 || ix === 18) && (iz === 4 || iz === 18);
    // красный крест на фасаде: клетки 5×5 высоко на передней стене
    const cross = y => {
      const cx = ix - 10, cy = y - 15;
      return (Math.abs(cx) <= 1 && Math.abs(cy) <= 3) || (Math.abs(cy) <= 1 && Math.abs(cx) <= 3);
    };
    set(G, B.CONCRETE_WHITE);
    for (let y = 1; y <= H; y++) {
      const floorLevel = y % 4 === 0;
      let b = B.AIR;
      if (edge) {
        b = corner || floorLevel ? B.CONCRETE_WHITE : B.GLASS_BLUE;
        if (iz === 4 && Math.abs(ix - 10) <= 3 && y >= 12 && y <= 18) b = cross(y) ? B.CONCRETE_RED : B.CONCRETE_WHITE;
        if (iz === 4 && ix >= 8 && ix <= 12 && y <= 3) b = B.GLASS;            // стеклянный вход
        if (iz === 4 && ix >= 9 && ix <= 11 && y <= 2) b = doorAt(y, 2);
      } else if (floorLevel) b = B.CONCRETE_WHITE;
      else if (y % 4 === 1 && iz % 4 === 0 && ix % 5 === 0) b = B.BED + 1;      // палаты с кроватями
      else if (y % 4 === 3 && ix % 6 === 4 && iz % 6 === 4) b = B.LAMP;
      set(G + y, b);
    }
    // вертолётная площадка с буквой H
    const hx = ix - 10, hz = iz - 11;
    const letterH = (Math.abs(hx) === 2 && Math.abs(hz) <= 3) || (hz === 0 && Math.abs(hx) <= 2);
    if (Math.abs(hx) <= 5 && Math.abs(hz) <= 5) set(G + H, letterH ? B.CONCRETE_WHITE : B.CONCRETE_GREEN);
    if (edge) set(G + H + 1, B.CONCRETE_WHITE);
  }

  // Канал: вода между каменными набережными, прогулочные дорожки с фонарями и скамейками
  canalColumn(ix, lz, set) {
    const G = FLAT_G;
    const water = ix >= 4 && ix <= 16;
    if (lz < 7 || lz === 7 || lz === 8 || lz >= 30) {     // мост: дорога или тротуар над водой
      if (water) {
        set(G - 4, B.STONE_BRICKS);
        for (let y = G - 3; y < G; y++) set(y, B.WATER);
      }
      if (lz < 7) {
        set(G, B.CONCRETE_BLACK);
        if ((lz === 0 || lz === 6) && (ix === 4 || ix === 16)) { set(G + 1, B.STONE_BRICKS); set(G + 2, B.LAMP); }
      } else {
        set(G, B.CONCRETE);
        if (water && (lz === 7 || lz === 31)) set(G + 1, B.GLASS);           // перила моста
      }
      return;
    }
    if (water) {
      set(G - 4, B.STONE_BRICKS);
      for (let y = G - 3; y <= G; y++) set(y, B.WATER);
      return;
    }
    for (let y = G - 4; y <= G; y++) set(y, B.STONE_BRICKS);
    if (ix === 3 || ix === 17) {                          // парапет с перилами
      set(G + 1, lz % 3 === 0 ? B.COAL_BLOCK : B.GLASS);
      return;
    }
    if ((ix === 1 || ix === 19) && lz % 8 === 4) {        // фонари
      for (let y = G + 1; y <= G + 3; y++) set(y, B.COAL_BLOCK);
      set(G + 4, B.LAMP);
    }
    if (ix === 2 && lz % 8 === 0) set(G + 1, B.CHAIR + 1);    // скамейки смотрят на воду
    if (ix === 18 && lz % 8 === 0) set(G + 1, B.CHAIR + 3);
    if ((ix === 0 || ix === 20) && lz % 8 === 2) set(G + 1, B.FLOWER_POT);
  }

  // Аэропорт: взлётная полоса с огнями, перрон, терминал, диспетчерская башня и ангар
  airportColumn(ax, az, set) {
    const G = FLAT_G;
    const W = AIRPORT.w, D = AIRPORT.d;
    // забор по краю
    if (ax === 0 || az === 0 || ax === W - 1 || az === D - 1) {
      set(G, B.CONCRETE);
      if (!(az === D - 1 && ax >= 56 && ax <= 64)) set(G + 1, ax % 4 === 0 || az % 4 === 0 ? B.COAL_BLOCK : B.GLASS);
      return;
    }
    // взлётная полоса
    if (az >= 30 && az <= 42 && ax >= 4 && ax <= W - 5) {
      let b = B.CONCRETE_BLACK;
      if (az === 30 || az === 42) b = B.CONCRETE_WHITE;
      if (az === 36 && ax % 8 < 4) b = B.CONCRETE_WHITE;
      if ((ax <= 9 || ax >= W - 10) && az % 2 === 0 && az > 31 && az < 41) b = B.CONCRETE_WHITE;
      set(G, b);
      return;
    }
    if ((az === 29 || az === 43) && ax >= 4 && ax <= W - 5 && ax % 6 === 0) { set(G, B.LAMP); return; }   // огни полосы
    // рулёжные дорожки к перрону
    if (az > 43 && az < 50 && ((ax >= 30 && ax <= 36) || (ax >= 92 && ax <= 98))) { set(G, B.CONCRETE_BLACK); return; }
    // перрон
    if (az >= 50 && az <= 70 && ax >= 26 && ax <= 110) {
      set(G, B.CONCRETE);
      if (az === 60 && ax % 6 < 3) set(G, B.CONCRETE_YELLOW);
      return;
    }
    // терминал
    if (az >= 71 && az <= 86 && ax >= 40 && ax <= 84) {
      const edge = ax === 40 || ax === 84 || az === 71 || az === 86;
      set(G, B.MARBLE);
      for (let y = 1; y <= 9; y++) {
        let b = B.AIR;
        if (edge) {
          b = y === 9 ? B.CONCRETE_BLUE : (ax % 6 === 4 ? B.CONCRETE_WHITE : B.GLASS_BLUE);
          if ((az === 71 || az === 86) && ax >= 59 && ax <= 63 && y <= 3) b = y === 3 ? B.AIR : doorAt(y, az === 71 ? 2 : 0);   // двери
        } else if (y === 9) b = B.CONCRETE_WHITE;
        else if (y === 1 && az === 82 && ax % 4 === 0) b = B.SOFA + 2;                 // зал ожидания
        else if (y === 8 && ax % 6 === 1 && az % 5 === 0) b = B.LAMP;
        set(G + y, b);
      }
      return;
    }
    // диспетчерская башня
    const tx = ax - 96, tz = az - 78;
    if (Math.abs(tx) <= 4 && Math.abs(tz) <= 4) {
      set(G, B.CONCRETE);
      const shaft = Math.abs(tx) <= 2 && Math.abs(tz) <= 2;
      const shaftEdge = shaft && (Math.abs(tx) === 2 || Math.abs(tz) === 2);
      for (let y = 1; y <= 20; y++) if (shaftEdge) set(G + y, y % 5 === 0 ? B.CONCRETE_BLUE : B.CONCRETE_WHITE);
      for (let y = 21; y <= 25; y++) {
        const e = Math.abs(tx) === 4 || Math.abs(tz) === 4;
        set(G + y, y === 21 || y === 25 ? B.CONCRETE_WHITE : (e ? B.GLASS_BLUE : (y === 22 && tx === 0 && tz === 0 ? B.COMPUTER : B.AIR)));
      }
      if (tx === 0 && tz === 0) set(G + 26, B.LAMP);
      return;
    }
    // ангар с открытыми воротами к полосе
    if (ax >= 4 && ax <= 24 && az >= 50 && az <= 82) {
      const edge = ax === 4 || ax === 24 || az === 82;
      set(G, B.CONCRETE);
      for (let y = 1; y <= 10; y++) if (edge) set(G + y, y % 4 === 0 ? B.CONCRETE_BLUE : B.IRON_BLOCK);
      const k = Math.min(ax - 4, 24 - ax);
      set(G + 11 + Math.min(4, k >> 1), B.IRON_BLOCK);
      return;
    }
    set(G, B.GRASS);
  }

  // ---------- Доступ к блокам ----------
  getChunk(cx, cz) { return this.chunks.get(cx + ',' + cz); }

  // ---------- Вода и лава текут ----------
  // Как только рядом что-то поменялось, жидкость проверяет соседей: падает вниз, растекается в стороны
  // (вода на 7 клеток, лава на 3), а без подпитки высыхает. Вода с лавой дают обсидиан или булыжник.
  fluidTouch(x, y, z) {
    for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const id = this.getBlock(x + dx, y + dy, z + dz);
      if (LIQ[id]) this.fluidSchedule(x + dx, y + dy, z + dz, LIQ[id] === 2 ? 1.2 : 0.25);
    }
  }
  fluidSchedule(x, y, z, delay) {
    const k = x + ',' + y + ',' + z, due = this.fluidTime + delay;
    if (!this.fluidQ.has(k) || this.fluidQ.get(k) > due) this.fluidQ.set(k, due);
  }
  tickFluids(dt) {
    this.fluidTime += dt;
    if (!this.fluidQ.size) return;
    const out = new Map(), ready = [];
    for (const [k, due] of this.fluidQ) {
      if (due > this.fluidTime) continue;
      ready.push(k);
      if (ready.length >= 400) break;
    }
    for (const k of ready) {
      this.fluidQ.delete(k);
      const [x, y, z] = k.split(',').map(Number);
      if (this.getChunk(Math.floor(x / CS), Math.floor(z / CS))) this.fluidStep(x, y, z, out);
    }
    if (out.size) this.setBlocks([...out.values()]);
  }
  fluidStep(x, y, z, out) {
    const get = (a, b, c) => { const o = out.get(a + ',' + b + ',' + c); return o ? o[3] : this.getBlock(a, b, c); };
    const put = (a, b, c, id) => { if (b > 0 && b < CH) out.set(a + ',' + b + ',' + c, [a, b, c, id]); };
    const id = get(x, y, z), kind = LIQ[id];
    if (!kind) return;
    const max = kind === 1 ? 7 : 3, lvl = LIQ_LEVEL[id];
    const of = L => (L === 0 ? (kind === 1 ? B.WATER : B.LAVA) : (kind === 1 ? B.WATER_FLOW : B.LAVA_FLOW) + L - 1);
    const H = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const free = n => n === B.AIR || n === B.SNOW_LAYER || n === B.TORCH;
    // встреча воды и лавы
    const meet = (a, b, c, other) => {
      if (kind === 1) put(a, b, c, LIQ_LEVEL[other] === 0 ? B.OBSIDIAN : B.COBBLE);    // вода залила лаву
      else put(a, b, c, LIQ_LEVEL[other] === 0 ? B.STONE : B.COBBLE);                  // лава натекла на воду
    };
    // течение держится, только пока его подпитывают сверху или сбоку
    if (lvl > 0) {
      const above = get(x, y + 1, z);
      let want = LIQ[above] === kind ? 1 : 99;
      let sources = 0;
      for (const [dx, dz] of H) {
        const n = get(x + dx, y, z + dz);
        if (LIQ[n] === kind) { want = Math.min(want, LIQ_LEVEL[n] + 1); if (LIQ_LEVEL[n] === 0) sources++; }
      }
      const below = get(x, y - 1, z);
      if (kind === 1 && sources >= 2 && (IS_SOLID[below] || below === B.WATER)) want = 0;   // между двумя источниками — новый источник
      if (want > max) { put(x, y, z, B.AIR); return; }                                       // высохло
      if (want !== lvl) { put(x, y, z, of(want)); return; }
    }
    // вниз
    const below = get(x, y - 1, z);
    if (LIQ[below] && LIQ[below] !== kind) { meet(x, y - 1, z, below); return; }
    if (free(below) || (LIQ[below] === kind && LIQ_LEVEL[below] > 1)) { put(x, y - 1, z, of(1)); return; }
    // в стороны
    const nl = lvl + 1;
    if (nl > max) return;
    for (const [dx, dz] of H) {
      const n = get(x + dx, y, z + dz);
      if (LIQ[n] && LIQ[n] !== kind) meet(x + dx, y, z + dz, n);
      else if (free(n) || (LIQ[n] === kind && LIQ_LEVEL[n] > nl)) put(x + dx, y, z + dz, of(nl));
    }
  }

  // ---------- Свет от факелов и ламп ----------
  findLights(cx, cz, data) {
    const list = [];
    for (let i = 0; i < data.length; i++) {
      const l = LIGHT[data[i]];
      if (!l) continue;
      const y = Math.floor(i / (CS * CS)), r = i % (CS * CS);
      list.push([cx * CS + (r % CS), y, cz * CS + Math.floor(r / CS), l]);
    }
    if (list.length) this.lights.set(cx + ',' + cz, list); else this.lights.delete(cx + ',' + cz);
  }
  // поставили или убрали источник света — свет пересчитывается и у соседних чанков
  lightChanged(c, x, y, z, id) {
    let list = this.lights.get(c.key) || [];
    list = list.filter(l => l[0] !== x || l[1] !== y || l[2] !== z);
    if (LIGHT[id]) list.push([x, y, z, LIGHT[id]]);
    if (list.length) this.lights.set(c.key, list); else this.lights.delete(c.key);
    const out = [];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const n = this.getChunk(c.cx + dx, c.cz + dz);
      if (n && n.meshed) out.push(n);
    }
    return out;
  }
  // карта освещённости вокруг чанка: от каждого источника свет растекается по воздуху, теряя 2 за шаг
  lightGrid(cx, cz, get) {
    const srcs = [];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const l = this.lights.get((cx + dx) + ',' + (cz + dz));
      if (l) for (const s of l) srcs.push(s);
    }
    if (!srcs.length) return null;
    const P = 8, W = CS + 2 * P, grid = new Uint8Array(W * W * CH);
    const idx = (x, y, z) => (y * W + (z + P)) * W + (x + P);
    const q = [];
    const ox = cx * CS, oz = cz * CS;
    for (const [wx, wy, wz, L] of srcs) {
      const x = wx - ox, z = wz - oz;
      if (x < -P || x >= CS + P || z < -P || z >= CS + P) continue;
      const i = idx(x, wy, z);
      if (grid[i] >= L) continue;
      grid[i] = L;
      q.length = 0; q.push(x, wy, z, L);
      for (let h = 0; h < q.length; h += 4) {
        const qx = q[h], qy = q[h + 1], qz = q[h + 2], nl = q[h + 3] - 2;
        if (nl <= 0) continue;
        for (let f = 0; f < 6; f++) {
          const d = FACES[f].dir, nx = qx + d[0], ny = qy + d[1], nz = qz + d[2];
          if (nx < -P || nx >= CS + P || nz < -P || nz >= CS + P || ny < 0 || ny >= CH) continue;
          const ni = idx(nx, ny, nz);
          if (grid[ni] >= nl || IS_OPAQUE[get(nx, ny, nz)]) continue;
          grid[ni] = nl;
          q.push(nx, ny, nz, nl);
        }
      }
    }
    return { at: (x, y, z) => (x < -P || x >= CS + P || z < -P || z >= CS + P || y < 0 || y >= CH ? 0 : grid[idx(x, y, z)]) };
  }

  // ---------- Мини-блоки ----------
  // внутри клетки кубик (sx, sy, sz) от 0 до 3 лежит под номером (sy * 4 + sz) * 4 + sx
  getMini(x, y, z) { return this.minis.get(x + ',' + y + ',' + z) || null; }
  setMini(x, y, z, sx, sy, sz, id) {
    const key = x + ',' + y + ',' + z;
    let a = this.minis.get(key);
    if (!a) {
      if (!id) return;
      const cur = this.getBlock(x, y, z);
      if (cur !== B.AIR && cur !== B.WATER) return;
      a = new Uint8Array(64);
    }
    a[(sy * 4 + sz) * 4 + sx] = id;
    if (a.every(v => !v)) { this.setBlock(x, y, z, B.AIR); return; }
    this.minis.set(key, a);
    this.setBlock(x, y, z, B.MINI);   // запоминает клетку и перестраивает чанк
  }
  // целый блок рассыпается на 64 таких же маленьких
  splitBlock(x, y, z) {
    const id = this.getBlock(x, y, z);
    this.minis.set(x + ',' + y + ',' + z, new Uint8Array(64).fill(id));
    this.setBlock(x, y, z, B.MINI);
  }
  loadMinis(obj) {
    for (const k in obj || {}) {
      const bin = atob(obj[k]), a = new Uint8Array(64);
      for (let i = 0; i < 64; i++) a[i] = bin.charCodeAt(i);
      this.minis.set(k, a);
    }
  }
  saveMinis() {
    const out = {};
    for (const [k, a] of this.minis) out[k] = btoa(String.fromCharCode(...a));
    return out;
  }

  // блок поставил игрок (а не создал генератор мира)?
  isEdited(x, y, z) {
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    const ed = this.edits[cx + ',' + cz];
    return !!ed && ed[(y * CS + (z - cz * CS)) * CS + (x - cx * CS)] !== undefined;
  }

  getBlock(x, y, z) {
    if (y < 0) return B.BEDROCK;
    if (y >= CH) return B.AIR;
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    const c = this.chunks.get(cx + ',' + cz);
    if (!c) return B.AIR;
    return c.data[(y * CS + (z - cz * CS)) * CS + (x - cx * CS)];
  }

  setBlock(x, y, z, id) {
    if (y < 0 || y >= CH) return false;
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    const c = this.getChunk(cx, cz);
    if (!c) return false;
    const lx = x - cx * CS, lz = z - cz * CS;
    const i = (y * CS + lz) * CS + lx;
    const was = c.data[i];
    c.data[i] = id;
    (this.edits[c.key] || (this.edits[c.key] = {}))[i] = id;
    if (id !== B.MINI) this.minis.delete(x + ',' + y + ',' + z);
    if (LIGHT[was] || LIGHT[id]) { for (const n of this.lightChanged(c, x, y, z, id)) if (n !== c) this.buildMesh(n); }
    this.fluidTouch(x, y, z);
    this.buildMesh(c);
    // соседние чанки тоже перестраиваем, если блок на границе
    const nx = lx === 0 ? -1 : lx === CS - 1 ? 1 : 0;
    const nz = lz === 0 ? -1 : lz === CS - 1 ? 1 : 0;
    const rebuild = (dx, dz) => { const n = this.getChunk(cx + dx, cz + dz); if (n && n.meshed) this.buildMesh(n); };
    if (nx) rebuild(nx, 0);
    if (nz) rebuild(0, nz);
    if (nx && nz) rebuild(nx, nz);
    return true;
  }

  // Много блоков сразу (взрыв): каждый чанк перестраивается один раз
  setBlocks(list) {
    const dirty = new Set();
    for (const [x, y, z, id] of list) {
      if (y < 0 || y >= CH) continue;
      const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
      const c = this.getChunk(cx, cz);
      if (!c) continue;
      const lx = x - cx * CS, lz = z - cz * CS;
      const i = (y * CS + lz) * CS + lx;
      const was = c.data[i];
      c.data[i] = id;
      (this.edits[c.key] || (this.edits[c.key] = {}))[i] = id;
      if (id !== B.MINI) this.minis.delete(x + ',' + y + ',' + z);
      if (LIGHT[was] || LIGHT[id]) for (const n of this.lightChanged(c, x, y, z, id)) dirty.add(n);
      this.fluidTouch(x, y, z);
      dirty.add(c);
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
        if ((dx && (lx === 0 || lx === CS - 1)) || (dz && (lz === 0 || lz === CS - 1))) {
          const n = this.getChunk(cx + dx, cz + dz);
          if (n && n.meshed) dirty.add(n);
        }
      }
    }
    for (const c of dirty) this.buildMesh(c);
  }

  topSolid(x, z) {
    for (let y = CH - 1; y > 0; y--) if (IS_SOLID[this.getBlock(x, y, z)]) return y;
    return 0;
  }

  hasNeighbors(cx, cz) {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!this.chunks.has((cx + dx) + ',' + (cz + dz))) return false;
    }
    return true;
  }

  // ---------- Построение сетки чанка ----------
  buildMesh(chunk) {
    const { cx, cz, data } = chunk;
    const nb = [];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const c = this.getChunk(cx + dx, cz + dz);
      nb.push(c ? c.data : null);
    }
    const get = (x, y, z) => {
      if (y < 0) return B.BEDROCK;
      if (y >= CH) return B.AIR;
      let i = 4;
      if (x < 0) { i -= 1; x += CS; } else if (x >= CS) { i += 1; x -= CS; }
      if (z < 0) { i -= 3; z += CS; } else if (z >= CS) { i += 3; z -= CS; }
      const d = nb[i];
      return d ? d[(y * CS + z) * CS + x] : B.AIR;
    };

    // выше самого верхнего блока чанка ничего не рисуем
    let top = CH - 1;
    for (; top > 0; top--) { let any = false; for (let i = top * CS * CS, e = i + CS * CS; i < e; i++) if (data[i]) { any = true; break; } if (any) break; }
    const nb2 = () => ({ pos: [], uv: [], col: [], nrm: [], wave: [], idx: [] });
    const bufs = { opaque: nb2(), cutout: nb2(), water: nb2() };
    const ao = [0, 0, 0, 0];

    for (let y = 0; y <= top; y++) {
      for (let z = 0; z < CS; z++) {
        for (let x = 0; x < CS; x++) {
          const id = data[(y * CS + z) * CS + x];
          if (!id) continue;
          const bd = BLOCKS[id];
          if (id === B.MINI) { this.meshMinis(cx * CS + x, y, cz * CS + z, x, z, get, bufs); continue; }
          const buf = bufs[bd.layer];
          if (bd.quads) {          // мебель
            for (const q of bd.quads) {
              const base = buf.pos.length / 3;
              for (let k = 0; k < 4; k++) {
                buf.pos.push(x + q.pos[k * 3], y + q.pos[k * 3 + 1], z + q.pos[k * 3 + 2]);
                buf.uv.push(q.uv[k * 2], q.uv[k * 2 + 1]);
                buf.col.push(q.shade * 0.95, q.shade * 0.95, q.shade * 0.95);
                buf.nrm.push(q.dir[0], q.dir[1], q.dir[2]);
                buf.wave.push(0);
              }
              buf.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
            }
            continue;
          }
          const isWater = LIQ[id] === 1, isLava = LIQ[id] === 2;
          const wv = (id === B.LEAVES || isWater) ? 1 : 0;
          const waterTop = (isWater || isLava) && LIQ[get(x, y + 1, z)] !== LIQ[id];
          const topH = waterTop ? liquidHeight(id) : 1;

          for (let f = 0; f < 6; f++) {
            const face = FACES[f];
            const n = face.dir;
            const nid = get(x + n[0], y + n[1], z + n[2]);
            if (IS_OPAQUE[nid]) continue;
            if (nid === id && bd.cullSame) continue;
            if (LIQ[id] && LIQ[nid] === LIQ[id] && (f !== 3 || !waterTop)) continue;   // вода рядом с водой, лава рядом с лавой
            if (isWater && BLOCKS[nid] && BLOCKS[nid].coral) continue;      // кораллы стоят в воде

            for (let k = 0; k < 4; k++) {
              if (isWater || isLava) { ao[k] = 3; continue; }
              const o = face.ao[k];
              const s1 = IS_OPAQUE[get(x + o[0][0], y + o[0][1], z + o[0][2])];
              const s2 = IS_OPAQUE[get(x + o[1][0], y + o[1][1], z + o[1][2])];
              const co = IS_OPAQUE[get(x + o[2][0], y + o[2][1], z + o[2][2])];
              ao[k] = (s1 && s2) ? 0 : 3 - (s1 + s2 + co);
            }

            const tile = bd.tex[face.texSlot];
            const base = buf.pos.length / 3;
            for (let k = 0; k < 4; k++) {
              const c = face.corners[k];
              const py = (waterTop && c[1]) ? y + topH : y + c[1];
              buf.pos.push(x + c[0], py, z + c[2]);
              const t = tileUV(tile, c[3], c[4]);
              buf.uv.push(t[0], t[1]);
              const l = face.shade * AO_LEVELS[ao[k]];
              buf.col.push(l, l, l);
              buf.nrm.push(n[0], n[1], n[2]);
              buf.wave.push(wv);
            }
            if (ao[1] + ao[2] > ao[0] + ao[3]) {
              buf.idx.push(base, base + 1, base + 3, base, base + 3, base + 2);
            } else {
              buf.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
            }
          }
        }
      }
    }

    // свет от факелов и ламп: у каждой грани — сколько света в клетке перед ней
    const lg = this.lightGrid(cx, cz, get);
    for (const layer of ['opaque', 'cutout', 'water']) {
      const b = bufs[layer], n = b.pos.length / 3;
      b.light = new Float32Array(n);
      if (!lg) continue;
      for (let v = 0; v < n; v += 4) {
        let mx = 0, my = 0, mz = 0;
        for (let k = 0; k < 4; k++) { mx += b.pos[(v + k) * 3]; my += b.pos[(v + k) * 3 + 1]; mz += b.pos[(v + k) * 3 + 2]; }
        const L = lg.at(Math.floor(mx / 4 + b.nrm[v * 3] * 0.5), Math.floor(my / 4 + b.nrm[v * 3 + 1] * 0.5), Math.floor(mz / 4 + b.nrm[v * 3 + 2] * 0.5)) / 14;
        b.light[v] = b.light[v + 1] = b.light[v + 2] = b.light[v + 3] = L;
      }
    }
    for (const layer of ['opaque', 'cutout', 'water']) {
      const old = chunk.meshes[layer];
      if (old) { this.scene.remove(old); old.geometry.dispose(); chunk.meshes[layer] = null; }
      const b = bufs[layer];
      if (!b.idx.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.setAttribute('aNormal', new THREE.Float32BufferAttribute(b.nrm, 3));
      g.setAttribute('aWave', new THREE.Float32BufferAttribute(b.wave, 1));
      g.setAttribute('aLight', new THREE.BufferAttribute(b.light, 1));
      g.setIndex(b.idx);
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, this.materials[layer]);
      mesh.position.set(cx * CS, 0, cz * CS);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      if (layer === 'water') mesh.renderOrder = 1;
      this.scene.add(mesh);
      chunk.meshes[layer] = mesh;
    }
    chunk.dirty = false;
    chunk.meshed = true;
  }

  // мини-блоки одной клетки: у каждого кубика рисуем только те грани, которые ничем не закрыты
  meshMinis(wx, y, wz, x, z, get, bufs) {
    const a = this.getMini(wx, y, wz);
    if (!a) return;
    for (let i = 0; i < 64; i++) {
      const id = a[i];
      if (!id) continue;
      const bd = BLOCKS[id], buf = bufs[bd.layer] || bufs.opaque;
      const sx = i & 3, sz = (i >> 2) & 3, sy = i >> 4;
      for (let f = 0; f < 6; f++) {
        const face = FACES[f], n = face.dir;
        const tx = sx + n[0], ty = sy + n[1], tz = sz + n[2];
        let nid;
        if (tx >= 0 && tx < 4 && ty >= 0 && ty < 4 && tz >= 0 && tz < 4) nid = a[(ty * 4 + tz) * 4 + tx];
        else {
          nid = get(x + n[0], y + n[1], z + n[2]);
          if (nid === B.MINI) {
            const b = this.getMini(wx + n[0], y + n[1], wz + n[2]);
            nid = b ? b[(((ty + 4) & 3) * 4 + ((tz + 4) & 3)) * 4 + ((tx + 4) & 3)] : 0;
          }
        }
        if (IS_OPAQUE[nid]) continue;
        if (nid === id && bd.cullSame) continue;
        const tile = bd.tex[face.texSlot];
        const base = buf.pos.length / 3;
        for (let k = 0; k < 4; k++) {
          const c = face.corners[k];
          buf.pos.push(x + (sx + c[0]) / 4, y + (sy + c[1]) / 4, z + (sz + c[2]) / 4);
          const t = tileUV(tile, c[3], c[4]);
          buf.uv.push(t[0], t[1]);
          const l = face.shade * AO_LEVELS[3];
          buf.col.push(l, l, l);
          buf.nrm.push(n[0], n[1], n[2]);
          buf.wave.push(0);
        }
        buf.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
      }
    }
  }

  // смена материалов (например, при включении шейдеров)
  setMaterials(mats) {
    this.materials = mats;
    for (const c of this.chunks.values()) {
      for (const layer in c.meshes) if (c.meshes[layer]) c.meshes[layer].material = mats[layer];
    }
  }

  unload(chunk) {
    for (const layer in chunk.meshes) {
      const m = chunk.meshes[layer];
      if (m) { this.scene.remove(m); m.geometry.dispose(); }
    }
    this.chunks.delete(chunk.key);
  }

  dispose() {
    for (const c of [...this.chunks.values()]) this.unload(c);
  }

  // Подгрузка чанков вокруг игрока (не дольше budget мс за кадр)
  update(px, pz, budget) {
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
    const R = this.renderDist;
    const t0 = performance.now();
    for (const [dx, dz] of this.offsets) {
      if (performance.now() - t0 > budget) break;
      const cx = pcx + dx, cz = pcz + dz;
      const key = cx + ',' + cz;
      const c = this.chunks.get(key);
      if (!c) { this.chunks.set(key, this.generate(cx, cz)); continue; }
      if (c.dirty && Math.abs(dx) <= R && Math.abs(dz) <= R && this.hasNeighbors(cx, cz)) this.buildMesh(c);
    }
    if (++this.frame % 30 === 0) {
      for (const c of [...this.chunks.values()]) {
        if (Math.abs(c.cx - pcx) > R + 2 || Math.abs(c.cz - pcz) > R + 2) this.unload(c);
      }
    }
  }

  // Доля готовых чанков вокруг точки (для экрана загрузки)
  readiness(px, pz, r) {
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
    let ok = 0, total = 0;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      total++;
      const c = this.getChunk(pcx + dx, pcz + dz);
      if (c && c.meshed) ok++;
    }
    return ok / total;
  }
}
