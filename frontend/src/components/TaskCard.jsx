function TaskCard({ task, onAssign, onComplete, onClose, onDelete, userRole }) {
    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className={`task-card status-${task.status.toLowerCase()} fade-in`}>
            <div className="task-header">
                <h3 className="task-title">{task.title}</h3>
                <div className="task-badges">
                    <span className={`badge badge-${task.status.toLowerCase()}`}>
                        {task.status}
                    </span>
                    <span className={`badge badge-${task.priority}`}>
                        {task.priority}
                    </span>
                </div>
            </div>

            <p className="task-description">{task.description}</p>

            <div className="task-meta">
                {task.creator && (
                    <div className="task-meta-item">
                        <span>Created by: {task.creator.username}</span>
                    </div>
                )}
                {task.assignee && (
                    <div className="task-meta-item">
                        <span>Assigned to: {task.assignee.username}</span>
                    </div>
                )}
                {task.dueDate && (
                    <div className="task-meta-item">
                        <span>Due: {formatDate(task.dueDate)}</span>
                    </div>
                )}
                <div className="task-meta-item">
                    <span>Created: {formatDate(task.createdAt)}</span>
                </div>
            </div>

            <div className="task-actions">
                {userRole === 'manager' && task.status === 'OPEN' && onAssign && (
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onAssign(task)}
                    >
                        Assign
                    </button>
                )}

                {userRole === 'manager' && task.status === 'COMPLETED' && onClose && (
                    <button
                        className="btn btn-success btn-sm"
                        onClick={() => onClose(task.id)}
                    >
                        Close Task
                    </button>
                )}

                {userRole === 'manager' && task.status === 'OPEN' && onDelete && (
                    <button
                        className="btn btn-danger btn-sm"
                        onClick={() => onDelete(task.id)}
                    >
                        Delete
                    </button>
                )}

                {userRole === 'executor' && task.status === 'PENDING' && onComplete && (
                    <button
                        className="btn btn-success btn-sm"
                        onClick={() => onComplete(task.id)}
                    >
                        Mark Complete
                    </button>
                )}
            </div>
        </div>
    );
}

export default TaskCard;
