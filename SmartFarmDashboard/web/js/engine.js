/* ==========================================================
   SmartFarm Dashboard — Canvas Rendering Engine
   All visual objects drawn procedurally on HTML5 Canvas.
   ========================================================== */

/* ----------------------------------------------------------
   UTILITIES
   ---------------------------------------------------------- */
const Utils = {
    lerp(a, b, t) { return a + (b - a) * t; },
    clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); },
    rand(lo, hi) { return lo + Math.random() * (hi - lo); },
    randInt(lo, hi) { return Math.floor(Utils.rand(lo, hi + 1)); },

    lerpColor(c1, c2, t) {
        return [
            Math.round(Utils.lerp(c1[0], c2[0], t)),
            Math.round(Utils.lerp(c1[1], c2[1], t)),
            Math.round(Utils.lerp(c1[2], c2[2], t)),
        ];
    },

    rgba(r, g, b, a = 1) {
        return `rgba(${r},${g},${b},${a})`;
    },

    /** Sum-of-sines pseudo-noise for natural motion */
    noise(x, t) {
        return Math.sin(x * 0.7 + t) * 0.5
             + Math.sin(x * 1.3 + t * 1.7) * 0.3
             + Math.sin(x * 2.1 + t * 0.6) * 0.2;
    },
};


/* ----------------------------------------------------------
   PARTICLE SYSTEM
   ---------------------------------------------------------- */
class Particle {
    constructor(x, y, vx, vy, life, sizeStart, sizeEnd, colorStart, colorEnd, gravity = 0, drag = 0) {
        this.x = x;  this.y = y;
        this.vx = vx; this.vy = vy;
        this.life = life; this.maxLife = life;
        this.sizeStart = sizeStart; this.sizeEnd = sizeEnd;
        this.colorStart = colorStart; this.colorEnd = colorEnd;
        this.gravity = gravity; this.drag = drag;
        this.alive = true;
    }

    get t() { return 1 - Utils.clamp(this.life / this.maxLife, 0, 1); }
    get size() { return Utils.lerp(this.sizeStart, this.sizeEnd, this.t); }

