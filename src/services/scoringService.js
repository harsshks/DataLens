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
 *
 * Node is the source of truth. Python reports measurements; this module owns the formula.
 */

function round4(value) {
  return Math.round(value * 10000) / 10000;
}

function issueTypeOf(issue) {
  return issue.issue_type || issue.issueType || issue.type;
}

function issueColumnOf(issue) {
  if (Object.prototype.hasOwnProperty.call(issue, 'column_name')) return issue.column_name;
  if (Object.prototype.hasOwnProperty.call(issue, 'columnName')) return issue.columnName;
  if (Object.prototype.hasOwnProperty.call(issue, 'column')) return issue.column;
  return null;
}

function issueCountOf(issue) {
  return issue.issue_count ?? issue.issueCount ?? issue.count ?? 0;
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
    emptyColumns: issues.filter((i) => issueTypeOf(i) === 'EMPTY_COLUMN').length,
    constantColumns: issues.filter((i) => issueTypeOf(i) === 'CONSTANT_COLUMN').length,
    invalidIncidents: issues.filter(
      (i) => issueTypeOf(i) === 'INVALID_TYPE' || issueTypeOf(i) === 'INVALID_DATE'
    ).length,
    inconsistentCategoryCount: issues.filter((i) => issueTypeOf(i) === 'INCONSISTENT_CATEGORY').length,
  };
}

function metricsFromIssues(rowCount, columnCount, issues) {
  const list = issues || [];
  return {
    rowCount: rowCount || 0,
    columnCount: columnCount || 0,
    missingCells: list
      .filter((i) => issueTypeOf(i) === 'MISSING_VALUES' || issueTypeOf(i) === 'EMPTY_COLUMN')
      .reduce((sum, i) => sum + issueCountOf(i), 0),
    duplicateRows: list
      .filter((i) => issueTypeOf(i) === 'DUPLICATES' && !issueColumnOf(i))
      .reduce((sum, i) => sum + issueCountOf(i), 0),
    outlierValues: list
      .filter((i) => issueTypeOf(i) === 'OUTLIER')
      .reduce((sum, i) => sum + issueCountOf(i), 0),
    emptyColumns: list.filter((i) => issueTypeOf(i) === 'EMPTY_COLUMN').length,
    constantColumns: list.filter((i) => issueTypeOf(i) === 'CONSTANT_COLUMN').length,
    invalidIncidents: list.filter(
      (i) => issueTypeOf(i) === 'INVALID_TYPE' || issueTypeOf(i) === 'INVALID_DATE'
    ).length,
    inconsistentCategoryCount: list.filter((i) => issueTypeOf(i) === 'INCONSISTENT_CATEGORY').length,
  };
}

function explainQualityScore(metrics) {
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

  const missingUncapped = missingPct * 0.4;
  const duplicateUncapped = duplicatePct * 0.5;
  const outlierUncapped = outlierPct * 0.4;
  const emptyUncapped = emptyColumns * 8;
  const constantUncapped = constantColumns * 3;
  const invalidUncapped = invalidIncidents > 0 ? 5 + (invalidIncidents - 1) : 0;
  const inconsistentUncapped = inconsistentCategoryCount * 2;

  const missingDeduction = Math.min(20, missingUncapped);
  const duplicateDeduction = Math.min(15, duplicateUncapped);
  const outlierDeduction = Math.min(10, outlierUncapped);
  const emptyDeduction = Math.min(20, emptyUncapped);
  const constantDeduction = Math.min(12, constantUncapped);
  const invalidDeduction = Math.min(15, invalidUncapped);
  const inconsistentDeduction = Math.min(10, inconsistentUncapped);

  const totalDeduction =
    missingDeduction +
    duplicateDeduction +
    outlierDeduction +
    emptyDeduction +
    constantDeduction +
    invalidDeduction +
    inconsistentDeduction;

  const unclampedScore = 100 - totalDeduction;
  const clampedScore = Math.max(0, Math.min(100, unclampedScore));
  const score = Math.round(clampedScore);

  const signals = [
    {
      key: 'missing_cells',
      label: 'Missing cells',
      deduction: round4(missingDeduction),
      cap: 20,
      capped: missingUncapped > 20,
      detail: `${missingCells} missing cells (${round4(missingPct)}% of cells); 0.4 points per 1%`,
    },
    {
      key: 'duplicate_rows',
      label: 'Duplicate rows',
      deduction: round4(duplicateDeduction),
      cap: 15,
      capped: duplicateUncapped > 15,
      detail: `${duplicateRows} duplicate rows (${round4(duplicatePct)}% of rows); 0.5 points per 1%`,
    },
    {
      key: 'outlier_values',
      label: 'IQR outliers',
      deduction: round4(outlierDeduction),
      cap: 10,
      capped: outlierUncapped > 10,
      detail: `${outlierValues} outlier values (${round4(outlierPct)}% of cells); 0.4 points per 1%`,
    },
    {
      key: 'empty_columns',
      label: 'Empty columns',
      deduction: round4(emptyDeduction),
      cap: 20,
      capped: emptyUncapped > 20,
      detail: `${emptyColumns} empty columns; 8 points each`,
    },
    {
      key: 'constant_columns',
      label: 'Constant columns',
      deduction: round4(constantDeduction),
      cap: 12,
      capped: constantUncapped > 12,
      detail: `${constantColumns} constant columns; 3 points each`,
    },
    {
      key: 'invalid_types',
      label: 'Invalid types / dates',
      deduction: round4(invalidDeduction),
      cap: 15,
      capped: invalidUncapped > 15,
      detail:
        invalidIncidents > 0
          ? `${invalidIncidents} invalid type/date incidents; 5 points for the first, +1 each extra`
          : 'No invalid type or date incidents',
    },
    {
      key: 'inconsistent_categories',
      label: 'Inconsistent categories',
      deduction: round4(inconsistentDeduction),
      cap: 10,
      capped: inconsistentUncapped > 10,
      detail: `${inconsistentCategoryCount} columns with inconsistent labels; 2 points each`,
    },
  ];

  return {
    starting_score: 100,
    signals,
    total_deduction: round4(totalDeduction),
    unclamped_score: round4(unclampedScore),
    clamped: unclampedScore < 0 || unclampedScore > 100,
    score,
  };
}

function calculateQualityScore(metrics) {
  return explainQualityScore(metrics).score;
}

function scoreFromAnalysis(analysis) {
  return explainQualityScore(metricsFromAnalysis(analysis)).score;
}

function breakdownFromAnalysis(analysis) {
  return explainQualityScore(metricsFromAnalysis(analysis));
}

function breakdownFromIssues(rowCount, columnCount, issues) {
  return explainQualityScore(metricsFromIssues(rowCount, columnCount, issues));
}

module.exports = {
  calculateQualityScore,
  metricsFromAnalysis,
  metricsFromIssues,
  explainQualityScore,
  scoreFromAnalysis,
  breakdownFromAnalysis,
  breakdownFromIssues,
};
