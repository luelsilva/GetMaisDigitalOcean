-- Migration: Add has_occurrences column and internship_occurrences table

ALTER TABLE "internships" ADD COLUMN IF NOT EXISTS "has_occurrences" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "internship_occurrences" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "internship_id" UUID NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
    "rule_key" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "resolved_at" TIMESTAMPTZ,
    "resolved_by" UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE "internship_occurrences" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "idx_internship_occurrences_internship_id" ON "internship_occurrences"("internship_id");
