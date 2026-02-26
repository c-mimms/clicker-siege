const socket = io();

let myId = null;
let allPlayers = {};

const elements = {
    statusBar: document.querySelector('#status-bar span'),
    clicks: document.getElementById('my-clicks'),
    health: document.getElementById('my-health'),
    healthBar: document.getElementById('my-health-bar'),
    army: document.getElementById('my-army'),
    clickBtn: document.getElementById('click-btn'),
    repairBtn: document.getElementById('repair-btn'),
    recruitBtn: document.getElementById('recruit-btn'),
    playerList: document.getElementById('player-list'),
    battleLog: document.getElementById('battle-log'),
    myName: document.getElementById('my-name'),
    gameMap: document.getElementById('game-map'),
    autoClickerBtn: document.getElementById('upgrade-autoclick-btn'),
    recruitPowerBtn: document.getElementById('upgrade-recruit-btn')
};

socket.on('connect', () => {
    elements.statusBar.textContent = 'Connected';
    elements.statusBar.style.color = 'var(--success)';
});

socket.on('disconnect', () => {
    elements.statusBar.textContent = 'Disconnected';
    elements.statusBar.style.color = 'var(--danger)';
});

socket.on('init', (data) => {
    myId = data.id;
    allPlayers = data.players;
    updateUI();
});

socket.on('updatePlayers', (players) => {
    allPlayers = players;
    updateUI();
});

socket.on('notification', (msg) => {
    addLog(msg, 'var(--accent)');
});

socket.on('attackLaunched', (data) => {
    addLog(`🚀 ${data.from} launched an attack on ${data.to} (Power: ${data.power})`, 'var(--text-secondary)');
});

function updateUI() {
    const me = allPlayers[myId];
    if (!me) return;

    elements.clicks.textContent = me.clicks;
    elements.health.textContent = `${me.health}%`;
    elements.healthBar.style.width = `${me.health}%`;
    elements.army.textContent = me.army;
    elements.myName.textContent = `${me.name} (${me.status})`;

    if (me.status === 'Defeated') {
        elements.clickBtn.disabled = true;
        elements.clickBtn.textContent = 'DEFEATED';
        elements.repairBtn.disabled = true;
        elements.recruitBtn.disabled = true;
        elements.autoClickerBtn.disabled = true;
        elements.recruitPowerBtn.disabled = true;
    }

    // Update Upgrade Buttons
    const acCost = 50 + (me.upgrades.autoClickers * 50);
    elements.autoClickerBtn.textContent = `Auto-Clicker (Lv. ${me.upgrades.autoClickers}) - Cost: ${acCost}`;
    elements.autoClickerBtn.classList.toggle('affordable', me.clicks >= acCost);

    const rpCost = 100 + ((me.upgrades.recruitPower - 5) * 20);
    elements.recruitPowerBtn.textContent = `Recruit Power (Lv. ${Math.floor(me.upgrades.recruitPower/5)}) - Cost: ${rpCost}`;
    elements.recruitPowerBtn.classList.toggle('affordable', me.clicks >= rpCost);

    // Update Player List
    elements.playerList.innerHTML = '';
    
    // Update Map
    elements.gameMap.innerHTML = '';

    Object.values(allPlayers).forEach(p => {
        // Player List entry
        if (p.id !== myId) {
            const item = document.createElement('div');
            item.className = 'player-item';
            item.innerHTML = `
                <div class="player-info">
                    <span class="player-name">${p.name}</span>
                    <span class="label">HP: ${p.health}% | Army: ${p.army} | ${p.status}</span>
                </div>
                <button class="attack-btn" ${me.army <= 0 || p.status === 'Defeated' || me.status === 'Defeated' ? 'disabled' : ''} onclick="attack('${p.id}')">ATTACK</button>
            `;
            elements.playerList.appendChild(item);
        }

        // Map dot
        const dot = document.createElement('div');
        dot.className = 'player-dot';
        if (p.id === myId) dot.classList.add('me');
        else dot.classList.add('enemy');
        if (p.status === 'Defeated') dot.style.opacity = '0.3';

        dot.style.left = `${p.x}%`;
        dot.style.top = `${p.y}%`;
        dot.innerHTML = `<span class="name-tag">${p.name}</span>`;
        dot.title = `${p.name} (${p.status})`;
        
        if (p.id !== myId && p.status !== 'Defeated' && me.status !== 'Defeated') {
            dot.onclick = () => {
                if (me.army > 0) attack(p.id);
            };
        }

        elements.gameMap.appendChild(dot);
    });
}

function addLog(msg, color) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.style.color = color;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    elements.battleLog.prepend(div);
}

// Global actions
window.attack = (id) => {
    socket.emit('attack', id);
};

elements.clickBtn.addEventListener('click', () => {
    socket.emit('click');
    // Local feedback
    const val = parseInt(elements.clicks.textContent);
    elements.clicks.textContent = val + 1;
});

elements.repairBtn.addEventListener('click', () => socket.emit('repair'));
elements.recruitBtn.addEventListener('click', () => socket.emit('recruit'));
elements.autoClickerBtn.addEventListener('click', () => socket.emit('buyUpgrade', 'autoClicker'));
elements.recruitPowerBtn.addEventListener('click', () => socket.emit('buyUpgrade', 'recruitPower'));
