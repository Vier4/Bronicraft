'use strict';

// Мод «Реалистичный транспорт»: подробные модели и честная езда.
// Машины и автобус: коробка передач, разгон слабеет на скорости, тормоз и задний ход, руль по радиусу,
// кузов кренится и клюёт носом, передние колёса поворачиваются, фары светят, стоп-сигналы загораются.
// Катер и теплоход держатся на воде и качаются на волнах. Самолёты с рычагом газа и убирающимися шасси.
// Метры = блоки, скорость — в блоках в секунду (на экране — км/ч).
const REAL_CARS = {
  sedan: { name: 'Седан', hw: 0.9, len: 4.6, h: 1.5, max: 28, accel: 3.2, brake: 9, turnR: 5.5, gears: [0, 6, 12, 18, 25, 33], seat: [0.38, 1.12, -0.05], cam: 6, hp: 5 },
  suv: { name: 'Внедорожник', hw: 0.95, len: 4.8, h: 1.9, max: 25, accel: 2.7, brake: 8, turnR: 6, gears: [0, 6, 11, 17, 23], seat: [0.4, 1.45, 0.0], cam: 7, hp: 7, climb: true },
  sport: { name: 'Спорткар', hw: 0.95, len: 4.5, h: 1.2, max: 42, accel: 6.5, brake: 12, turnR: 5.5, gears: [0, 8, 15, 22, 30, 37], seat: [0.38, 0.88, -0.35], cam: 6, hp: 4 },
  bus: { name: 'Автобус', hw: 1.25, len: 11, h: 3.2, max: 18, accel: 1.4, brake: 6, turnR: 10, gears: [0, 4, 8, 13], seat: [0.8, 2.15, 4.55], cam: 13, hp: 12, bus: true },
  boat: { name: 'Катер', hw: 1.0, len: 5.5, h: 1.6, max: 14, accel: 2.2, brake: 2.5, turnR: 7, gears: null, seat: [0.35, 1.3, -0.05], cam: 8, hp: 6, boat: true, draft: 0.35 },
  ship: { name: 'Теплоход', hw: 2.4, len: 20, h: 6, max: 8, accel: 0.6, brake: 0.8, turnR: 20, gears: null, seat: [0, 6.75, 1.45], cam: 26, hp: 20, boat: true, draft: 1.0 },
};

// ---------- Модели ----------
// part(w, h, d, x, y, z, color, kind): kind 'glass' — прозрачное стекло, 'glow' — светится ночью,
// 'brake' — стоп-сигнал, 'doorA'/'doorB' — створки дверей автобуса. Кузова полые — внутри настоящий салон.
const RV = { dark: 0x22252b, chrome: 0xc9ccd2, black: 0x111214, trim: 0x3a3d44, liner: 0xd8d4cc, carpet: 0x2c2e33, screen: 0x4aa0ff, gauge: 0x7ad0ff };

// сиденье: подушка, спинка и подголовник (спинка сзади, сидящий смотрит в +z)
function rvSeat(part, x, y, z, w, color, head) {
  part(w, 0.12, 0.5, x, y, z, color);
  part(w, 0.6, 0.12, x, y + 0.34, z - 0.25, color);
  if (head) part(w * 0.6, 0.18, 0.1, x, y + 0.74, z - 0.26, color);
}
// руль: обод из четырёх перекладин, ступица и рулевая колонка
function rvWheel(part, x, y, z, r) {
  part(r * 2, 0.04, 0.04, x, y + r, z, RV.black); part(r * 2, 0.04, 0.04, x, y - r, z, RV.black);
  part(0.04, r * 2, 0.04, x - r, y, z, RV.black); part(0.04, r * 2, 0.04, x + r, y, z, RV.black);
  part(r * 0.6, 0.05, 0.03, x, y, z, RV.black); part(0.1, 0.1, 0.03, x, y, z + 0.01, RV.trim);
  part(0.06, 0.06, 0.3, x, y - 0.05, z + 0.17, RV.black);
}

