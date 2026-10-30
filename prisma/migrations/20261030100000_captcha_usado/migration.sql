-- Pruebas de ALTCHA ya usadas (ADR-0024): una prueba sirve una sola vez, también con varias
-- instancias de la API. Se borran al vencer.

CREATE TABLE "captcha_usado" (
    "nonce" TEXT NOT NULL,
    "expira_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "captcha_usado_pkey" PRIMARY KEY ("nonce")
);

CREATE INDEX "captcha_usado_expira_en_idx" ON "captcha_usado"("expira_en");
