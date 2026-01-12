import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { tasksApi } from '../services/api';

function ExecutorDashboard() {
    const [tasks, setTasks] = useState([]);
    const [historyTasks, setHistoryTasks] = useState([]);
    const [viewMode, setViewMode] = useState('board');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });
    const [creating, setCreating] = useState(false);
    const [draggedTask, setDraggedTask] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [tasksRes, historyRes] = await Promise.all([tasksApi.getAll(), tasksApi.getHistory()]);
            setTasks(tasksRes.data);
            setHistoryTasks(historyRes.data);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const handleComplete = async (id) => {
        try {
            await tasksApi.complete(id);
            loadData();
        }
        catch (err) { setError(err.message); }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await tasksApi.updateStatus(taskId, newStatus);
            loadData();
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await tasksApi.create(newTask);
            setShowCreateModal(false);
            setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
            loadData();
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    const handleDragStart = (e, task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id.toString());
        setTimeout(() => {
            e.target.classList.add('dragging');
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
        setDraggedTask(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e, status) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverColumn !== status) {
            setDragOverColumn(status);
        }
    };

    const handleDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setDragOverColumn(null);
        }
    };

    const handleDrop = async (e, targetStatus) => {
        e.preventDefault();
        setDragOverColumn(null);

        if (!draggedTask || draggedTask.status === targetStatus) {
            setDraggedTask(null);
            return;
        }

        const canModify = draggedTask.assignedToId === currentUser.id || draggedTask.createdById === currentUser.id;

        if (!canModify) {
            setError('You can only modify your own tasks');
            setTimeout(() => setError(null), 3000);
            setDraggedTask(null);
            return;
        }

        try {
            await tasksApi.updateStatus(draggedTask.id, targetStatus);
            loadData();
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        }
        setDraggedTask(null);
    };

    const canDrag = (task) => {
        return task.assignedToId === currentUser.id || task.createdById === currentUser.id;
    };

    const myAssignedTasks = tasks.filter(t => t.assignedToId === currentUser.id);
    const myCreatedTasks = tasks.filter(t => t.createdById === currentUser.id);
    const allMyTasks = [...new Map([...myAssignedTasks, ...myCreatedTasks].map(t => [t.id, t])).values()];

    const columns = {
        OPEN: allMyTasks.filter(t => t.status === 'OPEN'),
        PENDING: allMyTasks.filter(t => t.status === 'PENDING'),
        COMPLETED: allMyTasks.filter(t => t.status === 'COMPLETED'),
        CLOSED: allMyTasks.filter(t => t.status === 'CLOSED'),
    };

    const columnConfig = {
        OPEN: { color: '#a78bfa', label: 'To Do' },
        PENDING: { color: '#f59e0b', label: 'In Progress' },
        COMPLETED: { color: '#10b981', label: 'Done' },
        CLOSED: { color: '#6b7280', label: 'Closed' },
    };

    const priorityColors = { low: '#22c55e', medium: '#eab308', high: '#ef4444' };

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

    return (
        <div className="app-container">
            <Navbar />
            <main className="main-content">
                <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="dashboard-title">My Work</h1>
                        <p className="dashboard-subtitle">
                            {currentUser.manager ? (
                                <>Manager: <strong>{currentUser.manager.username}</strong> ({currentUser.manager.email})</>
                            ) : (
                                'Manage your tasks with drag and drop'
                            )}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div className="view-toggle">
                            <button
                                className={`view-toggle-btn ${viewMode === 'board' ? 'active' : ''}`}
                                onClick={() => setViewMode('board')}
                            >
                                Board
                            </button>
                            <button
                                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                List
                            </button>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                            Create Task
                        </button>
                    </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <div className="dashboard-stats">
                    <div className="stat-card">
                        <div className="stat-icon pink"></div>
                        <div className="stat-content">
                            <div className="stat-value">{columns.OPEN.length}</div>
                            <div className="stat-label">To Do</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon amber"></div>
                        <div className="stat-content">
                            <div className="stat-value">{columns.PENDING.length}</div>
                            <div className="stat-label">In Progress</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green"></div>
                        <div className="stat-content">
                            <div className="stat-value">{columns.COMPLETED.length}</div>
                            <div className="stat-label">Completed</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon purple"></div>
                        <div className="stat-content">
                            <div className="stat-value">{allMyTasks.length}</div>
                            <div className="stat-label">Total Tasks</div>
                        </div>
                    </div>
                </div>

                {viewMode === 'board' && (
                    <div className="drag-info">
                        <strong>Tip:</strong> Drag tasks between columns to change their status
                    </div>
                )}

                {viewMode === 'board' && (
                    <div className="kanban-board">
                        {Object.entries(columns).map(([status, statusTasks]) => (
                            <div
                                key={status}
                                className={`kanban-column ${dragOverColumn === status ? 'drag-over' : ''}`}
                                onDragOver={(e) => handleDragOver(e, status)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, status)}
                            >
                                <div className="kanban-column-header" style={{ borderTopColor: columnConfig[status].color }}>
                                    <span className="kanban-column-title">
                                        {columnConfig[status].label}
                                    </span>
                                    <span className="kanban-column-count">{statusTasks.length}</span>
                                </div>
                                <div className="kanban-column-content">
                                    {statusTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className={`kanban-card ${canDrag(task) ? 'draggable' : ''}`}
                                            draggable={canDrag(task)}
                                            onDragStart={(e) => canDrag(task) && handleDragStart(e, task)}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <div className="kanban-card-header">
                                                <span className="kanban-card-id">TASK-{task.id}</span>
                                                <span className="kanban-card-priority" style={{ background: priorityColors[task.priority] }}>
                                                    {task.priority.toUpperCase()}
                                                </span>
                                            </div>
                                            <h4 className="kanban-card-title">{task.title}</h4>
                                            <p className="kanban-card-desc">{task.description.substring(0, 60)}...</p>

                                            <div className="kanban-card-meta">
                                                {task.createdById === currentUser.id && (
                                                    <span className="kanban-tag created">Created by me</span>
                                                )}
                                                {task.assignedToId === currentUser.id && (
                                                    <span className="kanban-tag assigned">Assigned to me</span>
                                                )}
                                                {task.assignee && task.assignedToId !== currentUser.id && (
                                                    <span className="kanban-tag other">{task.assignee.username}</span>
                                                )}
                                            </div>

                                            {task.dueDate && (
                                                <div className="kanban-card-due">Due: {formatDate(task.dueDate)}</div>
                                            )}

                                            {task.status === 'PENDING' && task.assignedToId === currentUser.id && (
                                                <div className="kanban-card-actions">
                                                    <button className="btn btn-sm btn-success" onClick={() => handleComplete(task.id)}>
                                                        Complete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {statusTasks.length === 0 && (
                                        <div className="kanban-empty">
                                            {dragOverColumn === status ? 'Drop here!' : 'No tasks'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {viewMode === 'list' && (
                    <div className="task-list-container">
                        {allMyTasks.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"></div>
                                <h3 className="empty-state-title">No tasks yet</h3>
                                <p className="empty-state-message">Click "Create Task" to add your first task.</p>
                            </div>
                        ) : (
                            allMyTasks.map(task => (
                                <div key={task.id} className="task-card" style={{ borderLeftColor: columnConfig[task.status]?.color }}>
                                    <div className="task-header">
                                        <h3 className="task-title">{task.title}</h3>
                                        <div className="task-badges">
                                            <span className={`badge badge-${task.status.toLowerCase()}`}>{task.status}</span>
                                            <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                                        </div>
                                    </div>
                                    <p className="task-description">{task.description}</p>
                                    <div className="task-meta">
                                        {task.createdById === currentUser.id && <span className="task-meta-item">Created by me</span>}
                                        {task.assignedToId === currentUser.id && <span className="task-meta-item">Assigned to me</span>}
                                        {task.dueDate && <span className="task-meta-item">Due: {formatDate(task.dueDate)}</span>}
                                    </div>
                                    {task.status === 'PENDING' && task.assignedToId === currentUser.id && (
                                        <div className="task-actions">
                                            <button className="btn btn-success btn-sm" onClick={() => handleComplete(task.id)}>
                                                Mark Complete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {showCreateModal && (
                    <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title">Create New Task</h3>
                                <button className="modal-close" onClick={() => setShowCreateModal(false)}>x</button>
                            </div>
                            <form onSubmit={handleCreateTask}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Title *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={newTask.title}
                                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                            placeholder="Task title"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Description *</label>
                                        <textarea
                                            className="form-textarea"
                                            value={newTask.description}
                                            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                            placeholder="Describe the task..."
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Priority</label>
                                        <select
                                            className="form-select"
                                            value={newTask.priority}
                                            onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Due Date (optional)</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={newTask.dueDate}
                                            onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={creating}>
                                        {creating ? 'Creating...' : 'Create Task'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default ExecutorDashboard;
