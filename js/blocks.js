'use strict';

// ---------- Текстуры (рисуются прямо в коде, 16×16 пикселей) ----------
const TILE_NAMES = [
  'grass_top', 'grass_side', 'dirt', 'stone', 'cobble', 'sand', 'log_side', 'log_top',
  'leaves', 'planks', 'glass', 'brick', 'water', 'bedrock', 'coal', 'iron',
  'gold', 'diamond', 'snow', 'snow_side', 'cactus_side', 'cactus_top', 'bronya', 'bookshelf',
  'wool_red', 'wool_orange', 'wool_yellow', 'wool_green', 'wool_blue', 'wool_purple', 'wool_white', 'wool_black',
  'lamp', 'crafting_top', 'crafting_side', 'path_top', 'pot', 'tv_screen', 'wool_pink', 'concrete',
  'stone_bricks', 'sandstone_top', 'sandstone_side', 'gravel', 'clay', 'marble', 'dark_planks', 'birch_planks',
  'hay_top', 'hay_side', 'pumpkin_top', 'pumpkin_side', 'melon_top', 'melon_side', 'iron_block', 'gold_block',
  'diamond_block', 'coal_block', 'ice', 'glass_red', 'glass_blue',
  'concrete_white', 'concrete_black', 'concrete_red', 'concrete_blue', 'concrete_green', 'concrete_yellow', 'concrete_pink',
  'pc_screen', 'keyboard', 'fridge_front', 'wardrobe_front', 'wheat_crop',
  'emerald', 'emerald_block', 'metro_tile', 'metro_sign', 'obsidian', 'dynamite_side', 'dynamite_top',
  'porcelain', 'chrome', 'mirror', 'washer_front', 'lift_panel', 'steel', 'kitchen_front', 'stove_top', 'door_bottom', 'door_top', 'charger', 'router',
  'chest_side', 'chest_front', 'furnace_side', 'furnace_front', 'furnace_lit',
  'trapdoor', 'iron_trapdoor', 'manhole', 'torch_stick', 'torch_flame', 'lava',
  'coral_red', 'coral_pink', 'coral_yellow', 'coral_blue', 'coral_purple',
  'coral_fan_red', 'coral_fan_pink', 'coral_fan_yellow', 'coral_fan_blue', 'coral_fan_purple', 'camera_body',
];
const T = {};
TILE_NAMES.forEach((n, i) => { T[n] = i; });
const ATLAS_COLS = 16, ATLAS_ROWS = 8;

// ---------- Блоки ----------
const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, SAND: 5, LOG: 6, LEAVES: 7, PLANKS: 8,
  GLASS: 9, BRICK: 10, WATER: 11, BEDROCK: 12, COAL: 13, IRON: 14, GOLD: 15, DIAMOND: 16,
  SNOW: 17, CACTUS: 18, BRONYA: 19, BOOKSHELF: 20,
  WOOL_RED: 21, WOOL_ORANGE: 22, WOOL_YELLOW: 23, WOOL_GREEN: 24, WOOL_BLUE: 25,
  WOOL_PURPLE: 26, WOOL_WHITE: 27, WOOL_BLACK: 28, LAMP: 29,
  CRAFTING_TABLE: 30, PATH: 31,
  // мебель (мод «Уютный дом»); у повёрнутых предметов 4 номера — по одному на сторону
  CHAIR: 32, TABLE: 36, SOFA: 37, TV: 41, CARPET: 45, FLOWER_POT: 46, FLOOR_LAMP: 47, BED: 48,
  CONCRETE: 52,
  STONE_BRICKS: 53, SANDSTONE: 54, GRAVEL: 55, CLAY: 56, MARBLE: 57, DARK_PLANKS: 58, BIRCH_PLANKS: 59,
  HAY: 60, PUMPKIN: 61, MELON: 62, IRON_BLOCK: 63, GOLD_BLOCK: 64, DIAMOND_BLOCK: 65, COAL_BLOCK: 66,
  ICE: 67, GLASS_RED: 68, GLASS_BLUE: 69,
  CONCRETE_WHITE: 70, CONCRETE_BLACK: 71, CONCRETE_RED: 72, CONCRETE_BLUE: 73, CONCRETE_GREEN: 74,
  CONCRETE_YELLOW: 75, CONCRETE_PINK: 76,
  FRIDGE: 77, WARDROBE: 81, COMPUTER: 85, WHEAT_CROP: 89, EMERALD: 90, EMERALD_BLOCK: 91,
  RAIL: 92, METRO_TILE: 96, METRO_SIGN: 97, OBSIDIAN: 98, DYNAMITE: 99,
  // номера 100..199 заняты предметами, дальше снова блоки
  TOILET: 200, SINK: 204, BATHTUB: 208, SHOWER: 212, WASHER: 216, MIRROR: 220,
  LIFT_BUTTON: 224, ELEVATOR_WALL: 228, KITCHEN: 229, STOVE: 233,
  // дверь из двух половинок; у каждой своя закрытая и открытая версия, по 4 стороны
  DOOR: 237, DOOR_OPEN: 241, DOOR_TOP: 245, DOOR_TOP_OPEN: 249,
  CHARGER: 253, ROUTER: 254,
  MINI: 255,       // клетка, в которой лежат мини-блоки (4×4×4 маленьких кубика, сами хранятся в world.minis)
  // с 256 и дальше — новые блоки (мир хранит номера блоков 16-битными)
  CHEST: 256, FURNACE: 260, FURNACE_LIT: 264,
  SHOWER_TOP: 268,                                              // верхняя половина душа
  TRAPDOOR: 272, IRON_TRAPDOOR: 280, MANHOLE: 288,              // люки: +0..3 закрытые, +4..7 открытые
  CORAL_RED: 296, CORAL_PINK: 297, CORAL_YELLOW: 298, CORAL_BLUE: 299, CORAL_PURPLE: 300,
  CORAL_FAN_RED: 301, CORAL_FAN_PINK: 302, CORAL_FAN_YELLOW: 303, CORAL_FAN_BLUE: 304, CORAL_FAN_PURPLE: 305,
  CAMERA: 306,                                                  // камера видеонаблюдения (мод «Камеры»)
  TORCH: 310, LAVA: 311, SNOW_BLOCK: 312, SNOW_LAYER: 313,
  WATER_FLOW: 314,             // текущая вода: 314..320 — уровни 1..7 (чем дальше от источника, тем ниже)
  LAVA_FLOW: 321,              // текущая лава: 321..323 — уровни 1..3
};

const BLOCKS = [];
// tex: одна текстура или [верх, низ, бок]
function defBlock(id, name, tex, opts) {
  const t = typeof tex === 'string' ? [tex, tex, tex] : tex;
  BLOCKS[id] = Object.assign({
    id, name, tex: t.map(n => T[n]),
    opaque: true, solid: true, layer: 'opaque', cullSame: false, sound: 'stone',
  }, opts || {});
}

const CUTOUT = { opaque: false, layer: 'cutout' };
defBlock(B.AIR, 'Воздух', 'dirt', { opaque: false, solid: false, layer: null });
defBlock(B.GRASS, 'Трава', ['grass_top', 'dirt', 'grass_side'], { sound: 'soft' });
defBlock(B.DIRT, 'Земля', 'dirt', { sound: 'soft' });
defBlock(B.STONE, 'Камень', 'stone');
defBlock(B.COBBLE, 'Булыжник', 'cobble');
defBlock(B.SAND, 'Песок', 'sand', { sound: 'soft' });
defBlock(B.LOG, 'Бревно', ['log_top', 'log_top', 'log_side'], { sound: 'wood' });
defBlock(B.LEAVES, 'Листва', 'leaves', Object.assign({ sound: 'soft' }, CUTOUT));
defBlock(B.PLANKS, 'Доски', 'planks', { sound: 'wood' });
defBlock(B.GLASS, 'Стекло', 'glass', Object.assign({ sound: 'glass', cullSame: true }, CUTOUT));
defBlock(B.BRICK, 'Кирпичи', 'brick');
defBlock(B.WATER, 'Вода', 'water', { opaque: false, solid: false, layer: 'water', cullSame: true, sound: 'water' });
defBlock(B.MINI, 'Мини-блоки', 'stone', { opaque: false, solid: false, hidden: true, mod: 'mini' });
defBlock(B.BEDROCK, 'Коренная порода', 'bedrock');
defBlock(B.COAL, 'Угольная руда', 'coal');
defBlock(B.IRON, 'Железная руда', 'iron');
defBlock(B.GOLD, 'Золотая руда', 'gold');
defBlock(B.DIAMOND, 'Алмазная руда', 'diamond');
defBlock(B.EMERALD, 'Изумрудная руда', 'emerald');
defBlock(B.EMERALD_BLOCK, 'Изумрудный блок', 'emerald_block');
defBlock(B.METRO_TILE, 'Плитка метро', 'metro_tile', { mod: 'metro' });
defBlock(B.METRO_SIGN, 'Знак метро', 'metro_sign', { mod: 'metro' });
defBlock(B.OBSIDIAN, 'Обсидиан', 'obsidian');
defBlock(B.DYNAMITE, 'Динамит', ['dynamite_top', 'dynamite_top', 'dynamite_side'], { sound: 'wool' });
defBlock(B.ELEVATOR_WALL, 'Стенка лифта', 'steel', { mod: 'lift' });
defBlock(B.SNOW, 'Снег', ['snow', 'dirt', 'snow_side'], { sound: 'soft' });
defBlock(B.CACTUS, 'Кактус', ['cactus_top', 'cactus_top', 'cactus_side'], { sound: 'wool' });
// Броня-блок убран из игры: номер остаётся, но старые блоки при загрузке становятся розовым бетоном
defBlock(B.BRONYA, 'Розовый бетон', 'concrete_pink', { hidden: true });
defBlock(B.BOOKSHELF, 'Книжная полка', ['planks', 'planks', 'bookshelf'], { sound: 'wood' });
defBlock(B.WOOL_RED, 'Красная шерсть', 'wool_red', { sound: 'wool' });
defBlock(B.WOOL_ORANGE, 'Оранжевая шерсть', 'wool_orange', { sound: 'wool' });
defBlock(B.WOOL_YELLOW, 'Жёлтая шерсть', 'wool_yellow', { sound: 'wool' });
defBlock(B.WOOL_GREEN, 'Зелёная шерсть', 'wool_green', { sound: 'wool' });
defBlock(B.WOOL_BLUE, 'Синяя шерсть', 'wool_blue', { sound: 'wool' });
defBlock(B.WOOL_PURPLE, 'Фиолетовая шерсть', 'wool_purple', { sound: 'wool' });
defBlock(B.WOOL_WHITE, 'Белая шерсть', 'wool_white', { sound: 'wool' });
defBlock(B.WOOL_BLACK, 'Чёрная шерсть', 'wool_black', { sound: 'wool' });
defBlock(B.LAMP, 'Лампа', 'lamp', { sound: 'glass' });
defBlock(B.CRAFTING_TABLE, 'Верстак', ['crafting_top', 'planks', 'crafting_side'], { sound: 'wood' });
defBlock(B.PATH, 'Тропинка', ['path_top', 'dirt', 'dirt'], { sound: 'soft' });
defBlock(B.CONCRETE, 'Бетон', 'concrete');
defBlock(B.STONE_BRICKS, 'Каменные кирпичи', 'stone_bricks');
defBlock(B.SANDSTONE, 'Песчаник', ['sandstone_top', 'sandstone_top', 'sandstone_side']);
defBlock(B.GRAVEL, 'Гравий', 'gravel', { sound: 'soft' });
defBlock(B.CLAY, 'Глина', 'clay', { sound: 'soft' });
defBlock(B.MARBLE, 'Мрамор', 'marble');
defBlock(B.DARK_PLANKS, 'Тёмные доски', 'dark_planks', { sound: 'wood' });
defBlock(B.BIRCH_PLANKS, 'Берёзовые доски', 'birch_planks', { sound: 'wood' });
defBlock(B.HAY, 'Сноп сена', ['hay_top', 'hay_top', 'hay_side'], { sound: 'soft' });
defBlock(B.PUMPKIN, 'Тыква', ['pumpkin_top', 'pumpkin_top', 'pumpkin_side'], { sound: 'wood' });
defBlock(B.MELON, 'Арбуз', ['melon_top', 'melon_top', 'melon_side'], { sound: 'wood' });
defBlock(B.IRON_BLOCK, 'Железный блок', 'iron_block');
defBlock(B.GOLD_BLOCK, 'Золотой блок', 'gold_block');
defBlock(B.DIAMOND_BLOCK, 'Алмазный блок', 'diamond_block');
defBlock(B.COAL_BLOCK, 'Угольный блок', 'coal_block');
defBlock(B.ICE, 'Лёд', 'ice', { sound: 'glass' });
// цветное стекло полупрозрачное — рисуется вместе с водой
defBlock(B.GLASS_RED, 'Красное стекло', 'glass_red', { opaque: false, layer: 'water', cullSame: true, sound: 'glass' });
defBlock(B.GLASS_BLUE, 'Синее стекло', 'glass_blue', { opaque: false, layer: 'water', cullSame: true, sound: 'glass' });
[['WHITE', 'Белый'], ['BLACK', 'Чёрный'], ['RED', 'Красный'], ['BLUE', 'Синий'], ['GREEN', 'Зелёный'], ['YELLOW', 'Жёлтый'], ['PINK', 'Розовый']]
  .forEach(([k, n]) => defBlock(B['CONCRETE_' + k], n + ' бетон', 'concrete_' + k.toLowerCase()));
