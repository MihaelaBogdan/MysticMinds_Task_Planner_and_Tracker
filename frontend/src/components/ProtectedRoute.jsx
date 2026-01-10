import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading, isAuthenticated } = useAuth();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const redirectPath = {
            admin: '/admin',
            manager: '/manager',
            executor: '/executor',
        }[user.role] || '/login';

        return <Navigate to={redirectPath} replace />;
    }

    return children;
}

export default ProtectedRoute;
