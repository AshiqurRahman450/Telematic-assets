const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const sequelize = require('./db');
require('./models'); // Ensure models and associations are loaded

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Pug (formerly Jade) template views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Serve static files (optional, we use CDN but good practice)
app.use(express.static(path.join(__dirname, 'public')));

// Connect Router
app.use('/', require('./routes'));

// Catch 404
app.use((req, res) => {
  res.status(404).send('Page Not Found');
});

// Start Server
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection verified for Express server.');
    
    app.listen(PORT, () => {
      console.log(`TELEMATIC ASSETS server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server due to database connection error:', err);
    process.exit(1);
  }
}

startServer();
