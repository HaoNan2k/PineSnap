-- Add Message.parts (jsonb) and ensure Role default matches lowercase values.

-- 1) Role enum: rename legacy values if they exist (guarded)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'USER'
  ) THEN
    EXECUTE 'ALTER TYPE "Role" RENAME VALUE ''USER'' TO ''user''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'ASSISTANT'
  ) THEN
    EXECUTE 'ALTER TYPE "Role" RENAME VALUE ''ASSISTANT'' TO ''assistant''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'SYSTEM'
  ) THEN
    EXECUTE 'ALTER TYPE "Role" RENAME VALUE ''SYSTEM'' TO ''system''';
  END IF;
END $$;

-- 2) Ensure role default uses an existing enum value
ALTER TABLE "Message" ALTER COLUMN "role" SET DEFAULT 'user';

-- 3) Add structured parts column
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "parts" JSONB NOT NULL DEFAULT '[]'::jsonb;

