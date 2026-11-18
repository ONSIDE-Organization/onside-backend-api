-- CreateEnum
CREATE TYPE "MatchweekStatus" AS ENUM ('UPCOMING', 'LIVE', 'FINISHED', 'LOCKED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('UPCOMING', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "PredictionCategory" AS ENUM ('TEAMS', 'GOALSCORERS', 'ASSISTS', 'MATCHWEEK', 'MANAGERS');

-- CreateEnum
CREATE TYPE "ResolutionType" AS ENUM ('AUTO_FIXTURE_RESULT', 'AUTO_PLAYER_STAT', 'AUTO_TEAM_STAT', 'MANUAL');

-- CreateEnum
CREATE TYPE "PredictionStatus" AS ENUM ('OPEN', 'LOCKED', 'RESOLVED', 'VOID');

-- CreateTable
CREATE TABLE "matchweeks" (
    "id" UUID NOT NULL,
    "season" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "MatchweekStatus" NOT NULL DEFAULT 'UPCOMING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matchweeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "external_id" INTEGER NOT NULL,
    "matchweek_id" UUID NOT NULL,
    "home_team" TEXT NOT NULL,
    "away_team" TEXT NOT NULL,
    "kickoff" TIMESTAMP(3) NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'UPCOMING',
    "home_score" INTEGER,
    "away_score" INTEGER,
    "result" TEXT,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" UUID NOT NULL,
    "matchweek_id" UUID NOT NULL,
    "match_id" UUID,
    "category" "PredictionCategory" NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "resolution_type" "ResolutionType" NOT NULL,
    "resolution_config" JSONB,
    "status" "PredictionStatus" NOT NULL DEFAULT 'OPEN',
    "correct_option" TEXT,
    "points_value" INTEGER NOT NULL DEFAULT 10,
    "deadline" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_predictions" (
    "id" UUID NOT NULL,
    "prediction_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "selected_option" TEXT NOT NULL,
    "is_correct" BOOLEAN,
    "points_awarded" INTEGER,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "matchweeks_season_week_number_key" ON "matchweeks"("season", "week_number");

-- CreateIndex
CREATE UNIQUE INDEX "matches_external_id_key" ON "matches"("external_id");

-- CreateIndex
CREATE INDEX "matches_matchweek_id_idx" ON "matches"("matchweek_id");

-- CreateIndex
CREATE INDEX "predictions_matchweek_id_status_idx" ON "predictions"("matchweek_id", "status");

-- CreateIndex
CREATE INDEX "predictions_deadline_idx" ON "predictions"("deadline");

-- CreateIndex
CREATE INDEX "user_predictions_user_id_idx" ON "user_predictions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_predictions_prediction_id_user_id_key" ON "user_predictions"("prediction_id", "user_id");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_matchweek_id_fkey" FOREIGN KEY ("matchweek_id") REFERENCES "matchweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_matchweek_id_fkey" FOREIGN KEY ("matchweek_id") REFERENCES "matchweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_predictions" ADD CONSTRAINT "user_predictions_prediction_id_fkey" FOREIGN KEY ("prediction_id") REFERENCES "predictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_predictions" ADD CONSTRAINT "user_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
