require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Initialization
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-supabase')) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase Client initialized successfully!');
    } catch (e) {
        console.error('❌ Supabase initialization failed, falling back to local file/memory storage:', e.message);
    }
} else {
    console.log('ℹ️ Supabase environment variables not set. Using local JSON/Memory storage.');
}

// Local Database Fallback configurations
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'inquiries.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');

let memoryInquiries = [];
let memoryAnalytics = { pageViews: 120 };

// Ensure database directory and file exist (if writable)
try {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
    }
    if (!fs.existsSync(ANALYTICS_FILE)) {
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify({ pageViews: 120 }, null, 2), 'utf8');
    }
} catch (e) {
    console.log('Running in read-only environment, using memory fallback storage.');
}

// Local File Storage Helpers
function readAnalyticsFromFile() {
    try {
        const fileContent = fs.readFileSync(ANALYTICS_FILE, 'utf8');
        return JSON.parse(fileContent);
    } catch (err) {
        return memoryAnalytics;
    }
}

function writeAnalyticsToFile(analytics) {
    memoryAnalytics = analytics;
    try {
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analytics, null, 2), 'utf8');
    } catch (e) {}
}

function readInquiriesFromFile() {
    try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(fileContent);
    } catch (err) {
        return memoryInquiries;
    }
}

function writeInquiriesToFile(data) {
    memoryInquiries = data;
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        return true;
    }
}

// -------------------------------------------------------------------------
// Unified Database Access Layer (Supabase with Local Fallback)
// -------------------------------------------------------------------------

async function getInquiries() {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false });
            if (!error && data) {
                return data.map(item => ({
                    id: item.id,
                    type: item.type,
                    name: item.name,
                    phone: item.phone,
                    details: item.details,
                    message: item.message,
                    status: item.status || '대기중',
                    createdAt: item.created_at
                }));
            }
            console.error('Supabase query error:', error?.message);
        } catch (e) {
            console.error('Supabase error, using local fallback:', e.message);
        }
    }
    return readInquiriesFromFile();
}

async function saveNewInquiry(newInquiry) {
    if (supabase) {
        try {
            const { error } = await supabase.from('inquiries').insert([{
                id: newInquiry.id,
                type: newInquiry.type,
                name: newInquiry.name,
                phone: newInquiry.phone,
                details: newInquiry.details,
                message: newInquiry.message,
                status: newInquiry.status || '대기중',
                created_at: newInquiry.createdAt
            }]);
            if (!error) return true;
            console.error('Supabase insert error:', error.message);
        } catch (e) {
            console.error('Supabase insert exception:', e.message);
        }
    }
    const inquiries = readInquiriesFromFile();
    inquiries.unshift(newInquiry);
    return writeInquiriesToFile(inquiries);
}

async function updateInquiryStatusInDb(id, status) {
    if (supabase) {
        try {
            const { error } = await supabase.from('inquiries').update({ status }).eq('id', id);
            if (!error) return true;
            console.error('Supabase update status error:', error.message);
        } catch (e) {
            console.error('Supabase status update exception:', e.message);
        }
    }
    const inquiries = readInquiriesFromFile();
    const index = inquiries.findIndex(item => item.id === id);
    if (index !== -1) {
        inquiries[index].status = status;
        writeInquiriesToFile(inquiries);
        return true;
    }
    return false;
}

async function deleteInquiryFromDb(id) {
    if (supabase) {
        try {
            const { error } = await supabase.from('inquiries').delete().eq('id', id);
            if (!error) return true;
            console.error('Supabase delete error:', error.message);
        } catch (e) {
            console.error('Supabase delete exception:', e.message);
        }
    }
    const inquiries = readInquiriesFromFile();
    const filtered = inquiries.filter(item => item.id !== id);
    if (inquiries.length !== filtered.length) {
        writeInquiriesToFile(filtered);
        return true;
    }
    return false;
}

async function getPageViews() {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('analytics').select('page_views').eq('id', 1).single();
            if (!error && data) {
                return data.page_views;
            }
        } catch (e) {}
    }
    return readAnalyticsFromFile().pageViews || 120;
}

async function incrementPageViews() {
    if (supabase) {
        try {
            const currentViews = await getPageViews();
            const newViews = currentViews + 1;
            await supabase.from('analytics').upsert({ id: 1, page_views: newViews, updated_at: new Date().toISOString() });
            return newViews;
        } catch (e) {}
    }
    const analytics = readAnalyticsFromFile();
    analytics.pageViews = (analytics.pageViews || 120) + 1;
    writeAnalyticsToFile(analytics);
    return analytics.pageViews;
}

