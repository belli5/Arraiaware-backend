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
    "projectId" TEXT,
    CONSTRAINT "PeerEvaluation_evaluatedUserId_fkey" FOREIGN KEY ("evaluatedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PeerEvaluation_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PeerEvaluation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PeerEvaluation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "EvaluationCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PeerEvaluation" ("cycleId", "evaluatedUserId", "evaluatorUserId", "generalScore", "id", "motivatedToWorkAgain", "pointsToExplore", "pointsToImprove", "project") SELECT "cycleId", "evaluatedUserId", "evaluatorUserId", "generalScore", "id", "motivatedToWorkAgain", "pointsToExplore", "pointsToImprove", "project" FROM "PeerEvaluation";
DROP TABLE "PeerEvaluation";
ALTER TABLE "new_PeerEvaluation" RENAME TO "PeerEvaluation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
