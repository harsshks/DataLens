const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, '../analysis/analyze_dataset.py');

function pythonBin() {
  return process.env.PYTHON_BIN || 'python';
}

function runAnalysis(csvPath) {
  return spawnSync(pythonBin(), [script, csvPath], { encoding: 'utf8' });
}

describe('python dataset analysis', () => {
  test('detects missing values, duplicates, and outliers', () => {
    const csvPath = path.join(os.tmpdir(), `dqm-${Date.now()}.csv`);
    fs.writeFileSync(
      csvPath,
      [
        'age,city,joined_on,status',
        '10,Delhi,2020-01-01,active',
        '10,delhi,2020-01-01,Active',
        ',Mumbai,2020-02-02,inactive',
        '1000,Mumbai,not-a-date,Inactive',
        '12,Mumbai,2020-03-03,active',
        '11,Mumbai,2020-04-04,inactive',
        '13,Mumbai,2020-05-05,Active',
        '14,Mumbai,2020-06-06,active',
        '15,Mumbai,2020-07-07,inactive',
        '16,Mumbai,2020-08-08,ACTIVE',
      ].join('\n')
    );

    const result = runAnalysis(csvPath);
    if (result.status !== 0) {
      throw new Error(`Python analysis failed: ${result.stdout || result.stderr}`);
    }

    const report = JSON.parse(result.stdout);
    const types = report.issues.map((issue) => issue.issue_type);

    expect(report.summary.missing_cells).toBeGreaterThan(0);
    expect(types).toEqual(expect.arrayContaining(['MISSING_VALUES']));
    expect(types).toEqual(expect.arrayContaining(['OUTLIER']));
    expect(types).toEqual(expect.arrayContaining(['INCONSISTENT_CATEGORY']));
    expect(types).toEqual(expect.arrayContaining(['INVALID_DATE']));
  });
});