// Легковые: капот и багажник сплошные, салон — пол, двери, стойки, крыша, стёкла и всё, что внутри
function rvCar(part, wheel, color, o) {
  const { W, floorY, beltY, roofY, cz0, cz1, front, rear, seats, rearSeats, seatColor, wheelR, wheelX, wheelZ, low } = o;
  const cl = cz1 - cz0, cm = (cz0 + cz1) / 2, glassH = roofY - beltY - 0.05;
  // низ и бока
  part(W, floorY - 0.3, (front - rear), 0, (floorY + 0.3) / 2, (front + rear) / 2, RV.dark);                      // днище
  part(W, beltY - floorY, front - cz1, 0, (beltY + floorY) / 2, (front + cz1) / 2, color);                       // моторный отсек
  part(W - 0.04, 0.1, front - cz1 - 0.05, 0, beltY + 0.02, (front + cz1) / 2, color);                            // капот
  part(W, beltY - floorY, cz0 - rear, 0, (beltY + floorY) / 2, (cz0 + rear) / 2, color);                          // багажник
  for (const sx of [-1, 1]) {
    part(0.07, beltY - floorY, cl, sx * (W / 2 - 0.035), (beltY + floorY) / 2, cm, color);                      // двери снаружи
    part(0.03, (beltY - floorY) * 0.6, cl - 0.1, sx * (W / 2 - 0.09), beltY - (beltY - floorY) * 0.35, cm, RV.trim);   // обивка дверей
    part(0.07, 0.04, 0.55, sx * (W / 2 - 0.1), beltY - 0.12, cm + cl * 0.15, RV.trim);                          // подлокотник
    part(0.03, glassH, cl - 0.1, sx * (W / 2 - 0.04), beltY + glassH / 2, cm, 0, 'glass');                       // боковые стёкла
    for (const z of [cz1 - 0.04, cz0 + 0.04, ...(cl > 1.8 ? [cm + 0.1] : [])]) part(0.07, glassH, 0.07, sx * (W / 2 - 0.04), beltY + glassH / 2, z, color);   // стойки
    part(0.03, 0.03, 0.18, sx * (W / 2 + 0.01), beltY - 0.15, cm + cl * 0.2, RV.chrome);                         // ручки
    part(0.04, beltY - floorY - 0.05, 0.02, sx * (W / 2 + 0.005), (beltY + floorY) / 2, cm, RV.dark);            // щель двери
  }
  part(W - 0.1, 0.06, cl, 0, roofY, cm, color);                                                                  // крыша
  part(W - 0.2, 0.02, cl - 0.1, 0, roofY - 0.04, cm, RV.liner);                                                  // потолок
  part(W - 0.14, glassH, 0.03, 0, beltY + glassH / 2, cz1, 0, 'glass');                                         // лобовое
  part(W - 0.14, glassH, 0.03, 0, beltY + glassH / 2, cz0, 0, 'glass');                                         // заднее
  part(W - 0.16, 0.05, cl, 0, floorY + 0.02, cm, RV.carpet);                                                     // пол с ковриком
  // приборная панель: щиток, экран, руль, педали
  part(W - 0.16, 0.24, 0.36, 0, beltY - 0.04, cz1 - 0.2, RV.black);
  part(0.36, 0.11, 0.02, 0.38, beltY + 0.02, cz1 - 0.39, RV.gauge, 'glow');
  part(0.24, 0.15, 0.02, 0, beltY + 0.01, cz1 - 0.39, RV.screen, 'glow');
  rvWheel(part, 0.38, beltY + 0.05, cz1 - 0.55, 0.16);
  for (const px of [0.3, 0.42, 0.52]) part(0.07, 0.1, 0.03, px, floorY + 0.14, cz1 - 0.35, RV.black);
  part(0.22, 0.28, cl * 0.4, 0, floorY + 0.16, cz1 - 0.35 - cl * 0.2, RV.black);                               // тоннель
  part(0.04, 0.14, 0.04, 0, floorY + 0.37, cz1 - 0.7, RV.chrome); part(0.07, 0.06, 0.07, 0, floorY + 0.46, cz1 - 0.7, RV.black);   // рычаг КПП
  part(0.24, 0.06, 0.03, 0, roofY - 0.12, cz1 - 0.12, RV.black);                                                 // зеркало заднего вида
  for (const sx of [-0.38, 0.38]) part(0.38, 0.02, 0.17, sx, roofY - 0.06, cz1 - 0.15, RV.liner);               // козырьки
  // сиденья
  const seatZ = cz1 - 1.05 - (low ? 0 : 0.05);
  for (const sx of [-0.38, 0.38]) rvSeat(part, sx, floorY + 0.24, seatZ, 0.46, seatColor, true);
  if (rearSeats) {
    part(W - 0.3, 0.12, 0.5, 0, floorY + 0.24, seatZ - 0.95, seatColor);
    part(W - 0.3, 0.55, 0.12, 0, floorY + 0.55, seatZ - 1.2, seatColor);
    for (const sx of [-0.5, 0, 0.5]) part(0.26, 0.16, 0.1, sx, floorY + 0.92, seatZ - 1.21, seatColor);
  }
  // снаружи: бамперы, фары, зеркала, номера
  for (const [z, s] of [[front, 1], [rear, -1]]) {
    part(W + 0.04, 0.22, 0.14, 0, floorY - 0.02, z - s * 0.05, low ? color : 0x3a3d44);
    part(0.52, 0.12, 0.03, 0, floorY + 0.08, z + s * 0.02, 0xf2f2f2);
  }
  part(W * 0.5, 0.16, 0.04, 0, beltY - 0.25, front + 0.01, RV.black);
  for (const sx of [-1, 1]) {
    part(0.38, 0.13, 0.05, sx * (W / 2 - 0.3), beltY - 0.17, front + 0.01, 0xfff6d0, 'glow');
    part(0.4, 0.13, 0.05, sx * (W / 2 - 0.3), beltY - 0.15, rear - 0.01, 0x8a1010, 'brake');
    part(0.18, 0.1, 0.14, sx * (W / 2 + 0.08), beltY + 0.1, cz1 - 0.15, color);
  }
  for (const [x, z] of [[wheelX, wheelZ], [-wheelX, wheelZ], [wheelX, -wheelZ], [-wheelX, -wheelZ]]) wheel(x, wheelR, z, wheelR, low ? 0.3 : 0.24, z > 0);
}

