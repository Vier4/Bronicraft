'use strict';

// Проверка ников и названий миров на грубые слова (русские и английские).
// Ловит и хитрости: пробелы и точки между буквами, латинские буквы вместо русских, цифры вместо букв.
const Rude = (() => {
  const RU = ['хуй', 'хуе', 'хуя', 'хуи', 'хую', 'пизд', 'пезд', 'ебат', 'ебан', 'ебал', 'ебло', 'ебуч', 'еблан', 'ебись', 'ебет',
    'ебыр', 'ебля', 'уеб', 'выеб', 'заеб', 'наеб', 'доеб', 'разеб', 'отеб', 'съеб', 'долбо', 'бля', 'сука', 'суки', 'сучк', 'сучар',
    'мудак', 'мудил', 'мудозвон', 'гандон', 'гондон', 'пидор', 'пидар', 'пидр', 'педик', 'залуп', 'шлюх', 'шалав', 'дроч',
    'мандавош', 'говн', 'жоп', 'сран', 'срат', 'дебил', 'херн', 'нахер', 'похер', 'секс', 'порн', 'пенис', 'сиськ', 'писюн', 'писька'];
  const EN = ['fuck', 'fck', 'shit', 'bitch', 'dick', 'cock', 'cunt', 'pussy', 'whore', 'slut', 'nigg', 'fag', 'porn', 'sex',
    'penis', 'vagina', 'asshole', 'boob', 'tits', 'nude', 'naked',
    'suka', 'blya', 'pizd', 'huy', 'hui', 'xuy', 'xui', 'ebat', 'eban', 'ebal', 'pidor', 'pidar', 'zhopa', 'govno', 'mudak', 'gandon'];
  // обычные слова, внутри которых случайно прячется грубое: их не трогаем
  const SAFE = ['страху', 'хлеб', 'потребл', 'требл', 'стебл', 'абля', 'рбля', 'убля', 'юбля', 'сукно', 'педикюр', 'скребл', 'гребл', 'спидран', 'колеба', 'колебл',
    'cocktail', 'peacock', 'dickens', 'essex', 'sussex', 'scunthorpe'];
  const LOOK = { a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у', u: 'и', r: 'г',
    '0': 'о', '3': 'з', '4': 'ч', '6': 'б', '@': 'а', z: 'з', 'ё': 'е', 'й': 'й', 'ъ': '', 'ь': '' };
  const squeeze = s => s.replace(/(.)\1+/g, '$1');                // «хууууй» → «хуй»
  function cyr(s) {
    let out = '';
    for (const ch of s) out += ch in LOOK ? LOOK[ch] : ch;
    return out.replace(/[^а-я]/g, '');
  }
  function has(s, words) {
    for (const w of SAFE) s = s.split(w).join('#');
    return words.some(w => s.includes(w));
  }
  // защиту можно выключить кнопкой в главном меню
  const KEY = 'bronicraft-rude-filter';
  function on() {
    try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; }
  }
  function setOn(v) {
    try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) { /* ничего */ }
  }
  function check(text) {
    if (!on()) return false;
    const low = String(text || '').toLowerCase();
    const lat = low.replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/3/g, 'e').replace(/@/g, 'a').replace(/\$/g, 's').replace(/[^a-z]/g, '');
    const ru = cyr(low);
    return has(lat, EN) || has(squeeze(lat), EN) || has(ru, RU) || has(squeeze(ru), RU);
  }
  return { check, on, setOn };
})();
