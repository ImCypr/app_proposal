const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`⚠️ MongoDB Connection Error: ${error.message}`);
    console.log(`📌 Hướng dẫn: Vui lòng khởi chạy dịch vụ MongoDB trên máy (hoặc dùng MongoDB Atlas Cloud và cập nhật MONGODB_URI trong backend/.env)`);
  }
};

module.exports = connectDB;
