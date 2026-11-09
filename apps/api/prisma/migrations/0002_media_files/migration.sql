-- Photos envoyées depuis le back-office, stockées en base de données
-- (les hébergeurs gratuits effacent le disque à chaque redémarrage).
CREATE TABLE "media_files" (
    "key" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(50) NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("key")
);
