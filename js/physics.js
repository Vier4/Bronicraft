'use strict';

// Все твёрдые коробки, которые задевает область: целые блоки и мини-блоки (по 1/4 блока)
function solidBoxes(world, minX, minY, minZ, maxX, maxY, maxZ, fn) {
  const x0 = Math.floor(minX), x1 = Math.ceil(maxX) - 1;
  const y0 = Math.floor(minY), y1 = Math.ceil(maxY) - 1;
  const z0 = Math.floor(minZ), z1 = Math.ceil(maxZ) - 1;
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const id = world.getBlock(x, y, z);
    if (IS_SOLID[id]) { if (fn(x, y, z, x + 1, y + 1, z + 1)) return true; continue; }
    if (id !== B.MINI) continue;
    const a = world.getMini(x, y, z);
    if (!a) continue;
    const sx0 = Math.max(0, Math.floor((minX - x) * 4)), sx1 = Math.min(3, Math.ceil((maxX - x) * 4) - 1);
    const sy0 = Math.max(0, Math.floor((minY - y) * 4)), sy1 = Math.min(3, Math.ceil((maxY - y) * 4) - 1);
    const sz0 = Math.max(0, Math.floor((minZ - z) * 4)), sz1 = Math.min(3, Math.ceil((maxZ - z) * 4) - 1);
    for (let sy = sy0; sy <= sy1; sy++) for (let sz = sz0; sz <= sz1; sz++) for (let sx = sx0; sx <= sx1; sx++) {
      if (!IS_SOLID[a[(sy * 4 + sz) * 4 + sx]]) continue;
      if (fn(x + sx / 4, y + sy / 4, z + sz / 4, x + (sx + 1) / 4, y + (sy + 1) / 4, z + (sz + 1) / 4)) return true;
    }
  }
  return false;
}

// Движение «коробки» (игрока или монстра) с упором в твёрдые блоки
function axisMove(world, p, axis, d, hw, h) {
  if (d === 0) return false;
  p[axis] += d;
  const eps = 1e-4;
  let hit = false;
  solidBoxes(world, p.x - hw, p.y, p.z - hw, p.x + hw, p.y + h, p.z + hw, (ax, ay, az, bx, by, bz) => {
    hit = true;
    if (axis === 'x') p.x = d > 0 ? Math.min(p.x, ax - hw - eps) : Math.max(p.x, bx + hw + eps);
    else if (axis === 'z') p.z = d > 0 ? Math.min(p.z, az - hw - eps) : Math.max(p.z, bz + hw + eps);
    else p.y = d > 0 ? Math.min(p.y, ay - h - eps) : Math.max(p.y, by + eps);
  });
  return hit;
}

function moveBox(world, p, v, hw, h, dt) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) * dt / Math.min(0.4, hw * 2 + 0.05)));
  const sdt = dt / steps;
  let onGround = false, hitWall = false;
  for (let i = 0; i < steps; i++) {
    if (axisMove(world, p, 'y', v.y * sdt, hw, h)) { if (v.y < 0) onGround = true; v.y = 0; }
    if (axisMove(world, p, 'x', v.x * sdt, hw, h)) { v.x = 0; hitWall = true; }
    if (axisMove(world, p, 'z', v.z * sdt, hw, h)) { v.z = 0; hitWall = true; }
  }
  return { onGround, hitWall };
}

function boxCollides(world, p, hw, h) {
  return solidBoxes(world, p.x - hw, p.y, p.z - hw, p.x + hw, p.y + h, p.z + hw, () => true);
}
