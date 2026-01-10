import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, error, clearError } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        clearError();

        try {
            const user = await login(email, password);
            const routes = { admin: '/admin', manager: '/manager', executor: '/executor' };
            navigate(routes[user.role] || '/');
        } catch (err) {
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">🎀</div>
                    <h1 className="login-title">TaskFlow</h1>
                    <p className="login-subtitle">Welcome back! Please sign in.</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email</label>
                        <input id="email" type="email" className="form-input" placeholder="your@email.com"
                            value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input id="password" type="password" className="form-input" placeholder="••••••••"
                            value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Don't have an account? <Link to="/register" className="link-primary">Create Account</Link></p>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
