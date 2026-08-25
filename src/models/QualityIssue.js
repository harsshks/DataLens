const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { ISSUE_TYPES, SEVERITY } = require('../config/constants');

const QualityIssue = sequelize.define(
  'QualityIssue',
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
    issueType: {
      type: DataTypes.ENUM(...Object.values(ISSUE_TYPES)),
      allowNull: false,
      field: 'issue_type',
    },
    severity: {
      type: DataTypes.ENUM(...Object.values(SEVERITY)),
      allowNull: false,
    },
    columnName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'column_name',
    },
    issueCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'issue_count',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: 'quality_issues',
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);

module.exports = QualityIssue;
