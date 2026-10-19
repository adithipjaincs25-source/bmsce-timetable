// Register Service Worker for Offline Capabilities
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed:', err));
}

let currentUser = {
    name: localStorage.getItem('user_name') || '',
    role: localStorage.getItem('user_role') || '',
    section: localStorage.getItem('user_section') || ''
};

const OFFICIAL_SECTION_NAMES = {
    "3B1": "3B1 [3D]", "3B2": "3B2 [3G]", "3B3": "3B3 [3N]", "3B4": "3B4 [3Q]", "3B5": "3B5 [3V]",
    "5B1": "5B1 [5D]", "5B2": "5B2 [5G]", "5B3": "5B3 [5N]", "5B4": "5B4 [5O]", "5B5": "5B5 [5V]"
};

document.addEventListener('DOMContentLoaded', () => {
    initAppFlow();
    setupEventListeners();
});

function initAppFlow() {
    hideAllScreens();
    if (!currentUser.name) {
        showScreen('name-setup-screen');
    } else if (!currentUser.role) {
        document.getElementById('role-welcome-heading').innerText = `Hello, ${currentUser.name}!`;
        showScreen('role-select-screen');
    } else if (currentUser.role === 'student') {
        if (!currentUser.section) {
            showScreen('student-setup-screen');
        } else {
            loadStudentDashboard();
        }
    } else if (currentUser.role === 'teacher') {
        loadTeacherDashboard();
    }
}

function hideAllScreens() {
    const screens = ['name-setup-screen', 'role-select-screen', 'student-setup-screen', 'student-dashboard', 'teacher-dashboard', 'password-modal'];
    screens.forEach(id => document.getElementById(id).classList.add('hidden'));
}

function showScreen(id) {
    document.getElementById(id).classList.remove('hidden');
}

function setupEventListeners() {
    // Menu
    document.getElementById('menu-btn').addEventListener('click', () => {
        document.getElementById('dropdown-menu').classList.toggle('hidden');
    });

    document.getElementById('btn-change-section').addEventListener('click', () => {
        document.getElementById('dropdown-menu').classList.add('hidden');
        currentUser.role = '';
        currentUser.section = '';
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_section');
        initAppFlow();
    });

    document.getElementById('btn-change-name').addEventListener('click', () => {
        document.getElementById('dropdown-menu').classList.add('hidden');
        localStorage.clear();
        currentUser = { name: '', role: '', section: '' };
        initAppFlow();
    });

    // Form 0: Name
    document.getElementById('name-form').addEventListener('submit', (e) => {
        e.preventDefault();
        currentUser.name = document.getElementById('user-name-input').value.trim();
        localStorage.setItem('user_name', currentUser.name);
        initAppFlow();
    });

    // Role Select
    document.getElementById('select-student-btn').addEventListener('click', () => {
        currentUser.role = 'student';
        localStorage.setItem('user_role', 'student');
        initAppFlow();
    });

    document.getElementById('select-teacher-btn').addEventListener('click', () => {
        showScreen('password-modal');
    });

    // Modal Password
    document.getElementById('cancel-password-btn').addEventListener('click', () => {
        document.getElementById('password-modal').classList.add('hidden');
    });

    document.getElementById('submit-password-btn').addEventListener('click', verifyAdminPassword);

    // Form 2: Student Section
    document.getElementById('student-form').addEventListener('submit', (e) => {
        e.preventDefault();
        currentUser.section = document.getElementById('section-select').value;
        localStorage.setItem('user_section', currentUser.section);
        initAppFlow();
    });

    // Tabs
    document.querySelectorAll('.day-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            const day = e.target.getAttribute('data-day');
            if (day === 'LIVE') {
                document.getElementById('live-view-block').classList.remove('hidden');
                document.getElementById('day-schedule-block').classList.add('hidden');
                fetchLiveStatus();
            } else {
                document.getElementById('live-view-block').classList.add('hidden');
                document.getElementById('day-schedule-block').classList.remove('hidden');
                fetchDaySchedule(day);
            }
        });
    });

    document.getElementById('refresh-student-btn').addEventListener('click', fetchLiveStatus);
    document.getElementById('refresh-teacher-btn').addEventListener('click', loadTeacherDashboard);
}

