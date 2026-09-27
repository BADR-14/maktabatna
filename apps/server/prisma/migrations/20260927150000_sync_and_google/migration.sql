-- Sync: one global sequence orders every change; phones pull by it (sync_seq > cursor).
CREATE SEQUENCE IF NOT EXISTS "sync_seq";


-- AlterTable
ALTER TABLE "book_persons" ADD COLUMN     "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass);

-- AlterTable
ALTER TABLE "bookcases" ADD COLUMN     "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass);

-- AlterTable
ALTER TABLE "books" ADD COLUMN     "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass);

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass);

-- AlterTable
ALTER TABLE "change_log" ADD COLUMN     "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass);

-- AlterTable
ALTER TABLE "copies" ADD COLUMN     "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass);

-- AlterTable
ALTER TABLE "loans" ADD COLUMN     "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass);

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass);

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass);

-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass);

-- AlterTable
ALTER TABLE "shelves" ADD COLUMN     "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email" TEXT,
ADD COLUMN     "google_sub" TEXT,
ADD COLUMN     "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass),
ALTER COLUMN "password_hash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "volumes" ADD COLUMN     "sync_seq" BIGINT NOT NULL DEFAULT nextval('sync_seq'::regclass);

-- CreateIndex
CREATE INDEX "book_persons_sync_seq_idx" ON "book_persons"("sync_seq");

-- CreateIndex
CREATE INDEX "bookcases_sync_seq_idx" ON "bookcases"("sync_seq");

-- CreateIndex
CREATE INDEX "books_sync_seq_idx" ON "books"("sync_seq");

-- CreateIndex
CREATE INDEX "categories_sync_seq_idx" ON "categories"("sync_seq");

-- CreateIndex
CREATE INDEX "change_log_sync_seq_idx" ON "change_log"("sync_seq");

-- CreateIndex
CREATE INDEX "copies_sync_seq_idx" ON "copies"("sync_seq");

-- CreateIndex
CREATE INDEX "loans_sync_seq_idx" ON "loans"("sync_seq");

-- CreateIndex
CREATE INDEX "persons_sync_seq_idx" ON "persons"("sync_seq");

-- CreateIndex
CREATE INDEX "rooms_sync_seq_idx" ON "rooms"("sync_seq");

-- CreateIndex
CREATE INDEX "sections_sync_seq_idx" ON "sections"("sync_seq");

-- CreateIndex
CREATE INDEX "shelves_sync_seq_idx" ON "shelves"("sync_seq");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- CreateIndex
CREATE INDEX "users_sync_seq_idx" ON "users"("sync_seq");

-- CreateIndex
CREATE INDEX "volumes_sync_seq_idx" ON "volumes"("sync_seq");

