import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import { usersApi, authApi } from '../services/api';
import { API_URL as BASE_URL } from '../config.js';

const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showTasksModal, setShowTasksModal] = useState(false);
    const [showDeleteManagerModal, setShowDeleteManagerModal] = useState(false);
    const [modalType, setModalType] = useState('manager');
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userTasks, setUserTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [managerToDelete, setManagerToDelete] = useState(null);
    const [managerExecutors, setManagerExecutors] = useState([]);
    const [deleteAction, setDeleteAction] = useState('reassign');
    const [reassignToManagerId, setReassignToManagerId] = useState('');
    const [formData, setFormData] = useState({
        username: '', email: '', password: '', role: 'manager', managerId: ''
    });

    const [showReassignModal, setShowReassignModal] = useState(false);
    const [executorToReassign, setExecutorToReassign] = useState(null);
    const [newManagerId, setNewManagerId] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [usersRes, managersRes] = await Promise.all([
                usersApi.getAll(), usersApi.getManagers()
            ]);
            setUsers(usersRes.data);
            setManagers(managersRes.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openAddManager = () => {
        setModalType('manager');
        setFormData({ username: '', email: '', password: '', role: 'manager', managerId: '' });
        setShowModal(true);
    };

    const openAddExecutor = () => {
        setModalType('executor');
        setFormData({ username: '', email: '', password: '', role: 'executor', managerId: '' });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await authApi.register(formData);
            setShowModal(false);
            setFormData({ username: '', email: '', password: '', role: 'manager', managerId: '' });
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteClick = async (user) => {
        if (user.role === 'manager') {
            const executors = users.filter(u => u.role === 'executor' && u.managerId === user.id);
            setManagerToDelete(user);
            setManagerExecutors(executors);
            setDeleteAction(executors.length > 0 ? 'reassign' : 'delete');
            setReassignToManagerId('');
            setShowDeleteManagerModal(true);
        } else {
            if (!confirm('Are you sure you want to delete this executor?')) return;
            try {
                await usersApi.delete(user.id);
                setUsers(prev => prev.filter(u => u.id !== user.id));
            } catch (err) {
                setError(err.message);
            }
        }
    };

    const handlePromote = async (user) => {
        if (!confirm(`Are you sure you want to promote ${user.username} to Manager?`)) return;
        try {
            await usersApi.promote(user.id);
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const openReassignModal = (user) => {
        setExecutorToReassign(user);
        setNewManagerId('');
        setShowReassignModal(true);
    };

    const handleReassign = async () => {
        if (!newManagerId) {
            setError('Please select a new manager.');
            return;
        }
        try {
            await usersApi.reassign(executorToReassign.id, newManagerId);
            setShowReassignModal(false);
            setExecutorToReassign(null);
            setNewManagerId('');
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteManager = async () => {
        if (!managerToDelete) return;

        try {
            const token = localStorage.getItem('token');

            if (managerExecutors.length > 0) {
                if (deleteAction === 'reassign') {
                    if (!reassignToManagerId) {
                        setError('Please select a manager for reassignment!');
                        return;
                    }
                    for (const executor of managerExecutors) {
                        await fetch(`${API_URL}/users/${executor.id}/reassign`, {
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ managerId: reassignToManagerId })
                        });
                    }
                } else {
                    for (const executor of managerExecutors) {
                        await fetch(`${API_URL}/users/${executor.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                    }
                }
            }

            await usersApi.delete(managerToDelete.id);

            setShowDeleteManagerModal(false);
            setManagerToDelete(null);
            setManagerExecutors([]);
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const viewUserTasks = async (user) => {
        setSelectedUser(user);
        setLoadingTasks(true);
        setShowTasksModal(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/users/${user.id}/tasks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setUserTasks(data.data);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingTasks(false);
        }
    };

    const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    const stats = {
        total: users.length,
        managers: users.filter(u => u.role === 'manager').length,
        executors: users.filter(u => u.role === 'executor').length,
    };

    const managerUsers = users.filter(u => u.role === 'manager');
    const executorUsers = users.filter(u => u.role === 'executor');
    const otherManagers = managers.filter(m => managerToDelete && m.id !== managerToDelete.id);
    const availableManagers = managers.filter(m => executorToReassign && m.id !== executorToReassign.managerId);

    const statusColors = {
        OPEN: '#a78bfa',
        PENDING: '#f59e0b',
        COMPLETED: '#10b981',
        CLOSED: '#6b7280'
    };

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div className="app-container">
            <Navbar />
            <main className="main-content">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Admin Dashboard</h1>
                    <p className="dashboard-subtitle">Manage users and team structure</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <div className="dashboard-stats">
                    <div className="stat-card">
                        <div className="stat-icon pink"></div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.total}</div>
                            <div className="stat-label">Total Users</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon purple"></div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.managers}</div>
                            <div className="stat-label">Managers</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green"></div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.executors}</div>
                            <div className="stat-label">Executors</div>
                        </div>
                    </div>
                </div>

                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">Managers</h2>
                        <button className="btn btn-primary" onClick={openAddManager}>
                            Add Manager
                        </button>
                    </div>

                    {managerUsers.length === 0 ? (
                        <p style={{ color: '#888', padding: '1rem' }}>No managers yet.</p>
                    ) : (
                        managerUsers.map(user => (
                            <div key={user.id} className="user-card fade-in" style={{ cursor: 'pointer' }} onClick={() => viewUserTasks(user)}>
                                <div className="user-card-avatar">{getInitials(user.username)}</div>
                                <div className="user-card-info">
                                    <div className="user-card-name">{user.username}</div>
                                    <div className="user-card-email">{user.email}</div>
                                    <div className="user-card-email" style={{ color: '#888', fontSize: '0.75rem' }}>
                                        {users.filter(u => u.managerId === user.id).length} executors
                                    </div>
                                </div>
                                <span className="badge badge-open">manager</span>
                                <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDeleteClick(user); }}>Delete</button>
                            </div>
                        ))
                    )}
                </div>

                <div className="section" style={{ marginTop: '2rem' }}>
                    <div className="section-header">
                        <h2 className="section-title">Executors</h2>
                        <button className="btn btn-secondary" onClick={openAddExecutor}>
                            Add Executor
                        </button>
                    </div>

                    {executorUsers.length === 0 ? (
                        <p style={{ color: '#888', padding: '1rem' }}>No executors yet.</p>
                    ) : (
                        executorUsers.map(user => (
                            <div key={user.id} className="user-card fade-in" style={{ cursor: 'pointer' }} onClick={() => viewUserTasks(user)}>
                                <div className="user-card-avatar">{getInitials(user.username)}</div>
                                <div className="user-card-info">
                                    <div className="user-card-name">{user.username}</div>
                                    <div className="user-card-email">{user.email}</div>
                                    {user.manager && <div className="user-card-email">Manager: {user.manager.username}</div>}
                                </div>
                                <span className="badge badge-pending">executor</span>
                                <div className="user-card-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openReassignModal(user); }} title="Reassign to another manager">
                                        Reassign
                                    </button>
                                    <button className="btn btn-success btn-sm" onClick={(e) => { e.stopPropagation(); handlePromote(user); }} title="Promote to Manager">
                                        Promote
                                    </button>
                                    <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDeleteClick(user); }}>Delete</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                { }
                <Modal isOpen={showModal} onClose={() => setShowModal(false)}
                    title={modalType === 'manager' ? 'Add New Manager' : 'Add New Executor'}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>Create</button>
                    </>}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input className="form-input" value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-input" value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input type="password" className="form-input" value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                        </div>
                        {modalType === 'executor' && (
                            <div className="form-group">
                                <label className="form-label">Assign to Manager</label>
                                <select className="form-select" value={formData.managerId}
                                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })} required>
                                    <option value="">Select a manager...</option>
                                    {managers.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
                                </select>
                            </div>
                        )}
                    </form>
                </Modal>

                <Modal isOpen={showTasksModal} onClose={() => { setShowTasksModal(false); setSelectedUser(null); setUserTasks([]); }}
                    title={selectedUser ? `${selectedUser.username}'s Tasks` : 'User Tasks'}>
                    {loadingTasks ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div className="spinner"></div>
                            <p>Loading tasks...</p>
                        </div>
                    ) : userTasks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                            <p>No tasks found for this user.</p>
                        </div>
                    ) : (
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {userTasks.map(task => (
                                <div key={task.id} style={{
                                    padding: '1rem',
                                    marginBottom: '0.75rem',
                                    background: '#f8f9fa',
                                    borderRadius: '8px',
                                    borderLeft: `4px solid ${statusColors[task.status] || '#888'}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: '600' }}>TASK-{task.id}</span>
                                        <span className={`badge badge-${task.status.toLowerCase()}`}>{task.status}</span>
                                    </div>
                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>{task.title}</h4>
                                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#666' }}>
                                        {task.description?.substring(0, 100)}...
                                    </p>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#888', flexWrap: 'wrap' }}>
                                        <span>Priority: {task.priority}</span>
                                        {task.dueDate && <span>Due: {formatDate(task.dueDate)}</span>}
                                        <span>Created by: {task.creator?.username || 'Unknown'}</span>
                                        <span>Assigned to: {task.assignee?.username || 'Unassigned'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Modal>

                { }
                <Modal isOpen={showDeleteManagerModal} onClose={() => { setShowDeleteManagerModal(false); setManagerToDelete(null); }}
                    title={`Delete Manager: ${managerToDelete?.username}`}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => setShowDeleteManagerModal(false)}>Cancel</button>
                        <button className="btn btn-danger" onClick={handleDeleteManager}>Delete Manager</button>
                    </>}>
                    {managerExecutors.length === 0 ? (
                        <p>This manager has no assigned executors. Do you want to delete them?</p>
                    ) : (
                        <div>
                            <p style={{ marginBottom: '1rem' }}>
                                This manager has <strong>{managerExecutors.length} executors</strong> assigned:
                            </p>
                            <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                                {managerExecutors.map(e => (
                                    <li key={e.id}>{e.username} ({e.email})</li>
                                ))}
                            </ul>

                            <div className="form-group">
                                <label className="form-label">What do you want to do with the executors?</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="deleteAction"
                                            value="reassign"
                                            checked={deleteAction === 'reassign'}
                                            onChange={() => setDeleteAction('reassign')}
                                        />
                                        Reassign to another manager
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="deleteAction"
                                            value="delete"
                                            checked={deleteAction === 'delete'}
                                            onChange={() => setDeleteAction('delete')}
                                        />
                                        Delete executors as well
                                    </label>
                                </div>
                            </div>

                            {deleteAction === 'reassign' && (
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label className="form-label">Select new manager:</label>
                                    <select
                                        className="form-select"
                                        value={reassignToManagerId}
                                        onChange={(e) => setReassignToManagerId(e.target.value)}
                                    >
                                        <option value="">Choose a manager...</option>
                                        {otherManagers.map(m => (
                                            <option key={m.id} value={m.id}>{m.username} ({m.email})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </Modal>

                { }
                <Modal isOpen={showReassignModal} onClose={() => { setShowReassignModal(false); setExecutorToReassign(null); }}
                    title={`Reassign Executor${executorToReassign ? `: ${executorToReassign.username}` : ''}`}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => setShowReassignModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleReassign}>Reassign</button>
                    </>}>
                    <div>
                        <p style={{ marginBottom: '1rem' }}>Select the new manager for this executor:</p>
                        <div className="form-group">
                            <label className="form-label">New Manager</label>
                            <select
                                className="form-select"
                                value={newManagerId}
                                onChange={(e) => setNewManagerId(e.target.value)}
                            >
                                <option value="">Select a manager...</option>
                                {availableManagers.map(m => (
                                    <option key={m.id} value={m.id}>{m.username} ({m.email})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </Modal>
            </main>
        </div>
    );
}

export default AdminDashboard;