function realCarModel(style, color, part, wheel) {
  if (style === 'sedan') {
    rvCar(part, wheel, color, { W: 1.8, floorY: 0.42, beltY: 0.95, roofY: 1.5, cz0: -1.35, cz1: 0.95, front: 2.25, rear: -2.25,
      seats: 2, rearSeats: true, seatColor: 0x4a4038, wheelR: 0.33, wheelX: 0.82, wheelZ: 1.42 });
    return;
  }
  if (style === 'sport') {
    rvCar(part, wheel, color, { W: 1.85, floorY: 0.3, beltY: 0.78, roofY: 1.2, cz0: -0.95, cz1: 0.7, front: 2.2, rear: -2.25,
      seats: 2, rearSeats: false, seatColor: 0x1a1a1c, wheelR: 0.34, wheelX: 0.84, wheelZ: 1.4, low: true });
    part(1.7, 0.05, 0.32, 0, 1.0, -2.05, color); for (const sx of [-0.6, 0.6]) part(0.06, 0.2, 0.08, sx, 0.88, -2.05, RV.black);   // антикрыло
    for (const sx of [-1, 1]) part(0.04, 0.2, 0.6, sx * 0.94, 0.55, -1.3, RV.black);                                   // воздухозаборники
    for (const sx of [-0.38, 0.38]) part(0.04, 0.4, 0.04, sx + 0.2, 0.8, -0.2, 0xd8201e);                             // красная прострочка сидений
    return;
  }
  if (style === 'suv') {
    rvCar(part, wheel, color, { W: 1.9, floorY: 0.62, beltY: 1.22, roofY: 1.95, cz0: -2.15, cz1: 0.95, front: 2.35, rear: -2.35,
      seats: 2, rearSeats: true, seatColor: 0xb89a74, wheelR: 0.42, wheelX: 0.86, wheelZ: 1.5 });
    for (const sx of [-0.7, 0.7]) part(0.05, 0.06, 2.6, sx, 2.02, -0.6, RV.chrome);                                   // рейлинги
    part(0.7, 0.7, 0.25, 0, 1.05, -2.5, 0x16171a);                                                                    // запаска
    for (const sx of [-1, 1]) part(0.06, 0.08, 3.6, sx * 0.97, 0.55, 0, 0x2c2f35);                                    // пороги
    return;
  }
  if (style === 'bus') {
    const W = 2.5, F = 0.62, BELT = 1.6, TOP = 2.6, ROOF = 2.95, L2 = 5.5, wx = W / 2 - 0.04;
    part(W, 0.3, 11, 0, 0.45, 0, 0x2c2f35);                                                            // днище
    part(W - 0.1, 0.05, 10.9, 0, F, 0, 0x3a3d44);                                                     // пол
    part(W, 0.1, 11, 0, ROOF, 0, color); part(W - 0.2, 0.02, 10.8, 0, ROOF - 0.06, 0, 0xe8e6e0);       // крыша и потолок
    part(1.4, 0.32, 2.2, 0, ROOF + 0.2, -1, 0xd8dbe0);                                                 // кондиционер
    // стены: слева сплошные, справа — с проёмами для дверей
    const segs = { 1: [[-L2, L2]], [-1]: [[-L2, -1.22], [0.02, 3.08], [4.32, L2]] };
    for (const sx of [1, -1]) for (const [z0, z1] of segs[sx]) {
      const zl = z1 - z0, zm = (z0 + z1) / 2;
      part(0.08, BELT - F, zl, sx * wx, (BELT + F) / 2, zm, color);
      part(0.04, TOP - BELT, zl, sx * wx, (TOP + BELT) / 2, zm, 0, 'glass');
      part(0.08, ROOF - TOP, zl, sx * wx, (ROOF + TOP) / 2, zm, color);
      for (let z = z0 + 0.7; z < z1 - 0.3; z += 1.4) part(0.09, TOP - BELT, 0.08, sx * wx, (TOP + BELT) / 2, z, color);
    }
    for (const dz of [3.7, -0.6]) {                                                                    // двери: стеклянные створки
      part(0.08, ROOF - 2.45, 1.24, -wx, (ROOF + 2.45) / 2, dz, color);
      for (const k of [-1, 1]) part(0.04, 1.8, 0.6, -wx - 0.02, 1.55, dz + k * 0.31, 0, k < 0 ? 'doorA' : 'doorB');
    }
    // перед и зад
    part(W, BELT - F - 0.3, 0.08, 0, (BELT + F - 0.3) / 2, L2 - 0.04, color);
    part(W - 0.2, TOP - BELT + 0.3, 0.04, 0, (TOP + BELT - 0.3) / 2, L2 - 0.02, 0, 'glass');
    part(W, ROOF - TOP, 0.08, 0, (ROOF + TOP) / 2, L2 - 0.04, color);
    part(1.5, 0.24, 0.04, 0, TOP + 0.15, L2 + 0.01, 0xffb020, 'glow');                               // табло маршрута
    part(W, BELT - F, 0.08, 0, (BELT + F) / 2, -L2 + 0.04, color);
    part(W - 0.3, TOP - BELT - 0.2, 0.04, 0, (TOP + BELT) / 2, -L2 + 0.02, 0, 'glass');
    part(W, ROOF - TOP + 0.2, 0.08, 0, ROOF - (ROOF - TOP + 0.2) / 2, -L2 + 0.04, color);
    for (const sx of [-1, 1]) {
      part(0.36, 0.16, 0.05, sx * 0.9, 0.8, L2 + 0.02, 0xfff6d0, 'glow');
      part(0.3, 0.26, 0.05, sx * 0.95, 0.9, -L2 - 0.02, 0x8a1010, 'brake');
      part(0.12, 0.35, 0.3, sx * 1.35, 2.3, 5.2, 0x2c2f35);
    }
    part(1.0, 0.12, 0.03, 0, 0.55, L2 + 0.03, 0xf2f2f2);
    // салон: сиденья парами, поручни, компостеры, кнопки «стоп», светильники
    for (let z = -4.7; z <= 2.5; z += 0.9) {
      if (z > -1.4 && z < 0.2) continue;                                                              // накопительная площадка у дверей
      for (const sx of [0.86, 0.4]) rvSeat(part, sx, F + 0.42, z, 0.42, 0x2a4a8a, false);
      if (z < 2.3) rvSeat(part, -0.75, F + 0.42, z, 0.42, 0x2a4a8a, false);
    }
    for (let z = -4.4; z <= 3.2; z += 1.8) {
      part(0.05, ROOF - F - 0.1, 0.05, 0.15, (ROOF + F) / 2, z, 0xf2c228);
      part(0.12, 0.16, 0.08, 0.15, 1.45, z + 0.06, 0xf2c228); part(0.06, 0.04, 0.02, 0.15, 1.5, z + 0.11, 0x20e040, 'glow');   // компостер
      part(0.06, 0.06, 0.03, 0.15, 1.75, z - 0.04, 0xe02020);                                        // кнопка «стоп»
    }
    for (const sx of [0.6, -0.6]) {
      part(0.04, 0.04, 9.4, sx, ROOF - 0.35, -0.3, RV.chrome);
      part(0.12, 0.03, 9, sx, ROOF - 0.09, -0.3, 0xfff6e0, 'glow');
    }
    // место водителя: перегородка, кресло, панель, большой руль
    part(0.05, 1.3, 1.2, 0.3, F + 0.65, 4.3, 0x3a3d44);
    rvSeat(part, 0.8, F + 0.43, 4.55, 0.5, 0x222222, true);
    part(W - 0.2, 0.4, 0.45, 0, 1.25, 5.18, RV.black);
    part(0.5, 0.12, 0.02, 0.8, 1.48, 4.95, RV.gauge, 'glow');
    rvWheel(part, 0.8, 1.6, 4.92, 0.24);
    for (const [x, z] of [[1.05, 3.4], [-1.05, 3.4], [1.05, -3.2], [-1.05, -3.2]]) wheel(x, 0.5, z, 0.5, 0.34, z > 0);
    return;
  }
  if (style === 'boat') {
    part(1.5, 0.45, 4.6, 0, 0.22, -0.2, 0xe8eaee);
    for (const sx of [-1, 1]) part(0.12, 0.65, 4.4, sx * 0.94, 0.75, -0.3, 0xf4f5f7);               // борта
    part(1.9, 0.65, 0.12, 0, 0.75, -2.45, 0xf4f5f7);                                                 // корма
    for (const sx of [-1, 1]) part(0.13, 0.14, 4.42, sx * 0.94, 0.62, -0.3, color);
    part(1.5, 0.6, 0.8, 0, 0.75, 2.3, 0xf4f5f7); part(0.9, 0.5, 0.6, 0, 0.8, 2.95, 0xf4f5f7); part(0.4, 0.4, 0.4, 0, 0.85, 3.4, 0xf4f5f7);   // нос
    part(1.76, 0.06, 4.0, 0, 0.5, -0.4, 0xb48a5a);                                                  // палуба
    part(1.6, 0.5, 0.04, 0, 1.38, 1.0, 0, 'glass');                                                  // ветровое стекло
    part(0.7, 0.55, 0.45, 0.35, 0.8, 0.65, 0xd8dbe0);                                                // пульт
    part(0.4, 0.14, 0.02, 0.35, 1.02, 0.42, RV.gauge, 'glow');
    rvWheel(part, 0.35, 1.0, 0.38, 0.14);
    part(0.05, 0.22, 0.05, 0.62, 1.15, 0.5, RV.chrome); part(0.08, 0.06, 0.08, 0.62, 1.27, 0.5, RV.black);   // рычаг газа
    for (const sx of [-0.35, 0.35]) rvSeat(part, sx, 0.6, -0.15, 0.5, 0xf2f2f2, false);
    part(1.6, 0.12, 0.6, 0, 0.65, -1.85, 0xf2f2f2); part(1.6, 0.4, 0.12, 0, 0.9, -2.12, 0xf2f2f2);  // диванчик на корме
    part(0.4, 1.0, 0.45, 0, 0.75, -2.75, 0x22252b); part(0.25, 0.4, 0.25, 0, 0.2, -2.8, 0x111214);  // мотор
    for (const sx of [-1, 1]) part(0.1, 0.1, 0.1, sx * 0.95, 1.2, 1.6, sx > 0 ? 0x20e040 : 0xe02020, 'glow');
    return;
  }
  if (style === 'ship') {
    // помещение со стенами, стёклами, полом и крышей
    const room = (cx, y0, cz, w, h, d, sill) => {
      part(w, 0.08, d, cx, y0, cz, 0xb48a5a);
      part(w, 0.12, d, cx, y0 + h, cz, 0xf4f5f7);
      part(w - 0.2, 0.02, d - 0.2, cx, y0 + h - 0.08, cz, 0xe8e6e0);
      const gh = h - sill - 0.25;
      for (const sx of [-1, 1]) {
        part(0.1, sill, d, cx + sx * w / 2, y0 + sill / 2, cz, 0xf4f5f7);
        part(0.04, gh, d - 0.2, cx + sx * w / 2, y0 + sill + gh / 2, cz, 0, 'glass');
        part(0.1, 0.25, d, cx + sx * w / 2, y0 + h - 0.12, cz, 0xf4f5f7);
      }
      for (const sz of [-1, 1]) {
        part(w, sill, 0.1, cx, y0 + sill / 2, cz + sz * d / 2, 0xf4f5f7);
        part(w - 0.2, gh, 0.04, cx, y0 + sill + gh / 2, cz + sz * d / 2, 0, 'glass');
        part(w, 0.25, 0.1, cx, y0 + h - 0.12, cz + sz * d / 2, 0xf4f5f7);
      }
    };
    part(4.8, 2.2, 17, 0, 1.1, -0.5, 0xf4f5f7);
    part(4.82, 0.4, 17.02, 0, 0.3, -0.5, 0x8a1c1c);
    part(4.82, 0.3, 17.02, 0, 1.8, -0.5, color);
    part(3.6, 2.0, 1.6, 0, 1.2, 8.8, 0xf4f5f7); part(2.2, 1.8, 1.3, 0, 1.3, 10.2, 0xf4f5f7); part(0.9, 1.5, 0.9, 0, 1.45, 11.2, 0xf4f5f7);
    part(4.6, 0.1, 17, 0, 2.25, -0.5, 0xb48a5a);
    for (const sx of [-1, 1]) part(0.06, 0.55, 17, sx * 2.38, 2.55, -0.5, 0xc9ccd2);
    // салон для пассажиров: столики и кресла
    room(0, 2.3, -1.5, 4.0, 1.7, 10, 0.5);
    for (let z = -5.6; z <= 2.6; z += 1.6) for (const sx of [-1.2, 1.2]) {
      part(0.7, 0.06, 0.6, sx, 3.05, z, 0xf2f2f2); part(0.08, 0.7, 0.08, sx, 2.7, z, RV.chrome);
      for (const dz of [-0.55, 0.55]) part(0.6, 0.45, 0.4, sx, 2.6, z + dz, 0x2a4a8a);
    }
    // верхняя палуба: лаунж с диванами
    room(0, 4.0, -2.5, 3.4, 1.5, 6, 0.45);
    for (const sx of [-1.2, 1.2]) part(0.6, 0.4, 4.2, sx, 4.3, -2.5, 0x8a3a2a);
    part(0.9, 0.06, 1.6, 0, 4.5, -2.5, 0xb48a5a);
    // рубка капитана: штурвал, пульт с экранами, кресло
    room(0, 5.5, 1.4, 3.2, 1.5, 2.4, 0.6);
    part(2.6, 0.5, 0.5, 0, 5.85, 2.3, 0x22252b);
    part(0.5, 0.3, 0.03, -0.7, 6.25, 2.05, 0x30c050, 'glow'); part(0.5, 0.3, 0.03, 0.7, 6.25, 2.05, RV.screen, 'glow');   // радар и карта
    rvWheel(part, 0, 6.3, 1.95, 0.3);
    rvSeat(part, 0, 5.85, 1.3, 0.55, 0x222222, true);
    part(1.0, 1.8, 1.4, 0, 6.2, -4.2, color); part(1.02, 0.35, 1.42, 0, 7.0, -4.2, 0x111214);
    part(0.12, 2.6, 0.12, 0, 8.3, 1.6, 0xc9ccd2); part(0.5, 0.3, 0.02, 0.27, 9.3, 1.6, 0xe02020);
    for (const sx of [-1, 1]) part(0.8, 0.5, 2, sx * 2.05, 4.0, -6, 0xff7a1a);
    for (const sx of [-1, 1]) part(0.12, 0.12, 0.12, sx * 1.65, 7.1, 2.6, sx > 0 ? 0x20e040 : 0xe02020, 'glow');
  }
}

