const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const uri = process.env.MONGO_URI;

mongoose.connect(uri)
  .then(async () => {
    const db = mongoose.connection.db;
    
    // Check for existing Admin
    const adminUser = await db.collection('users').findOne({ role: 'Admin' });
    
    if (adminUser) {
      console.log('ADMIN_EXISTS:');
      console.log('Email:', adminUser.email);
    } else {
      console.log('No Admin found. Creating default admin...');
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await db.collection('users').insertOne({
        name: 'Super Admin',
        email: 'admin@vehiclehub.com',
        password: hashedPassword,
        phone: '0712345678',
        role: 'Admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('ADMIN_CREATED:');
      console.log('Email: admin@vehiclehub.com');
      console.log('Password: admin123');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
