-- CreateTable
CREATE TABLE "rivalries" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "opponent_id" UUID NOT NULL,
    "prediction_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "winner_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "rivalries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rivalries_creator_id_idx" ON "rivalries"("creator_id");

-- CreateIndex
CREATE INDEX "rivalries_opponent_id_idx" ON "rivalries"("opponent_id");

-- CreateIndex
CREATE INDEX "rivalries_winner_id_idx" ON "rivalries"("winner_id");

-- AddForeignKey
ALTER TABLE "rivalries" ADD CONSTRAINT "rivalries_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rivalries" ADD CONSTRAINT "rivalries_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rivalries" ADD CONSTRAINT "rivalries_prediction_id_fkey" FOREIGN KEY ("prediction_id") REFERENCES "predictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rivalries" ADD CONSTRAINT "rivalries_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
