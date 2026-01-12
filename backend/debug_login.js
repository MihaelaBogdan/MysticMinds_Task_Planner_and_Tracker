
// using native fetch
// Node 18+ has native fetch. I'll use that.

async function testLogin() {
    try {
        console.log('Fetching...');
        const res = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@taskflow.com', password: 'admin123' })
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);
    } catch (e) {
        console.error('Error:', e);
    }
}

testLogin();
