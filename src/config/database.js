const { Sequelize } = require('sequelize');
const config = require('./index');

function createSequelize() {
  if (config.env === 'test') {
    return new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
    });
  }

  // Render provides a DATABASE_URL for PostgreSQL
  if (process.env.DATABASE_URL) {
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
      },
    });
  }

  return new Sequelize(config.db.name, config.db.user, config.db.password, {
    host: config.db.host,
    port: config.db.port,
    dialect: 'mysql',
    logging: config.env === 'development' ? console.log : false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    define: { underscored: true },
  });
}

const sequelize = createSequelize();

module.exports = sequelize;
