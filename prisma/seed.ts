// Воспроизводимый seed (раздел 16 ТЗ): Минск разбит на 9 административных
// районов, внутри районов — игровые зоны; плюс демо-зоны в областях.
// Границы зон — «волнистые» восьмиугольники, детерминированно построенные
// из прямоугольной сетки района (гарантированно без пересечений).
// ВСЕ игровые сущности помечены isDemo, координаты округлены. Запуск: npm run db:seed

import "dotenv/config";
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

interface SeedZone {
  slug: string;
  name: string;
  district: string;
  description: string;
  rect: [number, number, number, number]; // lonMin, latMin, lonMax, latMax
  centerLat: number;
  centerLon: number;
  silverThreshold: number;
  goldMinCount: number;
  places: SeedPlace[];
}

/** Границы города/района по прямоугольнику: срезанные углы + лёгкая
 * «волнистость» граней внутрь (детерминированно от slug). Полигон всегда
 * внутри прямоугольника — соседние зоны не пересекаются. */
function makeRing(slug: string, rect: [number, number, number, number]): [number, number][] {
  const [x1, y1, x2, y2] = rect;
  const h = Math.abs([...slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
  const w = x2 - x1;
  const d = y2 - y1;
  // Срез углов: 10–20% стороны
  const cx1 = w * (0.1 + (h % 10) / 100);
  const cx2 = w * (0.1 + ((h >> 4) % 10) / 100);
  const cy1 = d * (0.1 + ((h >> 8) % 10) / 100);
  const cy2 = d * (0.1 + ((h >> 12) % 10) / 100);
  // Впадины на серединах восточной/западной граней: 0–0.0012° (~130 м)
  const iE = ((h >> 6) % 10) * 0.00012;
  const iW = ((h >> 14) % 10) * 0.00012;
  const midY = (y1 + y2) / 2;
  return [
    [x1 + cx1, y1],
    [x2 - cx1, y1],
    [x2, y1 + cy1],
    [x2 - iE, midY],
    [x2, y2 - cy2],
    [x2 - cx2, y2],
    [x1 + cx2, y2],
    [x1, y2 - cy2],
    [x1 + iW, midY],
    [x1, y1 + cy1],
    [x1 + cx1, y1],
  ];
}

const OSM_LICENSE = "© OpenStreetMap contributors (ODbL); координаты округлены";
const DEMO_LICENSE = "Демонстрационные данные MapBel (учебный проект)";

// Административные районы Минска (в порядке вывода в интерфейсе)
const D = {
  central: "Центральный район",
  sovetsky: "Советский район",
  pervomaysky: "Первомайский район",
  partizansky: "Партизанский район",
  zavodskoy: "Заводской район",
  leninsky: "Ленинский район",
  oktyabrsky: "Октябрьский район",
  moskovsky: "Московский район",
  frunzensky: "Фрунзенский район",
  regions: "Области (демо)",
};

const ZONES: SeedZone[] = [
  // ===================== ЦЕНТРАЛЬНЫЙ РАЙОН =====================
  {
    slug: "minsk-verkhny-gorod",
    name: "Минск — Верхний город",
    district: D.central,
    description:
      "Исторический центр: Ратуша, Кафедральный собор, Немига, театральный квартал, музеи и квартал «Васильков».",
    rect: [27.552, 53.8995, 27.5608, 53.9095],
    centerLat: 53.9045,
    centerLon: 27.557,
    silverThreshold: 3,
    goldMinCount: 4,
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
        goldRequired: true,
      },
      {
        slug: "minsk-teatr-kupaly",
        name: "Театр имени Янки Купалы",
        category: "HISTORIC",
        description:
          "Старейший театр Беларуси (1890), здание у Александровского сквера. В годы войны здесь выступал фронтовой театр.",
        lat: 53.9062,
        lon: 27.5588,
        goldRequired: true,
      },
      {
        slug: "minsk-istoricheskiy-muzey",
        name: "Национальный исторический музей",
        category: "MUSEUM",
        description:
          "Крупнейший исторический музей страны: археология, нумизматика, этнография Беларуси.",
        lat: 53.9017,
        lon: 27.5598,
        goldRequired: true,
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
        slug: "minsk-hudozhestvenny-muzey",
        name: "Национальный художественный музей",
        category: "MUSEUM",
        description:
          "Крупнейшее художественное собрание страны: от древней иконописи до белорусского авангарда XX века.",
        lat: 53.901,
        lon: 27.559,
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
    ],
  },
  {
    slug: "minsk-nemiga-zapad",
    name: "Минск — Немига и Победителей",
    district: D.central,
    description:
      "Запад Центрального района: стадион «Динамо», Раковское предместье, старейшее Кальварийское кладбище и «Минск-Арена».",
    rect: [27.498, 53.899, 27.5505, 53.948],
    centerLat: 53.92,
    centerLon: 27.525,
    silverThreshold: 2,
    goldMinCount: 3,
    places: [
      {
        slug: "minsk-dinamo",
        name: "Стадион «Динамо»",
        category: "HISTORIC",
        description:
          "Национальный олимпийский стадион (открыт в 1934-м), старейшая спортивная арена страны после полной реконструкции.",
        lat: 53.9034,
        lon: 27.5466,
        goldRequired: true,
      },
      {
        slug: "minsk-petro-pavlovskiy-sobor",
        name: "Петро-Павловский собор (Раковское предместье)",
        category: "HISTORIC",
        description:
          "Бывший бернардинский костёл середины XVII века в старинном Раковском предместье — районе ремесленников и купцов.",
        lat: 53.9078,
        lon: 27.5488,
        goldRequired: true,
      },
      {
        slug: "minsk-kalvariya",
        name: "Кальварийское кладбище",
        category: "HISTORIC",
        description:
          "Старейшее кладбище города (основано в XVIII веке): надгробия известных минчан и каплица на холме.",
        lat: 53.9128,
        lon: 27.52,
        goldRequired: true,
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
    ],
  },

  // ===================== ФРУНЗЕНСКИЙ РАЙОН =====================
  {
    slug: "minsk-drozdy",
    name: "Минск — Дрозды и Кунцевщина",
    district: D.frunzensky,
    description:
      "Северо-запад города вдоль водохранилища Дрозды и проспекта Победителей, жилые кварталы Кунцевщины.",
    rect: [27.435, 53.915, 27.4965, 53.9605],
    centerLat: 53.94,
    centerLon: 27.465,
    silverThreshold: 2,
    goldMinCount: 2,
    places: [
      {
        slug: "minsk-drozdy",
        name: "Парк «Дрозды»",
        category: "NATURE",
        description:
          "Парк и пляжи на водохранилище Дрозды — самое близкое к центру место, где минчане «уезжают на море».",
        lat: 53.928,
        lon: 27.49,
        goldRequired: true,
      },
      {
        slug: "minsk-kuntsevshchina-demo",
        name: "Кунцевщина (демо-точка)",
        category: "GASTRO",
        description:
          "Демонстрационная гастрономическая точка в кварталах Кунцевщины.",
        lat: 53.944,
        lon: 27.46,
        demo: true,
        goldRequired: true,
      },
    ],
  },
  {
    slug: "minsk-kamennaya-gorka",
    name: "Минск — Каменная Горка",
    district: D.frunzensky,
    description:
      "Северо-западные спальные кварталы: благоустроенный парк Каменной Горки и Сухарево. Игровые задания готовятся.",
    rect: [27.4995, 53.949, 27.552, 53.976],
    centerLat: 53.96,
    centerLon: 27.525,
    silverThreshold: 2,
    goldMinCount: 0,
    places: [
      {
        slug: "minsk-kamennaya-gorka-park",
        name: "Парк Каменная Горка (демо)",
        category: "NATURE",
        description:
          "Демонстрационная точка: благоустроенный парк в центре жилого района.",
        lat: 53.97,
        lon: 27.52,
        demo: true,
      },
      {
        slug: "minsk-suharevo-demo",
        name: "Сухарево (демо-точка)",
        category: "GASTRO",
        description: "Демонстрационная гастрономическая точка в Сухарево.",
        lat: 53.953,
        lon: 27.512,
        demo: true,
      },
    ],
  },

  // ===================== СОВЕТСКИЙ РАЙОН =====================
  {
    slug: "minsk-pobedy",
    name: "Минск — Площадь Победы",
    district: D.sovetsky,
    description:
      "Кварталы вдоль проспекта Независимости: монумент Победы, музей войны, Ботанический сад, Троицкое предместье и площадь Якуба Коласа.",
    rect: [27.562, 53.898, 27.5795, 53.9095],
    centerLat: 53.904,
    centerLon: 27.571,
    silverThreshold: 2,
    goldMinCount: 5,
    places: [
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
        goldRequired: true,
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
        lat: 53.904,
        lon: 27.577,
        goldRequired: true,
      },
      {
        slug: "minsk-ploshchad-kolasa",
        name: "Площадь Якуба Коласа",
        category: "HISTORIC",
        description:
          "Ансамбль с памятником классику белорусской литературы и фонтанами с мальчиком и лебедем — традиционное место встреч.",
        lat: 53.9085,
        lon: 27.5656,
        goldRequired: true,
      },
      {
        slug: "minsk-troitskoye",
        name: "Троицкое предместье",
        category: "HISTORIC",
        description:
          "Исторический квартал на левом берегу Свислочи со зданиями XVI–XX веков, старейший район города.",
        lat: 53.9055,
        lon: 27.5645,
        goldRequired: true,
      },
      {
        slug: "minsk-ostrov-slyoz",
        name: "Остров слёз",
        category: "HISTORIC",
        description:
          "Искусственный остров на Свислочи с часовней-памятником воинам, погибшим в Афганистане (1996). Одна из самых трогательных точек центра.",
        lat: 53.906,
        lon: 27.565,
      },
      {
        slug: "minsk-teatr-operu",
        name: "Большой театр оперы и балета",
        category: "HISTORIC",
        description:
          "Национальный академический Большой театр оперы и балета (1933–1939) в парке у Свислочи — один из символов белорусской культуры.",
        lat: 53.908,
        lon: 27.5655,
      },
      {
        slug: "minsk-park-gorkogo",
        name: "Парк Горького",
        category: "NATURE",
        description:
          "Старейший парк Минска (1800) под горой у Свислочи: колесо обозрения, дорожки вдоль реки и старые деревья.",
        lat: 53.8995,
        lon: 27.5645,
      },
    ],
  },
  {
    slug: "minsk-komarovka",
    name: "Минск — Комаровка",
    district: D.sovetsky,
    description:
      "Кварталы вокруг легендарного Комаровского рынка — гастрономического сердца города на пересечении улиц Хоружей и Купалы.",
    rect: [27.553, 53.9105, 27.582, 53.93],
    centerLat: 53.9205,
    centerLon: 27.5675,
    silverThreshold: 2,
    goldMinCount: 2,
    places: [
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
        slug: "minsk-horuzhey-demo",
        name: "Улица Хоружей (демо-точка)",
        category: "GASTRO",
        description: "Демонстрационная точка питания на оживлённой улице Хоружей.",
        lat: 53.918,
        lon: 27.566,
        demo: true,
        goldRequired: true,
      },
    ],
  },

  // ===================== ПЕРВОМАЙСКИЙ РАЙОН =====================
  {
    slug: "minsk-chelyuskincev-nlb",
    name: "Минск — Челюскинцы и НЛБ",
    district: D.pervomaysky,
    description:
      "Северо-восток: пейзажный парк Челюскинцев с планетарием и Национальная библиотека — ромб на пересечении эпох.",
    rect: [27.5845, 53.902, 27.66, 53.952],
    centerLat: 53.93,
    centerLon: 27.62,
    silverThreshold: 2,
    goldMinCount: 2,
    places: [
      {
        slug: "minsk-park-chelyuskincev",
        name: "Парк Челюскинцев",
        category: "NATURE",
        description:
          "Пейзажный парк бывшей усадьбы Станкевичей с прудами и планетарием. Любимая зелёная зона севера города.",
        lat: 53.9155,
        lon: 27.587,
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
        slug: "minsk-vostok-demo",
        name: "Микрорайон Восток (демо-точка)",
        category: "NATURE",
        description: "Демонстрационная точка в зелёных кварталах Востока.",
        lat: 53.938,
        lon: 27.635,
        demo: true,
      },
    ],
  },
  {
    slug: "minsk-slepyanka",
    name: "Минск — Слепянский каскад",
    district: D.pervomaysky,
    description:
      "Восточные кварталы вдоль Слепянской водной системы: цепь парков и прудов. Игровые задания готовятся.",
    rect: [27.585, 53.8875, 27.5885, 53.8995],
    centerLat: 53.8955,
    centerLon: 27.5945,
    silverThreshold: 2,
    goldMinCount: 0,
    places: [
      {
        slug: "minsk-slepyanka-park-demo",
        name: "Слепянский каскад (демо-точка)",
        category: "NATURE",
        description: "Демонстрационная точка в парках вдоль водной системы.",
        lat: 53.8935,
        lon: 27.587,
        demo: true,
      },
      {
        slug: "minsk-kulman-demo",
        name: "Улица Кульман (демо-точка)",
        category: "GASTRO",
        description: "Демонстрационная точка питания в кварталах Кульман.",
        lat: 53.8965,
        lon: 27.587,
        demo: true,
      },
    ],
  },

  // ===================== ПАРТИЗАНСКИЙ РАЙОН =====================
  {
    slug: "minsk-bangalor",
    name: "Минск — Бангалор и Аквапарк",
    district: D.partizansky,
    description:
      "Восток города: парк «Бангалор» с прокатом и спортивными площадками, республиканский аквапарк и храм Всех Святых.",
    rect: [27.5903, 53.8755, 27.672, 53.9005],
    centerLat: 53.885,
    centerLon: 27.63,
    silverThreshold: 2,
    goldMinCount: 3,
    places: [
      {
        slug: "minsk-park-bangalor",
        name: "Парк «Бангалор»",
        category: "NATURE",
        description:
          "Парк с зонами отдыха и спортивными площадками между Ваупшасова и Калиновского. Назван в честь города-побратима.",
        lat: 53.89,
        lon: 27.625,
        goldRequired: true,
      },
      {
        slug: "minsk-aquapark",
        name: "Минский аквапарк",
        category: "UNUSUAL",
        description:
          "Один из крупнейших аквапарков Восточной Европы: горки, бассейны и спа-зона круглый год.",
        lat: 53.88,
        lon: 27.615,
        goldRequired: true,
      },
      {
        slug: "minsk-vseh-svyatyh",
        name: "Храм Всех Святых",
        category: "HISTORIC",
        description:
          "Всехсвятский кафедральный собор (2008–2018) на памятном холме — белый храм, видный издалека.",
        lat: 53.886,
        lon: 27.622,
        goldRequired: true,
      },
    ],
  },

  // ===================== ЗАВОДСКОЙ РАЙОН =====================
  {
    slug: "minsk-serebryanka",
    name: "Минск — Серебрянка",
    district: D.zavodskoy,
    description:
      "Юго-восток: парк Серебрянка с прудами, музей пивоварения «Аліварыя» и кварталы Могилёвского шоссе, мемориал «Тростенец».",
    rect: [27.609, 53.812, 27.71, 53.874],
    centerLat: 53.848,
    centerLon: 27.655,
    silverThreshold: 2,
    goldMinCount: 2,
    places: [
      {
        slug: "minsk-park-serebryanka",
        name: "Парк «Серебрянка»",
        category: "NATURE",
        description:
          "Парк с каскадом прудов в жилом районе Серебрянка — любимое место прогулок юго-востока города.",
        lat: 53.849,
        lon: 27.625,
        goldRequired: true,
      },
      {
        slug: "minsk-alivariya",
        name: "Музей пивоварения «Аліварыя»",
        category: "MUSEUM",
        description:
          "Музей на территории старейшего пивзавода страны (1894): история минского пивоварения и дегустации.",
        lat: 53.865,
        lon: 27.64,
        goldRequired: true,
      },
      {
        slug: "minsk-trostenets",
        name: "Мемориал «Тростенец»",
        category: "HISTORIC",
        description:
          "Мемориал на месте крупнейшего лагеря смерти на территории Беларуси (206 тысяч жертв). Открыт в 2015 году.",
        lat: 53.8465,
        lon: 27.647,
      },
      {
        slug: "minsk-shabany-demo",
        name: "Шабаны (демо-точка)",
        category: "GASTRO",
        description: "Демонстрационная точка питания в кварталах Шабаны.",
        lat: 53.83,
        lon: 27.675,
        demo: true,
      },
    ],
  },

  // ===================== ЛЕНИНСКИЙ РАЙОН =====================
  {
    slug: "minsk-loshitsa",
    name: "Минск — Лошица и Октябрьская",
    district: D.leninsky,
    description:
      "Юг города: легендарный Лошицкий парк с усадьбой Прушинских, мемориал «Яма» и стрит-арт квартал улицы Октябрьская.",
    rect: [27.5625, 53.815, 27.5835, 53.8958],
    centerLat: 53.87,
    centerLon: 27.5725,
    silverThreshold: 2,
    goldMinCount: 3,
    places: [
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
        lat: 53.892,
        lon: 27.5655,
        goldRequired: true,
      },
      {
        slug: "minsk-oktyabrskaya",
        name: "Улица Октябрьская",
        category: "UNUSUAL",
        description:
          "Квартал бывших фабричных корпусов, ставший центром стрит-арта: крупнейшие в стране муралы, бары и гастромаркеты.",
        lat: 53.894,
        lon: 27.568,
        goldRequired: true,
      },
    ],
  },

  // ===================== ОКТЯБРЬСКИЙ РАЙОН =====================
  {
    slug: "minsk-aerodrom",
    name: "Минск — Аэродром",
    district: D.oktyabrsky,
    description:
      "Южные кварталы Октябрьского района: Аэродром, Дворище и Курасовщина. Игровые задания готовятся.",
    rect: [27.515, 53.815, 27.5465, 53.8915],
    centerLat: 53.855,
    centerLon: 27.533,
    silverThreshold: 2,
    goldMinCount: 0,
    places: [
      {
        slug: "minsk-aerodrom-demo",
        name: "Аэродром (демо-точка)",
        category: "GASTRO",
        description: "Демонстрационная точка питания в кварталах Аэродрома.",
        lat: 53.864,
        lon: 27.54,
        demo: true,
      },
      {
        slug: "minsk-dvorische-demo",
        name: "Дворище (демо-точка)",
        category: "NATURE",
        description: "Демонстрационная зелёная точка в кварталах Дворище.",
        lat: 53.845,
        lon: 27.53,
        demo: true,
      },
    ],
  },

  // ===================== МОСКОВСКИЙ РАЙОН =====================
  {
    slug: "minsk-brilevichi",
    name: "Минск — Брилевичи и Корженевского",
    district: D.moskovsky,
    description:
      "Юго-западные жилые кварталы: Брилевичи, Корженевского и Щорса. Игровые задания готовятся.",
    rect: [27.44, 53.815, 27.5135, 53.898],
    centerLat: 53.858,
    centerLon: 27.478,
    silverThreshold: 2,
    goldMinCount: 0,
    places: [
      {
        slug: "minsk-brilevichi-demo",
        name: "Брилевичи (демо-точка)",
        category: "NATURE",
        description: "Демонстрационная зелёная точка в кварталах Брилевичи.",
        lat: 53.862,
        lon: 27.478,
        demo: true,
      },
      {
        slug: "minsk-korzhevskogo-demo",
        name: "Корженевского (демо-точка)",
        category: "GASTRO",
        description: "Демонстрационная точка питания на Корженевского.",
        lat: 53.878,
        lon: 27.478,
        demo: true,
      },
    ],
  },
  {
    slug: "minsk-privokzalnaya",
    name: "Минск — Привокзальная площадь",
    district: D.moskovsky,
    description:
      "Кварталы вокруг железнодорожного вокзала и площади Независимости: Красный костёл, башни «Ворота Минска» и главный корпус БГУ.",
    rect: [27.533, 53.8928, 27.56, 53.8982],
    centerLat: 53.8955,
    centerLon: 27.5475,
    silverThreshold: 2,
    goldMinCount: 3,
    places: [
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
        goldRequired: true,
      },
      {
        slug: "minsk-bgu-main",
        name: "Главный корпус БГУ",
        category: "HISTORIC",
        description:
          "Памятник сталинской архитектуры (1955) с колоннадой и парком. Символ старейшего университета страны.",
        lat: 53.8945,
        lon: 27.5455,
        goldRequired: true,
      },
      {
        slug: "minsk-muzey-vody",
        name: "Музей воды",
        category: "MUSEUM",
        description:
          "Старинная водонапорная башня с экспозицией городского водоканала: спуск в подземные галереи и история минского водопровода.",
        lat: 53.8962,
        lon: 27.5505,
      },
    ],
  },

  // ===================== ОБЛАСТИ (ДЕМО) =====================
  {
    slug: "mir-zamok",
    name: "Мир — Замковая гора",
    district: D.regions,
    description: "Демо-зона посёлка Мир с внесённым в список ЮНЕСКО замком.",
    rect: [26.46, 53.46, 26.49, 53.44],
    centerLat: 53.4525,
    centerLon: 26.4725,
    silverThreshold: 2,
    goldMinCount: 3,
    places: [
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
        goldRequired: true,
      },
      {
        slug: "mir-sinagoga",
        name: "Мирская синагога",
        category: "HISTORIC",
        description:
          "Одна из старейших синагог Беларуси (XVI–XVII вв.), восстановленное здание в исторической части посёлка.",
        lat: 53.4515,
        lon: 26.471,
        goldRequired: true,
      },
    ],
  },
  {
    slug: "nesvizh-rezidentsiya",
    name: "Несвиж — резиденция Радзивиллов",
    district: D.regions,
    description: "Демо-зона Несвижа: дворец, фарный костёл и старый город.",
    rect: [26.665, 53.212, 26.695, 53.23],
    centerLat: 53.2224,
    centerLon: 26.6798,
    silverThreshold: 3,
    goldMinCount: 4,
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
        goldRequired: true,
      },
      {
        slug: "nesvizh-slutskaya-brama",
        name: "Слуцкая брама",
        category: "HISTORIC",
        description:
          "Часовня-брама XVI–XVII веков, памятник оборонного зодчества Несвижа.",
        lat: 53.2235,
        lon: 26.676,
        goldRequired: true,
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
  {
    slug: "brest-krepost",
    name: "Брест — крепость над Бугом",
    district: D.regions,
    description:
      "Демо-зона Брестской крепости. Золото для этой зоны ещё готовится — доступна бронза и серебро.",
    rect: [23.63, 52.068, 23.685, 52.095],
    centerLat: 52.0862,
    centerLon: 23.6573,
    silverThreshold: 2,
    goldMinCount: 0,
    places: [
      {
        slug: "brest-memorial",
        name: "Мемориал «Брестская крепость-герой»",
        category: "HISTORIC",
        description:
          "Мемориальный комплекс «Героям обороны», открыт в 1971 году: Холмские ворота, монумент «Мужество», штык-обелиск.",
        lat: 52.0862,
        lon: 23.6573,
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
    ],
  },
  {
    slug: "belovezhskaya-pushcha",
    name: "Беловежская пуща — экотропы",
    district: D.regions,
    description:
      "Демо-зона древнего леса: музей природы, вольеры и экотропа у визит-центра Каменюки.",
    rect: [23.82, 52.57, 23.89, 52.605],
    centerLat: 52.588,
    centerLon: 23.856,
    silverThreshold: 2,
    goldMinCount: 3,
    places: [
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
        goldRequired: true,
      },
      {
        slug: "pushcha-volery",
        name: "Вольеры с зубрами",
        category: "NATURE",
        description:
          "Экспозиция вольеров с зубрами, оленями и другими животными пущи рядом с музеем природы.",
        lat: 52.598,
        lon: 23.848,
        goldRequired: true,
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
  {
    slug: "grodno-korolevskiy",
    name: "Гродно — королевский город",
    district: D.regions,
    description: "Демо-зона Гродно: два замка и Коложская церковь над Неманом.",
    rect: [23.8, 53.668, 23.84, 53.688],
    centerLat: 53.6784,
    centerLon: 23.8231,
    silverThreshold: 2,
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
        goldRequired: true,
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
    ],
  },
  {
    slug: "braslavskie-ozyora",
    name: "Браславские озёра",
    district: D.regions,
    description: "Демо-зона национального парка: экотропы, viewpoints и Браслав.",
    rect: [26.78, 55.3, 26.95, 55.405],
    centerLat: 55.365,
    centerLon: 26.856,
    silverThreshold: 2,
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
        lat: 55.405,
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
        goldRequired: true,
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
    const zone = await prisma.zone.upsert({
      where: { slug: z.slug },
      create: {
        slug: z.slug,
        name: z.name,
        district: z.district,
        description: z.description,
        geometry: { type: "Polygon", coordinates: [makeRing(z.slug, z.rect)] },
        centerLat: z.centerLat,
        centerLon: z.centerLon,
        silverThreshold: z.silverThreshold,
        goldMinCount: z.goldMinCount,
        isDemo: true,
      },
      update: {
        name: z.name,
        district: z.district,
        description: z.description,
        geometry: { type: "Polygon", coordinates: [makeRing(z.slug, z.rect)] },
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
        lat: 53.9045,
        lon: 27.5575,
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

  console.log("Seed завершён. Минск разбит на 9 районов; золото достижимо в демо-зонах.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
