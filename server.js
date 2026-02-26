const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

let players = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Initialize player
    players[socket.id] = {
        id: socket.id,
        name: `Player ${socket.id.substr(0, 4)}`,
        clicks: 0,
        health: 100,
        army: 0,
        status: 'Alive',
        x: Math.floor(Math.random() * 90) + 5, // 5-95% to stay within bounds
        y: Math.floor(Math.random() * 90) + 5,
        upgrades: {
            autoClickers: 0,
            recruitPower: 5
        }
    };

    // Send initial state
    socket.emit('init', { id: socket.id, players });
    io.emit('updatePlayers', players);

    // Auto-clicker interval
    const autoClickInterval = setInterval(() => {
        const p = players[socket.id];
        if (p && p.status === 'Alive' && p.upgrades.autoClickers > 0) {
            p.clicks += p.upgrades.autoClickers;
            io.emit('updatePlayers', players);
        }
    }, 1000);

    socket.on('click', () => {
        if (players[socket.id] && players[socket.id].status === 'Alive') {
            players[socket.id].clicks++;
            io.emit('updatePlayers', players);
        }
    });

    socket.on('buyUpgrade', (upgradeType) => {
        const p = players[socket.id];
        if (!p || p.status !== 'Alive') return;

        if (upgradeType === 'autoClicker') {
            const cost = 50 + (p.upgrades.autoClickers * 50);
            if (p.clicks >= cost) {
                p.clicks -= cost;
                p.upgrades.autoClickers++;
                io.emit('notification', `${p.name} upgraded Auto-Clicker to level ${p.upgrades.autoClickers}!`);
                io.emit('updatePlayers', players);
            }
        } else if (upgradeType === 'recruitPower') {
            const cost = 100 + ((p.upgrades.recruitPower - 5) * 20);
            if (p.clicks >= cost) {
                p.clicks -= cost;
                p.upgrades.recruitPower += 5;
                io.emit('notification', `${p.name} upgraded Recruit Power!`);
                io.emit('updatePlayers', players);
            }
        }
    });

    socket.on('repair', () => {
        const p = players[socket.id];
        if (p && p.status === 'Alive' && p.clicks >= 10) {
            p.clicks -= 10;
            p.health = Math.min(100, p.health + 10);
            io.emit('updatePlayers', players);
        }
    });

    socket.on('recruit', () => {
        const p = players[socket.id];
        if (p && p.status === 'Alive' && p.clicks >= 25) {
            p.clicks -= 25;
            p.army += p.upgrades.recruitPower;
            io.emit('updatePlayers', players);
        }
    });

    socket.on('attack', (targetId) => {
        const p = players[socket.id];
        const target = players[targetId];

        if (p && target && p.status === 'Alive' && target.status === 'Alive' && p.army > 0) {
            const damage = p.army;
            p.army = 0; // Consume army for the attack

            // Calculate travel time based on distance
            const dist = Math.sqrt(Math.pow(p.x - target.x, 2) + Math.pow(p.y - target.y, 2));
            const travelTime = Math.max(1000, dist * 50);

            // Simulate attack delay
            io.emit('attackLaunched', { from: p.name, to: target.name, power: damage });
            
            setTimeout(() => {
                if (players[targetId]) {
                    players[targetId].health -= damage;
                    if (players[targetId].health <= 0) {
                        players[targetId].health = 0;
                        players[targetId].status = 'Defeated';
                        io.emit('notification', `${target.name} has been defeated by ${p.name}!`);
                    }
                    io.emit('updatePlayers', players);
                }
            }, travelTime);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        clearInterval(autoClickInterval);
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
