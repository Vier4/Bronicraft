'use strict';

// Мод «Машины»: машинки можно поставить, сесть в них и ездить
const CAR_HW = 0.8, CAR_H = 1.45;

class Cars {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.geo = {};
  }

  box(w, h, d) {
    const k = w + ',' + h + ',' + d;
    return this.geo[k] || (this.geo[k] = new THREE.BoxGeometry(w, h, d));
  }

  // style: 'police' — полиция с синей полосой и мигалками, 'ambulance' — скорая с красным крестом
  add(x, y, z, yaw, color, style) {
    if (typeof REAL_CARS !== 'undefined' && REAL_CARS[style]) {     // мод «Реалистичный транспорт»
      const g = new THREE.Group();
      g.position.set(x, y, z); g.rotation.y = yaw;
      this.scene.add(g);
      const car = { kind: 'car', pos: new THREE.Vector3(x, y, z), vy: 0, speed: 0, yaw, color, style, flash: [], group: g, mats: [], wheels: [], hp: 3, shake: 0, onGround: false };
      this.addReal(car, style, color);
      this.list.push(car);
      return car;
    }
    const g = new THREE.Group();
    const mats = [];
    const part = (w, h, d, px, py, pz, c) => {
      const mat = new THREE.MeshBasicMaterial({ color: c });
      mat.userData.base = new THREE.Color(c);
      mats.push(mat);
      const m = new THREE.Mesh(this.box(w, h, d), mat);
      m.position.set(px, py, pz);
      g.add(m);
      return m;
    };
    const body = new THREE.Color(color);
    const dark = body.clone().multiplyScalar(0.7).getHex();
    part(1.6, 0.55, 2.6, 0, 0.6, 0, color);                 // кузов
    part(1.62, 0.12, 2.62, 0, 0.36, 0, 0x333338);           // низ
    part(1.4, 0.5, 1.3, 0, 1.12, -0.2, 0xbfe6ff);           // стёкла
    part(1.45, 0.1, 1.4, 0, 1.42, -0.2, color);             // крыша
    part(0.1, 0.5, 0.1, 0.68, 1.12, 0.42, dark); part(0.1, 0.5, 0.1, -0.68, 1.12, 0.42, dark);
    part(0.3, 0.16, 0.04, 0.5, 0.66, 1.31, 0xfff2a0); part(0.3, 0.16, 0.04, -0.5, 0.66, 1.31, 0xfff2a0); // фары
    part(0.3, 0.14, 0.04, 0.5, 0.66, -1.31, 0xff3030); part(0.3, 0.14, 0.04, -0.5, 0.66, -1.31, 0xff3030);
    part(1.5, 0.14, 0.1, 0, 0.42, 1.32, 0x888890); part(1.5, 0.14, 0.1, 0, 0.42, -1.32, 0x888890); // бамперы
    const flash = [];
    if (style === 'police' || style === 'ambulance') {
      const stripe = style === 'police' ? 0x2050c0 : 0xd02020;
      part(0.04, 0.16, 2.3, 0.81, 0.62, 0, stripe); part(0.04, 0.16, 2.3, -0.81, 0.62, 0, stripe);
      flash.push(part(0.45, 0.14, 0.3, 0.28, 1.54, -0.2, style === 'police' ? 0x3060ff : 0xff3030));
      flash.push(part(0.45, 0.14, 0.3, -0.28, 1.54, -0.2, 0xff3030));
      if (style === 'ambulance') {
        part(0.5, 0.02, 0.16, 0, 1.48, -0.55, 0xd02020); part(0.16, 0.02, 0.5, 0, 1.48, -0.55, 0xd02020);
      }
    }
    const wheels = [];
    for (const [wx, wz] of [[0.82, 0.85], [-0.82, 0.85], [0.82, -0.85], [-0.82, -0.85]]) {
      const w = part(0.26, 0.6, 0.6, wx, 0.3, wz, 0x222226);
      const cap = part(0.28, 0.22, 0.22, 0, 0, 0, 0x9a9aa2);   // колпак крутится вместе с колесом
      w.add(cap);
      wheels.push(w);
    }
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    this.scene.add(g);
    const car = { kind: 'car', pos: new THREE.Vector3(x, y, z), vy: 0, speed: 0, yaw, color, style, flash, group: g, mats, wheels, hp: 3, shake: 0, onGround: false };
    this.list.push(car);
    return car;
  }

  // input: { fwd: -1..1, turn: -1..1 } — только для машины, в которой сидит игрок
  update(dt, world, driving, input, light) {
    for (const car of this.list) {
      const c = world.getChunk(Math.floor(car.pos.x / CS), Math.floor(car.pos.z / CS));
      if (!c || !c.meshed) continue;
      if (car.held || car.frozen) { car.group.position.copy(car.pos); car.group.rotation.y = car.yaw; car.vy = 0; continue; }   // в луче физгана
      const inp = car === driving ? input : null;
      if (car.real) { this.updateReal(car, dt, world, inp, light, performance.now() / 1000); continue; }
      if (inp && inp.fwd) {
        const accel = inp.fwd * (Math.sign(car.speed) === -inp.fwd ? 22 : 10);
        car.speed = Math.max(-5, Math.min(14, car.speed + accel * dt));
      } else {
        car.speed *= Math.max(0, 1 - dt * 1.2);
        if (Math.abs(car.speed) < 0.05) car.speed = 0;
      }
      if (inp && inp.turn) {
        const k = Math.max(-1, Math.min(1, car.speed / 5));
        car.yaw += inp.turn * dt * 1.9 * k;
      }
      const inWater = world.getBlock(Math.floor(car.pos.x), Math.floor(car.pos.y + 0.3), Math.floor(car.pos.z)) === B.WATER || isWaterB(world.getBlock(Math.floor(car.pos.x), Math.floor(car.pos.y + 0.3), Math.floor(car.pos.z)));
      car.vy = inWater ? Math.min(car.vy + 20 * dt, 1.5) : Math.max(car.vy - 28 * dt, -40);
      if (inWater) car.speed *= Math.max(0, 1 - dt * 2);
      const v = new THREE.Vector3(Math.sin(car.yaw) * car.speed + (car.px || 0), car.vy, Math.cos(car.yaw) * car.speed + (car.pz || 0));
      if (car.px || car.pz) { const k = Math.max(0, 1 - dt * (car.onGround ? 4 : 0.3)); car.px *= k; car.pz *= k; if (Math.abs(car.px) + Math.abs(car.pz) < 0.05) car.px = car.pz = 0; }
      const r = moveBox(world, car.pos, v, CAR_HW, CAR_H, dt);
      car.vy = v.y;
      car.onGround = r.onGround;
      if (r.hitWall) {
        // заезжаем на ступеньку в один блок
        const up = car.pos.clone();
        up.y += 1.05;
        up.x += Math.sin(car.yaw) * Math.sign(car.speed) * 0.15;
        up.z += Math.cos(car.yaw) * Math.sign(car.speed) * 0.15;
        if (car.onGround && Math.abs(car.speed) > 0.5 && !boxCollides(world, up, CAR_HW, CAR_H)) car.pos.copy(up);
        else car.speed *= 0.3;
      }
      car.shake = Math.max(0, car.shake - dt * 4);
      car.group.position.copy(car.pos);
      car.group.position.x += Math.sin(car.shake * 40) * car.shake * 0.05;
      car.group.rotation.y = car.yaw;
      for (const w of car.wheels) w.rotation.x += car.speed * dt / 0.3;
      for (const m of car.mats) m.color.copy(m.userData.base).multiplyScalar(light);
      // мигалки по очереди вспыхивают ярким светом
      if (car.flash.length) {
        const on = Math.floor(performance.now() / 250) % 2;
        car.flash.forEach((f, k) => f.material.color.copy(f.material.userData.base).multiplyScalar(k === on ? 1.4 : 0.25));
      }
    }
  }

  raycast(o, d, maxDist) {
    let best = null;
    for (const car of this.list) {
      const hw = car.real ? Math.max(car.spec.hw, car.spec.len * 0.42) : CAR_HW, hh = car.real ? car.spec.h : CAR_H;
      if (car.real && hw > 2.5 && Math.hypot(car.pos.x - o.x, car.pos.z - o.z) > hw + maxDist) continue;
      const min = [car.pos.x - hw, car.pos.y, car.pos.z - hw], max = [car.pos.x + hw, car.pos.y + hh, car.pos.z + hw];
      const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
      let t0 = 0, t1 = maxDist;
      for (let a = 0; a < 3 && t0 <= t1; a++) {
        if (Math.abs(dd[a]) < 1e-9) { if (oo[a] < min[a] || oo[a] > max[a]) t0 = Infinity; continue; }
        let ta = (min[a] - oo[a]) / dd[a], tb = (max[a] - oo[a]) / dd[a];
        if (ta > tb) { const t = ta; ta = tb; tb = t; }
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      }
      if (t0 <= t1 && (!best || t0 < best.t)) best = { car, t: t0 };
    }
    return best;
  }

  remove(car) {
    this.scene.remove(car.group);
    car.mats.forEach(m => m.dispose());
    this.list.splice(this.list.indexOf(car), 1);
  }

  clear() {
    while (this.list.length) this.remove(this.list[0]);
  }

  serialize() {
    return this.list.map(c => ({ x: c.pos.x, y: c.pos.y, z: c.pos.z, yaw: c.yaw, color: c.color, style: c.style }));
  }
}