defFurniture(B.FRIDGE, 'Холодильник', [[1, 0, 1, 15, 16, 15, 'concrete_white', 'fridge_front']], { sound: 'stone' }, true);
defFurniture(B.WARDROBE, 'Шкаф', [[1, 0, 2, 15, 16, 14, 'dark_planks', 'wardrobe_front']], null, true);
defFurniture(B.COMPUTER, 'Компьютер', [
  [5, 0, 2, 11, 1, 6, 'wool_black'], [7, 1, 3, 9, 4, 4, 'wool_black'],
  [2, 4, 3, 14, 14, 5, 'wool_black', 'pc_screen'], [3, 0, 9, 13, 1, 13, 'keyboard'],
], { sound: 'glass', mod: 'computer' }, true);
defFurniture(B.WHEAT_CROP, 'Пшеница на грядке', [
  [0, 0, 3, 16, 14, 4, 'wheat_crop'], [0, 0, 8, 16, 14, 9, 'wheat_crop'], [0, 0, 12, 16, 14, 13, 'wheat_crop'],
  [3, 0, 0, 4, 14, 16, 'wheat_crop'], [12, 0, 0, 13, 14, 16, 'wheat_crop'],
], { solid: false, sound: 'soft', mod: null });
// мод «Ванная и туалет»
const BATH = { sound: 'glass', mod: 'bath' };
defFurniture(B.TOILET, 'Унитаз', [
  [5, 0, 5, 11, 6, 13, 'porcelain'], [4, 6, 4, 12, 8, 14, 'porcelain'], [4, 6, 1, 12, 14, 5, 'porcelain'], [7, 14, 2, 9, 15, 4, 'chrome'],
], BATH, true);
defFurniture(B.SINK, 'Раковина', [
  [6, 0, 2, 10, 10, 6, 'porcelain'], [2, 10, 1, 14, 13, 12, 'porcelain'], [5, 12, 4, 11, 13, 9, 'chrome'],
  [7, 13, 1, 9, 16, 3, 'chrome'], [7, 15, 3, 9, 16, 6, 'chrome'],
], BATH, true);
defFurniture(B.BATHTUB, 'Ванна', [
  [0, 0, 0, 16, 2, 16, 'porcelain'], [0, 2, 0, 16, 9, 2, 'porcelain'], [0, 2, 14, 16, 9, 16, 'porcelain'],
  [0, 2, 2, 2, 9, 14, 'porcelain'], [14, 2, 2, 16, 9, 14, 'porcelain'], [2, 2, 2, 14, 6, 14, 'water'], [7, 9, 0, 9, 12, 3, 'chrome'],
], Object.assign({ solid: false }, BATH), true);
// душевая кабина в два блока высотой: внизу поддон и кран, наверху лейка и крыша
defFurniture(B.SHOWER, 'Душевая кабина', [
  [0, 0, 0, 16, 1, 16, 'porcelain'], [0, 1, 0, 1, 16, 16, 'glass'], [15, 1, 0, 16, 16, 16, 'glass'],
  [0, 1, 0, 16, 16, 1, 'metro_tile'], [1, 1, 15, 15, 16, 16, 'glass'], [7, 8, 1, 9, 12, 2, 'chrome'],
], Object.assign({ solid: false, tall: B.SHOWER_TOP }, BATH), true);
defFurniture(B.SHOWER_TOP, 'Душевая кабина', [
  [0, 0, 0, 1, 14, 16, 'glass'], [15, 0, 0, 16, 14, 16, 'glass'], [0, 0, 0, 16, 14, 1, 'metro_tile'],
  [1, 0, 15, 15, 14, 16, 'glass'], [0, 14, 0, 16, 16, 16, 'porcelain'],
  [7, 0, 1, 9, 10, 2, 'chrome'], [5, 10, 1, 11, 11, 7, 'chrome'],
], Object.assign({ solid: false, hidden: true, tallTop: B.SHOWER }, BATH), true);
defFurniture(B.WASHER, 'Стиральная машина', [[1, 0, 1, 15, 15, 15, 'porcelain', 'washer_front']], BATH, true);
defFurniture(B.MIRROR, 'Зеркало', [[2, 3, 0, 14, 15, 1, 'mirror']], Object.assign({ solid: false }, BATH), true);
// мод «Лифт»: кнопка в кабине — все кнопки в одном столбике это этажи одного лифта
defFurniture(B.LIFT_BUTTON, 'Кнопка лифта', [[5, 4, 0, 11, 12, 1, 'lift_panel']], { solid: false, sound: 'stone', mod: 'lift' }, true);
// современная кухня (мод «Уютный дом»)
defFurniture(B.KITCHEN, 'Кухонный шкаф', [[0, 0, 1, 16, 14, 16, 'birch_planks', 'kitchen_front'], [0, 14, 0, 16, 16, 16, 'marble']], { mod: 'interior' }, true);
defFurniture(B.STOVE, 'Плита', [[0, 0, 1, 16, 14, 16, 'porcelain', 'kitchen_front'], [0, 14, 0, 16, 16, 16, 'stove_top']], { mod: 'interior', sound: 'stone' }, true);

// Дверь: закрытая — щит у задней стороны клетки, открытая — повёрнута к петлям (левому краю)
[[B.DOOR, 'door_bottom', false, 'b'], [B.DOOR_OPEN, 'door_bottom', true, 'b'],
  [B.DOOR_TOP, 'door_top', false, 't'], [B.DOOR_TOP_OPEN, 'door_top', true, 't']].forEach(([id, tex, open, half]) => {
  defFurniture(id, 'Дверь', [open ? [0, 0, 0, 3, 16, 16, tex] : [0, 0, 0, 16, 16, 3, tex]], {
    solid: !open, sound: 'wood', mod: null, door: { open, half }, hidden: id !== B.DOOR,
  }, true);
});

// мод «Телефон»: зарядная станция и Wi-Fi роутер
defFurniture(B.CHARGER, 'Зарядная станция', [[3, 0, 3, 13, 2, 13, 'charger'], [6, 2, 9, 10, 11, 12, 'charger']], { solid: false, sound: 'glass', mod: 'phone' });
defFurniture(B.ROUTER, 'Wi-Fi роутер', [
  [2, 0, 4, 14, 4, 12, 'router'], [3, 4, 10, 4, 12, 11, 'wool_black'], [12, 4, 10, 13, 12, 11, 'wool_black'],
], { solid: false, sound: 'glass', mod: 'phone' });

// рельсы: шпалы поперёк и два железных рельса вдоль «переда»
defFurniture(B.RAIL, 'Рельсы', [
  [1, 0, 2, 15, 1, 4, 'dark_planks'], [1, 0, 7, 15, 1, 9, 'dark_planks'], [1, 0, 12, 15, 1, 14, 'dark_planks'],
  [3, 1, 0, 5, 2, 16, 'iron_block'], [11, 1, 0, 13, 2, 16, 'iron_block'],
], { solid: false, sound: 'stone', mod: null }, true);

// Мебель — блоки из нескольких коробочек. Размеры в 1/16 блока, «перед» смотрит в +Z.
// [x0, y0, z0, x1, y1, z1, текстура, (текстура спереди)]
function defFurniture(id, name, boxes, opts, rotates) {
  const n = rotates ? 4 : 1;
  for (let f = 0; f < n; f++) {
    defBlock(id + f, name, boxes[0][6], Object.assign({
      opaque: false, layer: 'cutout', sound: 'wood', mod: 'interior',
      boxes, facing: f, base: id, variant: f > 0,
    }, opts || {}));
  }
}
const LEG = (x, z, h, t) => [x, 0, z, x + 2, h, z + 2, t];
defFurniture(B.CHAIR, 'Стул', [
  LEG(2, 2, 7, 'planks'), LEG(12, 2, 7, 'planks'), LEG(2, 12, 7, 'planks'), LEG(12, 12, 7, 'planks'),
  [2, 7, 2, 14, 9, 14, 'planks'], [2, 9, 2, 14, 16, 4, 'planks'],
], null, true);
defFurniture(B.TABLE, 'Стол', [
  [0, 13, 0, 16, 16, 16, 'planks'],
  LEG(1, 1, 13, 'log_side'), LEG(13, 1, 13, 'log_side'), LEG(1, 13, 13, 'log_side'), LEG(13, 13, 13, 'log_side'),
]);
defFurniture(B.SOFA, 'Диван', [
  [0, 0, 0, 16, 7, 16, 'wool_red'], [0, 7, 0, 16, 15, 5, 'wool_red'],
  [0, 7, 5, 3, 11, 16, 'wool_red'], [13, 7, 5, 16, 11, 16, 'wool_red'],
], { sound: 'wool' }, true);
defFurniture(B.TV, 'Телевизор', [
  [6, 0, 7, 10, 2, 9, 'wool_black'], [1, 2, 6, 15, 13, 10, 'wool_black', 'tv_screen'],
], { sound: 'glass' }, true);
defFurniture(B.CARPET, 'Ковёр', [[0, 0, 0, 16, 1, 16, 'wool_pink']], { solid: false, sound: 'wool' });
defFurniture(B.FLOWER_POT, 'Цветок в горшке', [
  [5, 0, 5, 11, 6, 11, 'pot'], [6, 6, 6, 10, 11, 10, 'leaves'], [7, 11, 7, 9, 13, 9, 'wool_red'],
], { sound: 'glass' });
defFurniture(B.FLOOR_LAMP, 'Торшер', [
  [5, 0, 5, 11, 1, 11, 'wool_black'], [7, 1, 7, 9, 11, 9, 'wool_black'], [4, 11, 4, 12, 16, 12, 'lamp'],
], { sound: 'glass' });
defFurniture(B.BED, 'Кровать', [
  [0, 0, 0, 16, 5, 16, 'planks'], [1, 5, 1, 15, 8, 15, 'wool_red'], [2, 8, 1, 14, 10, 5, 'wool_white'],
], { sound: 'wool', mod: null }, true);

// Сундук и печка: смотрят лицом на того, кто их поставил
defFurniture(B.CHEST, 'Сундук', [[1, 0, 1, 15, 14, 15, 'chest_side', 'chest_front']], { mod: null, sound: 'wood', chest: true }, true);
defFurniture(B.FURNACE, 'Печка', [[0, 0, 0, 16, 16, 16, 'furnace_side', 'furnace_front']], { mod: null, sound: 'stone', furnace: true }, true);
defFurniture(B.FURNACE_LIT, 'Печка (горит)', [[0, 0, 0, 16, 16, 16, 'furnace_side', 'furnace_lit']], { mod: null, sound: 'stone', furnace: true, hidden: true }, true);

// Люки: закрытый лежит сверху клетки (по нему можно ходить), открытый поднят к стенке
[[B.TRAPDOOR, 'Люк', 'trapdoor', 'wood'], [B.IRON_TRAPDOOR, 'Железный люк', 'iron_trapdoor', 'stone'],
  [B.MANHOLE, 'Канализационный люк', 'manhole', 'stone']].forEach(([id, name, tex, sound]) => {
  defFurniture(id, name, [[0, 13, 0, 16, 16, 16, tex]], { solid: true, sound, mod: null, trapdoor: { open: false, base: id } }, true);
  defFurniture(id + 4, name, [[0, 0, 0, 16, 16, 3, tex]], { solid: false, sound, mod: null, trapdoor: { open: true, base: id }, hidden: true }, true);
});
// Кораллы: блоки и кустики (растут на дне тёплого моря)
['red', 'pink', 'yellow', 'blue', 'purple'].forEach((c, i) => {
  const ru = ['Красный', 'Розовый', 'Жёлтый', 'Синий', 'Фиолетовый'][i];
  defBlock(B.CORAL_RED + i, ru + ' коралловый блок', 'coral_' + c, { sound: 'stone' });
  defFurniture(B.CORAL_FAN_RED + i, ru + ' коралл', [[7, 0, 1, 9, 15, 15, 'coral_fan_' + c], [1, 0, 7, 15, 15, 9, 'coral_fan_' + c]], { solid: false, sound: 'soft', mod: null, coral: true });
});
// Лава: жидкая, светится, обжигает; с водой застывает в обсидиан
defBlock(B.LAVA, 'Лава', 'lava', { opaque: false, solid: false, cullSame: true, sound: 'water', liquid: true });
// текущие вода и лава (появляются сами, когда жидкость разливается)
for (let i = 0; i < 7; i++) defBlock(B.WATER_FLOW + i, 'Вода', 'water', { opaque: false, solid: false, layer: 'water', cullSame: true, sound: 'water', hidden: true });
for (let i = 0; i < 3; i++) defBlock(B.LAVA_FLOW + i, 'Лава', 'lava', { opaque: false, solid: false, cullSame: true, sound: 'water', hidden: true });
// Снег: белый блок и тонкий слой, который ложится сверху
defBlock(B.SNOW_BLOCK, 'Снежный блок', 'snow', { sound: 'soft' });
defFurniture(B.SNOW_LAYER, 'Слой снега', [[0, 0, 0, 16, 2, 16, 'snow']], { solid: false, sound: 'soft', mod: null });
// Факел: палочка с огоньком, светит вокруг себя
defFurniture(B.TORCH, 'Факел', [[7, 0, 7, 9, 10, 9, 'torch_stick'], [6, 10, 6, 10, 14, 10, 'torch_flame'], [7, 14, 7, 9, 15, 9, 'torch_flame']],
  { solid: false, sound: 'wood', mod: null });
// Камера видеонаблюдения: кронштейн на стене, корпус и объектив (смотрит вперёд)
defFurniture(B.CAMERA, 'Камера видеонаблюдения', [
  [7, 7, 0, 9, 9, 5, 'iron_block'], [5, 8, 4, 11, 13, 13, 'camera_body'], [6, 9, 13, 10, 12, 15, 'wool_black'],
  [10, 12, 12, 11, 13, 13, 'wool_red'],
], { solid: false, sound: 'glass', mod: 'cameras', camera: true }, true);

// Сколько света даёт блок (0..14): свет растекается на 7 клеток и не проходит сквозь стены
const LIGHT = new Uint8Array(1024);

const IS_OPAQUE = new Uint8Array(1024);
const IS_SOLID = new Uint8Array(1024);
BLOCKS.forEach(b => { IS_OPAQUE[b.id] = b.opaque ? 1 : 0; IS_SOLID[b.id] = b.solid ? 1 : 0; });
LIGHT[B.TORCH] = 14; LIGHT[B.LAMP] = 14; LIGHT[B.LAVA] = 14;
for (let i = 0; i < 3; i++) LIGHT[B.LAVA_FLOW + i] = 12;
// жидкости: вид (1 — вода, 2 — лава) и уровень (0 — источник, дальше — течение)
const LIQ = new Uint8Array(1024), LIQ_LEVEL = new Uint8Array(1024);
LIQ[B.WATER] = 1; LIQ[B.LAVA] = 2;
for (let i = 0; i < 7; i++) { LIQ[B.WATER_FLOW + i] = 1; LIQ_LEVEL[B.WATER_FLOW + i] = i + 1; }
for (let i = 0; i < 3; i++) { LIQ[B.LAVA_FLOW + i] = 2; LIQ_LEVEL[B.LAVA_FLOW + i] = i + 1; }
const isWaterB = id => LIQ[id] === 1, isLavaB = id => LIQ[id] === 2, isLiquidB = id => LIQ[id] > 0;
// высота поверхности жидкости в клетке (если сверху нет такой же жидкости)
const liquidHeight = id => (LIQ_LEVEL[id] === 0 ? 0.88 : 0.88 * ((LIQ[id] === 1 ? 8 : 4) - LIQ_LEVEL[id]) / (LIQ[id] === 1 ? 8 : 4));
for (let f = 0; f < 4; f++) LIGHT[B.FURNACE_LIT + f] = 12;

// ---------- Грани куба ----------
// corners: [x, y, z, u, v]; треугольники (0,1,2) и (2,1,3)
const FACES = [
  { dir: [-1, 0, 0], shade: 0.8, corners: [[0, 1, 0, 0, 1], [0, 0, 0, 0, 0], [0, 1, 1, 1, 1], [0, 0, 1, 1, 0]] },
  { dir: [1, 0, 0], shade: 0.8, corners: [[1, 1, 1, 0, 1], [1, 0, 1, 0, 0], [1, 1, 0, 1, 1], [1, 0, 0, 1, 0]] },
  { dir: [0, -1, 0], shade: 0.55, corners: [[1, 0, 1, 1, 0], [0, 0, 1, 0, 0], [1, 0, 0, 1, 1], [0, 0, 0, 0, 1]] },
  { dir: [0, 1, 0], shade: 1.0, corners: [[0, 1, 1, 1, 1], [1, 1, 1, 0, 1], [0, 1, 0, 1, 0], [1, 1, 0, 0, 0]] },
  { dir: [0, 0, -1], shade: 0.68, corners: [[1, 0, 0, 0, 0], [0, 0, 0, 1, 0], [1, 1, 0, 0, 1], [0, 1, 0, 1, 1]] },
  { dir: [0, 0, 1], shade: 0.68, corners: [[0, 0, 1, 0, 0], [1, 0, 1, 1, 0], [0, 1, 1, 0, 1], [1, 1, 1, 1, 1]] },
];
// Смещения соседей для мягких теней в углах (ambient occlusion)
FACES.forEach(f => {
  const tang = [0, 1, 2].filter(a => f.dir[a] === 0);
  f.texSlot = f.dir[1] === 1 ? 0 : f.dir[1] === -1 ? 1 : 2;
  f.ao = f.corners.map(c => {
    const s1 = f.dir.slice(), s2 = f.dir.slice(), co = f.dir.slice();
    s1[tang[0]] += c[tang[0]] ? 1 : -1;
    s2[tang[1]] += c[tang[1]] ? 1 : -1;
    co[tang[0]] = s1[tang[0]];
    co[tang[1]] = s2[tang[1]];
    return [s1, s2, co];
  });
});
const AO_LEVELS = [0.5, 0.66, 0.82, 1.0];

