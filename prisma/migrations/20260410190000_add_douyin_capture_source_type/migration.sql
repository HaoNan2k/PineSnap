DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CaptureSourceType'
      AND e.enumlabel = 'douyin'
  ) THEN
    ALTER TYPE "CaptureSourceType" ADD VALUE 'douyin';
  END IF;
END
$$;
