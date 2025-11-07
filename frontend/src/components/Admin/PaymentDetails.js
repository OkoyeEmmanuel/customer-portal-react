import React, { useState } from 'react';
import api from '../../setupAxios';
import './Admin.css';

const PaymentDetails = ({ payment, onUpdate }) => {
    const [verificationNotes, setVerificationNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleVerification = async (action) => {
        try {
            setIsSubmitting(true);
            setError('');
            
            console.log('Verifying payment:', {
                paymentId: payment._id,
                action,
                notes: verificationNotes
            });
            
            const response = await api.post(`/api/admin/payments/${payment._id}/verify`, {
                action,
                notes: verificationNotes
            });

            console.log('Verification response:', response.data);
            if (response.data) {
                onUpdate();
            }
        } catch (err) {
            console.error('Verification error:', err);
            setError(err.response?.data?.error || 'Failed to verify payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSwiftSubmission = async () => {
        try {
            setIsSubmitting(true);
            setError('');
            
            console.log('Submitting to SWIFT:', {
                paymentId: payment._id,
                status: payment.status
            });

            const response = await api.post(`/api/admin/payments/${payment._id}/submit-to-swift`, {
                swiftDetails: {
                    // Add any additional SWIFT details if needed
                    submitDate: new Date().toISOString()
                }
            });
            
            console.log('SWIFT submission response:', response.data);
            if (response.data) {
                onUpdate();
            }
        } catch (err) {
            console.error('SWIFT submission error:', err);
            setError(err.response?.data?.error || 'Failed to submit to SWIFT');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderVerificationSection = () => {
        if (payment.status !== 'pending') return null;

        return (
            <div className="verification-section">
                <h4>Payment Verification</h4>
                <textarea
                    placeholder="Add verification notes (optional)"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    className="verification-notes"
                />
                <div className="verification-buttons">
                    <button 
                        onClick={() => handleVerification('verify')}
                        disabled={isSubmitting}
                        className="verify-button"
                    >
                        Verify Payment
                    </button>
                    <button 
                        onClick={() => handleVerification('reject')}
                        disabled={isSubmitting}
                        className="reject-button"
                    >
                        Reject Payment
                    </button>
                </div>
            </div>
        );
    };

    const renderSwiftSection = () => {
        if (payment.status !== 'verified') return null;

        return (
            <div className="swift-section">
                <h4>SWIFT Submission</h4>
                <button 
                    onClick={handleSwiftSubmission}
                    disabled={isSubmitting}
                    className="swift-submit-button"
                >
                    Submit to SWIFT
                </button>
            </div>
        );
    };

    const renderStatusSection = () => {
        const getStatusClass = () => {
            switch (payment.status) {
                case 'verified': return 'status-verified';
                case 'submitted_to_swift': return 'status-swift';
                case 'completed': return 'status-completed';
                case 'rejected': return 'status-rejected';
                default: return 'status-pending';
            }
        };

        return (
            <div className="status-section">
                <h4>Payment Status</h4>
                <div className={`status-badge ${getStatusClass()}`}>
                    {payment.status.replace('_', ' ').toUpperCase()}
                </div>
                {payment.verifiedBy && (
                    <div className="verification-info">
                        <p>Verified by: {payment.verifiedBy.employeeId}</p>
                        <p>Date: {new Date(payment.verifiedBy.verifiedAt).toLocaleString()}</p>
                        {payment.verifiedBy.notes && (
                            <p>Notes: {payment.verifiedBy.notes}</p>
                        )}
                    </div>
                )}
                {payment.swiftDetails && (
                    <div className="swift-info">
                        <p><strong>SWIFT Transaction ID:</strong> {payment.swiftDetails.transactionId || 'Pending'}</p>
                        <p><strong>Submitted:</strong> {payment.swiftDetails.submissionDate ? 
                            new Date(payment.swiftDetails.submissionDate).toLocaleString() : 
                            'Not yet submitted'}</p>
                        <p><strong>Status:</strong> {payment.swiftDetails.status ? 
                            payment.swiftDetails.status.toUpperCase() : 'PENDING'}</p>
                        {payment.swiftDetails.responseMessage && (
                            <p><strong>Response:</strong> {payment.swiftDetails.responseMessage}</p>
                        )}
                        {payment.submittedBy && (
                            <>
                                <p><strong>Submitted by:</strong> {payment.submittedBy.employeeId}</p>
                                <p><strong>Submission time:</strong> {new Date(payment.submittedBy.submittedAt).toLocaleString()}</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="payment-details">
            <div className="payment-info">
                <h3>Payment Details</h3>
                <p><strong>Amount:</strong> {payment.amount} {payment.currency}</p>
                <p><strong>Beneficiary:</strong> {payment.beneficiaryName}</p>
                <p><strong>Account:</strong> {payment.beneficiaryAccount}</p>
                <p><strong>SWIFT Code:</strong> {payment.swiftCode}</p>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            {renderStatusSection()}
            {renderVerificationSection()}
            {renderSwiftSection()}
        </div>
    );
};

export default PaymentDetails;