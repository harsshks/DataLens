const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { DATASET_STATUS } = require('../config/constants');

const Dataset = sequelize.define(
  'Dataset',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'user_id',
    },
    name: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    originalFilename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'original_filename',
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'file_path',
    },
    rowCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'row_count',
    },
    columnCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'column_count',
    },
    qualityScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'quality_score',
    },
    status: {
      type: DataTypes.ENUM(
        DATASET_STATUS.UPLOADED,
        DATASET_STATUS.PROCESSING,
        DATASET_STATUS.COMPLETED,
        DATASET_STATUS.FAILED
      ),
      allowNull: false,
      defaultValue: DATASET_STATUS.UPLOADED,
    },
    latestVersionNumber: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'latest_version_number',
    },
  },
  {
    tableName: 'datasets',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Dataset;
