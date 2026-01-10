import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import { tasksApi, usersApi } from '../services/api';

function ManagerDashboard() {
    const [tasks, setTasks] = useState([]);
    const [executors, setExecutors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedExecutor, setSelectedExecutor] = useState(null);
    const [executorHistory, setExecutorHistory] = useState([]);
    const [error, setError] = useState(null);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });
    const [draggedTask, setDraggedTask] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [tasksRes, executorsRes] = await Promise.all([tasksApi.getAll(), usersApi.getExecutors()]);
            setTasks(tasksRes.data);
            setExecutors(executorsRes.data);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            await tasksApi.create(taskForm);
            setShowTaskModal(false);
            setTaskForm({ title: '', description: '', priority: 'medium', dueDate: '' });
            loadData();
        } catch (err) { setError(err.message); }
    };

    const handleAssign = async (executorId) => {
        try {
            await tasksApi.assign(selectedTask.id, executorId);
            setShowAssignModal(false);
            setSelectedTask(null);
            loadData();
        } catch (err) { setError(err.message); }
    };

    const handleClose = async (id) => {
        try { await tasksApi.close(id); loadData(); }
        catch (err) { setError(err.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this task?')) return;
        try { await tasksApi.delete(id); loadData(); }
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

    const openAssignModal = (task) => { setSelectedTask(task); setShowAssignModal(true); };

    const viewExecutorHistory = async (executor) => {
        try {
            const res = await tasksApi.getExecutorHistory(executor.id);
            setExecutorHistory(res.data);
            setSelectedExecutor(executor);
            setShowHistoryModal(true);
        } catch (err) { setError(err.message); }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
    };

    const handleDragStart = (e, task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
        setDraggedTask(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e, status) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(status);
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = async (e, targetStatus) => {
        e.preventDefault();
        setDragOverColumn(null);

        if (!draggedTask || draggedTask.status === targetStatus) {
            setDraggedTask(null);
            return;
        }

        if (targetStatus === 'PENDING' && draggedTask.status === 'OPEN') {
            setSelectedTask(draggedTask);
            setShowAssignModal(true);
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

    const columns = {
        OPEN: tasks.filter(t => t.status === 'OPEN'),
        PENDING: tasks.filter(t => t.status === 'PENDING'),
        COMPLETED: tasks.filter(t => t.status === 'COMPLETED'),
        CLOSED: tasks.filter(t => t.status === 'CLOSED'),
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
                        <h1 className="dashboard-title">Task Board</h1>
                        <p className="dashboard-subtitle">Drag and drop tasks between columns</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-secondary" onClick={() => setShowHistoryModal(true)}>
                            Team History
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
                            Create Task
                        </button>
                    </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <div className="drag-info">
                    <strong>Tip:</strong> Drag tasks between any columns to change their status
                </div>

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
                                        className="kanban-card"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <div className="kanban-card-header">
                                            <span className="kanban-card-id">TASK-{task.id}</span>
                                            <span className="kanban-card-priority" style={{ background: priorityColors[task.priority] }}>
                                                {task.priority.toUpperCase()}
                                            </span>
                                        </div>
                                        <h4 className="kanban-card-title">{task.title}</h4>
                                        <p className="kanban-card-desc">{task.description.substring(0, 80)}...</p>

                                        {task.assignee && (
                                            <div className="kanban-card-assignee">
                                                <div className="mini-avatar">{task.assignee.username.charAt(0)}</div>
                                                <span>{task.assignee.username}</span>
                                            </div>
                                        )}

                                        {task.dueDate && (
                                            <div className="kanban-card-due">Due: {formatDate(task.dueDate)}</div>
                                        )}

                                        <div className="kanban-card-actions">
                                            {status === 'OPEN' && (
                                                <>
                                                    <button className="btn btn-sm btn-primary" onClick={() => openAssignModal(task)}>
                                                        Assign
                                                    </button>
                                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(task.id)}>
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                            {status === 'PENDING' && (
                                                <button className="btn btn-sm btn-success" onClick={() => handleStatusChange(task.id, 'COMPLETED')}>
                                                    Mark Done
                                                </button>
                                            )}
                                            {status === 'COMPLETED' && (
                                                <button className="btn btn-sm btn-success" onClick={() => handleClose(task.id)}>
                                                    Close Task
                                                </button>
                                            )}
                                        </div>
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

                <div className="section" style={{ marginTop: '2rem' }}>
                    <h2 className="section-title">My Team</h2>
                    <div className="team-grid">
                        {executors.map(exec => (
                            <div key={exec.id} className="team-member-card">
                                <div className="team-avatar">{exec.username.charAt(0)}</div>
                                <div className="team-info">
                                    <div className="team-name">{exec.username}</div>
                                    <div className="team-email">{exec.email}</div>
                                </div>
                                <button className="btn btn-sm btn-secondary" onClick={() => viewExecutorHistory(exec)}>
                                    View History
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title="Create New Task"
                    footer={<><button className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleCreateTask}>Create</button></>}>
                    <form onSubmit={handleCreateTask}>
                        <div className="form-group"><label className="form-label">Task Title</label>
                            <input className="form-input" placeholder="Enter task title..." value={taskForm.title}
                                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
                        <div className="form-group"><label className="form-label">Description</label>
                            <textarea className="form-textarea" placeholder="Describe the task in detail..." value={taskForm.description}
                                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} required
                                style={{ minHeight: '150px' }} /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group"><label className="form-label">Priority</label>
                                <select className="form-select" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                            <div className="form-group"><label className="form-label">Due Date</label>
                                <input type="date" className="form-input" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} /></div>
                        </div>
                    </form>
                </Modal>

                <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Task">
                    <div className="assign-task-info">
                        <h4>{selectedTask?.title}</h4>
                        <p>Select a team member to assign this task:</p>
                    </div>
                    {executors.map(exec => (
                        <div key={exec.id} className="executor-option" onClick={() => handleAssign(exec.id)}>
                            <div className="mini-avatar">{exec.username.charAt(0)}</div>
                            <div className="executor-info">
                                <div className="executor-name">{exec.username}</div>
                                <div className="executor-email">{exec.email}</div>
                            </div>
                            <span className="assign-btn">Assign</span>
                        </div>
                    ))}
                </Modal>

                <Modal isOpen={showHistoryModal} onClose={() => { setShowHistoryModal(false); setSelectedExecutor(null); }}
                    title={selectedExecutor ? `${selectedExecutor.username}'s History` : 'Select Team Member'}>
                    {!selectedExecutor ? (
                        <div>
                            <p style={{ marginBottom: '1rem' }}>Select a team member to view their task history:</p>
                            {executors.map(exec => (
                                <div key={exec.id} className="executor-option" onClick={() => viewExecutorHistory(exec)}>
                                    <div className="mini-avatar">{exec.username.charAt(0)}</div>
                                    <div className="executor-info">
                                        <div className="executor-name">{exec.username}</div>
                                        <div className="executor-email">{exec.email}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedExecutor(null)} style={{ marginBottom: '1rem' }}>
                                Back to team list
                            </button>
                            {executorHistory.length === 0 ? (
                                <div className="empty-state" style={{ padding: '2rem' }}>
                                    <p>No completed tasks yet</p>
                                </div>
                            ) : (
                                executorHistory.map(task => (
                                    <div key={task.id} className="history-task-item">
                                        <div className="history-task-header">
                                            <span className="kanban-card-id">TASK-{task.id}</span>
                                            <span className={`badge badge-${task.status.toLowerCase()}`}>{task.status}</span>
                                        </div>
                                        <h4>{task.title}</h4>
                                        <p className="history-task-desc">{task.description.substring(0, 100)}...</p>
                                        {task.completedAt && <div className="history-date">Completed: {formatDate(task.completedAt)}</div>}
                                        {task.closedAt && <div className="history-date">Closed: {formatDate(task.closedAt)}</div>}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </Modal>
            </main>
        </div>
    );
}

export default ManagerDashboard;
