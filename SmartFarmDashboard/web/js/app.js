/* ==========================================================
   SmartFarm Dashboard — Main App & MQTT Controller
   ========================================================== */

// ── State ─────────────────────────────────────────────────
const state = {
    temp: 0,
    hum: 0,
    fire: false,
    relay1: false,  // Fountain
    relay2: false,  // Lamp
    relay3: false,
    relay4: false,
    relay5: false,
    relay6: false,
    relay7: false,
    relay8: false,
    connected: false
};

// ── DOM Elements ──────────────────────────────────────────
const elTemp = document.getElementById('val-temp');
const elHum = document.getElementById('val-hum');
const elFire = document.getElementById('val-fire');
const elMqttDot = document.getElementById('mqtt-dot');
const elMqttLabel = document.getElementById('mqtt-label');
const elAlarm = document.getElementById('alarm-overlay');

// Cache DOM untuk ke-8 Relay menggunakan array (index 0 untuk relay1)
const elRelays = [];
const btnRelays = [];
for (let i = 1; i <= 8; i++) {
    elRelays.push(document.getElementById(`val-r${i}`));
    btnRelays.push(document.getElementById(`btn-r${i}`));
}

// Store global mqtt client
let mqttClient = null;

// ── Canvas Setup ──────────────────────────────────────────
const canvas = document.getElementById('farm-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for opaque background

let width, height;
function resize() {
    // Kebun dibuat 2x lebih lebar dari layar agar bisa di-scroll ke samping
    width = window.innerWidth * 2;
    height = window.innerHeight;
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    // Set CSS dimension
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    ctx.scale(dpr, dpr);
    
    if (scene) scene.resize(width, height);
}
window.addEventListener('resize', resize);

// ── Scene Objects ─────────────────────────────────────────
const scene = {
    sky: null,
    field: null,
    fence: null,
    animals: [],
    trees: [],
    hut: null,
    fountains: [],
    lamps: [],
    fireFx: null,
    smokeFx: null,
    massiveSmoke: null,
    dam: null,
    pens: [],
    farmAnimals: [],

    init(w, h) {
        this.sky = new Sky(w, h);
        this.fence = new Fence(h * 0.55);
        this.field = new RiceField(w, h);
        
        const s = Math.min(w / 1280, h / 720);
        
        this.animals = [
            new Giraffe(w * 0.2, h * 0.58, s * 0.8, 25),
            new Giraffe(w * 0.6, h * 0.62, s * 1.0, 15),
            new Giraffe(w * 0.8, h * 0.65, s * 1.2, 20)
        ];
        
        this.hut = new Hut(w * 0.68, h * 0.72, s);
        
        this.dam = new RiverDam(w * 0.15, h * 0.72, s);
        
        this.trees = [
            new CoconutTree(w * 0.15, h * 0.68, 150, 1.0 * s, -8),
            new CoconutTree(w * 0.88, h * 0.70, 140, 0.9 * s, 6),
            new CoconutTree(w * 0.50, h * 0.65, 120, 0.75 * s, -4)
        ];
        this.fountains = [
            new Fountain(w * 0.25, h * 0.78, s),
            new Fountain(w * 0.45, h * 0.72, s),
            new Fountain(w * 0.60, h * 0.80, s),
            new Fountain(w * 0.85, h * 0.76, s)
        ];
        
        const roof = this.hut.roofTop;
        this.fireFx = new FireEffect(roof.x, roof.y + 10 * s, s);
        this.smokeFx = new SmokeEffect(roof.x, roof.y - 10 * s, s);
        this.massiveSmoke = new MassiveSmoke(s);
        
        this.lamps = [
            new GardenLamp(w * 0.1, h * 0.70, s * 0.9),
            new GardenLamp(w * 0.3, h * 0.65, s * 0.8),
            new GardenLamp(w * 0.5, h * 0.68, s * 1.0),
            new GardenLamp(w * 0.7, h * 0.66, s * 0.85),
            new GardenLamp(w * 0.9, h * 0.72, s * 1.1)
        ];
        
        this.pens = [];
        this.farmAnimals = [];
        // Buat 3 kandang di area kanan agak ke tengah agar tidak tertutup UI
        const penXs = [w * 0.60, w * 0.73, w * 0.86];
        for (let i = 0; i < 3; i++) {
            const px = penXs[i];
            const py = h * 0.68;
            const pen = new AnimalPen(px, py, 220, 100, s);
            this.pens.push(pen);
            
            // Masukkan 4 hewan ke dalam setiap kandang (mix kambing/domba)
            for (let j = 0; j < 4; j++) {
                const ax = px + Utils.rand(-80, 80) * s;
                const ay = py + Utils.rand(-20, 20) * s;
                const type = Math.random() > 0.5 ? 'sheep' : 'goat';
                this.farmAnimals.push(new FarmAnimal(ax, ay, s * 0.6, type, pen));
            }
        }
        
        // Sun Drag Interaction — responsif dan tidak nyangkut saat di-scroll
        let isDraggingSun = false;
        let dragOffsetX = 0, dragOffsetY = 0;
        const SUN_PAD = 60; // jarak minimal dari tepi layar

        canvas.addEventListener('mousedown', (e) => {
            const mouseX = e.pageX;
            const mouseY = e.pageY;
            if (Math.hypot(mouseX - this.sky.sunX, mouseY - this.sky.sunY) < 60) {
                isDraggingSun = true;
                dragOffsetX = this.sky.sunX - mouseX;
                dragOffsetY = this.sky.sunY - mouseY;
                document.body.style.cursor = 'grabbing';
            }
        });
        window.addEventListener('mousemove', (e) => {
            if (isDraggingSun) {
                const rawX = e.pageX + dragOffsetX;
                const rawY = e.pageY + dragOffsetY;
                // Clamp agar matahari tidak keluar dari total lebar kebun
                this.sky.sunX = Utils.clamp(rawX, SUN_PAD, width - SUN_PAD);
                this.sky.sunY = Utils.clamp(rawY, SUN_PAD, height * 0.58);
            } else {
                const mx = e.pageX;
                const my = e.pageY;
                if (Math.hypot(mx - this.sky.sunX, my - this.sky.sunY) < 60) {
                    canvas.style.cursor = 'grab';
                } else {
                    canvas.style.cursor = 'default';
                }
            }
        });
        const stopDrag = () => { 
            if (isDraggingSun) {
                isDraggingSun = false; 
                document.body.style.cursor = 'default'; 
                canvas.style.cursor = 'default';
            }
        };
        window.addEventListener('mouseup', stopDrag);

        // Touch support (mobile)
        canvas.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            const tx = t.pageX;
            const ty = t.pageY;
            if (Math.hypot(tx - this.sky.sunX, ty - this.sky.sunY) < 80) {
                isDraggingSun = true;
                dragOffsetX = this.sky.sunX - tx;
                dragOffsetY = this.sky.sunY - ty;
                e.preventDefault();
            }
        }, { passive: false });
        window.addEventListener('touchmove', (e) => {
            if (!isDraggingSun) return;
            const t = e.touches[0];
            const rawX = t.pageX + dragOffsetX;
            const rawY = t.pageY + dragOffsetY;
            this.sky.sunX = Utils.clamp(rawX, SUN_PAD, width - SUN_PAD);
            this.sky.sunY = Utils.clamp(rawY, SUN_PAD, height * 0.58);
            e.preventDefault();
        }, { passive: false });
        window.addEventListener('touchend', stopDrag);
    },

    resize(w, h) {
        if (!this.sky) return;
        this.sky.resize(w, h);
        this.fence = new Fence(h * 0.55);
        this.field.resize(w, h);
        
        const s = Math.min(w / 1280, h / 720);
        
        if (this.animals.length > 0) {
            this.animals[0].y = h * 0.58; this.animals[0].scale = s * 0.8;
            this.animals[1].y = h * 0.62; this.animals[1].scale = s * 1.0;
            this.animals[2].y = h * 0.65; this.animals[2].scale = s * 1.2;
        }
        
        this.hut.setPos(w * 0.68, h * 0.72);
        this.hut.scale = s;
        
        this.dam = new RiverDam(w * 0.15, h * 0.72, s);
        
        this.trees[0] = new CoconutTree(w * 0.15, h * 0.68, 150, 1.0 * s, -8);
        this.trees[1] = new CoconutTree(w * 0.88, h * 0.70, 140, 0.9 * s, 6);
        this.trees[2] = new CoconutTree(w * 0.50, h * 0.65, 120, 0.75 * s, -4);
        this.fountains[0].setPos(w * 0.25, h * 0.78);
        this.fountains[1].setPos(w * 0.45, h * 0.72);
        this.fountains[2].setPos(w * 0.60, h * 0.80);
        this.fountains[3].setPos(w * 0.85, h * 0.76);
        for (const f of this.fountains) f.scale = s;
        
        const roof = this.hut.roofTop;
        this.fireFx.setPos(roof.x, roof.y + 10 * s);
        this.fireFx.scale = s;
        this.smokeFx.setPos(roof.x, roof.y - 10 * s);
        this.smokeFx.scale = s;
        this.massiveSmoke.scale = s;
        
        if (this.lamps.length > 0) {
            this.lamps[0] = new GardenLamp(w * 0.1, h * 0.70, s * 0.9);
            this.lamps[1] = new GardenLamp(w * 0.3, h * 0.65, s * 0.8);
            this.lamps[2] = new GardenLamp(w * 0.5, h * 0.68, s * 1.0);
            this.lamps[3] = new GardenLamp(w * 0.7, h * 0.66, s * 0.85);
            this.lamps[4] = new GardenLamp(w * 0.9, h * 0.72, s * 1.1);
        }

        this.pens = [];
        this.farmAnimals = [];
        const penXs = [w * 0.60, w * 0.73, w * 0.86];
        for (let i = 0; i < 3; i++) {
            const px = penXs[i];
            const py = h * 0.68;
            const pen = new AnimalPen(px, py, 220, 100, s);
            this.pens.push(pen);
            
            for (let j = 0; j < 4; j++) {
                const ax = px + Utils.rand(-80, 80) * s;
                const ay = py + Utils.rand(-20, 20) * s;
                const type = Math.random() > 0.5 ? 'sheep' : 'goat';
                this.farmAnimals.push(new FarmAnimal(ax, ay, s * 0.6, type, pen));
            }
        }
    },

    update(dt) {
        this.sky.update(dt);
        this.field.update(dt);
        this.dam.update(dt, state.relay6);
        for (const a of this.animals) a.update(dt, width);
        for (const t of this.trees) t.update(dt);
        this.hut.update(dt);
        for (const f of this.fountains) f.update(dt, state.relay1);
        for (const l of this.lamps) l.update(dt);   // animasi flicker lampu
        
        const relayStates = [state.relay3, state.relay4, state.relay5];
        for (let i = 0; i < 3; i++) {
            const pen = this.pens[i];
            const penAnimals = this.farmAnimals.filter(a => a.pen === pen);
            
            pen.update(dt, relayStates[i], penAnimals);
            
            const isDoorOpenAI = relayStates[i] && pen.doorYOffset < -10 * pen.scale;
            for (const fa of penAnimals) {
                fa.update(dt, isDoorOpenAI, width);
            }
        }

        this.fireFx.update(dt, state.fire);
        this.smokeFx.update(dt, state.fire);
        this.massiveSmoke.update(dt, state.fire, height);
    },

    draw(ctx) {
        // Clear background
        ctx.fillStyle = '#0a0f1a';
        ctx.fillRect(0, 0, width, height);

        // Z-order rendering
        this.sky.draw(ctx);
        this.fence.draw(ctx, width);
        this.field.drawBack(ctx);
        
        this.dam.draw(ctx);
        
        for (const a of this.animals) a.draw(ctx);
        
        // Draw pens and farm animals
        for (const p of this.pens) p.drawBack(ctx);
        // Sort farmAnimals by y for correct z-depth rendering
        this.farmAnimals.sort((a, b) => a.y - b.y);
        for (const a of this.farmAnimals) a.draw(ctx);
        for (const p of this.pens) p.drawFront(ctx);

        if (this.trees[2]) this.trees[2].draw(ctx);
        
        for (const f of this.fountains) f.draw(ctx, state.relay1);
        for (const l of this.lamps) l.draw(ctx, state.relay2);
        this.hut.draw(ctx, state);
        
        this.smokeFx.draw(ctx, state.fire);
        this.fireFx.draw(ctx, state.fire);
        
        if (this.trees[0]) this.trees[0].draw(ctx);
        if (this.trees[1]) this.trees[1].draw(ctx);
        
        this.field.drawFront(ctx);
        
        // Massive Fire Fog
        this.massiveSmoke.draw(ctx, state.fire);

        // ── Day/Night Lighting Overlay ──
        // Multiply blending for darkness based on sun position
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        const sunX = this.sky.sunX, sunY = this.sky.sunY;
        const darkR0 = 100;  // inner radius (bright zone)
        const darkR1 = Math.max(darkR0 + 1, width * 1.2); // outer radius (must be > r0)
        const darkRadial = ctx.createRadialGradient(sunX, sunY, darkR0, sunX, sunY, darkR1);
        darkRadial.addColorStop(0, 'rgba(255, 255, 255, 1)');      // Near sun is bright
        darkRadial.addColorStop(0.35, 'rgba(120, 140, 160, 1)');   // Mid distance
        darkRadial.addColorStop(1, 'rgba(15, 20, 40, 1)');         // Far away is dark night
        ctx.fillStyle = darkRadial;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // ── Ambient subtle dari relay2 (sudah di-handle engine.js, ini hanya scene-wide) ──
        if (state.relay2) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            for (const lamp of this.lamps) {
                const lx = lamp.x;
                const ly = lamp.y;
                const ls = lamp.scale;

                // Sangat subtle — hanya sedikit menerangi area sekitar
                const areaR = Math.max(20, 280 * ls);
                const areaGrad = ctx.createRadialGradient(
                    lx, ly - 80*ls, 0,
                    lx, ly + areaR * 0.3, areaR
                );
                areaGrad.addColorStop(0,    'rgba(255, 255, 232, 0.10)');
                areaGrad.addColorStop(0.35, 'rgba(255, 253, 225, 0.05)');
                areaGrad.addColorStop(1,    'rgba(255, 250, 215, 0)');
                ctx.fillStyle = areaGrad;
                ctx.beginPath();
                ctx.arc(lx, ly, areaR, 0, Math.PI * 2);
                ctx.fill();
            }

            // Hut window
            const wx = this.hut.x + 120 * this.hut.scale / 4 - 11 * this.hut.scale;
            const wy = this.hut.y - 40 * this.hut.scale - 10 * this.hut.scale;
            const hwGlow = ctx.createRadialGradient(wx, wy, 0, wx, wy, 90 * this.hut.scale);
            hwGlow.addColorStop(0,   'rgba(255, 255, 225, 0.22)');
            hwGlow.addColorStop(0.5, 'rgba(255, 252, 215, 0.08)');
            hwGlow.addColorStop(1,   'rgba(255, 248, 205, 0)');
            ctx.fillStyle = hwGlow;
            ctx.beginPath();
            ctx.arc(wx, wy, 90 * this.hut.scale, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

    }
};

