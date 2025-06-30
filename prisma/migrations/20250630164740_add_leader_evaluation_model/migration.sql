-- CreateTable
CREATE TABLE "LeaderEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "score" INTEGER NOT NULL,
    "justification" TEXT NOT NULL,
    "submissionStatus" TEXT NOT NULL DEFAULT 'Pendente',
    "leaderId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaderEvaluation_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaderEvaluation_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaderEvaluation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "EvaluationCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaderEvaluation_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "EvaluationCriterion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaderEvaluation_leaderId_collaboratorId_cycleId_criterionId_key" ON "LeaderEvaluation"("leaderId", "collaboratorId", "cycleId", "criterionId");
