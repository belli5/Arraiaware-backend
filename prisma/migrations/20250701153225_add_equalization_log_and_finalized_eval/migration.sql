-- CreateTable
CREATE TABLE "FinalizedEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "finalScore" INTEGER NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "finalizedById" TEXT NOT NULL,
    "finalizedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalizedEvaluation_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinalizedEvaluation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "EvaluationCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinalizedEvaluation_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "EvaluationCriterion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinalizedEvaluation_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EqualizationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "changeType" TEXT NOT NULL,
    "criterionName" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "observation" TEXT,
    "changedById" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EqualizationLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EqualizationLog_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EqualizationLog_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "EvaluationCycle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FinalizedEvaluation_collaboratorId_cycleId_criterionId_key" ON "FinalizedEvaluation"("collaboratorId", "cycleId", "criterionId");
