const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('demodb', 'postgres', 'admin', {
  host: 'localhost',
  dialect: 'postgres',
  port: 5432,
  logging: false, // Set to console.log if debugging SQL queries
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;
