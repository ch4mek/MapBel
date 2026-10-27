# Модель данных MapBel

Соответствует разделу 13 ТЗ. Схема: `prisma/schema.prisma`. Все
идентификаторы — UUID (`Char(36)`, генерируются клиентом Prisma).
Геометрия зон — GeoJSON (`Json`-поле), координаты в порядке
`[longitude, latitude]`. Координаты точек — `Decimal(9,6)`.

## Сущности

| Модель | Назначение | Ключевые ограничения |
|---|---|---|
| `User` | аккаунт: email, username, displayName, роль USER/EDITOR | `email` unique, `username` unique |
| `Profile` | био, город, аватар | 1:1 с User |
| `Friendship` | заявка/дружба: PENDING → ACCEPTED/REJECTED | уникальная пара `requester+addressee`; встречные заявки merge в логике |
| `Zone` | игровая зона: GeoJSON-границы, центр, пороги `silverThreshold`/`goldMinCount`, `isDemo` | `slug` unique |
| `ZoneGoldRequirement` | явный набор мест для золота | `zoneId+placeId` unique |
| `Place` | место: категория, координаты, контрольная точка и радиус (override), логистика, `publicationStatus`, `verifiedAt`, лицензия | `slug` unique; индекс `zoneId+publicationStatus` |
| `PlaceMedia` | фото карточки места | `storageKey` unique |
| `Visit` | подтверждённое посещение: позиция, точность, дистанция, `visitDay` (Minsk), `isUniqueForUser`, `checkinKey` | `userId+placeId+visitDay` unique (1 визит/день); `userId+checkinKey` unique (идемпотентность) |
| `UserZoneProgress` | уникальные места зоны, ранг NONE/BRONZE/SILVER/GOLD, даты рангов | `userId+zoneId` unique; статус только растёт |
| `RewardEvent` | ledger XP: `eventKey`, kind, xp | `eventKey` unique — защита от повторного начисления |
| `AchievementDefinition` | код достижения, условие (Json из `config/game.ts`) | `id` — строковый код |
| `UserAchievement` | выданное достижение | `userId+achievementId` unique |
| `DiaryEntry` | запись: 1 место, опц. visit/trip, дата поездки, видимость PRIVATE/FRIENDS/PUBLIC | удаление записи не трогает Visit |
| `DiaryPhoto` | фото: полный ключ + превью (WebP без EXIF), подпись | `storageKey`, `previewKey` unique |
| `PhotoTag` | отметка друга: PENDING → ACCEPTED/REJECTED | `photoId+taggedUserId` unique; до ACCEPTED не считается подтверждённой |
| `Trip` | поездка: организатор, дата, статус PLANNED/ACTIVE/COMPLETED/CANCELLED, `startedAt` | — |
| `TripMember` | участник + статус приглашения | `tripId+userId` unique |
| `TripPlace` | упорядоченный маршрут, `isRequired` | `tripId+placeId` unique; фиксируется после старта |
| `JointVisit` | совместная отметка места поездки, `confirmedAt` | `tripId+placeId` unique |
| `JointVisitConfirmation` | подтверждения участников (≥2 в окне 2 ч после старта) | `jointVisitId+userId` unique |
| `Review` | отзыв 1–5, текст, советы, модерация | `userId+placeId` unique (один на место) |
| `Event` | событие: начало/конец, timezone, место/координаты, статус scheduled/cancelled/completed | завершённые не показываются как предстоящие |
| `ContentSuggestion` | предложение нового места/исправления, статус разбора редактором | автопубликации нет |

## Поток чек-ина (всё в одной транзакции MySQL)

```
POST /api/places/:id/checkin
  → серверная валидация позиции (geo.ts)
  → upsert UserZoneProgress (вне транзакции — строка для FOR UPDATE)
  → BEGIN
      SELECT ... FOR UPDATE (строка прогресса зоны)
      поиск визита за сегодня (userId+placeId+visitDay)
        найден с тем же checkinKey → идемпотентный повтор
        найден с другим ключом     → ALREADY_VISITED_TODAY
      INSERT Visit (isUniqueForUser = первый ли визит места)
      PLACE_FIRST XP   → RewardEvent(place_first:{user}:{place})
      UPDATE прогресс (+1 уникальное)
      computeRank → applyRankMonotonic → ZONE_* XP за новые ранги
      evaluateAchievements (уникальность userId+achievementId)
    COMMIT
  → если tripId: registerTripConfirmation (порог 2 участника, окно 2 ч,
    завершение поездки, TRIP_COMPLETED XP участникам с совместными отметками)
```

## XP (config/game.ts)

- первое уникальное место: +10
- бронза зоны: +20, серебро: +40, золото: +80 (каждый ранг однократно,
  скачок через ранги начисляет все пропущенные)
- завершение совместной поездки: +30 (один раз на участника)

Уровень = `floor(lifetimeXP / 100) + 1`. Месячное сравнение друзей — по
XP-событиям календарного месяца Europe/Minsk (UTC+3 фикс.), lifetimeXP не
обнуляется. Tie-breaker: раньше первое начисление месяца → выше, затем
username.
