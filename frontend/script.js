// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker Registered'))
        .catch((err) => console.log('SW Registration Failed:', err));
}

const API_BASE = '/api';

// DOM Elements
const menuBtn = document.getElementById('menu-btn');
const dropdownMenu = document.getElementById('dropdown-menu');
const btnChangeSection = document.getElementById('btn-change-section');
const btnChangeName = document.getElementById('btn-change-name');

const nameSetupScreen = document.getElementById('name-setup-screen');
const nameForm = document.getElementById('name-form');
const userNameInput = document.getElementById('user-name-input');

const roleSelectScreen = document.getElementById('role-select-screen');
const roleWelcomeHeading = document.getElementById('role-welcome-heading');

const studentSetupScreen = document.getElementById('student-setup-screen');
const studentDashboard = document.getElementById('student-dashboard');
const teacherDashboard = document.getElementById('teacher-dashboard');
const passwordModal = document.getElementById('password-modal');

const selectStudentBtn = document.getElementById('select-student-btn');
const selectTeacherBtn = document.getElementById('select-teacher-btn');
const studentForm = document.getElementById('student-form');
const sectionSelect = document.getElementById('section-select');

const studentGreeting = document.getElementById('student-greeting');
const teacherGreeting = document.getElementById('teacher-greeting');
const displaySectionName = document.getElementById('display-section-name');
const liveClassName = document.getElementById('live-class-name');
const studentDayTime = document.getElementById('student-day-time');
const refreshStudentBtn = document.getElementById('refresh-student-btn');

const dayTabs = document.querySelectorAll('.day-tab');
const liveViewBlock = document.getElementById('live-view-block');
const dayScheduleBlock = document.getElementById('day-schedule-block');
const selectedDayTitle = document.getElementById('selected-day-title');
const dayScheduleList = document.getElementById('day-schedule-list');

const adminPasswordInput = document.getElementById('admin-password');
const submitPasswordBtn = document.getElementById('submit-password-btn');
const cancelPasswordBtn = document.getElementById('cancel-password-btn');
const passwordError = document.getElementById('password-error');

const teacherTableBody = document.getElementById('teacher-table-body');
const teacherDayTime = document.getElementById('teacher-day-time');
const refreshTeacherBtn = document.getElementById('refresh-teacher-btn');

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    const savedName = localStorage.getItem('userName');
    const savedRole = localStorage.getItem('userRole');
    const savedSection = localStorage.getItem('studentSection');

    hideAllScreens();

    if (!savedName) {
        nameSetupScreen.classList.remove('hidden');
    } else if (!savedRole) {
        roleWelcomeHeading.textContent = `Hello, ${savedName}!`;
        roleSelectScreen.classList.remove('hidden');
    } else if (savedRole === 'student' && savedSection) {
        loadStudentDashboard(savedName, savedSection);
    } else if (savedRole === 'teacher') {
        loadTeacherDashboard(savedName);
    } else {
        roleWelcomeHeading.textContent = `Hello, ${savedName}!`;
        roleSelectScreen.classList.remove('hidden');
    }
}

function hideAllScreens() {
    nameSetupScreen.classList.add('hidden');
    roleSelectScreen.classList.add('hidden');
    studentSetupScreen.classList.add('hidden');
    studentDashboard.classList.add('hidden');
    teacherDashboard.classList.add('hidden');
    passwordModal.classList.add('hidden');
    dropdownMenu.classList.add('hidden');
}

// Menu & Header Events
menuBtn.addEventListener('click', () => dropdownMenu.classList.toggle('hidden'));

btnChangeSection.addEventListener('click', () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('studentSection');
    initApp();
});

btnChangeName.addEventListener('click', () => {
    localStorage.clear();
    initApp();
});

// Name Form
nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const enteredName = userNameInput.value.trim();
    if (enteredName) {
        localStorage.setItem('userName', enteredName);
        initApp();
    }
});

selectStudentBtn.addEventListener('click', () => {
    hideAllScreens();
    studentSetupScreen.classList.remove('hidden');
});

selectTeacherBtn.addEventListener('click', () => {
    passwordError.classList.add('hidden');
    adminPasswordInput.value = '';
    passwordModal.classList.remove('hidden');
});

cancelPasswordBtn.addEventListener('click', () => passwordModal.classList.add('hidden'));

// Student Actions
studentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const chosenSection = sectionSelect.value;
    const currentName = localStorage.getItem('userName');
    
    if (chosenSection) {
        localStorage.setItem('userRole', 'student');
        localStorage.setItem('studentSection', chosenSection);
        loadStudentDashboard(currentName, chosenSection);
    }
});

