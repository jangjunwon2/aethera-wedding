document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('login-overlay');
    const adminDashboard = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const adminPasswordInput = document.getElementById('admin-password');
    const btnLogout = document.getElementById('btn-logout');
    
    const inquiriesTbody = document.getElementById('inquiries-tbody');
    const filterType = document.getElementById('filter-type');
    const btnExport = document.getElementById('btn-export');

    const metricTotal = document.getElementById('metric-total-num');
    const metricPending = document.getElementById('metric-pending-num');
    const metricCompleted = document.getElementById('metric-completed-num');
    const metricViews = document.getElementById('metric-views-num');
    const metricConversion = document.getElementById('metric-conversion-num');

    let allInquiries = [];
    let pageViewsCount = 120; // Default baseline views

    // Check existing login token
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken === 'admin1234') {
        document.cookie = "isAdmin=true; path=/; max-age=86400";
        showDashboard();
    }

    // -------------------------------------------------------------------------
    // Login & Logout Handlers
    // -------------------------------------------------------------------------
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = adminPasswordInput.value;

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const result = await response.json();

            if (result.success) {
                localStorage.setItem('adminToken', result.token);
                document.cookie = "isAdmin=true; path=/; max-age=86400";
                loginError.style.display = 'none';
                adminPasswordInput.value = '';
                showDashboard();
            } else {
                loginError.style.display = 'block';
            }
        } catch (err) {
            console.error('Login error:', err);
            loginError.textContent = '서버 통신 오류가 발생했습니다.';
            loginError.style.display = 'block';
        }
    });

    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        document.cookie = "isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
        hideDashboard();
    });

    function showDashboard() {
        loginOverlay.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadInquiries();
        initBannerControls();
    }

    function hideDashboard() {
        loginOverlay.style.display = 'flex';
        adminDashboard.style.display = 'none';
        inquiriesTbody.innerHTML = '';
    }

    // -------------------------------------------------------------------------
    // Urgency Banner Admin Controller
    // -------------------------------------------------------------------------
    function initBannerControls() {
        const bannerToggle = document.getElementById('banner-toggle-switch');
        const bannerStatusText = document.getElementById('banner-status-text');
        const bannerTextInput = document.getElementById('banner-text-input');
        const btnSaveBanner = document.getElementById('btn-save-banner');

        if (!bannerToggle || !bannerTextInput || !btnSaveBanner) return;

        const savedEnabled = localStorage.getItem('urgencyBannerEnabled');
        const savedText = localStorage.getItem('urgencyBannerText');

        if (savedEnabled === 'false') {
            bannerToggle.checked = false;
            if (bannerStatusText) {
                bannerStatusText.textContent = 'OFF (숨김)';
                bannerStatusText.style.color = '#64748b';
            }
        } else {
            bannerToggle.checked = true;
            if (bannerStatusText) {
                bannerStatusText.textContent = 'ON (노출 중)';
                bannerStatusText.style.color = '#10b981';
            }
        }

        if (savedText) {
            bannerTextInput.value = savedText;
        }

        bannerToggle.addEventListener('change', () => {
            if (bannerToggle.checked) {
                if (bannerStatusText) {
                    bannerStatusText.textContent = 'ON (노출 중)';
                    bannerStatusText.style.color = '#10b981';
                }
            } else {
                if (bannerStatusText) {
                    bannerStatusText.textContent = 'OFF (숨김)';
                    bannerStatusText.style.color = '#64748b';
                }
            }
        });

        btnSaveBanner.addEventListener('click', () => {
            localStorage.setItem('urgencyBannerEnabled', bannerToggle.checked ? 'true' : 'false');
            localStorage.setItem('urgencyBannerText', bannerTextInput.value.trim());

            alert('✅ 조기 마감 안내 바 설정이 성공적으로 저장되었습니다!\n웹사이트 메인화면에 즉시 반영됩니다.');
        });
    }

    // -------------------------------------------------------------------------
    // CRUD Logic
    // -------------------------------------------------------------------------
    async function loadInquiries() {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            const response = await fetch('/api/inquiries', {
                method: 'GET',
                headers: { 'X-Admin-Token': token }
            });

            if (response.status === 401) {
                hideDashboard();
                return;
            }

            const result = await response.json();
            if (result.success) {
                allInquiries = result.data;
                pageViewsCount = result.pageViews || 120;
                filterAndRender();
                updateMetrics(allInquiries);
            }
        } catch (err) {
            console.error('Load inquiries error:', err);
        }
    }

    function renderInquiries(data) {
        inquiriesTbody.innerHTML = '';

        if (data.length === 0) {
            inquiriesTbody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data"><i class="fa-solid fa-inbox" style="margin-right: 8px; color: #94a3b8;"></i> 접수된 상담 및 문의 데이터가 없습니다.</td>
                </tr>
            `;
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            
            // Format Type Badge
            let typeBadge = `<span style="background: #f1f5f9; color: #334155; font-weight: 700; padding: 4px 10px; border-radius: 20px; font-size: 12px; border: 1px solid #cbd5e1;">${escapeHtml(item.type)}</span>`;
            if (item.type === 'b2c-couple' || item.type.includes('B2C')) {
                typeBadge = `<span style="background: #eff6ff; color: #1d4ed8; font-weight: 700; padding: 4px 10px; border-radius: 20px; font-size: 12px; border: 1px solid #bfdbfe;"><i class="fa-solid fa-heart"></i> B2C 본식연출</span>`;
            } else if (item.type === 'b2b-venue' || item.type.includes('베뉴')) {
                typeBadge = `<span style="background: #fef3c7; color: #b45309; font-weight: 700; padding: 4px 10px; border-radius: 20px; font-size: 12px; border: 1px solid #fde68a;"><i class="fa-solid fa-building-columns"></i> B2B 베뉴</span>`;
            } else if (item.type === 'b2b-planner' || item.type.includes('플래너')) {
                typeBadge = `<span style="background: #f3e8ff; color: #7c3aed; font-weight: 700; padding: 4px 10px; border-radius: 20px; font-size: 12px; border: 1px solid #ddd6fe;"><i class="fa-solid fa-user-tie"></i> B2B 플래너</span>`;
            }

            // Format Date
            const dateStr = new Date(item.createdAt).toLocaleString('ko-KR', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Map Status Colors
            let statusClass = 'status-pending';
            if (item.status === '연락완료') statusClass = 'status-contacted';
            if (item.status === '계약완료') statusClass = 'status-completed';

            row.innerHTML = `
                <td style="font-weight: 600; color: #64748b;">${dateStr}</td>
                <td>${typeBadge}</td>
                <td><span class="user-name">${escapeHtml(item.name)}</span></td>
                <td><a href="tel:${item.phone}" class="phone-link"><i class="fa-solid fa-phone"></i> ${escapeHtml(item.phone)}</a></td>
                <td style="font-weight: 600; color: #334155;">${escapeHtml(item.details)}</td>
                <td style="font-size: 13px; color: #475569; max-width: 280px; line-height: 1.5; overflow-wrap: break-word;">${escapeHtml(item.message)}</td>
                <td>
                    <select class="select-status ${statusClass}" data-id="${item.id}">
                        <option value="대기중" ${item.status === '대기중' ? 'selected' : ''}>⏳ 대기중</option>
                        <option value="연락완료" ${item.status === '연락완료' ? 'selected' : ''}>📞 연락완료</option>
                        <option value="계약완료" ${item.status === '계약완료' ? 'selected' : ''}>🎉 계약완료</option>
                    </select>
                </td>
                <td style="text-align: center;">
                    <button class="btn-action-delete" data-id="${item.id}" title="삭제"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            `;

            inquiriesTbody.appendChild(row);
        });

        // Add Event Listeners for Status Dropdowns
        document.querySelectorAll('.select-status').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const newStatus = e.target.value;
                await updateStatus(id, newStatus);
            });
        });

        // Add Event Listeners for Delete Buttons
        document.querySelectorAll('.btn-action-delete').forEach(button => {
            button.addEventListener('click', async (e) => {
                const buttonElement = e.target.closest('.btn-action-delete');
                const id = buttonElement.getAttribute('data-id');
                if (confirm('이 문의 건을 정말 삭제하시겠습니까?')) {
                    await deleteInquiry(id);
                }
            });
        });
    }

    async function updateStatus(id, status) {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            const response = await fetch(`/api/inquiries/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Admin-Token': token 
                },
                body: JSON.stringify({ status })
            });

            const result = await response.json();
            if (result.success) {
                const index = allInquiries.findIndex(item => item.id === id);
                if (index !== -1) {
                    allInquiries[index].status = status;
                }
                filterAndRender();
                updateMetrics(allInquiries);
            }
        } catch (err) {
            console.error('Update status error:', err);
        }
    }

    async function deleteInquiry(id) {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            const response = await fetch(`/api/inquiries/${id}`, {
                method: 'DELETE',
                headers: { 'X-Admin-Token': token }
            });

            const result = await response.json();
            if (result.success) {
                allInquiries = allInquiries.filter(item => item.id !== id);
                filterAndRender();
                updateMetrics(allInquiries);
            }
        } catch (err) {
            console.error('Delete inquiry error:', err);
        }
    }

    // -------------------------------------------------------------------------
    // Filters & Metrics Calculations
    // -------------------------------------------------------------------------
    filterType.addEventListener('change', () => {
        filterAndRender();
    });

    function filterAndRender() {
        const typeValue = filterType.value;
        let filtered = allInquiries;

        if (typeValue !== 'all') {
            filtered = allInquiries.filter(item => item.type === typeValue || item.type.includes(typeValue));
        }

        renderInquiries(filtered);
    }

    function updateMetrics(data) {
        const total = data.length;
        const pending = data.filter(item => item.status === '대기중').length;
        const completed = data.filter(item => item.status === '계약완료' || item.status === '연락완료').length;
        
        const conversionRate = pageViewsCount > 0 ? ((total / pageViewsCount) * 100).toFixed(1) : '0.0';

        metricTotal.textContent = total;
        metricPending.textContent = pending;
        metricCompleted.textContent = completed;
        metricViews.textContent = pageViewsCount;
        metricConversion.textContent = conversionRate + '%';
    }

    // -------------------------------------------------------------------------
    // Export CSV Utility
    // -------------------------------------------------------------------------
    btnExport.addEventListener('click', () => {
        if (allInquiries.length === 0) {
            alert('내보낼 데이터가 없습니다.');
            return;
        }

        let csvContent = '\uFEFF'; 
        csvContent += '접수일시,구분,이름/담당자,연락처,예식일시및베뉴,상세문의,상태\n';

        allInquiries.forEach(item => {
            const dateStr = new Date(item.createdAt).toLocaleString('ko-KR');
            const name = `"${(item.name || '').replace(/"/g, '""')}"`;
            const phone = `"${(item.phone || '').replace(/"/g, '""')}"`;
            const details = `"${(item.details || '').replace(/"/g, '""')}"`;
            const message = `"${(item.message || '').replace(/"/g, '""')}"`;
            const typeStr = `"${(item.type || '').replace(/"/g, '""')}"`;

            csvContent += `${dateStr},${typeStr},${name},${phone},${details},${message},${item.status}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `aethera_inquiries_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
});
