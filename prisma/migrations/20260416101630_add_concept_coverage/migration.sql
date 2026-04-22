-- CreateTable
CREATE TABLE "ConceptCoverage" (
    "id" TEXT NOT NULL,
    "learningId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "coveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConceptCoverage_learningId_idx" ON "ConceptCoverage"("learningId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptCoverage_learningId_concept_key" ON "ConceptCoverage"("learningId", "concept");

-- AddForeignKey
ALTER TABLE "ConceptCoverage" ADD CONSTRAINT "ConceptCoverage_learningId_fkey" FOREIGN KEY ("learningId") REFERENCES "Learning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
