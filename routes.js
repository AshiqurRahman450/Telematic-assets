const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Employee, AssetCategory, Asset, AssetHistory } = require('./models');

// Middleware to inject current URL path into templates (for sidebar active matching)
router.use((req, res, next) => {
  res.locals.path = req.path;
  res.locals.success_msg = req.query.success;
  res.locals.error_msg = req.query.error;
  next();
});

// 1. Dashboard Route
router.get('/', async (req, res) => {
  try {
    const totalAssets = await Asset.count();
    const stockAssets = await Asset.count({ where: { status: 'Stock' } });
    const issuedAssets = await Asset.count({ where: { status: 'Issued' } });
    const scrappedAssets = await Asset.count({ where: { status: 'Scrapped' } });

    const rawStockValue = await Asset.sum('value', { where: { status: 'Stock' } });
    const stockValue = parseFloat(rawStockValue) || 0.00;

    const rawScrappedValue = await Asset.sum('value', { where: { status: 'Scrapped' } });
    const scrappedValue = parseFloat(rawScrappedValue) || 0.00;

    const avgValue = stockAssets > 0 ? stockValue / stockAssets : 0.00;

    const activeEmployees = await Employee.count({ where: { status: 'Active' } });
    const inactiveEmployees = await Employee.count({ where: { status: 'Inactive' } });

    const recentHistory = await AssetHistory.findAll({
      limit: 6,
      order: [['date', 'DESC']],
      include: [
        { model: Asset, as: 'asset' },
        { model: Employee, as: 'employee' }
      ]
    });

    const stats = {
      totalAssets,
      stockAssets,
      issuedAssets,
      scrappedAssets,
      stockValue,
      scrappedValue,
      avgValue,
      activeEmployees,
      inactiveEmployees
    };

    res.render('index', { stats, recentHistory });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error loading dashboard.');
  }
});

// 2. Categories CRUD
router.get('/categories', async (req, res) => {
  try {
    const categories = await AssetCategory.findAll({
      include: [{ model: Asset, as: 'assets' }],
      order: [['id', 'ASC']]
    });
    res.render('categories', { categories });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error loading categories.');
  }
});

router.get('/categories/new', (req, res) => {
  res.render('category-form', { category: null });
});

router.post('/categories/new', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.redirect('/categories/new?error=Category+name+is+required');
    }
    
    // Check if category name is unique
    const existing = await AssetCategory.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.redirect('/categories/new?error=Category+name+must+be+unique');
    }

    await AssetCategory.create({ name: name.trim() });
    res.redirect('/categories?success=Category+created+successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/categories/new?error=Failed+to+create+category');
  }
});

router.get('/categories/edit/:id', async (req, res) => {
  try {
    const category = await AssetCategory.findByPk(req.params.id);
    if (!category) {
      return res.redirect('/categories?error=Category+not+found');
    }
    res.render('category-form', { category });
  } catch (err) {
    console.error(err);
    res.redirect('/categories?error=Server+Error');
  }
});

router.post('/categories/edit/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const category = await AssetCategory.findByPk(req.params.id);
    if (!category) {
      return res.redirect('/categories?error=Category+not+found');
    }

    if (!name || !name.trim()) {
      return res.redirect(`/categories/edit/${category.id}?error=Category+name+is+required`);
    }

    const existing = await AssetCategory.findOne({
      where: {
        name: name.trim(),
        id: { [Op.ne]: category.id }
      }
    });
    if (existing) {
      return res.redirect(`/categories/edit/${category.id}?error=Category+name+already+exists`);
    }

    category.name = name.trim();
    await category.save();
    res.redirect('/categories?success=Category+updated+successfully');
  } catch (err) {
    console.error(err);
    res.redirect(`/categories/edit/${req.params.id}?error=Failed+to+update+category`);
  }
});

