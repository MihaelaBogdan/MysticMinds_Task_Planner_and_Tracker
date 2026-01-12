import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';

function RegisterPage() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        managerEmail: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [managerName, setManagerName] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters.');
            setLoading(false);
            return;
        }

        if (!formData.managerEmail.trim()) {
            setError('Manager email is required.');
            setLoading(false);
            return;
        }

        try {
            const result = await authApi.registerPublic({
                username: formData.username,
                email: formData.email,
                password: formData.password,
                managerEmail: formData.managerEmail
            });
            setManagerName(result.data?.managerName || '');
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-logo">🎀</div>
                        <h1 className="login-title">Account Created!</h1>
                        <p className="login-subtitle">Redirecting to login...</p>
                    </div>
                    <div className="alert alert-success">
                        Your account has been created successfully!
                        {managerName && <><br />You have been assigned to manager: <strong>{managerName}</strong></>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">🎀</div>
                    <h1 className="login-title">TaskFlow</h1>
                    <p className="login-subtitle">Create your executor account</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="username">Username</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            className="form-input"
                            placeholder="Your username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Your Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className="form-input"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="managerEmail">Manager Email (required)</label>
                        <input
                            id="managerEmail"
                            name="managerEmail"
                            type="email"
                            className="form-input"
                            placeholder="manager@company.com"
                            value={formData.managerEmail}
                            onChange={handleChange}
                            required
                        />
                        <small style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                            Enter your manager's email to be assigned to their team
                        </small>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Already have an account? <Link to="/login" className="link-primary">Sign In</Link></p>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;