function verifyAdminPassword() {
    const pwd = document.getElementById('admin-password').value;
    if (pwd === "Admin123") {
        document.getElementById('password-modal').classList.add('hidden');
        currentUser.role = 'teacher';
        localStorage.setItem('user_role', 'teacher');
        initAppFlow();
    } else {
        document.getElementById('password-error').classList.remove('hidden');
    }
}

function loadStudentDashboard() {
    showScreen('student-dashboard');
    document.getElementById('student-greeting').innerText = `Hello, ${currentUser.name}!`;
    document.getElementById('display-section-name').innerText = OFFICIAL_SECTION_NAMES[currentUser.section] || currentUser.section;
    fetchLiveStatus();
    cacheFullScheduleOffline();
}

async function fetchLiveStatus() {
    try {
        const res = await fetch(`/api/section/${currentUser.section}/current`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('student-day-time').innerText = `${data.day}, ${data.time}`;
            document.getElementById('live-class-name').innerText = data.current_class;
        }
    } catch (err) {
        document.getElementById('student-day-time').innerText = "Offline Mode";
        document.getElementById('live-class-name').innerText = "Unable to fetch live status offline. Select a day tab to view cached schedule.";
    }
}

async function cacheFullScheduleOffline() {
    try {
        const res = await fetch(`/api/section/${currentUser.section}/schedule`);
        const data = await res.json();
        if (data.success) {
            localStorage.setItem(`cached_schedule_${currentUser.section}`, JSON.stringify(data.full_timetable));
        }
    } catch (err) {
        console.log("Using cached offline timetable.");
    }
}

async function fetchDaySchedule(day) {
    document.getElementById('selected-day-title').innerText = `${day} Timetable`;
    const list = document.getElementById('day-schedule-list');
    list.innerHTML = "<p>Loading schedule...</p>";

    try {
        const res = await fetch(`/api/section/${currentUser.section}/schedule?day=${day}`);
        const data = await res.json();
        if (data.success) {
            renderScheduleList(data.schedule);
            return;
        }
    } catch (err) {
        // Offline Fallback from LocalStorage
        const cached = localStorage.getItem(`cached_schedule_${currentUser.section}`);
        if (cached) {
            const timetable = JSON.parse(cached);
            renderScheduleList(timetable[day] || {});
            return;
        }
    }
    list.innerHTML = "<p>No offline data cached for this section yet.</p>";
}

function renderScheduleList(scheduleObj) {
    const list = document.getElementById('day-schedule-list');
    list.innerHTML = '';
    if (!scheduleObj || Object.keys(scheduleObj).length === 0) {
        list.innerHTML = "<p>No classes scheduled for this day.</p>";
        return;
    }
    for (const [time, subject] of Object.entries(scheduleObj)) {
        const item = document.createElement('div');
        item.className = 'schedule-item';
        item.innerHTML = `<span class="schedule-time">${time}</span><span class="schedule-subject">${subject}</span>`;
        list.appendChild(item);
    }
}

async function loadTeacherDashboard() {
    showScreen('teacher-dashboard');
    document.getElementById('teacher-greeting').innerText = `Hello, ${currentUser.name}!`;
    const tbody = document.getElementById('teacher-table-body');
    tbody.innerHTML = "<tr><td colspan='2'>Fetching live status...</td></tr>";

    try {
        const res = await fetch('/api/all_sections/current', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: "Admin123" })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('teacher-day-time').innerText = `${data.day}, ${data.time}`;
            tbody.innerHTML = '';
            for (const [sec, cls] of Object.entries(data.live_data)) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td><strong>${OFFICIAL_SECTION_NAMES[sec] || sec}</strong></td><td>${cls}</td>`;
                tbody.appendChild(tr);
            }
        }
    } catch (err) {
        tbody.innerHTML = "<tr><td colspan='2'>Offline Mode: Unable to fetch live department status.</td></tr>";
    }
}