// 3. Employees CRUD
router.get('/employees', async (req, res) => {
  try {
    const statusFilter = req.query.status || 'all';
    let whereClause = {};
    if (statusFilter === 'Active' || statusFilter === 'Inactive') {
      whereClause.status = statusFilter;
    }

    const employees = await Employee.findAll({
      where: whereClause,
      order: [['employeeId', 'ASC']]
    });
    res.render('employees', { employees, statusFilter });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error loading employees.');
  }
});

router.get('/employees/new', (req, res) => {
  res.render('employee-form', { employee: null });
});

router.post('/employees/new', async (req, res) => {
  try {
    const { employeeId, name, email, branch, status } = req.body;
    
    // Validate unique employeeId
    const existing = await Employee.findOne({ where: { employeeId } });
    if (existing) {
      return res.redirect('/employees/new?error=Employee+ID+must+be+unique');
    }

    await Employee.create({ employeeId, name, email, branch, status });
    res.redirect('/employees?success=Employee+added+successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/employees/new?error=Failed+to+create+employee');
  }
});

router.get('/employees/edit/:id', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      return res.redirect('/employees?error=Employee+not+found');
    }
    res.render('employee-form', { employee });
  } catch (err) {
    console.error(err);
    res.redirect('/employees?error=Server+Error');
  }
});

router.post('/employees/edit/:id', async (req, res) => {
  try {
    const { name, email, branch, status } = req.body;
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      return res.redirect('/employees?error=Employee+not+found');
    }

    employee.name = name;
    employee.email = email;
    employee.branch = branch;
    employee.status = status;
    await employee.save();

    res.redirect('/employees?success=Employee+updated+successfully');
  } catch (err) {
    console.error(err);
    res.redirect(`/employees/edit/${req.params.id}?error=Failed+to+update+employee`);
  }
});

// 4. Asset CRUD
router.get('/assets', async (req, res) => {
  try {
    const selectedCategory = req.query.categoryId || '';
    const selectedStatus = req.query.status || '';

    let whereClause = {};
    
    if (selectedCategory) {
      whereClause.categoryId = selectedCategory;
    }

    if (selectedStatus) {
      whereClause.status = selectedStatus;
    } else {
      // By default, exclude scrapped assets from normal view pages
      whereClause.status = { [Op.ne]: 'Scrapped' };
    }

    const assets = await Asset.findAll({
      where: whereClause,
      include: [
        { model: AssetCategory, as: 'category' },
        { model: Employee, as: 'currentEmployee' }
      ],
      order: [['uniqueId', 'ASC']]
    });

    const categories = await AssetCategory.findAll({ order: [['name', 'ASC']] });

    res.render('assets', { assets, categories, selectedCategory, selectedStatus });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error loading assets.');
  }
});

router.get('/assets/new', async (req, res) => {
  try {
    const categories = await AssetCategory.findAll({ order: [['name', 'ASC']] });
    res.render('asset-form', { asset: null, categories });
  } catch (err) {
    console.error(err);
    res.redirect('/assets?error=Server+Error');
  }
});

router.post('/assets/new', async (req, res) => {
  try {
    const { uniqueId, serialNumber, categoryId, make, model, value, branch } = req.body;
    
    // Validate uniqueness
    const existingId = await Asset.findOne({ where: { uniqueId } });
    if (existingId) {
      const categories = await AssetCategory.findAll({ order: [['name', 'ASC']] });
      return res.render('asset-form', { asset: null, categories, error_msg: 'Asset Unique ID must be unique.' });
    }

    const existingSN = await Asset.findOne({ where: { serialNumber } });
    if (existingSN) {
      const categories = await AssetCategory.findAll({ order: [['name', 'ASC']] });
      return res.render('asset-form', { asset: null, categories, error_msg: 'Serial Number must be unique.' });
    }

    const newAsset = await Asset.create({
      uniqueId,
      serialNumber,
      categoryId,
      make,
      model,
      value: parseFloat(value) || 0.00,
      branch,
      status: 'Stock'
    });

    // Log history of purchase
    await AssetHistory.create({
      assetId: newAsset.id,
      action: 'Purchased',
      details: `Asset registered in stock under branch: ${branch}. Value: $${value}.`
    });

    res.redirect('/assets?success=Asset+added+successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/assets/new?error=Failed+to+create+asset');
  }
});

