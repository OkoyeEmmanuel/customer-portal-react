import React, { useState, useEffect } from 'react';
import api from '../../setupAxios';
import PaymentDetails from './PaymentDetails';
import './Admin.css';

const AdminDashboard = ({ onLogout }) => {
    const [payments, setPayments] = useState([]);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [filter, setFilter] = useState('all');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchPayments();
        // Set up periodic refresh
        const interval = setInterval(fetchPayments, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchPayments = async () => {
        try {
            console.log('Fetching payments...');
            const response = await api.get('/api/admin/payments');
            console.log('Payments response:', response.data);
            setPayments(response.data);
            setError(''); // Clear any existing error
        } catch (err) {
            console.error('Error fetching payments:', err);
            if (err.response?.status === 401) {
                onLogout();
            } else {
                setError('Failed to fetch payments: ' + (err.response?.data?.error || err.message));
            }
        }
    };

    const handleLogout = async () => {
        try {
            console.log('Logging out...');
            await api.post('/api/admin/logout');
            console.log('Logged out successfully');
            localStorage.removeItem('isAdmin');
            // Clear all state
            setPayments([]);
            setSelectedPayment(null);
            setFilter('all');
            setError('');
            setSuccess('');
            // Call the onLogout callback
            onLogout();
        } catch (err) {
            console.error('Logout error:', err);
            setError('Logout failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handlePaymentSelect = (payment) => {
        setSelectedPayment(payment);
        setError('');
        setSuccess('');
    };

    const handlePaymentUpdate = async () => {
        await fetchPayments();
        setSuccess('Payment updated successfully');
        
        // If we have a selected payment, check if it still matches the current filter
        if (selectedPayment) {
            const updatedPayment = payments.find(p => p._id === selectedPayment._id);
            if (!updatedPayment || !filteredPayments.some(p => p._id === selectedPayment._id)) {
                // Payment was filtered out or no longer exists
                setSelectedPayment(null);
            } else {
                // Update the selected payment with latest data
                setSelectedPayment(updatedPayment);
            }
        }
    };

    const filteredPayments = payments.filter(payment => {
        switch (filter) {
            case 'pending': return payment.status === 'pending';
            case 'verified': return payment.status === 'verified';
            case 'swift': return payment.status === 'submitted_to_swift';
            case 'completed': return payment.status === 'completed';
            case 'rejected': return payment.status === 'rejected';
            default: return true;
        }
    });

    return (
        <div className="admin-dashboard">
            <header className="dashboard-header">
                <h2>Admin Dashboard</h2>
                <button onClick={handleLogout} className="logout-button">Logout</button>
            </header>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="dashboard-content">
                <div className="payments-list">
                    <div className="filter-section">
                        <select 
                            value={filter} 
                            onChange={(e) => {
                                setFilter(e.target.value);
                                setSelectedPayment(null); // Clear selected payment when filter changes
                                setSuccess(''); // Clear any success message
                                setError(''); // Clear any error message
                            }}
                            className="status-filter"
                        >
                            <option value="all">All Payments</option>
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="swift">Submitted to SWIFT</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <div className="payments-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Beneficiary</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map(payment => (
                                    <tr 
                                        key={payment._id}
                                        className={selectedPayment?._id === payment._id ? 'selected' : ''}
                                    >
                                        <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                                        <td>{payment.amount} {payment.currency}</td>
                                        <td>{payment.beneficiaryName}</td>
                                        <td>
                                            <span className={`status-badge status-${payment.status}`}>
                                                {payment.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <button 
                                                onClick={() => handlePaymentSelect(payment)}
                                                className="view-details-button"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="payment-details-panel">
                    {selectedPayment ? (
                        <PaymentDetails 
                            payment={selectedPayment}
                            onUpdate={handlePaymentUpdate}
                        />
                    ) : (
                        <div className="no-payment-selected">
                            <p>Select a payment to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;