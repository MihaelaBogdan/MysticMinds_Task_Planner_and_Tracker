import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
    const { user, logout } = useAuth();

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getDashboardLink = () => {
        switch (user?.role) {
            case 'admin': return '/admin';
            case 'manager': return '/manager';
            case 'executor': return '/executor';
            default: return '/';
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-content">
                <Link to={getDashboardLink()} className="navbar-brand">
                    <span className="navbar-logo">🎀</span>
                    <span className="navbar-title">TaskFlow</span>
                </Link>

                <div className="navbar-nav">
                    <div className="navbar-user">
                        <div className="user-info">
                            <div className="user-name">{user?.username}</div>
                            <div className="user-role">{user?.role}</div>
                        </div>
                        <div className="user-avatar">
                            {getInitials(user?.username || 'U')}
                        </div>
                    </div>
                    <button onClick={logout} className="btn btn-ghost btn-sm">
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
