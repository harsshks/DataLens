const {
  calculateQualityScore,
  scoreFromAnalysis,
  breakdownFromAnalysis,
  breakdownFromIssues,
  explainQualityScore,
} = require('../src/services/scoringService');

const INTEGER_METRICS = {
  rowCount: 100,
  columnCount: 10,
  missingCells: 100,
  duplicateRows: 10,
  outlierValues: 50,
  emptyColumns: 1,
  constantColumns: 1,
  invalidIncidents: 1,
  inconsistentCategoryCount: 1,
};

const INTEGER_BREAKDOWN = {
  starting_score: 100,
  signals: [
    {
      key: 'missing_cells',
      label: 'Missing cells',
      deduction: 4,
      cap: 20,
      capped: false,
      detail: '100 missing cells (10% of cells); 0.4 points per 1%',
    },
    {
      key: 'duplicate_rows',
      label: 'Duplicate rows',
      deduction: 5,
      cap: 15,
      capped: false,
      detail: '10 duplicate rows (10% of rows); 0.5 points per 1%',
    },
    {
      key: 'outlier_values',
      label: 'IQR outliers',
      deduction: 2,
      cap: 10,
      capped: false,
      detail: '50 outlier values (5% of cells); 0.4 points per 1%',
    },
    {
      key: 'empty_columns',
      label: 'Empty columns',
      deduction: 8,
      cap: 20,
      capped: false,
      detail: '1 empty columns; 8 points each',
    },
    {
      key: 'constant_columns',
      label: 'Constant columns',
      deduction: 3,
      cap: 12,
      capped: false,
      detail: '1 constant columns; 3 points each',
    },
    {
      key: 'invalid_types',
      label: 'Invalid types / dates',
      deduction: 5,
      cap: 15,
      capped: false,
      detail: '1 invalid type/date incidents; 5 points for the first, +1 each extra',
    },
    {
      key: 'inconsistent_categories',
      label: 'Inconsistent categories',
      deduction: 2,
      cap: 10,
      capped: false,
      detail: '1 columns with inconsistent labels; 2 points each',
    },
  ],
  total_deduction: 29,
  unclamped_score: 71,
  clamped: false,
  score: 71,
};

const CAPPED_BREAKDOWN = {
  starting_score: 100,
  signals: [
    {
      key: 'missing_cells',
      label: 'Missing cells',
      deduction: 20,
      cap: 20,
      capped: true,
      detail: '100 missing cells (100% of cells); 0.4 points per 1%',
    },
    {
      key: 'duplicate_rows',
      label: 'Duplicate rows',
      deduction: 15,
      cap: 15,
      capped: true,
      detail: '10 duplicate rows (100% of rows); 0.5 points per 1%',
    },
    {
      key: 'outlier_values',
      label: 'IQR outliers',
      deduction: 10,
      cap: 10,
      capped: true,
      detail: '100 outlier values (100% of cells); 0.4 points per 1%',
    },
    {
      key: 'empty_columns',
      label: 'Empty columns',
      deduction: 20,
      cap: 20,
      capped: true,
      detail: '5 empty columns; 8 points each',
    },
    {
      key: 'constant_columns',
      label: 'Constant columns',
      deduction: 12,
      cap: 12,
      capped: true,
      detail: '5 constant columns; 3 points each',
    },
    {
      key: 'invalid_types',
      label: 'Invalid types / dates',
      deduction: 15,
      cap: 15,
      capped: true,
      detail: '20 invalid type/date incidents; 5 points for the first, +1 each extra',
    },
    {
      key: 'inconsistent_categories',
      label: 'Inconsistent categories',
      deduction: 10,
      cap: 10,
      capped: true,
      detail: '20 columns with inconsistent labels; 2 points each',
    },
  ],
  total_deduction: 102,
  unclamped_score: -2,
  clamped: true,
  score: 0,
};

describe('quality score', () => {
  test('starts at 100 for a clean dataset', () => {
    const breakdown = explainQualityScore({
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
    expect(breakdown.score).toBe(100);
    expect(breakdown.total_deduction).toBe(0);
    expect(breakdown.signals.every((signal) => signal.deduction === 0)).toBe(true);
  });

  test('locks integer deductions for a mixed-quality dataset', () => {
    expect(explainQualityScore(INTEGER_METRICS)).toEqual(INTEGER_BREAKDOWN);
    expect(calculateQualityScore(INTEGER_METRICS)).toBe(71);
  });

  test('locks capped deductions and clamps the score at 0', () => {
    const metrics = {
      rowCount: 10,
      columnCount: 10,
      missingCells: 100,
      duplicateRows: 10,
      outlierValues: 100,
      emptyColumns: 5,
      constantColumns: 5,
      invalidIncidents: 20,
      inconsistentCategoryCount: 20,
    };
    expect(explainQualityScore(metrics)).toEqual(CAPPED_BREAKDOWN);
    expect(calculateQualityScore(metrics)).toBe(0);
  });

  test('locks score and line items from analysis JSON', () => {
    const analysis = {
      row_count: 100,
      column_count: 10,
      summary: { missing_cells: 100, duplicate_rows: 10, outlier_values: 50 },
      issues: [
        { issue_type: 'EMPTY_COLUMN', column_name: 'notes' },
        { issue_type: 'CONSTANT_COLUMN', column_name: 'country' },
        { issue_type: 'INVALID_TYPE', column_name: 'age' },
        { issue_type: 'INCONSISTENT_CATEGORY', column_name: 'city' },
      ],
    };
    expect(breakdownFromAnalysis(analysis)).toEqual(INTEGER_BREAKDOWN);
    expect(scoreFromAnalysis(analysis)).toBe(71);
  });

  test('rebuilds measurements from stored issues, including empty-column cells as missing', () => {
    const breakdown = breakdownFromIssues(10, 2, [
      { type: 'MISSING_VALUES', column: 'age', count: 2 },
      { type: 'EMPTY_COLUMN', column: 'notes', count: 10 },
      { type: 'DUPLICATES', column: null, count: 1 },
    ]);
    expect(breakdown.signals.find((s) => s.key === 'missing_cells').detail).toContain('12 missing cells');
    expect(breakdown.signals.find((s) => s.key === 'empty_columns').deduction).toBe(8);
    expect(breakdown.signals.find((s) => s.key === 'duplicate_rows').deduction).toBe(5);
    expect(breakdown.score).toBe(calculateQualityScore({
      rowCount: 10,
      columnCount: 2,
      missingCells: 12,
      duplicateRows: 1,
      outlierValues: 0,
      emptyColumns: 1,
      constantColumns: 0,
      invalidIncidents: 0,
      inconsistentCategoryCount: 0,
    }));
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
