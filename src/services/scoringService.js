/**
 * Transparent quality score: start at 100, deduct for measured issues, clamp to [0, 100].
 *
 * Deductions (each capped independently):
 * - Missing cells: 0.4 points per 1% of all cells missing, max 20
 * - Duplicate rows: 0.5 points per 1% of rows duplicated, max 15
 * - Outlier values: 0.4 points per 1% of cells flagged as IQR outliers, max 10
 * - Empty columns: 8 points each, max 20
 * - Constant columns: 3 points each, max 12
 * - Invalid types/dates: 5 points if any, plus 1 per additional incident, max 15
 * - Inconsistent categories: 2 points per column group, max 10
 */
function calculateQualityScore(metrics) {
  const rowCount = metrics.rowCount || 0;
  const columnCount = metrics.columnCount || 0;
  const missingCells = metrics.missingCells || 0;
  const duplicateRows = metrics.duplicateRows || 0;
  const outlierValues = metrics.outlierValues || 0;
  const emptyColumns = metrics.emptyColumns || 0;
  const constantColumns = metrics.constantColumns || 0;
  const invalidIncidents = metrics.invalidIncidents || 0;
  const inconsistentCategoryCount = metrics.inconsistentCategoryCount || 0;

  const totalCells = Math.max(rowCount * columnCount, 1);
  const missingPct = (missingCells / totalCells) * 100;
  const duplicatePct = rowCount > 0 ? (duplicateRows / rowCount) * 100 : 0;
  const outlierPct = (outlierValues / totalCells) * 100;

  let score = 100;
  score -= Math.min(20, missingPct * 0.4);
  score -= Math.min(15, duplicatePct * 0.5);
  score -= Math.min(10, outlierPct * 0.4);
  score -= Math.min(20, emptyColumns * 8);
  score -= Math.min(12, constantColumns * 3);

  if (invalidIncidents > 0) {
    score -= Math.min(15, 5 + (invalidIncidents - 1));
  }

  score -= Math.min(10, inconsistentCategoryCount * 2);

  return Math.round(Math.max(0, Math.min(100, score)));
}

function metricsFromAnalysis(analysis) {
  const issues = analysis.issues || [];
  const summary = analysis.summary || {};

  return {
    rowCount: analysis.row_count || 0,
    columnCount: analysis.column_count || 0,
    missingCells: summary.missing_cells || 0,
    duplicateRows: summary.duplicate_rows || 0,
    outlierValues: summary.outlier_values || 0,
    emptyColumns: issues.filter((i) => i.issue_type === 'EMPTY_COLUMN').length,
    constantColumns: issues.filter((i) => i.issue_type === 'CONSTANT_COLUMN').length,
    invalidIncidents: issues.filter(
      (i) => i.issue_type === 'INVALID_TYPE' || i.issue_type === 'INVALID_DATE'
    ).length,
    inconsistentCategoryCount: issues.filter((i) => i.issue_type === 'INCONSISTENT_CATEGORY').length,
  };
}

function scoreFromAnalysis(analysis) {
  return calculateQualityScore(metricsFromAnalysis(analysis));
}

module.exports = {
  calculateQualityScore,
  metricsFromAnalysis,
  scoreFromAnalysis,
};