    update(dt) {
        this.life -= dt;
        if (this.life <= 0) { this.alive = false; return; }
        this.vy += this.gravity * dt;
        if (this.drag > 0) {
            const f = Math.max(0, 1 - this.drag * dt);
            this.vx *= f; this.vy *= f;
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    draw(ctx) {
        if (!this.alive || this.size < 0.3) return;
        const c = Utils.lerpColor(this.colorStart, this.colorEnd, this.t);
        const aStart = this.colorStart[3] !== undefined ? this.colorStart[3] : 1;
        const aEnd   = this.colorEnd[3]   !== undefined ? this.colorEnd[3]   : 0;
        const alpha  = Utils.lerp(aStart, aEnd, this.t);
        const r = Math.max(0.5, this.size);

        ctx.save();
        ctx.globalAlpha = Utils.clamp(alpha, 0, 1);
        ctx.fillStyle = Utils.rgba(c[0], c[1], c[2]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Emitter {
    constructor(cfg) {
        this.x = cfg.x || 0;
        this.y = cfg.y || 0;
        this.rate = cfg.rate || 30;
        this.speedMin = cfg.speedMin || 40;
        this.speedMax = cfg.speedMax || 100;
        this.angleMin = cfg.angleMin || -100;
        this.angleMax = cfg.angleMax || -80;
        this.lifeMin = cfg.lifeMin || 0.5;
        this.lifeMax = cfg.lifeMax || 1.0;
        this.sizeStart = cfg.sizeStart || 4;
        this.sizeEnd = cfg.sizeEnd || 1;
        this.colorStart = cfg.colorStart || [255,255,255,1];
        this.colorEnd = cfg.colorEnd || [255,255,255,0];
        this.gravity = cfg.gravity || 0;
        this.drag = cfg.drag || 0;
        this.spreadX = cfg.spreadX || 0;
        this.spreadY = cfg.spreadY || 0;
        this.active = true;
        this._particles = [];
        this._acc = 0;
    }

    setPos(x, y) { this.x = x; this.y = y; }

    update(dt) {
        if (this.active) {
            this._acc += dt;
            const interval = 1 / this.rate;
            while (this._acc >= interval) {
                this._acc -= interval;
                this._spawn();
            }
        }
        for (const p of this._particles) p.update(dt);
        this._particles = this._particles.filter(p => p.alive);
    }

    draw(ctx) {
        for (const p of this._particles) p.draw(ctx);
    }

    clear() { this._particles = []; }
    get count() { return this._particles.length; }

    _spawn() {
        const a = Utils.rand(this.angleMin, this.angleMax) * Math.PI / 180;
        const sp = Utils.rand(this.speedMin, this.speedMax);
        const lt = Utils.rand(this.lifeMin, this.lifeMax);
        this._particles.push(new Particle(
            this.x + Utils.rand(-this.spreadX, this.spreadX),
            this.y + Utils.rand(-this.spreadY, this.spreadY),
            Math.cos(a) * sp, Math.sin(a) * sp,
            lt, this.sizeStart, this.sizeEnd,
            this.colorStart, this.colorEnd,
            this.gravity, this.drag
        ));
    }
}


/* ----------------------------------------------------------
   SKY — gradient + sun + clouds
   ---------------------------------------------------------- */
class SkyCloud {
    constructor(x, y, scale, speed) {
        this.x = x; this.y = y; this.scale = scale; this.speed = speed;
        this.blobs = [];
        const n = Utils.randInt(4, 7);
        for (let i = 0; i < n; i++) {
            this.blobs.push({
                ox: Utils.rand(-35, 35) * scale,
                oy: Utils.rand(-8, 8) * scale,
                rx: Utils.rand(28, 55) * scale,
                ry: Utils.rand(16, 30) * scale,
            });
        }
    }

    update(dt, w) {
        this.x += this.speed * dt;
        const maxR = Math.max(...this.blobs.map(b => Math.abs(b.ox) + b.rx));
        if (this.x > w + maxR + 50) this.x = -maxR - 50;
        if (this.x < -maxR - 50) this.x = w + maxR + 50;
    }

    draw(ctx) {
        for (const b of this.blobs) {
            const cx = this.x + b.ox, cy = this.y + b.oy;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.rx);
            grad.addColorStop(0, 'rgba(248, 252, 255, 0.85)');
            grad.addColorStop(0.45, 'rgba(240, 246, 252, 0.5)');
            grad.addColorStop(0.75, 'rgba(230, 240, 250, 0.2)');
            grad.addColorStop(1, 'rgba(220, 235, 250, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(cx, cy, b.rx, b.ry, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Sky {
    constructor(w, h) {
        this.w = w; this.h = h;
        this.time = 0;
        this.sunX = w * 0.82;
        this.sunY = h * 0.12;
        this.clouds = [];
        this._initClouds();
    }

    _initClouds() {
        this.clouds = [];
        const specs = [
            [0.08, 0.08, 0.9, 14], [0.30, 0.05, 1.1, 10],
            [0.52, 0.11, 0.7, 18], [0.72, 0.07, 1.0, 12],
            [0.92, 0.09, 0.8, 16],
        ];
        for (const [rx, ry, sc, sp] of specs) {
            this.clouds.push(new SkyCloud(rx * this.w, ry * this.h, sc, sp));
        }
    }

    resize(w, h) { 
        this.w = w; this.h = h; 
        this.sunX = w * 0.82;
        this.sunY = h * 0.12;
        this._initClouds(); 
    }

    update(dt) {
        this.time += dt;
        for (const c of this.clouds) c.update(dt, this.w);
    }

    draw(ctx) {
        const skyH = this.h * 0.62;

        // Multi-stop sky gradient for a more vibrant, clear sky
        const grad = ctx.createLinearGradient(0, 0, 0, skyH);
        grad.addColorStop(0,    '#0b5394'); // Deeper rich blue at top
        grad.addColorStop(0.25, '#2986cc'); 
        grad.addColorStop(0.50, '#6fa8dc');
        grad.addColorStop(0.72, '#9fc5e8');
        grad.addColorStop(0.88, '#cfe2f3');
        grad.addColorStop(1.0,  '#e0f7fa'); // Very bright near horizon
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.w, skyH);

        // Horizon haze
        const haze = ctx.createLinearGradient(0, skyH - 40, 0, skyH + 30);
        haze.addColorStop(0, 'rgba(200, 220, 235, 0)');
        haze.addColorStop(1, 'rgba(200, 220, 235, 0.35)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, skyH - 40, this.w, 70);

        // Sun
        this._drawSun(ctx);

        // Clouds
        for (const c of this.clouds) c.draw(ctx);
    }

    _drawSun(ctx) {
        const sx = this.sunX, sy = this.sunY;
        const pulse = 1 + 0.03 * Math.sin(this.time * 1.5);

        // Large atmospheric glow
        const g1 = ctx.createRadialGradient(sx, sy, 0, sx, sy, 120 * pulse);
        g1.addColorStop(0, 'rgba(255, 250, 200, 0.25)');
        g1.addColorStop(0.4, 'rgba(255, 230, 140, 0.08)');
        g1.addColorStop(1, 'rgba(255, 200, 80, 0)');
        ctx.fillStyle = g1;
        ctx.beginPath();
        ctx.arc(sx, sy, 120 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Corona
        const g2 = ctx.createRadialGradient(sx, sy, 10, sx, sy, 40 * pulse);
        g2.addColorStop(0, 'rgba(255, 252, 230, 0.7)');
        g2.addColorStop(0.5, 'rgba(255, 240, 160, 0.25)');
        g2.addColorStop(1, 'rgba(255, 220, 100, 0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(sx, sy, 40 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Sun disc with gradient
        const g3 = ctx.createRadialGradient(sx - 3, sy - 3, 0, sx, sy, 20 * pulse);
        g3.addColorStop(0, '#fffef0');
        g3.addColorStop(0.5, '#ffe868');
        g3.addColorStop(1, '#ffcc33');
        ctx.fillStyle = g3;
        ctx.beginPath();
        ctx.arc(sx, sy, 20 * pulse, 0, Math.PI * 2);
        ctx.fill();
    }
}


/* ----------------------------------------------------------
   RICE FIELD — multi-layer sine-wave paddy
   ---------------------------------------------------------- */
class RiceField {
    constructor(w, h) {
        this.w = w; this.h = h;
        this.time = 0;
        this.layers = [];
        this._build();
    }

    _build() {
        this.layers = [
            { yFrac: 0.56, hFrac: 0.10, color: [60, 115, 35],  density: 10, stalkH: 20, sway: 4.5, speed: 0.8, phase: 0 },
            { yFrac: 0.62, hFrac: 0.10, color: [75, 150, 45],  density: 8,  stalkH: 26, sway: 6.0, speed: 1.0, phase: 1.5 },
            { yFrac: 0.68, hFrac: 0.10, color: [90, 180, 55],  density: 7,  stalkH: 30, sway: 7.0, speed: 1.2, phase: 3.0 },
            { yFrac: 0.75, hFrac: 0.11, color: [105, 205, 65], density: 6,  stalkH: 34, sway: 8.5, speed: 1.0, phase: 4.5 },
            { yFrac: 0.83, hFrac: 0.12, color: [120, 225, 75], density: 5,  stalkH: 38, sway: 10.0, speed: 1.3, phase: 6.0 },
        ];
    }

    resize(w, h) { this.w = w; this.h = h; }

    update(dt) { this.time += dt; }

    /** Draw only the first N layers (behind objects) */
    drawBack(ctx) { this._drawGround(ctx); this._drawLayers(ctx, 0, 2); }

    /** Draw remaining layers (in front of objects) */
    drawFront(ctx) { this._drawLayers(ctx, 2, this.layers.length); }

    _drawGround(ctx) {
        const gy = this.h * 0.55;
        // Earth gradient
        const grad = ctx.createLinearGradient(0, gy, 0, this.h);
        grad.addColorStop(0, '#6b5030');
        grad.addColorStop(0.3, '#5a4228');
        grad.addColorStop(1, '#3a2a18');
        ctx.fillStyle = grad;
        ctx.fillRect(0, gy, this.w, this.h - gy);
    }

    _drawLayers(ctx, from, to) {
        for (let li = from; li < to; li++) {
            const L = this.layers[li];
            const yTop = this.h * L.yFrac;
            const layerH = this.h * L.hFrac;

            // Water shimmer strip
            ctx.save();
            const shimmer = 0.08 + 0.04 * Math.sin(this.time * 2 + L.phase);
            ctx.globalAlpha = shimmer;
            ctx.fillStyle = '#5090c0';
            ctx.fillRect(0, yTop, this.w, layerH);
            ctx.restore();

            // Rice stalks
            const spacing = L.density;
            const baseY = yTop + layerH * 0.85;
            for (let x = 0; x < this.w; x += spacing) {
                const windPhase = x * 0.06 + L.phase;
                const sway = L.sway * Utils.noise(x * 0.01, this.time * L.speed * 1.5 + windPhase);
                const h = L.stalkH + Utils.noise(x * 0.13, 0) * 5;

                // Stalk — quadratic curve for natural bend
                const tipX = x + sway;
                const tipY = baseY - h;
                const midX = x + sway * 0.3;
                const midY = baseY - h * 0.5;

                ctx.strokeStyle = Utils.rgba(L.color[0], L.color[1], L.color[2], 0.85);
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(x, baseY);
                ctx.quadraticCurveTo(midX, midY, tipX, tipY);
                ctx.stroke();

                // Grain tip — small leaf
                const leafSway = sway * 0.5;
                ctx.strokeStyle = Utils.rgba(
                    Math.min(255, L.color[0] + 30),
                    Math.min(255, L.color[1] + 35),
                    Math.min(255, L.color[2] + 15), 0.7
                );
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX + leafSway + 4, tipY - 3);
                ctx.stroke();
            }
        }
    }
}


/* ----------------------------------------------------------
   COCONUT TREE — curved trunk + animated fronds
   ---------------------------------------------------------- */
class CoconutTree {
    constructor(x, y, height = 160, scale = 1, lean = 0) {
        this.baseX = x; this.baseY = y;
        this.height = height; this.scale = scale; this.lean = lean;
        this.time = 0;

        // Generate fronds
        this.fronds = [];
        const angles = [-75, -50, -28, -5, 18, 42, 68];
        for (const a of angles) {
            this.fronds.push({
                baseAngle: a,
                length: Utils.rand(60, 85),
                droop: Utils.rand(0.7, 1.4),
                phase: Utils.rand(0, Math.PI * 2),
                swayAmp: Utils.rand(3, 7),
            });
        }

        // Coconuts
        this.coconuts = [];
        for (let i = 0; i < Utils.randInt(2, 4); i++) {
            this.coconuts.push({ ox: Utils.rand(-10, 10), oy: Utils.rand(2, 14) });
        }
    }

    update(dt) { this.time += dt; }

    draw(ctx) {
        const s = this.scale;
        const trunkSway = 3 * Math.sin(this.time * 0.45) * s;

        // Trunk — curved segments with bark texture
        const segments = 16;
        const trunkPts = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const bend = trunkSway * t * t;
            const leanOff = Math.sin(this.lean * Math.PI / 180) * this.height * t * s;
            trunkPts.push({
                x: this.baseX + leanOff + bend,
                y: this.baseY - this.height * t * s,
            });
        }

        for (let i = 1; i < trunkPts.length; i++) {
            const t = i / trunkPts.length;
            const w = Math.max(1, (7 - 4 * t) * s);
            // Bark color variation
            const bark = i % 3 === 0 ? '#5a3e22' : i % 3 === 1 ? '#6b4a30' : '#7a5838';
            ctx.strokeStyle = bark;
            ctx.lineWidth = w;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(trunkPts[i-1].x, trunkPts[i-1].y);
            ctx.lineTo(trunkPts[i].x, trunkPts[i].y);
            ctx.stroke();

            // Bark rings
            if (i % 2 === 0 && w > 2) {
                ctx.strokeStyle = 'rgba(0,0,0,0.12)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(trunkPts[i].x - w/2, trunkPts[i].y);
                ctx.lineTo(trunkPts[i].x + w/2, trunkPts[i].y);
                ctx.stroke();
            }
        }

        // Crown position
        const crown = trunkPts[trunkPts.length - 1];

        // Coconuts
        for (const c of this.coconuts) {
            const cx = crown.x + c.ox * s, cy = crown.y + c.oy * s;
            ctx.fillStyle = '#5a3a20';
            ctx.beginPath();
            ctx.arc(cx, cy, 4.5 * s, 0, Math.PI * 2);
            ctx.fill();
            // Highlight
            ctx.fillStyle = '#7a5535';
            ctx.beginPath();
            ctx.arc(cx - 1, cy - 1, 2.5 * s, 0, Math.PI * 2);
            ctx.fill();
        }

        // Fronds
        for (const f of this.fronds) {
            this._drawFrond(ctx, crown.x, crown.y, f);
        }
    }

    _drawFrond(ctx, bx, by, f) {
        const s = this.scale;
        const sway = f.swayAmp * Math.sin(this.time * 0.7 + f.phase);
        const angle = (f.baseAngle + sway) * Math.PI / 180;
        const segs = 10;
        const pts = [{ x: bx, y: by }];

        let cx = bx, cy = by;
        for (let i = 1; i <= segs; i++) {
            const t = i / segs;
            const segAngle = angle + f.droop * t * t;
            const segLen = (f.length * s) / segs;
            cx += Math.sin(segAngle) * segLen;
            cy -= Math.cos(segAngle) * segLen * (1 - 0.3 * t);
            pts.push({ x: cx, y: cy });
        }

        // Main stem
        ctx.strokeStyle = '#2a7a22';
        ctx.lineWidth = 2 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();

        // Leaflets along the frond
        for (let i = 2; i < pts.length; i++) {
            const dx = pts[i].x - pts[i-1].x;
            const dy = pts[i].y - pts[i-1].y;
            const px = -dy * 0.45, py = dx * 0.45;
            const lt = 1 - (i / pts.length) * 0.4;

            // Alternate greens for visual richness
            const green = i % 2 === 0 ? '#3a9930' : '#50b040';
            ctx.strokeStyle = green;
            ctx.lineWidth = 1;

            // Left leaflet
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[i].x + px * lt, pts[i].y + py * lt);
            ctx.stroke();
            // Right leaflet
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[i].x - px * lt, pts[i].y - py * lt);
            ctx.stroke();
        }
    }
}


/* ----------------------------------------------------------
   HUT — isometric hut with door, window, lamp
   ---------------------------------------------------------- */
class Hut {
    constructor(x, y, scale = 1) {
        this.x = x; this.y = y; this.scale = scale;
        this.time = 0;
    }

    setPos(x, y) { this.x = x; this.y = y; }

    update(dt) { this.time += dt; }

    get roofTop() {
        const s = this.scale;
        return { x: this.x, y: this.y - 80 * s - 55 * s };
    }

    draw(ctx, state) {
        const s = this.scale;
        const x = this.x, y = this.y;
        const fw = 120 * s, fh = 80 * s;
        const sw = 50 * s, sh = 30 * s;
        const rh = 55 * s;

        // Ground shadow
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(x + 10, y + 4, 80 * s, 14 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ── Front wall ──
        const wallGrad = ctx.createLinearGradient(x - fw/2, 0, x + fw/2, 0);
        wallGrad.addColorStop(0, '#8a6540');
        wallGrad.addColorStop(0.5, '#a07850');
        wallGrad.addColorStop(1, '#937048');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(x - fw/2, y - fh, fw, fh);
        ctx.strokeStyle = '#3a2810';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - fw/2, y - fh, fw, fh);

        // Bamboo texture on front wall
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        for (let i = 6; i < fh; i += 7 * s) {
            ctx.beginPath();
            ctx.moveTo(x - fw/2 + 3, y - fh + i);
            ctx.lineTo(x + fw/2 - 3, y - fh + i);
            ctx.stroke();
        }

        // ── Side wall (right) ──
        ctx.fillStyle = '#7a5838';
        ctx.beginPath();
        ctx.moveTo(x + fw/2, y - fh);
        ctx.lineTo(x + fw/2 + sw, y - fh - sh);
        ctx.lineTo(x + fw/2 + sw, y - sh);
        ctx.lineTo(x + fw/2, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Side wall texture
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        for (let i = 6; i < fh; i += 7 * s) {
            const t = i / fh;
            ctx.beginPath();
            ctx.moveTo(x + fw/2, y - fh + i);
            ctx.lineTo(x + fw/2 + sw, y - fh - sh + i);
            ctx.stroke();
        }

        // ── Door ──
        const dw = 22 * s, dh = 42 * s;
        const dx = x - fw/4 - dw/2, dy = y - dh;
        const doorGrad = ctx.createLinearGradient(dx, dy, dx, dy + dh);
        doorGrad.addColorStop(0, '#4a2e15');
        doorGrad.addColorStop(1, '#3a2210');
        ctx.fillStyle = doorGrad;
        ctx.fillRect(dx, dy, dw, dh);
        ctx.strokeStyle = '#2a1808';
        ctx.lineWidth = 1;
        ctx.strokeRect(dx, dy, dw, dh);
        // Handle
        ctx.fillStyle = '#c0a060';
        ctx.beginPath();
        ctx.arc(dx + dw - 5 * s, dy + dh / 2, 2 * s, 0, Math.PI * 2);
        ctx.fill();

        // ── Window ──
        const ww = 22 * s, wh = 20 * s;
        const wx = x + fw/4 - ww/2, wy = y - fh/2 - wh/2 - 2;

        if (state.relay2) {
            // Lit window
            const pulse = 0.8 + 0.2 * Math.sin(this.time * 3);

            // Glow around window
            ctx.save();
            const glow = ctx.createRadialGradient(
                wx + ww/2, wy + wh/2, 0,
                wx + ww/2, wy + wh/2, 50 * s * pulse
            );
            glow.addColorStop(0, `rgba(255, 230, 120, ${0.25 * pulse})`);
            glow.addColorStop(0.5, `rgba(255, 210, 80, ${0.08 * pulse})`);
            glow.addColorStop(1, 'rgba(255, 200, 50, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(wx - 40 * s, wy - 40 * s, ww + 80 * s, wh + 80 * s);
            ctx.restore();

            // Window pane
            ctx.fillStyle = `rgba(255, 235, 130, ${0.85 * pulse})`;
            ctx.fillRect(wx, wy, ww, wh);

            // Light from door
            ctx.save();
            ctx.globalAlpha = 0.15 * pulse;
            ctx.fillStyle = '#ffe080';
            ctx.fillRect(dx, dy, dw, dh);
            ctx.restore();

            // Ground light spill
            ctx.save();
            const groundGlow = ctx.createRadialGradient(x, y, 0, x, y, 60 * s);
            groundGlow.addColorStop(0, `rgba(255, 225, 100, ${0.12 * pulse})`);
            groundGlow.addColorStop(1, 'rgba(255, 225, 100, 0)');
            ctx.fillStyle = groundGlow;
            ctx.fillRect(x - 60 * s, y - 20 * s, 120 * s, 40 * s);
            ctx.restore();
        } else {
            // Dark window
            ctx.fillStyle = '#35302a';
            ctx.fillRect(wx, wy, ww, wh);
        }

        // Window mullion cross
        ctx.strokeStyle = '#2a1808';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(wx + ww/2, wy);
        ctx.lineTo(wx + ww/2, wy + wh);
        ctx.moveTo(wx, wy + wh/2);
        ctx.lineTo(wx + ww, wy + wh/2);
        ctx.stroke();
        ctx.strokeRect(wx, wy, ww, wh);

        // ── Roof (front triangle) ──
        const peak = { x: x, y: y - fh - rh };
        const roofL = { x: x - fw/2 - 12*s, y: y - fh + 6*s };
        const roofR = { x: x + fw/2 + 12*s, y: y - fh + 6*s };

        const roofGrad = ctx.createLinearGradient(peak.x, peak.y, peak.x, roofL.y);
        roofGrad.addColorStop(0, '#5a3a1e');
        roofGrad.addColorStop(1, '#4a2e15');
        ctx.fillStyle = roofGrad;
        ctx.beginPath();
        ctx.moveTo(peak.x, peak.y);
        ctx.lineTo(roofL.x, roofL.y);
        ctx.lineTo(roofR.x, roofR.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#2a1808';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Thatch lines
        ctx.strokeStyle = 'rgba(100, 70, 35, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i < rh; i += 6 * s) {
            const t = i / rh;
            const lx = Utils.lerp(roofL.x, peak.x, t);
            const rx = Utils.lerp(roofR.x, peak.x, t);
            const ly = Utils.lerp(roofL.y, peak.y, t);
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(rx, ly);
            ctx.stroke();
        }

        // ── Roof (right side) ──
        const sideTop = { x: peak.x + sw, y: peak.y - sh };
        const sideBot = { x: roofR.x + sw, y: roofR.y - sh };
        ctx.fillStyle = '#6a4828';
        ctx.beginPath();
        ctx.moveTo(peak.x, peak.y);
        ctx.lineTo(sideTop.x, sideTop.y);
        ctx.lineTo(sideBot.x, sideBot.y);
        ctx.lineTo(roofR.x, roofR.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // ── Alarm light on roof peak ──
        if (state.fire) {
            const blink = Math.sin(this.time * 8) > 0;
            const alarmX = peak.x, alarmY = peak.y - 6 * s;
            if (blink) {
                // Alarm glow
                const ag = ctx.createRadialGradient(alarmX, alarmY, 0, alarmX, alarmY, 20 * s);
                ag.addColorStop(0, 'rgba(255, 50, 30, 0.6)');
                ag.addColorStop(1, 'rgba(255, 30, 20, 0)');
                ctx.fillStyle = ag;
                ctx.beginPath();
                ctx.arc(alarmX, alarmY, 20 * s, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = blink ? '#ff3020' : '#992015';
            ctx.beginPath();
            ctx.arc(alarmX, alarmY, 5 * s, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}


/* ----------------------------------------------------------
   FOUNTAIN — particle-based water fountain
   ---------------------------------------------------------- */
class Fountain {
    constructor(x, y, scale = 1) {
        this.x = x; this.y = y; this.scale = scale;
        this.time = 0;

        this.jet = new Emitter({
            x, y: y - 12 * scale,
            rate: 300, speedMin: 180*scale, speedMax: 280*scale,
            angleMin: -100, angleMax: -80,
            lifeMin: 0.8, lifeMax: 1.5,
            sizeStart: 5*scale, sizeEnd: 2*scale,
            colorStart: [190, 230, 255, 0.9], colorEnd: [210, 240, 255, 0.1],
            gravity: 300*scale, spreadX: 8*scale,
        });

        this.splash = new Emitter({
            x, y,
            rate: 150, speedMin: 50*scale, speedMax: 110*scale,
            angleMin: -160, angleMax: -20,
            lifeMin: 0.3, lifeMax: 0.7,
            sizeStart: 3.5*scale, sizeEnd: 1*scale,
            colorStart: [220, 240, 255, 0.75], colorEnd: [230, 250, 255, 0],
            gravity: 200*scale, spreadX: 15*scale,
        });
    }

    setPos(x, y) {
        this.x = x; this.y = y;
        this.jet.setPos(x, y - 12 * this.scale);
        this.splash.setPos(x, y);
    }

    update(dt, relay1) {
        this.time += dt;
        this.jet.active = relay1;
        this.splash.active = relay1;
        this.jet.update(dt);
        this.splash.update(dt);
    }

    draw(ctx, relay1) {
        const s = this.scale, x = this.x, y = this.y;

        // Pond
        ctx.save();
        ctx.fillStyle = '#60492e';
        ctx.beginPath();
        ctx.ellipse(x, y, 42*s, 14*s, 0, 0, Math.PI * 2);
        ctx.fill();

        const waterAlpha = 0.7 + 0.1 * Math.sin(this.time * 2.5);
        ctx.globalAlpha = waterAlpha;
        const pg = ctx.createRadialGradient(x, y, 0, x, y, 36*s);
        pg.addColorStop(0, '#4a90c0');
        pg.addColorStop(0.7, '#3a78a8');
        pg.addColorStop(1, '#2a6090');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.ellipse(x, y, 36*s, 11*s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Pillar
        ctx.fillStyle = '#a09580';
        ctx.fillRect(x - 4*s, y - 16*s, 8*s, 16*s);
        ctx.fillStyle = '#b0a590';
        ctx.beginPath();
        ctx.ellipse(x, y - 16*s, 10*s, 4*s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Strawberry Bushes
        this._drawStrawberries(ctx);

        // Particles
        this.jet.draw(ctx);
        this.splash.draw(ctx);

        // Ripples when active
        if (relay1) {
            ctx.save();
            ctx.strokeStyle = 'rgba(160, 210, 240, 0.35)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const rt = (this.time * 1.5 + i * 0.35) % 1;
                const rr = (15 + 22 * rt) * s;
                ctx.globalAlpha = 0.5 * (1 - rt);
                ctx.beginPath();
                ctx.ellipse(x, y, rr, rr * 0.35, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    _drawStrawberries(ctx) {
        const s = this.scale;
        const x = this.x, y = this.y;
        
        // Define bush positions around the pond
        const bushes = [
            {ox: -38, oy: -2, r: 16},
            {ox: -22, oy: 10, r: 14},
            {ox: 0,   oy: 15, r: 15},
            {ox: 22,  oy: 10, r: 13},
            {ox: 38,  oy: 0,  r: 17}
        ];
        
        for (let i = 0; i < bushes.length; i++) {
            const b = bushes[i];
            const bx = x + b.ox * s;
            const by = y + b.oy * s;
            const br = b.r * s;
            
            // Draw bush base (dark green)
            ctx.fillStyle = '#225a18';
            ctx.beginPath();
            ctx.arc(bx, by, br, 0, Math.PI * 2);
            ctx.arc(bx - br*0.4, by - br*0.3, br*0.8, 0, Math.PI * 2);
            ctx.arc(bx + br*0.4, by - br*0.2, br*0.9, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw bush highlights (light green)
            ctx.fillStyle = '#3a8c25';
            ctx.beginPath();
            ctx.arc(bx, by - br*0.2, br*0.75, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw strawberries (red dots with pseudo-random placement)
            // Use index to ensure they stay in the exact same spot every frame
            const seed = i * 13.7; 
            const numBerries = 3 + (i % 3); // 3 to 5 berries per bush
            
            for (let j = 0; j < numBerries; j++) {
                const angle = (seed + j * 2.1) % (Math.PI * 2);
                const dist = (seed + j * 4.3) % (br * 0.65);
                
                const sx = bx + Math.cos(angle) * dist;
                const sy = by + Math.sin(angle) * dist;
                
                // Berry body
                ctx.fillStyle = '#e62020';
                ctx.beginPath();
                ctx.arc(sx, sy, 2.5 * s, 0, Math.PI * 2);
                ctx.fill();
                
                // Berry highlight
                ctx.fillStyle = '#ff8888';
                ctx.beginPath();
                ctx.arc(sx - 0.8*s, sy - 0.8*s, 0.8 * s, 0, Math.PI * 2);
                ctx.fill();
                
                // Little green leaf on top of berry
                ctx.fillStyle = '#60e040';
                ctx.fillRect(sx - 1*s, sy - 3*s, 2*s, 1*s);
            }
        }
    }
}

/* ----------------------------------------------------------
   FENCE
   ---------------------------------------------------------- */
class Fence {
    constructor(y) {
        this.y = y;
    }
    
    draw(ctx, w) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        // Horizontal rails
        ctx.fillRect(0, this.y - 15, w, 6);
        ctx.fillRect(0, this.y - 35, w, 6);
        
        // Vertical posts
        for (let x = 20; x < w; x += 60) {
            ctx.fillRect(x, this.y - 45, 8, 50);
            // Post cap
            ctx.beginPath();
            ctx.moveTo(x, this.y - 45);
            ctx.lineTo(x + 4, this.y - 50);
            ctx.lineTo(x + 8, this.y - 45);
            ctx.fill();
        }
        ctx.restore();
    }
}

/* ----------------------------------------------------------
   GIRAFFE (Hewan Berkeliaran)
   ---------------------------------------------------------- */
class Giraffe {
    constructor(x, y, scale = 1, speed = 20) {
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.speed = speed;
        this.direction = 1; // 1 for right, -1 for left
        this.time = Utils.rand(0, 10);
    }
    
    update(dt, width) {
        this.time += dt;
        this.x += this.speed * this.direction * dt;
        
        // Turn around at screen edges
        if (this.x > width + 100) this.direction = -1;
        if (this.x < -100) this.direction = 1;
    }
    
    draw(ctx) {
        const s = this.scale;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.direction * s, s);
        
        // Animation variables
        const walkCycle = this.time * 3;
        const legSwing = Math.sin(walkCycle) * 10; // degrees
        const neckBob = Math.sin(walkCycle * 2) * 2;
        
        ctx.fillStyle = '#f4c430'; // Base yellow
        
        // Draw Legs (Back)
        ctx.save();
        ctx.rotate((legSwing + 10) * Math.PI / 180);
        ctx.fillRect(-15, -40, 6, 40);
        ctx.restore();
        
        ctx.save();
        ctx.translate(15, 0);
        ctx.rotate((-legSwing + 10) * Math.PI / 180);
        ctx.fillRect(-3, -40, 6, 40);
        ctx.restore();
        
        // Draw Legs (Front)
        ctx.save();
        ctx.rotate((-legSwing) * Math.PI / 180);
        ctx.fillRect(-15, -40, 6, 40);
        ctx.restore();
        
        ctx.save();
        ctx.translate(15, 0);
        ctx.rotate((legSwing) * Math.PI / 180);
        ctx.fillRect(-3, -40, 6, 40);
        ctx.restore();
        
        // Body
        ctx.beginPath();
        ctx.ellipse(0, -45, 25, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Neck
        ctx.save();
        ctx.translate(15, -50 + neckBob);
        ctx.rotate(15 * Math.PI / 180);
        ctx.fillRect(-6, -60, 12, 60);
        
        // Head
        ctx.translate(0, -65);
        ctx.rotate(-15 * Math.PI / 180);
        ctx.beginPath();
        ctx.ellipse(8, 0, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ears/Horns
        ctx.fillStyle = '#d49a20';
        ctx.fillRect(-4, -10, 2, 8);
        ctx.fillRect(-1, -10, 2, 8);
        ctx.beginPath();
        ctx.arc(-3, -11, 2, 0, Math.PI * 2);
        ctx.arc(0, -11, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(4, -2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore(); // end neck & head
        
        // Spots (Brown)
        ctx.fillStyle = '#8b5a2b';
        ctx.beginPath();
        ctx.arc(5, -45, 4, 0, Math.PI * 2);
        ctx.arc(-10, -50, 5, 0, Math.PI * 2);
        ctx.arc(-8, -38, 3, 0, Math.PI * 2);
        ctx.arc(12, -42, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Neck spots
        ctx.save();
        ctx.translate(15, -50 + neckBob);
        ctx.rotate(15 * Math.PI / 180);
        ctx.beginPath();
        ctx.arc(0, -20, 3, 0, Math.PI * 2);
        ctx.arc(-2, -35, 4, 0, Math.PI * 2);
        ctx.arc(2, -48, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Tail
        ctx.strokeStyle = '#f4c430';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-25, -45);
        ctx.quadraticCurveTo(-35, -30, -30, -20);
        ctx.stroke();
        ctx.fillStyle = '#8b5a2b';
        ctx.beginPath();
        ctx.arc(-30, -20, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}


/* ----------------------------------------------------------
   FIRE EFFECT — multi-layer fire particle system
   ---------------------------------------------------------- */
class FireEffect {
    constructor(x, y, scale = 1) {
        this.x = x; this.y = y; this.scale = scale;
        this.time = 0;

        this.core = new Emitter({
            x, y, rate: 50,
            speedMin: 35*scale, speedMax: 90*scale,
            angleMin: -110, angleMax: -70,
            lifeMin: 0.35, lifeMax: 0.7,
            sizeStart: 6*scale, sizeEnd: 1.5*scale,
            colorStart: [255, 240, 60, 1], colorEnd: [220, 60, 20, 0],
            gravity: -35, spreadX: 10*scale, spreadY: 3*scale, drag: 0.5,
        });

        this.outer = new Emitter({
            x, y, rate: 28,
            speedMin: 20*scale, speedMax: 55*scale,
            angleMin: -125, angleMax: -55,
            lifeMin: 0.5, lifeMax: 1.1,
            sizeStart: 8*scale, sizeEnd: 3*scale,
            colorStart: [255, 160, 20, 0.8], colorEnd: [180, 30, 10, 0],
            gravity: -22, spreadX: 16*scale, spreadY: 5*scale, drag: 0.3,
        });

        this.embers = new Emitter({
            x, y, rate: 14,
            speedMin: 50*scale, speedMax: 120*scale,
            angleMin: -135, angleMax: -45,
            lifeMin: 0.8, lifeMax: 1.8,
            sizeStart: 2.5*scale, sizeEnd: 0.3*scale,
            colorStart: [255, 210, 50, 1], colorEnd: [255, 80, 20, 0],
            gravity: -18, spreadX: 22*scale, drag: 0.2,
        });
    }

    setPos(x, y) {
        this.x = x; this.y = y;
        this.core.setPos(x, y); this.outer.setPos(x, y); this.embers.setPos(x, y);
    }

    update(dt, active) {
        this.time += dt;
        this.core.active = active;
        this.outer.active = active;
        this.embers.active = active;
        this.core.update(dt); this.outer.update(dt); this.embers.update(dt);
    }

    draw(ctx, active) {
        if (!active && this.core.count === 0) return;

        // Ground glow
        if (active) {
            const pulse = 0.65 + 0.35 * Math.sin(this.time * 5.5);
            const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 55 * this.scale);
            glow.addColorStop(0, `rgba(255, 120, 30, ${0.2 * pulse})`);
            glow.addColorStop(0.5, `rgba(255, 80, 15, ${0.06 * pulse})`);
            glow.addColorStop(1, 'rgba(255, 60, 10, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 55 * this.scale, 0, Math.PI * 2);
            ctx.fill();
        }

        this.outer.draw(ctx);
        this.core.draw(ctx);
        this.embers.draw(ctx);
    }
}


/* ----------------------------------------------------------
   SMOKE EFFECT
   ---------------------------------------------------------- */
class SmokeEffect {
    constructor(x, y, scale = 1) {
        this.x = x; this.y = y; this.scale = scale;

        this.emitter = new Emitter({
            x, y, rate: 12,
            speedMin: 12*scale, speedMax: 35*scale,
            angleMin: -110, angleMax: -70,
            lifeMin: 1.5, lifeMax: 3.5,
            sizeStart: 5*scale, sizeEnd: 22*scale,
            colorStart: [100, 100, 115, 0.55], colorEnd: [170, 170, 180, 0],
            gravity: -8, drag: 0.12, spreadX: 14*scale,
        });
    }

    setPos(x, y) { this.x = x; this.y = y; this.emitter.setPos(x, y); }

    update(dt, active) {
        this.emitter.active = active;
        this.emitter.update(dt);
    }

    draw(ctx, active) {
        if (!active && this.emitter.count === 0) return;
        this.emitter.draw(ctx);
    }
}

/* ----------------------------------------------------------
   MASSIVE SMOKE (Kabut Asap Kebakaran Menyebar)
   ---------------------------------------------------------- */
class MassiveSmoke {
    constructor(scale = 1) {
        this.scale = scale;
        this.emitter = new Emitter({
            x: 0, y: 0, rate: 80, // High rate for thick smoke
            speedMin: 150 * scale, speedMax: 400 * scale, // moving right fast
            angleMin: -15, angleMax: 15, // roughly horizontal
            lifeMin: 3.0, lifeMax: 7.0,
            sizeStart: 40 * scale, sizeEnd: 250 * scale,
            colorStart: [60, 60, 65, 0.45], colorEnd: [30, 30, 35, 0],
            gravity: -8 * scale, // slightly rising
            spreadY: 500 * scale, // spread vertically across the left edge
        });
    }

    update(dt, active, height) {
        this.emitter.active = active;
        this.emitter.y = height / 2 + 100 * this.scale; // center mostly on ground
        this.emitter.update(dt);
    }

    draw(ctx, active) {
        if (!active && this.emitter.count === 0) return;
        this.emitter.draw(ctx);
    }
}

/* ----------------------------------------------------------
   GARDEN LAMP (Tiang Listrik / Taman)
   ---------------------------------------------------------- */
class GardenLamp {
    constructor(x, y, scale = 1) {
        this.x = x; this.y = y; this.scale = scale;
        // Unique phase offset agar setiap lampu kedipnya beda-beda
        this.phase = Math.random() * Math.PI * 2;
        this.flickerPhase = Math.random() * Math.PI * 2;
        this.time = 0;
    }
    
    setPos(x, y) {
        this.x = x; this.y = y;
    }

    update(dt) {
        this.time += dt;
    }

    draw(ctx, isOn = false) {
        try {
        const s = this.scale;
        const x = this.x, y = this.y;
        
        // Tiang — gradient agar tidak flat
        const poleGrad = ctx.createLinearGradient(x - 3*s, 0, x + 3*s, 0);
        poleGrad.addColorStop(0, '#1a1f26');
        poleGrad.addColorStop(0.4, '#2e3640');
        poleGrad.addColorStop(1, '#161b22');
        ctx.fillStyle = poleGrad;
        ctx.fillRect(x - 3*s, y - 120*s, 6*s, 120*s);
        
        // Base anchor
        ctx.fillStyle = '#1a1f26';
        ctx.beginPath();
        ctx.ellipse(x, y, Math.max(1, 8*s), Math.max(0.5, 3*s), 0, 0, Math.PI * 2);
        ctx.fill();

        // Arm / bracket
        ctx.strokeStyle = '#2e3640';
        ctx.lineWidth = Math.max(0.5, 2.5 * s);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y - 118*s);
        ctx.quadraticCurveTo(x + 10*s, y - 130*s, x + 5*s, y - 140*s);
        ctx.stroke();
        
        // Housing
        ctx.fillStyle = '#2a3040';
        ctx.beginPath();
        ctx.moveTo(x - 14*s, y - 120*s);
        ctx.lineTo(x + 14*s, y - 120*s);
        ctx.lineTo(x + 22*s, y - 136*s);
        ctx.lineTo(x - 22*s, y - 136*s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#3a4455';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (isOn) {
            const flicker = Utils.clamp(
                0.93 + 0.04 * Math.sin(this.time * 6.5  + this.flickerPhase)
                     + 0.03 * Math.sin(this.time * 14.8 + this.phase * 1.9),
                0.88, 1.0);
            const glow = Utils.clamp(
                0.82 + 0.10 * Math.sin(this.time * 1.8  + this.phase)
                     + 0.08 * Math.sin(this.time * 4.5  + this.flickerPhase),
                0.72, 1.0);

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // Cone cahaya dari bohlam ke bawah — natural, tidak overblown
            const coneH = Math.max(20, 300 * s * glow);
            const coneGrad = ctx.createRadialGradient(
                x, y - 115*s, 0,
                x, y + coneH * 0.28, coneH
            );
            coneGrad.addColorStop(0,    `rgba(255, 252, 228, ${0.18 * flicker})`);
            coneGrad.addColorStop(0.20, `rgba(255, 250, 222, ${0.10 * flicker})`);
            coneGrad.addColorStop(0.50, `rgba(255, 248, 215, ${0.04 * glow})`);
            coneGrad.addColorStop(1,    'rgba(255, 245, 205, 0)');
            ctx.fillStyle = coneGrad;
            ctx.beginPath();
            ctx.arc(x, y - 115*s, coneH, 0, Math.PI * 2);
            ctx.fill();

            // Pool oval di tanah — titik paling terang tepat di bawah tiang
            const poolW = Math.max(10, 180 * s * glow);
            const poolH = Math.max(4,  45  * s * glow);
            const poolGrad = ctx.createRadialGradient(x, y, 0, x, y, poolW);
            poolGrad.addColorStop(0,    `rgba(255, 255, 235, ${0.22 * flicker})`);
            poolGrad.addColorStop(0.40, `rgba(255, 252, 225, ${0.10 * glow})`);
            poolGrad.addColorStop(1,    'rgba(255, 248, 215, 0)');
            ctx.fillStyle = poolGrad;
            ctx.beginPath();
            ctx.ellipse(x, y, poolW, poolH, 0, 0, Math.PI * 2);
            ctx.fill();

            // Halo kecil di bohlam
            const haloR = Math.max(6, 24 * s * flicker);
            const haloGrad = ctx.createRadialGradient(
                x, y - 120*s, 0,
                x, y - 120*s, haloR + 0.01
            );
            haloGrad.addColorStop(0,   `rgba(255, 255, 255, ${0.55 * flicker})`);
            haloGrad.addColorStop(0.5, `rgba(255, 255, 245, ${0.20 * flicker})`);
            haloGrad.addColorStop(1,   'rgba(255, 252, 230, 0)');
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(x, y - 120*s, haloR, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            // Titik bohlam inti
            const bulbR = Math.max(2, (6 + 1.5 * flicker) * s);
            ctx.fillStyle = `rgba(255, 255, 252, ${flicker})`;
            ctx.beginPath();
            ctx.arc(x, y - 120*s, bulbR * 0.45, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Keadaan mati — abu-abu redup
            ctx.fillStyle = '#555a60';
            ctx.beginPath();
            ctx.arc(x, y - 120*s, Math.max(1, 7*s), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3a3f45';
            ctx.beginPath();
            ctx.arc(x, y - 120*s, Math.max(0.5, 4*s), 0, Math.PI * 2);
            ctx.fill();
        }
        } catch(e) { /* silently ignore per-lamp draw errors */ }
    }
}

// ==========================================
// Farm Animal (Sheep / Goat)
// ==========================================
class FarmAnimal {
    constructor(x, y, scale, type, pen) {
        this.pen = pen; // reference to AnimalPen
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.type = type;
        this.flip = Math.random() > 0.5 ? 1 : -1;
        
        this.timeOffset = Math.random() * 10;
        this.headBob = 0;
        
        this.state = 'INSIDE'; // INSIDE, EXITING, WANDERING, RETURNING
        this.targetX = x;
        this.targetY = y;
        this.vx = 0;
        this.vy = 0;
        this.speed = Utils.rand(15, 30) * scale;
        
        this.woolBlobs = [];
        if (this.type === 'sheep') {
            for(let i=0; i<6; i++) {
                this.woolBlobs.push({
                    ox: Utils.rand(-25, 25) * scale,
                    oy: Utils.rand(-15, 10) * scale,
                    r: Utils.rand(15, 25) * scale
                });
            }
        }
    }

    update(dt, isDoorOpen, canvasWidth) {
        this.timeOffset += dt * 2;
        
        const distToTarget = Math.hypot(this.targetX - this.x, this.targetY - this.y);
        const penCenterX = this.pen.x;
        const penCenterY = this.pen.y;
        const doorX = this.pen.x;
        const doorY = this.pen.y + this.pen.depth/4 + 10*this.scale; // Just outside the door
        
        // --- State Machine ---
        if (this.state === 'INSIDE') {
            if (isDoorOpen) {
                this.state = 'EXITING';
                this.targetX = doorX + Utils.rand(-20, 20) * this.scale;
                this.targetY = doorY + 40 * this.scale;
                this.speed = Utils.rand(70, 110) * this.scale; // Lari cepat keluar
            } else if (distToTarget < 10 && Math.random() < 0.02) {
                // Random wander inside
                this.targetX = penCenterX + Utils.rand(-this.pen.width/3, this.pen.width/3);
                this.targetY = penCenterY + Utils.rand(-this.pen.depth/5, this.pen.depth/5);
            }
        } else if (this.state === 'EXITING') {
            if (!isDoorOpen) {
                this.state = 'RETURNING';
                this.targetX = penCenterX;
                this.targetY = penCenterY;
            } else if (distToTarget < 10) {
                this.state = 'WANDERING';
                // Langsung mencar jauh!
                this.targetX = doorX + Utils.rand(-250, 250) * this.scale;
                this.targetY = doorY + Utils.rand(80, 250) * this.scale;
                this.speed = Utils.rand(20, 40) * this.scale; // Kecepatan normal lagi
            }
        } else if (this.state === 'WANDERING') {
            if (!isDoorOpen) {
                this.state = 'RETURNING';
                this.targetX = doorX; // Head to door first
                this.targetY = doorY;
                this.speed = Utils.rand(50, 80) * this.scale; // Lari pulang lumayan cepat
            } else if (distToTarget < 10 && Math.random() < 0.01) {
                // Wander anywhere in the farm (front area)
                this.targetX = Utils.rand(canvasWidth * 0.1, canvasWidth * 0.95);
                this.targetY = Utils.rand(penCenterY + 40, penCenterY + 200);
            }
        } else if (this.state === 'RETURNING') {
            if (isDoorOpen) {
                this.state = 'WANDERING';
            } else {
                if (distToTarget < 10) {
                    if (Math.abs(this.targetY - doorY) < 5) {
                        // Reached door, go inside
                        this.targetX = penCenterX + Utils.rand(-20, 20) * this.scale;
                        this.targetY = penCenterY;
                    } else {
                        // Reached inside
                        this.state = 'INSIDE';
                    }
                }
            }
        }

        // --- Movement Physics ---
        if (distToTarget > 2) {
            const angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
            this.vx = Math.cos(angle) * this.speed;
            this.vy = Math.sin(angle) * this.speed;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            
            // Flip facing direction based on velocity
            if (this.vx > 0.5) this.flip = -1;
            else if (this.vx < -0.5) this.flip = 1;
            
            // Walking head bob
            this.headBob = Math.sin(this.timeOffset * 4) * 4 * this.scale;
        } else {
            // Idle head bob
            this.headBob = Math.sin(this.timeOffset) * 2 * this.scale;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.flip, 1);
        
        const s = this.scale;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 15*s, 30*s, 8*s, 0, 0, Math.PI*2);
        ctx.fill();

        // Legs (dark brown)
        ctx.fillStyle = '#4a3b32';
        ctx.fillRect(-20*s, 0, 6*s, 16*s);
        ctx.fillRect(-10*s, 2*s, 6*s, 16*s);
        ctx.fillRect(10*s, 0, 6*s, 16*s);
        ctx.fillRect(20*s, 2*s, 6*s, 16*s);

        if (this.type === 'sheep') {
            // Sheep Body (fluffy white)
            ctx.fillStyle = '#fcfcfc';
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 2*s;
            for (const b of this.woolBlobs) {
                ctx.beginPath();
                ctx.arc(b.ox, b.oy, b.r, 0, Math.PI*2);
                ctx.fill();
                ctx.stroke();
            }
            // Head (beige)
            ctx.translate(25*s, -10*s + this.headBob);
            ctx.fillStyle = '#e8d5c4';
            ctx.beginPath();
            ctx.ellipse(0, 0, 14*s, 10*s, Math.PI/6, 0, Math.PI*2);
            ctx.fill();
            
            // Ear
            ctx.fillStyle = '#d6c0ac';
            ctx.beginPath();
            ctx.ellipse(-8*s, 2*s, 8*s, 4*s, Math.PI/4, 0, Math.PI*2);
            ctx.fill();

            // Eye
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(4*s, -2*s, 2*s, 0, Math.PI*2);
            ctx.fill();

            // Fluff on head
            ctx.fillStyle = '#fcfcfc';
            ctx.beginPath();
            ctx.arc(-4*s, -8*s, 8*s, 0, Math.PI*2);
            ctx.fill();

        } else {
            // Goat Body (smooth light tan/brown)
            ctx.fillStyle = '#e3cfa8';
            ctx.strokeStyle = '#cca976';
            ctx.lineWidth = 2*s;
            ctx.beginPath();
            ctx.ellipse(0, -5*s, 35*s, 20*s, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();

            // Tail
            ctx.beginPath();
            ctx.ellipse(-35*s, -15*s, 10*s, 4*s, -Math.PI/4, 0, Math.PI*2);
            ctx.fill();

            // Head
            ctx.translate(30*s, -15*s + this.headBob);
            ctx.fillStyle = '#e3cfa8';
            ctx.beginPath();
            ctx.ellipse(0, 0, 16*s, 10*s, Math.PI/6, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();

            // Ear
            ctx.fillStyle = '#ba9e82';
            ctx.beginPath();
            ctx.ellipse(-8*s, 4*s, 10*s, 4*s, -Math.PI/6, 0, Math.PI*2);
            ctx.fill();

            // Horn
            ctx.fillStyle = '#8f7b66';
            ctx.beginPath();
            ctx.moveTo(-5*s, -8*s);
            ctx.lineTo(-10*s, -25*s);
            ctx.lineTo(-2*s, -8*s);
            ctx.fill();

            // Eye
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(4*s, -2*s, 2*s, 0, Math.PI*2);
            ctx.fill();

            // Beard
            ctx.fillStyle = '#ba9e82';
            ctx.beginPath();
            ctx.moveTo(12*s, 5*s);
            ctx.lineTo(8*s, 18*s);
            ctx.lineTo(5*s, 5*s);
            ctx.fill();
        }

        ctx.restore();
    }
}

// ==========================================
// Animal Pen (Kandang)
// ==========================================
class AnimalPen {
    constructor(x, y, width, depth, scale) {
        this.x = x;
        this.y = y;
        this.width = width * scale;
        this.depth = depth * scale;
        this.scale = scale;
        this.doorYOffset = 0;
    }

    update(dt, relayState, animals) {
        let isActuallyOpen = relayState;
        
        // Smart Door Logic: if relay is off, but animals are outside, wait for them!
        if (!relayState) {
            const anyOutside = animals.some(a => a.state !== 'INSIDE');
            if (anyOutside) {
                isActuallyOpen = true; 
            }
        }
        
        // Animate door moving up (-130 * scale) or down (0)
        // Dibuat sangat tinggi ke atas agar animasi buka pagarnya sangat terlihat jelas
        const targetDoorY = isActuallyOpen ? -130 * this.scale : 0;
        this.doorYOffset += (targetDoorY - this.doorYOffset) * 5 * dt;
    }

    drawBack(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const s = this.scale;
        
        ctx.lineWidth = 3 * s;
        ctx.strokeStyle = '#4a2f22'; // Dark wood
        ctx.fillStyle = '#784c35';

        const w2 = this.width / 2;
        const d2 = this.depth / 4; // perspective depth
        
        // Ground highlight inside pen
        ctx.fillStyle = 'rgba(100, 150, 60, 0.2)';
        ctx.beginPath();
        ctx.moveTo(-w2, -d2);
        ctx.lineTo(w2, -d2);
        ctx.lineTo(w2, d2);
        ctx.lineTo(-w2, d2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#784c35';

        // Back, Left, Right Fences
        this._drawFenceLine(ctx, -w2, -d2, w2, -d2, s);
        this._drawFenceLine(ctx, -w2, -d2, -w2, d2, s);
        this._drawFenceLine(ctx, w2, -d2, w2, d2, s);

        ctx.restore();
    }

    drawFront(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const s = this.scale;
        
        ctx.lineWidth = 3 * s;
        ctx.strokeStyle = '#4a2f22';
        ctx.fillStyle = '#8a5c43'; // Slightly brighter in front

        const w2 = this.width / 2;
        const d2 = this.depth / 4;

        // Front Left
        this._drawFenceLine(ctx, -w2, d2, -w2/3, d2, s);
        
        // Front Right
        this._drawFenceLine(ctx, w2/3, d2, w2, d2, s);

        // Door (slides UP via doorYOffset)
        ctx.save();
        ctx.translate(0, this.doorYOffset);
        // Ensure door posts are drawn straight (not rotated)
        this._drawFenceLine(ctx, -w2/3, d2, w2/3, d2, s, true);
        ctx.restore();

        // Door Frame Pillars (to hold the sliding door)
        ctx.fillStyle = '#5c3a29';
        ctx.beginPath();
        ctx.rect(-w2/3 - 4*s, d2 - 60*s, 8*s, 60*s);
        ctx.rect(w2/3 - 4*s, d2 - 60*s, 8*s, 60*s);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    _drawFenceLine(ctx, x1, y1, x2, y2, s, isDoor = false) {
        const posts = isDoor ? 2 : 4;
        const postH = 45 * s;
        
        // Draw horizontal rails
        ctx.beginPath();
        ctx.moveTo(x1, y1 - postH * 0.35);
        ctx.lineTo(x2, y2 - postH * 0.35);
        ctx.moveTo(x1, y1 - postH * 0.75);
        ctx.lineTo(x2, y2 - postH * 0.75);
        ctx.stroke();

        // Draw vertical posts
        for (let i = 0; i < posts; i++) {
            const px = x1 + (x2 - x1) * (i / (posts - 1));
            const py = y1 + (y2 - y1) * (i / (posts - 1));
            
            ctx.beginPath();
            ctx.rect(px - 5*s, py - postH, 10*s, postH);
            ctx.fill();
            ctx.stroke();
            
            // Triangle top
            ctx.beginPath();
            ctx.moveTo(px - 5*s, py - postH);
            ctx.lineTo(px, py - postH - 8*s);
            ctx.lineTo(px + 5*s, py - postH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }
}

// ==========================================
// RIVER DAM (Bendungan Air)
// ==========================================
class RiverDam {
    constructor(x, y, scale) {
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.gateYOffset = 0;
        
        // Flood logic
        this.floodRadius = 0;
        this.floodAlpha = 0;
        this.maxFloodRadius = 450 * scale; 
        this.time = 0;
        
        // Water jet from dam
        this.waterJet = new Emitter({
            x: x + 40*scale, y: y + 20*scale,
            rate: 400, speedMin: 120*scale, speedMax: 240*scale,
            angleMin: -25, angleMax: 25, // Shoot to the right
            lifeMin: 0.6, lifeMax: 1.2,
            sizeStart: 8*scale, sizeEnd: 3*scale,
            colorStart: [180, 230, 255, 0.9], colorEnd: [210, 240, 255, 0.1],
            gravity: 300*scale, spreadY: 20*scale
        });
    }

    setPos(x, y) {
        this.x = x; this.y = y;
        this.waterJet.setPos(x + 40*this.scale, y + 20*this.scale);
    }

    update(dt, isOpen) {
        this.time += dt;
        
        // Gate animation
        const targetGateY = isOpen ? -80 * this.scale : 0;
        this.gateYOffset += (targetGateY - this.gateYOffset) * 5 * dt;
        
        const isSpilling = this.gateYOffset < -20 * this.scale;
        this.waterJet.active = isSpilling;
        this.waterJet.update(dt);
        
        // Flood logic
        if (isOpen) {
            // Water flows out, radius increases, alpha fades IN
            this.floodAlpha = Math.min(1.0, this.floodAlpha + dt * 1.5);
            if (isSpilling) {
                this.floodRadius = Math.min(this.maxFloodRadius, this.floodRadius + 180 * this.scale * dt);
            }
        } else {
            // Gate is closing/closed. Radius stops expanding. Alpha fades OUT (seeping into ground)
            this.floodAlpha = Math.max(0, this.floodAlpha - dt * 0.4); // Fade slowly
            if (this.floodAlpha <= 0) {
                this.floodRadius = 0; // Reset once completely seeped
            }
        }
    }

    draw(ctx) {
        const s = this.scale;
        
        // 1. Draw Flooded Ground (Puddle)
        if (this.floodAlpha > 0 && this.floodRadius > 0) {
            ctx.save();
            ctx.translate(this.x + 80*s, this.y + 60*s);
            
            // Pulsing opacity for realistic water reflection
            const pulse = 0.8 + 0.2 * Math.sin(this.time * 3);
            ctx.globalAlpha = this.floodAlpha * pulse;
            
            // Radial gradient for spreading water
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.floodRadius);
            grad.addColorStop(0, 'rgba(60, 150, 200, 0.8)');
            grad.addColorStop(0.6, 'rgba(80, 180, 220, 0.5)');
            grad.addColorStop(1, 'rgba(100, 200, 240, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            // Flatten the circle to make it look like it's on the ground (perspective)
            ctx.ellipse(0, 0, this.floodRadius, this.floodRadius * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw animated ripples
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 4; i++) {
                const rt = (this.time * 0.5 + i * 0.25) % 1;
                const rr = this.floodRadius * rt;
                if (rr > 5) {
                    ctx.globalAlpha = this.floodAlpha * (1 - rt);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, rr, rr * 0.25, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }
        
        // 2. Draw Reservoir (Water behind dam)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#2c6d94';
        ctx.beginPath();
        // Reservoir bounds (left of the dam)
        ctx.rect(-150*s, -40*s, 150*s, 80*s);
        ctx.fill();
        ctx.restore();

        // 3. Draw Dam Structure
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Left wall (perspective into background)
        ctx.fillStyle = '#6e706f';
        ctx.strokeStyle = '#404241';
        ctx.beginPath();
        ctx.moveTo(0, 40*s);
        ctx.lineTo(-30*s, -60*s);
        ctx.lineTo(0, -60*s);
        ctx.lineTo(20*s, 40*s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Main pillars
        ctx.fillStyle = '#838785';
        ctx.lineWidth = 2 * s;
        
        // Top bridge
        ctx.fillRect(-10*s, -60*s, 80*s, 15*s);
        ctx.strokeRect(-10*s, -60*s, 80*s, 15*s);

        // Pillar Left
        ctx.fillRect(-10*s, -45*s, 20*s, 85*s);
        ctx.strokeRect(-10*s, -45*s, 20*s, 85*s);
        
        // Pillar Right
        ctx.fillRect(50*s, -45*s, 20*s, 85*s);
        ctx.strokeRect(50*s, -45*s, 20*s, 85*s);
        
        // Sliding Gate (Wood)
        ctx.fillStyle = '#5c3a21';
        ctx.strokeStyle = '#2e1d10';
        ctx.save();
        ctx.translate(0, this.gateYOffset);
        ctx.fillRect(10*s, -45*s, 40*s, 85*s);
        ctx.strokeRect(10*s, -45*s, 40*s, 85*s);
        // Gate details (horizontal bars)
        for (let i=0; i<4; i++) {
            const gy = -35*s + i*20*s;
            ctx.beginPath();
            ctx.moveTo(10*s, gy);
            ctx.lineTo(50*s, gy);
            ctx.stroke();
        }
        ctx.restore();
        
        ctx.restore();
        
        // 4. Draw Water Jet (Particles) on top of gate
        this.waterJet.draw(ctx);
    }
}