// ── Main Loop ─────────────────────────────────────────────
let lastTime = performance.now();
function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1); // Cap dt at 100ms
    lastTime = now;

    try {
        scene.update(dt);
        scene.draw(ctx);
    } catch(err) {
        console.error('[SmartFarm] Render error:', err);
    }

    requestAnimationFrame(loop);
}

// ── UI Updates ────────────────────────────────────────────
function updateUI() {
    // Temp
    elTemp.textContent = `${state.temp.toFixed(1)} °C`;
    elTemp.className = 'dash-value ' + (state.temp > 40 ? 'val-danger' : (state.temp > 35 ? 'val-warning' : 'val-normal'));
    
    // Hum
    elHum.textContent = `${state.hum.toFixed(0)} %`;
    
    // Fire
    elFire.textContent = state.fire ? 'FIRE !' : 'Normal';
    elFire.className = 'dash-value ' + (state.fire ? 'val-danger' : 'val-normal');
    if (state.fire) {
        elAlarm.classList.add('active');
    } else {
        elAlarm.classList.remove('active');
    }
    
    // Relays
    for (let i = 1; i <= 8; i++) {
        const val = state[`relay${i}`];
        elRelays[i-1].textContent = val ? 'ON' : 'OFF';
        elRelays[i-1].className = 'dash-value ' + (val ? 'val-warning' : 'val-off');
    }
}

