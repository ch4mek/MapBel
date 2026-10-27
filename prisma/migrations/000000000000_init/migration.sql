-- CreateTable
CREATE TABLE `User` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `role` ENUM('USER', 'EDITOR') NOT NULL DEFAULT 'USER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Profile` (
    `id` CHAR(36) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `bio` TEXT NULL,
    `homeCity` VARCHAR(191) NULL,
    `avatarKey` VARCHAR(191) NULL,

    UNIQUE INDEX `Profile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Friendship` (
    `id` CHAR(36) NOT NULL,
    `requesterId` VARCHAR(191) NOT NULL,
    `addresseeId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respondedAt` DATETIME(3) NULL,

    INDEX `Friendship_addresseeId_status_idx`(`addresseeId`, `status`),
    UNIQUE INDEX `Friendship_requesterId_addresseeId_key`(`requesterId`, `addresseeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Zone` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `geometry` JSON NOT NULL,
    `centerLat` DECIMAL(9, 6) NOT NULL,
    `centerLon` DECIMAL(9, 6) NOT NULL,
    `silverThreshold` INTEGER NOT NULL,
    `goldMinCount` INTEGER NOT NULL,
    `isDemo` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Zone_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ZoneGoldRequirement` (
    `id` CHAR(36) NOT NULL,
    `zoneId` VARCHAR(191) NOT NULL,
    `placeId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ZoneGoldRequirement_zoneId_placeId_key`(`zoneId`, `placeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Place` (
    `id` CHAR(36) NOT NULL,
    `zoneId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` ENUM('HISTORIC', 'MUSEUM', 'CASTLE', 'NATURE', 'ECOTRAIL', 'GASTRO', 'UNUSUAL') NOT NULL,
    `description` TEXT NOT NULL,
    `lat` DECIMAL(9, 6) NOT NULL,
    `lon` DECIMAL(9, 6) NOT NULL,
    `checkpointLat` DECIMAL(9, 6) NULL,
    `checkpointLon` DECIMAL(9, 6) NULL,
    `radiusM` INTEGER NULL,
    `address` VARCHAR(191) NULL,
    `openingHours` VARCHAR(191) NULL,
    `priceInfo` VARCHAR(191) NULL,
    `contacts` VARCHAR(191) NULL,
    `officialUrl` VARCHAR(191) NULL,
    `accessibility` VARCHAR(191) NULL,
    `arrivalTips` VARCHAR(191) NULL,
    `sourceUrl` VARCHAR(191) NULL,
    `license` VARCHAR(191) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `publicationStatus` ENUM('PUBLISHED', 'HIDDEN', 'DRAFT') NOT NULL DEFAULT 'PUBLISHED',
    `isDemo` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Place_slug_key`(`slug`),
    INDEX `Place_zoneId_publicationStatus_idx`(`zoneId`, `publicationStatus`),
    INDEX `Place_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlaceMedia` (
    `id` CHAR(36) NOT NULL,
    `placeId` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `caption` VARCHAR(191) NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `isCover` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `PlaceMedia_storageKey_key`(`storageKey`),
    INDEX `PlaceMedia_placeId_idx`(`placeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Visit` (
    `id` CHAR(36) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `placeId` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NULL,
    `jointVisitId` VARCHAR(191) NULL,
    `checkinLat` DECIMAL(9, 6) NOT NULL,
    `checkinLon` DECIMAL(9, 6) NOT NULL,
    `accuracyM` DOUBLE NOT NULL,
    `distanceM` DOUBLE NOT NULL,
    `visitedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `visitDay` CHAR(10) NOT NULL,
    `isUniqueForUser` BOOLEAN NOT NULL DEFAULT false,
    `checkinKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Visit_userId_visitedAt_idx`(`userId`, `visitedAt`),
    INDEX `Visit_placeId_idx`(`placeId`),
    UNIQUE INDEX `Visit_userId_placeId_visitDay_key`(`userId`, `placeId`, `visitDay`),
    UNIQUE INDEX `Visit_userId_checkinKey_key`(`userId`, `checkinKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserZoneProgress` (
    `id` CHAR(36) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `zoneId` VARCHAR(191) NOT NULL,
    `uniquePlaces` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('NONE', 'BRONZE', 'SILVER', 'GOLD') NOT NULL DEFAULT 'NONE',
    `bronzeAt` DATETIME(3) NULL,
    `silverAt` DATETIME(3) NULL,
    `goldAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserZoneProgress_userId_zoneId_key`(`userId`, `zoneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RewardEvent` (
    `id` CHAR(36) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `eventKey` VARCHAR(191) NOT NULL,
    `kind` ENUM('PLACE_FIRST', 'ZONE_BRONZE', 'ZONE_SILVER', 'ZONE_GOLD', 'TRIP_COMPLETED') NOT NULL,
    `xp` INTEGER NOT NULL,
    `meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RewardEvent_eventKey_key`(`eventKey`),
    INDEX `RewardEvent_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AchievementDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NOT NULL,
    `config` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserAchievement` (
    `id` CHAR(36) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `achievementId` VARCHAR(191) NOT NULL,
    `awardedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserAchievement_userId_achievementId_key`(`userId`, `achievementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiaryEntry` (
    `id` CHAR(36) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `placeId` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NULL,
    `tripId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `tripDate` DATE NULL,
    `description` TEXT NULL,
    `visibility` ENUM('PRIVATE', 'FRIENDS', 'PUBLIC') NOT NULL DEFAULT 'FRIENDS',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DiaryEntry_authorId_createdAt_idx`(`authorId`, `createdAt`),
    INDEX `DiaryEntry_placeId_idx`(`placeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiaryPhoto` (
    `id` CHAR(36) NOT NULL,
    `entryId` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `previewKey` VARCHAR(191) NOT NULL,
    `caption` VARCHAR(191) NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DiaryPhoto_storageKey_key`(`storageKey`),
    UNIQUE INDEX `DiaryPhoto_previewKey_key`(`previewKey`),
    INDEX `DiaryPhoto_entryId_idx`(`entryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PhotoTag` (
    `id` CHAR(36) NOT NULL,
    `photoId` VARCHAR(191) NOT NULL,
    `taggedUserId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respondedAt` DATETIME(3) NULL,

    INDEX `PhotoTag_taggedUserId_status_idx`(`taggedUserId`, `status`),
    UNIQUE INDEX `PhotoTag_photoId_taggedUserId_key`(`photoId`, `taggedUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Trip` (
    `id` CHAR(36) NOT NULL,
    `organizerId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `tripDate` DATE NOT NULL,
    `status` ENUM('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Trip_organizerId_idx`(`organizerId`),
    INDEX `Trip_status_tripDate_idx`(`status`, `tripDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TripMember` (
    `id` CHAR(36) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `inviteStatus` ENUM('PENDING', 'ACCEPTED', 'DECLINED') NOT NULL DEFAULT 'PENDING',
    `invitedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respondedAt` DATETIME(3) NULL,

    INDEX `TripMember_userId_idx`(`userId`),
    UNIQUE INDEX `TripMember_tripId_userId_key`(`tripId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TripPlace` (
    `id` CHAR(36) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `placeId` VARCHAR(191) NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `isRequired` BOOLEAN NOT NULL DEFAULT true,

    INDEX `TripPlace_tripId_idx`(`tripId`),
    UNIQUE INDEX `TripPlace_tripId_placeId_key`(`tripId`, `placeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JointVisit` (
    `id` CHAR(36) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `placeId` VARCHAR(191) NOT NULL,
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `JointVisit_tripId_placeId_key`(`tripId`, `placeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JointVisitConfirmation` (
    `id` CHAR(36) NOT NULL,
    `jointVisitId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NULL,
    `checkinLat` DECIMAL(9, 6) NOT NULL,
    `checkinLon` DECIMAL(9, 6) NOT NULL,
    `confirmedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `JointVisitConfirmation_jointVisitId_userId_key`(`jointVisitId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` CHAR(36) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `placeId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `text` TEXT NULL,
    `tips` TEXT NULL,
    `moderationStatus` ENUM('ACTIVE', 'HIDDEN') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Review_placeId_moderationStatus_idx`(`placeId`, `moderationStatus`),
    UNIQUE INDEX `Review_userId_placeId_key`(`userId`, `placeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Europe/Minsk',
    `placeId` VARCHAR(191) NULL,
    `lat` DECIMAL(9, 6) NULL,
    `lon` DECIMAL(9, 6) NULL,
    `organizer` VARCHAR(191) NULL,
    `officialUrl` VARCHAR(191) NULL,
    `status` ENUM('SCHEDULED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
    `source` VARCHAR(191) NULL,
    `isDemo` BOOLEAN NOT NULL DEFAULT false,

    INDEX `Event_startsAt_idx`(`startsAt`),
    INDEX `Event_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentSuggestion` (
    `id` CHAR(36) NOT NULL,
    `type` ENUM('NEW_PLACE', 'CORRECTION') NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `targetPlaceId` VARCHAR(191) NULL,
    `payload` JSON NOT NULL,
    `note` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `editorComment` TEXT NULL,
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContentSuggestion_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `ContentSuggestion_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Friendship` ADD CONSTRAINT `Friendship_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Friendship` ADD CONSTRAINT `Friendship_addresseeId_fkey` FOREIGN KEY (`addresseeId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoneGoldRequirement` ADD CONSTRAINT `ZoneGoldRequirement_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZoneGoldRequirement` ADD CONSTRAINT `ZoneGoldRequirement_placeId_fkey` FOREIGN KEY (`placeId`) REFERENCES `Place`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Place` ADD CONSTRAINT `Place_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlaceMedia` ADD CONSTRAINT `PlaceMedia_placeId_fkey` FOREIGN KEY (`placeId`) REFERENCES `Place`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Visit` ADD CONSTRAINT `Visit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Visit` ADD CONSTRAINT `Visit_placeId_fkey` FOREIGN KEY (`placeId`) REFERENCES `Place`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Visit` ADD CONSTRAINT `Visit_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Visit` ADD CONSTRAINT `Visit_jointVisitId_fkey` FOREIGN KEY (`jointVisitId`) REFERENCES `JointVisit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserZoneProgress` ADD CONSTRAINT `UserZoneProgress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserZoneProgress` ADD CONSTRAINT `UserZoneProgress_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RewardEvent` ADD CONSTRAINT `RewardEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserAchievement` ADD CONSTRAINT `UserAchievement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserAchievement` ADD CONSTRAINT `UserAchievement_achievementId_fkey` FOREIGN KEY (`achievementId`) REFERENCES `AchievementDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiaryEntry` ADD CONSTRAINT `DiaryEntry_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiaryEntry` ADD CONSTRAINT `DiaryEntry_placeId_fkey` FOREIGN KEY (`placeId`) REFERENCES `Place`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiaryEntry` ADD CONSTRAINT `DiaryEntry_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `Visit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiaryEntry` ADD CONSTRAINT `DiaryEntry_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiaryPhoto` ADD CONSTRAINT `DiaryPhoto_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `DiaryEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhotoTag` ADD CONSTRAINT `PhotoTag_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `DiaryPhoto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhotoTag` ADD CONSTRAINT `PhotoTag_taggedUserId_fkey` FOREIGN KEY (`taggedUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trip` ADD CONSTRAINT `Trip_organizerId_fkey` FOREIGN KEY (`organizerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripMember` ADD CONSTRAINT `TripMember_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripMember` ADD CONSTRAINT `TripMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripPlace` ADD CONSTRAINT `TripPlace_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripPlace` ADD CONSTRAINT `TripPlace_placeId_fkey` FOREIGN KEY (`placeId`) REFERENCES `Place`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JointVisit` ADD CONSTRAINT `JointVisit_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JointVisit` ADD CONSTRAINT `JointVisit_placeId_fkey` FOREIGN KEY (`placeId`) REFERENCES `Place`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JointVisitConfirmation` ADD CONSTRAINT `JointVisitConfirmation_jointVisitId_fkey` FOREIGN KEY (`jointVisitId`) REFERENCES `JointVisit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JointVisitConfirmation` ADD CONSTRAINT `JointVisitConfirmation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JointVisitConfirmation` ADD CONSTRAINT `JointVisitConfirmation_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `Visit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_placeId_fkey` FOREIGN KEY (`placeId`) REFERENCES `Place`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_placeId_fkey` FOREIGN KEY (`placeId`) REFERENCES `Place`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentSuggestion` ADD CONSTRAINT `ContentSuggestion_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentSuggestion` ADD CONSTRAINT `ContentSuggestion_targetPlaceId_fkey` FOREIGN KEY (`targetPlaceId`) REFERENCES `Place`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

