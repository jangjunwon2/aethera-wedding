document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 1. Scroll Reveal Animations (Intersection Observer)
    // -------------------------------------------------------------------------
    const revealElements = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(element => {
        revealObserver.observe(element);
    });

    // -------------------------------------------------------------------------
    // 2. B2B Form Submission & Validation
    // -------------------------------------------------------------------------
    const b2bForm = document.getElementById('b2b-form');
    const b2bSuccess = document.getElementById('b2b-success');

    if (b2bForm && b2bSuccess) {
        b2bForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const phoneInput = document.getElementById('b2b-phone');
            const phoneValue = phoneInput.value.replace(/-/g, '').trim();
            const phoneRegex = /^[0-9]{9,11}$/; // 9 to 11 digits

            if (!phoneRegex.test(phoneValue)) {
                alert('올바른 연락처 형식을 입력해 주세요 (예: 010-1234-5678)');
                phoneInput.focus();
                return;
            }

            const submitBtn = b2bForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = '제안 접수 중...';
            submitBtn.disabled = true;

            // Submit B2B partnership proposal details to backend API
            fetch('/api/inquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    'inquiry-type': document.getElementById('b2b-type').value,
                    'user-name': document.getElementById('b2b-name').value,
                    'user-phone': phoneInput.value,
                    'wedding-details': document.getElementById('b2b-company').value,
                    'message': document.getElementById('b2b-message').value
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    b2bForm.style.display = 'none';
                    b2bSuccess.style.display = 'block';
                    b2bSuccess.style.opacity = '0';
                    b2bSuccess.style.transition = 'opacity 0.6s ease';
                    setTimeout(() => {
                        b2bSuccess.style.opacity = '1';
                    }, 50);
                } else {
                    alert(data.message || '제안 접수에 실패했습니다. 다시 시도해 주세요.');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            })
            .catch(err => {
                console.error(err);
                alert('서버와 통신하는 중 오류가 발생했습니다.');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
        });
    }

    // -------------------------------------------------------------------------
    // 3. Interactive Canvas Particle Background (Shared with B2C)
    // -------------------------------------------------------------------------
    const canvas = document.getElementById('canvas-bg');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        let mouse = { x: null, y: null, active: false };

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        class SparkleParticle {
            constructor(x, y, isAmbient = false) {
                this.x = x;
                this.y = y;
                this.isAmbient = isAmbient;
                this.size = Math.random() * (isAmbient ? 2 : 4) + 1;
                this.speedX = Math.random() * 1.5 - 0.75;
                this.speedY = isAmbient ? (Math.random() * -0.5 - 0.2) : (Math.random() * 2 - 1);
                
                const hue = 220;
                const sat = '10%';
                const light = isAmbient ? '60%' : '75%';
                this.color = `hsla(${hue}, ${sat}, ${light}, `;
                this.alpha = 1;
                this.decay = Math.random() * 0.015 + 0.005;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.alpha -= this.decay;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.shadowBlur = this.isAmbient ? 4 : 10;
                ctx.shadowColor = '#b6becb';
                
                ctx.beginPath();
                ctx.fillStyle = this.color + this.alpha + ')';
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.active = true;

            if (Math.random() < 0.35) {
                particles.push(new SparkleParticle(mouse.x, mouse.y, false));
            }
        });

        window.addEventListener('mouseleave', () => {
            mouse.active = false;
        });

        // Mobile CPU battery & background tab optimizations
        let isTabActive = true;
        window.addEventListener('focus', () => { isTabActive = true; });
        window.addEventListener('blur', () => { isTabActive = false; });

        const isMobile = window.innerWidth <= 768;
        const maxParticles = isMobile ? 30 : 150;

        function animate() {
            if (!isTabActive) {
                requestAnimationFrame(animate);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (particles.length < maxParticles && Math.random() < 0.1) {
                particles.push(new SparkleParticle(
                    Math.random() * canvas.width,
                    canvas.height + 10,
                    true
                ));
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                if (particles[i].alpha <= 0) {
                    particles.splice(i, 1);
                } else {
                    particles[i].draw();
                }
            }

            requestAnimationFrame(animate);
        }
        animate();
    }
});
