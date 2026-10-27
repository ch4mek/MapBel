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
    name: "Минск — Верхний город и Троицкое предместье",
    description:
      "Демо-зона исторического центра Минска: от Ратуши и Кафедрального собора до Национальной библиотеки.",
    ring: [
      [27.548, 53.934],
      [27.592, 53.934],
      [27.592, 53.89],
      [27.548, 53.89],
      [27.548, 53.934],
    ],
    centerLat: 53.9045,
    centerLon: 27.5615,
    silverThreshold: 3,
    goldMinCount: 5,
    places: [
      {
        slug: "minsk-ratusha",
        name: "Минская ратуша",
        category: "HISTORIC",
        description:
          "Ратуша на площади Свободы, символ самоуправления Минска. Текущее здание отстроено в стиле классицизма; внутри работает музей «Мінскі гарадзкі ратуш».",
        lat: 53.9041,
        lon: 27.5618,
        goldRequired: true,
      },
      {
        slug: "minsk-duhovskoy-sobor",
        name: "Кафедральный собор Сошествия Святого Духа",
        category: "HISTORIC",
        description:
          "Православный кафедральный собор в бывшем бернардинском костёле XVII века. Здесь хранится Минское Евангелие и мощи святой Софии Слуцкой.",
        lat: 53.9021,
        lon: 27.5587,
        goldRequired: true,
      },
      {
        slug: "minsk-krasny-kostel",
        name: "Красный костёл (костёл Святых Симеона и Елены)",
        category: "HISTORIC",
        description:
          "Неоготический костёл начала XX века из красного кирпича на площади Независимости, памятник в честь Симона и Елены Воловичей.",
        lat: 53.9008,
        lon: 27.5615,
        goldRequired: true,
      },
      {
        slug: "minsk-istoricheskiy-muzey",
        name: "Национальный исторический музей",
        category: "MUSEUM",
        description:
          "Крупнейший исторический музей страны: археология, нумизматика, этнография Беларуси.",
        lat: 53.9033,
        lon: 27.5567,
      },
      {
        slug: "minsk-muzey-vov",
        name: "Музей истории Великой Отечественной войны",
        category: "MUSEUM",
        description:
          "Современный музейный комплекс у стелы «Минск — город-герой», построенный к 70-летию Победы.",
        lat: 53.8971,
        lon: 27.5706,
        goldRequired: true,
      },
      {
        slug: "minsk-troitskoye",
        name: "Троицкое предместье",
        category: "HISTORIC",
        description:
          "Реконструированный исторический квартал на левом берегу Свислочи, старейший район Минска.",
        lat: 53.9049,
        lon: 27.57,
      },
      {
        slug: "minsk-vasilki",
        name: "«Васильки» на Немиге (демо-точка)",
        category: "GASTRO",
        description:
          "Сеть кафе белорусской кухни: драники, мачанка, крамбамбуля. Демонстрационная гастрономическая точка.",
        lat: 53.9033,
        lon: 27.5551,
        demo: true,
      },
      {
        slug: "minsk-nlb",
        name: "Национальная библиотека Беларуси",
        category: "UNUSUAL",
        description:
          "Ромбокубокттаэдр высотой 72 метра — одно из самых необычных зданий страны. Смотровая площадка на крыше.",
        lat: 53.9316,
        lon: 27.5869,
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
