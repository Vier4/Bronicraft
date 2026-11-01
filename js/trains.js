'use strict';

// Мод «Метро»: поезд едет по рельсам туда-обратно, останавливается на станциях
// (там, где под рельсами лежит мрамор) и разворачивается, когда рельсы кончаются.
const TRAIN_CAR = 6.2;          // длина вагона вместе с промежутком
const TRAIN_HW = 1.4, TRAIN_H = 3.3;
const isRail = id => !!BLOCKS[id] && BLOCKS[id].base === B.RAIL;

class Trains {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.geo = {};
  }

  box(w, h, d) {
    const k = w + ',' + h + ',' + d;
    return this.geo[k] || (this.geo[k] = new THREE.BoxGeometry(w, h, d));
  }

  // o: { axis: 'x'|'z', cross, y (высота блока рельсов), s (середина поезда вдоль пути), dir: ±1, color, cars, parked }
  // cart: true — вагонетка: один маленький вагончик, сама не едет, только когда в ней сидят и жмут W/S
  add(o) {
    const t = Object.assign({ cars: 3, dir: 1, v: 0, wait: 0, manual: false, lastStop: null, hp: 6, shake: 0 }, o);
    t.kind = 'train';
    if (t.cart) { t.cars = 1; t.parked = true; t.hp = 3; }
    t.carLen = t.cart ? 1.4 : TRAIN_CAR;
    t.mats = [];
    t.flash = [];
    t.groups = [];
    for (let k = 0; k < t.cars; k++) {
      const g = t.cart ? this.buildCart(t) : this.buildCar(t, k === 0, k === t.cars - 1);
      this.scene.add(g);
      t.groups.push(g);
    }
    this.list.push(t);
    this.place(t);
    return t;
  }

  buildCar(t, cabFront, cabBack) {
    const g = new THREE.Group();
    const part = (w, h, d, x, y, z, c) => {
      const mat = new THREE.MeshBasicMaterial({ color: c });
      mat.userData.base = new THREE.Color(c);
      t.mats.push(mat);
      const m = new THREE.Mesh(this.box(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    part(2.8, 2.9, 5.8, 0, 1.75, 0, 0xeef0f2);            // кузов
    part(2.82, 0.3, 5.82, 0, 1.0, 0, t.color);             // полоса цвета линии
    part(2.84, 0.75, 4.4, 0, 2.25, 0, 0x1b2a44);           // окна
    for (const dz of [-1.5, 1.5]) part(2.86, 1.9, 0.9, 0, 1.5, dz, 0x9aa3ad);   // двери
    part(2.6, 0.15, 5.6, 0, 3.27, 0, 0xb4b8bf);            // крыша
    for (const dz of [-2, 2]) part(2.2, 0.4, 1.4, 0, 0.25, dz, 0x2a2a2e);       // тележки с колёсами
    for (const dz of [-1.2, 1.2]) part(1.0, 0.5, 0.6, 0.5, 0.95, dz, 0x5a6a80); // сиденья внутри
    for (const [cab, sg] of [[cabFront, 1], [cabBack, -1]]) {
      if (!cab) continue;
      part(2.4, 1.0, 0.06, 0, 2.25, sg * 2.92, 0x10203a);  // лобовое стекло
      part(2.6, 0.3, 0.06, 0, 1.0, sg * 2.92, t.color);
      t.flash.push(part(0.35, 0.25, 0.06, 0.85, 0.75, sg * 2.93, sg > 0 ? 0xfff2a0 : 0xff3030));
      t.flash.push(part(0.35, 0.25, 0.06, -0.85, 0.75, sg * 2.93, sg > 0 ? 0xfff2a0 : 0xff3030));
    }
    return g;
  }

  buildCart(t) {
    const g = new THREE.Group();
    const part = (w, h, d, x, y, z, c) => {
      const mat = new THREE.MeshBasicMaterial({ color: c });
      mat.userData.base = new THREE.Color(c);
      t.mats.push(mat);
      const m = new THREE.Mesh(this.box(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
    };
    const iron = 0x9a9ca2, dark = 0x55575c;
    part(1.0, 0.1, 1.2, 0, 0.3, 0, dark);                      // дно
    part(0.08, 0.55, 1.2, 0.5, 0.6, 0, iron); part(0.08, 0.55, 1.2, -0.5, 0.6, 0, iron);
    part(1.0, 0.55, 0.08, 0, 0.6, 0.6, iron); part(1.0, 0.55, 0.08, 0, 0.6, -0.6, iron);
    for (const [x, z] of [[0.45, 0.4], [-0.45, 0.4], [0.45, -0.4], [-0.45, -0.4]]) part(0.1, 0.24, 0.24, x, 0.18, z, 0x2a2a2e);
    return g;
  }

  // точка на пути: along — координата вдоль рельсов
  point(t, along, up) {
    return t.axis === 'z'
      ? new THREE.Vector3(t.cross, t.y + (up || 0), along)
      : new THREE.Vector3(along, t.y + (up || 0), t.cross);
  }
  railAt(world, t, along) {
    const p = this.point(t, along);
    return isRail(world.getBlock(Math.floor(p.x), t.y, Math.floor(p.z)));
  }
  carAlong(t, k) {
    const len = t.cars * t.carLen;
    return t.s + t.dir * (len / 2 - t.carLen * (k + 0.5));
  }

  place(t) {
    const yaw = (t.axis === 'z' ? 0 : Math.PI / 2) + (t.dir > 0 ? 0 : Math.PI);
    t.groups.forEach((g, k) => {
      const p = this.point(t, this.carAlong(t, k));
      g.position.set(p.x + (t.axis === 'z' ? Math.sin(t.shake * 40) * t.shake * 0.06 : 0), p.y, p.z);
      g.rotation.y = yaw;
    });
  }

  // input: { throttle: -1..1 } — для поезда, в котором едет игрок; onStop(t) — поезд встал на станции
  update(dt, world, riding, input, light, onStop) {
    const ACC = 3, DEC = 5, MAX = 11;
    for (const t of this.list) {
      const head = this.point(t, t.s);
      const c = world.getChunk(Math.floor(head.x / CS), Math.floor(head.z / CS));
      if (!c || !c.meshed) continue;
      const len = t.cars * t.carLen;
      const inp = t === riding ? input : null;
      if (inp && inp.throttle) t.manual = true;

      const stopDist = t.v * t.v / (2 * DEC) + 0.6;
      const endAhead = !this.railAt(world, t, t.s + t.dir * (len / 2 + stopDist));
      const mid = this.point(t, t.s);
      const atStation = world.getBlock(Math.floor(mid.x), t.y - 1, Math.floor(mid.z)) === B.MARBLE;
      const key = atStation ? Math.round(t.s / 24) : null;

      if (t.wait > 0) {
        t.wait -= dt;
        t.v = 0;
      } else if (t.manual) {
        // машинист: W — разгон, S — тормоз, на месте S — поменять направление
        const th = inp ? inp.throttle : 0;
        if (th > 0) t.v = Math.min(t.cart ? 8 : MAX + 3, t.v + ACC * 1.5 * dt);
        else if (th < 0) {
          if (t.v > 0) t.v = Math.max(0, t.v - DEC * 1.5 * dt);
          else if (!t.flipLock) { t.dir = -t.dir; t.flipLock = true; t.lastStop = null; }
        } else t.v = Math.max(0, t.v - 0.5 * dt);
        if (th >= 0) t.flipLock = false;
        if (endAhead) t.v = Math.max(0, t.v - DEC * 3 * dt);
        if (!inp) t.manual = false;
      } else {
        let target = t.parked ? 0 : MAX;
        if (endAhead) target = 0;
        if (atStation && t.lastStop !== key) target = 0;
        if (t.v < target) t.v = Math.min(target, t.v + ACC * dt);
        else t.v = Math.max(target, t.v - DEC * dt);
        if (t.v === 0 && !t.parked) {
          if (atStation && t.lastStop !== key) { t.lastStop = key; t.wait = 5; onStop(t); }
          else if (endAhead) { t.dir = -t.dir; t.wait = 4; t.lastStop = atStation ? key : null; }   // на обратном пути снова встаём на станциях
        }
      }
      t.s += t.dir * t.v * dt;
      t.shake = Math.max(0, t.shake - dt * 3);
      this.place(t);
      for (const m of t.mats) m.color.copy(m.userData.base).multiplyScalar(light);
      for (const f of t.flash) f.material.color.copy(f.material.userData.base);   // фары светят всегда
    }
  }

  raycast(o, d, maxDist) {
    let best = null;
    for (const t of this.list) {
      for (let k = 0; k < t.cars; k++) {
        const p = this.point(t, this.carAlong(t, k));
        const half = t.carLen / 2, wide = t.cart ? 0.55 : TRAIN_HW, top = t.cart ? 0.9 : TRAIN_H;
        const hx = t.axis === 'z' ? wide : half, hz = t.axis === 'z' ? half : wide;
        const min = [p.x - hx, p.y + 0.1, p.z - hz], max = [p.x + hx, p.y + top, p.z + hz];
        const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
        let t0 = 0, t1 = maxDist;
        for (let a = 0; a < 3 && t0 <= t1; a++) {
          if (Math.abs(dd[a]) < 1e-9) { if (oo[a] < min[a] || oo[a] > max[a]) t0 = Infinity; continue; }
          let ta = (min[a] - oo[a]) / dd[a], tb = (max[a] - oo[a]) / dd[a];
          if (ta > tb) { const tt = ta; ta = tb; tb = tt; }
          t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
        }
        if (t0 <= t1 && (!best || t0 < best.t)) best = { car: t, t: t0 };
      }
    }
    return best;
  }

  // место сиденья машиниста в головном вагоне
  seat(t) {
    if (t.cart) return this.point(t, t.s, 0.15);
    const len = t.cars * t.carLen;
    return this.point(t, t.s + t.dir * (len / 2 - 2.2), 0.45);
  }

  // где выйти из поезда: на платформу сбоку (только если поезд стоит)
  exitSpot(world, t) {
    if (t.v > 0.3) return null;
    const offs = t.cart ? [1.2, 2] : [3, 4, 2.5];
    for (const dy of t.cart ? [0, 1] : [1]) for (const off of offs) for (const side of [-1, 1]) {
      const p = t.axis === 'z' ? new THREE.Vector3(t.cross + side * off, t.y + dy, t.s) : new THREE.Vector3(t.s, t.y + dy, t.cross + side * off);
      if (!boxCollides(world, p, 0.3, 1.8) && IS_SOLID[world.getBlock(Math.floor(p.x), Math.floor(p.y) - 1, Math.floor(p.z))]) return p;
    }
    return t.cart ? this.point(t, t.s, 1) : null;     // из вагонетки можно вылезти и наверх
  }

  remove(t) {
    t.groups.forEach(g => this.scene.remove(g));
    t.mats.forEach(m => m.dispose());
    this.list.splice(this.list.indexOf(t), 1);
  }

  clear() {
    while (this.list.length) this.remove(this.list[0]);
  }

  serialize() {
    return this.list.map(t => ({ axis: t.axis, cross: t.cross, y: t.y, s: t.s, dir: t.dir, color: t.color, cars: t.cars, parked: !!t.parked, cart: !!t.cart }));
  }
}
