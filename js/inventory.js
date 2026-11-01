'use strict';

// Инвентарь: 36 ячеек, первые 9 — панель быстрого доступа
class Inventory {
  constructor() {
    this.slots = new Array(36).fill(null);
  }

  static from(arr) {
    const inv = new Inventory();
    if (Array.isArray(arr)) {
      arr.forEach((s, i) => {
        if (i < 36 && s && (isBlockId(s.id) || ITEMS[s.id]) && s.n > 0) inv.slots[i] = { id: s.id, n: s.n };
      });
    }
    return inv;
  }

  // Возвращает, сколько не влезло
  add(id, n) {
    const max = maxStack(id);
    for (const s of this.slots) {
      if (s && s.id === id && s.n < max) {
        const k = Math.min(n, max - s.n);
        s.n += k; n -= k;
        if (!n) return 0;
      }
    }
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i]) {
        const k = Math.min(n, max);
        this.slots[i] = { id, n: k };
        n -= k;
        if (!n) return 0;
      }
    }
    return n;
  }

  count(id) {
    let c = 0;
    for (const s of this.slots) if (s && s.id === id) c += s.n;
    return c;
  }

  remove(id, n) {
    for (let i = this.slots.length - 1; i >= 0 && n > 0; i--) {
      const s = this.slots[i];
      if (!s || s.id !== id) continue;
      const k = Math.min(n, s.n);
      s.n -= k; n -= k;
      if (!s.n) this.slots[i] = null;
    }
  }

  canCraft(r) {
    return r.in.every(([id, n]) => this.count(id) >= n);
  }

  craft(r) {
    if (!this.canCraft(r)) return false;
    r.in.forEach(([id, n]) => this.remove(id, n));
    const left = this.add(r.out[0], r.out[1]);
    if (left) {   // места не хватило — возвращаем ингредиенты
      this.remove(r.out[0], r.out[1] - left);
      r.in.forEach(([id, n]) => this.add(id, n));
      return false;
    }
    return true;
  }
}
