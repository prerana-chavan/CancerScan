import { useEffect, useRef } from 'react';

export default function ParticleBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let particles = [];
        let gridOffset = 0;
        let pulseX = -200;
        let logoPulse = 0;
        let frame = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Theme Detection
        const isDanger = canvas.closest('.theme-danger');
        const isStranger = canvas.closest('.theme-stranger');

        // === STRANGER THINGS MODE ===
        if (isStranger) {
            const ashParticles = [];
            const tendrils = [];
            let staticBurst = 0;

            class Ash {
                constructor() { this.reset(true); }
                reset(init) {
                    this.x = Math.random() * canvas.width;
                    this.y = init ? Math.random() * canvas.height : -10;
                    this.size = 1 + Math.random() * 3;
                    this.vy = 0.2 + Math.random() * 0.6;
                    this.vx = (Math.random() - 0.5) * 0.3;
                    this.alpha = 0.15 + Math.random() * 0.35;
                    this.wobble = Math.random() * Math.PI * 2;
                    this.wobbleSpeed = 0.01 + Math.random() * 0.02;
                }
                update() {
                    this.y += this.vy;
                    this.wobble += this.wobbleSpeed;
                    this.x += this.vx + Math.sin(this.wobble) * 0.3;
                    if (this.y > canvas.height + 10) this.reset(false);
                }
                draw(ctx) {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 183, 0, ${this.alpha})`;
                    ctx.fill();
                }
            }

            // Organic vein data
            class Tendril {
                constructor(side) {
                    this.side = side; // 'left', 'right', 'bottom'
                    this.segments = [];
                    this.maxLen = 80 + Math.random() * 120;
                    this.thickness = 1 + Math.random() * 2;
                    this.pulse = Math.random() * Math.PI * 2;
                    this.build();
                }
                build() {
                    let x, y, angle;
                    if (this.side === 'left') {
                        x = 0; y = Math.random() * canvas.height;
                        angle = -0.3 + Math.random() * 0.6;
                    } else if (this.side === 'right') {
                        x = canvas.width; y = Math.random() * canvas.height;
                        angle = Math.PI + (-0.3 + Math.random() * 0.6);
                    } else {
                        x = Math.random() * canvas.width; y = canvas.height;
                        angle = -Math.PI / 2 + (-0.3 + Math.random() * 0.6);
                    }
                    for (let i = 0; i < this.maxLen; i += 4) {
                        angle += (Math.random() - 0.5) * 0.15;
                        x += Math.cos(angle) * 4;
                        y += Math.sin(angle) * 4;
                        this.segments.push({ x, y });
                    }
                }
                draw(ctx, frame) {
                    this.pulse += 0.015;
                    const glow = 0.15 + Math.sin(this.pulse) * 0.1;
                    const visibleLen = Math.min(this.segments.length, Math.floor(this.segments.length * (0.6 + Math.sin(frame * 0.005) * 0.4)));
                    ctx.beginPath();
                    ctx.moveTo(this.segments[0].x, this.segments[0].y);
                    for (let i = 1; i < visibleLen; i++) {
                        ctx.lineTo(this.segments[i].x, this.segments[i].y);
                    }
                    ctx.strokeStyle = `rgba(74, 14, 78, ${glow})`;
                    ctx.lineWidth = this.thickness;
                    ctx.stroke();
                }
            }

            for (let i = 0; i < 65; i++) ashParticles.push(new Ash());
            for (let i = 0; i < 8; i++) tendrils.push(new Tendril(['left', 'right', 'bottom'][Math.floor(Math.random() * 3)]));

            const animateStranger = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                frame++;

                // Film grain noise
                if (frame % 3 === 0) {
                    const imgData = ctx.createImageData(canvas.width, canvas.height);
                    for (let i = 0; i < imgData.data.length; i += 4) {
                        const v = Math.random() * 15;
                        imgData.data[i] = v; imgData.data[i + 1] = v; imgData.data[i + 2] = v;
                        imgData.data[i + 3] = 12;
                    }
                    ctx.putImageData(imgData, 0, 0);
                }

                // Vein tendrils
                tendrils.forEach(t => t.draw(ctx, frame));

                // Ash particles
                ashParticles.forEach(p => { p.update(); p.draw(ctx); });

                // Dimensional rift glow (center-left)
                const riftX = canvas.width * 0.25;
                const riftY = canvas.height * 0.4;
                const riftR = 80 + Math.sin(frame * 0.015) * 30;
                const riftGrad = ctx.createRadialGradient(riftX, riftY, 0, riftX, riftY, riftR);
                riftGrad.addColorStop(0, 'rgba(139, 0, 0, 0.25)');
                riftGrad.addColorStop(0.5, 'rgba(74, 14, 78, 0.08)');
                riftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = riftGrad;
                ctx.beginPath();
                ctx.arc(riftX, riftY, riftR, 0, Math.PI * 2);
                ctx.fill();

                // Random static bursts
                staticBurst -= 1;
                if (Math.random() < 0.003) staticBurst = 6;
                if (staticBurst > 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + Math.random() * 0.04})`;
                    const sy = Math.random() * canvas.height;
                    ctx.fillRect(0, sy, canvas.width, 2 + Math.random() * 8);
                }

                // Vignette
                const vignette = ctx.createRadialGradient(
                    canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
                    canvas.width / 2, canvas.height / 2, canvas.height * 0.9
                );
                vignette.addColorStop(0, 'rgba(0,0,0,0)');
                vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
                ctx.fillStyle = vignette;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                animId = requestAnimationFrame(animateStranger);
            };
            animateStranger();

            return () => {
                cancelAnimationFrame(animId);
                window.removeEventListener('resize', resize);
            };
        }

        // === DANGER / DEFAULT MODES ===
        const colors = {
            accent: isDanger ? '239, 68, 68' : '20, 184, 166',
            glow: isDanger ? '239, 68, 68' : '20, 184, 166',
            speedMult: isDanger ? 1.8 : 1.0,
            particleAlpha: isDanger ? 0.12 : 0.06
        };

        class Node {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.25 * colors.speedMult;
                this.vy = (Math.random() - 0.5) * 0.25 * colors.speedMult;
                this.radius = isDanger ? 2.5 : 3;
                this.baseAlpha = colors.particleAlpha;
                this.alpha = this.baseAlpha;
                this.blinkSpeed = (0.01 + Math.random() * 0.02) * (isDanger ? 1.5 : 1);
                this.blinkDir = 1;
            }
            update() {
                this.x += this.vx; this.y += this.vy;
                if (this.x < 0) this.x = canvas.width;
                if (this.x > canvas.width) this.x = 0;
                if (this.y < 0) this.y = canvas.height;
                if (this.y > canvas.height) this.y = 0;
                this.alpha += this.blinkSpeed * this.blinkDir;
                if (this.alpha > 0.12 || this.alpha < 0.04) this.blinkDir *= -1;
            }
            draw(ctx) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${colors.accent}, ${this.alpha})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < (isDanger ? 55 : 40); i++) particles.push(new Node());

        const drawGrid = () => {
            const spacing = 120;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${colors.accent}, 0.04)`;
            ctx.lineWidth = 1;
            for (let x = 0; x <= canvas.width; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
            for (let y = gridOffset % spacing; y <= canvas.height; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
            ctx.stroke();
            gridOffset += 0.1 * colors.speedMult;
        };

        const drawPulseWave = () => {
            const waveWidth = isDanger ? 400 : 300;
            const gradient = ctx.createLinearGradient(pulseX, 0, pulseX + waveWidth, 0);
            gradient.addColorStop(0, `rgba(${colors.accent}, 0)`);
            gradient.addColorStop(0.5, `rgba(${colors.accent}, ${isDanger ? 0.18 : 0.12})`);
            gradient.addColorStop(1, `rgba(${colors.accent}, 0)`);
            ctx.fillStyle = gradient;
            ctx.fillRect(pulseX, 0, waveWidth, canvas.height);
            pulseX += (canvas.width + waveWidth) / ((isDanger ? 8 : 12) * 60);
            if (pulseX > canvas.width) pulseX = -waveWidth;
        };

        const drawLogoGlow = () => {
            const centerX = canvas.width * 0.25;
            const centerY = canvas.height * 0.45;
            const radius = (isDanger ? 120 : 100) + Math.sin(logoPulse) * 20;
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, `rgba(${colors.glow}, ${isDanger ? 0.35 : 0.25})`);
            gradient.addColorStop(1, `rgba(${colors.glow}, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            logoPulse += 0.02 * (isDanger ? 1.5 : 1);
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawGrid();
            drawLogoGlow();
            particles.forEach(p => { p.update(); p.draw(ctx); });
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = isDanger ? 150 : 120;
                    if (dist < maxDist) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(${colors.accent}, ${0.05 * (1 - dist / maxDist)})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }
            drawPulseWave();
            animId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}
