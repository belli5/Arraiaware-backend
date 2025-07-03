-- CreateTable
CREATE TABLE "DirectReportEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collaboratorId" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "visionScore" INTEGER NOT NULL,
    "inspirationScore" INTEGER NOT NULL,
    "developmentScore" INTEGER NOT NULL,
    "feedbackScore" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DirectReportEvaluation_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DirectReportEvaluation_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DirectReportEvaluation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "EvaluationCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DirectReportEvaluation_collaboratorId_leaderId_cycleId_key" ON "DirectReportEvaluation"("collaboratorId", "leaderId", "cycleId");
