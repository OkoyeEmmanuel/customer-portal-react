const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },
    passwordHash: { 
        type: String, 
        required: true 
    },
    employeeId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    fullName: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        default: 'admin' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Method to compare password
adminSchema.methods.comparePassword = async function(password) {
    try {
        return await bcrypt.compare(password, this.passwordHash);
    } catch (error) {
        console.error('Password comparison error:', error);
        return false;
    }
    return result;
};

module.exports = mongoose.model('Admin', adminSchema);