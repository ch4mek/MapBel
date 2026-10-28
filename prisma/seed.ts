// Воспроизводимый seed (раздел 16 ТЗ): игровые зоны — 6 областей Беларуси
// (контуры сняты с административной карты, см. prisma/oblasts.geo.json) и
// Минск как отдельная зона, 58 мест разных категорий, достижения,
// демо-юзеры, события. ВСЕ игровые сущности помечены isDemo и не претендуют
// на полный туристический каталог страны. Запуск: npm run db:seed

import "dotenv/config";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { ACHIEVEMENTS } from "../src/config/game";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

type Category =
  | "HISTORIC"
  | "MUSEUM"
  | "CASTLE"
  | "NATURE"
  | "ECOTRAIL"
  | "GASTRO"
  | "UNUSUAL";

interface SeedPlace {
  slug: string;
  name: string;
  category: Category;
  description: string;
  lat: number;
  lon: number;
  checkpointLat?: number;
  checkpointLon?: number;
  radiusM?: number;
  demo?: boolean;
  goldRequired?: boolean;
}

interface GeoFile {
  oblasts: Record<
    string,
    {
      geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
      center: [number, number];
    }
  >;
  minskRing: number[][];
  minskCenter: [number, number];
}

const geo = JSON.parse(
  fs.readFileSync(new URL("./oblasts.geo.json", import.meta.url), "utf8"),
) as GeoFile;

interface SeedZone {
  slug: string;
  name: string;
  description: string;
  /** MultiPolygon координаты; для Минска — одиночное кольцо */
  rings?: number[][][][];
  ring?: number[][];
  centerLat: number;
  centerLon: number;
  silverThreshold: number;
  goldMinCount: number;
  places: SeedPlace[];
}

const OSM_LICENSE = "© OpenStreetMap contributors (ODbL); координаты округлены";
const DEMO_LICENSE = "Демонстрационные данные MapBel (учебный проект)";

