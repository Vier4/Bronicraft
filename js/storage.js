'use strict';

// Сохранения в браузере: профиль игрока и список миров
const Store = (() => {
  const PROFILE = 'bronicraft-profile';
  const LIST = 'bronicraft-worlds';
  const WORLD = 'bronicraft-world-';
  const OLD_SAVE = 'bronicraft-save-v1';

  function get(k) {
    try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { console.warn('Не получилось сохранить', e); return false; }
  }
  function del(k) {
    try { localStorage.removeItem(k); } catch (e) { /* ничего */ }
  }
  function rawList() {
    const l = get(LIST);
    return Array.isArray(l) ? l : [];
  }

  return {
    getMods: () => get('bronicraft-mods') || {},
    setMods: m => set('bronicraft-mods', m),
    getProfile: () => get(PROFILE),
    setProfile: p => set(PROFILE, p),

    listWorlds: () => rawList().sort((a, b) => b.played - a.played),

    createWorld(meta) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const m = Object.assign({ id, created: Date.now(), played: Date.now() }, meta);
      const l = rawList();
      l.push(m);
      set(LIST, l);
      return m;
    },
    updateMeta(meta) {
      const l = rawList();
      const i = l.findIndex(w => w.id === meta.id);
      if (i >= 0) { l[i] = meta; set(LIST, l); }
    },
    loadWorld: id => get(WORLD + id),
    saveWorld: (id, data) => set(WORLD + id, data),
    deleteWorld(id) {
      set(LIST, rawList().filter(w => w.id !== id));
      del(WORLD + id);
    },

    // Мир из самой первой версии игры превращаем в обычный сохранённый мир
    migrate() {
      const old = get(OLD_SAVE);
      if (!old) return;
      const m = this.createWorld({ name: 'Мой первый мир', seed: old.seed, mode: 'creative', difficulty: 'peaceful' });
      set(WORLD + m.id, { edits: old.edits, player: old.player, time: old.time });
      del(OLD_SAVE);
    },
  };
})();