// подробные самолёты: маленький «Сессна» и пассажирский лайнер
const REAL_PLANES = {
  cessna: { real: true, hw: 1.3, h: 2.6, max: 55, lift: 22, turn: 0.9, hp: 5, seat: [0, -0.1, 0.7], cam: 10, accel: 5 },
  airliner: { real: true, hw: 2.2, h: 4.4, max: 70, lift: 34, turn: 0.42, hp: 12, seat: [0, 3.0, 14.1], cam: 34, accel: 3 },
};
Object.assign(PLANE_TYPES, REAL_PLANES);

function realPlaneModel(type, part, body, prop, gear, main, stripe) {
  const grey = 0xb4b9c2, dark = 0x22252b;
  if (type === 'cessna') {
    // кабина полая: пол, борта, стёкла со всех сторон, крыша под крылом
    part(1.1, 0.35, 2.2, 0, -0.62, 0.55, main);                                   // низ кабины
    for (const sx of [-1, 1]) {
      part(0.06, 0.5, 2.2, sx * 0.53, -0.2, 0.55, main);
      part(0.03, 0.62, 2.0, sx * 0.53, 0.36, 0.55, 0, 'glass');
      part(0.06, 0.62, 0.06, sx * 0.53, 0.36, 1.6, main); part(0.06, 0.62, 0.06, sx * 0.53, 0.36, -0.45, main);
    }
    part(1.0, 0.62, 0.03, 0, 0.36, 1.62, 0, 'glass');                              // лобовое
    part(1.1, 0.06, 2.2, 0, 0.7, 0.55, main);                                      // крыша
    part(1.1, 1.0, 0.06, 0, 0.15, -0.55, main);                                    // стенка за задними сиденьями
    part(0.95, 0.9, 0.6, 0, 0.05, 2.0, 0xe6e8ec);                                 // капот мотора
    part(0.9, 0.9, 2.0, 0, 0.15, -1.6, main); part(0.5, 0.6, 2.2, 0, 0.3, -3.6, main);   // хвостовая часть
    part(1.12, 0.18, 2.2, 0, -0.42, 0.55, stripe); part(0.92, 0.18, 2.0, 0, -0.1, -1.6, stripe);
    part(11, 0.14, 1.5, 0, 0.82, 0.6, main);
    for (const sx of [-1, 1]) {
      part(1.2, 0.15, 1.52, sx * 4.9, 0.82, 0.6, stripe);
      part(0.08, 1.0, 0.08, sx * 1.5, 0.3, 0.6, grey);
      part(0.1, 0.1, 0.1, sx * 5.5, 0.82, 0.6, sx > 0 ? 0x20e040 : 0xe02020, 'glow');
    }
    part(3.4, 0.1, 0.9, 0, 0.35, -4.2, main); part(0.12, 1.3, 1.0, 0, 1.0, -4.3, stripe);
    part(0.1, 0.1, 0.1, 0, 1.7, -4.75, 0xffffff, 'glow');
    // внутри: четыре кресла, штурвалы, приборная доска
    for (const z of [0.75, -0.15]) for (const sx of [-0.25, 0.25]) rvSeat(part, sx, -0.38, z, 0.42, 0x6a5a48, z > 0);
    part(1.0, 0.32, 0.15, 0, 0.05, 1.45, dark);
    part(0.75, 0.16, 0.02, 0, 0.08, 1.37, RV.gauge, 'glow');
    for (const sx of [-0.25, 0.25]) { part(0.04, 0.04, 0.3, sx, -0.02, 1.25, RV.black); part(0.24, 0.05, 0.04, sx, -0.02, 1.1, RV.black); }
    prop.position.set(0, 0.05, 2.35);
    part(0.14, 2.0, 0.08, 0, 0, 0, dark, prop); part(0.25, 0.25, 0.2, 0, 0, 0.05, grey, prop);
    for (const [x, z] of [[0.75, 0.4], [-0.75, 0.4], [0, 1.9]]) { gear(0.08, 0.5, 0.08, x, -0.95, z, grey); gear(0.18, 0.4, 0.4, x, -1.2, z, dark); }
    return;
  }
  // лайнер: фюзеляж — полая труба с иллюминаторами, внутри салон и кабина пилотов
  const Z0 = -14.5, Z1 = 15.0, ZL = Z1 - Z0, ZM = (Z0 + Z1) / 2;
  part(3.6, 0.9, ZL, 0, -1.65, ZM, main);                                           // низ (под полом багаж)
  part(3.2, 0.4, ZL, 0, 1.95, ZM, main); part(2.4, 0.3, ZL, 0, 2.2, ZM, main);      // верх
  for (const sx of [-1, 1]) {
    part(0.12, 1.55, ZL, sx * 1.85, -0.43, ZM, main);                                 // борт до окон
    part(0.12, 0.6, ZL, sx * 1.85, 1.45, ZM, main);                                   // борт над окнами
    part(0.05, 0.6, ZL, sx * 1.86, 0.65, ZM, 0, 'glass');                             // ряд иллюминаторов
    for (let z = Z0 + 0.5; z < Z1 - 0.3; z += 1.0) part(0.12, 0.6, 0.62, sx * 1.85, 0.65, z, main);   // простенки между окнами
    part(0.13, 0.3, ZL, sx * 1.86, -0.95, ZM, stripe);
    part(0.13, 1.6, 0.9, sx * 1.86, 0.1, 13.4, grey); part(0.13, 1.6, 0.9, sx * 1.86, 0.1, -12.8, grey);   // двери
  }
  part(3.6, 3.2, 0.12, 0, 0.25, Z0, main);                                          // задняя стенка салона
  part(3.6, 1.0, 0.12, 0, -0.95, Z1, main); part(3.6, 0.9, 0.12, 0, 1.75, Z1, main);
  part(3.2, 0.7, 0.04, 0, 0.9, Z1 + 0.02, 0, 'glass');                              // окна пилотов
  for (let k = 0; k < 4; k++) part(3.0 - k * 0.6, 2.4 - k * 0.45, 0.9, 0, -0.4 - k * 0.1, Z1 + 0.5 + k * 0.85, main);   // нос
  for (let k = 0; k < 4; k++) part(3.2 - k * 0.7, 3.0 - k * 0.6, 1.2, 0, 0.3 + k * 0.25, Z0 - 0.7 - k * 1.1, main);    // хвост
  // салон: пол, багажные полки, свет, ряды кресел 3+3 с проходом
  part(3.5, 0.06, ZL, 0, -1.17, ZM, 0x3a3f60);
  part(3.4, 0.04, ZL, 0, 1.7, ZM, 0xeceae4);
  for (const sx of [-1, 1]) {
    part(0.75, 0.35, ZL - 4, sx * 1.4, 1.45, ZM - 1, 0xdcdad4);
    part(0.15, 0.03, ZL - 4, sx * 0.6, 1.67, ZM - 1, 0xfff6e0, 'glow');
  }
  for (let z = -12.5; z <= 10.5; z += 0.95) for (const sx of [-1, 1]) {
    part(1.2, 0.14, 0.48, sx * 1.05, -0.78, z, 0x2a4a8a);
    part(1.2, 0.7, 0.12, sx * 1.05, -0.38, z - 0.24, 0x2a4a8a);
    part(1.2, 0.12, 0.13, sx * 1.05, 0.0, z - 0.25, 0xe8e8e8);                    // белые подголовники
  }
  part(3.4, 2.7, 0.08, 0, 0.25, 11.9, 0xdcdad4); part(0.8, 2.0, 0.09, 0, -0.1, 11.9, 0x8a8f9a);   // перегородка с дверью в кабину
  // кабина пилотов: два кресла, приборная панель с экранами, рычаги газа
  for (const sx of [-0.65, 0.65]) rvSeat(part, sx, -0.75, 13.8, 0.55, 0x2a2a2e, true);
  part(3.0, 0.5, 0.6, 0, 0.1, 14.65, dark);
  for (const sx of [-1.1, -0.4, 0.4, 1.1]) part(0.5, 0.36, 0.02, sx, 0.25, 14.34, sx < 0 ? RV.screen : 0x30c050, 'glow');
  part(0.3, 0.3, 0.5, 0, -0.5, 14.2, dark); for (const sx of [-0.07, 0.07]) part(0.04, 0.2, 0.04, sx, -0.25, 14.2, RV.chrome);
  for (const sx of [-0.65, 0.65]) { part(0.04, 0.4, 0.04, sx, -0.5, 14.25, RV.black); part(0.3, 0.05, 0.05, sx, -0.3, 14.25, RV.black); }
  // крылья, двигатели, хвостовое оперение
  for (let k = 0; k < 8; k++) for (const sx of [-1, 1]) part(2.0, 0.32 - k * 0.02, 5.0 - k * 0.45, sx * (2.6 + k * 2.0), -1.25 + k * 0.08, 2.4 - k * 0.85, 0xdfe2e8);
  for (const sx of [-1, 1]) {
    part(0.2, 1.6, 1.4, sx * 17.8, -0.45, -4.4, stripe);
    part(0.14, 0.14, 0.14, sx * 17.9, -0.65, -3.6, sx > 0 ? 0x20e040 : 0xe02020, 'glow');
    part(1.8, 1.8, 4.0, sx * 6.2, -2.35, 3.2, grey); part(1.5, 1.5, 0.2, sx * 6.2, -2.35, 5.25, 0x0d0f12);
    part(0.4, 0.9, 2.4, sx * 6.2, -1.25, 2.6, grey);
  }
  for (let k = 0; k < 4; k++) for (const sx of [-1, 1]) part(1.6, 0.22, 2.4 - k * 0.3, sx * (1.6 + k * 1.5), 1.1, -17.4 - k * 0.45, 0xdfe2e8);
  for (let k = 0; k < 5; k++) part(0.4, 1.2, 4.2 - k * 0.5, 0, 2.6 + k * 1.15, -16.8 - k * 0.7, stripe);
  part(0.14, 0.14, 0.14, 0, 8.4, -20.3, 0xffffff, 'glow');
  for (const [x, z] of [[2.2, 1.2], [-2.2, 1.2], [0, 13]]) { gear(0.3, 1.6, 0.3, x, -2.9, z, grey); gear(0.6, 0.9, 1.1, x, -3.6, z, 0x16171a); }
}

