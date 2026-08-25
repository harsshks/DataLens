-- Schema reference for MySQL. Sequelize sync() creates these tables at startup.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS datasets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  row_count INT UNSIGNED NULL,
  column_count INT UNSIGNED NULL,
  quality_score INT NULL,
  status ENUM('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'UPLOADED',
  latest_version_number INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_datasets_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS dataset_versions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dataset_id INT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  row_count INT UNSIGNED NULL,
  column_count INT UNSIGNED NULL,
  quality_score INT NULL,
  uploaded_at DATETIME NOT NULL,
  UNIQUE KEY uq_dataset_version (dataset_id, version_number),
  CONSTRAINT fk_versions_dataset FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dataset_columns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dataset_id INT UNSIGNED NOT NULL,
  version_id INT UNSIGNED NOT NULL,
  column_name VARCHAR(255) NOT NULL,
  detected_type VARCHAR(40) NULL,
  null_count INT UNSIGNED NULL,
  unique_count INT UNSIGNED NULL,
  duplicate_count INT UNSIGNED NULL,
  min_value VARCHAR(255) NULL,
  max_value VARCHAR(255) NULL,
  mean_value FLOAT NULL,
  median_value FLOAT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_columns_dataset FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
  CONSTRAINT fk_columns_version FOREIGN KEY (version_id) REFERENCES dataset_versions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quality_issues (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dataset_id INT UNSIGNED NOT NULL,
  version_id INT UNSIGNED NOT NULL,
  issue_type ENUM(
    'MISSING_VALUES',
    'DUPLICATES',
    'INVALID_TYPE',
    'INVALID_DATE',
    'OUTLIER',
    'INCONSISTENT_CATEGORY',
    'EMPTY_COLUMN',
    'CONSTANT_COLUMN'
  ) NOT NULL,
  severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
  column_name VARCHAR(255) NULL,
  issue_count INT UNSIGNED NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_issues_dataset FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
  CONSTRAINT fk_issues_version FOREIGN KEY (version_id) REFERENCES dataset_versions(id) ON DELETE CASCADE
);
