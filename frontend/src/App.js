
import React, { useState, useEffect } from "react";
import api, { initCsrf } from "./setupAxios";
import "./App.css";
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';

function PaymentPortal({ onLogout, onAdminNav }) {
  const [form, setForm] = useState({
    amount: "",
    currency: "ZAR",
    provider: "SWIFT",
    beneficiaryName: "",
    beneficiaryAccount: "",
    swiftCode: ""
  });
  const [msg, setMsg] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePay = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await api.post("/payment", form);
      setMsg("✅ Payment submitted.");
      // clear sensitive fields only
      setForm({ ...form, beneficiaryName: "", beneficiaryAccount: "", swiftCode: "", amount: "" });
    } catch (err) {
      setMsg("❌ " + (err.response?.data?.error || err.message || "Payment failed"));
    }
  };

  return (
    <div style={{maxWidth:700, margin:'30px auto'}}>
      <div style={{marginBottom: '20px'}}>
        <h2>Payment Portal</h2>
      </div>
      <form onSubmit={handlePay}>
        <label>Amount</label>
        <input name="amount" value={form.amount} onChange={handleChange} placeholder="100.00" required />

        <label>Currency</label>
        <select name="currency" value={form.currency} onChange={handleChange}>
          <option value="ZAR">ZAR</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>

        <label>Provider</label>
        <select name="provider" value={form.provider} onChange={handleChange}>
          <option value="SWIFT">SWIFT</option>
           <option value="PayFast">PayFast</option>
          
        </select>

        <hr/>

        <label>Beneficiary Full Name</label>
        <input name="beneficiaryName" value={form.beneficiaryName} onChange={handleChange} required />

        <label>Beneficiary Account Number</label>
        <input name="beneficiaryAccount" value={form.beneficiaryAccount} onChange={handleChange} required />

        <label>SWIFT / BIC Code</label>
        <input name="swiftCode" value={form.swiftCode} onChange={handleChange} placeholder="8 or 11 chars, E.g SBZAZAJJ" required />

        <button type="submit">Pay Now</button>
      </form>

      <p style={{marginTop:12}}>{msg}</p>
      <button onClick={onLogout} style={{marginTop:20}}>Logout</button>
    </div>
  );
}

function App() {
  const [view, setView] = useState("register"); // register,login,  portal
  const [csrfReady, setCsrfReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [regForm, setRegForm] = useState({
    fullName: "",
    idNumber: "",
    accountNumber: "",
    password: ""
  });

  const [loginForm, setLoginForm] = useState({
    username: "", // is the user's fullName
    accountNumber: "",
    password: ""
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    async function setup() {
      await initCsrf();
      setCsrfReady(true);
    }
    setup();
  }, []);

  const handleAdminNav = () => {
    setView('admin-login');
    setMessage('');
  };

  // Helpers
  const handleRegChange = (e) => setRegForm({ ...regForm, [e.target.name]: e.target.value });
  const handleLoginChange = (e) => setLoginForm({ ...loginForm, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!csrfReady) { setMessage("⚠️ Please wait, securing connection..."); return; }

    try {
      // registration payload matches backend expectations
      await api.post("/register", {
        fullName: regForm.fullName,
        idNumber: regForm.idNumber,
        accountNumber: regForm.accountNumber,
        password: regForm.password
      });
      setMessage("✅ Registered successfully. You can now login.");
      setView("login");
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.error || err.message));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!csrfReady) { setMessage("⚠️ Please wait, securing connection..."); return; }

    try {
      await api.post("/login", {
        username: loginForm.username,
        accountNumber: loginForm.accountNumber,
        password: loginForm.password
      });
      setMessage("✅ Logged in.");
      setLoggedIn(true);
      setView("portal");
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.error || err.message));
    }
  };

  const handleLogout = async () => {
    
    setLoggedIn(false);
    setView("login");
    setMessage("Logged out.");
  };

  if (view === "portal" && loggedIn) {
    return <PaymentPortal onLogout={handleLogout} onAdminNav={handleAdminNav} />;
  }

  return (
    <div className="App" style={{maxWidth:700, margin:'30px auto', fontFamily:'Arial, sans-serif'}}>
      <h2>Customer International Payments Portal</h2>

      <div style={{marginBottom:20}}>
        <button onClick={() => { setView("register"); setMessage(""); }}>Register</button>
        <button onClick={() => { setView("login"); setMessage(""); }}>Login</button>
        <button 
          onClick={() => { setView("admin-login"); setMessage(""); }}
          style={{
            marginLeft: '10px',
            backgroundColor: '#4A5568',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Admin Login
        </button>
      </div>

      {view === "register" && (
        <form onSubmit={handleRegister}>
          <h3>Register</h3>
          <input name="fullName" placeholder="Full name" value={regForm.fullName} onChange={handleRegChange} required />
          <input name="idNumber" placeholder="ID number (13 digits)" value={regForm.idNumber} onChange={handleRegChange} required />
          <input name="accountNumber" placeholder="Account number" value={regForm.accountNumber} onChange={handleRegChange} required />
          <input name="password" type="password" placeholder="Password (min 10 chars)" value={regForm.password} onChange={handleRegChange} required />
          <button type="submit">Register</button>
        </form>
      )}

      {view === "admin-login" && (
        <AdminLogin 
          onLoginSuccess={() => setView("admin-dashboard")} 
          onBack={() => setView("login")}
        />
      )}

      {view === "admin-dashboard" && (
        <AdminDashboard 
          onLogout={() => setView("login")}
        />
      )}

      {view === "login" && (
        <form onSubmit={handleLogin}>
          <h3>Login</h3>
          <input name="username" placeholder="Username (Full name)" value={loginForm.username} onChange={handleLoginChange} required />
          <input name="accountNumber" placeholder="Account number" value={loginForm.accountNumber} onChange={handleLoginChange} required />
          <input name="password" type="password" placeholder="Password" value={loginForm.password} onChange={handleLoginChange} required />
          <button type="submit">Login</button>
        </form>
      )}

      <p style={{marginTop:12}}>{message}</p>
      <div style={{marginTop:10, fontSize:12, color:'#666'}}>
        <strong>Note:</strong> The payment records are stored in MongoDB.
      </div>
    </div>
  );
}

export default App;