router.get('/assets/edit/:id', async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) {
      return res.redirect('/assets?error=Asset+not+found');
    }
    const categories = await AssetCategory.findAll({ order: [['name', 'ASC']] });
    res.render('asset-form', { asset, categories });
  } catch (err) {
    console.error(err);
    res.redirect('/assets?error=Server+Error');
  }
});

router.post('/assets/edit/:id', async (req, res) => {
  try {
    const { serialNumber, categoryId, make, model, value, branch } = req.body;
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) {
      return res.redirect('/assets?error=Asset+not+found');
    }

    // Check unique serialNumber
    const existingSN = await Asset.findOne({
      where: {
        serialNumber,
        id: { [Op.ne]: asset.id }
      }
    });
    if (existingSN) {
      const categories = await AssetCategory.findAll({ order: [['name', 'ASC']] });
      return res.render('asset-form', { asset, categories, error_msg: 'Serial Number already registered to another asset.' });
    }

    asset.serialNumber = serialNumber;
    asset.categoryId = categoryId;
    asset.make = make;
    asset.model = model;
    asset.value = parseFloat(value) || 0.00;
    asset.branch = branch;
    await asset.save();

    res.redirect('/assets?success=Asset+updated+successfully');
  } catch (err) {
    console.error(err);
    res.redirect(`/assets/edit/${req.params.id}?error=Failed+to+update+asset`);
  }
});

// 5. Stock View Route
router.get('/stock', async (req, res) => {
  try {
    const assets = await Asset.findAll({
      where: { status: 'Stock' },
      include: [{ model: AssetCategory, as: 'category' }],
      order: [['uniqueId', 'ASC']]
    });

    // Calculate aggregate totals
    const totalCount = assets.length;
    const totalValue = assets.reduce((sum, a) => sum + parseFloat(a.value), 0);

    // Group count and value by branch location
    const branchMap = {};
    assets.forEach(a => {
      if (!branchMap[a.branch]) {
        branchMap[a.branch] = { branch: a.branch, count: 0, value: 0 };
      }
      branchMap[a.branch].count += 1;
      branchMap[a.branch].value += parseFloat(a.value);
    });

    const branchTotals = Object.values(branchMap);

    res.render('stock', { assets, branchTotals, totalCount, totalValue });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error loading stock view.');
  }
});

// 6. Operations routes
// A. Issue Asset
router.get('/operations/issue', async (req, res) => {
  try {
    const assets = await Asset.findAll({
      where: { status: 'Stock' },
      order: [['uniqueId', 'ASC']]
    });
    const employees = await Employee.findAll({
      where: { status: 'Active' },
      order: [['name', 'ASC']]
    });
    res.render('issue', { assets, employees });
  } catch (err) {
    console.error(err);
    res.redirect('/?error=Server+Error');
  }
});

router.post('/operations/issue', async (req, res) => {
  try {
    const { assetId, employeeId, issueDate, notes } = req.body;
    
    const asset = await Asset.findByPk(assetId);
    const employee = await Employee.findByPk(employeeId);

    if (!asset || asset.status !== 'Stock') {
      return res.redirect('/operations/issue?error=Asset+is+not+available+in+stock');
    }
    if (!employee || employee.status !== 'Active') {
      return res.redirect('/operations/issue?error=Employee+is+not+active');
    }

    // Process issue
    asset.status = 'Issued';
    asset.currentEmployeeId = employee.id;
    await asset.save();

    await AssetHistory.create({
      assetId: asset.id,
      employeeId: employee.id,
      action: 'Issued',
      details: notes ? `Asset issued to ${employee.name} (${employee.employeeId}). Notes: ${notes}` : `Asset issued to ${employee.name} (${employee.employeeId}).`,
      date: new Date(issueDate)
    });

    res.redirect('/operations/issue?success=Asset+successfully+issued+to+employee');
  } catch (err) {
    console.error(err);
    res.redirect('/operations/issue?error=Failed+to+issue+asset');
  }
});