// -------------------------------------------------------------------------
// Instant Multi-Channel Notification Module (Webhook, Telegram, Email)
// -------------------------------------------------------------------------
async function sendInstantNotification(inquiry) {
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    const resendApiKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.NOTIFICATION_EMAIL;

    const messageText = `🔔 [에테라 시네마틱 웨딩] 새로운 상담 문의가 접수되었습니다!\n\n` +
        `👤 신랑/신부: ${inquiry.name}\n` +
        `📞 연락처: ${inquiry.phone}\n` +
        `💒 예식일정/장소: ${inquiry.details}\n` +
        `💡 문의구분: ${inquiry.type}\n` +
        `📝 문의내용: ${inquiry.message}\n\n` +
        `👉 관리자 대시보드: https://aethera-wedding.vercel.app/admin`;

    // 1. Generic Webhook Notification (Slack, Discord, Kakao Webhook)
    if (webhookUrl) {
        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: messageText, content: messageText })
            });
            console.log('✅ Instant Webhook Notification sent!');
        } catch (e) {
            console.error('Webhook notification error:', e.message);
        }
    }

    // 2. Telegram Bot Free Push Alert
    if (telegramToken && telegramChatId) {
        try {
            await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: telegramChatId, text: messageText })
            });
            console.log('✅ Instant Telegram Push Alert sent!');
        } catch (e) {
            console.error('Telegram alert error:', e.message);
        }
    }

    // 3. Resend Email Notification
    if (resendApiKey && notifyEmail) {
        try {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${resendApiKey}`
                },
                body: JSON.stringify({
                    from: 'AETHERA Wedding <onboarding@resend.dev>',
                    to: [notifyEmail],
                    subject: `🔔 [에테라 웨딩] ${inquiry.name}님의 새로운 상담 문의가 접수되었습니다.`,
                    text: messageText
                })
            });
            console.log('✅ Instant Resend Email sent!');
        } catch (e) {
            console.error('Resend email error:', e.message);
        }
    }
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Intercept index page hits to track page view counts
app.get('/', async (req, res) => {
    const cookies = req.headers.cookie || '';
    const isAdmin = cookies.includes('isAdmin=true') || req.query.isAdmin === 'true';
    if (!isAdmin) {
        await incrementPageViews();
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', async (req, res) => {
    const cookies = req.headers.cookie || '';
    const isAdmin = cookies.includes('isAdmin=true') || req.query.isAdmin === 'true';
    if (!isAdmin) {
        await incrementPageViews();
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve static landing page files
app.use(express.static(__dirname));

// Serve Admin Dashboard page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve B2B page
app.get('/b2b', (req, res) => {
    res.sendFile(path.join(__dirname, 'b2b.html'));
});

// -------------------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------------------

// 1. Submit Inquiry (B2C/B2B)
app.post('/api/inquiry', async (req, res) => {
    const { 'inquiry-type': type, 'user-name': name, 'user-phone': phone, 'wedding-details': details, message } = req.body;

    if (!type || !name || !phone || !details || !message) {
        return res.status(400).json({ success: false, message: '모든 필수 항목을 입력해 주세요.' });
    }

    const newInquiry = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        type,
        name,
        phone,
        details,
        message,
        status: '대기중',
        createdAt: new Date().toISOString()
    };

    const saved = await saveNewInquiry(newInquiry);
    if (saved) {
        // Trigger instant notification in background
        sendInstantNotification(newInquiry).catch(err => console.error('Notification async error:', err));
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, message: '데이터 저장 오류가 발생했습니다.' });
    }
});

// Admin Authorization Middleware
function verifyAdminToken(req, res, next) {
    const token = req.headers['x-admin-token'];
    const expectedToken = process.env.ADMIN_TOKEN || 'admin1234';
    if (token === expectedToken) {
        next();
    } else {
        res.status(401).json({ success: false, message: '인증되지 않은 접근입니다.' });
    }
}

// 2. Admin Login API
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const expectedPassword = process.env.ADMIN_TOKEN || 'admin1234';
    if (password === expectedPassword) {
        res.json({ success: true, token: expectedPassword });
    } else {
        res.status(401).json({ success: false, message: '비밀번호가 올바르지 않습니다.' });
    }
});

// 3. Get All Inquiries
app.get('/api/inquiries', verifyAdminToken, async (req, res) => {
    const inquiries = await getInquiries();
    const pageViews = await getPageViews();
    res.json({ 
        success: true, 
        data: inquiries,
        pageViews: pageViews
    });
});

// 4. Update Inquiry Status
app.put('/api/inquiries/:id', verifyAdminToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ success: false, message: '상태 정보가 없습니다.' });
    }

    const updated = await updateInquiryStatusInDb(id, status);
    if (updated) {
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: '해당 문의를 찾을 수 없습니다.' });
    }
});

// 5. Delete Inquiry
app.delete('/api/inquiries/:id', verifyAdminToken, async (req, res) => {
    const { id } = req.params;
    const deleted = await deleteInquiryFromDb(id);
    if (deleted) {
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: '해당 문의를 찾을 수 없습니다.' });
    }
});

// Start Server
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`====================================================`);
        console.log(`  AETHERA Server is running on:`);
        console.log(`  - Local:   http://localhost:${PORT}`);
        console.log(`  - Mobile/LAN: http://192.168.0.69:${PORT}`);
        console.log(`  - Admin Dashboard: http://localhost:${PORT}/admin`);
        console.log(`====================================================`);
    });
}

module.exports = app;
