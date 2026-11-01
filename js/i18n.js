'use strict';

// Языки игры: русский (родной), английский и арабский (справа налево).
// Код игры пишет тексты по-русски, а переводчик подменяет их на экране: в меню, подсказках,
// сообщениях, окнах телефона и компьютера и в надписях на холсте. Сначала ищется точный
// перевод, потом шаблон (с числами и названиями внутри), потом переводятся знакомые слова в строке.
const I18N = (() => {
  const LANGS = { ru: 'Русский', en: 'English', ar: 'العربية' };
  let lang = 'ru';
  try { lang = localStorage.getItem('bronicraft-lang') || 'ru'; } catch (e) { /* ничего */ }
  if (!LANGS[lang]) lang = 'ru';
  const col = { en: 0, ar: 1 }[lang];

  // словарь: «по-русски|по-английски|по-арабски»
  const RAW = `
Миры|Worlds|العوالم
Моды|Mods|الإضافات
Карты|Maps|الخرائط
Строй свой мир по кубику!|Build your world block by block!|ابنِ عالمك مكعبًا بعد مكعب!
Изменить героя|Edit hero|تعديل البطل
Мои миры|My worlds|عوالمي
Создать новый мир|Create new world|إنشاء عالم جديد
Создать мир|Create world|إنشاء العالم
Новый мир|New world|عالم جديد
Название мира|World name|اسم العالم
Ключ мира (необязательно)|World seed (optional)|بذرة العالم (اختياري)
случайный|random|عشوائي
Режим игры|Game mode|نمط اللعب
Выживание|Survival|البقاء
Творчество|Creative|الإبداع
Начинаешь с пустыми руками. Добывай, крафти, выживай!|You start empty-handed. Mine, craft, survive!|تبدأ بيدين فارغتين. احفر واصنع وابقَ حيًا!
Все блоки сразу, можно летать, нельзя погибнуть|All blocks at once, you can fly and can't die|كل المكعبات فورًا، يمكنك الطيران ولا يمكنك الموت
Сложность|Difficulty|الصعوبة
Мирный|Peaceful|سلمي
Лёгкий|Easy|سهل
Нормальный|Normal|عادي
Сложный|Hard|صعب
Нет монстров, здоровье быстро растёт|No monsters, health grows back fast|لا وحوش، والصحة تعود بسرعة
Ночью немного слабых монстров|A few weak monsters at night|بعض الوحوش الضعيفة ليلًا
Сильные монстры, вещи теряются|Strong monsters, items get lost|وحوش قوية، والأغراض تضيع
Тип мира|World type|نوع العالم
Обычный|Normal|عادي
Обычная игра|Normal game|لعبة عادية
Горы, леса, моря, пещеры, шахты и деревни|Mountains, forests, seas, caves, mines and villages|جبال وغابات وبحار وكهوف ومناجم وقرى
Плоский|Flat|مسطح
Ровная трава до горизонта — для больших построек|Flat grass to the horizon — for big builds|عشب مستوٍ حتى الأفق — للمباني الكبيرة
Назад|Back|رجوع
Начать игру|Start game|ابدأ اللعب
Строим мир…|Building the world…|نبني العالم…
Мир готов!|World is ready!|العالم جاهز!
Пауза|Pause|إيقاف مؤقت
Продолжить|Continue|متابعة
Сохранить и выйти|Save and quit|حفظ وخروج
Ты погиб!|You died!|لقد متَّ!
Возродиться|Respawn|العودة للحياة
Начать заново|Start over|ابدأ من جديد
Управление|Controls|التحكم
Инвентарь|Inventory|الحقيبة
Крафт|Crafting|الصناعة
Готово (E)|Done (E)|تم (E)
Готово|Done|تم
Готово!|Done!|تم!
Нажми на ячейку, чтобы взять вещь, и на другую — чтобы положить.|Tap a slot to take an item, then another slot to put it.|اضغط على خانة لأخذ الغرض، ثم على أخرى لوضعه.
Правая кнопка — по одной штуке.|Right click — one at a time.|الزر الأيمن — قطعة واحدة.
Здесь — простые рецепты. Остальные откроются на верстаке: сделай его из 4 досок, поставь и нажми на него правой кнопкой.|Simple recipes are here. The rest open at a crafting table: make it from 4 planks, place it and right-click it.|هنا الوصفات البسيطة. البقية تُفتح على طاولة الصناعة: اصنعها من 4 ألواح وضعها واضغط عليها بالزر الأيمن.
Поиск по названию…|Search by name…|ابحث بالاسم…
Поиск рецептов… например «кирка»|Search recipes… e.g. «pickaxe»|ابحث عن وصفة… مثل «معول»
Все блоки и вещи|All blocks and items|كل المكعبات والأغراض
Всё|All|الكل
Стройка|Building|البناء
Природа|Nature|الطبيعة
Дом|Home|المنزل
Инструменты|Tools|الأدوات
Еда|Food|الطعام
Транспорт|Transport|النقل
Разное|Misc|متنوع
мод|mod|إضافة
нужен верстак|needs table|يلزم طاولة
Верстак|Crafting table|طاولة الصناعة
Рецепты|Recipes|الوصفات
Создай своего героя|Create your hero|أنشئ بطلك
Никнейм|Nickname|الاسم
Например, Броня|For example, Bronya|مثلًا، برونيا
Инструмент|Tool|الأداة
Кисть|Brush|فرشاة
Заливка|Fill|تعبئة
Пипетка|Picker|القطارة
Цвет|Color|اللون
свой цвет|own color|لون خاص
Рисуй внутри белых рамок: голова, тело, руки и ноги. Это твой герой спереди.|Draw inside the white frames: head, body, arms and legs. This is your hero from the front.|ارسم داخل الإطارات البيضاء: الرأس والجسم والذراعين والساقين. هذا بطلك من الأمام.
Голова|Head|الرأس
Тело|Body|الجسم
Рука|Arm|الذراع
Нога|Leg|الساق
Напиши свой никнейм!|Write your nickname!|اكتب اسمك!
Игрок|Player|لاعب
Пока нет ни одного мира.|No worlds yet.|لا توجد عوالم بعد.
Нажми «Создать новый мир»!|Press «Create new world»!|اضغط «إنشاء عالم جديد»!
Играть|Play|العب
Удалить мир|Delete world|حذف العالم
Удалить|Delete|حذف
Скачать|Download|تنزيل
Включить|Enable|تفعيل
Выключить|Disable|تعطيل
Включён ✓|Enabled ✓|مفعّل ✓
Выключен|Disabled|معطّل
Играть на карте|Play on map|العب على الخريطة
Мой мир|My world|عالمي
Мой первый мир|My first world|عالمي الأول
Мир|World|عالم
Режим|Mode|النمط
Мышь|Mouse|الفأرة
смотреть|look|النظر
ходить|walk|المشي
Пробел|Space|المسافة
прыжок|jump|قفز
Прыжок|Jump|قفز
Полёт ▲|Fly ▲|طيران ▲
Выйти|Get out|انزل
бег|run|ركض
ЛКМ (держать)|LMB (hold)|الزر الأيسر (اضغط مطولًا)
добывать / бить|mine / hit|احفر / اضرب
ПКМ|RMB|الزر الأيمن
поставить блок|place block|ضع مكعبًا
1–9 / колёсико|1–9 / wheel|1–9 / العجلة
выбрать|select|اختر
инвентарь и крафт|inventory and crafting|الحقيبة والصناعة
пауза|pause|إيقاف مؤقت
F / 2× пробел|F / 2× space|F / مسافة مرتين
полёт (творчество)|fly (creative)|الطيران (الإبداع)
вниз|down|للأسفل
камера: глаза / сзади / спереди|camera: eyes / behind / front|الكاميرا: العينان / من الخلف / من الأمام
ПКМ по верстаку|RMB on table|الزر الأيمن على الطاولة
крафт|crafting|الصناعة
ПКМ по кровати|RMB on bed|الزر الأيمن على السرير
поспать|sleep|النوم
ПКМ по жителю|RMB on villager|الزر الأيمن على القروي
поболтать|chat|الدردشة
ПКМ с едой|RMB with food|الزر الأيمن مع الطعام
съесть|eat|الأكل
ПКМ по машине|RMB on car|الزر الأيمن على السيارة
сесть|get in|اركب
Shift в машине|Shift in car|Shift في السيارة
выйти|get out|انزل
В самолёте|In a plane|في الطائرة
W газ, мышь — куда лететь|W throttle, mouse — where to fly|W للوقود، والفأرة لاتجاه الطيران
Shift в полёте|Shift while flying|Shift أثناء الطيران
ПКМ по поезду|RMB on train|الزر الأيمن على القطار
сесть в метро|ride the metro|اركب المترو
ПКМ по компьютеру|RMB on computer|الزر الأيمن على الحاسوب
включить|turn on|تشغيل
ПКМ с телефоном|RMB with phone|الزر الأيمن مع الهاتف
открыть телефон|open phone|افتح الهاتف
Лифт|Lift|المصعد
Выбери этаж|Choose floor|اختر الطابق
Закрыть|Close|إغلاق
Лифт едет…|Lift is moving…|المصعد يتحرك…
Крыша|Roof|السطح
Камера|Camera|الكاميرا
Превращения|Transformations|التحولات
В кого превратиться? Правая кнопка с пустой рукой — голос (а курочка несёт яйца).|What to turn into? Right click with an empty hand — voice (and the hen lays eggs).|إلى ماذا تتحول؟ الزر الأيمن بيد فارغة — صوت (والدجاجة تبيض).
Закрыть (R)|Close (R)|إغلاق (R)
Закрыть (G)|Close (G)|إغلاق (G)
Блок:|Block:|المكعب:
Менять только:|Change only:|غيّر فقط:
Число / радиус|Number / radius|العدد / نصف القطر
Высота|Height|الارتفاع
пустые внутри|hollow|مجوّفة
кисть-шар на правую кнопку|sphere brush on right click|فرشاة كرة على الزر الأيمن
● Прямой эфир|● Live|● مباشر
📺 Камеры|📺 Cameras|📺 الكاميرات
📺 Смотреть камеры|📺 Watch cameras|📺 شاهد الكاميرات
Сундук|Chest|صندوق
Печка|Furnace|فرن
Печка (горит)|Furnace (lit)|فرن (مشتعل)
Клади сюда вещи — они останутся в сундуке, даже если уйдёшь.|Put items here — they stay in the chest even if you leave.|ضع الأغراض هنا — ستبقى في الصندوق حتى لو غادرت.
Сверху — что переплавить (руда, песок, сырое мясо, булыжник, бревно), снизу — топливо (уголь, дерево). Готовое появится справа.|Top — what to smelt (ore, sand, raw meat, cobblestone, log), bottom — fuel (coal, wood). The result appears on the right.|في الأعلى ما تريد صهره (خام، رمل، لحم نيء، حجر مرصوف، جذع)، وفي الأسفل الوقود (فحم، خشب). تظهر النتيجة على اليمين.
Это нельзя переплавить|This can't be smelted|لا يمكن صهر هذا
Это не горит. Подойдёт уголь, дерево или доски|This doesn't burn. Use coal, wood or planks|هذا لا يحترق. استخدم الفحم أو الخشب أو الألواح
Инвентарь полон|Inventory is full|الحقيبة ممتلئة
Инвентарь полон!|Inventory is full!|الحقيبة ممتلئة!
Не хватает материалов|Not enough materials|المواد غير كافية
Нужен верстак! Поставь его и нажми на него правой кнопкой|You need a crafting table! Place it and right-click it|تحتاج إلى طاولة صناعة! ضعها واضغط عليها بالزر الأيمن
Нажми V, чтобы смотреть на героя сзади или спереди|Press V to see your hero from behind or the front|اضغط V لرؤية بطلك من الخلف أو الأمام
Камера: глазами героя|Camera: first person|الكاميرا: بعيني البطل
Камера: сзади|Camera: behind|الكاميرا: من الخلف
Камера: спереди|Camera: front|الكاميرا: من الأمام
Полёт включён|Flying on|الطيران مفعّل
Полёт выключен|Flying off|الطيران معطّل
Тяни мышью, чтобы смотреть|Drag the mouse to look around|اسحب الفأرة للنظر حولك
Нажми «Продолжить» ещё раз|Press «Continue» again|اضغط «متابعة» مرة أخرى
Ты не голоден|You're not hungry|لست جائعًا
Доброе утро! Ты выспался|Good morning! You slept well|صباح الخير! لقد نمت جيدًا
Спать можно только ночью. Здесь ты будешь появляться|You can only sleep at night. You'll respawn here|يمكنك النوم ليلًا فقط. ستعود للحياة هنا
Для двери нужно два блока высоты|A door needs two blocks of height|يحتاج الباب إلى ارتفاع مكعبين
Нужно два блока высоты|Needs two blocks of height|يحتاج إلى ارتفاع مكعبين
Отойди из дверного проёма|Step out of the doorway|ابتعد عن مدخل الباب
Зажигалкой можно поджечь динамит|The lighter can light dynamite|يمكن إشعال الديناميت بالولاعة
Парашют раскрылся!|Parachute opened!|انفتحت المظلة!
Выйти можно, когда поезд стоит у платформы|You can get out when the train stops at a platform|يمكنك النزول عندما يتوقف القطار عند الرصيف
Вагонетка! W — толкать вперёд, S — тормоз и назад, Shift — вылезти|Minecart! W — push forward, S — brake and back, Shift — get out|عربة! W — ادفع للأمام، S — فرامل وللخلف، Shift — انزل
Поезд едет сам! W — вести самому, S — тормоз, Shift — выйти на станции|The train drives itself! W — drive, S — brake, Shift — get out at a station|القطار يسير وحده! W — قُده بنفسك، S — فرامل، Shift — انزل في المحطة
W — газ, S — тормоз, мышь — куда лететь. Разгонись, чтобы взлететь! Shift — выйти|W — throttle, S — brake, mouse — where to fly. Speed up to take off! Shift — get out|W — وقود، S — فرامل، الفأرة لاتجاه الطيران. تسارع لتقلع! Shift — انزل
W — прибавить газ, S — убавить (на земле — тормоз), мышь — куда лететь. Набери скорость для взлёта! Shift — выйти|W — more throttle, S — less (brake on the ground), mouse — where to fly. Gain speed to take off! Shift — get out|W — زِد الوقود، S — أنقصه (فرامل على الأرض)، الفأرة لاتجاه الطيران. اكتسب السرعة لتقلع! Shift — انزل
W/S — газ и тормоз, A/D — руль, Shift — выйти|W/S — gas and brake, A/D — steer, Shift — get out|W/S — وقود وفرامل، A/D — توجيه، Shift — انزل
Включи мод «Метро» в главном меню|Enable the «Metro» mod in the main menu|فعّل إضافة «المترو» في القائمة الرئيسية
Поставь вагонетку на рельсы|Put the minecart on rails|ضع العربة على القضبان
Поставь поезд на рельсы|Put the train on rails|ضع القطار على القضبان
Садись в вагонетку правой кнопкой|Right-click the minecart to get in|اضغط بالزر الأيمن على العربة لتركبها
Поезд поедет сам. Положи мрамор под рельсы — там будут остановки|The train will drive itself. Put marble under the rails — those are the stops|سيسير القطار وحده. ضع رخامًا تحت القضبان — ستكون هناك محطات
Поставь корабль на воду: нажми на дно под водой|Put the ship on water: click the bottom under the water|ضع السفينة على الماء: اضغط على القاع تحت الماء
Корабль ставится на воду: нажми на дно под водой|Ships go on water: click the bottom under the water|السفن توضع على الماء: اضغط على القاع تحت الماء
Остановка|Stop|محطة
Этаж: |Floor: |الطابق:
Поставь ещё одну кнопку лифта выше или ниже в том же столбике|Place another lift button above or below in the same column|ضع زر مصعد آخر أعلى أو أسفل في نفس العمود
Добро пожаловать! |Welcome! |أهلًا وسهلًا!
машину|car|السيارة
самолёт|plane|الطائرة
корабль|ship|السفينة
Скачай мод «Лифт» во вкладке «Моды»|Download the «Lift» mod in the «Mods» tab|نزّل إضافة «المصعد» من تبويب «الإضافات»
Скачай мод «Телефон» во вкладке «Моды»|Download the «Phone» mod in the «Mods» tab|نزّل إضافة «الهاتف» من تبويب «الإضافات»
Скачай мод «Мини-мир» во вкладке «Моды»|Download the «Mini world» mod in the «Mods» tab|نزّل إضافة «العالم المصغّر» من تبويب «الإضافات»
Скачай мод «Физган» во вкладке «Моды»|Download the «Physgun» mod in the «Mods» tab|نزّل إضافة «مسدس الفيزياء» من تبويب «الإضافات»
Скачай мод «World changing» во вкладке «Моды»|Download the «World changing» mod in the «Mods» tab|نزّل إضافة «World changing» من تبويب «الإضافات»
Скачай мод «Камеры» во вкладке «Моды»|Download the «Cameras» mod in the «Mods» tab|نزّل إضافة «الكاميرات» من تبويب «الإضافات»
Скачай мод «Превращения» во вкладке «Моды»|Download the «Transformations» mod in the «Mods» tab|نزّل إضافة «التحولات» من تبويب «الإضافات»
Сначала выйди из машины|Get out of the car first|انزل من السيارة أولًا
Тут мало места|Not enough room here|لا توجد مساحة كافية هنا
Тут мало места для такого превращения|Not enough room for this transformation|لا توجد مساحة كافية لهذا التحول
Тут мало места, чтобы вырасти!|Not enough room to grow!|لا توجد مساحة كافية لتكبر!
Ты снова герой|You're a hero again|عدت بطلًا من جديد
Ты снова обычного роста|You're normal size again|عدت إلى حجمك العادي
Ты уменьшился! Теперь ты строишь мини-блоками|You shrank! Now you build with mini blocks|لقد صغرت! الآن تبني بمكعبات صغيرة
Маленький герой всегда строит мини-блоками|A small hero always builds with mini blocks|البطل الصغير يبني دائمًا بمكعبات صغيرة
Стройка мини-блоками: включена|Mini block building: on|البناء بمكعبات صغيرة: مفعّل
Стройка мини-блоками: выключена|Mini block building: off|البناء بمكعبات صغيرة: معطّل
Этот блок нельзя уменьшить|This block can't be shrunk|لا يمكن تصغير هذا المكعب
Блок заморожен|Block frozen|تم تجميد المكعب
Машина заморожена в воздухе|Car frozen in the air|تم تجميد السيارة في الهواء
Зажми левую кнопку, чтобы схватить. Правая — заморозить в воздухе|Hold the left button to grab. Right — freeze in the air|اضغط مطولًا على الزر الأيسر للإمساك. الأيمن — للتجميد في الهواء
World changing работает в творческом режиме|World changing works in creative mode|World changing يعمل في وضع الإبداع
Сначала выбери палочкой две точки: левая и правая кнопка|First pick two points with the wand: left and right button|اختر أولًا نقطتين بالعصا: الزر الأيسر والأيمن
Выбери в «Менять только», какой блок заменить|Choose which block to replace in «Change only»|اختر في «غيّر فقط» أي مكعب تريد استبداله
Сначала скопируй что-нибудь|Copy something first|انسخ شيئًا أولًا
Копия повёрнута на 90°|Copy rotated 90°|تم تدوير النسخة 90°
Копия отражена|Copy mirrored|تم عكس النسخة
Отменять нечего|Nothing to undo|لا يوجد ما يُلغى
Возвращать нечего|Nothing to redo|لا يوجد ما يُعاد
Выделение снято|Selection cleared|تم إلغاء التحديد
Точка 1: левая кнопка палочкой|Point 1: left click with the wand|النقطة 1: الزر الأيسر بالعصا
Точка 2: правая кнопка палочкой|Point 2: right click with the wand|النقطة 2: الزر الأيمن بالعصا
Выделение|Selection|التحديد
Изменить|Change|تعديل
Буфер|Clipboard|الحافظة
Фигуры|Shapes|الأشكال
История|History|السجل
Точка 1 здесь (//pos1)|Point 1 here (//pos1)|النقطة 1 هنا (//pos1)
Точка 2 здесь (//pos2)|Point 2 here (//pos2)|النقطة 2 هنا (//pos2)
Растянуть куда смотрю (//expand)|Expand where I look (//expand)|وسّع حيث أنظر (//expand)
Снять выделение (//sel)|Clear selection (//sel)|إلغاء التحديد (//sel)
Заполнить (//set)|Fill (//set)|املأ (//set)
Заменить (//replace)|Replace (//replace)|استبدل (//replace)
Очистить (//set air)|Clear (//set air)|امسح (//set air)
Стены (//walls)|Walls (//walls)|جدران (//walls)
Коробка (//faces)|Box (//faces)|صندوق (//faces)
Повторить N раз туда, куда смотрю (//stack)|Repeat N times where I look (//stack)|كرّر N مرات حيث أنظر (//stack)
Сдвинуть на N туда, куда смотрю (//move)|Move N where I look (//move)|حرّك N حيث أنظر (//move)
Копировать (//copy)|Copy (//copy)|انسخ (//copy)
Вырезать (//cut)|Cut (//cut)|قص (//cut)
Вставить у меня (//paste)|Paste here (//paste)|الصق هنا (//paste)
Повернуть копию на 90° (//rotate)|Rotate copy 90° (//rotate)|دوّر النسخة 90° (//rotate)
Отразить копию (//flip)|Mirror copy (//flip)|اعكس النسخة (//flip)
Шар радиусом N (//sphere)|Sphere of radius N (//sphere)|كرة نصف قطرها N (//sphere)
Цилиндр N × высота (//cyl)|Cylinder N × height (//cyl)|أسطوانة N × الارتفاع (//cyl)
Пирамида высотой N (//pyramid)|Pyramid of height N (//pyramid)|هرم بارتفاع N (//pyramid)
Убрать воду вокруг (//drain)|Drain water around (//drain)|اسحب الماء حولك (//drain)
Отменить (//undo)|Undo (//undo)|تراجع (//undo)
Вернуть (//redo)|Redo (//redo)|إعادة (//redo)
Заполнено|Filled|تمت التعبئة
Заменено|Replaced|تم الاستبدال
Очищено|Cleared|تم المسح
Стены|Walls|جدران
Коробка|Box|صندوق
Повторено|Repeated|تم التكرار
Сдвинуто|Moved|تم النقل
Вырезано|Cut|تم القص
Вставлено|Pasted|تم اللصق
Шар|Sphere|كرة
Цилиндр|Cylinder|أسطوانة
Пирамида|Pyramid|هرم
Вода убрана|Water drained|تم سحب الماء
блоков|blocks|مكعبات
Камер пока нет. Сделай камеру на верстаке (2 железа, стекло, чёрная шерсть) и повесь на стену — она смотрит туда, где ты стоял.|No cameras yet. Make one at a crafting table (2 iron, glass, black wool) and hang it on a wall — it looks where you stood.|لا توجد كاميرات بعد. اصنع كاميرا على طاولة الصناعة (2 حديد، زجاج، صوف أسود) وعلّقها على جدار — ستنظر حيث كنت تقف.
записи пока нет|no recording yet|لا يوجد تسجيل بعد
Зачерпни ведром воду или лаву|Scoop water or lava with the bucket|اغرف الماء أو الحمم بالدلو
Это течение — зачерпни там, откуда течёт|This is a stream — scoop where it flows from|هذا تيار — اغرف من حيث يتدفق
Вода зачерпнута|Water scooped|تم غرف الماء
Лава зачерпнута|Lava scooped|تم غرف الحمم
Вылей ведро на землю или на блок|Pour the bucket on the ground or a block|اسكب الدلو على الأرض أو على مكعب
Пш-ш-ш! Лава застыла в обсидиан|Hiss! Lava turned into obsidian|ششش! تجمدت الحمم وأصبحت سبَجًا
🔥 Горячо! Скорее из лавы!|🔥 Hot! Get out of the lava!|🔥 ساخن! اخرج من الحمم بسرعة!
Нажми яйцом на землю или на блок|Use the egg on the ground or a block|استخدم البيضة على الأرض أو على مكعب
Яйцо ещё не готово|The egg isn't ready yet|البيضة ليست جاهزة بعد
⚠️ Мир не сохранился: в браузере кончилось место|⚠️ World not saved: the browser is out of space|⚠️ لم يُحفظ العالم: نفدت المساحة في المتصفح
Ням! |Yum! |لذيذ!
Хрю-хрю!|Oink-oink!|أوينك أوينك!
Му-у-у!|Moo-oo!|موو!
Бе-е-е!|Baa-aa!|ماء!
Ко-ко-ко!|Cluck-cluck!|كاك كاك!
Хм-м-м!|Hmm-mm!|همم!
Бу-у!|Boo!|بوو!
Ррр-а-а!|Grrr-aah!|غررر!
Хм-р-р-р!|Hm-rrr!|همررر!
Хр-р-р...|Hrrr...|خررر...
Буль-буль!|Glub-glub!|بلُب بلُب!
Р-р-р!|Grr!|غرر!
Жжж-жжж!|Bzzz-bzzz!|بززز!
Шшш...|Shhh...|ششش...
Ф-ф-ф!|Ffff!|ففف!
Тсс!|Tss!|تسس!
Стать собой|Be yourself|كن نفسك
обычный герой|normal hero|بطل عادي
бегает чуть быстрее|runs a bit faster|يركض أسرع قليلًا
большая и неторопливая|big and slow|كبيرة وبطيئة
мягкая и пушистая|soft and fluffy|ناعمة ومنفوشة
плавно падает, несёт яйца|falls softly, lays eggs|تسقط بلطف وتبيض
с большим носом|with a big nose|بأنف كبير
Буки принимают за своего|Bukas think you're one of them|البوكا يظنونك واحدًا منهم
Буки не нападают|Bukas don't attack|البوكا لا يهاجمون
дышит под водой, быстро плавает|breathes underwater, swims fast|يتنفس تحت الماء ويسبح بسرعة
быстро плавает, дышит под водой|swims fast, breathes underwater|تسبح بسرعة وتتنفس تحت الماء
маленький и очень быстрый|small and very fast|صغير وسريع جدًا
крошечный, летает (держи прыжок)|tiny, flies (hold jump)|صغير جدًا ويطير (اضغط القفز)
медленная, ползает по стенам|slow, crawls up walls|بطيئة وتزحف على الجدران
очень быстрая, лазает по стенам|very fast, climbs walls|سريعة جدًا وتتسلق الجدران
Привет|Hi|مرحبًا
Привет, {name}!|Hi, {name}!|مرحبًا يا {name}!
Хорошая сегодня погода!|Nice weather today!|الطقس جميل اليوم!
Ночью тут бродят Буки, будь осторожен!|Bukas roam here at night, be careful!|البوكا يتجولون هنا ليلًا، كن حذرًا!
В нашем колодце самая вкусная вода.|Our well has the tastiest water.|بئرنا فيه ألذ ماء.
Ты построил что-нибудь красивое?|Did you build something beautiful?|هل بنيت شيئًا جميلًا؟
На верстаке можно сделать кирку.|You can make a pickaxe at the crafting table.|يمكنك صنع معول على طاولة الصناعة.
Заходи в гости!|Come visit!|تعال لزيارتنا!
Житель: Ай! Не дерись!|Villager: Ouch! Don't fight!|القروي: آي! لا تضرب!
друг|friend|صديق
Город |Town |مدينة
Деревня «|Village «|قرية «
Новобронск|Novobronsk|نوفوبرونسك
Малые Ёлки|Little Firs|الصنوبرات الصغيرة
Берёзовка|Beryozovka|بيريوزوفكا
Пирожково|Pirozhkovo|بيروجكوفو
Центральная|Central|المركزية
Северная|Northern|الشمالية
Южная|Southern|الجنوبية
Парковая|Park|الحديقة
Депо|Depot|المستودع
Небо|Sky|السماء
Сад|Garden|الحديقة
Река|River|النهر
км/ч|km/h|كم/س
задний ход|reverse|للخلف
назад|back|للخلف
⚠ мало скорости!|⚠ too slow!|⚠ السرعة منخفضة!
сейчас |now |الآن
Камера |Camera |كاميرا
Шейдеры «Солнышко»|«Sunny» shaders|مؤثرات «الشمس»
Свет и тени от солнца, качающаяся листва, волны на воде, небо с сиянием, сочные цвета и красивые закаты.|Sunlight and shadows, swaying leaves, waves on water, a glowing sky, rich colors and beautiful sunsets.|ضوء الشمس والظلال، أوراق تتمايل، أمواج على الماء، سماء متوهجة، ألوان زاهية وغروب جميل.
Машины|Cars|السيارات
Красная, синяя, жёлтая, белая и чёрная машины. Делаются на верстаке из железа и угля. Садись и катайся!|Red, blue, yellow, white and black cars. Made at a crafting table from iron and coal. Get in and drive!|سيارات حمراء وزرقاء وصفراء وبيضاء وسوداء. تُصنع على طاولة الصناعة من الحديد والفحم. اركب وانطلق!
Самолёты|Planes|الطائرات
Красный, синий и жёлтый самолёты и большой Боинг. Разгонись по земле и взлетай! Выпрыгнешь в небе — раскроется парашют.|Red, blue and yellow planes and a big Boeing. Speed up on the ground and take off! Jump out in the sky — a parachute opens.|طائرات حمراء وزرقاء وصفراء وطائرة بوينغ كبيرة. تسارع على الأرض وأقلع! إذا قفزت في السماء ستنفتح المظلة.
Метро|Metro|المترو
Поезда метро и рельсы. В «Городе» появится линия под землёй с 4 станциями и депо, а поезд будет ездить сам. Можно сесть или вести самому.|Metro trains and rails. «City» gets an underground line with 4 stations and a depot, and the train runs by itself. Ride it or drive it yourself.|قطارات المترو والقضبان. ستظهر في «المدينة» خط تحت الأرض بأربع محطات ومستودع، وسيسير القطار وحده. اركبه أو قُده بنفسك.
Телефон|Phone|الهاتف
Смартфон BroniPhone: звонки, сообщения, камера, магазин приложений и браузер. Плюс зарядная станция и Wi-Fi роутер. Телефон приходит разряженным!|BroniPhone smartphone: calls, messages, camera, app store and browser. Plus a charging station and a Wi-Fi router. The phone arrives with a dead battery!|هاتف BroniPhone الذكي: مكالمات ورسائل وكاميرا ومتجر تطبيقات ومتصفح. مع محطة شحن وموجه Wi-Fi. يصل الهاتف وبطاريته فارغة!
Лифты с кнопками. Поставь кнопки лифта друг над другом на разных этажах — нажимаешь и едешь. В ЖК лифты уже есть, даже на парковку и крышу.|Lifts with buttons. Place lift buttons above each other on different floors — press and ride. The housing complexes already have lifts, even to the parking and roof.|مصاعد بأزرار. ضع أزرار المصعد فوق بعضها في طوابق مختلفة — اضغط واصعد. المجمعات السكنية فيها مصاعد بالفعل، حتى إلى الموقف والسطح.
Ванная и туалет|Bathroom|الحمّام
Унитаз, раковина, ванна, душевая кабина, стиральная машина и зеркало. Уже стоят во всех квартирах ЖК и на улице Ленина.|Toilet, sink, bathtub, shower, washing machine and mirror. Already in every flat of the complexes and on Lenin Street.|مرحاض ومغسلة وحوض استحمام ودش وغسالة ومرآة. موجودة في كل شقق المجمعات وفي شارع لينين.
Компьютер|Computer|الحاسوب
Настоящий компьютер BroniOS: змейка, рисовалка, калькулятор, пианино, блокнот. Делается на верстаке.|A real BroniOS computer: snake, paint, calculator, piano, notepad. Made at a crafting table.|حاسوب BroniOS حقيقي: لعبة الثعبان والرسم والآلة الحاسبة والبيانو والمفكرة. يُصنع على طاولة الصناعة.
Уютный дом|Cozy home|البيت المريح
Мебель: стул, стол, диван, телевизор, холодильник, шкаф, ковёр, торшер и цветок в горшке. Делается на верстаке.|Furniture: chair, table, sofa, TV, fridge, wardrobe, carpet, floor lamp and potted flower. Made at a crafting table.|أثاث: كرسي وطاولة وأريكة وتلفاز وثلاجة وخزانة وسجادة ومصباح أرضي وزهرة في أصيص. يُصنع على طاولة الصناعة.
Мини-мир|Mini world|العالم المصغّر
Уменьшатель и мини-блоки! Правой кнопкой — стань крошечным (или уменьши моба), левой по блоку — он рассыпется на 64 мини-блока. Маленький герой строит мини-блоками, а обычный — если нажать M.|Shrink ray and mini blocks! Right click — become tiny (or shrink a mob), left click a block — it breaks into 64 mini blocks. A small hero builds with mini blocks, a normal one — after pressing M.|مصغّر ومكعبات صغيرة! الزر الأيمن — صر صغيرًا جدًا (أو صغّر مخلوقًا)، والأيسر على مكعب — يتفتت إلى 64 مكعبًا صغيرًا. البطل الصغير يبني بالمكعبات الصغيرة، والعادي بعد الضغط على M.
Физган|Physgun|مسدس الفيزياء
Физическая пушка! Зажми левую кнопку — схватишь блок, моба или машину и понесёшь по воздуху. Колесо — ближе или дальше. Отпусти — бросишь. Правая кнопка — заморозить прямо в воздухе.|Physics gun! Hold the left button to grab a block, mob or car and carry it through the air. Wheel — closer or farther. Release — throw. Right button — freeze it in the air.|مسدس الفيزياء! اضغط مطولًا على الزر الأيسر لتمسك مكعبًا أو مخلوقًا أو سيارة وتحملها في الهواء. العجلة — أقرب أو أبعد. اترك — لترمي. الزر الأيمن — جمّده في الهواء.
Редактор мира для творческого режима. Палочкой выбери два угла (левая и правая кнопка), нажми G — и заполняй, заменяй, строй стены, копируй и вставляй, делай шары, цилиндры и пирамиды. Есть «Отменить».|World editor for creative mode. Pick two corners with the wand (left and right button), press G — and fill, replace, build walls, copy and paste, make spheres, cylinders and pyramids. There's «Undo».|محرر العالم لوضع الإبداع. اختر زاويتين بالعصا (الزر الأيسر والأيمن)، اضغط G — واملأ واستبدل وابنِ الجدران وانسخ والصق واصنع كرات وأسطوانات وأهرامات. يوجد «تراجع».
Камеры видеонаблюдения|Security cameras|كاميرات المراقبة
Повесь камеры на стены — они по-настоящему записывают всё, что видят (последние 2 минуты). На экране для камер смотри прямой эфир или перематывай запись. Экран можно открыть правой кнопкой или из инвентаря.|Hang cameras on walls — they really record everything they see (the last 2 minutes). Watch live or rewind on the camera screen. Open the screen with a right click or from the inventory.|علّق الكاميرات على الجدران — إنها تسجّل فعلًا كل ما تراه (آخر دقيقتين). شاهد البث المباشر أو أعد التسجيل على شاشة الكاميرات. افتح الشاشة بالزر الأيمن أو من الحقيبة.
Нажми R и превратись в свинку, корову, овечку, курочку, жителя, Буку или в одного из пяти зомби: обычного, зомби-жителя, пустынного, утопленника или малыша. У каждого свой рост, скорость и умения.|Press R and turn into a pig, cow, sheep, hen, villager, Buka or one of five zombies: normal, zombie villager, desert, drowned or baby. Each has its own height, speed and skills.|اضغط R وتحوّل إلى خنزير أو بقرة أو خروف أو دجاجة أو قروي أو بوكا أو أحد خمسة زومبي: عادي أو قروي زومبي أو صحراوي أو غريق أو صغير. لكل منها طوله وسرعته ومهاراته.
Реалистичный транспорт|Realistic transport|وسائل نقل واقعية
Подробные седан, внедорожник и спорткар с коробкой передач, фарами и стоп-сигналами; городской автобус с салоном и дверями; катер и теплоход, которые плавают по воде; самолёт «Сессна» и пассажирский лайнер с рычагом газа и убирающимися шасси. Спидометр на экране.|Detailed sedan, SUV and sports car with gearbox, headlights and brake lights; a city bus with interior and doors; a motorboat and a cruise ship that sail on water; a Cessna plane and an airliner with a throttle lever and retractable landing gear. Speedometer on screen.|سيارة سيدان ورباعية الدفع ورياضية مفصّلة بعلبة سرعات ومصابيح وأضواء فرامل؛ حافلة مدينة بمقصورة وأبواب؛ قارب وسفينة تبحران على الماء؛ طائرة «سيسنا» وطائرة ركاب بذراع وقود وعجلات قابلة للطي. عدّاد السرعة على الشاشة.
Город|City|المدينة
Бесконечный город: небоскрёбы, магазины, дома, парки, полицейский участок, больница, набережная у канала и аэропорт с самолётами.|An endless city: skyscrapers, shops, houses, parks, a police station, a hospital, a canal embankment and an airport with planes.|مدينة لا نهاية لها: ناطحات سحاب ومتاجر ومنازل وحدائق ومركز شرطة ومستشفى وكورنيش على القناة ومطار بالطائرات.
Реалистичная деревня|Realistic village|قرية واقعية
Большие деревни на каждом шагу: дома из разных материалов с мебелью, поля пшеницы и тыкв, загоны, каменная башня и жители.|Big villages everywhere: houses of different materials with furniture, wheat and pumpkin fields, pens, a stone tower and villagers.|قرى كبيرة في كل مكان: منازل من مواد مختلفة بأثاث، حقول قمح ويقطين، حظائر، برج حجري وقرويون.
Улица Ленина|Lenin Street|شارع لينين
Улица с девятиэтажками: в каждом подъезде лестница, в квартирах диваны, телевизоры, кровати, холодильники и компьютеры. Во дворах площадки, футбольное поле и парковки с машинами.|A street of nine-storey buildings: stairs in every entrance, flats with sofas, TVs, beds, fridges and computers. Yards with playgrounds, a football field and car parks.|شارع بمبانٍ من تسعة طوابق: درج في كل مدخل، وفي الشقق أرائك وتلفزيونات وأسرّة وثلاجات وحواسيب. في الساحات ملاعب أطفال وملعب كرة ومواقف سيارات.
Улица Ленина Винтер|Lenin Street Winter|شارع لينين الشتوي
Та же улица Ленина, но зимой: всё в снегу, идёт снег, во дворах каток со снеговиками, а за домами — нарядные ёлки.|The same Lenin Street, but in winter: snow everywhere, it's snowing, skating rinks with snowmen in the yards, and decorated fir trees behind the houses.|شارع لينين نفسه ولكن في الشتاء: الثلج في كل مكان، والثلج يتساقط، وفي الساحات حلبات تزلج برجال ثلج، وخلف المنازل أشجار تنوب مزيّنة.
Супер! Три новых ЖК|Super! Three new housing complexes|رائع! ثلاثة مجمعات سكنية جديدة
Три новых ЖК|Three new complexes|ثلاثة مجمعات جديدة
Три новых ЖК «Небо», «Сад» и «Река»: подъезды с лифтами, современные квартиры с кухней и ванной, кафе и магазины на первых этажах, подземная парковка и двор без машин с фонтаном.|Three new complexes «Sky», «Garden» and «River»: entrances with lifts, modern flats with kitchens and bathrooms, cafés and shops on the ground floors, underground parking and a car-free yard with a fountain.|ثلاثة مجمعات جديدة «السماء» و«الحديقة» و«النهر»: مداخل بمصاعد، شقق حديثة بمطبخ وحمّام، مقاهٍ ومتاجر في الطوابق الأرضية، موقف تحت الأرض وساحة بلا سيارات مع نافورة.
Русский город|Russian town|مدينة روسية
Город Новобронск: хрущёвки и новостройки, храм с золотыми куполами, рынок, гаражи, парк с прудом и дороги с ямами и лужами. Вокруг три деревни — «Малые Ёлки», «Берёзовка» и «Пирожково».|The town of Novobronsk: old five-storey blocks and new buildings, a church with golden domes, a market, garages, a park with a pond and roads with potholes and puddles. Around it are three villages — «Little Firs», «Beryozovka» and «Pirozhkovo».|مدينة نوفوبرونسك: مبانٍ قديمة من خمسة طوابق ومبانٍ جديدة، كنيسة بقباب ذهبية، سوق، كراجات، حديقة ببركة وطرق بحفر وبرك. حولها ثلاث قرى — «الصنوبرات الصغيرة» و«بيريوزوفكا» و«بيروجكوفو».
Русский городок Зима|Russian town Winter|المدينة الروسية الشتوية
Тот же Новобронск с деревнями, но зимой: снег на крышах и дорогах, лёд в лужах и на пруду, ёлка на площади и снеговики во дворах.|The same Novobronsk with villages, but in winter: snow on roofs and roads, ice on puddles and the pond, a fir tree on the square and snowmen in the yards.|نوفوبرونسك نفسها مع القرى ولكن في الشتاء: الثلج على الأسطح والطرق، الجليد على البرك، شجرة تنوب في الساحة ورجال ثلج في الساحات.
Дома на Москве-реке|Houses on the Moskva River|منازل على نهر موسكفا
Остров посреди Москвы-реки: гранитные набережные, мосты, большой серый дом на набережной, кирпичная фабрика-лофт, стеклянные башни, храм и «Стрелка» с памятником. Во всех домах — подъезды, лестницы и квартиры с мебелью. Дороги как настоящие: полосы, разметка, зебры, светофоры.|An island in the Moskva River: granite embankments, bridges, a big grey house on the embankment, a brick loft factory, glass towers, a church and the «Strelka» with a monument. Every house has entrances, stairs and furnished flats. Roads are like real ones: lanes, markings, zebra crossings, traffic lights.|جزيرة وسط نهر موسكفا: أرصفة من الغرانيت، جسور، بيت رمادي كبير على الرصيف، مصنع من الطوب صار شققًا، أبراج زجاجية، كنيسة و«ستريلكا» بنصب تذكاري. في كل البيوت مداخل ودرج وشقق مفروشة. الطرق كالحقيقية: حارات وخطوط وممرات مشاة وإشارات مرور.
ЖК «Самоцветы»|«Samotsvety» complex|مجمع «ساموتسفيتي»
Миниполис «Самоцветы» (Люберцы, ул. Кирова, 12): три Г-образных корпуса по 23 этажа — красный, жёлтый и зелёный, в каждом два подъезда с тремя лифтами. Внизу магазины, кафе, банк, поликлиника, выше — квартиры с кухнями-гостиными. Двор без машин за КПП, спортполе под сеткой, многоуровневый паркинг и ФОК «С.С.С.Р.» с тремя бассейнами.|Minipolis «Samotsvety» (Lyubertsy, Kirova St, 12): three L-shaped 23-storey buildings — red, yellow and green, each with two entrances and three lifts. Shops, a café, a bank and a clinic below, flats with kitchen-living rooms above. A car-free yard behind a checkpoint, a netted sports field, a multi-level car park and the «S.S.S.R.» sports centre with three pools.|ميني بوليس «ساموتسفيتي» (ليوبيرتسي، شارع كيروفا 12): ثلاثة مبانٍ على شكل حرف L من 23 طابقًا — أحمر وأصفر وأخضر، في كل منها مدخلان وثلاثة مصاعد. في الأسفل متاجر ومقهى وبنك وعيادة، وفي الأعلى شقق بمطابخ وغرف معيشة. ساحة بلا سيارات خلف نقطة تفتيش، ملعب مغطى بشبكة، موقف متعدد الطوابق ومركز «S.S.S.R.» الرياضي بثلاثة مسابح.
Плоский мир|Flat world|عالم مسطح
Мир |World |عالم
Удалить мир «|Delete world «|حذف العالم «
Батарея|Battery|البطارية
Телефон разряжен|Phone is dead|بطارية الهاتف فارغة
Постой рядом с зарядной станцией — телефон зарядится|Stand near a charging station — the phone will charge|قف بجانب محطة الشحن — سيُشحن الهاتف
📱 Телефон заряжается…|📱 Phone is charging…|📱 الهاتف يُشحن…
📱 Постой рядом — телефон заряжается|📱 Stay nearby — the phone is charging|📱 ابقَ قريبًا — الهاتف يُشحن
Зарядная станция для телефона|Phone charging station|محطة شحن الهاتف
Убрать телефон|Put phone away|أبعد الهاتف
Сообщения|Messages|الرسائل
Сообщение…|Message…|رسالة…
Галерея|Gallery|المعرض
Фото|Photo|صورة
Пока нет фото. Открой «Камеру»!|No photos yet. Open the «Camera»!|لا توجد صور بعد. افتح «الكاميرا»!
Нажми на кнопку — сфотографируешь мир за телефоном|Press the button — you'll photograph the world behind the phone|اضغط الزر — ستلتقط صورة للعالم خلف الهاتف
Настройки|Settings|الإعدادات
Обои|Wallpaper|الخلفية
Время|Time|الوقت
Время в мире|World time|الوقت في العالم
Время дома: |Time at home: |الوقت في البيت:
Погода|Weather|الطقس
☀️ Погода|☀️ Weather|☀️ الطقس
Какая погода в твоём мире|What the weather is in your world|كيف هو الطقس في عالمك
Солнечно|Sunny|مشمس
Идёт снег|It's snowing|الثلج يتساقط
Ночь, ясно. Берегись Бук!|Night, clear. Beware of Bukas!|ليل صافٍ. احذر البوكا!
Температура: |Temperature: |درجة الحرارة:
Карта|Map|الخريطة
Карта местности вокруг тебя|Map of the area around you|خريطة المنطقة من حولك
Красная стрелка — это ты|The red arrow is you|السهم الأحمر هو أنت
Компас|Compass|البوصلة
Куда ты смотришь и где находишься|Where you look and where you are|أين تنظر وأين أنت
Где ты|Where you are|أين أنت
Фонарик|Flashlight|المصباح
Фонарик освещает всё вокруг ночью, но быстрее тратит заряд|The flashlight lights everything at night, but drains the battery faster|المصباح يضيء كل شيء ليلًا لكنه يستهلك البطارية أسرع
Часы|Clock|الساعة
Секундомер|Stopwatch|ساعة الإيقاف
Секундомер: старт|Stopwatch: start|ساعة الإيقاف: ابدأ
Стоп|Stop|إيقاف
Музыка|Music|الموسيقى
Три весёлые мелодии|Three cheerful tunes|ثلاث ألحان مرحة
Маленькая звёздочка|Twinkle, twinkle, little star|تلألئي يا نجمة صغيرة
В лесу родилась ёлочка|A little fir tree was born in the forest|وُلدت شجرة صغيرة في الغابة
Ода к радости|Ode to Joy|نشيد الفرح
Заметки|Notes|الملاحظات
Записывай важное|Write down important things|اكتب الأشياء المهمة
Мои заметки:|My notes:|ملاحظاتي:
Калькулятор|Calculator|الآلة الحاسبة
Ошибка|Error|خطأ
Браузер|Browser|المتصفح
🔎 Брониндекс|🔎 Bronindex|🔎 برونيندكس
Ничего не нашлось 😕|Nothing found 😕|لم يُعثر على شيء 😕
Поиск: |Search: |بحث:
Нет подключения к интернету. Подойди поближе к Wi-Fi роутеру.|No internet connection. Get closer to the Wi-Fi router.|لا يوجد اتصال بالإنترنت. اقترب من موجه Wi-Fi.
Нет сети (нужен роутер рядом)|No network (needs a router nearby)|لا شبكة (يلزم موجه قريب)
нет Wi-Fi|no Wi-Fi|لا Wi-Fi
Ждём Wi-Fi…|Waiting for Wi-Fi…|بانتظار Wi-Fi…
Подключено · |Connected · |متصل ·
отличный|excellent|ممتاز
хороший|good|جيد
слабый|weak|ضعيف
сигнал|signal|الإشارة
заряжается|charging|يُشحن
Приложений|Apps|التطبيقات
Магазин|Store|المتجر
Установить|Install|تثبيت
Установлено|Installed|مثبّت
Открыть|Open|فتح
Новости|News|الأخبار
📰 Броня-новости|📰 Bronya News|📰 أخبار برونيا
В Броникрафте открылось метро: поезда ходят каждые пять минут!|The metro opened in Bronicraft: trains run every five minutes!|افتُتح المترو في برونيكرافت: القطارات تمر كل خمس دقائق!
В ЖК «Небо» заработал лифт до самой крыши|In the «Sky» complex the lift now goes right up to the roof|في مجمع «السماء» صار المصعد يصل إلى السطح
На улице Ленина выпал снег — дети лепят снеговиков|Snow fell on Lenin Street — kids are making snowmen|تساقط الثلج في شارع لينين — الأطفال يصنعون رجال الثلج
Учёные нашли изумруды глубоко в шахтах|Scientists found emeralds deep in the mines|العلماء وجدوا الزمرد في أعماق المناجم
Сегодня скидка на кубическую пиццу!|Discount on cubic pizza today!|خصم على البيتزا المكعبة اليوم!
Скидка 20% на пиццу «Кубическая»!|20% off «Cubic» pizza!|خصم 20% على بيتزا «المكعبة»!
Пиццерия «Кубик»|«Cube» pizzeria|مطعم بيتزا «المكعب»
Пиццерия «Кубик», слушаю! Пицца уже едет.|«Cube» pizzeria, how can I help? Your pizza is on the way.|مطعم بيتزا «المكعب»، تفضّل! البيتزا في الطريق.
Ваш заказ принят! 🍕|Your order is accepted! 🍕|تم استلام طلبك! 🍕
💡 Советы для игры|💡 Game tips|💡 نصائح للعبة
Советы|Tips|نصائح
Кровать ночью сразу включает утро.|A bed at night skips to morning.|السرير ليلًا ينقلك فورًا إلى الصباح.
Динамит не берёт обсидиан.|Dynamite can't break obsidian.|الديناميت لا يكسر السبَج.
Мрамор под рельсами — это остановка для поезда.|Marble under rails is a train stop.|الرخام تحت القضبان محطة للقطار.
Самолёт взлетает, только когда разгонится.|A plane takes off only when it speeds up.|الطائرة تقلع فقط عندما تتسارع.
На сложном уровне вещи пропадают. Придётся собирать заново!|On hard, items are lost. You'll have to collect them again!|في الصعب تضيع الأغراض. عليك جمعها من جديد!
Ночью закройся в доме — Буки не умеют открывать двери.|At night lock yourself in a house — Bukas can't open doors.|ليلًا اختبئ في بيت — البوكا لا يستطيعون فتح الأبواب.
Телефон заряжается рядом с зарядной станцией.|The phone charges next to a charging station.|الهاتف يُشحن بجانب محطة الشحن.
🛠️ Все рецепты крафта|🛠️ All crafting recipes|🛠️ كل وصفات الصناعة
(верстак)|(table)|(طاولة)
‹ На главную|‹ Home|‹ الرئيسية
‹ Назад|‹ Back|‹ رجوع
Домой|Home|الرئيسية
Вызов…|Calling…|جارٍ الاتصال…
Мама|Mom|أمي
Папа|Dad|أبي
Бабушка|Grandma|جدتي
Друг Тёма|Friend Tyoma|صديقي تيوما
Привет! Как дела в Броникрафте?|Hi! How's it going in Bronicraft?|مرحبًا! كيف الحال في برونيكرافت؟
Ты где? Ужин готов!|Where are you? Dinner is ready!|أين أنت؟ العشاء جاهز!
Ужин на столе 🍲|Dinner is on the table 🍲|العشاء على الطاولة 🍲
Не забудь сделать уроки!|Don't forget your homework!|لا تنسَ واجباتك!
Возвращайся домой до темноты, там Буки!|Come home before dark, there are Bukas!|عد إلى البيت قبل الظلام، هناك البوكا!
Ты одет тепло?|Are you dressed warmly?|هل ترتدي ملابس دافئة؟
Привет, солнышко! Ты покушал?|Hi, sunshine! Have you eaten?|مرحبًا يا شمسي! هل أكلت؟
Внучек, приезжай на пирожки!|Come over for pies, grandson!|يا حفيدي، تعال لتأكل الفطائر!
Пирожки готовы!|The pies are ready!|الفطائر جاهزة!
Я связала тебе шерстяной блок!|I knitted you a wool block!|حِكتُ لك مكعب صوف!
Я на работе, перезвоню!|I'm at work, I'll call back!|أنا في العمل، سأتصل لاحقًا!
Построй мне гараж для машины!|Build me a garage for the car!|ابنِ لي مرآبًا للسيارة!
Хорошо, целую!|OK, kisses!|حسنًا، قبلاتي!
Го строить замок!|Let's build a castle!|هيا نبني قلعة!
Го строить замок?|Want to build a castle?|هل نبني قلعة؟
Давай на метро до депо!|Let's take the metro to the depot!|هيا نركب المترو إلى المستودع!
Я нашёл алмазы в шахте!!!|I found diamonds in the mine!!!|وجدت الماس في المنجم!!!
Встречаемся у фонтана|Meet at the fountain|نلتقي عند النافورة
Круто!!|Cool!!|رائع!!
Ахаха|Hahaha|هههه
Молодец!|Well done!|أحسنت!
Отлично!|Great!|ممتاز!
Буки боятся закрытых дверей — проверено!|Bukas are afraid of closed doors — tested!|البوكا يخافون الأبواب المغلقة — مجرّب!
Змейка|Snake|الثعبان
Собирай яблоки и не врезайся в хвост|Collect apples and don't hit your tail|اجمع التفاح ولا تصطدم بذيلك
Стрелки или WASD. Собирай яблоки!|Arrows or WASD. Collect apples!|الأسهم أو WASD. اجمع التفاح!
Очки: |Score: |النقاط:
Рекорд: |Record: |الرقم القياسي:
Конец игры!|Game over!|انتهت اللعبة!
Пробел — ещё раз|Space — play again|المسافة — العب مجددًا
Не грусти, попробуй ещё раз!|Don't be sad, try again!|لا تحزن، حاول مرة أخرى!
Рисовалка|Paint|الرسام
Рисуй пальцем, то есть мышкой|Draw with your finger, I mean the mouse|ارسم بإصبعك، أعني بالفأرة
Стереть всё|Clear all|امسح الكل
толсто|thick|سميك
средне|medium|متوسط
тонко|thin|رفيع
Пианино|Piano|البيانو
Играй мелодии на клавишах|Play tunes on the keys|اعزف الألحان على المفاتيح
Нажимай на клавиши мышкой или кнопками A S D F G H J K|Press the keys with the mouse or A S D F G H J K|اضغط المفاتيح بالفأرة أو بالأزرار A S D F G H J K
Блокнот|Notepad|المفكرة
До|C|دو
Ре|D|ري
Ми|E|مي
Фа|F|فا
Соль|G|صول
Ля|A|لا
Си|B|سي
Здоровье|Health|الصحة
Изменено блоков|Blocks changed|المكعبات المعدّلة
Модель|Model|الطراز
Трава|Grass|عشب
Земля|Dirt|تراب
Камень|Stone|حجر
Булыжник|Cobblestone|حجر مرصوف
Песок|Sand|رمل
Бревно|Log|جذع
Листва|Leaves|أوراق
Доски|Planks|ألواح
Стекло|Glass|زجاج
Кирпичи|Bricks|طوب
Вода|Water|ماء
Коренная порода|Bedrock|صخر القاع
Угольная руда|Coal ore|خام الفحم
Железная руда|Iron ore|خام الحديد
Золотая руда|Gold ore|خام الذهب
Алмазная руда|Diamond ore|خام الماس
Снег|Snow|ثلج
Кактус|Cactus|صبار
Книжная полка|Bookshelf|رف كتب
Красная шерсть|Red wool|صوف أحمر
Оранжевая шерсть|Orange wool|صوف برتقالي
Жёлтая шерсть|Yellow wool|صوف أصفر
Зелёная шерсть|Green wool|صوف أخضر
Синяя шерсть|Blue wool|صوف أزرق
Фиолетовая шерсть|Purple wool|صوف بنفسجي
Белая шерсть|White wool|صوف أبيض
Чёрная шерсть|Black wool|صوف أسود
Лампа|Lamp|مصباح
Тропинка|Path|ممر
Стул|Chair|كرسي
Стол|Table|طاولة
Диван|Sofa|أريكة
Телевизор|TV|تلفاز
Ковёр|Carpet|سجادة
Цветок в горшке|Potted flower|زهرة في أصيص
Торшер|Floor lamp|مصباح أرضي
Кровать|Bed|سرير
Бетон|Concrete|خرسانة
Каменные кирпичи|Stone bricks|طوب حجري
Песчаник|Sandstone|حجر رملي
Гравий|Gravel|حصى
Глина|Clay|طين
Мрамор|Marble|رخام
Тёмные доски|Dark planks|ألواح داكنة
Берёзовые доски|Birch planks|ألواح البتولا
Сноп сена|Hay bale|حزمة قش
Тыква|Pumpkin|يقطين
Арбуз|Melon|بطيخ
Железный блок|Iron block|مكعب حديد
Золотой блок|Gold block|مكعب ذهب
Алмазный блок|Diamond block|مكعب ماس
Угольный блок|Coal block|مكعب فحم
Лёд|Ice|جليد
Красное стекло|Red glass|زجاج أحمر
Синее стекло|Blue glass|زجاج أزرق
Белый бетон|White concrete|خرسانة بيضاء
Чёрный бетон|Black concrete|خرسانة سوداء
Красный бетон|Red concrete|خرسانة حمراء
Синий бетон|Blue concrete|خرسانة زرقاء
Зелёный бетон|Green concrete|خرسانة خضراء
Жёлтый бетон|Yellow concrete|خرسانة صفراء
Розовый бетон|Pink concrete|خرسانة وردية
Холодильник|Fridge|ثلاجة
Шкаф|Wardrobe|خزانة
Пшеница на грядке|Wheat crop|قمح في الحقل
Изумрудная руда|Emerald ore|خام الزمرد
Изумрудный блок|Emerald block|مكعب زمرد
Рельсы|Rails|قضبان
Плитка метро|Metro tile|بلاط المترو
Знак метро|Metro sign|لافتة المترو
Обсидиан|Obsidian|سبَج
Динамит|Dynamite|ديناميت
Унитаз|Toilet|مرحاض
Раковина|Sink|مغسلة
Ванна|Bathtub|حوض استحمام
Душевая кабина|Shower|دش
Стиральная машина|Washing machine|غسالة
Зеркало|Mirror|مرآة
Кнопка лифта|Lift button|زر المصعد
Стенка лифта|Lift wall|جدار المصعد
Кухонный шкаф|Kitchen cabinet|خزانة مطبخ
Плита|Stove|موقد
Дверь|Door|باب
Зарядная станция|Charging station|محطة شحن
Wi-Fi роутер|Wi-Fi router|موجه Wi-Fi
Мини-блоки|Mini blocks|مكعبات صغيرة
Люк|Trapdoor|باب أرضي
Железный люк|Iron trapdoor|باب أرضي حديدي
Канализационный люк|Manhole|غطاء صرف صحي
Красный коралловый блок|Red coral block|مكعب مرجان أحمر
Розовый коралловый блок|Pink coral block|مكعب مرجان وردي
Жёлтый коралловый блок|Yellow coral block|مكعب مرجان أصفر
Синий коралловый блок|Blue coral block|مكعب مرجان أزرق
Фиолетовый коралловый блок|Purple coral block|مكعب مرجان بنفسجي
Красный коралл|Red coral|مرجان أحمر
Розовый коралл|Pink coral|مرجان وردي
Жёлтый коралл|Yellow coral|مرجان أصفر
Синий коралл|Blue coral|مرجان أزرق
Фиолетовый коралл|Purple coral|مرجان بنفسجي
Камера видеонаблюдения|Security camera|كاميرا مراقبة
Факел|Torch|مشعل
Лава|Lava|حمم
Снежный блок|Snow block|مكعب ثلج
Слой снега|Snow layer|طبقة ثلج
Воздух|Air|هواء
Палка|Stick|عصا
Уголь|Coal|فحم
Железный слиток|Iron ingot|سبيكة حديد
Золотой слиток|Gold ingot|سبيكة ذهب
Алмаз|Diamond|ماس
Деревянная кирка|Wooden pickaxe|معول خشبي
Каменная кирка|Stone pickaxe|معول حجري
Железная кирка|Iron pickaxe|معول حديدي
Алмазная кирка|Diamond pickaxe|معول ماسي
Деревянный меч|Wooden sword|سيف خشبي
Каменный меч|Stone sword|سيف حجري
Железный меч|Iron sword|سيف حديدي
Алмазный меч|Diamond sword|سيف ماسي
Деревянный топор|Wooden axe|فأس خشبي
Каменный топор|Stone axe|فأس حجري
Железный топор|Iron axe|فأس حديدي
Алмазный топор|Diamond axe|فأس ماسي
Деревянная лопата|Wooden shovel|مجرفة خشبية
Каменная лопата|Stone shovel|مجرفة حجرية
Железная лопата|Iron shovel|مجرفة حديدية
Алмазная лопата|Diamond shovel|مجرفة ماسية
деревянная|wooden|خشبي
каменная|stone|حجري
железная|iron|حديدي
алмазная|diamond|ماسي
Говядина|Beef|لحم بقر
Свинина|Pork|لحم خنزير
Баранина|Mutton|لحم ضأن
Курятина|Chicken|دجاج
Жареная говядина|Cooked beef|لحم بقر مشوي
Жареная свинина|Cooked pork|لحم خنزير مشوي
Жареная баранина|Cooked mutton|لحم ضأن مشوي
Жареная курица|Cooked chicken|دجاج مشوي
Яблоко|Apple|تفاحة
Хлеб|Bread|خبز
Морковка|Carrot|جزرة
Печенье|Cookie|بسكويت
Торт|Cake|كعكة
Ломтик арбуза|Melon slice|شريحة بطيخ
Тыквенный пирог|Pumpkin pie|فطيرة يقطين
Яйцо|Egg|بيضة
Перо|Feather|ريشة
Пшеница|Wheat|قمح
Изумруд|Emerald|زمرد
Красная машина|Red car|سيارة حمراء
Синяя машина|Blue car|سيارة زرقاء
Жёлтая машина|Yellow car|سيارة صفراء
Белая машина|White car|سيارة بيضاء
Чёрная машина|Black car|سيارة سوداء
Красный самолёт|Red plane|طائرة حمراء
Синий самолёт|Blue plane|طائرة زرقاء
Жёлтый самолёт|Yellow plane|طائرة صفراء
Боинг|Boeing|بوينغ
Поезд метро|Metro train|قطار المترو
Зажигалка|Lighter|ولاعة
Вагонетка|Minecart|عربة
Уменьшатель|Shrink ray|المصغّر
Палочка World changing|World changing wand|عصا World changing
Экран для камер|Camera screen|شاشة الكاميرات
Ведро|Bucket|دلو
Ведро воды|Water bucket|دلو ماء
Ведро лавы|Lava bucket|دلو حمم
Снежок|Snowball|كرة ثلج
Седан|Sedan|سيدان
Внедорожник|SUV|سيارة رباعية الدفع
Спорткар|Sports car|سيارة رياضية
Автобус|Bus|حافلة
Катер|Motorboat|قارب سريع
Теплоход|Cruise ship|سفينة ركاب
Самолёт «Сессна»|«Cessna» plane|طائرة «سيسنا»
Пассажирский лайнер|Airliner|طائرة ركاب
Яйцо призыва: |Spawn egg: |بيضة استدعاء:
Бука|Buka|بوكا
Свинка|Pig|خنزير
Корова|Cow|بقرة
Овечка|Sheep|خروف
Курочка|Hen|دجاجة
Житель|Villager|قروي
Жук|Beetle|خنفساء
Улитка|Snail|حلزون
Черепаха|Turtle|سلحفاة
Ящерица|Lizard|سحلية
Зомби|Zombie|زومبي
Зомби-житель|Zombie villager|قروي زومبي
Пустынный зомби|Desert zombie|زومبي صحراوي
Утопленник|Drowned|الغريق
Малыш-зомби|Baby zombie|زومبي صغير
Красный|Red|أحمر
Синий|Blue|أزرق
Жёлтый|Yellow|أصفر
Зелёный|Green|أخضر
Белый|White|أبيض
Чёрный|Black|أسود
Розовый|Pink|وردي
Фиолетовый|Purple|بنفسجي
Любой|Any|أي
Продукты|Groceries|بقالة
Аптека|Pharmacy|صيدلية
Кафе|Café|مقهى
Банк|Bank|بنك
Почта|Post office|بريد
Нотариус|Notary|كاتب العدل
Детская поликлиника|Children's clinic|عيادة الأطفال
Женская консультация|Women's clinic|عيادة النساء
Развивающий центр|Kids' learning centre|مركز تنمية الأطفال
Реабилитационный центр|Rehabilitation centre|مركز التأهيل
Пекарня|Bakery|مخبز
Барбершоп|Barbershop|حلاق
Фитнес|Fitness|نادٍ رياضي
Пункт выдачи|Pickup point|نقطة الاستلام
Цветы|Flowers|زهور
С|N|ش
Ю|S|ج
В|E|شر
З|W|غ
полёт|flying|طيران
бетон|concrete|خرسانة
коралл|coral|مرجان
коралловый блок|coral block|مكعب مرجان
МБ|MB|ميغابايت
Скачивание…|Downloading…|جارٍ التنزيل…
зомби|zombies|الزومبي
Буки|Bukas|البوكا
самолёта|plane|الطائرة
машины|car|السيارة
Возвращено|Redone|تمت الإعادة
Отменено|Undone|تم التراجع
Машин|Cars|السيارات
Самолётов|Planes|الطائرات
П|P|م
Камеры|Cameras|الكاميرات
`;

  const D = new Map();
  for (const line of RAW.split('\n')) {
    const p = line.split('|');
    if (p.length === 3 && p[0]) D.set(p[0], p);
  }

  // шаблоны: сообщения с числами и названиями (названия внутри тоже переводятся)
  const P = [
    [/^Скачать \((\d+) МБ\)$/, 'Download ($1 MB)', 'تنزيل ($1 ميغابايت)'],
    [/^Скачивание… (\d+)%$/, 'Downloading… $1%', 'جارٍ التنزيل… $1%'],
    [/^Строим мир… (\d+)%$/, 'Building the world… $1%', 'نبني العالم… $1%'],
    [/^Карта: «(.+)»$/, 'Map: «$1»', 'الخريطة: «$1»'],
    [/^Деревня «(.+)»$/, 'Village «$1»', 'قرية «$1»'],
    [/^Город (.+)$/, 'Town $1', 'مدينة $1'],
    [/^Добро пожаловать! (.+)$/, 'Welcome! $1', 'أهلًا وسهلًا! $1'],
    [/^Появилось существо: (.+)$/, 'A creature appeared: $1', 'ظهر مخلوق: $1'],
    [/^Ты превратился: (.+)! \(V — камера\)$/, 'You turned into: $1! (V — camera)', 'تحوّلت إلى: $1! (V — الكاميرا)'],
    [/^(.+): теперь крошка!$/, '$1: now tiny!', '$1: صار صغيرًا جدًا!'],
    [/^(.+): снова обычного размера$/, '$1: normal size again', '$1: عاد إلى حجمه العادي'],
    [/^(.+): заморожен в воздухе$/, '$1: frozen in the air', '$1: مجمّد في الهواء'],
    [/^(.+): 64 мини-блока$/, '$1: 64 mini blocks', '$1: 64 مكعبًا صغيرًا'],
    [/^(.+): запись идёт\. Смотри на экране для камер$/, '$1: recording. Watch it on the camera screen', '$1: يسجّل الآن. شاهده على شاشة الكاميرات'],
    [/^Камера (\d+)$/, 'Camera $1', 'كاميرا $1'],
    [/^КАМЕРА (\d+)$/, 'CAMERA $1', 'كاميرا $1'],
    [/^Скачай мод «(.+)» во вкладке «Моды»$/, 'Download the «$1» mod in the «Mods» tab', 'نزّل إضافة «$1» من تبويب «الإضافات»'],
    [/^Включи мод «(.+)» в главном меню$/, 'Enable the «$1» mod in the main menu', 'فعّل إضافة «$1» في القائمة الرئيسية'],
    [/^Нужна (\S+) кирка или лучше$/, 'You need at least a $1 pickaxe', 'تحتاج إلى معول $1 أو أفضل'],
    [/^Ням! \+(.+) ♥$/, 'Yum! +$1 ♥', 'لذيذ! +$1 ♥'],
    [/^Сделано: (.+)$/, 'Crafted: $1', 'تم صنع: $1'],
    [/^(.+) из (.+) ♥$/, '$1 of $2 ♥', '$1 من $2 ♥'],
    [/^Станция «(.+)»$/, 'Station «$1»', 'محطة «$1»'],
    [/^Этаж: (.+)$/, 'Floor: $1', 'الطابق: $1'],
    [/^Точка (\d): (.+?)( · .+)?$/, 'Point $1: $2$3', 'النقطة $1: $2$3'],
    [/^ · (\d+)×(\d+)×(\d+) = (\d+) блоков$/, ' · $1×$2×$3 = $4 blocks', ' · $1×$2×$3 = $4 مكعبًا'],
    [/^Выделено: (\d+)×(\d+)×(\d+) = (\d+) блоков(.*)$/, 'Selected: $1×$2×$3 = $4 blocks$5', 'المحدد: $1×$2×$3 = $4 مكعبًا$5'],
    [/^Выделение: (.+)$/, 'Selection: $1', 'التحديد: $1'],
    [/^Скопировано: (\d+) блоков\. Вставка — относительно того, где ты стоишь сейчас$/, 'Copied: $1 blocks. Pasting is relative to where you stand now', 'تم نسخ $1 مكعبًا. اللصق يكون بالنسبة لمكانك الحالي'],
    [/^Слишком большое выделение: (\d+) блоков$/, 'Selection too big: $1 blocks', 'التحديد كبير جدًا: $1 مكعبًا'],
    [/^Слишком много: (\d+) блоков \(можно до (\d+)\)$/, 'Too many: $1 blocks (up to $2 allowed)', 'كثير جدًا: $1 مكعبًا (المسموح حتى $2)'],
    [/^(.+): (\d+) блоков$/, '$1: $2 blocks', '$1: $2 مكعبًا'],
    [/^(.+): ничего не поменялось$/, '$1: nothing changed', '$1: لم يتغير شيء'],
    [/^ · в буфере (\d+)$/, ' · $1 in clipboard', ' · $1 في الحافظة'],
    [/^ · отменить можно (\d+) раз$/, ' · $1 undo steps', ' · يمكن التراجع $1 مرات'],
    [/^Тут мало места для (самолёта|машины)$/, 'Not enough room for the $1', 'لا مساحة كافية لـ$1'],
    [/^Поставь (.+) на землю$/, 'Put the $1 on the ground', 'ضع $1 على الأرض'],
    [/^Нажми правой кнопкой на (.+), чтобы сесть$/, 'Right-click the $1 to get in', 'اضغط بالزر الأيمن على $1 لتركب'],
    [/^В мирном режиме (Буки|зомби) не появляются$/, 'In peaceful mode $1 don\'t appear', 'في الوضع السلمي لا يظهر $1'],
    [/^Удалить мир «(.+)»\? Его нельзя будет вернуть\.$/, 'Delete world «$1»? It can\'t be restored.', 'حذف العالم «$1»؟ لا يمكن استرجاعه.'],
    [/^запись (.+) \((\d+)\/(\d+)\)$/, 'recording $1 ($2/$3)', 'تسجيل $1 ($2/$3)'],
    [/^сейчас (.+)$/, 'now $1', 'الآن $1'],
    [/^(\d+)-я передача$/, 'gear $1', 'السرعة $1'],
    [/^высота (\d+) м$/, 'altitude $1 m', 'الارتفاع $1 م'],
    [/^газ (\d+)%$/, 'throttle $1%', 'الوقود $1%'],
    [/^(.+): W — вперёд, S — назад, A\/D — руль\. Плавает только по воде\. Shift — выйти$/, '$1: W — forward, S — back, A/D — steer. Sails only on water. Shift — get out', '$1: W — للأمام، S — للخلف، A/D — توجيه. تبحر على الماء فقط. Shift — انزل'],
    [/^(.+): W — газ, S — тормоз и задний ход, A\/D — руль\. На остановке двери откроются сами\. Shift — выйти$/, '$1: W — gas, S — brake and reverse, A/D — steer. At stops the doors open by themselves. Shift — get out', '$1: W — وقود، S — فرامل ورجوع، A/D — توجيه. في المحطات تُفتح الأبواب وحدها. Shift — انزل'],
    [/^(.+): W — газ, S — тормоз и задний ход, A\/D — руль\. Shift — выйти$/, '$1: W — gas, S — brake and reverse, A/D — steer. Shift — get out', '$1: W — وقود، S — فرامل ورجوع، A/D — توجيه. Shift — انزل'],
    [/^Привет, (.+)!$/, 'Hi, $1!', 'مرحبًا يا $1!'],
    [/^Мир (\d+)$/, 'World $1', 'عالم $1'],
    [/^Яйцо призыва: (.+)$/, 'Spawn egg: $1', 'بيضة استدعاء: $1'],
    [/^\+(\d+) (.+)$/, '+$1 $2', '+$1 $2'],
    [/^(.*?)([\d.]+) с$/, '$1$2 s', '$1$2 ث'],
    [/^([^:]+): (.+)$/, '$1: $2', '$1: $2'],
  ];

  const CYR = /[а-яёА-ЯЁ]/;
  // запасной путь: переводим знакомые слова и фразы прямо внутри строки
  let fallbackRe = null;
  function fallback(s) {
    if (!fallbackRe) {
      const keys = [...D.keys()].filter(k => k.trim().length >= 2).sort((a, b) => b.length - a.length)
        .map(k => k.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      fallbackRe = new RegExp('(^|[^а-яёА-ЯЁa-zA-Z])(' + keys.join('|') + ')(?=[^а-яёА-ЯЁa-zA-Z]|$)', 'g');
    }
    return s.replace(fallbackRe, (m, pre, k) => { const v = D.get(k) || D.get(k + ' '); return pre + (v ? v[col + 1].trim() : k); });
  }
  const cache = new Map();
  function tr(s) {
    if (col === undefined || typeof s !== 'string' || !CYR.test(s)) return s;
    if (cache.has(s)) return cache.get(s);
    let out;
    if (s.includes('\n')) out = s.split('\n').map(tr).join('\n');
    else {
      const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), core = m[2];
      let v = D.get(core) || D.get(s);
      if (v) out = m[1] + v[col + 1] + m[3];
      else {
        for (const [re, en, ar] of P) {
          const g = core.match(re);
          if (!g) continue;
          out = m[1] + (col ? ar : en).replace(/\$(\d)/g, (_, i) => (g[+i] === undefined ? '' : tr(g[+i]))) + m[3];
          break;
        }
        if (out === undefined) out = fallback(s);
      }
    }
    if (cache.size > 5000) cache.clear();
    cache.set(s, out);
    return out;
  }

  // всё, что появляется на странице, переводится само
  function translateTree(root) {
    if (col === undefined) return;
    if (root.nodeType === 3) { const t = tr(root.nodeValue); if (t !== root.nodeValue) root.nodeValue = t; return; }
    if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
    for (const a of ['placeholder', 'title']) if (root.hasAttribute && root.hasAttribute(a)) { const v = root.getAttribute(a), t = tr(v); if (t !== v) root.setAttribute(a, t); }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (CYR.test(n.nodeValue)) { const t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; } }
      else for (const a of ['placeholder', 'title']) if (n.hasAttribute(a)) { const v = n.getAttribute(a), t = tr(v); if (t !== v) n.setAttribute(a, t); }
    }
  }
  function start() {
    if (col === undefined) return;
    document.documentElement.lang = lang;
    if (lang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.body.classList.add('rtl');
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@600&display=swap';
      document.head.appendChild(l);
    }
    translateTree(document.body);
    new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'characterData') translateTree(m.target);
        else if (m.type === 'attributes') translateTree(m.target);
        else m.addedNodes.forEach(translateTree);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title'] });
    // надписи на холсте (камеры, компьютер) и окна подтверждения
    const C = CanvasRenderingContext2D.prototype;
    for (const fn of ['fillText', 'strokeText', 'measureText']) {
      const orig = C[fn];
      C[fn] = function (text, ...rest) { return orig.call(this, tr(String(text)), ...rest); };
    }
    const conf = window.confirm, al = window.alert;
    window.confirm = m => conf(tr(String(m)));
    window.alert = m => al(tr(String(m)));
  }
  // кнопки выбора языка в углу меню
  function picker() {
    const box = document.createElement('div');
    box.id = 'lang-pick';
    box.className = 'hidden';
    box.dir = 'ltr';
    for (const [k, name] of Object.entries(LANGS)) {
      const btn = document.createElement('button');
      btn.className = 'small' + (k === lang ? ' selected' : '');
      btn.textContent = name;
      btn.dataset.lang = k;
      btn.addEventListener('click', () => { if (k !== lang) setLang(k); });
      box.appendChild(btn);
    }
    document.body.appendChild(box);
  }
  function setLang(l) {
    try { localStorage.setItem('bronicraft-lang', l); } catch (e) { /* ничего */ }
    location.reload();
  }
  picker();
  start();
  return { tr, setLang, lang: () => lang, LANGS };
})();
