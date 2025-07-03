/*
  Warnings:

  - You are about to drop the column `criterionId` on the `LeaderEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `LeaderEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `submissionStatus` on the `LeaderEvaluation` table. All the data in the column will be lost.
  - Added the required column `collaborationScore` to the `LeaderEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deliveryScore` to the `LeaderEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `proactivityScore` to the `LeaderEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `skillScore` to the `LeaderEvaluation` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LeaderEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leaderId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "deliveryScore" INTEGER NOT NULL,
    "proactivityScore" INTEGER NOT NULL,
    "collaborationScore" INTEGER NOT NULL,
    "skillScore" INTEGER NOT NULL,
    "justification" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaderEvaluation_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaderEvaluation_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaderEvaluation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "EvaluationCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LeaderEvaluation" ("collaboratorId", "createdAt", "cycleId", "id", "justification", "leaderId", "updatedAt") SELECT "collaboratorId", "createdAt", "cycleId", "id", "justification", "leaderId", "updatedAt" FROM "LeaderEvaluation";
DROP TABLE "LeaderEvaluation";
ALTER TABLE "new_LeaderEvaluation" RENAME TO "LeaderEvaluation";
CREATE UNIQUE INDEX "LeaderEvaluation_leaderId_collaboratorId_cycleId_key" ON "LeaderEvaluation"("leaderId", "collaboratorId", "cycleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
