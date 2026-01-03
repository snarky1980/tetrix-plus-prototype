-- Add UTILISATEUR to TypeEntiteNote enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'UTILISATEUR' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TypeEntiteNote')
    ) THEN
        ALTER TYPE "TypeEntiteNote" ADD VALUE 'UTILISATEUR';
    END IF;
END$$;