const ZONES: SeedZone[] = [
  // ===================== МИНСК =====================
  {
    slug: "minsk",
    name: "Минск",
    description:
      "Столица: Верхний город и Троицкое предместье, проспект Независимости, парки и набережные Свислочи. Границы зоны — городская черта.",
    ring: geo.minskRing,
    centerLat: geo.minskCenter[0],
    centerLon: geo.minskCenter[1],
    silverThreshold: 5,
    goldMinCount: 6,
    places: [
      {
        slug: "minsk-ratusha",
        name: "Минская ратуша",
        category: "HISTORIC",
        description:
          "Ратуша на площади Свободы, символ магдебургского права Минска. Современное здание отстроено в стиле классицизма; внутри работает музей «Мінскі гарадзкі ратуш».",
        lat: 53.9045,
        lon: 27.5575,
        goldRequired: true,
      },
      {
        slug: "minsk-duhovskoy-sobor",
        name: "Кафедральный собор Сошествия Святого Духа",
        category: "HISTORIC",
        description:
          "Православный кафедральный собор в бывшем бернардинском костёле XVII века. Здесь хранится Минское Евангелие и мощи святой Софии Слуцкой.",
        lat: 53.9028,
        lon: 27.5565,
      },
      {
        slug: "minsk-troitskoye",
        name: "Троицкое предместье",
        category: "HISTORIC",
        description:
          "Исторический квартал на левом берегу Свислочи со зданиями XVI–XX веков, старейший район города. Отсюда начиналась дорога на Троицу.",
        lat: 53.9058,
        lon: 27.5625,
        goldRequired: true,
      },
      {
        slug: "minsk-ostrov-slyoz",
        name: "Остров слёз",
        category: "HISTORIC",
        description:
          "Искусственный остров на Свислочи с часовней-памятником воинам, погибшим в Афганистане (1996). Одна из самых трогательных точек центра.",
        lat: 53.9065,
        lon: 27.5632,
      },
      {
        slug: "minsk-teatr-kupaly",
        name: "Театр имени Янки Купалы",
        category: "HISTORIC",
        description:
          "Старейший театр Беларуси (1890), здание напротив Александровского сквера. В годы войны здесь выступал фронтовой театр.",
        lat: 53.9062,
        lon: 27.5588,
      },
      {
        slug: "minsk-teatr-operu",
        name: "Большой театр оперы и балета",
        category: "HISTORIC",
        description:
          "Национальный академический Большой театр оперы и балета (1933–1939) в парке у Свислочи — один из символов белорусской культуры.",
        lat: 53.9087,
        lon: 27.5625,
        goldRequired: true,
      },
      {
        slug: "minsk-hudozhestvenny-muzey",
        name: "Национальный художественный музей",
        category: "MUSEUM",
        description:
          "Крупнейшее художественное собрание страны: от древней иконописи до белорусского авангарда XX века.",
        lat: 53.9014,
        lon: 27.5618,
      },
      {
        slug: "minsk-istoricheskiy-muzey",
        name: "Национальный исторический музей",
        category: "MUSEUM",
        description:
          "Крупнейший исторический музей страны: археология, нумизматика, этнография Беларуси.",
        lat: 53.9017,
        lon: 27.5608,
      },
      {
        slug: "minsk-dom-vankovich",
        name: "Дом Ваньковичей",
        category: "MUSEUM",
        description:
          "Усадебный дом XIX века, где бывал Адам Мицкевич. Музей Валентия Ваньковича, памятник усадебной архитектуры в центре города.",
        lat: 53.9022,
        lon: 27.5577,
      },
      {
        slug: "minsk-vasilki",
        name: "«Васильки» на Немиге (демо-точка)",
        category: "GASTRO",
        description:
          "Сеть кафе белорусской кухни: драники, мачанка, крамбамбуля. Демонстрационная гастрономическая точка.",
        lat: 53.9028,
        lon: 27.5543,
        demo: true,
      },
      {
        slug: "minsk-krasny-kostel",
        name: "Красный костёл (костёл Святых Симеона и Елены)",
        category: "HISTORIC",
        description:
          "Неоготический костёл начала XX века из красного кирпича на площади Независимости, памятник в честь Симона и Елены Воловичей.",
        lat: 53.8953,
        lon: 27.548,
        goldRequired: true,
      },
      {
        slug: "minsk-vokzal-vorota",
        name: "«Ворота Минска»",
        category: "HISTORIC",
        description:
          "Парные башни у железнодорожного вокзала (1952) с часами и скульптурами. Отсюда гости города традиционно начинают знакомство с Минском.",
        lat: 53.8958,
        lon: 27.5502,
      },
      {
        slug: "minsk-bgu-main",
        name: "Главный корпус БГУ",
        category: "HISTORIC",
        description:
          "Памятник сталинской архитектуры (1955) с колоннадой и парком. Символ старейшего университета страны.",
        lat: 53.893,
        lon: 27.544,
      },
      {
        slug: "minsk-muzey-vody",
        name: "Музей воды",
        category: "MUSEUM",
        description:
          "Старинная водонапорная башня с экспозицией городского водоканала: спуск в подземные галереи и история минского водопровода.",
        lat: 53.8973,
        lon: 27.551,
      },
      {
        slug: "minsk-pobedy-monument",
        name: "Монумент Победы",
        category: "HISTORIC",
        description:
          "Обелиск на площади Победы (1954) с Вечным огнём и мозаичными мемориальными залами. Один из главных памятников города.",
        lat: 53.9087,
        lon: 27.5752,
        goldRequired: true,
      },
      {
        slug: "minsk-muzey-vov",
        name: "Музей истории Великой Отечественной войны",
        category: "MUSEUM",
        description:
          "Современный музейный комплекс у стелы «Минск — город-герой», построенный к 70-летию Победы.",
        lat: 53.9091,
        lon: 27.573,
      },
      {
        slug: "minsk-kgb",
        name: "Здание КГБ",
        category: "UNUSUAL",
        description:
          "Фасад в стиле сталинского неоренессанса на углу проспекта Независимости и улицы Козлова — один из самых узнаваемых домов города.",
        lat: 53.9022,
        lon: 27.57,
      },
      {
        slug: "minsk-botanicheskiy-sad",
        name: "Центральный ботанический сад",
        category: "NATURE",
        description:
          "Один из старейших ботанических садов Европы (1932): оранжереи, дендрарий и пять тысяч видов растений в центре города.",
        lat: 53.903,
        lon: 27.5825,
      },
      {
        slug: "minsk-ploshchad-kolasa",
        name: "Площадь Якуба Коласа",
        category: "HISTORIC",
        description:
          "Ансамбль с памятником классику белорусской литературы и фонтанами с мальчиком и лебедем — традиционное место встреч.",
        lat: 53.9085,
        lon: 27.5656,
      },
      {
        slug: "minsk-komarovka",
        name: "Комаровский рынок",
        category: "GASTRO",
        description:
          "Главный рынок страны: клуни со сметаной, вяленая рыба, белорусские сыры. Гастрономический ритуал минчан с 1980-х.",
        lat: 53.9253,
        lon: 27.5755,
        goldRequired: true,
      },
      {
        slug: "minsk-nlb",
        name: "Национальная библиотека Беларуси",
        category: "UNUSUAL",
        description:
          "Ромбокубооктаэдр высотой 72 метра — одно из самых необычных зданий страны. Смотровая площадка на крыше.",
        lat: 53.9316,
        lon: 27.5867,
        goldRequired: true,
      },
      {
        slug: "minsk-park-chelyuskincev",
        name: "Парк Челюскинцев",
        category: "NATURE",
        description:
          "Пейзажный парк бывшей усадьбы Станкевичей с прудами и планетарием. Любимая зелёная зона севера города.",
        lat: 53.9155,
        lon: 27.587,
      },
      {
        slug: "minsk-dinamo",
        name: "Стадион «Динамо»",
        category: "HISTORIC",
        description:
          "Национальный олимпийский стадион (открыт в 1934-м), старейшая спортивная арена страны после полной реконструкции.",
        lat: 53.9034,
        lon: 27.5466,
      },
      {
        slug: "minsk-petro-pavlovskiy-sobor",
        name: "Петро-Павловский собор (Раковское предместье)",
        category: "HISTORIC",
        description:
          "Бывший бернардинский костёл середины XVII века в старинном Раковском предместье — районе ремесленников и купцов.",
        lat: 53.9078,
        lon: 27.5488,
      },
      {
        slug: "minsk-kalvariya",
        name: "Кальварийское кладбище",
        category: "HISTORIC",
        description:
          "Старейшее кладбище города (основано в XVIII веке): надгробия известных минчан и каплица на холме.",
        lat: 53.9128,
        lon: 27.52,
      },
      {
        slug: "minsk-arena",
        name: "Минск-Арена",
        category: "UNUSUAL",
        description:
          "Главная концертно-спортивная арена страны с велодромом. Вечером подсвечивается разными цветами.",
        lat: 53.9441,
        lon: 27.543,
      },
      {
        slug: "minsk-drozdy",
        name: "Парк «Дрозды»",
        category: "NATURE",
        description:
          "Парк и пляжи на водохранилище Дрозды — самое близкое к центру место, где минчане «уезжают на море».",
        lat: 53.926,
        lon: 27.5045,
      },
      {
        slug: "minsk-loshitsa",
        name: "Лошицкий парк и усадьба Прушинских",
        category: "NATURE",
        description:
          "Пейзажный парк на слиянии Свислочи и Лошицы с усадьбой XIX века. По легенде, здесь языческий бог Менка строил город.",
        lat: 53.8895,
        lon: 27.5725,
        goldRequired: true,
      },
      {
        slug: "minsk-yama",
        name: "Мемориал «Яма»",
        category: "HISTORIC",
        description:
          "Памятник жертвам Холокоста (2000) в глубоком овраге, где 2 марта 1942 года было расстреляно около 5000 узников гетто.",
        lat: 53.8958,
        lon: 27.565,
      },
      {
        slug: "minsk-oktyabrskaya",
        name: "Улица Октябрьская",
        category: "UNUSUAL",
        description:
          "Квартал бывших фабричных корпусов, ставший центром стрит-арта: крупнейшие в стране муралы, бары и гастромаркеты.",
        lat: 53.8978,
        lon: 27.5675,
      },
    ],
  },
  // ===================== БРЕСТСКАЯ ОБЛАСТЬ =====================
  {
    slug: "brestskaya-oblast",
    name: "Брестская область",
    description:
      "Юго-запад страны: Брестская крепость над Бугом, Беловежская пуща с зубрами и полесские просторы.",
    rings: geo.oblasts.brestskaya.geometry.coordinates,
    centerLat: geo.oblasts.brestskaya.center[0],
    centerLon: geo.oblasts.brestskaya.center[1],
    silverThreshold: 3,
    goldMinCount: 2,
    places: [
      {
        slug: "brest-memorial",
        name: "Мемориал «Брестская крепость-герой»",
        category: "HISTORIC",
        description:
          "Мемориальный комплекс «Героям обороны», открыт в 1971 году: Холмские ворота, монумент «Мужество», штык-обелиск.",
        lat: 52.0862,
        lon: 23.6573,
        goldRequired: true,
      },
      {
        slug: "brest-muzey-oborony",
        name: "Музей обороны Брестской крепости",
        category: "MUSEUM",
        description:
          "Музей в казарме у Холмских ворот, посвящён обороне крепости в июне 1941 года.",
        lat: 52.0873,
        lon: 23.6565,
      },
      {
        slug: "pushcha-muzey-prirody",
        name: "Музей природы (Беловежская пуща)",
        category: "MUSEUM",
        description:
          "Музей у визит-центра Каменюки: чучела и экспозиции, посвящённые флоре и фауне пущи.",
        lat: 52.588,
        lon: 23.856,
        goldRequired: true,
      },
      {
        slug: "pushcha-ekotropa",
        name: "Экотропа «В долине реки Правая Лесная»",
        category: "ECOTRAIL",
        description:
          "Маршрут от визит-центра Каменюки вдоль лесной долины. Подтверждение — у входа на тропу (контрольная точка), прохождение всего маршрута необязательно.",
        lat: 52.5867,
        lon: 23.853,
        checkpointLat: 52.5871,
        checkpointLon: 23.8524,
      },
      {
        slug: "pushcha-volery",
        name: "Вольеры с зубрами",
        category: "NATURE",
        description:
          "Экспозиция вольеров с зубрами, оленями и другими животными пущи рядом с музеем природы.",
        lat: 52.598,
        lon: 23.848,
      },
      {
        slug: "pushcha-birdpoint",
        name: "Пункт наблюдения за птицами (демо)",
        category: "NATURE",
        description:
          "Демонстрационная точка для наблюдения за лесными птицами на опушке у экотропы.",
        lat: 52.5848,
        lon: 23.8602,
        demo: true,
      },
    ],
  },
  // ===================== ВИТЕБСКАЯ ОБЛАСТЬ =====================
  {
    slug: "vitebskaya-oblast",
    name: "Витебская область",
    description:
      "Белорусское Поозерье: Браславские озёра с грядами холмов, Полоцк с Софийским собором и Витебск Марка Шагала.",
    rings: geo.oblasts.vitebskaya.geometry.coordinates,
    centerLat: geo.oblasts.vitebskaya.center[0],
    centerLon: geo.oblasts.vitebskaya.center[1],
    silverThreshold: 3,
    goldMinCount: 3,
    places: [
      {
        slug: "braslav-ekotropa-drivyaty",
        name: "Экотропа вокруг озера Дривяты",
        category: "ECOTRAIL",
        description:
          "Пешеходный маршрут по берегу Дривят от Браслава. Подтверждение — контрольная точка у городского причала.",
        lat: 55.357,
        lon: 26.858,
        goldRequired: true,
      },
      {
        slug: "braslav-gora-mayak",
        name: "Гора Маяк",
        category: "NATURE",
        description:
          "Высшая точка Браславской гряды (~174 м) со смотровой площадкой на озёрный край.",
        lat: 55.398,
        lon: 26.898,
        goldRequired: true,
      },
      {
        slug: "braslav-remyosel",
        name: "Музей ремёсел и ткачества (демо)",
        category: "MUSEUM",
        description:
          "Демонстрационная музейная точка в Браславе, посвящённая традиционным промыслам Поозерья.",
        lat: 55.365,
        lon: 26.85,
        demo: true,
      },
      {
        slug: "braslav-gastro",
        name: "Гастрономическая точка Браслава (демо)",
        category: "GASTRO",
        description: "Демонстрационная точка с блюдами из местной рыбы.",
        lat: 55.368,
        lon: 26.855,
        demo: true,
      },
    ],
  },
  // ===================== ГОМЕЛЬСКАЯ ОБЛАСТЬ =====================
  {
    slug: "gomelskaya-oblast",
    name: "Гомельская область",
    description:
      "Полесская глубинка: дворец Румянцевых-Паскевичей в Гомеле, Мозырская замковая гора и вековые леса над Припятью.",
    rings: geo.oblasts.gomelskaya.geometry.coordinates,
    centerLat: geo.oblasts.gomelskaya.center[0],
    centerLon: geo.oblasts.gomelskaya.center[1],
    silverThreshold: 2,
    goldMinCount: 1,
    places: [
      {
        slug: "gomel-palace",
        name: "Дворец Румянцевых-Паскевичей",
        category: "CASTLE",
        description:
          "Парадная резиденция XVIII–XIX веков над Сожем с парком и библиотекой; визитная карточка Гомеля.",
        lat: 52.4278,
        lon: 30.973,
        goldRequired: true,
      },
      {
        slug: "gomel-sobor-petra-pavla",
        name: "Собор святых Апостолов Петра и Павла",
        category: "HISTORIC",
        description:
          "Классицистический собор в центре Гомеля (1809–1824), построенный по проекту архитектора Кларка для графа Румянцева.",
        lat: 52.4391,
        lon: 30.9842,
      },
      {
        slug: "mozyr-zamok",
        name: "Мозырский замок",
        category: "CASTLE",
        description:
          "Реконструированный замок XV–XVIII веков на Замковой горе Мозыря с смотровой площадкой над Припятью.",
        lat: 52.0512,
        lon: 29.2344,
      },
    ],
  },
  // ===================== ГРОДНЕНСКАЯ ОБЛАСТЬ =====================
  {
    slug: "grodnenskaya-oblast",
    name: "Гродненская область",
    description:
      "Запад страны: королевский Гродно с двумя замками, ЮНЕСКО-овский Мирский замок и костёлы на Немане.",
    rings: geo.oblasts.grodnenskaya.geometry.coordinates,
    centerLat: geo.oblasts.grodnenskaya.center[0],
    centerLon: geo.oblasts.grodnenskaya.center[1],
    silverThreshold: 4,
    goldMinCount: 3,
    places: [
      {
        slug: "grodno-stary-zamok",
        name: "Старый замок (Гродно)",
        category: "CASTLE",
        description:
          "Замок на берегу Немана, резиденция Стефана Батория; старейший замок Беларуси с фундаментами XI века.",
        lat: 53.6784,
        lon: 23.8231,
        goldRequired: true,
      },
      {
        slug: "grodno-kolozha",
        name: "Коложская церковь",
        category: "HISTORIC",
        description:
          "Церковь XII века — шедевр древнебелорусского зодчества с уникальной техникой кладки «в crosses» и голосниками в стенах.",
        lat: 53.674,
        lon: 23.83,
        goldRequired: true,
      },
      {
        slug: "grodno-novyy-zamok",
        name: "Новый замок (Гродно)",
        category: "HISTORIC",
        description:
          "Дворец XVIII века, где проходил «немой сейм»; сегодня здесь краеведческая экспозиция.",
        lat: 53.6785,
        lon: 23.8245,
      },
      {
        slug: "grodno-gastro",
        name: "Гастрономическая точка Гродно (демо)",
        category: "GASTRO",
        description:
          "Демонстрационная точка со старобелорусской кухней в центре Гродно.",
        lat: 53.6772,
        lon: 23.8272,
        demo: true,
      },
      {
        slug: "mir-castle",
        name: "Мирский замок",
        category: "CASTLE",
        description:
          "Замок XVI века, объект Всемирного наследия ЮНЕСКО. Готика, ренессанс и барокко в одном ансамбле; в замке работает музей.",
        lat: 53.4525,
        lon: 26.4725,
        goldRequired: true,
      },
      {
        slug: "mir-nikolskaya-cerkov",
        name: "Никольская церковь (Мир)",
        category: "HISTORIC",
        description:
          "Каменная православная церковь конца XVI века рядом с замком, памятник белорусского зодчества.",
        lat: 53.452,
        lon: 26.474,
      },
      {
        slug: "mir-sinagoga",
        name: "Мирская синагога",
        category: "HISTORIC",
        description:
          "Одна из старейших синагог Беларуси (XVI–XVII вв.), восстановленное здание в исторической части посёлка.",
        lat: 53.4515,
        lon: 26.471,
      },
    ],
  },
  // ===================== МИНСКАЯ ОБЛАСТЬ =====================
  {
    slug: "minskaya-oblast",
    name: "Минская область",
    description:
      "Центр страны вокруг столицы: Несвиж с резиденцией Радзивиллов, Слуцкая брама и старые местечки.",
    rings: geo.oblasts.minskaya.geometry.coordinates,
    centerLat: geo.oblasts.minskaya.center[0],
    centerLon: geo.oblasts.minskaya.center[1],
    silverThreshold: 3,
    goldMinCount: 2,
    places: [
      {
        slug: "nesvizh-castle",
        name: "Несвижский дворцово-парковый комплекс",
        category: "CASTLE",
        description:
          "Резиденция рода Радзивиллов, объект Всемирного наследия ЮНЕСКО. Дворец XVI века с парком и системой укреплений.",
        lat: 53.2224,
        lon: 26.6798,
        goldRequired: true,
      },
      {
        slug: "nesvizh-farny-kostel",
        name: "Фарный костёл Божьего Тела",
        category: "HISTORIC",
        description:
          "Первый в Восточной Европе храм в стиле барокко (1587–1593), усыпальница Радзивиллов, объект ЮНЕСКО.",
        lat: 53.2235,
        lon: 26.68,
        goldRequired: true,
      },
      {
        slug: "nesvizh-ratusha",
        name: "Несвижская ратуша",
        category: "HISTORIC",
        description:
          "Одна из старейших ратуш Беларуси, символ магдебургского права города.",
        lat: 53.2246,
        lon: 26.6785,
      },
      {
        slug: "nesvizh-slutskaya-brama",
        name: "Слуцкая брама",
        category: "HISTORIC",
        description:
          "Часовня-брама XVI–XVII веков, памятник оборонного зодчества Несвижа.",
        lat: 53.2235,
        lon: 26.676,
      },
      {
        slug: "nesvizh-gastro",
        name: "Гастрономическая точка Несвижа (демо)",
        category: "GASTRO",
        description:
          "Демонстрационная точка питания рядом с дворцовым комплексом. Проверяйте актуальные заведения перед поездкой.",
        lat: 53.2218,
        lon: 26.6792,
        demo: true,
      },
    ],
  },
  // ===================== МОГИЛЁВСКАЯ ОБЛАСТЬ =====================
  {
    slug: "mogilyovskaya-oblast",
    name: "Могилёвская область",
    description:
      "Восток страны: Могилёв с ратушей и Свято-Никольским монастырём, Буйничское поле над Днепром.",
    rings: geo.oblasts.mogilyovskaya.geometry.coordinates,
    centerLat: geo.oblasts.mogilyovskaya.center[0],
    centerLon: geo.oblasts.mogilyovskaya.center[1],
    silverThreshold: 2,
    goldMinCount: 1,
    places: [
      {
        slug: "mogilev-ratusha",
        name: "Могилёвская ратуша",
        category: "HISTORIC",
        description:
          "Ратуша XVII–XVIII веков — символ самоуправления Могилёва, самая высокая в стране смотровая башня среди ратуш.",
        lat: 53.8991,
        lon: 30.3344,
        goldRequired: true,
      },
      {
        slug: "mogilev-nikolskaya-cerkov",
        name: "Свято-Никольский монастырь",
        category: "HISTORIC",
        description:
          "Ансамбль XVII века с Николаевской церковью — жемчужина белорусского барокко на Днепре.",
        lat: 53.9043,
        lon: 30.3505,
      },
      {
        slug: "buinichskoe-pole",
        name: "Буйничское поле",
        category: "HISTORIC",
        description:
          "Мемориал обороны 1941 года под Могилёвом, воспетый в «Живых и мёртвых» Константина Симонова.",
        lat: 53.8631,
        lon: 30.2847,
      },
    ],
  },
];

