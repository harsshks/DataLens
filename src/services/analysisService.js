const { spawn } = require('child_process');
const fs = require('fs');
const config = require('../config');
const AppError = require('../utils/AppError');

function runPythonAnalysis(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new AppError('Uploaded file could not be found for analysis', 500, 'ANALYSIS_FAILED'));
      return;
    }

    const child = spawn(config.analysis.pythonBin, [config.analysis.scriptPath, filePath], {
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new AppError('Dataset analysis timed out', 500, 'ANALYSIS_TIMEOUT'));
    }, config.analysis.timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new AppError(
          `Could not start Python analysis (${config.analysis.pythonBin}). ${err.message}`,
          500,
          'ANALYSIS_FAILED'
        )
      );
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        const detail = stderr.trim() || stdout.trim() || `exit code ${code}`;
        reject(new AppError(`Dataset analysis failed: ${detail}`, 500, 'ANALYSIS_FAILED'));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        if (parsed.error) {
          reject(new AppError(parsed.error, 422, 'ANALYSIS_FAILED'));
          return;
        }
        resolve(parsed);
      } catch (err) {
        reject(new AppError('Analysis returned invalid JSON', 500, 'ANALYSIS_FAILED'));
      }
    });
  });
}

module.exports = {
  runPythonAnalysis,
};