function tileUV(tile, u, v) {
  const col = tile % ATLAS_COLS, row = Math.floor(tile / ATLAS_COLS);
  const e = 0.001;
  return [
    (col + e + u * (1 - 2 * e)) / ATLAS_COLS,
    1 - (row + 1 - e - v * (1 - 2 * e)) / ATLAS_ROWS,
  ];
}

// ---------- Рисование текстур ----------
const ATLAS = (() => {
  const vary = (c, amt, r) => { const k = 1 + (r() - 0.5) * amt; return [c[0] * k, c[1] * k, c[2] * k]; };
  const each = fn => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) fn(x, y); };
  const fill = (s, r, c, amt) => each((x, y) => s(x, y, vary(c, amt, r)));

  const DIRT = [134, 96, 67], GRASS = [92, 156, 52], SNOWC = [238, 246, 252];
  const dirt = (s, r) => each((x, y) => s(x, y, r() < 0.12 ? vary([100, 70, 48], 0.2, r) : vary(DIRT, 0.25, r)));
  const stone = (s, r) => {
    fill(s, r, [128, 128, 128], 0.16);
    for (let i = 0; i < 7; i++) {
      const x = (r() * 16) | 0, y = (r() * 16) | 0;
      s(x, y, [100, 100, 100]); s(x + 1, y, [108, 108, 108]);
    }
  };
  const ore = (col, hi) => (s, r) => {
    stone(s, r);
    const n = 3 + ((r() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const cx = 2 + ((r() * 11) | 0), cy = 2 + ((r() * 11) | 0);
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (r() < 0.85) s(cx + dx, cy + dy, vary(col, 0.2, r));
      s(cx, cy, hi);
    }
  };
  const wool = col => (s, r) => each((x, y) => {
    const c = vary(col, 0.1, r);
    const k = (x + y) % 4 === 0 ? 0.9 : 1;
    s(x, y, [c[0] * k, c[1] * k, c[2] * k]);
  });
  const topLayer = (base, col, minD) => (s, r) => {
    base(s, r);
    for (let x = 0; x < 16; x++) {
      const d = minD + (r() < 0.5 ? 1 : 0) + (r() < 0.2 ? 1 : 0);
      for (let y = 0; y < d; y++) s(x, y, vary(col, 0.2, r));
    }
  };

  function plankPaint(s, r, base, dark) {
    each((x, y) => {
      const row = y >> 2, seam = (row * 7 + 3) % 16;
      let c = base;
      if (y % 4 === 3) c = dark;
      else if (x === seam) c = base.map((v, i) => (v + dark[i]) / 2);
      s(x, y, vary(c, 0.1, r));
    });
  }
  const metalBlock = col => (s, r) => each((x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    const hi = x === 1 || y === 1;
    s(x, y, edge ? col.map(v => v * 0.7) : hi ? col.map(v => Math.min(255, v * 1.15)) : vary(col, 0.05, r));
  });
  const tintedGlass = (inner, frame) => (s, r) => each((x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    s(x, y, edge ? frame : ((x + y === 10 || x + y === 11) && x > 2 && x < 9) ? inner.map(v => Math.min(255, v + 80)) : vary(inner, 0.04, r));
  });

  const P = {
    grass_top: (s, r) => each((x, y) => s(x, y, r() < 0.12 ? vary([120, 185, 70], 0.2, r) : vary(GRASS, 0.3, r))),
    grass_side: topLayer(dirt, GRASS, 3),
    dirt,
    stone,
    cobble(s, r) {
      const pts = [];
      for (let i = 0; i < 9; i++) pts.push([r() * 16, r() * 16, 95 + r() * 55]);
      each((x, y) => {
        let d1 = 1e9, d2 = 1e9, c = 0;
        for (const p of pts) {
          let dx = Math.abs(x + 0.5 - p[0]); dx = Math.min(dx, 16 - dx);
          let dy = Math.abs(y + 0.5 - p[1]); dy = Math.min(dy, 16 - dy);
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < d1) { d2 = d1; d1 = d; c = p[2]; } else if (d < d2) d2 = d;
        }
        s(x, y, d2 - d1 < 1.3 ? vary([70, 70, 70], 0.2, r) : vary([c, c, c], 0.12, r));
      });
    },
    sand: (s, r) => fill(s, r, [219, 207, 148], 0.12),
    log_side(s, r) {
      each((x, y) => {
        const k = (x % 5 === 1 || x % 5 === 3) ? 0.8 : 1;
        s(x, y, vary([110 * k, 82 * k, 50 * k], 0.15, r));
      });
    },
    log_top(s, r) {
      each((x, y) => {
        const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        const c = d > 6.5 ? [100, 76, 46] : (Math.floor(d) % 2 === 0 ? [188, 152, 96] : [160, 126, 76]);
        s(x, y, vary(c, 0.08, r));
      });
    },
    leaves(s, r) {
      each((x, y) => {
        if (r() < 0.2) s(x, y, [0, 0, 0], 0);
        else s(x, y, vary(r() < 0.3 ? [80, 160, 55] : [52, 122, 36], 0.3, r));
      });
    },
    planks(s, r) {
      each((x, y) => {
        const row = y >> 2, seam = (row * 7 + 3) % 16;
        let c = [178, 140, 86];
        if (y % 4 === 3) c = [128, 96, 58];
        else if (x === seam) c = [140, 106, 64];
        s(x, y, vary(c, 0.1, r));
      });
    },
    glass(s) {
      each((x, y) => {
        const edge = x === 0 || y === 0 || x === 15 || y === 15;
        const shine = ((x + y === 10 || x + y === 11) && x > 2 && x < 9) || (x + y === 20 && x > 9 && x < 14);
        if (edge) s(x, y, [210, 235, 245]);
        else if (shine) s(x, y, [255, 255, 255]);
        else s(x, y, [0, 0, 0], 0);
      });
    },
    brick(s, r) {
      each((x, y) => {
        const off = (y >> 2) % 2 ? 4 : 0;
        const mortar = y % 4 === 3 || (x + off) % 8 === 7;
        s(x, y, mortar ? vary([190, 180, 165], 0.1, r) : vary([158, 72, 52], 0.2, r));
      });
    },
    water(s, r) {
      each((x, y) => s(x, y, ((x + y * 3) % 11 === 0) ? vary([90, 140, 235], 0.1, r) : vary([48, 96, 205], 0.15, r)));
    },
    bedrock: (s, r) => each((x, y) => s(x, y, r() < 0.5 ? vary([45, 45, 45], 0.3, r) : vary([105, 105, 105], 0.3, r))),
    coal: ore([40, 40, 40], [20, 20, 20]),
    iron: ore([216, 175, 147], [240, 210, 190]),
    gold: ore([245, 211, 61], [255, 245, 150]),
    diamond: ore([93, 232, 224], [210, 255, 255]),
    emerald: ore([40, 200, 90], [170, 255, 190]),
    emerald_block: metalBlock([50, 205, 100]),
    lava(s, r) {
      each((x, y) => {
        const v = Math.sin(x * 0.9 + y * 0.4) + Math.cos(y * 1.1 - x * 0.3) + r() * 0.8;
        s(x, y, v > 1.3 ? [255, 230, 110] : v > 0.4 ? [255, 150, 30] : v > -0.6 ? [230, 80, 10] : [170, 40, 10]);
      });
    },
    torch_stick(s, r) {
      each((x, y) => s(x, y, vary(x % 4 < 2 ? [120, 82, 44] : [96, 64, 34], 0.1, r)));
    },
    torch_flame(s, r) {
      each((x, y) => {
        const d = Math.hypot(x - 7.5, (y - 9) * 0.8);
        s(x, y, d < 3 ? [255, 250, 200] : d < 5.5 ? [255, 200, 70] : [240, 120, 30]);
      });
    },
    trapdoor(s, r) {
      each((x, y) => {
        const hole = (x >= 3 && x <= 6 || x >= 9 && x <= 12) && (y >= 3 && y <= 6 || y >= 9 && y <= 12);
        if (hole) s(x, y, [0, 0, 0], 0);
        else s(x, y, x === 0 || y === 0 || x === 15 || y === 15 ? [95, 64, 32] : vary([150, 104, 58], 0.1, r));
      });
    },
    iron_trapdoor(s, r) {
      each((x, y) => {
        if ((x % 4 === 2) && y > 1 && y < 14) s(x, y, [0, 0, 0], 0);
        else s(x, y, x === 0 || y === 0 || x === 15 || y === 15 ? [120, 122, 128] : vary([196, 198, 204], 0.05, r));
      });
    },
    manhole(s, r) {
      each((x, y) => {
        const d = Math.hypot(x - 7.5, y - 7.5);
        let c = vary([46, 46, 52], 0.12, r);                                        // асфальт по углам
        if (d < 7.6) c = d > 6.6 ? [70, 70, 74] : ((x + y) % 3 === 0 || Math.abs(x - y) % 4 === 0 ? [92, 92, 96] : vary([118, 118, 122], 0.06, r));
        if (d < 2) c = [80, 80, 84];
        s(x, y, c);
      });
    },
    ...Object.fromEntries([['red', [220, 60, 70]], ['pink', [240, 120, 190]], ['yellow', [245, 205, 60]], ['blue', [60, 120, 230]], ['purple', [160, 80, 210]]].flatMap(([k, col]) => [
      ['coral_' + k, (s, r) => each((x, y) => {
        const v = r();
        s(x, y, v < 0.18 ? col.map(c => c * 0.6) : v > 0.9 ? col.map(c => Math.min(255, c * 1.3)) : vary(col, 0.12, r));
      })],
      ['coral_fan_' + k, (s, r) => {
        each((x, y) => s(x, y, [0, 0, 0], 0));
        const tips = [[2, 2], [5, 1], [8, 0], [11, 1], [14, 3], [4, 6], [12, 6]];
        for (const [tx, ty] of tips) {
          for (let i = 0; i <= 20; i++) {
            const t = i / 20, x = Math.round(7.5 + (tx - 7.5) * t), y = Math.round(15 - (15 - ty) * t);
            s(x, y, vary(col, 0.1, r)); if (t > 0.6) s(x + 1, y, col.map(c => Math.min(255, c * 1.2)));
          }
          s(tx, ty, col.map(c => Math.min(255, c * 1.35)));
        }
      }],
    ])),
    camera_body(s, r) {
      each((x, y) => s(x, y, y < 2 ? [60, 62, 68] : vary([228, 230, 234], 0.03, r)));
    },
    chest_side(s, r) {
      each((x, y) => {
        const edge = x === 0 || x === 15 || y === 0 || y === 15;
        s(x, y, edge ? [92, 58, 24] : y === 5 ? [110, 70, 30] : vary(y % 4 === 1 ? [150, 100, 45] : [172, 118, 55], 0.08, r));
      });
    },
    chest_front(s, r) {
      P.chest_side(s, r);
      for (let y = 3; y <= 8; y++) for (let x = 6; x <= 9; x++) s(x, y, (x === 6 || x === 9 || y === 3 || y === 8) ? [70, 70, 75] : [200, 200, 205]);
      s(7, 6, [40, 40, 45]); s(8, 6, [40, 40, 45]);
    },
    furnace_side(s, r) {
      each((x, y) => {
        const seam = y % 4 === 3 || (x + (y >> 2) * 4) % 8 === 0;
        s(x, y, seam ? vary([88, 88, 90], 0.08, r) : vary([128, 128, 130], 0.12, r));
      });
    },
    furnace_front(s, r) {
      P.furnace_side(s, r);
      for (let x = 3; x <= 12; x++) { s(x, 3, [60, 60, 62]); s(x, 5, [60, 60, 62]); }      // решётка сверху
      for (let y = 8; y <= 13; y++) for (let x = 3; x <= 12; x++) s(x, y, (x === 3 || x === 12 || y === 8 || y === 13) ? [70, 70, 72] : [24, 22, 22]);
    },
    furnace_lit(s, r) {
      P.furnace_front(s, r);
      for (let y = 9; y <= 12; y++) for (let x = 4; x <= 11; x++) {
        const h = 12 - y + ((x * 7 + 3) % 3);
        s(x, y, h > 3 ? [255, 230, 120] : h > 1 ? [255, 160, 40] : [220, 70, 20]);
      }
    },
    charger(s, r) {
      each((x, y) => s(x, y, (y === 4 && x >= 5 && x <= 10) ? [60, 230, 110] : vary([238, 240, 244], 0.02, r)));
    },
    router(s, r) {
      each((x, y) => s(x, y, (y === 8 && x % 3 === 1 && x > 1 && x < 14) ? [70, 255, 120] : vary([34, 34, 40], 0.08, r)));
    },
    door_bottom(s, r) {
      each((x, y) => {
        let c = vary(x % 5 === 0 ? [120, 82, 46] : [150, 104, 60], 0.06, r);
        if (x === 0 || x === 15 || y === 15) c = [92, 62, 34];
        if (y === 6 || y === 7) c = [110, 76, 42];
        s(x, y, c);
      });
      s(12, 1, [240, 200, 60]); s(12, 2, [200, 160, 40]); s(13, 1, [240, 200, 60]);      // ручка
    },
    door_top(s, r) {
      each((x, y) => {
        let c = vary(x % 5 === 0 ? [120, 82, 46] : [150, 104, 60], 0.06, r);
        if (x === 0 || x === 15 || y === 0) c = [92, 62, 34];
        if (x >= 3 && x <= 12 && y >= 3 && y <= 11) c = (x === 7 || x === 8 || y === 7) ? [92, 62, 34] : (x + y === 10 ? [230, 245, 255] : [170, 215, 240]);
        s(x, y, c);
      });
    },
    porcelain(s, r) {
      each((x, y) => s(x, y, (x + y < 6) ? [255, 255, 255] : vary([240, 243, 247], 0.02, r)));
    },
    chrome: (s, r) => each((x, y) => s(x, y, vary([170 + ((x * 7 + y * 3) % 5) * 12, 175 + ((x * 7 + y * 3) % 5) * 12, 185 + ((x * 7 + y * 3) % 5) * 12], 0.03, r))),
    mirror(s) {
      each((x, y) => {
        const edge = x === 0 || y === 0 || x === 15 || y === 15;
        const shine = (x - y === 3 || x - y === 4 || x - y === -6) && !edge;
        s(x, y, edge ? [150, 155, 160] : shine ? [245, 250, 255] : [185, 212, 228]);
      });
    },
    washer_front(s, r) {
      each((x, y) => {
        const d = Math.hypot(x - 7.5, y - 8.5);
        let c = vary([242, 244, 247], 0.02, r);
        if (y < 3) c = [220, 223, 228];
        if (y === 1 && x >= 10 && x <= 13) c = [60, 180, 230];
        if (d < 5.5) c = d > 4.5 ? [150, 155, 162] : (d < 3.5 && x + y < 15 ? [120, 170, 220] : [60, 90, 140]);
        s(x, y, c);
      });
    },
    lift_panel(s, r) {
      each((x, y) => {
        let c = vary([160, 165, 172], 0.03, r);
        if (y >= 1 && y <= 3 && x >= 3 && x <= 12) c = [30, 10, 10];
        if (y === 2 && x >= 5 && x <= 10 && x % 2 === 0) c = [255, 70, 50];
        for (const by of [7, 11]) if (Math.hypot(x - 7.5, y - by) < 2) c = Math.hypot(x - 7.5, y - by) < 1 ? [255, 210, 80] : [245, 245, 245];
        s(x, y, c);
      });
    },
    steel: (s, r) => each((x, y) => s(x, y, vary(y % 3 === 0 ? [170, 174, 180] : [190, 194, 200], 0.04, r))),
    kitchen_front(s, r) {
      each((x, y) => {
        let c = vary([236, 238, 240], 0.02, r);
        if (x === 7 || x === 8) c = [200, 203, 208];
        if (y === 3 && (x >= 2 && x <= 5 || x >= 10 && x <= 13)) c = [70, 72, 78];
        s(x, y, c);
      });
    },
    stove_top(s) {
      each((x, y) => {
        let c = [28, 28, 32];
        for (const [cx, cy] of [[4, 4], [11, 4], [4, 11], [11, 11]]) { const d = Math.hypot(x - cx, y - cy); if (d < 3 && d > 1.8) c = [75, 75, 82]; }
        s(x, y, c);
      });
    },
    obsidian(s, r) {
      each((x, y) => {
        const g = r();
        s(x, y, g < 0.12 ? [70, 40, 110] : g < 0.2 ? [40, 25, 60] : vary([20, 14, 32], 0.25, r));
      });
    },
    dynamite_side(s, r) {
      each((x, y) => {
        let c = (x % 4 === 0) ? [140, 25, 25] : vary([210, 45, 40], 0.08, r);   // красные шашки
        if (y >= 6 && y <= 9) c = y === 6 || y === 9 ? [30, 30, 30] : [235, 220, 180];   // бумажная лента
        s(x, y, c);
      });
    },
    dynamite_top(s, r) {
      each((x, y) => {
        const cx = (x % 4) - 1.5, cy = (y % 4) - 1.5;
        s(x, y, Math.hypot(cx, cy) < 1.6 ? vary([200, 45, 40], 0.08, r) : [70, 20, 20]);
      });
      for (let y = 3; y < 8; y++) s(8, y, [60, 60, 60]);     // фитиль
      s(8, 2, [255, 200, 60]);
    },
    metro_tile(s, r) {
      each((x, y) => s(x, y, (x % 4 === 3 || y % 4 === 3) ? [196, 198, 204] : vary([244, 245, 248], 0.02, r)));
    },
    metro_sign(s) {
      const M = ['#.....#', '##...##', '#.#.#.#', '#..#..#', '#.....#', '#.....#', '#.....#'];
      each((x, y) => s(x, y, (x === 0 || y === 0 || x === 15 || y === 15) ? [210, 40, 40] : [35, 85, 200]));
      M.forEach((row, yy) => [...row].forEach((ch, xx) => { if (ch === '#') s(4 + xx, 4 + yy, [255, 255, 255]); }));
    },
    snow: (s, r) => fill(s, r, SNOWC, 0.06),
    snow_side: topLayer(dirt, SNOWC, 4),
    cactus_side(s, r) {
      each((x, y) => {
        let c = x % 4 === 0 ? [44, 105, 34] : [72, 145, 52];
        if (x === 0 || x === 15) c = [40, 90, 30];
        s(x, y, vary(c, 0.12, r));
        if (x % 4 === 2 && r() < 0.12) s(x, y, [230, 230, 170]);
      });
    },
    cactus_top(s, r) {
      each((x, y) => {
        const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        s(x, y, vary(d > 6.5 ? [44, 105, 34] : d < 2 ? [100, 170, 70] : [80, 150, 55], 0.1, r));
      });
    },
    bronya(s, r) {
      each((x, y) => {
        const border = x === 0 || y === 0 || x === 15 || y === 15;
        s(x, y, border ? [214, 68, 128] : vary([255, 120, 175], 0.08, r));
      });
      const L = ['######', '#.....', '#.....', '#####.', '#....#', '#....#', '#####.'];
      L.forEach((row, yy) => [...row].forEach((ch, xx) => { if (ch === '#') s(6 + xx, 5 + yy, [190, 60, 110]); }));
      L.forEach((row, yy) => [...row].forEach((ch, xx) => { if (ch === '#') s(5 + xx, 4 + yy, [255, 255, 255]); }));
    },
    bookshelf(s, r) {
      const colors = [[170, 40, 40], [40, 80, 160], [50, 130, 60], [190, 150, 50], [120, 50, 140], [200, 200, 190]];
      const books = [];
      for (let i = 0; i < 16; i++) books.push({ c: colors[(r() * colors.length) | 0], gap: (r() * 3) | 0 });
      each((x, y) => {
        let c;
        if (y < 2 || y > 13) c = (y === 1 || y === 14) ? [128, 96, 58] : [178, 140, 86];
        else if (y === 7 || y === 8) c = [128, 96, 58];
        else {
          const shelfTop = y < 7 ? 2 : 9;
          const b = books[(x >> 1) + (y > 8 ? 8 : 0)];
          c = (y - shelfTop < b.gap) ? [60, 40, 25] : (x % 2 === 1 ? b.c.map(v => v * 0.75) : b.c);
        }
        s(x, y, vary(c, 0.08, r));
      });
    },
    wool_red: wool([200, 50, 50]),
    wool_orange: wool([235, 130, 40]),
    wool_yellow: wool([240, 210, 50]),
    wool_green: wool([90, 180, 60]),
    wool_blue: wool([50, 90, 200]),
    wool_purple: wool([140, 60, 190]),
    wool_white: wool([235, 235, 235]),
    wool_black: wool([38, 38, 44]),
    lamp(s, r) {
      each((x, y) => {
        const edge = x < 2 || y < 2 || x > 13 || y > 13;
        const d = Math.hypot(x - 7.5, y - 7.5);
        let c = edge ? [120, 85, 45] : (x === 7 || x === 8 || y === 7 || y === 8) ? [220, 170, 70] : d < 4 ? [255, 240, 170] : [250, 210, 100];
        s(x, y, vary(c, 0.06, r));
      });
    },
    crafting_top(s, r) {
      P.planks(s, r);
      each((x, y) => {
        if (x === 0 || y === 0 || x === 15 || y === 15) s(x, y, [95, 70, 42]);
        else if (x === 5 || x === 10 || y === 5 || y === 10) s(x, y, vary([120, 88, 52], 0.08, r));
      });
    },
    crafting_side(s, r) {
      P.planks(s, r);
      for (let x = 0; x < 16; x++) { s(x, 0, [95, 70, 42]); s(x, 1, [95, 70, 42]); }
      // пила и молоток
      for (let y = 4; y < 12; y++) { s(3, y, [180, 180, 185]); s(4, y, [150, 150, 155]); }
      for (let y = 12; y < 15; y++) s(3, y, [90, 60, 30]);
      for (let x = 9; x < 14; x++) { s(x, 4, [120, 120, 125]); s(x, 5, [100, 100, 105]); }
      for (let y = 6; y < 14; y++) s(11, y, [90, 60, 30]);
    },
    path_top: (s, r) => each((x, y) => s(x, y, r() < 0.15 ? vary([125, 98, 60], 0.15, r) : vary([160, 128, 82], 0.12, r))),
    pot(s, r) {
      each((x, y) => s(x, y, y < 3 ? vary([150, 75, 50], 0.08, r) : vary([185, 98, 64], 0.1, r)));
    },
    tv_screen(s, r) {
      each((x, y) => {
        const edge = x === 0 || y === 0 || x === 15 || y === 15;
        const glare = (x + y === 8 || x + y === 9) && x > 1 && y > 1;
        s(x, y, edge ? [25, 25, 28] : glare ? [120, 170, 230] : vary([30, 45, 90], 0.15, r));
      });
    },
    wool_pink: wool([255, 150, 190]),
    stone_bricks(s, r) {
      each((x, y) => {
        const off = (y >> 3) % 2 ? 4 : 0;
        const mortar = y % 8 === 7 || (x + off) % 8 === 7;
        s(x, y, mortar ? vary([96, 96, 98], 0.08, r) : vary([140, 140, 142], 0.1, r));
      });
    },
    sandstone_top: (s, r) => fill(s, r, [218, 200, 140], 0.06),
    sandstone_side(s, r) {
      each((x, y) => s(x, y, y < 3 ? vary([228, 212, 156], 0.05, r) : (y === 3 || y === 12) ? [180, 160, 105] : vary([210, 190, 130], 0.06, r)));
    },
    gravel(s, r) {
      const cols = [[130, 125, 120], [95, 92, 90], [160, 150, 140], [115, 100, 90]];
      each((x, y) => s(x, y, vary(cols[(r() * cols.length) | 0], 0.12, r)));
    },
    clay: (s, r) => fill(s, r, [160, 166, 178], 0.05),
    marble(s, r) {
      each((x, y) => s(x, y, ((x * 3 + y * 7 + ((r() * 3) | 0)) % 17 === 0) ? [180, 180, 185] : vary([236, 236, 232], 0.03, r)));
    },
    dark_planks: (s, r) => plankPaint(s, r, [100, 70, 42], [65, 45, 26]),
    birch_planks: (s, r) => plankPaint(s, r, [215, 196, 140], [170, 150, 100]),
    hay_top: (s, r) => each((x, y) => s(x, y, r() < 0.2 ? vary([180, 140, 40], 0.1, r) : vary([220, 185, 70], 0.1, r))),
    hay_side(s, r) {
      each((x, y) => s(x, y, (y === 4 || y === 11) ? vary([140, 60, 40], 0.1, r) : vary(x % 3 === 0 ? [190, 155, 50] : [222, 188, 72], 0.08, r)));
    },
    pumpkin_top(s, r) {
      each((x, y) => s(x, y, (x >= 7 && x <= 8 && y >= 7 && y <= 8) ? [70, 100, 30] : vary([225, 130, 30], 0.1, r)));
    },
    pumpkin_side: (s, r) => each((x, y) => s(x, y, vary(x % 4 === 0 ? [190, 100, 20] : [228, 135, 32], 0.08, r))),
    melon_top: (s, r) => each((x, y) => s(x, y, vary(Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) < 2 ? [120, 170, 60] : [90, 150, 40], 0.1, r))),
    melon_side: (s, r) => each((x, y) => s(x, y, vary((x >> 1) % 2 ? [70, 130, 35] : [120, 180, 55], 0.08, r))),
    iron_block: metalBlock([214, 214, 220]),
    gold_block: metalBlock([246, 210, 60]),
    diamond_block: metalBlock([100, 228, 218]),
    coal_block: metalBlock([48, 48, 54]),
    ice(s, r) {
      each((x, y) => s(x, y, ((x + y * 2) % 13 === 0) ? [235, 245, 255] : vary([165, 205, 245], 0.06, r)));
    },
    glass_red: tintedGlass([230, 80, 80], [150, 40, 40]),
    glass_blue: tintedGlass([90, 130, 235], [40, 60, 150]),
    concrete_white: (s, r) => fill(s, r, [232, 234, 236], 0.03),
    concrete_black: (s, r) => fill(s, r, [34, 35, 40], 0.06),
    concrete_red: (s, r) => fill(s, r, [176, 42, 38], 0.04),
    concrete_blue: (s, r) => fill(s, r, [44, 70, 160], 0.04),
    concrete_green: (s, r) => fill(s, r, [82, 128, 40], 0.04),
    concrete_yellow: (s, r) => fill(s, r, [240, 186, 30], 0.04),
    concrete_pink: (s, r) => fill(s, r, [232, 120, 160], 0.04),
    pc_screen(s) {
      each((x, y) => {
        const edge = x === 0 || y === 0 || x === 15 || y === 15;
        let c = edge ? [20, 20, 24] : [40 + y * 6, 110 + y * 4, 210];
        if (y === 14) c = [30, 30, 40];
        if ((y === 3 || y === 4) && (x === 3 || x === 4)) c = [250, 200, 60];
        if ((y === 3 || y === 4) && (x === 7 || x === 8)) c = [240, 90, 120];
        if ((y === 7 || y === 8) && (x === 3 || x === 4)) c = [120, 220, 120];
        s(x, y, c);
      });
    },
    keyboard(s) {
      each((x, y) => s(x, y, (x % 2 === 0 || y % 3 === 0) ? [70, 70, 76] : [200, 200, 206]));
    },
    fridge_front(s, r) {
      each((x, y) => {
        let c = vary([236, 238, 240], 0.02, r);
        if (y === 6) c = [170, 172, 176];
        if (x === 12 && ((y >= 2 && y <= 4) || (y >= 8 && y <= 13))) c = [110, 112, 118];
        s(x, y, c);
      });
    },
    wheat_crop(s, r) {
      each((x, y) => s(x, y, [0, 0, 0], 0));
      for (let x = 1; x < 16; x += 3) {
        const top = 1 + ((r() * 3) | 0);
        for (let y = top; y < 16; y++) s(x, y, y < top + 4 ? vary([218, 182, 72], 0.1, r) : vary([140, 165, 60], 0.1, r));
        s(x + 1, top + 1, [200, 165, 60]); s(x - 1, top + 2, [200, 165, 60]);
      }
    },
    wardrobe_front(s, r) {
      plankPaint(s, r, [100, 70, 42], [65, 45, 26]);
      for (let y = 0; y < 16; y++) { s(7, y, [50, 34, 20]); s(8, y, [50, 34, 20]); }
      s(6, 8, [240, 200, 60]); s(9, 8, [240, 200, 60]);
    },
    concrete(s, r) {
      each((x, y) => s(x, y, r() < 0.04 ? vary([128, 130, 133], 0.05, r) : vary([158, 160, 163], 0.04, r)));
    },
  };

  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * 16; canvas.height = ATLAS_ROWS * 16;
  const ctx = canvas.getContext('2d');
  const avg = [];
  TILE_NAMES.forEach((name, i) => {
    const img = ctx.createImageData(16, 16);
    const r = Noise.mulberry32(1000 + i * 7919);
    const set = (x, y, c, a) => {
      if (x < 0 || y < 0 || x > 15 || y > 15) return;
      const k = (y * 16 + x) * 4;
      img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2];
      img.data[k + 3] = a === undefined ? 255 : a;
    };
    P[name](set, r);
    ctx.putImageData(img, (i % ATLAS_COLS) * 16, Math.floor(i / ATLAS_COLS) * 16);
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let k = 0; k < img.data.length; k += 4) {
      if (img.data[k + 3] > 0) { sr += img.data[k]; sg += img.data[k + 1]; sb += img.data[k + 2]; n++; }
    }
    avg.push([sr / n / 255, sg / n / 255, sb / n / 255]);
  });
  return { canvas, avg };
})();

