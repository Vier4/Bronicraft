'use strict';

// Мод «Самолёты»: самолёт летит туда, куда смотрит игрок. W — газ, S — тормоз.
// Медленный самолёт не держится в воздухе — нужно разогнаться для взлёта.
// small — маленький самолёт, boeing — большой пассажирский лайнер
const PLANE_TYPES = {
  small: { hw: 1.0, h: 1.6, max: 32, lift: 9, turn: 1.1, hp: 4, seat: [0, 0.75, 0.45], cam: 5 },
  boeing: { hw: 1.8, h: 3.4, max: 48, lift: 16, turn: 0.55, hp: 8, seat: [0, 2.3, 7.2], cam: 16 },
};

class Planes {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.geo = {};
  }

  box(w, h, d) {
    const k = w + ',' + h + ',' + d;
    return this.geo[k] || (this.geo[k] = new THREE.BoxGeometry(w, h, d));
  }

  add(x, y, z, yaw, colors, type) {
    type = PLANE_TYPES[type] ? type : 'small';
    const g = new THREE.Group();     // поворот по курсу
    const body = new THREE.Group();  // наклон носа и крен
    body.position.y = type === 'boeing' ? 1.95 : type === 'airliner' ? 4.05 : type === 'cessna' ? 1.2 : 0.9;
    g.add(body);
    const mats = [], gearParts = [];
    const glass = new THREE.MeshBasicMaterial({ color: 0xa8d4f0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    glass.userData.base = new THREE.Color(0xa8d4f0);
    mats.push(glass);
    const part = (w, h, d, px, py, pz, c, parent) => {
      if (parent === 'glass') {                                // прозрачные стёкла кабины и иллюминаторов
        const m = new THREE.Mesh(this.box(w, h, d), glass);
        m.position.set(px, py, pz); m.renderOrder = 2;
        body.add(m);
        return m;
      }
      const mat = new THREE.MeshBasicMaterial({ color: c });
      mat.userData.base = new THREE.Color(c);
      if (parent === 'glow') { mat.userData.glow = true; parent = null; }
      mats.push(mat);
      const m = new THREE.Mesh(this.box(w, h, d), mat);
      m.position.set(px, py, pz);
      (parent || body).add(m);
      return m;
    };
    const [main, stripe] = colors;
    const prop = new THREE.Group();
    if (type === 'boeing') this.buildBoeing(part, body, main, stripe);
    else if (PLANE_TYPES[type].real) realPlaneModel(type, part, body, prop, (...a) => { const m = part(...a); gearParts.push(m); return m; }, main, stripe);
    else this.buildSmall(part, body, prop, main, stripe);
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    this.scene.add(g);
    const t = PLANE_TYPES[type];
    const plane = {
      kind: 'plane', type, t, pos: new THREE.Vector3(x, y, z), yaw, pitch: 0, roll: 0, speed: 0, vy: 0,
      colors, group: g, body, prop, mats, hp: t.hp, shake: 0, onGround: false, throttle: 0, gearParts,
    };
    this.list.push(plane);
    return plane;
  }

  buildBoeing(part, body, main, stripe) {
    const grey = 0x9aa0ad, dark = 0x1d2433;
    part(2.2, 2.4, 16, 0, 0, 0, main);                         // фюзеляж
    part(2.22, 0.35, 15.5, 0, -0.75, 0, stripe);               // полоса
    part(1.9, 2.0, 1.2, 0, -0.1, 8.6, main);                   // нос
    part(1.3, 1.1, 0.7, 0, -0.35, 9.5, main);
    part(1.5, 0.35, 0.2, 0, 0.45, 9.15, dark);                 // окна пилотов
    for (let k = -6; k <= 6; k++) {                            // иллюминаторы
      part(0.04, 0.32, 0.38, 1.11, 0.35, k * 1.05, dark);
      part(0.04, 0.32, 0.38, -1.11, 0.35, k * 1.05, dark);
    }
    part(18, 0.25, 3, 0, -0.65, 0.5, 0xdfe2e8);               // крылья
    part(1.2, 0.27, 3.02, 8.4, -0.65, 0.5, stripe); part(1.2, 0.27, 3.02, -8.4, -0.65, 0.5, stripe);
    for (const ex of [3.6, -3.6]) {                            // двигатели
      part(1.0, 1.0, 2.4, ex, -1.35, 1.4, grey);
      part(0.8, 0.8, 0.1, ex, -1.35, 2.62, dark);
    }
    part(6.5, 0.2, 1.7, 0, 0.7, -7.3, 0xdfe2e8);              // хвост
    part(0.28, 3.2, 2.4, 0, 2.7, -7.2, stripe);                // киль
    part(0.3, 0.9, 0.5, 0, -1.55, 6, 0x333338); part(0.4, 0.5, 0.6, 0, -1.75, 6, 0x222226);   // шасси
    for (const gx of [1.3, -1.3]) { part(0.3, 0.9, 0.5, gx, -1.55, 0.2, 0x333338); part(0.45, 0.6, 0.7, gx, -1.7, 0.2, 0x222226); }
  }

  buildSmall(part, body, prop, main, stripe) {
    part(0.9, 0.9, 3.6, 0, 0, 0, main);                       // фюзеляж
    part(0.92, 0.2, 3.62, 0, 0.1, 0, stripe);                  // полоска вдоль
    part(0.7, 0.7, 0.35, 0, 0, 1.95, 0x555560);                // нос
    part(0.7, 0.45, 0.9, 0, 0.62, 0.45, 0xbfe6ff);             // кабина
    part(5.0, 0.12, 1.1, 0, -0.05, 0.35, main);                // крылья
    part(0.9, 0.13, 1.12, 2.1, -0.05, 0.35, stripe);           // кончики крыльев
    part(0.9, 0.13, 1.12, -2.1, -0.05, 0.35, stripe);
    part(2.0, 0.1, 0.6, 0, 0.25, -1.55, main);                 // хвостовое крыло
    part(0.1, 0.8, 0.7, 0, 0.75, -1.55, stripe);               // киль
    part(0.12, 0.5, 0.12, 0.55, -0.55, 0.6, 0x333338); part(0.12, 0.5, 0.12, -0.55, -0.55, 0.6, 0x333338);
    part(0.2, 0.3, 0.3, 0.55, -0.75, 0.6, 0x222226); part(0.2, 0.3, 0.3, -0.55, -0.75, 0.6, 0x222226);
    part(0.15, 0.3, 0.2, 0, -0.55, -1.5, 0x222226);
    prop.position.set(0, 0, 2.17);
    body.add(prop);
    part(0.12, 1.7, 0.06, 0, 0, 0, 0x2a2a2a, prop);
    part(0.16, 0.16, 0.12, 0, 0, 0.02, 0xc8c8c8, prop);
  }

  // input: { throttle: -1..1, yaw, pitch } — куда смотрит пилот
  update(dt, world, driving, input, light) {
    for (const pl of this.list) {
      const c = world.getChunk(Math.floor(pl.pos.x / CS), Math.floor(pl.pos.z / CS));
      if (!c || !c.meshed) continue;
      const inp = pl === driving ? input : null;
      const t = pl.t;
      if (inp && t.real) {
        // рычаг газа: W прибавляет, S убавляет; скорость догоняет газ не сразу; на земле S — тормоз
        pl.throttle = Math.max(0, Math.min(1, pl.throttle + inp.throttle * 0.45 * dt));
        const want = pl.throttle * t.max;
        pl.speed += Math.max(-t.accel, Math.min(t.accel, (want - pl.speed) * 0.6)) * dt;
        if (pl.onGround && inp.throttle < 0 && pl.throttle === 0) pl.speed = Math.max(0, pl.speed - 8 * dt);
        pl.speed = Math.max(0, Math.min(t.max, pl.speed));
      } else if (inp) pl.speed = Math.max(0, Math.min(t.max, pl.speed + inp.throttle * 9 * dt));
      else pl.speed *= Math.max(0, 1 - dt * (pl.onGround ? 1.5 : 0.3));
      if (pl.speed < 0.05) pl.speed = 0;

      const lift = Math.max(0, Math.min(1, (pl.speed - t.lift * 0.6) / (t.lift * 0.4)));
      let wantRoll = 0;
      if (inp) {
        let dy = inp.yaw - pl.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        const rate = pl.onGround ? t.turn * 1.5 : t.turn;
        pl.yaw += Math.max(-rate * dt, Math.min(rate * dt, dy));
        if (!pl.onGround) wantRoll = Math.max(-0.7, Math.min(0.7, -dy * 1.4));
        let wantPitch = Math.max(-0.7, Math.min(0.7, inp.pitch));
        if (lift < 1) wantPitch = Math.min(wantPitch, lift * 0.5);     // без скорости нос не поднять
        if (pl.onGround) wantPitch = Math.max(0, wantPitch);
        pl.pitch += (wantPitch - pl.pitch) * Math.min(1, dt * 2.5);
      } else {
        pl.pitch += (0 - pl.pitch) * Math.min(1, dt * 2);
      }
      pl.roll += (wantRoll - pl.roll) * Math.min(1, dt * 3);

      // если скорости мало — самолёт падает, если много — летит по направлению носа
      if (lift < 1) pl.vy = Math.max(pl.vy - 22 * (1 - lift) * dt, -30);
      else pl.vy += (0 - pl.vy) * Math.min(1, dt * 3);
      const cp = Math.cos(pl.pitch);
      const v = new THREE.Vector3(
        Math.sin(pl.yaw) * cp * pl.speed,
        Math.sin(pl.pitch) * pl.speed * lift + pl.vy,
        Math.cos(pl.yaw) * cp * pl.speed);
      const inWater = world.getBlock(Math.floor(pl.pos.x), Math.floor(pl.pos.y + 0.3), Math.floor(pl.pos.z)) === B.WATER || isWaterB(world.getBlock(Math.floor(pl.pos.x), Math.floor(pl.pos.y + 0.3), Math.floor(pl.pos.z)));
      if (inWater) { v.y = Math.max(v.y, 1); pl.speed *= Math.max(0, 1 - dt * 2); }
      const r = moveBox(world, pl.pos, v, t.hw, t.h, dt);
      pl.onGround = r.onGround;
      if (pl.onGround) pl.vy = 0;
      if (r.hitWall) {
        const up = pl.pos.clone();
        up.y += 1.05;
        if (pl.onGround && pl.speed < 12 && !boxCollides(world, up, t.hw, t.h)) pl.pos.copy(up);
        else { if (pl.speed > 8) pl.shake = 1; pl.speed *= 0.2; }
      }

      pl.shake = Math.max(0, pl.shake - dt * 3);
      pl.group.position.copy(pl.pos);
      pl.group.position.x += Math.sin(pl.shake * 40) * pl.shake * 0.08;
      pl.group.rotation.y = pl.yaw;
      pl.body.rotation.set(-pl.pitch, 0, pl.roll);
      pl.prop.rotation.z += (pl.speed * 1.5 + (inp ? 12 : 0) + (pl.throttle || 0) * 40) * dt;
      // шасси убираются, когда самолёт высоко над землёй
      if (pl.gearParts.length) {
        const ground = world.topSolid(Math.floor(pl.pos.x), Math.floor(pl.pos.z));
        const show = pl.onGround || pl.pos.y - ground < 7;
        for (const m of pl.gearParts) m.visible = show;
      }
      const blink = Math.floor(performance.now() / 600) % 2;
      for (const m of pl.mats) {
        if (m.userData.glow) { m.color.copy(m.userData.base).multiplyScalar(m.userData.base.getHex() === 0xffffff ? (blink ? 1 : 0.2) : 1); continue; }
        m.color.copy(m.userData.base).multiplyScalar(light);
      }
    }
  }

  raycast(o, d, maxDist) {
    let best = null;
    for (const pl of this.list) {
      const hw = pl.t.hw;
      const min = [pl.pos.x - hw, pl.pos.y, pl.pos.z - hw], max = [pl.pos.x + hw, pl.pos.y + pl.t.h, pl.pos.z + hw];
      const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
      let t0 = 0, t1 = maxDist;
      for (let a = 0; a < 3 && t0 <= t1; a++) {
        if (Math.abs(dd[a]) < 1e-9) { if (oo[a] < min[a] || oo[a] > max[a]) t0 = Infinity; continue; }
        let ta = (min[a] - oo[a]) / dd[a], tb = (max[a] - oo[a]) / dd[a];
        if (ta > tb) { const t = ta; ta = tb; tb = t; }
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      }
      if (t0 <= t1 && (!best || t0 < best.t)) best = { car: pl, t: t0 };
    }
    return best;
  }

  remove(pl) {
    this.scene.remove(pl.group);
    pl.mats.forEach(m => m.dispose());
    this.list.splice(this.list.indexOf(pl), 1);
  }

  clear() {
    while (this.list.length) this.remove(this.list[0]);
  }

  serialize() {
    return this.list.map(p => ({ x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, colors: p.colors, type: p.type }));
  }
}
