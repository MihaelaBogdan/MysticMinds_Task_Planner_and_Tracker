require('dotenv').config();
const { sequelize, User, Task, Comment } = require('../models');

const seedDatabase = async () => {
    try {
        console.log('Se pornește popularea bazei de date...');

        await sequelize.sync({ force: true });
        console.log('Baza de date sincronizată!');

        const admin = await User.create({
            username: 'admin',
            email: 'admin@taskflow.com',
            password: 'admin123',
            role: 'admin'
        });
        console.log('Admin creat:', admin.email);

        const manager1 = await User.create({
            username: 'Maria',
            email: 'maria@taskflow.com',
            password: 'manager123',
            role: 'manager'
        });

        const manager2 = await User.create({
            username: 'Diana',
            email: 'diana@taskflow.com',
            password: 'manager123',
            role: 'manager'
        });
        console.log('Manageri creați:', manager1.email, manager2.email);

        const executor1 = await User.create({
            username: 'Ana',
            email: 'ana@taskflow.com',
            password: 'executor123',
            role: 'executor',
            managerId: manager1.id
        });

        const executor2 = await User.create({
            username: 'Elena',
            email: 'elena@taskflow.com',
            password: 'executor123',
            role: 'executor',
            managerId: manager1.id
        });

        const executor3 = await User.create({
            username: 'Sofia',
            email: 'sofia@taskflow.com',
            password: 'executor123',
            role: 'executor',
            managerId: manager2.id
        });
        console.log('Executori creați:', executor1.email, executor2.email, executor3.email);

        const task1 = await Task.create({
            title: 'Design new landing page',
            description: 'Create a beautiful, modern landing page for our product launch. Include hero section, features, testimonials, and contact form.',
            priority: 'high',
            status: 'OPEN',
            createdById: manager1.id,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        const task2 = await Task.create({
            title: 'Update user documentation',
            description: 'Review and update all user guides with the latest features. Ensure screenshots are current.',
            priority: 'medium',
            status: 'PENDING',
            createdById: manager1.id,
            assignedToId: executor1.id
        });

        const task3 = await Task.create({
            title: 'Fix login page bug',
            description: 'Users report that the login button is not responding on mobile devices. Investigate and fix.',
            priority: 'high',
            status: 'COMPLETED',
            createdById: manager1.id,
            assignedToId: executor2.id,
            completedAt: new Date()
        });

        const task4 = await Task.create({
            title: 'Prepare quarterly report',
            description: 'Compile all metrics and create the Q4 performance report for stakeholders.',
            priority: 'medium',
            status: 'CLOSED',
            createdById: manager2.id,
            assignedToId: executor3.id,
            completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            closedAt: new Date()
        });

        console.log('Task-uri exemplu create!');
        console.log('Baza de date populată cu succes!');
        console.log('Conturi de test:');
        console.log('Admin:    admin@taskflow.com / admin123');
        console.log('Manager:  maria@taskflow.com / manager123');
        console.log('Manager:  diana@taskflow.com / manager123');
        console.log('Executor: ana@taskflow.com / executor123');
        console.log('Executor: elena@taskflow.com / executor123');
        console.log('Executor: sofia@taskflow.com / executor123');

        process.exit(0);
    } catch (error) {
        console.error('Eroare la populare:', error);
        process.exit(1);
    }
};

seedDatabase();
