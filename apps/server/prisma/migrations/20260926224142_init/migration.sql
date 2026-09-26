-- CreateEnum
CREATE TYPE "BookcaseKind" AS ENUM ('open', 'glass');

-- CreateEnum
CREATE TYPE "ShelfKind" AS ENUM ('shelf', 'top');

-- CreateEnum
CREATE TYPE "PersonRole" AS ENUM ('author', 'editor', 'commentator', 'translator');

-- CreateEnum
CREATE TYPE "ShelfRow" AS ENUM ('front', 'back');

-- CreateEnum
CREATE TYPE "Placement" AS ENUM ('standing', 'lying', 'on_top');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "display_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "width_cm" DOUBLE PRECISION,
    "depth_cm" DOUBLE PRECISION,
    "height_cm" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookcases" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "room_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "BookcaseKind" NOT NULL,
    "wall" TEXT,
    "offset_cm" DOUBLE PRECISION,
    "elevation_cm" DOUBLE PRECISION,
    "width_cm" DOUBLE PRECISION,
    "height_cm" DOUBLE PRECISION,
    "depth_cm" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "bookcases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "bookcase_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "width_ratio" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelves" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "section_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "kind" "ShelfKind" NOT NULL DEFAULT 'shelf',
    "has_back_row" BOOLEAN NOT NULL DEFAULT false,
    "height_cm" DOUBLE PRECISION,

    CONSTRAINT "shelves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "name" TEXT NOT NULL,
    "name_norm" TEXT NOT NULL,
    "death_year_hijri" INTEGER,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "title" TEXT NOT NULL,
    "title_norm" TEXT NOT NULL,
    "category_id" UUID,
    "publisher" TEXT,
    "edition" TEXT,
    "total_volumes" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_persons" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "book_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "role" "PersonRole" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "book_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copies" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "book_id" UUID NOT NULL,
    "notes" TEXT,

    CONSTRAINT "copies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volumes" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "copy_id" UUID NOT NULL,
    "shelf_id" UUID NOT NULL,
    "volume_number" INTEGER,
    "row" "ShelfRow" NOT NULL DEFAULT 'front',
    "placement" "Placement" NOT NULL DEFAULT 'standing',
    "position" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "volumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,
    "created_by" UUID,
    "updated_by" UUID,
    "field_clock" JSONB NOT NULL DEFAULT '{}',
    "copy_id" UUID NOT NULL,
    "borrower" TEXT NOT NULL,
    "loaned_at" BIGINT NOT NULL,
    "due_at" BIGINT,
    "returned_at" BIGINT,
    "notes" TEXT,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_log" (
    "id" UUID NOT NULL,
    "table_name" TEXT NOT NULL,
    "row_id" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_by" UUID,
    "changed_at" BIGINT NOT NULL,

    CONSTRAINT "change_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_updated_at_idx" ON "users"("updated_at");

-- CreateIndex
CREATE INDEX "rooms_updated_at_idx" ON "rooms"("updated_at");

-- CreateIndex
CREATE INDEX "bookcases_room_id_idx" ON "bookcases"("room_id");

-- CreateIndex
CREATE INDEX "bookcases_updated_at_idx" ON "bookcases"("updated_at");

-- CreateIndex
CREATE INDEX "sections_bookcase_id_idx" ON "sections"("bookcase_id");

-- CreateIndex
CREATE INDEX "sections_updated_at_idx" ON "sections"("updated_at");

-- CreateIndex
CREATE INDEX "shelves_section_id_idx" ON "shelves"("section_id");

-- CreateIndex
CREATE INDEX "shelves_updated_at_idx" ON "shelves"("updated_at");

-- CreateIndex
CREATE INDEX "categories_updated_at_idx" ON "categories"("updated_at");

-- CreateIndex
CREATE INDEX "persons_name_norm_idx" ON "persons"("name_norm");

-- CreateIndex
CREATE INDEX "persons_updated_at_idx" ON "persons"("updated_at");

-- CreateIndex
CREATE INDEX "books_title_norm_idx" ON "books"("title_norm");

-- CreateIndex
CREATE INDEX "books_category_id_idx" ON "books"("category_id");

-- CreateIndex
CREATE INDEX "books_updated_at_idx" ON "books"("updated_at");

-- CreateIndex
CREATE INDEX "book_persons_book_id_idx" ON "book_persons"("book_id");

-- CreateIndex
CREATE INDEX "book_persons_person_id_idx" ON "book_persons"("person_id");

-- CreateIndex
CREATE INDEX "book_persons_updated_at_idx" ON "book_persons"("updated_at");

-- CreateIndex
CREATE INDEX "copies_book_id_idx" ON "copies"("book_id");

-- CreateIndex
CREATE INDEX "copies_updated_at_idx" ON "copies"("updated_at");

-- CreateIndex
CREATE INDEX "volumes_shelf_id_row_position_idx" ON "volumes"("shelf_id", "row", "position");

-- CreateIndex
CREATE INDEX "volumes_copy_id_idx" ON "volumes"("copy_id");

-- CreateIndex
CREATE INDEX "volumes_updated_at_idx" ON "volumes"("updated_at");

-- CreateIndex
CREATE INDEX "loans_copy_id_idx" ON "loans"("copy_id");

-- CreateIndex
CREATE INDEX "loans_updated_at_idx" ON "loans"("updated_at");

-- CreateIndex
CREATE INDEX "change_log_table_name_row_id_idx" ON "change_log"("table_name", "row_id");

-- CreateIndex
CREATE INDEX "change_log_changed_at_idx" ON "change_log"("changed_at");

-- AddForeignKey
ALTER TABLE "bookcases" ADD CONSTRAINT "bookcases_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_bookcase_id_fkey" FOREIGN KEY ("bookcase_id") REFERENCES "bookcases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelves" ADD CONSTRAINT "shelves_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_persons" ADD CONSTRAINT "book_persons_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_persons" ADD CONSTRAINT "book_persons_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copies" ADD CONSTRAINT "copies_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volumes" ADD CONSTRAINT "volumes_copy_id_fkey" FOREIGN KEY ("copy_id") REFERENCES "copies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volumes" ADD CONSTRAINT "volumes_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelves"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_copy_id_fkey" FOREIGN KEY ("copy_id") REFERENCES "copies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