// ── Button Interactions ───────────────────────────────────
for (let i = 1; i <= 8; i++) {
    btnRelays[i-1].addEventListener('click', () => {
        state[`relay${i}`] = !state[`relay${i}`];
        if (state.connected && mqttClient) {
            mqttClient.publish(`smartfarm/relay${i}`, state[`relay${i}`] ? 'ON' : 'OFF');
        }
        updateUI();
    });
}

// ── MQTT Connection ───────────────────────────────────────
function initMQTT() {
    // Sinkronisasi dengan host dari Arduino/ESP32: 1bc1dac2fc494e0481bb492b4c298940
    // Gunakan port 8884 dan wss:// untuk koneksi WebBrowser
    const brokerUrl = 'wss://1bc1dac2fc494e0481bb492b4c298940.s1.eu.hivemq.cloud:8884/mqtt';
    const clientId = 'SmartFarmWeb_' + Math.random().toString(16).substr(2, 8);
    
    const options = {
        clientId: clientId,
        clean: true,
        connectTimeout: 4000,
        username: 'agussunardi',
        password: 'Agussunardi2005',
        reconnectPeriod: 2000,
    };

    elMqttLabel.textContent = 'Connecting...';

    mqttClient = mqtt.connect(brokerUrl, options);

    mqttClient.on('connect', () => {
        console.log('[MQTT] Connected');
        state.connected = true;
        elMqttDot.classList.remove('disconnected');
        elMqttLabel.textContent = 'Connected';
        const subs = [
            'smartfarm/temperature',
            'smartfarm/humidity',
            'smartfarm/fire'
        ];
        for (let i = 1; i <= 8; i++) subs.push(`smartfarm/relay${i}`);
        
        mqttClient.subscribe(subs);
    });

    mqttClient.on('reconnect', () => {
        console.log('[MQTT] Reconnecting...');
        state.connected = false;
        elMqttDot.classList.add('disconnected');
        elMqttLabel.textContent = 'Reconnecting...';
    });

    mqttClient.on('error', (err) => {
        console.error('[MQTT] Error:', err);
    });

    mqttClient.on('message', (topic, message) => {
        const payload = message.toString();
        
        if (topic === 'smartfarm/temperature') {
            state.temp = parseFloat(payload) || 0;
        } else if (topic === 'smartfarm/humidity') {
            state.hum = parseFloat(payload) || 0;
        } else if (topic === 'smartfarm/fire') {
            state.fire = payload.toUpperCase() === 'ON';
        } else if (topic.startsWith('smartfarm/relay')) {
            const rNum = parseInt(topic.replace('smartfarm/relay', ''));
            if (rNum >= 1 && rNum <= 8) {
                state[`relay${rNum}`] = payload.toUpperCase() === 'ON';
            }
        }
        
        updateUI();
    });
}

// ── Debug Keyboard Controls ───────────────────────────────
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    // Relay 1-8
    if (key >= '1' && key <= '8') {
        const rNum = parseInt(key);
        state[`relay${rNum}`] = !state[`relay${rNum}`];
        if (state.connected && mqttClient) {
            mqttClient.publish(`smartfarm/relay${rNum}`, state[`relay${rNum}`] ? 'ON' : 'OFF');
        }
        updateUI();
        return;
    }

    switch (key) {
        case 'f':
            state.fire = !state.fire;
            break;
        case 't':
            state.temp += 5;
            if (state.temp > 50) state.temp = 20;
            break;
        case 'h':
            state.hum += 10;
            if (state.hum > 100) state.hum = 40;
            break;
        case 'r':
            state.temp = 0; state.hum = 0; state.fire = false;
            for (let i = 1; i <= 8; i++) {
                state[`relay${i}`] = false;
                if (state.connected && mqttClient) mqttClient.publish(`smartfarm/relay${i}`, 'OFF');
            }
            break;
    }
    updateUI();
});

// ── Init ──────────────────────────────────────────────────
resize();
scene.init(width, height);
updateUI();
requestAnimationFrame(loop);

// Initialize MQTT (will fail auth until credentials are set)
initMQTT();
