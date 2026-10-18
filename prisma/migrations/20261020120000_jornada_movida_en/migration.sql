-- Cuándo se movió la jornada por última vez (inicio, fin o lugar): P8 avisa a quien reservó antes (P-070)
ALTER TABLE "jornada" ADD COLUMN "movida_en" TIMESTAMPTZ;
