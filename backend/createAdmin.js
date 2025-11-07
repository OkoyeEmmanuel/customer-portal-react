require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

// Delete this line in production
mongoose.set('debug', true);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://emmanuelokoye0216_db_user:fkNF9J5k06WVbT6m@cluster0.bnk80fq.mongodb.net/payments_portal?appName=Cluster0';

async function createAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Remove any existing admin
        await Admin.deleteMany({ username: 'admin' });
        console.log('Removed existing admin users');

        // Create a new admin with hashed password
        const password = 'test123'; // Simpler password for testing
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Creating admin with password:', password);

        const admin = new Admin({
            username: 'admin',
            passwordHash: hashedPassword,
            employeeId: 'EMP000001',
            fullName: 'System Administrator',
            role: 'admin'
        });

        await admin.save();
        console.log('Admin user created successfully');
        console.log('Username: admin');
        console.log('Password:', password);
        console.log('Please change this password after first login');

    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await mongoose.connection.close();
    }
}

createAdmin();