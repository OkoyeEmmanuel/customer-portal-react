const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: String,
    idNumber: String,
    accountNumber: { type: String, unique: true },
    passwordHash: String,
});

module.exports = mongoose.model('User', userSchema);