// ---------- Машины, автобус и корабли ----------
Cars.prototype.addReal = function (car, style, color) {
  const spec = REAL_CARS[style];
  const g = car.group;
  const body = new THREE.Group();          // кренится и клюёт носом
  g.add(body);
  car.body = body; car.spec = spec; car.t = spec; car.real = true;
  car.gear = 1; car.rpm = 0; car.steer = 0; car.braking = false; car.shiftT = 0; car.doorOpen = 0; car.bob = Math.random() * 10;
  car.glow = []; car.brakeMats = []; car.doors = []; car.steerWheels = [];
  // прозрачное стекло — одно на всю машину
  const glass = new THREE.MeshBasicMaterial({ color: 0xa8d4f0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  glass.userData.base = new THREE.Color(0xa8d4f0);
  car.mats.push(glass);
  const part = (w, h, d, x, y, z, c, kind) => {
    const isGlass = kind === 'glass' || kind === 'doorA' || kind === 'doorB';
    let mat = glass;
    if (!isGlass) {
      mat = new THREE.MeshBasicMaterial({ color: c });
      mat.userData.base = new THREE.Color(c);
      if (kind === 'glow') mat.userData.glow = true;
      car.mats.push(mat);
    }
    const m = new THREE.Mesh(this.box(w, h, d), mat);
    if (isGlass) m.renderOrder = 2;
    m.position.set(x, y, z);
    body.add(m);
    if (kind === 'brake') car.brakeMats.push(mat);
    if (kind === 'doorA' || kind === 'doorB') car.doors.push({ m, z0: z, dir: kind === 'doorA' ? -1 : 1 });
    return m;
  };
  // колесо: шина, диск и колпак; передние поворачиваются вместе с рулём
  const wheel = (x, y, z, r, w, front) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const spin = new THREE.Group();
    pivot.add(spin);
    const tm = new THREE.MeshBasicMaterial({ color: 0x151517 }); tm.userData.base = new THREE.Color(0x151517); car.mats.push(tm);
    const rm = new THREE.MeshBasicMaterial({ color: 0xb8bcc4 }); rm.userData.base = new THREE.Color(0xb8bcc4); car.mats.push(rm);
    spin.add(new THREE.Mesh(this.box(w, r * 2, r * 2), tm));
    const tire2 = new THREE.Mesh(this.box(w, r * 1.4, r * 1.4), tm); tire2.rotation.x = Math.PI / 4; spin.add(tire2);   // шина почти круглая
    const rim = new THREE.Mesh(this.box(w + 0.02, r * 1.05, r * 1.05), rm); spin.add(rim);
    const rim2 = new THREE.Mesh(this.box(w + 0.03, r * 0.5, r * 0.5), rm); rim2.rotation.x = Math.PI / 4; spin.add(rim2);
    g.add(pivot);
    car.wheels.push(spin);
    if (front) car.steerWheels.push(pivot);
  };
  realCarModel(style, color, part, wheel);
  car.hp = spec.hp;
};

// где поверхность воды под кораблём (или null, если под ним суша)
function waterTop(world, x, y, z) {
  const bx = Math.floor(x), bz = Math.floor(z);
  for (let yy = Math.floor(y) + 1; yy >= Math.floor(y) - 3; yy--) {
    if (isWaterB(world.getBlock(bx, yy, bz))) {
      let top = yy;
      while (isWaterB(world.getBlock(bx, top + 1, bz))) top++;
      return top + 0.88;
    }
    if (IS_SOLID[world.getBlock(bx, yy, bz)]) return null;
  }
  return null;
}

Cars.prototype.updateReal = function (car, dt, world, inp, light, time) {
  const s = car.spec;
  const fwd = inp ? inp.fwd : 0, turn = inp ? inp.turn : 0;
  // газ, тормоз, задний ход
  car.braking = false;
  if (fwd > 0) {
    if (car.speed < -0.3) { car.speed = Math.min(0, car.speed + s.brake * dt); car.braking = true; }
    else if (car.shiftT <= 0) car.speed += s.accel * Math.pow(Math.max(0, 1 - car.speed / s.max), 0.7) * dt;
  } else if (fwd < 0) {
    if (car.speed > 0.3) { car.speed = Math.max(0, car.speed - s.brake * dt); car.braking = true; }
    else car.speed = Math.max(-s.max * 0.2, car.speed - s.accel * 0.7 * dt);
  } else {
    const roll = s.boat ? 0.25 : 0.12;                                     // накат: сопротивление и ветер
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), (roll + car.speed * car.speed * 0.002) * dt * 3);
  }
  // коробка передач: переключение с короткой паузой
  if (s.gears) {
    const g = s.gears, sp = Math.abs(car.speed);
    let want = 1;
    for (let k = 1; k < g.length; k++) if (sp > g[k] * 0.92) want = k + 1;
    want = Math.min(want, g.length);
    car.shiftT -= dt;
    if (want !== car.gear && car.speed >= 0) { car.gear = want; car.shiftT = 0.18; }
    const lo = g[car.gear - 1], hi = g[car.gear] || s.max;
    car.rpm = car.speed < 0 ? 0.3 + sp / (s.max * 0.2) * 0.5 : Math.max(0.15, Math.min(1, (sp - lo) / Math.max(1, hi - lo)));
  } else car.rpm = Math.min(1, Math.abs(car.speed) / s.max);
  // руль: поворачиваем колёса плавно, радиус поворота растёт со скоростью
  car.steer += (turn - car.steer) * Math.min(1, dt * 4);
  const v = Math.abs(car.speed);
  if (v > 0.05) car.yaw += car.speed / (s.turnR * (1 + v / 18)) * car.steer * dt;
  // движение: машины — по земле с подъёмом на ступеньку, корабли — по воде
  const dir = new THREE.Vector3(Math.sin(car.yaw), 0, Math.cos(car.yaw));
  let surf = null;
  if (s.boat) {
    surf = waterTop(world, car.pos.x, car.pos.y + s.draft, car.pos.z);
    if (surf === null) {                                                   // на суше корабль не едет
      car.speed *= Math.max(0, 1 - dt * 4);
      car.vy = Math.max(car.vy - 28 * dt, -40);
    } else {
      const wantY = surf - s.draft + Math.sin(time * 1.3 + car.bob) * 0.06;
      car.vy = (wantY - car.pos.y) * 4;
    }
  } else car.vy = Math.max(car.vy - 28 * dt, -40);
  const vel = new THREE.Vector3(dir.x * car.speed + (car.px || 0), car.vy, dir.z * car.speed + (car.pz || 0));
  // нос и корма длинной машины тоже не должны залезать в стены и на берег
  const tip = car.pos.clone().addScaledVector(dir, Math.sign(car.speed) * (s.len / 2 + 0.2));
  const tipY = Math.floor(car.pos.y + (s.boat ? s.draft + 0.2 : 0.6));
  const tipBlock = world.getBlock(Math.floor(tip.x), tipY, Math.floor(tip.z));
  const tipUp = world.getBlock(Math.floor(tip.x), tipY + 1, Math.floor(tip.z));
  const blocked = s.boat ? (surf !== null && (IS_SOLID[tipBlock] || (!isWaterB(tipBlock) && waterTop(world, tip.x, car.pos.y + s.draft, tip.z) === null)))
    : (IS_SOLID[tipBlock] && IS_SOLID[tipUp]);
  if (blocked && v > 0.1) { if (v > 8) car.shake = 1; car.speed *= -0.15; vel.x = vel.z = 0; }
  const r = moveBox(world, car.pos, vel, s.hw, s.h, dt);
  car.vy = vel.y;
  car.onGround = r.onGround || (s.boat && surf !== null);
  if (r.hitWall && !s.boat) {
    const up = car.pos.clone(); up.y += 1.05;
    up.addScaledVector(dir, Math.sign(car.speed) * 0.15);
    if (car.onGround && v > 0.5 && !boxCollides(world, up, s.hw, s.h)) car.pos.copy(up);
    else { if (v > 8) car.shake = 1; car.speed *= 0.3; }
  }
  // вид: крен в поворотах, нос приседает при торможении, колёса крутятся, двери автобуса
  const lean = Math.max(-0.08, Math.min(0.08, -car.steer * car.speed * 0.006));
  const pitch = car.braking ? 0.025 : (fwd > 0 && car.speed > 0 && car.speed < s.max * 0.5 ? -0.015 : 0);
  car.body.rotation.z += (lean - car.body.rotation.z) * Math.min(1, dt * 5);
  car.body.rotation.x += (pitch - car.body.rotation.x) * Math.min(1, dt * 6);
  if (s.boat) { car.body.rotation.z += Math.sin(time * 0.9 + car.bob) * 0.02 * (s.len < 10 ? 1 : 0.4); car.body.rotation.x = -Math.min(0.08, v * 0.006); }
  for (const w of car.wheels) w.rotation.x += car.speed * dt / 0.35;
  for (const p of car.steerWheels) p.rotation.y = car.steer * 0.45;
  if (s.bus) {
    const open = v < 0.3 && inp && fwd === 0 ? 1 : 0;
    car.doorOpen += (open - car.doorOpen) * Math.min(1, dt * 3);
    for (const d of car.doors) d.m.position.z = d.z0 + d.dir * car.doorOpen * 0.55;
  }
  car.shake = Math.max(0, car.shake - dt * 4);
  car.group.position.copy(car.pos);
  car.group.position.x += Math.sin(car.shake * 40) * car.shake * 0.05;
  car.group.rotation.y = car.yaw;
  for (const m of car.mats) {
    if (m.userData.glow) continue;
    m.color.copy(m.userData.base).multiplyScalar(light);
  }
  for (const m of car.brakeMats) m.color.setHex(car.braking || car.speed < -0.1 ? 0xff2a2a : 0x8a1010).multiplyScalar(car.braking ? 1 : Math.max(light, 0.5));
};

// ---------- Самолёты: рычаг газа и шасси ----------
Planes.prototype.addReal = function (pl, type) {
  pl.throttle = 0; pl.gearParts = []; pl.glow = [];
};