const DEMO_PASSWORD = "MapBelDemo1!";

async function main() {
  console.log("— Seed MapBel (демо-данные) —");

  // Достижения
  for (const [i, def] of ACHIEVEMENTS.entries()) {
    await prisma.achievementDefinition.upsert({
      where: { id: def.id },
      create: {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        config: def.condition,
        sortOrder: i,
      },
      update: {
        name: def.name,
        description: def.description,
        icon: def.icon,
        config: def.condition,
        sortOrder: i,
      },
    });
  }
  console.log(`Достижения: ${ACHIEVEMENTS.length}`);

  // Пользователи (демо, пароль задокументирован в README)
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of [
    {
      email: "editor@mapbel.local",
      username: "editor",
      displayName: "Редактор (демо)",
      role: "EDITOR" as const,
    },
    {
      email: "demo@mapbel.local",
      username: "demo",
      displayName: "Демо путешественник",
      role: "USER" as const,
    },
  ]) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: { ...u, passwordHash },
      update: { role: u.role },
    });
  }
  console.log("Демо-пользователи: editor@mapbel.local, demo@mapbel.local");

  // Зоны и места
  let placeCount = 0;
  for (const z of ZONES) {
    const geometry = z.ring
      ? { type: "Polygon", coordinates: [z.ring] }
      : { type: "MultiPolygon", coordinates: z.rings };
    const zone = await prisma.zone.upsert({
      where: { slug: z.slug },
      create: {
        slug: z.slug,
        name: z.name,
        description: z.description,
        geometry,
        centerLat: z.centerLat,
        centerLon: z.centerLon,
        silverThreshold: z.silverThreshold,
        goldMinCount: z.goldMinCount,
        isDemo: true,
      },
      update: {
        name: z.name,
        description: z.description,
        geometry,
        centerLat: z.centerLat,
        centerLon: z.centerLon,
        silverThreshold: z.silverThreshold,
        goldMinCount: z.goldMinCount,
      },
    });

    // Набор золота переписывается целиком: места могли переехать между зонами
    await prisma.zoneGoldRequirement.deleteMany({ where: { zoneId: zone.id } });

    for (const p of z.places) {
      const place = await prisma.place.upsert({
        where: { slug: p.slug },
        create: {
          zoneId: zone.id,
          slug: p.slug,
          name: p.name,
          category: p.category,
          description: p.description,
          lat: p.lat,
          lon: p.lon,
          checkpointLat: p.checkpointLat,
          checkpointLon: p.checkpointLon,
          radiusM: p.radiusM,
          verifiedAt: new Date(),
          publicationStatus: "PUBLISHED",
          isDemo: p.demo ?? true,
          sourceUrl: p.demo ? null : "https://www.openstreetmap.org/copyright",
          license: p.demo ? DEMO_LICENSE : OSM_LICENSE,
        },
        update: {
          zoneId: zone.id,
          name: p.name,
          category: p.category,
          description: p.description,
          lat: p.lat,
          lon: p.lon,
          checkpointLat: p.checkpointLat,
          checkpointLon: p.checkpointLon,
          radiusM: p.radiusM,
          isDemo: p.demo ?? true,
        },
      });
      if (p.goldRequired) {
        await prisma.zoneGoldRequirement.upsert({
          where: {
            zoneId_placeId: { zoneId: zone.id, placeId: place.id },
          },
          create: { zoneId: zone.id, placeId: place.id },
          update: {},
        });
      }
      placeCount++;
    }
  }
  console.log(`Зоны: ${ZONES.length}, места: ${placeCount}`);

  // Устаревшие зоны (например, старое деление Минска на кварталы) — вон
  const keepSlugs = new Set(ZONES.map((z) => z.slug));
  const stale = await prisma.zone.findMany({
    where: { slug: { notIn: [...keepSlugs] } },
    select: { id: true, slug: true },
  });
  if (stale.length) {
    const ids = stale.map((z) => z.id);
    await prisma.userZoneProgress.deleteMany({ where: { zoneId: { in: ids } } });
    await prisma.zoneGoldRequirement.deleteMany({ where: { zoneId: { in: ids } } });
    await prisma.zone.deleteMany({ where: { id: { in: ids } } });
    console.log(`Удалено устаревших зон: ${stale.length}`);
  }

  // События (одно предстоящее, одно завершённое — для проверки AC15)
  const mir = await prisma.place.findUnique({ where: { slug: "mir-castle" } });
  const ratusha = await prisma.place.findUnique({ where: { slug: "minsk-ratusha" } });
  if (mir) {
    const starts = new Date(Date.now() + 14 * 24 * 3600 * 1000);
    await prisma.event.upsert({
      where: { id: "evt-demo-day-zamkov" },
      create: {
        id: "evt-demo-day-zamkov",
        title: "День замков (демо-событие)",
        description:
          "Демонстрационное событие: экскурсии и рыцарские представления в Мирском замке. Не является реальным анонсом.",
        startsAt: starts,
        endsAt: new Date(starts.getTime() + 8 * 3600 * 1000),
        placeId: mir.id,
        lat: 53.4525,
        lon: 26.4725,
        organizer: "MapBel (демо)",
        status: "SCHEDULED",
        source: "Демо-данные MapBel",
        isDemo: true,
      },
      update: {
        status: "SCHEDULED",
        startsAt: starts,
        endsAt: new Date(starts.getTime() + 8 * 3600 * 1000),
      },
    });
  }
  if (ratusha) {
    const starts = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    await prisma.event.upsert({
      where: { id: "evt-demo-excursion" },
      create: {
        id: "evt-demo-excursion",
        title: "Экскурсия по Верхнему городу (демо-событие, завершено)",
        description: "Демонстрационное завершённое событие для проверки отображения.",
        startsAt: starts,
        endsAt: new Date(starts.getTime() + 2 * 3600 * 1000),
        placeId: ratusha.id,
        lat: 53.9041,
        lon: 27.5618,
        organizer: "MapBel (демо)",
        status: "COMPLETED",
        source: "Демо-данные MapBel",
        isDemo: true,
      },
      update: {
        status: "COMPLETED",
        startsAt: starts,
        endsAt: new Date(starts.getTime() + 2 * 3600 * 1000),
      },
    });
  }
  console.log("События: 2 (предстоящее + завершённое, демо)");

  console.log(
    "Seed завершён. Зоны — 6 областей Беларуси + Минск; золото достижимо в каждой зоне.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
