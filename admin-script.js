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
                // Set cookie for admin session to exclude views counting in the backend
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
        // Clear cookie for admin session
        document.cookie = "isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
        hideDashboard();
    });

    function showDashboard() {
        loginOverlay.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadInquiries();
    }

    function hideDashboard() {
        loginOverlay.style.display = 'flex';
        adminDashboard.style.display = 'none';
        inquiriesTbody.innerHTML = '';
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
                renderInquiries(allInquiries);
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
                    <td colspan="8" class="no-data">상담 및 문의 데이터가 없습니다.</td>
                </tr>
            `;
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            
            // Format Type Badge
            let typeBadge = '';
            if (item.type === 'b2c-couple') {
                typeBadge = `<span class="badge-type badge-b2c">B2C 신랑신부</span>`;
            } else if (item.type === 'b2b-venue') {
                typeBadge = `<span class="badge-type badge-b2b-venue">B2B 베뉴</span>`;
            } else if (item.type === 'b2b-planner') {
                typeBadge = `<span class="badge-type badge-b2b-planner">B2B 플래너</span>`;
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
                <td>${dateStr}</td>
                <td>${typeBadge}</td>
                <td style="font-weight: 600;">${escapeHtml(item.name)}</td>
                <td><a href="tel:${item.phone}" style="color: var(--gold); text-decoration: none;">${escapeHtml(item.phone)}</a></td>
                <td>${escapeHtml(item.details)}</td>
                <td style="font-size: 13px; color: var(--text-muted); max-width: 250px; overflow-wrap: break-word;">${escapeHtml(item.message)}</td>
                <td>
                    <select class="select-status ${statusClass}" data-id="${item.id}">
                        <option value="대기중" ${item.status === '대기중' ? 'selected' : ''}>대기중</option>
                        <option value="연락완료" ${item.status === '연락완료' ? 'selected' : ''}>연락완료</option>
                        <option value="계약완료" ${item.status === '계약완료' ? 'selected' : ''}>계약완료</option>
                    </select>
                </td>
                <td style="text-align: center;">
                    <button class="btn-action-delete" data-id="${item.id}"><i class="fa-solid fa-trash"></i></button>
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
                if (confirm('이 문의를 삭제하시겠습니까? 데이터가 전면 삭제됩니다.')) {
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
                // Update local array element
                const index = allInquiries.findIndex(item => item.id === id);
                if (index !== -1) {
                    allInquiries[index].status = status;
                }
                
                // Re-render and update statistics without full reload
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
            filtered = allInquiries.filter(item => item.type === typeValue);
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

        // CSV Header with BOM for Korean Excel compatibility
        let csvContent = '\uFEFF'; 
        csvContent += '접수일시,구분,이름/담당자,연락처,예식일시및베뉴,상세문의,상태\n';

        allInquiries.forEach(item => {
            const typeStr = item.type === 'b2c-couple' ? 'B2C 신랑신부' : (item.type === 'b2b-venue' ? 'B2B 베뉴' : 'B2B 플래너');
            const dateStr = new Date(item.createdAt).toLocaleString('ko-KR');
            
            // Escape double quotes and commas
            const name = `"${item.name.replace(/"/g, '""')}"`;
            const phone = `"${item.phone.replace(/"/g, '""')}"`;
            const details = `"${item.details.replace(/"/g, '""')}"`;
            const message = `"${item.message.replace(/"/g, '""')}"`;

            csvContent += `${dateStr},${typeStr},${name},${phone},${details},${message},${item.status}\n`;
        });

        // Create Blob and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `aethera_inquiries_export_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Helper to escape HTML tags for basic security
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