refreshStudentBtn.addEventListener('click', () => {
    const savedName = localStorage.getItem('userName');
    const savedSection = localStorage.getItem('studentSection');
    if (savedSection) loadStudentDashboard(savedName, savedSection);
});

// Day Tab Switcher Logic
dayTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        dayTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const selectedDay = tab.dataset.day;
        const savedSection = localStorage.getItem('studentSection');

        if (selectedDay === 'LIVE') {
            dayScheduleBlock.classList.add('hidden');
            liveViewBlock.classList.remove('hidden');
            loadLiveStudentLocation(savedSection);
        } else {
            liveViewBlock.classList.add('hidden');
            dayScheduleBlock.classList.remove('hidden');
            fetchDaySchedule(savedSection, selectedDay);
        }
    });
});

async function loadStudentDashboard(name, section) {
    hideAllScreens();
    studentDashboard.classList.remove('hidden');
    studentGreeting.textContent = `Hello, ${name}!`;
    displaySectionName.textContent = section;

    // Default tab to LIVE
    dayTabs.forEach(t => t.classList.remove('active'));
    dayTabs[0].classList.add('active');
    dayScheduleBlock.classList.add('hidden');
    liveViewBlock.classList.remove('hidden');

    loadLiveStudentLocation(section);
}

async function loadLiveStudentLocation(section) {
    liveClassName.textContent = "Loading current location...";
    try {
        const response = await fetch(`${API_BASE}/section/${section}/current`);
        const data = await response.json();

        if (data.success) {
            studentDayTime.textContent = `${data.day} | ${data.time}`;
            liveClassName.textContent = data.current_class;
        } else {
            liveClassName.textContent = "No schedule found for this section.";
        }
    } catch (err) {
        liveClassName.textContent = "Server offline. Ensure app.py is running.";
    }
}

async function fetchDaySchedule(section, day) {
    selectedDayTitle.textContent = `${day} Timetable`;
    dayScheduleList.innerHTML = '<p style="font-size: 0.85rem; color: #64748b;">Loading schedule...</p>';

    try {
        const response = await fetch(`${API_BASE}/section/${section}/schedule?day=${day}`);
        const data = await response.json();

        if (data.success && data.schedule && Object.keys(data.schedule).length > 0) {
            dayScheduleList.innerHTML = '';
            for (const [timeSlot, subject] of Object.entries(data.schedule)) {
                const item = document.createElement('div');
                item.className = 'schedule-item';
                item.innerHTML = `
                    <span class="time-slot">${timeSlot}</span>
                    <span class="subject-name">${subject}</span>
                `;
                dayScheduleList.appendChild(item);
            }
        } else {
            dayScheduleList.innerHTML = '<p style="font-size: 0.85rem; color: #64748b;">No classes scheduled for this day.</p>';
        }
    } catch (err) {
        dayScheduleList.innerHTML = '<p style="font-size: 0.85rem; color: #ef4444;">Error fetching day schedule.</p>';
    }
}

// Teacher Actions
submitPasswordBtn.addEventListener('click', handleTeacherLogin);

async function handleTeacherLogin() {
    const password = adminPasswordInput.value;
    const name = localStorage.getItem('userName');
    try {
        const response = await fetch(`${API_BASE}/all_sections/current`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('userRole', 'teacher');
            passwordModal.classList.add('hidden');
            renderTeacherTable(name, data);
        } else {
            passwordError.classList.remove('hidden');
        }
    } catch (err) {
        alert("Server connection failed. Make sure backend is running.");
    }
}

refreshTeacherBtn.addEventListener('click', () => {
    const savedName = localStorage.getItem('userName');
    loadTeacherDashboard(savedName);
});

async function loadTeacherDashboard(name) {
    hideAllScreens();
    teacherDashboard.classList.remove('hidden');
    teacherGreeting.textContent = `Hello, ${name}!`;

    try {
        const response = await fetch(`${API_BASE}/all_sections/current`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: "Admin123" })
        });

        const data = await response.json();
        if (data.success) {
            renderTeacherTable(name, data);
        }
    } catch (err) {
        console.error(err);
    }
}

function renderTeacherTable(name, data) {
    hideAllScreens();
    teacherDashboard.classList.remove('hidden');
    teacherGreeting.textContent = `Hello, ${name}!`;
    teacherDayTime.textContent = `${data.day} | ${data.time}`;
    teacherTableBody.innerHTML = '';

    for (const [section, classInfo] of Object.entries(data.live_data)) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${section}</td>
            <td>${classInfo}</td>
        `;
        teacherTableBody.appendChild(row);
    }
}