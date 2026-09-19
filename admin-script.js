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
                <td style="text-align: center; display: flex; gap: 6px; justify-content: center;">
                    <button class="btn-action-view" data-id="${item.id}" title="상세보기" style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 6px 10px; border-radius: 6px; cursor: pointer;"><i class="fa-solid fa-eye"></i></button>
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

        // Add Event Listeners for Detail View Buttons
        document.querySelectorAll('.btn-action-view').forEach(button => {
            button.addEventListener('click', (e) => {
                const buttonElement = e.target.closest('.btn-action-view');
                const id = buttonElement.getAttribute('data-id');
                const item = allInquiries.find(inq => inq.id === id);
                if (item) openDetailModal(item);
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
    // Filters, Search, Auto-Refresh & Metrics Calculations
    // -------------------------------------------------------------------------
    const btnRefresh = document.getElementById('btn-refresh');
    const refreshIcon = document.getElementById('refresh-icon');

    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            if (refreshIcon) refreshIcon.classList.add('fa-spin');
            loadInquiries().then(() => {
                setTimeout(() => {
                    if (refreshIcon) refreshIcon.classList.remove('fa-spin');
                }, 500);
            });
        });
    }

    // Auto Refresh every 10 seconds silently
    setInterval(() => {
        const token = localStorage.getItem('adminToken');
        if (token && adminDashboard.style.display !== 'none') {
            loadInquiries();
        }
    }, 10000);

    const filterStatus = document.getElementById('filter-status');
    const searchInput = document.getElementById('search-input');

    if (filterType) filterType.addEventListener('change', filterAndRender);
    if (filterStatus) filterStatus.addEventListener('change', filterAndRender);
    if (searchInput) searchInput.addEventListener('input', filterAndRender);

    function filterAndRender() {
        const typeValue = filterType ? filterType.value : 'all';
        const statusValue = filterStatus ? filterStatus.value : 'all';
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

        let filtered = allInquiries;

        // 1. Filter by Type
        if (typeValue === 'b2c-couple') {
            filtered = filtered.filter(item => item.type.includes('B2C') || item.type.includes('b2c') || item.type.includes('본식'));
        } else if (typeValue === 'b2b-venue') {
            filtered = filtered.filter(item => item.type.includes('베뉴') || item.type.includes('b2b-venue'));
        } else if (typeValue === 'b2b-planner') {
            filtered = filtered.filter(item => item.type.includes('플래너') || item.type.includes('b2b-planner'));
        }

        // 2. Filter by Status
        if (statusValue !== 'all') {
            filtered = filtered.filter(item => item.status === statusValue);
        }

        // 3. Search by Text
        if (query) {
            filtered = filtered.filter(item => 
                (item.name && item.name.toLowerCase().includes(query)) ||
                (item.phone && item.phone.toLowerCase().includes(query)) ||
                (item.details && item.details.toLowerCase().includes(query)) ||
                (item.message && item.message.toLowerCase().includes(query))
            );
        }

        renderInquiries(filtered);
    }

    // Detail View Modal Handler
    const detailModal = document.getElementById('detail-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const modalBodyContent = document.getElementById('modal-body-content');
    const modalActions = document.getElementById('modal-actions');

    if (btnCloseModal && detailModal) {
        btnCloseModal.addEventListener('click', () => {
            detailModal.style.display = 'none';
        });
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) detailModal.style.display = 'none';
        });
    }

    function openDetailModal(item) {
        if (!detailModal || !modalBodyContent) return;

        const dateStr = new Date(item.createdAt).toLocaleString('ko-KR');

        modalBodyContent.innerHTML = `
            <div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
                <p><strong>📋 문의 구분:</strong> ${escapeHtml(item.type)}</p>
                <p><strong>🕒 접수 일시:</strong> ${dateStr}</p>
                <p><strong>📌 상담 상태:</strong> <span style="font-weight:700; color:#2563eb;">${escapeHtml(item.status)}</span></p>
            </div>
            <div style="margin-bottom: 14px;">
                <p><strong>👤 성함 / 담당자:</strong> <span style="font-weight:700;">${escapeHtml(item.name)}</span></p>
                <p><strong>📞 연락처:</strong> <a href="tel:${item.phone}" style="color: #2563eb; font-weight:700;">${escapeHtml(item.phone)}</a></p>
            </div>
            <div style="margin-bottom: 14px;">
                <p><strong>💒 예식일정 및 베뉴 정보:</strong></p>
                <div style="background: #f1f5f9; padding: 10px 14px; border-radius: 8px; margin-top: 4px; font-weight:600;">${escapeHtml(item.details)}</div>
            </div>
            <div>
                <p><strong>📝 상세 문의 및 선택 옵션:</strong></p>
                <div style="background: #f1f5f9; padding: 12px 14px; border-radius: 8px; margin-top: 4px; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(item.message)}</div>
            </div>
        `;

        modalActions.innerHTML = `
            <a href="tel:${item.phone}" class="btn-login-submit" style="text-decoration:none; padding: 10px 18px; font-size:13px; background: #059669; display:inline-flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-phone"></i> 바로 전화 걸기
            </a>
            <a href="http://pf.kakao.com/_QXzaX/chat" target="_blank" class="btn-login-submit" style="text-decoration:none; padding: 10px 18px; font-size:13px; background: #fee500; color:#000; font-weight:800; display:inline-flex; align-items:center; gap:6px;">
                <i class="fa-comment fa-solid"></i> 카카오톡 채팅
            </a>
            <button id="btn-close-modal-inner" class="btn-logout" style="padding: 10px 16px; font-size:13px;">닫기</button>
        `;

        detailModal.style.display = 'flex';

        document.getElementById('btn-close-modal-inner')?.addEventListener('click', () => {
            detailModal.style.display = 'none';
        });
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
