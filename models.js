const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  employeeId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  branch: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active',
    allowNull: false
  }
});

const AssetCategory = sequelize.define('AssetCategory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  }
});

const Asset = sequelize.define('Asset', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  uniqueId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  serialNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  make: {
    type: DataTypes.STRING,
    allowNull: false
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  branch: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Stock', 'Issued', 'Scrapped'),
    defaultValue: 'Stock',
    allowNull: false
  }
});

const AssetHistory = sequelize.define('AssetHistory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  action: {
    type: DataTypes.STRING, 
    allowNull: false
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
});

// Associations
AssetCategory.hasMany(Asset, { foreignKey: 'categoryId', as: 'assets' });
Asset.belongsTo(AssetCategory, { foreignKey: 'categoryId', as: 'category' });

Employee.hasMany(Asset, { foreignKey: 'currentEmployeeId', as: 'assets' });
Asset.belongsTo(Employee, { foreignKey: 'currentEmployeeId', as: 'currentEmployee' });

Asset.hasMany(AssetHistory, { foreignKey: 'assetId', as: 'history' });
AssetHistory.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });

Employee.hasMany(AssetHistory, { foreignKey: 'employeeId', as: 'history' });
AssetHistory.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

module.exports = {
  sequelize,
  Employee,
  AssetCategory,
  Asset,
  AssetHistory
};