// B. Return Asset
router.get('/operations/return', async (req, res) => {
  try {
    const assets = await Asset.findAll({
      where: { status: 'Issued' },
      include: [{ model: Employee, as: 'currentEmployee' }],
      order: [['uniqueId', 'ASC']]
    });
    res.render('return', { assets });
  } catch (err) {
    console.error(err);
    res.redirect('/?error=Server+Error');
  }
});

router.post('/operations/return', async (req, res) => {
  try {
    const { assetId, reason, returnDate, notes } = req.body;
    
    const asset = await Asset.findByPk(assetId);
    if (!asset || asset.status !== 'Issued') {
      return res.redirect('/operations/return?error=Asset+is+not+currently+issued');
    }

    const previousEmployeeId = asset.currentEmployeeId;

    // Process Return
    asset.status = 'Stock';
    asset.currentEmployeeId = null;
    await asset.save();

    await AssetHistory.create({
      assetId: asset.id,
      employeeId: previousEmployeeId,
      action: 'Returned',
      details: `Asset returned. Reason: ${reason}. Notes: ${notes || 'None'}`,
      date: new Date(returnDate)
    });

    res.redirect('/operations/return?success=Asset+successfully+returned+to+stock');
  } catch (err) {
    console.error(err);
    res.redirect('/operations/return?error=Failed+to+return+asset');
  }
});

// C. Scrap Asset
router.get('/operations/scrap', async (req, res) => {
  try {
    const assets = await Asset.findAll({
      where: { status: { [Op.ne]: 'Scrapped' } },
      order: [['uniqueId', 'ASC']]
    });
    res.render('scrap', { assets });
  } catch (err) {
    console.error(err);
    res.redirect('/?error=Server+Error');
  }
});

router.post('/operations/scrap', async (req, res) => {
  try {
    const { assetId, reason, scrapDate, notes } = req.body;
    const asset = await Asset.findByPk(assetId);
    if (!asset || asset.status === 'Scrapped') {
      return res.redirect('/operations/scrap?error=Asset+already+scrapped+or+invalid');
    }

    const previousEmployeeId = asset.currentEmployeeId;

    // Decommission
    asset.status = 'Scrapped';
    asset.currentEmployeeId = null;
    await asset.save();

    await AssetHistory.create({
      assetId: asset.id,
      employeeId: previousEmployeeId || null,
      action: 'Scrapped',
      details: `Asset scrapped/decommissioned. Reason: ${reason}. Notes: ${notes || 'None'}`,
      date: new Date(scrapDate)
    });

    res.redirect('/operations/scrap?success=Asset+successfully+decommissioned+and+scrapped');
  } catch (err) {
    console.error(err);
    res.redirect('/operations/scrap?error=Failed+to+scrap+asset');
  }
});

// 7. History & Audit Timeline Route
router.get('/history', async (req, res) => {
  try {
    const assetId = req.query.assetId || null;
    let selectedAsset = null;
    let history = [];

    if (assetId) {
      selectedAsset = await Asset.findByPk(assetId, {
        include: [
          { model: AssetCategory, as: 'category' },
          { model: Employee, as: 'currentEmployee' }
        ]
      });

      if (selectedAsset) {
        history = await AssetHistory.findAll({
          where: { assetId: selectedAsset.id },
          include: [{ model: Employee, as: 'employee' }],
          order: [['date', 'DESC'], ['id', 'DESC']]
        });
      }
    } else {
      // General audit trail
      history = await AssetHistory.findAll({
        include: [
          { model: Asset, as: 'asset' },
          { model: Employee, as: 'employee' }
        ],
        order: [['date', 'DESC'], ['id', 'DESC']],
        limit: 100 // cap at 100 recent entries
      });
    }

    // Load list of all assets for selector dropdown
    const allAssets = await Asset.findAll({
      order: [['uniqueId', 'ASC']]
    });

    res.render('history', { allAssets, selectedAsset, history });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error loading audit trail.');
  }
});

module.exports = router;
