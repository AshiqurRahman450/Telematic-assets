const { Client } = require('pg');
const sequelize = require('./db');
const { Employee, AssetCategory, Asset, AssetHistory } = require('./models');

async function createDatabaseIfNotExists() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'admin',
    database: 'postgres'
  });

  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname='asset_management'");
    if (res.rowCount === 0) {
      console.log('Database "asset_management" does not exist. Creating it...');
      await client.query('CREATE DATABASE asset_management');
      console.log('Database "asset_management" created successfully.');
    } else {
      console.log('Database "asset_management" already exists.');
    }
  } catch (err) {
    console.error('Error during database checking/creation:', err.message);
  } finally {
    await client.end();
  }
}

async function seed() {
  await createDatabaseIfNotExists();

  try {
    // Authenticate and sync the models
    await sequelize.authenticate();
    console.log('Connection to database established successfully.');
    
    // Sync models - drop existing tables and recreate them
    await sequelize.sync({ force: true });
    console.log('Database synchronized (tables dropped & recreated).');

    // 1. Seed Asset Categories
    const categoriesData = [
      { name: 'Laptop' },
      { name: 'Mobile Phone' },
      { name: 'Screw Driver' },
      { name: 'Drill Machine' },
      { name: 'Modem' }
    ];
    const categories = {};
    for (const cat of categoriesData) {
      const created = await AssetCategory.create(cat);
      categories[cat.name] = created.id;
    }
    console.log('Seeded Asset Categories.');

    // 2. Seed Employees
    const employeesData = [
      { employeeId: 'EMP001', name: 'John Doe', email: 'john.doe@company.com', branch: 'New York', status: 'Active' },
      { employeeId: 'EMP002', name: 'Jane Smith', email: 'jane.smith@company.com', branch: 'London', status: 'Active' },
      { employeeId: 'EMP003', name: 'Alice Johnson', email: 'alice.j@company.com', branch: 'Tokyo', status: 'Active' },
      { employeeId: 'EMP004', name: 'Bob Brown', email: 'bob.brown@company.com', branch: 'Berlin', status: 'Active' },
      { employeeId: 'EMP005', name: 'Charlie Green', email: 'charlie.g@company.com', branch: 'New York', status: 'Inactive' }
    ];
    const employees = {};
    for (const emp of employeesData) {
      const created = await Employee.create(emp);
      employees[emp.employeeId] = created.id;
    }
    console.log('Seeded Employees.');

    // 3. Seed Assets
    const assetsData = [
      {
        uniqueId: 'AST001',
        serialNumber: 'SN-LAT-1234',
        categoryId: categories['Laptop'],
        make: 'Dell',
        model: 'Latitude 5420',
        value: 1200.00,
        branch: 'New York',
        status: 'Issued',
        currentEmployeeId: employees['EMP001']
      },
      {
        uniqueId: 'AST002',
        serialNumber: 'SN-MAC-5678',
        categoryId: categories['Laptop'],
        make: 'Apple',
        model: 'MacBook Pro 14',
        value: 2000.00,
        branch: 'New York',
        status: 'Stock',
        currentEmployeeId: null
      },
      {
        uniqueId: 'AST003',
        serialNumber: 'SN-IPH-9012',
        categoryId: categories['Mobile Phone'],
        make: 'Apple',
        model: 'iPhone 13',
        value: 800.00,
        branch: 'London',
        status: 'Issued',
        currentEmployeeId: employees['EMP002']
      },
      {
        uniqueId: 'AST004',
        serialNumber: 'SN-SD-3456',
        categoryId: categories['Screw Driver'],
        make: 'Stanley',
        model: '6-Way Multi-Bit',
        value: 15.00,
        branch: 'Tokyo',
        status: 'Stock',
        currentEmployeeId: null
      },
      {
        uniqueId: 'AST005',
        serialNumber: 'SN-DM-7890',
        categoryId: categories['Drill Machine'],
        make: 'Makita',
        model: 'HP1630 Drill',
        value: 120.00,
        branch: 'Tokyo',
        status: 'Stock',
        currentEmployeeId: null
      },
      {
        uniqueId: 'AST006',
        serialNumber: 'SN-MDM-4321',
        categoryId: categories['Modem'],
        make: 'Netgear',
        model: 'Nighthawk M1',
        value: 250.00,
        branch: 'Berlin',
        status: 'Scrapped',
        currentEmployeeId: null
      }
    ];

    const assets = {};
    for (const a of assetsData) {
      const created = await Asset.create(a);
      assets[a.uniqueId] = created.id;
    }
    console.log('Seeded Assets.');

    // 4. Seed Asset History (Audit logs)
    const historiesData = [
      // AST001
      { assetId: assets['AST001'], action: 'Purchased', details: 'Asset purchased for branch New York. Value: $1200.00', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      { assetId: assets['AST001'], action: 'Issued', details: 'Asset issued to John Doe (EMP001)', employeeId: employees['EMP001'], date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
      
      // AST002
      { assetId: assets['AST002'], action: 'Purchased', details: 'Asset purchased for branch New York. Value: $2000.00', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      
      // AST003
      { assetId: assets['AST003'], action: 'Purchased', details: 'Asset purchased for branch London. Value: $800.00', date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) },
      { assetId: assets['AST003'], action: 'Issued', details: 'Asset issued to Jane Smith (EMP002)', employeeId: employees['EMP002'], date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
      
      // AST004
      { assetId: assets['AST004'], action: 'Purchased', details: 'Asset purchased for branch Tokyo. Value: $15.00', date: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000) },
      
      // AST005
      { assetId: assets['AST005'], action: 'Purchased', details: 'Asset purchased for branch Tokyo. Value: $120.00', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      
      // AST006
      { assetId: assets['AST006'], action: 'Purchased', details: 'Asset purchased for branch Berlin. Value: $250.00', date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
      { assetId: assets['AST006'], action: 'Issued', details: 'Asset issued to Bob Brown (EMP004)', employeeId: employees['EMP004'], date: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000) },
      { assetId: assets['AST006'], action: 'Returned', details: 'Asset returned by Bob Brown (EMP004). Reason: Damaged/Faulty', employeeId: employees['EMP004'], date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { assetId: assets['AST006'], action: 'Scrapped', details: 'Asset scrapped. Reason: Hardware failure, repair not viable.', date: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000) }
    ];

    for (const h of historiesData) {
      await AssetHistory.create(h);
    }
    console.log('Seeded Asset History Audit logs.');

    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