// ---------- Иконки блоков (изометрический кубик) ----------
const ICONS = [];
function blockIcon(id) {
  if (ICONS[id]) return ICONS[id];
  if (BLOCKS[id].boxes) return (ICONS[id] = boxIcon(id));
  const size = 48;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const b = BLOCKS[id];
  const draw = (tile, m, shade) => {
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(ATLAS.canvas, (tile % ATLAS_COLS) * 16, Math.floor(tile / ATLAS_COLS) * 16, 16, 16, 0, 0, 16, 16);
    if (shade < 1) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(0,0,0,${1 - shade})`;
      ctx.fillRect(0, 0, 16, 16);
    }
  };
  draw(b.tex[2], [20 / 16, 11 / 16, 0, 22 / 16, 4, 13], 0.78);
  draw(b.tex[2], [20 / 16, -11 / 16, 0, 22 / 16, 24, 24], 0.6);
  draw(b.tex[0], [20 / 16, 11 / 16, -20 / 16, 11 / 16, 24, 2], 1);
  ICONS[id] = c.toDataURL();
  return ICONS[id];
}

// ---------- Предметы (не блоки) ----------
const ITEM = {
  STICK: 100, COAL: 101, IRON: 102, GOLD: 103, DIAMOND: 104,
  WOOD_PICK: 110, STONE_PICK: 111, IRON_PICK: 112, DIAMOND_PICK: 113,
  WOOD_SWORD: 120, STONE_SWORD: 121, IRON_SWORD: 122, DIAMOND_SWORD: 123,
  MEAT: 140, APPLE: 141,
  CAR_RED: 130, CAR_BLUE: 131, CAR_YELLOW: 132, CAR_WHITE: 133, CAR_BLACK: 134,
  PLANE_RED: 150, PLANE_BLUE: 151, PLANE_YELLOW: 152, BOEING: 153,
  WOOD_AXE: 160, STONE_AXE: 161, IRON_AXE: 162, DIAMOND_AXE: 163,
  WOOD_SHOVEL: 164, STONE_SHOVEL: 165, IRON_SHOVEL: 166, DIAMOND_SHOVEL: 167,
  BREAD: 170, CARROT: 171, COOKIE: 172, CAKE: 173, MELON_SLICE: 174, PIE: 175,
  METRO_TRAIN: 190, LIGHTER: 191, MINECART: 192, PHONE: 193, SHRINKER: 194, PHYSGUN: 195, WAND: 196, MONITOR: 197,
  BUCKET: 198, WATER_BUCKET: 199, LAVA_BUCKET: 105, SNOWBALL: 106,
  REAL_SEDAN: 135, REAL_SUV: 136, REAL_SPORT: 137, REAL_BUS: 138, REAL_BOAT: 139, REAL_SHIP: 187, REAL_CESSNA: 188, REAL_AIRLINER: 189,
  EGG: 176, FEATHER: 177, WHEAT: 178, PORK: 179, MUTTON: 180, CHICKEN_MEAT: 181, EMERALD_GEM: 182,
  STEAK: 183, COOKED_PORK: 184, COOKED_MUTTON: 185, COOKED_CHICKEN: 186,
  SPAWN_EGG: 142,                // яйца призыва: 142..152 — по одному на каждое существо
};

// Пиксель-арт 16×16: O — контур, H/h/L — цвет материала (основной/тёмный/светлый), S/s — палка, G — гарда
const ART = {
  stick: ['', '', '.......OO.......', '......OSsO......', '......OSsO......', '......OSsO......', '......OSsO......',
    '......OSsO......', '......OSsO......', '......OSsO......', '......OSsO......', '......OSsO......', '......OSsO......', '.......OO.......'],
  lump: ['', '', '', '', '.....OOOOOO.....', '....OHHhHHhO....', '...OHhHHHhHHO...', '...OHHHhHHhHO...',
    '...OhHHHHHHhO...', '...OHHhHHhHHO...', '....OHHHhHHO....', '.....OOOOOO.....'],
  ingot: ['', '', '', '', '', '', '....OOOOOOOO....', '...OLLLLLLLLO...', '..OHHHHHHHHHHO..', '..OHHHHHHHHHhO..',
    '..OhhhhhhhhhhO..', '..OOOOOOOOOOOO..'],
  gem: ['', '', '', '.....OOOOOO.....', '....OLLHHHHO....', '...OLHHHHHHhO...', '..OHHHHHHHHhhO..', '...OHHHHHHhhO...',
    '....OHHHHhhO....', '.....OHHhhO.....', '......OhhO......', '.......OO.......'],
  pick: ['', '...OOOOOOOOOO...', '..OHHHHHHHHHHO..', '.OHhhhhOOhhhhHO.', '.OhO..OSsO..OhO.', '.OO...OSsO...OO.',
    '......OSsO......', '......OSsO......', '......OSsO......', '......OSsO......', '......OSsO......', '......OSsO......',
    '......OSsO......', '......OSsO......', '.......OO.......'],
  sword: ['', '.......OO.......', '......OLHO......', '......OLhO......', '......OLhO......', '......OLhO......',
    '......OLhO......', '......OLhO......', '......OLhO......', '......OLhO......', '....OOOOOOOO....', '....OGGGGGGO....',
    '....OOOSsOOO....', '......OSsO......', '......OSsO......', '.......OO.......'],
};
ART.meat = ['', '', '', '........OOOO', '.......OHHHHO', '......OHLHHHhO', '.....OHLHHHHhO', '....OHHHHHHhO',
  '...OHHHHHhhO', '..OWOHhhhOO', '.OWWOOOOO', '..OO'];
ART.apple = ['', '', '.......s', '.......sgg', '....OOOsOOO', '...OHHHHHHHO', '..OHLHHHHHHhO', '..OHLHHHHHHhO',
  '..OHHHHHHHHhO', '..OHHHHHHHhhO', '...OHHHHHhhO', '....OHHOHhO', '.....OO.OO'];
ART.car = ['', '', '', '', '.....OOOOOO', '....OLGGGGLO', '...OHGGGGGGHO', '.OOHHHHHHHHHHOO', '.OHHHHHHHHHHHHO',
  '.OhHHHHHHHHHHyO', '.OOhhOOOOOhhOOO', '...OkkO..OkkO', '....OO....OO'];
ART.plane = ['.......OO', '......OyyO', '......OHHO', '......OHGO', '......OHHO', '.OOOOOOHHOOOOOO.', 'OLLLLLLHHLLLLLLO',
  'OHHHHHHHHHHHHHHO', '.OOOOOOHHOOOOOO.', '......OHHO', '......OHHO', '......OHHO', '....OOOHHOOO', '....OLLHHLLO', '....OOOOOOOO'];
ART.boeing = ['.......OO', '......OHHO', '......OGGO', '......OHHO', '......OHHO', '.....OOHHOO', '...OOLLHHLLOO',
  '.OOLLLLHHLLLLOO', 'OLLLLLLHHLLLLLLO', 'OOOOOkOHHOkOOOOO', '.....kOHHOk', '......OHHO', '......OHHO',
  '....OOLHHLOO', '....OOOOOOOO'];
ART.shovel = ['', '......OOOO', '.....OLHHhO', '.....OLHHhO', '.....OHHHhO', '.....OHHhhO', '......OHhO',
  '......OSsO', '......OSsO', '......OSsO', '......OSsO', '......OSsO', '......OSsO', '......OSsO',
  '.....OOSsOO', '.....OSSssO'];
ART.axe = ['', '.........OO', '...OOOOOOSsO', '..OLHHHHOSsO', '..OHHHHHOSsO', '..OHhhhHOSsO', '...OOOOOOSsO',
  '........OSsO', '........OSsO', '........OSsO', '........OSsO', '........OSsO', '........OSsO', '........OSsO',
  '.........OO'];
ART.bread = ['', '', '', '', '', '....OOOOOOOO', '...OLLLLLLLLO', '..OLHHHHHHHHhO', '..OHHLHHLHHHhO',
  '..OHHHHHHHHhhO', '...OhhhhhhhhO', '....OOOOOOOO'];
ART.carrot = ['', '', '..........gg', '.........gGg', '........OOg', '.......OHHO', '......OHLHO', '.....OHHHO',
  '....OHHHO', '...OHHhO', '..OHhO', '..OO'];
ART.cookie = ['', '', '', '', '.....OOOOOO', '....OHHhHHHO', '...OHkHHHkHHO', '...OHHHHHHHHO', '...OHHkHHHkHO',
  '...OhHHHkHHHO', '....OhHHHHHO', '.....OOOOOO'];
ART.cake = ['', '', '', '', '...OOOOOOOOOO', '..OWWRWWWRWWWO', '..OWWWWWWWWWWO', '..OHHHHHHHHHHO', '..OWWWWWWWWWWO',
  '..OHHHHHHHHHHO', '..OhhhhhhhhhhO', '...OOOOOOOOOO'];
ART.slice = ['', '', '', '', '', '.OOOOOOOOOOOOOO', '.OHHkHHHHkHHHHO', '..OHHHHkHHHHHO', '...OHkHHHHkHO',
  '....OLLLLLLO', '.....OggggO', '......OOOO'];
ART.pie = ['', '', '', '', '', '....OOOOOOOO', '...OLLLLLLLLO', '..OLHHHHHHHHLO', '..OLHHHHHHHHLO', '..OLLLLLLLLLLO',
  '...OhhhhhhhhO', '....OOOOOOOO'];
ART.bucket = ['', '', '', '...OOOOOOOOOO', '..OLLLLLLLLLLO', '..OWWWWWWWWWWO', '..OHWWWWWWWWHO', '...OHHHHHHHHO', '...OHHHHHHhHO',
  '...OHHHHHHhHO', '....OHHHHhHO', '....OHHHHhHO', '.....OOOOOO'];
ART.snowball = ['', '', '', '', '.....OOOOO', '....OWWLWWO', '...OWLLWWWWO', '...OWWWWWWdO', '...OWWWWWWdO', '...OWWWWWddO', '....OWWWddO',
  '.....OOOOO'];
ART.bus = ['', '', '', '.OOOOOOOOOOOOO', 'OHHHHHHHHHHHHHO', 'OHGGOGGOGGOGGHO', 'OHGGOGGOGGOGGHO', 'OHHHHHHHHHHHHHO', 'OHHHHHHHHHHHHyO',
  'OhhhhhhhhhhhhhO', '.OkkOOOOOOOkkO', '.OkkO.....OkkO', '..OO.......OO'];
ART.boat = ['', '', '', '', '.......Ok', '......OkGO', '.....OkGGO', '....OOOOOOOOOOO', '.OOLLLLLLLLLLLO', '.OHHHHHHHHHHHO', '..OHHHHHHHHHO',
  '...OhhhhhhhO', '....OOOOOOO', '', 'sssssssssssssss'];
ART.spawnEgg = ['', '', '', '......OOO', '.....OHHHO', '....OHLSHHO', '....OHHHHSO', '...OSHHHSHHO', '...OHHSHHHhO',
  '...OHHHHHShO', '....OSHHhhO', '.....OOOOO'];
ART.egg = ['', '', '', '......OOO', '.....OWWWO', '....OWLWWWO', '....OWWWWWO', '...OWWWWWWWO', '...OWWWWWWdO',
  '...OWWWWWddO', '....OWWWddO', '.....OOOOO'];
ART.feather = ['', '...........OO', '..........OLWO', '.........OLWWO', '........OLWWO', '.......OLWWO', '......OLWWO',
  '.....OLWWO', '....OLWWO', '...OWWO', '..OsO', '.Os'];
ART.wheat = ['', '......y.y.y', '.....yYyYyYy', '......YyYyY', '......yYyYy', '.......YyY', '.......yYy', '........Y',
  '.......YyY', '......Y.Y.Y', '.....Y..Y..Y', '....Y...Y...Y'];
ART.train = ['', '', '....OOOOOOOO', '...OHHHHHHHHO', '...OGGGGGGGGO', '...OGGGGGGGGO', '...OHHHHHHHHO',
  '...ORRRRRRRRO', '...OHyHHHHyHO', '...OHHHHHHHHO', '...OOOOOOOOOO', '....OkO..OkO', '....OO....OO'];
ART.lighter = ['', '', '......OOO', '.....OkkkO', '.....OkOkO', '....OOOOOOO', '....OLLLLLO', '....OHHHHHO', '....OHHHHHO',
  '....OHHHHHO', '....OHHHHHO', '....OHHHHHO', '....OhhhhhO', '....OOOOOOO'];
ART.minecart = ['', '', '', '', '..OOOOOOOOOOOO', '..OLLLLLLLLLLO', '..OHHHHHHHHHHO', '..OHhHHHHHHhHO', '..OHHHHHHHHHHO',
  '...OHHHHHHHHO', '...OOOOOOOOOO', '...OkkO..OkkO', '....OO....OO'];
ART.monitor = ['', '', '.OOOOOOOOOOOOOO', '.OkkkkkkkkkkkkO', '.OkGGGGGGGGGGkO', '.OkGLLGGGGGRGkO', '.OkGGGGGGGGGGkO', '.OkGGGHHGGGGGkO',
  '.OkGGHHHHGGGGkO', '.OkGGGGGGGGGGkO', '.OkkkkkkkkkkkkO', '.OOOOOOkkOOOOOO', '......OkkO', '....OOOOOOOO', '....OkkkkkkO', '....OOOOOOOO'];
ART.wand = ['', '.............OO', '............OYYO', '...........OYLYO', '..........OSOYYO', '.........OSsO.O', '........OSsO', '.......OSsO',
  '......OSsO', '.....OSsO', '....OSsO', '...OSsO', '..OSsO', '..OOO'];
ART.physgun = ['', '', '', '............GG', '...OOOOOOOOOGGG', '..OLLLLLLLLLOGGG', '.OHHHHHHHHHHHOG', '.OHhGGhHHhGGhO',
  '..OhhhhhhhhhO', '....OkkOOOO', '....OkkO', '...OkkO', '...OkkO', '...OOOO'];
ART.ray = ['', '', '', '...........G.G', '....OOOOOOOGGG', '...OLLLLLLLLOGG', '..OHHHHHHHHHHOGG', '..OHhHHhHHhHHOG',
  '...OhhhhhhhhO.G', '....OkkOOOO', '....OkkO', '...OkkO', '...OkkO', '...OOOO'];
ART.phone = ['', '.....OOOOOO', '....OkkkkkkO', '....OkGGGGkO', '....OkGLGGkO', '....OkGGGGkO', '....OkGGGLkO', '....OkGGGGkO',
  '....OkGLGGkO', '....OkGGGGkO', '....OkGGGGkO', '....OkGGGGkO', '....OkkkkkkO', '....OkkHHkkO', '.....OOOOOO'];
const MAT = {
  wood: { H: [178, 140, 86], h: [128, 96, 58], L: [210, 175, 120] },
  stone: { H: [150, 150, 150], h: [100, 100, 100], L: [190, 190, 190] },
  iron: { H: [225, 225, 225], h: [165, 165, 165], L: [255, 255, 255] },
  gold: { H: [250, 215, 70], h: [200, 160, 30], L: [255, 245, 170] },
  diamond: { H: [100, 235, 225], h: [40, 175, 165], L: [210, 255, 252] },
  phone: { k: [30, 32, 38], G: [70, 120, 220], L: [150, 210, 255], H: [120, 120, 130] },
  monitor: { k: [40, 42, 50], G: [60, 90, 120], L: [150, 200, 240], H: [90, 160, 90], R: [240, 50, 50] },
  wand: { S: [150, 105, 60], s: [100, 68, 38], Y: [255, 215, 60], L: [255, 250, 200] },
  physgun: { H: [60, 140, 230], h: [30, 80, 160], L: [170, 220, 255], k: [45, 45, 55], G: [120, 245, 255] },
  ray: { H: [150, 80, 220], h: [100, 50, 160], L: [200, 160, 255], k: [50, 50, 60], G: [90, 240, 255] },
  lighter: { H: [220, 50, 50], h: [160, 30, 30], L: [255, 140, 130], k: [170, 170, 175] },
  minecart: { H: [150, 152, 158], h: [100, 102, 108], L: [200, 202, 208], k: [50, 50, 55] },
  train: { H: [238, 240, 244], G: [40, 60, 100], R: [210, 40, 40], y: [255, 230, 120], k: [60, 60, 66] },
  emerald: { H: [50, 210, 100], h: [20, 140, 60], L: [180, 255, 200] },
  pork: { H: [245, 150, 160], h: [205, 105, 120], L: [255, 205, 210], W: [250, 240, 230] },
  mutton: { H: [185, 60, 60], h: [130, 35, 40], L: [225, 120, 115], W: [245, 240, 225] },
  chicken: { H: [240, 205, 170], h: [200, 160, 120], L: [255, 235, 210], W: [250, 245, 235] },
  coal: { H: [55, 55, 60], h: [25, 25, 30], L: [90, 90, 95] },
  cooked: { H: [150, 88, 48], h: [105, 58, 30], L: [196, 132, 78], W: [235, 220, 190] },
  meat: { H: [215, 90, 90], h: [160, 55, 60], L: [245, 150, 150], W: [245, 240, 225] },
  apple: { H: [220, 40, 40], h: [150, 20, 25], L: [255, 140, 130], g: [80, 170, 60] },
  car_red: { H: [220, 45, 45], h: [150, 25, 25], L: [255, 120, 120], G: [170, 220, 255], y: [255, 230, 90], k: [55, 55, 60] },
  car_blue: { H: [50, 110, 220], h: [30, 60, 150], L: [130, 180, 255], G: [170, 220, 255], y: [255, 230, 90], k: [55, 55, 60] },
  car_yellow: { H: [245, 200, 40], h: [190, 140, 20], L: [255, 235, 140], G: [170, 220, 255], y: [255, 255, 200], k: [55, 55, 60] },
  car_white: { H: [240, 240, 240], h: [185, 185, 190], L: [255, 255, 255], G: [150, 200, 240], y: [255, 230, 90], k: [55, 55, 60] },
  car_black: { H: [45, 45, 50], h: [25, 25, 28], L: [95, 95, 105], G: [150, 200, 240], y: [255, 230, 90], k: [80, 80, 85], O: [10, 10, 12] },
  boeing: { H: [242, 242, 246], L: [200, 205, 215], G: [120, 180, 240], k: [90, 95, 110] },
  bread: { H: [205, 150, 80], L: [235, 190, 120], h: [160, 105, 50] },
  carrot: { H: [240, 130, 30], L: [255, 180, 80], h: [190, 90, 20], g: [80, 170, 60], G: [50, 120, 40] },
  cookie: { H: [205, 140, 70], h: [160, 100, 45], k: [80, 45, 25] },
  cake: { H: [225, 175, 110], h: [170, 120, 70], W: [250, 248, 240], R: [220, 40, 50] },
  slice: { H: [235, 70, 70], k: [30, 30, 30], L: [170, 220, 120], g: [70, 140, 40] },
  pie: { H: [230, 140, 40], L: [220, 180, 110], h: [170, 120, 60] },
  egg: { W: [245, 235, 215], L: [255, 255, 255], d: [210, 195, 170] },
  feather: { W: [245, 245, 245], L: [255, 255, 255], s: [140, 140, 140] },
  wheat: { y: [225, 195, 95], Y: [180, 145, 60] },
  plane_red: { H: [230, 50, 50], L: [250, 250, 250], G: [150, 210, 255], y: [60, 60, 60] },
  plane_blue: { H: [50, 120, 225], L: [250, 250, 250], G: [150, 210, 255], y: [60, 60, 60] },
  plane_yellow: { H: [245, 205, 40], L: [200, 60, 40], G: [150, 210, 255], y: [60, 60, 60] },
};
const PICK_SPEED = [2, 4, 6, 9];   // во сколько раз инструмент ускоряет добычу     // во сколько раз кирка ускоряет добычу камня
const SWORD_DAMAGE = [4, 5, 6, 8];

const ITEMS = {};
function defItem(id, name, art, mat, extra) {
  ITEMS[id] = Object.assign({ id, name, art, colors: MAT[mat] }, extra || {});
}
defItem(ITEM.STICK, 'Палка', 'stick', 'wood');
defItem(ITEM.COAL, 'Уголь', 'lump', 'coal');
defItem(ITEM.IRON, 'Железный слиток', 'ingot', 'iron');
defItem(ITEM.GOLD, 'Золотой слиток', 'ingot', 'gold');
defItem(ITEM.DIAMOND, 'Алмаз', 'gem', 'diamond');
defItem(ITEM.MEAT, 'Говядина', 'meat', 'meat', { food: 5 });
defItem(ITEM.PORK, 'Свинина', 'meat', 'pork', { food: 5 });
defItem(ITEM.MUTTON, 'Баранина', 'meat', 'mutton', { food: 4 });
defItem(ITEM.CHICKEN_MEAT, 'Курятина', 'meat', 'chicken', { food: 3 });
defItem(ITEM.EMERALD_GEM, 'Изумруд', 'gem', 'emerald');
defItem(ITEM.STEAK, 'Жареная говядина', 'meat', 'cooked', { food: 8 });
defItem(ITEM.COOKED_PORK, 'Жареная свинина', 'meat', 'cooked', { food: 8 });
defItem(ITEM.COOKED_MUTTON, 'Жареная баранина', 'meat', 'cooked', { food: 6 });
defItem(ITEM.COOKED_CHICKEN, 'Жареная курица', 'meat', 'cooked', { food: 6 });
defItem(ITEM.METRO_TRAIN, 'Поезд метро', 'train', 'train', { train: true, mod: 'metro' });
defItem(ITEM.LIGHTER, 'Зажигалка', 'lighter', 'lighter', { lighter: true });
defItem(ITEM.MINECART, 'Вагонетка', 'minecart', 'minecart', { minecart: true });
defItem(ITEM.PHONE, 'Телефон', 'phone', 'phone', { phone: true, mod: 'phone' });
defItem(ITEM.SHRINKER, 'Уменьшатель', 'ray', 'ray', { shrinker: true, mod: 'mini' });
defItem(ITEM.PHYSGUN, 'Физган', 'physgun', 'physgun', { physgun: true, mod: 'physgun' });
defItem(ITEM.WAND, 'Палочка World changing', 'wand', 'wand', { wand: true, mod: 'worldchanging' });
defItem(ITEM.MONITOR, 'Экран для камер', 'monitor', 'monitor', { monitor: true, mod: 'cameras' });
// вёдра: пустое черпает воду и лаву, полное выливает
MAT.bucket = { H: [176, 180, 188], h: [120, 124, 132], L: [220, 222, 228], W: [60, 62, 68] };
MAT.bucket_water = { H: [176, 180, 188], h: [120, 124, 132], L: [220, 222, 228], W: [60, 120, 230] };
MAT.bucket_lava = { H: [176, 180, 188], h: [120, 124, 132], L: [220, 222, 228], W: [255, 130, 20] };
MAT.snowball = { W: [242, 248, 255], L: [255, 255, 255], d: [200, 214, 230] };
defItem(ITEM.BUCKET, 'Ведро', 'bucket', 'bucket', { bucket: 'empty' });
defItem(ITEM.WATER_BUCKET, 'Ведро воды', 'bucket', 'bucket_water', { bucket: 'water' });
defItem(ITEM.LAVA_BUCKET, 'Ведро лавы', 'bucket', 'bucket_lava', { bucket: 'lava' });
defItem(ITEM.SNOWBALL, 'Снежок', 'snowball', 'snowball', { snowball: true });
// мод «Реалистичный транспорт»
MAT.real_sedan = { H: [184, 188, 196], h: [120, 124, 132], L: [230, 232, 236], G: [60, 90, 120], y: [255, 240, 200], k: [40, 40, 44] };
MAT.real_suv = { H: [40, 42, 48], h: [22, 23, 26], L: [90, 92, 100], G: [60, 90, 120], y: [255, 240, 200], k: [80, 80, 85], O: [8, 8, 10] };
MAT.real_sport = { H: [216, 32, 30], h: [150, 20, 20], L: [255, 110, 100], G: [40, 50, 70], y: [255, 240, 200], k: [30, 30, 34] };
MAT.real_bus = { H: [242, 194, 40], h: [190, 140, 20], G: [40, 60, 90], y: [255, 176, 32], k: [30, 30, 34] };
MAT.real_boat = { H: [245, 245, 248], h: [200, 204, 210], L: [60, 110, 220], k: [40, 40, 44], G: [120, 180, 230], s: [60, 130, 220] };
MAT.real_ship = { H: [245, 245, 248], h: [190, 40, 40], L: [40, 80, 170], k: [40, 40, 44], G: [120, 180, 230], s: [60, 130, 220] };
MAT.real_cessna = { H: [245, 245, 248], L: [200, 40, 40], G: [120, 180, 230], y: [60, 60, 60] };
MAT.real_airliner = { H: [245, 245, 248], L: [30, 80, 180], G: [120, 180, 230], y: [60, 60, 60] };
defItem(ITEM.REAL_SEDAN, 'Седан', 'car', 'real_sedan', { car: 0xb8bcc4, carStyle: 'sedan', mod: 'realtransport' });
defItem(ITEM.REAL_SUV, 'Внедорожник', 'car', 'real_suv', { car: 0x2a2c32, carStyle: 'suv', mod: 'realtransport' });
defItem(ITEM.REAL_SPORT, 'Спорткар', 'car', 'real_sport', { car: 0xd8201e, carStyle: 'sport', mod: 'realtransport' });
defItem(ITEM.REAL_BUS, 'Автобус', 'bus', 'real_bus', { car: 0xf2c228, carStyle: 'bus', mod: 'realtransport' });
defItem(ITEM.REAL_BOAT, 'Катер', 'boat', 'real_boat', { car: 0x2a5ad0, carStyle: 'boat', mod: 'realtransport' });
defItem(ITEM.REAL_SHIP, 'Теплоход', 'boat', 'real_ship', { car: 0x2a5ad0, carStyle: 'ship', mod: 'realtransport' });
defItem(ITEM.REAL_CESSNA, 'Самолёт «Сессна»', 'plane', 'real_cessna', { plane: [0xf4f5f7, 0xc82828], planeType: 'cessna', mod: 'realtransport' });
defItem(ITEM.REAL_AIRLINER, 'Пассажирский лайнер', 'boeing', 'real_airliner', { plane: [0xf4f5f7, 0x1e50b4], planeType: 'airliner', mod: 'realtransport' });
defItem(ITEM.APPLE, 'Яблоко', 'apple', 'apple', { food: 2 });
defItem(ITEM.CAR_RED, 'Красная машина', 'car', 'car_red', { car: 0xdd3030, mod: 'cars' });
defItem(ITEM.CAR_BLUE, 'Синяя машина', 'car', 'car_blue', { car: 0x3570dd, mod: 'cars' });
defItem(ITEM.CAR_YELLOW, 'Жёлтая машина', 'car', 'car_yellow', { car: 0xf2c228, mod: 'cars' });
defItem(ITEM.CAR_WHITE, 'Белая машина', 'car', 'car_white', { car: 0xf0f0f0, mod: 'cars' });
defItem(ITEM.CAR_BLACK, 'Чёрная машина', 'car', 'car_black', { car: 0x2a2a2e, mod: 'cars' });
// самолёт: основной цвет и цвет полосок
defItem(ITEM.PLANE_RED, 'Красный самолёт', 'plane', 'plane_red', { plane: [0xe03535, 0xf5f5f5], mod: 'planes' });
defItem(ITEM.PLANE_BLUE, 'Синий самолёт', 'plane', 'plane_blue', { plane: [0x3578e0, 0xf5f5f5], mod: 'planes' });
defItem(ITEM.BOEING, 'Боинг', 'boeing', 'boeing', { plane: [0xf2f2f5, 0x2a5ad0], planeType: 'boeing', mod: 'planes' });
defItem(ITEM.PLANE_YELLOW, 'Жёлтый самолёт', 'plane', 'plane_yellow', { plane: [0xf2c828, 0xc83c28], mod: 'planes' });
['wood', 'stone', 'iron', 'diamond'].forEach((m, tier) => {
  const names = ['Деревянн', 'Каменн', 'Железн', 'Алмазн'];
  defItem(ITEM.WOOD_PICK + tier, names[tier] + 'ая кирка', 'pick', m, { tool: { kind: 'pick', tier }, damage: 2 });
  defItem(ITEM.WOOD_SWORD + tier, names[tier] + 'ый меч', 'sword', m, { tool: { kind: 'sword', tier }, damage: SWORD_DAMAGE[tier] });
  defItem(ITEM.WOOD_AXE + tier, names[tier] + 'ый топор', 'axe', m, { tool: { kind: 'axe', tier }, damage: 3 + tier });
  defItem(ITEM.WOOD_SHOVEL + tier, names[tier] + 'ая лопата', 'shovel', m, { tool: { kind: 'shovel', tier }, damage: 2 });
});
defItem(ITEM.BREAD, 'Хлеб', 'bread', 'bread', { food: 5 });
defItem(ITEM.CARROT, 'Морковка', 'carrot', 'carrot', { food: 3 });
defItem(ITEM.COOKIE, 'Печенье', 'cookie', 'cookie', { food: 2 });
defItem(ITEM.CAKE, 'Торт', 'cake', 'cake', { food: 12 });
defItem(ITEM.MELON_SLICE, 'Ломтик арбуза', 'slice', 'slice', { food: 2 });
defItem(ITEM.PIE, 'Тыквенный пирог', 'pie', 'pie', { food: 8 });
defItem(ITEM.EGG, 'Яйцо', 'egg', 'egg');
// Яйца призыва: правой кнопкой по земле — появится существо. Цвета — основной и пятнышки.
const SPAWN_EGGS = [
  ['pig', 'Свинка', [240, 160, 176], [200, 110, 125]], ['cow', 'Корова', [70, 52, 40], [200, 200, 200]],
  ['sheep', 'Овечка', [236, 236, 230], [230, 180, 170]], ['chicken', 'Курочка', [235, 235, 235], [220, 40, 40]],
  ['villager', 'Житель', [120, 80, 50], [190, 140, 100]], ['buka', 'Бука', [70, 48, 106], [214, 255, 58]],
  ['zombie', 'Зомби', [47, 159, 168], [95, 163, 90]], ['zombieVillager', 'Зомби-житель', [107, 74, 42], [106, 168, 96]],
  ['husk', 'Пустынный зомби', [200, 176, 122], [138, 115, 80]], ['drowned', 'Утопленник', [88, 168, 160], [80, 255, 240]],
  ['babyZombie', 'Малыш-зомби', [47, 159, 168], [255, 220, 120]],
  ['beetle', 'Жук', [42, 107, 58], [20, 20, 20]], ['snail', 'Улитка', [200, 176, 144], [160, 82, 45]],
  ['turtle', 'Черепаха', [63, 122, 58], [216, 208, 144]], ['lizard', 'Ящерица', [122, 168, 58], [216, 192, 64]],
];
const EGG_IDS = [142, 143, 144, 145, 146, 147, 148, 149, 154, 155, 156, 157, 158, 159, 168];
SPAWN_EGGS.forEach(([type, name, H, S], i) => {
  const id = EGG_IDS[i];
  MAT['egg_' + type] = { H, S, L: H.map(c => Math.min(255, c + 60)), h: H.map(c => c * 0.75) };
  defItem(id, 'Яйцо призыва: ' + name, 'spawnEgg', 'egg_' + type, { spawnEgg: type });
});
defItem(ITEM.FEATHER, 'Перо', 'feather', 'feather');
defItem(ITEM.WHEAT, 'Пшеница', 'wheat', 'wheat');

function itemCanvas(id) {
  const it = ITEMS[id];
  if (it.canvas) return it.canvas;
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d');
  const pal = Object.assign({ O: [35, 28, 22], S: [140, 105, 60], s: [95, 70, 40], G: [90, 70, 45] }, it.colors);
  ART[it.art].forEach((row, y) => [...row].forEach((ch, x) => {
    const col = pal[ch];
    if (!col) return;
    ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
    ctx.fillRect(x, y, 1, 1);
  }));
  it.canvas = c;
  return c;
}

// блоки: 1..99 и 200..1023 (100..199 — предметы)
const isBlockId = id => id > 0 && (id < 100 || (id >= 200 && id < 1024));
const itemName = id => (isBlockId(id) ? BLOCKS[id].name : ITEMS[id] ? ITEMS[id].name : '');
const maxStack = id => {
  const it = ITEMS[id];
  return it && (it.tool || it.car || it.plane || it.train || it.lighter || it.minecart || it.phone || it.physgun || it.shrinker || it.wand || it.monitor || it.bucket === 'water' || it.bucket === 'lava') ? 1 : (it && (it.bucket || it.snowball)) ? 16 : 64;
};
function itemIcon(id) {
  if (!id) return '';
  if (isBlockId(id)) return blockIcon(id);
  const it = ITEMS[id];
  if (!it.icon) {
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(itemCanvas(id), 0, 0, 48, 48);
    it.icon = c.toDataURL();
  }
  return it.icon;
}

// ---------- Добыча: сколько секунд ломать руками, какая кирка нужна, что выпадает ----------
const MINE = {
  [B.SNOW_BLOCK]: { t: 0.5, drop: ITEM.SNOWBALL, n: [4, 4] }, [B.SNOW_LAYER]: { t: 0.1, drop: ITEM.SNOWBALL, n: [1, 1] },
  [B.TORCH]: { t: 0.05 },
  ...Object.fromEntries([B.TRAPDOOR, B.IRON_TRAPDOOR, B.MANHOLE].flatMap((id, i) => Array.from({ length: 8 }, (_, k) => [id + k, i ? { t: 2.5, pick: 0, drop: id } : { t: 1, drop: id }]))),
  ...Object.fromEntries([0, 1, 2, 3, 4].map(i => [B.CORAL_RED + i, { t: 1.2, pick: 0 }])),
  ...Object.fromEntries([0, 1, 2, 3].map(k => [B.SHOWER_TOP + k, { t: 0.8, drop: B.SHOWER }])),
  [B.CHEST]: { t: 1.5 }, [B.FURNACE]: { t: 2.5, pick: 0 }, [B.FURNACE_LIT]: { t: 2.5, pick: 0, drop: B.FURNACE },
  [B.GRASS]: { t: 0.6, drop: B.DIRT, bonus: [[ITEM.WHEAT, 0.1], [ITEM.CARROT, 0.04]] },
  [B.STONE_BRICKS]: { t: 1.5, pick: 0 }, [B.SANDSTONE]: { t: 1, pick: 0 }, [B.MARBLE]: { t: 1.5, pick: 0 },
  [B.GRAVEL]: { t: 0.6 }, [B.CLAY]: { t: 0.6 }, [B.HAY]: { t: 0.5 }, [B.PUMPKIN]: { t: 1 },
  [B.MELON]: { t: 1, drop: ITEM.MELON_SLICE, n: [3, 5] },
  [B.DARK_PLANKS]: { t: 1.5 }, [B.BIRCH_PLANKS]: { t: 1.5 }, [B.ICE]: { t: 0.5 },
  [B.IRON_BLOCK]: { t: 4, pick: 1 }, [B.GOLD_BLOCK]: { t: 4, pick: 2 }, [B.DIAMOND_BLOCK]: { t: 4, pick: 2 }, [B.COAL_BLOCK]: { t: 3, pick: 0 },
  [B.WHEAT_CROP]: { t: 0.1, drop: ITEM.WHEAT, n: [1, 2] },
  [B.GLASS_RED]: { t: 0.4 }, [B.GLASS_BLUE]: { t: 0.4 }, [B.DIRT]: { t: 0.5 }, [B.SAND]: { t: 0.5 }, [B.SNOW]: { t: 0.5 },
  [B.PATH]: { t: 0.5, drop: B.DIRT },
  [B.LEAVES]: { t: 0.3, chance: 0.5, bonus: [[ITEM.APPLE, 0.08]] }, [B.GLASS]: { t: 0.4 }, [B.LAMP]: { t: 0.4 }, [B.CACTUS]: { t: 0.4 },
  [B.LOG]: { t: 1.5 }, [B.PLANKS]: { t: 1.5 }, [B.BOOKSHELF]: { t: 1.2 }, [B.CRAFTING_TABLE]: { t: 1.2 },
  [B.STONE]: { t: 1.5, pick: 0, drop: B.COBBLE }, [B.CONCRETE]: { t: 1.8, pick: 0 }, [B.COBBLE]: { t: 2, pick: 0 }, [B.BRICK]: { t: 2, pick: 0 },
  [B.COAL]: { t: 2.5, pick: 0, drop: ITEM.COAL }, [B.IRON]: { t: 3, pick: 1 },
  [B.GOLD]: { t: 3, pick: 2 }, [B.DIAMOND]: { t: 3.5, pick: 2, drop: ITEM.DIAMOND },
  [B.EMERALD]: { t: 3.5, pick: 2, drop: ITEM.EMERALD_GEM },
  [B.OBSIDIAN]: { t: 12, pick: 3 }, [B.DYNAMITE]: { t: 0.1 },
  ...Object.fromEntries(Array.from({ length: 16 }, (_, k) => [B.DOOR + k, { t: 1, drop: B.DOOR }])), [B.EMERALD_BLOCK]: { t: 4, pick: 2 },
  [B.BEDROCK]: { t: Infinity }, [B.WATER]: { t: Infinity },
};
const mineInfo = id => MINE[id] || (BLOCKS[id] && MINE[BLOCKS[id].base]) || (id >= B.CONCRETE_WHITE && id <= B.CONCRETE_PINK ? { t: 1.8, pick: 0 } : { t: BLOCKS[id] && BLOCKS[id].boxes ? 0.5 : 0.8 });
// какой инструмент ускоряет добычу блока (кроме камня — для него кирка)
const toolKindFor = id => (BLOCKS[id].sound === 'wood' ? 'axe' : BLOCKS[id].sound === 'soft' ? 'shovel' : null);
const PICK_NAMES = ['деревянная', 'каменная', 'железная', 'алмазная'];

// ---------- Рецепты крафта ----------
// hand: можно сделать прямо в инвентаре; остальное — только на верстаке.
// mod: рецепт появляется, только когда установлен этот мод.
// Печка: что во что переплавляется и сколько секунд горит топливо
const SMELT = {
  [B.IRON]: ITEM.IRON, [B.GOLD]: ITEM.GOLD, [B.SAND]: B.GLASS, [B.COBBLE]: B.STONE, [B.CLAY]: B.BRICK, [B.LOG]: ITEM.COAL,
  [B.STONE]: B.STONE_BRICKS, [B.SNOW]: B.ICE,
  [ITEM.MEAT]: ITEM.STEAK, [ITEM.PORK]: ITEM.COOKED_PORK, [ITEM.MUTTON]: ITEM.COOKED_MUTTON, [ITEM.CHICKEN_MEAT]: ITEM.COOKED_CHICKEN,
};
const FUEL = {
  [ITEM.COAL]: 80, [B.COAL_BLOCK]: 720, [B.LOG]: 15, [B.PLANKS]: 15, [B.DARK_PLANKS]: 15, [B.BIRCH_PLANKS]: 15,
  [ITEM.STICK]: 5, [B.CRAFTING_TABLE]: 15, [B.BOOKSHELF]: 15, [B.CHEST]: 15, [B.HAY]: 20,
};
const SMELT_TIME = 5;

const RECIPES = [
  { out: [B.PLANKS, 4], in: [[B.LOG, 1]], hand: true },
  { out: [ITEM.STICK, 4], in: [[B.PLANKS, 2]], hand: true },
  { out: [B.CRAFTING_TABLE, 1], in: [[B.PLANKS, 4]], hand: true },
  { out: [B.CHEST, 1], in: [[B.PLANKS, 8]] },
  { out: [B.TORCH, 4], in: [[ITEM.STICK, 1], [ITEM.COAL, 1]], hand: true },
  { out: [ITEM.BUCKET, 1], in: [[ITEM.IRON, 3]] },
  { out: [B.SNOW_BLOCK, 1], in: [[ITEM.SNOWBALL, 4]], hand: true },
  { out: [B.SNOW_LAYER, 6], in: [[B.SNOW_BLOCK, 3]], hand: true },
  { out: [ITEM.REAL_SEDAN, 1], in: [[ITEM.IRON, 6], [ITEM.COAL, 3], [B.GLASS, 2]], mod: 'realtransport' },
  { out: [ITEM.REAL_BUS, 1], in: [[ITEM.IRON, 12], [ITEM.COAL, 4], [B.GLASS, 6]], mod: 'realtransport' },
  { out: [ITEM.REAL_BOAT, 1], in: [[ITEM.IRON, 4], [B.PLANKS, 6], [B.GLASS, 1]], mod: 'realtransport' },
  { out: [B.TRAPDOOR, 2], in: [[B.PLANKS, 6]], hand: true },
  { out: [B.CAMERA, 1], in: [[ITEM.IRON, 2], [B.GLASS, 1], [B.WOOL_BLACK, 1]], mod: 'cameras' },
  { out: [ITEM.MONITOR, 1], in: [[ITEM.IRON, 2], [B.GLASS, 2], [ITEM.GOLD, 1]], mod: 'cameras' },
  { out: [B.IRON_TRAPDOOR, 1], in: [[ITEM.IRON, 4]] },
  { out: [B.MANHOLE, 1], in: [[ITEM.IRON, 6]] },
  { out: [B.FURNACE, 1], in: [[B.COBBLE, 8]] },
  { out: [B.WOOL_WHITE, 1], in: [[B.LEAVES, 4]], hand: true },
  { out: [ITEM.WOOD_PICK, 1], in: [[B.PLANKS, 3], [ITEM.STICK, 2]] },
  { out: [ITEM.WOOD_SWORD, 1], in: [[B.PLANKS, 2], [ITEM.STICK, 1]] },
  { out: [ITEM.STONE_PICK, 1], in: [[B.COBBLE, 3], [ITEM.STICK, 2]] },
  { out: [ITEM.STONE_SWORD, 1], in: [[B.COBBLE, 2], [ITEM.STICK, 1]] },
  { out: [ITEM.IRON_PICK, 1], in: [[ITEM.IRON, 3], [ITEM.STICK, 2]] },
  { out: [ITEM.IRON_SWORD, 1], in: [[ITEM.IRON, 2], [ITEM.STICK, 1]] },
  { out: [ITEM.WOOD_AXE, 1], in: [[B.PLANKS, 3], [ITEM.STICK, 2]] },
  { out: [ITEM.STONE_AXE, 1], in: [[B.COBBLE, 3], [ITEM.STICK, 2]] },
  { out: [ITEM.IRON_AXE, 1], in: [[ITEM.IRON, 3], [ITEM.STICK, 2]] },
  { out: [ITEM.DIAMOND_AXE, 1], in: [[ITEM.DIAMOND, 3], [ITEM.STICK, 2]] },
  { out: [ITEM.WOOD_SHOVEL, 1], in: [[B.PLANKS, 1], [ITEM.STICK, 2]] },
  { out: [ITEM.STONE_SHOVEL, 1], in: [[B.COBBLE, 1], [ITEM.STICK, 2]] },
  { out: [ITEM.IRON_SHOVEL, 1], in: [[ITEM.IRON, 1], [ITEM.STICK, 2]] },
  { out: [ITEM.DIAMOND_SHOVEL, 1], in: [[ITEM.DIAMOND, 1], [ITEM.STICK, 2]] },
  { out: [ITEM.DIAMOND_PICK, 1], in: [[ITEM.DIAMOND, 3], [ITEM.STICK, 2]] },
  { out: [ITEM.DIAMOND_SWORD, 1], in: [[ITEM.DIAMOND, 2], [ITEM.STICK, 1]] },
  { out: [B.STONE, 4], in: [[B.COBBLE, 4], [ITEM.COAL, 1]] },
  { out: [B.GLASS, 4], in: [[B.SAND, 4], [ITEM.COAL, 1]] },
  { out: [B.BRICK, 4], in: [[B.DIRT, 4], [ITEM.COAL, 1]] },
  { out: [B.LAMP, 1], in: [[B.GLASS, 1], [ITEM.COAL, 2]] },
  { out: [B.BOOKSHELF, 1], in: [[B.PLANKS, 6]] },
  { out: [B.PATH, 4], in: [[B.DIRT, 4], [B.SAND, 1]] },
  { out: [B.CONCRETE, 4], in: [[B.COBBLE, 2], [B.SAND, 2]] },
  { out: [B.RAIL, 16], in: [[ITEM.IRON, 6], [ITEM.STICK, 1]] },
  { out: [B.DOOR, 1], in: [[B.PLANKS, 6], [B.GLASS, 1]], hand: true },
  // мод «Ванная и туалет»
  { out: [B.TOILET, 1], in: [[B.CONCRETE_WHITE, 3], [ITEM.IRON, 1]], mod: 'bath' },
  { out: [B.SINK, 1], in: [[B.CONCRETE_WHITE, 2], [ITEM.IRON, 1]], mod: 'bath' },
  { out: [B.BATHTUB, 1], in: [[B.CONCRETE_WHITE, 5]], mod: 'bath' },
  { out: [B.SHOWER, 1], in: [[B.GLASS, 3], [B.CONCRETE_WHITE, 1], [ITEM.IRON, 1]], mod: 'bath' },
  { out: [B.WASHER, 1], in: [[ITEM.IRON, 3], [B.GLASS, 1]], mod: 'bath' },
  { out: [B.MIRROR, 1], in: [[B.GLASS, 1], [ITEM.IRON, 1]], mod: 'bath' },
  // мод «Телефон»
  { out: [ITEM.PHYSGUN, 1], in: [[ITEM.DIAMOND, 2], [ITEM.IRON, 3], [B.GLASS, 1]], mod: 'physgun' },
  { out: [ITEM.SHRINKER, 1], in: [[ITEM.IRON, 2], [ITEM.DIAMOND, 1], [B.GLASS, 1]], mod: 'mini' },
  { out: [ITEM.PHONE, 1], in: [[ITEM.IRON, 2], [B.GLASS, 2], [ITEM.GOLD, 1]], mod: 'phone' },
  { out: [B.CHARGER, 1], in: [[ITEM.IRON, 1], [ITEM.COAL, 1], [B.CONCRETE_WHITE, 1]], mod: 'phone' },
  { out: [B.ROUTER, 1], in: [[ITEM.IRON, 1], [B.WOOL_BLACK, 1], [B.LAMP, 1]], mod: 'phone' },
  // мод «Лифт»
  { out: [B.LIFT_BUTTON, 2], in: [[ITEM.IRON, 1], [B.LAMP, 1]], mod: 'lift' },
  { out: [B.ELEVATOR_WALL, 4], in: [[ITEM.IRON, 2]], mod: 'lift' },
  // кухня
  { out: [B.KITCHEN, 1], in: [[B.BIRCH_PLANKS, 3], [B.MARBLE, 1]], mod: 'interior' },
  { out: [B.STOVE, 1], in: [[ITEM.IRON, 3], [ITEM.COAL, 2]], mod: 'interior' },
  { out: [ITEM.MINECART, 1], in: [[ITEM.IRON, 5]] },
  { out: [B.DYNAMITE, 1], in: [[B.SAND, 4], [ITEM.COAL, 4]] },
  { out: [ITEM.LIGHTER, 1], in: [[ITEM.IRON, 1], [ITEM.COAL, 1]] },
  { out: [B.BED, 1], in: [[B.PLANKS, 3], [B.WOOL_RED, 2], [B.WOOL_WHITE, 1]] },
  { out: [ITEM.BREAD, 1], in: [[ITEM.WHEAT, 3]], hand: true },
  { out: [ITEM.COOKIE, 4], in: [[ITEM.WHEAT, 2], [ITEM.EGG, 1]] },
  { out: [ITEM.CAKE, 1], in: [[ITEM.WHEAT, 3], [ITEM.EGG, 2], [ITEM.APPLE, 1]] },
  { out: [ITEM.PIE, 1], in: [[B.PUMPKIN, 1], [ITEM.EGG, 1]] },
  { out: [B.HAY, 1], in: [[ITEM.WHEAT, 9]] },
  { out: [ITEM.WHEAT, 9], in: [[B.HAY, 1]], hand: true },
  { out: [B.STONE_BRICKS, 4], in: [[B.STONE, 4]] },
  { out: [B.SANDSTONE, 1], in: [[B.SAND, 4]] },
  { out: [B.MARBLE, 2], in: [[B.STONE, 2], [B.WOOL_WHITE, 1]] },
  { out: [B.DARK_PLANKS, 4], in: [[B.PLANKS, 4], [ITEM.COAL, 1]] },
  { out: [B.BIRCH_PLANKS, 4], in: [[B.PLANKS, 4], [B.SAND, 1]] },
  { out: [B.BRICK, 4], in: [[B.CLAY, 4], [ITEM.COAL, 1]] },
  { out: [B.ICE, 1], in: [[B.SNOW, 4]] },
  { out: [B.IRON_BLOCK, 1], in: [[ITEM.IRON, 9]] },
  { out: [B.GOLD_BLOCK, 1], in: [[ITEM.GOLD, 9]] },
  { out: [B.DIAMOND_BLOCK, 1], in: [[ITEM.DIAMOND, 9]] },
  { out: [B.EMERALD_BLOCK, 1], in: [[ITEM.EMERALD_GEM, 9]] },
  { out: [B.COAL_BLOCK, 1], in: [[ITEM.COAL, 9]] },
  { out: [B.GLASS_RED, 4], in: [[B.GLASS, 4], [B.WOOL_RED, 1]] },
  { out: [B.GLASS_BLUE, 4], in: [[B.GLASS, 4], [B.WOOL_BLUE, 1]] },
  { out: [B.CONCRETE_WHITE, 4], in: [[B.CONCRETE, 4], [B.WOOL_WHITE, 1]] },
  { out: [B.CONCRETE_BLACK, 4], in: [[B.CONCRETE, 4], [B.WOOL_BLACK, 1]] },
  { out: [B.CONCRETE_RED, 4], in: [[B.CONCRETE, 4], [B.WOOL_RED, 1]] },
  { out: [B.CONCRETE_BLUE, 4], in: [[B.CONCRETE, 4], [B.WOOL_BLUE, 1]] },
  { out: [B.CONCRETE_GREEN, 4], in: [[B.CONCRETE, 4], [B.WOOL_GREEN, 1]] },
  { out: [B.CONCRETE_YELLOW, 4], in: [[B.CONCRETE, 4], [B.WOOL_YELLOW, 1]] },
  { out: [B.CONCRETE_PINK, 4], in: [[B.CONCRETE, 4], [B.WOOL_RED, 1], [B.WOOL_WHITE, 1]] },
  { out: [B.WOOL_BLACK, 1], in: [[B.WOOL_WHITE, 1], [ITEM.COAL, 1]] },
  { out: [B.WOOL_GREEN, 1], in: [[B.WOOL_WHITE, 1], [B.CACTUS, 1]] },
  { out: [B.WOOL_YELLOW, 2], in: [[B.WOOL_WHITE, 2], [B.SAND, 1]] },
  { out: [B.WOOL_RED, 2], in: [[B.WOOL_WHITE, 2], [B.BRICK, 1]] },
  { out: [B.WOOL_BLUE, 2], in: [[B.WOOL_WHITE, 2], [B.GLASS, 1]] },
  { out: [B.WOOL_ORANGE, 2], in: [[B.WOOL_RED, 1], [B.WOOL_YELLOW, 1]] },
  { out: [B.WOOL_PURPLE, 2], in: [[B.WOOL_RED, 1], [B.WOOL_BLUE, 1]] },
  // мод «Уютный дом»
  { out: [B.CHAIR, 1], in: [[B.PLANKS, 3], [ITEM.STICK, 2]], mod: 'interior' },
  { out: [B.TABLE, 1], in: [[B.PLANKS, 3], [ITEM.STICK, 4]], mod: 'interior' },
  { out: [B.SOFA, 1], in: [[B.WOOL_RED, 3], [B.PLANKS, 2]], mod: 'interior' },
  { out: [B.FRIDGE, 1], in: [[ITEM.IRON, 4], [B.CONCRETE_WHITE, 2]], mod: 'interior' },
  { out: [B.WARDROBE, 1], in: [[B.DARK_PLANKS, 6], [ITEM.STICK, 1]], mod: 'interior' },
  // мод «Компьютер»
  { out: [B.COMPUTER, 1], in: [[ITEM.IRON, 2], [B.GLASS, 2], [ITEM.COAL, 1], [B.WOOL_BLACK, 1]], mod: 'computer' },
  { out: [B.TV, 1], in: [[B.WOOL_BLACK, 2], [B.GLASS, 1], [ITEM.IRON, 1]], mod: 'interior' },
  { out: [B.CARPET, 4], in: [[B.WOOL_RED, 1], [B.WOOL_WHITE, 1]], mod: 'interior' },
  { out: [B.FLOWER_POT, 1], in: [[B.BRICK, 1], [B.LEAVES, 1]], mod: 'interior' },
  { out: [B.FLOOR_LAMP, 1], in: [[ITEM.STICK, 2], [B.LAMP, 1]], mod: 'interior' },
  // мод «Машины»
  { out: [ITEM.CAR_RED, 1], in: [[ITEM.IRON, 4], [ITEM.COAL, 2], [B.WOOL_RED, 1]], mod: 'cars' },
  { out: [ITEM.CAR_BLUE, 1], in: [[ITEM.IRON, 4], [ITEM.COAL, 2], [B.WOOL_BLUE, 1]], mod: 'cars' },
  { out: [ITEM.CAR_YELLOW, 1], in: [[ITEM.IRON, 4], [ITEM.COAL, 2], [B.WOOL_YELLOW, 1]], mod: 'cars' },
  { out: [ITEM.CAR_WHITE, 1], in: [[ITEM.IRON, 4], [ITEM.COAL, 2], [B.WOOL_WHITE, 1]], mod: 'cars' },
  { out: [ITEM.CAR_BLACK, 1], in: [[ITEM.IRON, 4], [ITEM.COAL, 2], [B.WOOL_BLACK, 1]], mod: 'cars' },
  // мод «Метро»

  { out: [ITEM.METRO_TRAIN, 1], in: [[ITEM.IRON, 12], [B.GLASS, 4], [B.WOOL_RED, 2], [ITEM.COAL, 4]], mod: 'metro' },
  { out: [B.METRO_TILE, 4], in: [[B.CONCRETE_WHITE, 4]], mod: 'metro' },
  { out: [B.METRO_SIGN, 1], in: [[B.CONCRETE_BLUE, 1], [B.WOOL_WHITE, 1]], mod: 'metro' },
  // мод «Самолёты»
  { out: [ITEM.PLANE_RED, 1], in: [[ITEM.IRON, 6], [ITEM.COAL, 3], [B.GLASS, 1], [B.WOOL_RED, 1]], mod: 'planes' },
  { out: [ITEM.PLANE_BLUE, 1], in: [[ITEM.IRON, 6], [ITEM.COAL, 3], [B.GLASS, 1], [B.WOOL_BLUE, 1]], mod: 'planes' },
  { out: [ITEM.PLANE_YELLOW, 1], in: [[ITEM.IRON, 6], [ITEM.COAL, 3], [B.GLASS, 1], [B.WOOL_YELLOW, 1]], mod: 'planes' },
  { out: [ITEM.BOEING, 1], in: [[ITEM.IRON, 16], [ITEM.COAL, 8], [B.GLASS, 6], [B.WOOL_WHITE, 4]], mod: 'planes' },
];

// ---------- Мебель: грани коробочек, повёрнутые в нужную сторону ----------
// Для каждого блока с boxes готовим список четырёхугольников: позиции (0..1), uv, тень, нормаль.
(function buildBoxQuads() {
  const SHADE = { x: 0.8, y1: 1, y0: 0.55, z: 0.68 };
  const shadeOf = d => d[1] > 0 ? SHADE.y1 : d[1] < 0 ? SHADE.y0 : d[0] ? SHADE.x : SHADE.z;
  // для каждой грани куба: какая ось идёт вдоль u и v и перевёрнута ли она
  const axes = FACES.map(f => {
    const pick = k => {
      const c0 = f.corners.find(c => c[k] === 0), c1 = f.corners.find(c => c[k] === 1);
      for (let a = 0; a < 3; a++) {
        if (f.dir[a] !== 0) continue;
        if (f.corners.every(c => c[a] === (c[k] === 1 ? c1[a] : c0[a]))) return { a, flip: c1[a] === 0 };
      }
    };
    return { u: pick(3), v: pick(4) };
  });
  const rot = (x, z, f) => { for (let i = 0; i < f; i++) { const t = x; x = z; z = 16 - t; } return [x, z]; };
  const rotDir = (d, f) => { let [x, , z] = d; for (let i = 0; i < f; i++) { const t = x; x = z; z = -t; } return [x, d[1], z]; };
  for (const b of BLOCKS) {
    if (!b || !b.boxes) continue;
    b.quads = [];
    for (const bx of b.boxes) {
      const lo = [bx[0], bx[1], bx[2]], hi = [bx[3], bx[4], bx[5]];
      FACES.forEach((f, fi) => {
        const tile = T[(f.dir[2] === 1 && bx[7]) ? bx[7] : bx[6]];
        const ax = axes[fi];
        const pos = [], uv = [];
        for (const c of f.corners) {
          const p = [c[0] ? hi[0] : lo[0], c[1] ? hi[1] : lo[1], c[2] ? hi[2] : lo[2]];
          let u = p[ax.u.a] / 16, v = p[ax.v.a] / 16;
          if (ax.u.flip) u = 1 - u;
          if (ax.v.flip) v = 1 - v;
          uv.push(...tileUV(tile, u, v));
          const [rx, rz] = rot(p[0], p[2], b.facing);
          pos.push(rx / 16, p[1] / 16, rz / 16);
        }
        const dir = rotDir(f.dir, b.facing);
        b.quads.push({ pos, uv, dir, shade: shadeOf(dir) });
      });
    }
  }
})();

// Иконка мебели: рисуем видимые грани коробочек в изометрии
function boxIcon(id) {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const P = (x, y, z) => [24 + 20 * (x - z), 24 + 11 * (x + z) - 22 * y];
  const AW = ATLAS.canvas.width, AH = ATLAS.canvas.height;
  const quads = BLOCKS[id].quads
    .filter(q => q.dir[0] + q.dir[1] + q.dir[2] > 0)
    .map(q => {
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 4; k++) { cx += q.pos[k * 3]; cy += q.pos[k * 3 + 1]; cz += q.pos[k * 3 + 2]; }
      return { q, depth: cx + cy + cz };
    })
    .sort((a, b) => a.depth - b.depth);
  for (const { q } of quads) {
    const s = [0, 1, 2].map(k => [q.uv[k * 2] * AW, (1 - q.uv[k * 2 + 1]) * AH]);
    const d = [0, 1, 2].map(k => P(q.pos[k * 3], q.pos[k * 3 + 1], q.pos[k * 3 + 2]));
    const s1 = [s[1][0] - s[0][0], s[1][1] - s[0][1]], s2 = [s[2][0] - s[0][0], s[2][1] - s[0][1]];
    const d1 = [d[1][0] - d[0][0], d[1][1] - d[0][1]], d2 = [d[2][0] - d[0][0], d[2][1] - d[0][1]];
    const det = s1[0] * s2[1] - s2[0] * s1[1];
    if (Math.abs(det) < 1e-6) continue;
    const i00 = s2[1] / det, i01 = -s2[0] / det, i10 = -s1[1] / det, i11 = s1[0] / det;
    const a = d1[0] * i00 + d2[0] * i10, cc = d1[0] * i01 + d2[0] * i11;
    const b = d1[1] * i00 + d2[1] * i10, dd = d1[1] * i01 + d2[1] * i11;
    const e = d[0][0] - (a * s[0][0] + cc * s[0][1]), f = d[0][1] - (b * s[0][0] + dd * s[0][1]);
    const xs = [0, 1, 2, 3].map(k => q.uv[k * 2] * AW), ys = [0, 1, 2, 3].map(k => (1 - q.uv[k * 2 + 1]) * AH);
    const sx = Math.min(...xs), sy = Math.min(...ys), sw = Math.max(...xs) - sx, sh = Math.max(...ys) - sy;
    ctx.setTransform(a, b, cc, dd, e, f);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(ATLAS.canvas, sx, sy, sw, sh, sx, sy, sw, sh);
    if (q.shade < 1) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(0,0,0,${(1 - q.shade) * 0.8})`;
      ctx.fillRect(sx, sy, sw, sh);
    }
  }
  return c.toDataURL();
}
