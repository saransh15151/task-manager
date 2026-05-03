import { useState } from "react";
import API from "../api/api";
import { useNavigate, Link } from "react-router-dom";
import "../App.css";

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/login", form);

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        navigate("/dashboard");
      } else {
        setError(res.data.message || res.data || "Login failed");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-split-card">
        {/* Left Side - Image */}
        <div className="auth-image-side">
          <img 
            src="/src/assets/login-illustration.png" 
            alt="3D Character with laptop" 
            className="auth-illustration"
            onError={(e) => {
              // Fallback if the user hasn't added the image yet
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML += '<div style="color: #1a73e8; font-weight: 500; text-align: center;">Please add your image<br/>to src/assets/login-illustration.png</div>';
            }}
          />
        </div>

        {/* Right Side - Form */}
        <div className="auth-form-side">
          <div className="auth-header">
            <h1>Sign In</h1>
            <p>Unlock you world.</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="login-email"><span className="required">*</span> Email</label>
              <div className="input-container">
                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password"><span className="required">*</span> Password</label>
              <div className="input-container">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <span 
                  className="input-icon" 
                  onClick={() => setShowPassword(!showPassword)}
                  title="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  )}
                </span>
              </div>
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
            
            <Link to="/" className="btn-secondary">
              Create an account
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;