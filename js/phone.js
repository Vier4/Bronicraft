'use strict';

// Мод «Телефон»: смартфон BroniPhone. Приходит разряженным, заряжается на зарядной станции,
// интернет (магазин приложений, браузер) работает только рядом с Wi-Fi роутером.
const Phone = (() => {
  let root, screen, statusTime, statusWifi, statusBat, home, appBox, appTitle, appBody, offScreen, opts;
  let cleanup = null, ticker = null, statusT = 0;

  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const WALLPAPERS = [
    'linear-gradient(160deg,#3a7bd5,#6a4fc7 60%,#ff7eb6)', 'linear-gradient(160deg,#11998e,#38ef7d)',
    'linear-gradient(160deg,#f7971e,#ffd200)', 'linear-gradient(160deg,#232526,#414345)',
    'linear-gradient(160deg,#ff5f6d,#ffc371)', 'linear-gradient(160deg,#00c6ff,#0072ff)',
  ];
  const BUILTIN = [
    { id: 'call', name: 'Телефон', icon: '📞', run: callApp },
    { id: 'sms', name: 'Сообщения', icon: '💬', run: smsApp },
    { id: 'camera', name: 'Камера', icon: '📷', run: cameraApp },
    { id: 'gallery', name: 'Галерея', icon: '🖼️', run: galleryApp },
    { id: 'store', name: 'BroniStore', icon: '🛍️', run: storeApp },
    { id: 'browser', name: 'Браузер', icon: '🌐', run: browserApp },
    { id: 'clock', name: 'Часы', icon: '⏰', run: clockApp },
    { id: 'calc', name: 'Калькулятор', icon: '🧮', run: b => Computer.apps.calc(b) },
    { id: 'light', name: 'Фонарик', icon: '🔦', run: lightApp },
    { id: 'settings', name: 'Настройки', icon: '⚙️', run: settingsApp },
  ];
  const STORE = [
    { id: 'snake', name: 'Змейка', icon: '🐍', size: 12, desc: 'Собирай яблоки и не врезайся в хвост', run: b => Computer.apps.snake(b) },
    { id: 'paint', name: 'Рисовалка', icon: '🎨', size: 8, desc: 'Рисуй пальцем, то есть мышкой', run: b => Computer.apps.paint(b) },
    { id: 'piano', name: 'Пианино', icon: '🎹', size: 10, desc: 'Играй мелодии на клавишах', run: b => Computer.apps.piano(b) },
    { id: 'notes', name: 'Заметки', icon: '📝', size: 3, desc: 'Записывай важное', run: b => Computer.apps.notes(b) },
    { id: 'weather', name: 'Погода', icon: '☀️', size: 6, desc: 'Какая погода в твоём мире', run: weatherApp },
    { id: 'map', name: 'Карта', icon: '🗺️', size: 20, desc: 'Карта местности вокруг тебя', run: mapApp },
    { id: 'compass', name: 'Компас', icon: '🧭', size: 4, desc: 'Куда ты смотришь и где находишься', run: compassApp },
    { id: 'music', name: 'Музыка', icon: '🎵', size: 15, desc: 'Три весёлые мелодии', run: musicApp },
  ];

  function init(o) {
    opts = o;
    root = document.getElementById('phone');
    root.innerHTML = '';
    const device = h('div', 'ph-device');
    screen = h('div', 'ph-screen');
    const status = h('div', 'ph-status');
    statusTime = h('span', '', '');
    const right = h('span', 'ph-status-right');
    statusWifi = h('span', '', '');
    statusBat = h('span', '', '');
    right.append(statusWifi, statusBat);
    status.append(statusTime, right);
    home = h('div', 'ph-home');
    appBox = h('div', 'ph-app hidden');
    const bar = h('div', 'ph-appbar');
    const back = h('button', 'ph-back', '‹ Назад');
    back.addEventListener('click', goHome);
    appTitle = h('span', '', '');
    bar.append(back, appTitle);
    appBody = h('div', 'ph-appbody');
    appBox.append(bar, appBody);
    offScreen = h('div', 'ph-off hidden');
    offScreen.innerHTML = '<div class="ph-bat-empty"><i></i></div><p>Телефон разряжен</p><small>Постой рядом с зарядной станцией — телефон зарядится</small>';
    screen.append(status, home, appBox, offScreen);
    const homeBtn = h('button', 'ph-homebtn', '');
    homeBtn.title = 'Домой';
    homeBtn.addEventListener('click', goHome);
    const close = h('button', 'small ph-close', 'Убрать телефон');
    close.addEventListener('click', () => opts.onClose());
    device.append(screen, homeBtn);
    root.append(device, close);
  }

  const st = () => opts.state();
  function allApps() {
    return BUILTIN.concat(STORE.filter(a => st().installed.includes(a.id)));
  }
  function renderHome() {
    home.innerHTML = '';
    for (const app of allApps()) {
      const b = h('button', 'ph-icon');
      b.appendChild(h('span', 'ph-emoji', app.icon));
      b.appendChild(h('span', '', app.name));
      b.addEventListener('click', () => openApp(app));
      home.appendChild(b);
    }
  }
  function openApp(app) {
    stopApp();
    appTitle.textContent = app.name;
    appBody.innerHTML = '';
    appBox.classList.remove('hidden');
    cleanup = app.run(appBody) || null;
    opts.tone(900, 0.03);
  }
  function stopApp() {
    if (cleanup) cleanup();
    cleanup = null;
    if (ticker) { ticker = null; }
  }
  function goHome() {
    stopApp();
    appBox.classList.add('hidden');
    renderHome();
  }

  function open() {
    screen.style.background = WALLPAPERS[st().wallpaper || 0];
    goHome();
    tick(1);
  }
  function close() { stopApp(); }

  // вызывается игрой каждый кадр, пока телефон открыт
  function tick(dt) {
    statusT -= dt;
    if (ticker) ticker(dt);
    if (statusT > 0) return;
    statusT = 0.4;
    const s = st();
    statusTime.textContent = opts.clock();
    const w = opts.wifi();
    statusWifi.textContent = w ? 'Wi-Fi ' + '▮'.repeat(w) + '▯'.repeat(3 - w) : 'нет Wi-Fi';
    statusWifi.className = w ? '' : 'ph-nowifi';
    statusBat.textContent = (opts.charging() ? '⚡' : '') + Math.floor(s.battery) + '%';
    statusBat.className = s.battery < 15 ? 'ph-low' : '';
    const dead = s.battery <= 0;
    if (dead && offScreen.classList.contains('hidden')) stopApp();
    offScreen.classList.toggle('hidden', !dead);
  }

  // ---------- Звонки ----------
  const CONTACTS = [
    ['Мама', '👩', ['Привет, солнышко! Ты покушал?', 'Не забудь сделать уроки!', 'Возвращайся домой до темноты, там Буки!']],
    ['Папа', '👨', ['Привет! Как дела в Броникрафте?', 'Построй мне гараж для машины!', 'Я на работе, перезвоню!']],
    ['Бабушка', '👵', ['Внучек, приезжай на пирожки!', 'Я связала тебе шерстяной блок!', 'Ты одет тепло?']],
    ['Друг Тёма', '🧑', ['Го строить замок!', 'Я нашёл алмазы в шахте!!!', 'Давай на метро до депо!']],
    ['Пиццерия «Кубик»', '🍕', ['Пиццерия «Кубик», слушаю! Пицца уже едет.', 'Сегодня скидка на кубическую пиццу!']],
  ];
  function callApp(body) {
    const list = h('div', 'ph-list');
    CONTACTS.forEach(([name, ava, lines]) => {
      const row = h('button', 'ph-row');
      row.append(h('span', 'ph-ava', ava), h('span', 'ph-row-name', name), h('span', 'ph-row-act', '📞'));
      row.addEventListener('click', () => {
        body.innerHTML = '';
        const call = h('div', 'ph-call');
        call.append(h('div', 'ph-call-ava', ava), h('div', 'ph-call-name', name));
        const stt = h('div', 'ph-call-state', 'Вызов…');
        const end = h('button', 'ph-endcall', '📵');
        call.append(stt, end);
        body.appendChild(call);
        let t = 0;
        const ring = setInterval(() => { opts.tone(440, 0.4, 'sine'); }, 1000);
        opts.tone(440, 0.4, 'sine');
        const ans = setTimeout(() => {
          clearInterval(ring);
          stt.textContent = '«' + lines[Math.floor(Math.random() * lines.length)] + '»';
          opts.tone(660, 0.1, 'sine');
          ticker = dt => { t += dt; end.textContent = '📵 ' + Math.floor(t) + ' с'; };
        }, 2500);
        end.addEventListener('click', () => { clearInterval(ring); clearTimeout(ans); ticker = null; body.innerHTML = ''; callApp(body); });
        cleanup = () => { clearInterval(ring); clearTimeout(ans); };
      });
      list.appendChild(row);
    });
    body.appendChild(list);
  }

  // ---------- Сообщения ----------
  const REPLIES = {
    'Мама': ['Хорошо, целую!', 'Молодец!', 'Ужин на столе 🍲'], 'Друг Тёма': ['Ахаха', 'Круто!!', 'Встречаемся у фонтана', '😎'],
    'Пиццерия «Кубик»': ['Ваш заказ принят! 🍕'], 'Папа': ['👍', 'Отлично!'], 'Бабушка': ['Пирожки готовы!', '❤️'],
  };
  function smsApp(body) {
    const s = st();
    if (!s.chats) s.chats = {
      'Мама': [['in', 'Ты где? Ужин готов!']], 'Друг Тёма': [['in', 'Го строить замок?']],
      'Пиццерия «Кубик»': [['in', 'Скидка 20% на пиццу «Кубическая»!']],
    };
    const list = h('div', 'ph-list');
    Object.keys(s.chats).forEach(name => {
      const last = s.chats[name][s.chats[name].length - 1];
      const row = h('button', 'ph-row');
      row.append(h('span', 'ph-ava', (CONTACTS.find(c => c[0] === name) || [0, '👤'])[1]), h('span', 'ph-row-name', name), h('small', 'ph-row-last', last ? last[1] : ''));
      row.addEventListener('click', () => chat(body, name));
      list.appendChild(row);
    });
    body.appendChild(list);
  }
  function chat(body, name) {
    body.innerHTML = '';
    const s = st();
    const msgs = h('div', 'ph-chat');
    const draw = () => {
      msgs.innerHTML = '';
      s.chats[name].forEach(([who, text]) => msgs.appendChild(h('div', 'ph-bubble ' + who, text)));
      msgs.scrollTop = msgs.scrollHeight;
    };
    const form = h('div', 'ph-send');
    const input = h('input', '');
    input.placeholder = 'Сообщение…';
    const send = h('button', '', '➤');
    const go = () => {
      const t = input.value.trim();
      if (!t) return;
      s.chats[name].push(['out', t]);
      input.value = '';
      draw();
      opts.tone(1200, 0.05);
      setTimeout(() => {
        const r = REPLIES[name] || ['🙂'];
        s.chats[name].push(['in', r[Math.floor(Math.random() * r.length)]]);
        draw();
        opts.tone(800, 0.08);
        opts.save();
      }, 1500);
    };
    send.addEventListener('click', go);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    form.append(input, send);
    body.append(h('div', 'ph-chat-title', name), msgs, form);
    draw();
    setTimeout(() => input.focus(), 0);
  }

  // ---------- Камера и галерея ----------
  function cameraApp(body) {
    const view = h('div', 'ph-viewfinder', 'Нажми на кнопку — сфотографируешь мир за телефоном');
    const shot = h('button', 'ph-shutter', '');
    const thumb = h('img', 'ph-thumb');
    const s = st();
    if (s.photos && s.photos.length) thumb.src = s.photos[s.photos.length - 1];
    shot.addEventListener('click', () => {
      const url = opts.photo();
      s.photos = (s.photos || []).concat([url]).slice(-8);
      thumb.src = url;
      view.classList.add('flash');
      setTimeout(() => view.classList.remove('flash'), 150);
      opts.tone(2000, 0.05, 'square');
      opts.save();
    });
    const row = h('div', 'ph-camrow');
    row.append(thumb, shot, h('span', '', ''));
    body.append(view, row);
  }
  function galleryApp(body) {
    const s = st();
    if (!s.photos || !s.photos.length) { body.appendChild(h('p', 'ph-empty', 'Пока нет фото. Открой «Камеру»!')); return; }
    const grid = h('div', 'ph-gallery');
    s.photos.forEach((url, i) => {
      const img = h('img', '');
      img.src = url;
      img.addEventListener('click', () => {
        body.innerHTML = '';
        const big = h('img', 'ph-bigphoto');
        big.src = url;
        const del = h('button', 'small danger', 'Удалить');
        del.addEventListener('click', () => { s.photos.splice(i, 1); opts.save(); body.innerHTML = ''; galleryApp(body); });
        body.append(big, del);
      });
      grid.appendChild(img);
    });
    body.appendChild(grid);
  }

  // ---------- Магазин приложений ----------
  function noNet(body) {
    body.appendChild(h('div', 'ph-nonet', '🦖'));
    body.appendChild(h('p', 'ph-empty', 'Нет подключения к интернету. Подойди поближе к Wi-Fi роутеру.'));
  }
  const downloads = {};
  function storeApp(body) {
    if (!opts.wifi() && !Object.keys(downloads).length) { noNet(body); return; }
    const s = st();
    const list = h('div', 'ph-list');
    const rows = {};
    STORE.forEach(app => {
      const row = h('div', 'ph-storerow');
      const info = h('div', 'ph-storeinfo');
      info.append(h('b', '', app.name), h('small', '', app.desc + ' · ' + app.size + ' МБ'));
      const btn = h('button', 'small');
      row.append(h('span', 'ph-emoji small', app.icon), info, btn);
      rows[app.id] = { btn };
      btn.addEventListener('click', () => {
        if (s.installed.includes(app.id)) { s.installed = s.installed.filter(x => x !== app.id); opts.save(); update(); return; }
        if (downloads[app.id] === undefined) downloads[app.id] = 0;
        update();
      });
      list.appendChild(row);
    });
    const update = () => STORE.forEach(app => {
      const b = rows[app.id].btn;
      if (s.installed.includes(app.id)) { b.textContent = 'Удалить'; b.className = 'small danger'; }
      else if (downloads[app.id] !== undefined) { b.textContent = opts.wifi() ? Math.floor(downloads[app.id]) + '%' : 'Ждём Wi-Fi…'; b.className = 'small'; }
      else { b.textContent = 'Скачать'; b.className = 'small on'; }
    });
    ticker = dt => {
      const w = opts.wifi();
      for (const id in downloads) {
        if (!w) continue;
        downloads[id] += dt * 12 * w;                     // чем лучше сигнал, тем быстрее
        if (downloads[id] >= 100) {
          delete downloads[id];
          if (!s.installed.includes(id)) s.installed.push(id);
          opts.tone(1320, 0.12, 'sine');
          opts.save();
        }
      }
      update();
    };
    update();
    body.appendChild(list);
  }

  // ---------- Браузер ----------
  const NEWS = [
    'В Броникрафте открылось метро: поезда ходят каждые пять минут!',
    'Учёные нашли изумруды глубоко в шахтах', 'На улице Ленина выпал снег — дети лепят снеговиков',
    'В ЖК «Небо» заработал лифт до самой крыши', 'Буки боятся закрытых дверей — проверено!',
  ];
  const TIPS = [
    'Ночью закройся в доме — Буки не умеют открывать двери.', 'Кровать ночью сразу включает утро.',
    'Динамит не берёт обсидиан.', 'Самолёт взлетает, только когда разгонится.',
    'Мрамор под рельсами — это остановка для поезда.', 'Телефон заряжается рядом с зарядной станцией.',
  ];
  function browserApp(body) {
    if (!opts.wifi()) { noNet(body); return; }
    const bar = h('div', 'ph-url');
    const input = h('input', '');
    input.placeholder = 'Поиск рецептов… например «кирка»';
    bar.appendChild(input);
    const page = h('div', 'ph-page');
    body.append(bar, page);
    const show = (title, items) => {
      page.innerHTML = '';
      page.appendChild(h('h3', '', title));
      items.forEach(t => page.appendChild(h('p', '', t)));
      const back = h('button', 'small', '‹ На главную');
      back.addEventListener('click', start);
      page.appendChild(back);
    };
    const start = () => {
      page.innerHTML = '';
      page.appendChild(h('h3', '', '🔎 Брониндекс'));
      [['📰 Броня-новости', () => show('Новости', NEWS)],
        ['🛠️ Все рецепты крафта', () => show('Рецепты', opts.recipes())],
        ['💡 Советы для игры', () => show('Советы', TIPS)],
        ['☀️ Погода', () => { const w = opts.weather(); show('Погода', [w.icon + ' ' + w.text, 'Температура: ' + w.temp + '°']); }]].forEach(([t, fn]) => {
        const a = h('button', 'ph-link', t);
        a.addEventListener('click', fn);
        page.appendChild(a);
      });
    };
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const q = input.value.trim().toLowerCase();
      const found = opts.recipes().filter(r => r.toLowerCase().includes(q));
      show('Поиск: ' + input.value, found.length ? found : ['Ничего не нашлось 😕']);
    });
    start();
  }

  // ---------- Обычные приложения ----------
  function clockApp(body) {
    const big = h('div', 'ph-bigclock', '');
    const real = h('p', 'ph-empty', '');
    const sw = h('div', 'ph-bigclock small', '0.0 с');
    let run = false, t = 0;
    const b = h('button', 'small', 'Секундомер: старт');
    b.addEventListener('click', () => { run = !run; b.textContent = run ? 'Стоп' : 'Секундомер: старт'; if (run) t = 0; });
    body.append(h('small', '', 'Время в мире'), big, real, h('small', '', 'Секундомер'), sw, b);
    ticker = dt => {
      big.textContent = opts.clock();
      real.textContent = 'Время дома: ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      if (run) t += dt;
      sw.textContent = t.toFixed(1) + ' с';
    };
  }
  function lightApp(body) {
    const b = h('button', 'ph-torch', '');
    const draw = () => { b.classList.toggle('on', opts.flashlight()); b.textContent = opts.flashlight() ? 'Выключить' : 'Включить'; };
    b.addEventListener('click', () => { opts.flashlight(!opts.flashlight()); opts.tone(1500, 0.03, 'square'); draw(); });
    body.append(b, h('p', 'ph-empty', 'Фонарик освещает всё вокруг ночью, но быстрее тратит заряд'));
    draw();
  }
  function settingsApp(body) {
    const s = st();
    body.appendChild(h('h3', '', 'Обои'));
    const row = h('div', 'ph-walls');
    WALLPAPERS.forEach((w, i) => {
      const b = h('button', 'ph-wall' + ((s.wallpaper || 0) === i ? ' sel' : ''));
      b.style.background = w;
      b.addEventListener('click', () => { s.wallpaper = i; screen.style.background = w; opts.save(); body.innerHTML = ''; settingsApp(body); });
      row.appendChild(b);
    });
    body.appendChild(row);
    const w = opts.wifi();
    [['Wi-Fi', w ? 'Подключено · ' + ['', 'слабый', 'хороший', 'отличный'][w] + ' сигнал' : 'Нет сети (нужен роутер рядом)'],
      ['Батарея', Math.floor(s.battery) + '%' + (opts.charging() ? ' · заряжается' : '')],
      ['Приложений', String(allApps().length)], ['Фото', String((s.photos || []).length)],
      ['Модель', 'BroniPhone 15 Pro Max']].forEach(([k, v]) => {
      const r = h('div', 'ph-setrow');
      r.append(h('span', '', k), h('b', '', v));
      body.appendChild(r);
    });
  }
  function weatherApp(body) {
    const w = opts.weather();
    body.append(h('div', 'ph-weather', w.icon), h('div', 'ph-bigclock', w.temp + '°'), h('p', 'ph-empty', w.text));
  }
  function mapApp(body) {
    const cv = h('canvas', 'ph-map');
    const R = 48, S = 3;
    cv.width = cv.height = (R * 2 + 1) * S;
    const ctx = cv.getContext('2d');
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      ctx.fillStyle = opts.mapColor(dx, dz);
      ctx.fillRect((dx + R) * S, (dz + R) * S, S, S);
    }
    ctx.fillStyle = '#ff2a2a';
    ctx.beginPath();
    const c = R * S + S / 2, a = opts.compass().yaw;
    ctx.moveTo(c - Math.sin(a) * 9, c - Math.cos(a) * 9);
    ctx.lineTo(c - Math.sin(a + 2.5) * 6, c - Math.cos(a + 2.5) * 6);
    ctx.lineTo(c - Math.sin(a - 2.5) * 6, c - Math.cos(a - 2.5) * 6);
    ctx.fill();
    body.append(cv, h('p', 'ph-empty', 'Красная стрелка — это ты'));
  }
  function compassApp(body) {
    const dial = h('div', 'ph-compass');
    const needle = h('div', 'ph-needle');
    dial.append(h('span', 'n', 'С'), h('span', 'e', 'В'), h('span', 's', 'Ю'), h('span', 'w', 'З'), needle);
    const info = h('p', 'ph-empty', '');
    body.append(dial, info);
    ticker = () => {
      const c = opts.compass();
      dial.style.transform = `rotate(${c.yaw * 180 / Math.PI}deg)`;
      info.textContent = `X ${Math.round(c.x)}  Y ${Math.round(c.y)}  Z ${Math.round(c.z)}`;
    };
  }
  // мелодии: [нота, длительность]
  const N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587 };
  const SONGS = [
    ['В лесу родилась ёлочка', 'C4 A4 A4 G4 A4 F4 C4 C4 C4 A4 A4 B4 G4 C5'],
    ['Ода к радости', 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4'],
    ['Маленькая звёздочка', 'C4 C4 G4 G4 A4 A4 G4 F4 F4 E4 E4 D4 D4 C4'],
  ];
  function musicApp(body) {
    let timer = null;
    const stop = () => { if (timer) clearTimeout(timer); timer = null; };
    SONGS.forEach(([name, notes]) => {
      const b = h('button', 'ph-row');
      b.append(h('span', 'ph-ava', '🎵'), h('span', 'ph-row-name', name), h('span', 'ph-row-act', '▶'));
      b.addEventListener('click', () => {
        stop();
        const seq = notes.split(' ');
        let i = 0;
        const next = () => {
          if (i >= seq.length) return;
          opts.tone(N[seq[i]], 0.35, 'triangle');
          i++;
          timer = setTimeout(next, 380);
        };
        next();
      });
      body.appendChild(b);
    });
    return stop;
  }

  return { init, open, close, tick };
})();
