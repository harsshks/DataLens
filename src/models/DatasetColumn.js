const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DatasetColumn = sequelize.define(
  'DatasetColumn',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    datasetId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'dataset_id',
    },
    versionId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'version_id',
    },
    columnName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'column_name',
    },
    detectedType: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: 'detected_type',
    },
    nullCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'null_count',
    },
    uniqueCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'unique_count',
    },
    duplicateCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'duplicate_count',
    },
    minValue: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'min_value',
    },
    maxValue: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'max_value',
    },
    meanValue: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'mean_value',
    },
    medianValue: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'median_value',
    },
  },
  {
    tableName: 'dataset_columns',
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);

module.exports = DatasetColumn;
