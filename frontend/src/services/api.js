const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

const getToken = () => localStorage.getItem('token');

const getHeaders = () => {
    const headers = {
        'Content-Type': 'application/json',
    };
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const handleResponse = async (response) => {
    let data;
    try {
        const text = await response.text();
        data = JSON.parse(text);
    } catch (e) {
        // Response is not valid JSON (server error page, etc.)
        throw new Error('Server error. Please try again later.');
    }
    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }
    return data;
};

export const authApi = {
    login: async (email, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        return handleResponse(response);
    },

    register: async (userData) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(userData),
        });
        return handleResponse(response);
    },

    registerPublic: async (userData) => {
        const response = await fetch(`${API_URL}/auth/register/public`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        return handleResponse(response);
    },

    getProfile: async () => {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: getHeaders(),
        });
        return handleResponse(response);
    },
};

export const usersApi = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/users`, {
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    getManagers: async () => {
        const response = await fetch(`${API_URL}/users/managers`, {
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    getExecutors: async () => {
        const response = await fetch(`${API_URL}/users/executors`, {
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    delete: async (id) => {
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    promote: async (id) => {
        const response = await fetch(`${API_URL}/users/${id}/promote`, {
            method: 'PATCH',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    reassign: async (id, managerId) => {
        const response = await fetch(`${API_URL}/users/${id}/reassign`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ managerId }),
        });
        return handleResponse(response);
    },
};

export const tasksApi = {
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${API_URL}/tasks?${params}`, {
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    getById: async (id) => {
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    getHistory: async () => {
        const response = await fetch(`${API_URL}/tasks/history`, {
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    getExecutorHistory: async (executorId) => {
        const response = await fetch(`${API_URL}/tasks/executor/${executorId}/history`, {
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    create: async (taskData) => {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(taskData),
        });
        return handleResponse(response);
    },

    update: async (id, taskData) => {
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(taskData),
        });
        return handleResponse(response);
    },

    assign: async (id, assignedToId) => {
        const response = await fetch(`${API_URL}/tasks/${id}/assign`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ assignedToId }),
        });
        return handleResponse(response);
    },

    complete: async (id) => {
        const response = await fetch(`${API_URL}/tasks/${id}/complete`, {
            method: 'PATCH',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    close: async (id) => {
        const response = await fetch(`${API_URL}/tasks/${id}/close`, {
            method: 'PATCH',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    delete: async (id) => {
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    updateStatus: async (id, status) => {
        const response = await fetch(`${API_URL}/tasks/${id}/status`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ status }),
        });
        return handleResponse(response);
    },
};
