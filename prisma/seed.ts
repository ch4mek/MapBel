// Воспроизводимый seed (раздел 16 ТЗ): демонстрационные игровые зоны в
// разных частях Беларуси, 30 мест разных категорий, достижения, демо-юзеры,
// события. ВСЕ игровые сущности помечены isDemo и не претендуют на полный
// туристический каталог страны. Запуск: npm run db:seed

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
  description: string;
  ring: [number, number][]; // [lon, lat]
  centerLat: number;
  centerLon: number;
  silverThreshold: number;
  goldMinCount: number;
  places: SeedPlace[];
}

const OSM_LICENSE = "© OpenStreetMap contributors (ODbL); координаты округлены";
const DEMO_LICENSE = "Демонстрационные данные MapBel (учебный проект)";

const ZONES: SeedZone[] = [
  {
    slug: "minsk-verkhny-gorod",
    name: "Минск — Верхний город",
    description:
      "Исторический центр на правом берегу Свислочи: Ратуша, Кафедральный собор, Троицкое предместье, Остров слёз и театральный квартал. Границы зоны повторяют кварталы старого города.",
    ring: [
      [27.5515, 53.9060],
      [27.5560, 53.9075],
      [27.5635, 53.9095],
      [27.5645, 53.9055],
      [27.5620, 53.9010],
      [27.5590, 53.8992],
      [27.5540, 53.8990],
      [27.5500, 53.9020],
      [27.5498, 53.9055],
      [27.5515, 53.9060],
    ],
    centerLat: 53.9045,
    centerLon: 27.5575,
    silverThreshold: 3,
    goldMinCount: 5,
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
    slug: "minsk-privokzalnaya",
    name: "Минск — Привокзальная площадь",
    description:
      "Кварталы вокруг железнодорожного вокзала и площади Независимости: Красный костёл, башни «Ворота Минска» и главный корпус БГУ.",
    ring: [
      [27.5395, 53.8955],
      [27.5410, 53.8978],
      [27.5560, 53.8978],
      [27.5570, 53.8965],
      [27.5560, 53.8925],
      [27.5410, 53.8925],
      [27.5395, 53.8955],
    ],
    centerLat: 53.8955,
    centerLon: 27.5485,
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
        lon: 27.5480,
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
        lat: 53.8930,
        lon: 27.5440,
        goldRequired: true,
      },
      {
        slug: "minsk-muzey-vody",
        name: "Музей воды",
        category: "MUSEUM",
        description:
          "Старинная водонапорная башня с экспозицией городского водоканала: спуск в подземные галереи и история минского водопровода.",
        lat: 53.8973,
        lon: 27.5510,
      },
    ],
  },
  {
    slug: "minsk-pobedy",
    name: "Минск — Площадь Победы",
    description:
      "Кварталы вдоль проспекта Независимости от площади Якуба Коласа до ботанического сада: монумент Победы, музей войны и знаменитые фасады.",
    ring: [
      [27.5624, 53.9012],
      [27.5649, 53.9055],
      [27.5639, 53.9093],
      [27.5730, 53.9097],
      [27.5855, 53.9135],
      [27.5890, 53.9085],
      [27.5845, 53.9020],
      [27.5740, 53.9005],
      [27.5624, 53.9012],
    ],
    centerLat: 53.9060,
    centerLon: 27.5750,
    silverThreshold: 2,
    goldMinCount: 4,
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
        lon: 27.5730,
        goldRequired: true,
      },
      {
        slug: "minsk-kgb",
        name: "Здание КГБ",
        category: "UNUSUAL",
        description:
          "Фасад в стиле сталинского неоренессанса на углу проспекта Независимости и улицы Козлова — один из самых узнаваемых домов города.",
        lat: 53.9022,
        lon: 27.5700,
      },
      {
        slug: "minsk-botanicheskiy-sad",
        name: "Центральный ботанический сад",
        category: "NATURE",
        description:
          "Один из старейших ботанических садов Европы (1932): оранжереи, дендрарий и пять тысяч видов растений в центре города.",
        lat: 53.9030,
        lon: 27.5825,
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
    ],
  },
  {
    slug: "minsk-komarovka",
    name: "Минск — Комаровка и библиотека",
    description:
      "Северные кварталы: легендарный Комаровский рынок, парковая зона Челюскинцев и Национальная библиотека — ромб на пересечении эпох.",
    ring: [
      [27.5650, 53.9130],
      [27.5860, 53.9140],
      [27.6010, 53.9290],
      [27.5950, 53.9400],
      [27.5700, 53.9370],
      [27.5560, 53.9240],
      [27.5650, 53.9130],
    ],
    centerLat: 53.9260,
    centerLon: 27.5800,
    silverThreshold: 2,
    goldMinCount: 3,
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
        lon: 27.5870,
        goldRequired: true,
      },
    ],
  },
  {
    slug: "minsk-nemiga-zapad",
    name: "Минск — Немига и Победителей",
    description:
      "Западная часть города: стадион «Динамо», Раковское предместье, старейшее Кальварийское кладбище, «Минск-Арена» и водохранилище Дрозды.",
    ring: [
      [27.5492, 53.8990],
      [27.5497, 53.9020],
      [27.5495, 53.9055],
      [27.5492, 53.9100],
      [27.5405, 53.9180],
      [27.5490, 53.9300],
      [27.5420, 53.9470],
      [27.5100, 53.9390],
      [27.4980, 53.9230],
      [27.5055, 53.9055],
      [27.5330, 53.8975],
      [27.5495, 53.8990],
    ],
    centerLat: 53.9200,
    centerLon: 27.5250,
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
        lon: 27.5200,
        goldRequired: true,
      },
      {
        slug: "minsk-arena",
        name: "Минск-Арена",
        category: "UNUSUAL",
        description:
          "Главная концертно-спортивная арена страны с велодромом. Вечером подсвечивается разными цветами.",
        lat: 53.9441,
        lon: 27.5430,
      },
      {
        slug: "minsk-drozdy",
        name: "Парк «Дрозды»",
        category: "NATURE",
        description:
          "Парк и пляжи на водохранилище Дрозды — самое близкое к центру место, где минчане «уезжают на море».",
        lat: 53.9260,
        lon: 27.5045,
      },
    ],
  },
  {
    slug: "minsk-loshitsa",
    name: "Минск — Лошица",
    description:
      "Юго-восток города: легендарный Лошицкий парк с усадьбой Прушинских, мемориал «Яма» и стрит-арт квартал улицы Октябрьская.",
    ring: [
      [27.5600, 53.8972],
      [27.5725, 53.8990],
      [27.5850, 53.8985],
      [27.5900, 53.8870],
      [27.5780, 53.8760],
      [27.5580, 53.8820],
      [27.5570, 53.8918],
      [27.5615, 53.8958],
    ],
    centerLat: 53.8880,
    centerLon: 27.5720,
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
        lat: 53.8958,
        lon: 27.5650,
        goldRequired: true,
      },
      {
        slug: "minsk-oktyabrskaya",
        name: "Улица Октябрьская",
        category: "UNUSUAL",
        description:
          "Квартал бывших фабричных корпусов, ставший центром стрит-арта: крупнейшие в стране муралы, бары и гастромаркеты.",
        lat: 53.8978,
        lon: 27.5675,
        goldRequired: true,
      },
    ],
  },
  {
    slug: "mir-zamok",
    name: "Мир — Замковая гора",
    description: "Демо-зона посёлка Мир с внесённым в список ЮНЕСКО замком.",
    ring: [
      [26.46, 53.46],
      [26.49, 53.46],
      [26.49, 53.44],
      [26.46, 53.44],
      [26.46, 53.46],
    ],
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
    description: "Демо-зона Несвижа: дворец, фарный костёл и старый город.",
    ring: [
      [26.665, 53.23],
      [26.695, 53.23],
      [26.695, 53.212],
      [26.665, 53.212],
      [26.665, 53.23],
    ],
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
    description:
      "Демо-зона Брестской крепости. Золото для этой зоны ещё готовится — доступна бронза и серебро.",
    ring: [
      [23.63, 52.095],
      [23.685, 52.095],
      [23.685, 52.068],
      [23.63, 52.068],
      [23.63, 52.095],
    ],
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
    description:
      "Демо-зона древнего леса: музей природы, вольеры и экотропа у визит-центра Каменюки.",
    ring: [
      [23.82, 52.605],
      [23.89, 52.605],
      [23.89, 52.57],
      [23.82, 52.57],
      [23.82, 52.605],
    ],
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
    description: "Демо-зона Гродно: два замка и Коложская церковь над Неманом.",
    ring: [
      [23.8, 53.688],
      [23.84, 53.688],
      [23.84, 53.668],
      [23.8, 53.668],
      [23.8, 53.688],
    ],
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
    description: "Демо-зона национального парка: экотропы, viewpoints и Браслав.",
    ring: [
      [26.78, 55.405],
      [26.95, 55.405],
      [26.95, 55.3],
      [26.78, 55.3],
      [26.78, 55.405],
    ],
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
        description: z.description,
        geometry: {
          type: "Polygon",
          coordinates: [z.ring],
        },
        centerLat: z.centerLat,
        centerLon: z.centerLon,
        silverThreshold: z.silverThreshold,
        goldMinCount: z.goldMinCount,
        isDemo: true,
      },
      update: {
        name: z.name,
        description: z.description,
        geometry: { type: "Polygon", coordinates: [z.ring] },
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

  console.log("Seed завершён. Золото полностью достижимо в зонах: Минск, Мир, Несвиж, Пуща, Гродно, Браслав.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
