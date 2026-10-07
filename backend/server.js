const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const seedData = require('./utils/seed');
const User = require('./models/User');

// Load env vars
dotenv.config();

// Connect to database and auto-seed if empty
connectDB().then(async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('⚡ Cơ sở dữ liệu đang trống, tự động nạp seed data...');
      await seedData(false);
    }
  } catch (err) {
    // Database connection error handled in connectDB
  }
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/purchase-proposals', require('./routes/purchaseProposalRoutes'));
app.use('/api/advance-proposals', require('./routes/advanceProposalRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Manual Seed API endpoint
app.post('/api/seed', async (req, res) => {
  try {
    await seedData(false);
    res.json({ success: true, message: 'Nạp dữ liệu mẫu thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
