const { calculateQualityScore, scoreFromAnalysis } = require('../src/services/scoringService');

describe('quality score', () => {
  test('starts at 100 for a clean dataset', () => {
    const score = calculateQualityScore({
      rowCount: 100,
      columnCount: 5,
      missingCells: 0,
      duplicateRows: 0,
      outlierValues: 0,
      emptyColumns: 0,
      constantColumns: 0,
      invalidIncidents: 0,
      inconsistentCategoryCount: 0,
    });
    expect(score).toBe(100);
  });

  test('deducts points for missing values and duplicates', () => {
    const score = calculateQualityScore({
      rowCount: 100,
      columnCount: 10,
      missingCells: 100,
      duplicateRows: 10,
      outlierValues: 0,
      emptyColumns: 0,
      constantColumns: 0,
      invalidIncidents: 0,
      inconsistentCategoryCount: 0,
    });
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(80);
  });

  test('clamps the score at 0', () => {
    const score = calculateQualityScore({
      rowCount: 10,
      columnCount: 10,
      missingCells: 100,
      duplicateRows: 10,
      outlierValues: 100,
      emptyColumns: 5,
      constantColumns: 5,
      invalidIncidents: 20,
      inconsistentCategoryCount: 20,
    });
    expect(score).toBe(0);
  });

  test('computes a score from analysis output', () => {
    const score = scoreFromAnalysis({
      row_count: 10,
      column_count: 3,
      summary: { missing_cells: 2, duplicate_rows: 1, outlier_values: 1 },
      issues: [
        { issue_type: 'EMPTY_COLUMN' },
        { issue_type: 'INCONSISTENT_CATEGORY' },
      ],
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
