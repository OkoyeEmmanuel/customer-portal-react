const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    amount: { 
        type: String,
        required: true 
    },
    currency: { 
        type: String,
        required: true 
    },
    provider: { 
        type: String,
        required: true,
        enum: ['SWIFT'] 
    },
    beneficiaryName: { 
        type: String,
        required: true 
    },
    beneficiaryAccount: { 
        type: String,
        required: true 
    },
    swiftCode: { 
        type: String,
        required: true 
    },
    status: { 
        type: String,
        enum: ['pending', 'verified', 'submitted_to_swift', 'completed', 'rejected'],
        default: 'pending'
    },
    verifiedBy: {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        employeeId: String,
        verifiedAt: Date,
        notes: String
    },
    submittedBy: {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        employeeId: String,
        submittedAt: Date
    },
    swiftDetails: {
        transactionId: String,
        submissionDate: Date,
        status: { 
            type: String, 
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        },
        responseCode: String,
        responseMessage: String
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Payment', paymentSchema);