// using native fetch

const API_URL = 'http://localhost:5000/api';

async function testVisibility() {
    try {
        // 1. Login as Manager
        console.log('1. Logging in as Manager...');
        const managerRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'maria@taskflow.com', password: 'manager123' })
        });
        const managerData = await managerRes.json();
        if (!managerData.success) throw new Error('Manager login failed');
        const managerToken = managerData.data.token;
        console.log('   Manager logged in.');

        // 2. Login as Executor
        console.log('2. Logging in as Executor...');
        const executorRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'ana@taskflow.com', password: 'executor123' })
        });
        const executorData = await executorRes.json();
        if (!executorData.success) throw new Error('Executor login failed');
        const executorToken = executorData.data.token;
        const executorId = executorData.data.user.id;
        console.log(`   Executor logged in (ID: ${executorId}).`);

        // 3. Manager creates a task (to ensure we have a fresh one)
        console.log('3. Manager creating a new task...');
        const newTaskRes = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${managerToken}`
            },
            body: JSON.stringify({
                title: 'Debug Task ' + Date.now(),
                description: 'Testing visibility',
                priority: 'high'
            })
        });
        const newTaskData = await newTaskRes.json();
        const taskId = newTaskData.data.id;
        console.log(`   Task created (ID: ${taskId}).`);

        // 4. Manager assigns task to Executor
        console.log(`4. Assigning Task ${taskId} to Executor ${executorId}...`);
        const assignRes = await fetch(`${API_URL}/tasks/${taskId}/assign`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${managerToken}`
            },
            body: JSON.stringify({ assignedToId: executorId })
        });
        const assignData = await assignRes.json();
        console.log('   Assign response:', assignData.success ? 'Success' : assignData.message);

        // 5. Executor fetches tasks
        console.log('5. Executor fetching tasks...');
        const tasksRes = await fetch(`${API_URL}/tasks`, {
            headers: { 'Authorization': `Bearer ${executorToken}` }
        });
        const tasksData = await tasksRes.json();

        // 6. Check if task is present
        const found = tasksData.data.find(t => t.id === taskId);

        if (found) {
            console.log('SUCCESS: Task found in Executor\'s list!');
            console.log('Task Status:', found.status);
            console.log('Task AssignedTo:', found.assignedToId);
        } else {
            console.error('FAILURE: Task NOT found in Executor\'s list.');
            console.log('Total tasks fetched:', tasksData.data.length);
            console.log('Task IDs:', tasksData.data.map(t => t.id));
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testVisibility();
