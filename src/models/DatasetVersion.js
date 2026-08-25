const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DatasetVersion = sequelize.define(
  'DatasetVersion',
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
    versionNumber: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'version_number',
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
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'uploaded_at',
    },
  },
  {
    tableName: 'dataset_versions',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['dataset_id', 'version_number'],
      },
    ],
  }
);

module.exports = DatasetVersion;
