document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 1. Navigation Scroll & Mobile Toggle
    // -------------------------------------------------------------------------
    const header = document.getElementById('header');
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Sticky Header on Scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Mobile Hamburger Toggle
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Close Mobile Menu on Link Click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navToggle && navMenu) {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    });

    // -------------------------------------------------------------------------
    // 2. FAQ Accordion Toggle
    // -------------------------------------------------------------------------
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Close all other FAQ items
                faqItems.forEach(otherItem => {
                    otherItem.classList.remove('active');
                });

                // Toggle current FAQ item
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        }
    });

    // -------------------------------------------------------------------------
    // 3. Scroll Reveal Animations (Intersection Observer)
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
    // 4. Form Submission & Consultation Request (Separated Date & Venue)
    // -------------------------------------------------------------------------
    const bookingForm = document.getElementById('booking-form');
    const formSuccess = document.getElementById('form-success');

    if (bookingForm && formSuccess) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const phoneInput = document.getElementById('user-phone');
            const phoneValue = phoneInput.value.replace(/-/g, '').trim();
            const phoneRegex = /^[0-9]{9,11}$/;

            if (!phoneRegex.test(phoneValue)) {
                alert('올바른 연락처 형식을 입력해 주세요 (예: 010-1234-5678)');
                phoneInput.focus();
                return;
            }

            // Gather separated wedding date, venue, hall, time & duration
            const weddingDate = document.getElementById('wedding-date') ? document.getElementById('wedding-date').value : '';
            const weddingVenue = document.getElementById('wedding-venue') ? document.getElementById('wedding-venue').value : '';
            const weddingHall = document.getElementById('wedding-hall') ? document.getElementById('wedding-hall').value : '';
            const weddingTime = document.getElementById('wedding-time') ? document.getElementById('wedding-time').value : '';
            const weddingDuration = document.getElementById('wedding-duration') ? document.getElementById('wedding-duration').value : '';

            const weddingDetails = `예식일: ${weddingDate} | 식장: ${weddingVenue} (홀: ${weddingHall}) | 시간: ${weddingTime} (${weddingDuration})`;

            // Gather selected interest options
            const checkedBoxes = document.querySelectorAll('input[name="interest"]:checked');
            const selectedOptions = Array.from(checkedBoxes).map(cb => cb.value).join(', ');

            // Button loading state
            const submitBtn = document.getElementById('form-submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 세부 가격표 & 견적서 발송 중...';
            submitBtn.disabled = true;

            // Submit via fetch (with fallback for static preview)
            fetch('/api/inquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    'inquiry-type': 'B2C 본식 시연 연출',
                    'user-name': document.getElementById('user-name').value,
                    'user-phone': phoneInput.value,
                    'wedding-date': weddingDate,
                    'wedding-venue': weddingVenue,
                    'wedding-hall': weddingHall,
                    'wedding-time': weddingTime,
                    'wedding-duration': weddingDuration,
                    'wedding-details': weddingDetails,
                    'selected-options': selectedOptions,
                    'message': document.getElementById('message').value
                })
            })
            .then(res => res.json())
            .then(data => {
                showSuccess();
            })
            .catch(err => {
                console.log('Static preview mode - displaying success message.');
                showSuccess();
            });

            function showSuccess() {
                bookingForm.style.display = 'none';
                formSuccess.style.display = 'block';
                formSuccess.style.opacity = '0';
                formSuccess.style.transition = 'opacity 0.6s ease';
                setTimeout(() => {
                    formSuccess.style.opacity = '1';
                }, 50);
            }
        });
    }

    // -------------------------------------------------------------------------
    // 5. Interactive Canvas Particle Background
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
                this.size = Math.random() * (isAmbient ? 3 : 5) + 1.5;
                this.speedX = Math.random() * 1.2 - 0.6;
                this.speedY = isAmbient ? (Math.random() * -0.6 - 0.3) : (Math.random() * 2 - 1);
                
                // Warm Rose-Gold, Silk Pearl & Romantic Petal Tones
                const hue = isAmbient ? (Math.random() > 0.5 ? 25 : 18) : (Math.random() > 0.4 ? 30 : 15);
                const lightness = Math.floor(Math.random() * 25 + 55);
                this.color = `hsla(${hue}, 70%, ${lightness}%, `;
                this.alpha = 0.85;
                this.decay = Math.random() * 0.01 + 0.005;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotSpeed = Math.random() * 0.04 - 0.02;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.alpha -= this.decay;
                this.rotation += this.rotSpeed;
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.globalAlpha = this.alpha;
                ctx.shadowBlur = this.isAmbient ? 4 : 8;
                ctx.shadowColor = '#c4a49c';
                ctx.beginPath();
                ctx.fillStyle = this.color + this.alpha + ')';
                ctx.ellipse(0, 0, this.size, this.size * 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.active = true;

            if (Math.random() < 0.3) {
                particles.push(new SparkleParticle(mouse.x, mouse.y, false));
            }
        });

        function initAmbientParticles() {
            if (particles.length < 40) {
                particles.push(new SparkleParticle(Math.random() * canvas.width, canvas.height + 10, true));
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            initAmbientParticles();

            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                particles[i].draw();

                if (particles[i].alpha <= 0) {
                    particles.splice(i, 1);
                }
            }

            requestAnimationFrame(animate);
        }

        animate();
    }
});
