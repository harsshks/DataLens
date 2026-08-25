const sequelize = require('../config/database');
const User = require('./User');
const Dataset = require('./Dataset');
const DatasetColumn = require('./DatasetColumn');
const QualityIssue = require('./QualityIssue');
const DatasetVersion = require('./DatasetVersion');

User.hasMany(Dataset, { foreignKey: 'userId', as: 'datasets' });
Dataset.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

Dataset.hasMany(DatasetVersion, { foreignKey: 'datasetId', as: 'versions', onDelete: 'CASCADE' });
DatasetVersion.belongsTo(Dataset, { foreignKey: 'datasetId', as: 'dataset' });

Dataset.hasMany(DatasetColumn, { foreignKey: 'datasetId', as: 'columns', onDelete: 'CASCADE' });
DatasetColumn.belongsTo(Dataset, { foreignKey: 'datasetId', as: 'dataset' });
DatasetVersion.hasMany(DatasetColumn, { foreignKey: 'versionId', as: 'columns', onDelete: 'CASCADE' });
DatasetColumn.belongsTo(DatasetVersion, { foreignKey: 'versionId', as: 'version' });

Dataset.hasMany(QualityIssue, { foreignKey: 'datasetId', as: 'issues', onDelete: 'CASCADE' });
QualityIssue.belongsTo(Dataset, { foreignKey: 'datasetId', as: 'dataset' });
DatasetVersion.hasMany(QualityIssue, { foreignKey: 'versionId', as: 'issues', onDelete: 'CASCADE' });
QualityIssue.belongsTo(DatasetVersion, { foreignKey: 'versionId', as: 'version' });

async function initDatabase() {
  await sequelize.authenticate();
  await sequelize.sync();
}

module.exports = {
  sequelize,
  User,
  Dataset,
  DatasetColumn,
  QualityIssue,
  DatasetVersion,
  initDatabase,
};
