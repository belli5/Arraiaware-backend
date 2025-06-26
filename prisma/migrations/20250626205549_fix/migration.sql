/*
  Warnings:

  - You are about to drop the column `criterionId` on the `PeerEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `justification` on the `PeerEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `PeerEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `referenceType` on the `ReferenceIndication` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[criterionName]` on the table `EvaluationCriterion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `EvaluationCycle` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `generalScore` to the `PeerEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pointsToExplore` to the `PeerEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pointsToImprove` to the `PeerEvaluation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SelfEvaluation" ADD COLUMN "scoreDescription" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PeerEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project" TEXT,
    "motivatedToWorkAgain" TEXT,
    "generalScore" REAL NOT NULL,
    "pointsToImprove" TEXT NOT NULL,
    "pointsToExplore" TEXT NOT NULL,
    "evaluatedUserId" TEXT,
    "evaluatorUserId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    CONSTRAINT "PeerEvaluation_evaluatedUserId_fkey" FOREIGN KEY ("evaluatedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PeerEvaluation_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PeerEvaluation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "EvaluationCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PeerEvaluation" ("cycleId", "evaluatedUserId", "evaluatorUserId", "id") SELECT "cycleId", "evaluatedUserId", "evaluatorUserId", "id" FROM "PeerEvaluation";
DROP TABLE "PeerEvaluation";
ALTER TABLE "new_PeerEvaluation" RENAME TO "PeerEvaluation";
CREATE TABLE "new_ReferenceIndication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "justification" TEXT NOT NULL,
    "indicatedUserId" TEXT,
    "indicatorUserId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    CONSTRAINT "ReferenceIndication_indicatedUserId_fkey" FOREIGN KEY ("indicatedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReferenceIndication_indicatorUserId_fkey" FOREIGN KEY ("indicatorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReferenceIndication_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "EvaluationCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ReferenceIndication" ("cycleId", "id", "indicatedUserId", "indicatorUserId", "justification") SELECT "cycleId", "id", "indicatedUserId", "indicatorUserId", "justification" FROM "ReferenceIndication";
DROP TABLE "ReferenceIndication";
ALTER TABLE "new_ReferenceIndication" RENAME TO "ReferenceIndication";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationCriterion_criterionName_key" ON "EvaluationCriterion"("criterionName");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationCycle_name_key" ON "EvaluationCycle"("name");
