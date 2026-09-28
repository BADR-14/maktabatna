-- Reading: progress, logs, per-person settings, family challenges, points.
-- (Hand-edited: prisma migrate diff also emitted no-op "SET DEFAULT … DROP DEFAULT" pairs on sync_seq, removed here.)

-- AlterTable
ALTER TABLE "books" ADD COLUMN "page_count" INTEGER;

-- CreateTable
CREATE TABLE "readings" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass),
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reading',
    "started_at" BIGINT NOT NULL,
    "finished_at" BIGINT,
    "page" INTEGER,
    "percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volumes_done" INTEGER,
    "rating" INTEGER,
    "note" TEXT,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reading_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "at" BIGINT NOT NULL,
    "day" TEXT NOT NULL,
    "pages" INTEGER NOT NULL DEFAULT 0,
    "percent" DOUBLE PRECISION NOT NULL,
    "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass),

    CONSTRAINT "reading_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass),
    "reading_public" BOOLEAN NOT NULL DEFAULT true,
    "daily_pages_goal" INTEGER,
    "monthly_books_goal" INTEGER,
    "reminder_time" TEXT,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "category_id" UUID,
    "starts_at" BIGINT NOT NULL,
    "ends_at" BIGINT NOT NULL,
    "reward" TEXT,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motivation" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass),
    "points_per_page" INTEGER NOT NULL DEFAULT 1,
    "points_per_book" INTEGER NOT NULL DEFAULT 50,
    "badge_rewards" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "motivation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "readings_user_id_idx" ON "readings"("user_id");

-- CreateIndex
CREATE INDEX "readings_book_id_idx" ON "readings"("book_id");

-- CreateIndex
CREATE INDEX "readings_sync_seq_idx" ON "readings"("sync_seq");

-- CreateIndex
CREATE INDEX "reading_logs_user_id_day_idx" ON "reading_logs"("user_id", "day");

-- CreateIndex
CREATE INDEX "reading_logs_sync_seq_idx" ON "reading_logs"("sync_seq");

-- CreateIndex
CREATE INDEX "user_settings_sync_seq_idx" ON "user_settings"("sync_seq");

-- CreateIndex
CREATE INDEX "challenges_sync_seq_idx" ON "challenges"("sync_seq");

-- CreateIndex
CREATE INDEX "motivation_sync_seq_idx" ON "motivation"("sync_seq");

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


INSERT INTO "motivation" ("id", "created_at", "updated_at") VALUES ('93a59f16-96bd-5461-805c-476ece977e6c', 1790380800000, 1790380800000) ON CONFLICT DO NOTHING;

INSERT INTO "motivation" ("id", "created_at", "updated_at") VALUES ('93a59f16-96bd-5461-805c-476ece977e6c', 1790380800000, 1790380800000) ON CONFLICT DO NOTHING;
