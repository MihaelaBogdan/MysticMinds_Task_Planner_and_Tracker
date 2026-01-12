
const { sequelize, User } = require('./models');

async function updateNames() {
    try {
        console.log('Updating user names...');

        await User.update({ username: 'Maria' }, { where: { email: 'maria@taskflow.com' } });
        await User.update({ username: 'Diana' }, { where: { email: 'diana@taskflow.com' } });
        await User.update({ username: 'Ana' }, { where: { email: 'ana@taskflow.com' } });
        await User.update({ username: 'Elena' }, { where: { email: 'elena@taskflow.com' } });
        await User.update({ username: 'Sofia' }, { where: { email: 'sofia@taskflow.com' } });

        // Also clean up any other users ending in 'Executor' if they exist from manual creation
        const users = await User.findAll();
        for (const user of users) {
            if (user.username.endsWith(' Executor')) {
                const newName = user.username.replace(' Executor', '');
                await user.update({ username: newName });
                console.log(`Renamed ${user.username} to ${newName}`);
            }
        }

        console.log('User names updated successfully.');
    } catch (error) {
        console.error('Error updating names:', error);
    } finally {
        await sequelize.close();
    }
}

updateNames();
