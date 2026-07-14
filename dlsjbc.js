// dlsjbc.js - Now backed by MySQL via PHP API instead of localStorage.
// Function names and element IDs are unchanged from the original so the
// HTML (dlsjbc.html) does not need to be modified.

const SUBJECTS = [
    { key: 'math', label: '📐 Math' },
    { key: 'ethics', label: '⚖️ Ethics' },
    { key: 'pe', label: '🏃 PE' },
    { key: 'oop', label: '💻 OOP' },
    { key: 'platform', label: '🔧 Platform' },
    { key: 'reed', label: '⛪ ReEd' }
];

// For TEACHER and ADMIN - includes combined sections
const PROGRAM_SECTIONS_FULL = {
    BSIT: ['A', 'B', 'C', 'ABC', 'AB', 'AC', 'BC'],
    BSHRM: ['A', 'B', 'AB'],
    BSTM: ['A'],
    TEED: ['A'],
    BEED: ['A'],
    BSCS: ['A'],
    BSBA: ['A', 'B', 'C', 'ABC', 'AB', 'AC', 'BC'],
    BSA: ['A']
};

// For STUDENT SIGNUP - only regular sections (NO combined sections)
const PROGRAM_SECTIONS_STUDENT = {
    BSIT: ['A', 'B', 'C'],
    BSHRM: ['A', 'B'],
    BSTM: ['A'],
    TEED: ['A'],
    BEED: ['A'],
    BSCS: ['A'],
    BSBA: ['A', 'B', 'C'],
    BSA: ['A']
};

// Helper function to determine if a teacher's assigned section includes a student's section
function teacherIncludesStudent(teacherSection, studentSection) {
    if (teacherSection === 'ALL') return true;
    if (teacherSection === studentSection) return true;

    const combinedSections = {
        'ABC': ['A', 'B', 'C'],
        'AB': ['A', 'B'],
        'AC': ['A', 'C'],
        'BC': ['B', 'C']
    };

    if (combinedSections[teacherSection]) {
        return combinedSections[teacherSection].includes(studentSection);
    }

    return false;
}

// ------------------------------------------------------------------
// API helpers - talk to the PHP backend (api/auth.php, api/students.php, api/users.php)
// ------------------------------------------------------------------
const API = {
    auth: 'api/auth.php',
    students: 'api/students.php',
    users: 'api/users.php'
};

async function apiPost(url, data) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) {
        console.error('API error:', e);
        return { success: false, message: 'Network/server error. Is XAMPP running?' };
    }
}

async function apiGet(url, params = {}) {
    try {
        const qs = new URLSearchParams(params).toString();
        const res = await fetch(url + (qs ? ('?' + qs) : ''));
        return await res.json();
    } catch (e) {
        console.error('API error:', e);
        return { success: false, message: 'Network/server error. Is XAMPP running?' };
    }
}

// In-memory caches (kept for the same rendering functions the app already had)
let users = [];
let students = [];
let currentUser = null;

async function loadStudents() {
    const r = await apiGet(API.students, { action: 'list' });
    if (r.success) students = r.students;
    return r;
}
async function loadUsers() {
    const r = await apiGet(API.users, { action: 'list' });
    if (r.success) users = r.users;
    return r;
}
async function loadAll() {
    await Promise.all([loadStudents(), loadUsers()]);
}

function gpa(g) {
    const v = Object.values(g);
    return (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2);
}

function gpaColor(g) {
    return g <= 1.5 ? 'var(--green-main)' : g <= 2.5 ? '#1565c0' : g <= 3.0 ? 'var(--amber)' : 'var(--red)';
}

function remarkStr(g) {
    return g <= 1.5 ? 'Excellent' : g <= 2.5 ? 'Passed' : g <= 3.0 ? 'Conditional' : 'Failed';
}

function remarkChip(g) {
    const c = g <= 1.5 ? 'exc' : g <= 2.5 ? 'pass' : g <= 3.0 ? 'cond' : 'fail';
    return `<span class="g-chip ${c}">${remarkStr(g)}</span>`;
}

function statusBadge(s) {
    return `<span class="status-badge ${s}">${s === 'active' ? 'Active' : 'On Leave'}</span>`;
}

// Password toggle
function tp(id, btn) {
    const i = document.getElementById(id);
    if (!i) return;
    const isPassword = i.type === 'password';
    i.type = isPassword ? 'text' : 'password';

    if (isPassword) {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    } else {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    }
}

function v(id) { return (document.getElementById(id) || {}).value?.trim() || ''; }
function setMsg(id, txt, ok) {
    const el = document.getElementById(id);
    if (el) {
        el.innerHTML = txt ? `<div class="${ok ? 'msg-success' : 'msg-error'}">${txt}</div>` : '';
    }
}
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// Updated updateSections function - uses different section lists based on which dropdown is being populated
function updateSections(progId, secId) {
    const progEl = document.getElementById(progId);
    const secEl = document.getElementById(secId);
    if (!progEl || !secEl) return;
    const prog = progEl.value;
    secEl.innerHTML = '<option value="">-- Section --</option>';

    if (progId === 'ssuProgram') {
        if (prog && PROGRAM_SECTIONS_STUDENT[prog]) {
            PROGRAM_SECTIONS_STUDENT[prog].forEach(s => {
                const o = document.createElement('option');
                o.value = s;
                o.textContent = s;
                secEl.appendChild(o);
            });
        }
    } else {
        if (prog && PROGRAM_SECTIONS_FULL[prog]) {
            PROGRAM_SECTIONS_FULL[prog].forEach(s => {
                const o = document.createElement('option');
                o.value = s;
                o.textContent = s;
                secEl.appendChild(o);
            });
        }
    }

    if (secId === 'tsuSection') {
        const allOption = document.createElement('option');
        allOption.value = 'ALL';
        allOption.textContent = 'ALL (All Sections)';
        secEl.appendChild(allOption);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const pairs = [
        ['ssuProgram', 'ssuSection'],
        ['tsuProgram', 'tsuSection'],
        ['mProgram', 'mSection']
    ];
    pairs.forEach(([progId, secId]) => {
        const el = document.getElementById(progId);
        if (el) el.addEventListener('change', () => updateSections(progId, secId));
        if (el && el.value) {
            updateSections(progId, secId);
        }
    });
});

function getLastName(name) {
    if (!name) return '';
    if (name.includes(',')) return name.split(',')[0].trim();
    const parts = name.trim().split(' ');
    return parts[parts.length - 1];
}

function studentsFilteredByTeacher() {
    if (!currentUser || currentUser.role !== 'teacher') return students;
    if (currentUser.assignedSection === 'ALL') return students;

    return students.filter(s =>
        s.program === currentUser.assignedProgram &&
        s.year === currentUser.assignedYear &&
        teacherIncludesStudent(currentUser.assignedSection, s.section)
    );
}

function studentsBySectionSorted(arr = null) {
    const source = arr || (currentUser?.role === 'teacher' ? studentsFilteredByTeacher() : students);
    const sorted = [...source].sort((a, b) => {
        const secA = (a.section || '').toUpperCase();
        const secB = (b.section || '').toUpperCase();
        if (secA < secB) return -1;
        if (secA > secB) return 1;
        return getLastName(a.name).localeCompare(getLastName(b.name));
    });
    const groups = {};
    sorted.forEach(s => {
        const key = s.section || '—';
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });
    return groups;
}

function selectRole(role, el) {
    document.querySelectorAll('.role-pill').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.portal-btn').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    const sidePill = document.querySelector(`.role-pill[data-role="${role}"]`);
    if (sidePill) sidePill.classList.add('active');
    document.querySelectorAll('.role-auth').forEach(a => a.classList.remove('show'));
    document.getElementById(`auth-${role}`).classList.add('show');
}

function switchTab(role, tab, el) {
    const container = document.getElementById(`auth-${role}`);
    if (!container) return;
    const tabs = container.querySelectorAll('.auth-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');

    const loginDiv = document.getElementById(`${role}-login`);
    const signupDiv = document.getElementById(`${role}-signup`);
    if (loginDiv) loginDiv.style.display = tab === 'login' ? 'block' : 'none';
    if (signupDiv) signupDiv.style.display = tab === 'signup' ? 'block' : 'none';
    setMsg(`authMsg-${role}`, '');
}

async function doAuth(role, action) {
    const msgId = `authMsg-${role}`;

    if (action === 'login') {
        let id = '', pass = '';
        if (role === 'student') { id = v('sLoginId'); pass = v('sLoginPass'); }
        else if (role === 'teacher') { id = v('tLoginId'); pass = v('tLoginPass'); }
        else { id = v('adminLoginId'); pass = v('adminLoginPass'); }

        if (!id || !pass) { setMsg(msgId, 'Please enter both username/email and password.'); return; }

        const r = await apiPost(API.auth, { action: 'login', role, id, pass });
        if (!r.success) { setMsg(msgId, r.message || 'Invalid credentials or wrong portal.'); return; }

        await loadAll();
        launchApp(r.user);

    } else if (role === 'student') {
        const fn = v('ssuFullname'), un = v('ssuUsername'), em = v('ssuEmail'), sid = v('ssuStudentId'), pw = v('ssuPass'), prog = v('ssuProgram'), yr = v('ssuYear'), sec = v('ssuSection');
        if (!fn || !un || !em || !sid || !pw || !prog || !yr || !sec) { setMsg(msgId, 'Please fill all fields.'); return; }
        if (!em.endsWith('@gmail.com')) { setMsg(msgId, 'Email must be @gmail.com'); return; }

        const r = await apiPost(API.auth, {
            action: 'signup_student', fullname: fn, username: un, email: em,
            studentId: sid, pass: pw, program: prog, year: yr, section: sec
        });
        if (!r.success) { setMsg(msgId, r.message); return; }

        const teacherMsg = r.teacherCount > 0
            ? `\n\nThis student will be visible to ${r.teacherCount} teacher(s) with matching Program (${prog}), Year (${yr}), and Section (${sec} or combined sections like ABC).`
            : `\n\nNo teacher currently matches Program: ${prog}, Year: ${yr}, Section: ${sec}. Create a teacher with these assignments to see this student.`;

        setMsg(msgId, `Account created! Please login.${teacherMsg}`, true);
        setTimeout(() => switchTab(role, 'login', document.querySelector('#auth-' + role + ' .auth-tab:first-child')), 2000);

    } else if (role === 'teacher') {
        const fn = v('tsuFullname'), un = v('tsuUsername'), em = v('tsuEmail'), pw = v('tsuPass'), prog = v('tsuProgram'), yr = v('tsuYear'), sec = v('tsuSection');
        if (!fn || !un || !em || !pw || !prog || !yr || !sec) { setMsg(msgId, 'Please fill all fields including Program, Year, and Section.'); return; }
        if (!em.endsWith('@gmail.com')) { setMsg(msgId, 'Email must be @gmail.com'); return; }

        const r = await apiPost(API.auth, {
            action: 'signup_teacher', fullname: fn, username: un, email: em,
            pass: pw, program: prog, year: yr, section: sec
        });
        if (!r.success) { setMsg(msgId, r.message); return; }

        const combinedNote = sec === 'ABC' ? 'A, B, C' : sec === 'AB' ? 'A, B' : sec === 'AC' ? 'A, C' : sec === 'BC' ? 'B, C' : sec;
        setMsg(msgId, `Submitted! Awaiting admin approval.\n\nThis teacher will see ${r.studentCount} existing student(s) with matching Program (${prog}), Year (${yr}), and Section (${sec} includes sections ${combinedNote}).`, true);
        setTimeout(() => switchTab('teacher', 'login', document.querySelector('#auth-teacher .auth-tab:first-child')), 2000);
    }
}

function launchApp(user) {
    currentUser = user;
    document.getElementById('authView').style.display = 'none';
    document.getElementById('mainView').style.display = 'block';
    document.getElementById('headerName').textContent = user.fullname || user.username;
    document.getElementById('headerAvatar').textContent = (user.fullname || user.username || 'U')[0].toUpperCase();
    const rb = document.getElementById('headerRoleBadge');
    rb.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    rb.className = 'role-badge ' + user.role;
    buildNav(user.role);
}

function buildNav(role) {
    const bar = document.getElementById('navTabsBar');
    bar.innerHTML = '';
    const tabs = [];
    if (role === 'student') tabs.push({ id: 'student', label: '📚 My Grades' });
    if (role === 'teacher' || role === 'admin') tabs.push({ id: 'grades', label: '📐 Grade Management' });
    if (role === 'admin') tabs.push({ id: 'admin', label: '🛡️ Admin Panel' });
    tabs.forEach((t, i) => {
        const btn = document.createElement('button');
        btn.className = 'nav-tab' + (i === 0 ? ' active' : '');
        btn.textContent = t.label;
        btn.onclick = () => switchMainTab(t.id, btn);
        bar.appendChild(btn);
    });
    if (tabs.length) switchMainTab(tabs[0].id, bar.querySelector('.nav-tab'));
}

function switchMainTab(tabId, el) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`view-${tabId}`).classList.add('active');
    if (tabId === 'grades') renderGrades();
    if (tabId === 'student') renderStudentSelf();
    if (tabId === 'admin') renderAdmin();
}

function logout() {
    currentUser = null;
    document.getElementById('mainView').style.display = 'none';
    document.getElementById('authView').style.display = 'flex';
}

function renderStudentSelf() {
    const s = students.find(x => x.id === currentUser.studentId);
    if (!s) {
        document.getElementById('myGradesBody').innerHTML = '<tr><td colspan="3">No student record found. Contact your teacher.</td></tr>';
        return;
    }
    document.getElementById('studentBadge').innerHTML = `${s.name} (${s.id})`;

    const adviser = users.find(u => u.role === 'teacher' &&
        u.assignedProgram === s.program &&
        u.assignedYear === s.year &&
        teacherIncludesStudent(u.assignedSection, s.section)
    );
    const adviserName = adviser ? adviser.fullname : 'Not assigned';

    document.getElementById('studentViewSubtitle').innerHTML = `Program: ${s.program || '—'} · Year: ${s.year || '—'} · Section: ${s.section || '—'}<br>Adviser: ${adviserName}`;
    const tbody = document.getElementById('myGradesBody');
    tbody.innerHTML = '';
    SUBJECTS.forEach(sub => {
        const g = s.grades[sub.key];
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${sub.label}</td><td style="font-weight:700;color:${gpaColor(g)};">${g.toFixed(1)}</td><td>${remarkChip(g)}</td>`;
        tbody.appendChild(tr);
    });
    const avg = parseFloat(gpa(s.grades));
    const tr = document.createElement('tr');
    tr.style.background = 'var(--green-frost)';
    tr.style.fontWeight = '700';
    tr.innerHTML = `<td>📊 GPA</td><td style="color:${gpaColor(avg)};">${avg.toFixed(2)}</td><td>${remarkChip(avg)}</td>`;
    tbody.appendChild(tr);
    document.getElementById('gpaDisplay').textContent = avg.toFixed(2);
    document.getElementById('gpaDisplay').style.color = gpaColor(avg);
    document.getElementById('standingDisplay').innerHTML = remarkChip(avg);
    const fillPercent = Math.max(0, Math.min(100, ((5 - avg) / 4) * 100));
    document.getElementById('gpaFill').style.width = fillPercent + '%';
    document.getElementById('profileInfoCard').innerHTML = `<b>Student ID:</b> ${s.id}<br><b>Status:</b> ${s.status === 'active' ? '✅ Active' : '⏸ On Leave'}<br><b>Program:</b> ${s.program || '—'} · <b>Year:</b> ${s.year || '—'} · <b>Section:</b> ${s.section || '—'}`;
}

function renderGrades() {
    const filtered = currentUser.role === 'teacher' ? studentsFilteredByTeacher() : students;
    document.getElementById('statTotal').textContent = filtered.length;
    document.getElementById('statActive').textContent = filtered.filter(s => s.status === 'active').length;
    document.getElementById('statHonor').textContent = filtered.filter(s => parseFloat(gpa(s.grades)) <= 1.8).length;
    document.getElementById('statFail').textContent = filtered.filter(s => parseFloat(gpa(s.grades)) >= 3.0).length;
    renderPreviewDropdown();
    renderInstructorTable();
}

function renderPreviewDropdown() {
    const filtered = currentUser.role === 'teacher' ? studentsFilteredByTeacher() : students;
    const sel = document.getElementById('previewStudentDd');
    sel.innerHTML = '<option value="">-- Select a student --</option>';
    const groups = studentsBySectionSorted(filtered);
    Object.keys(groups).sort().forEach(sec => {
        const og = document.createElement('optgroup');
        og.label = 'Section ' + sec;
        groups[sec].forEach(s => {
            const o = document.createElement('option');
            o.value = s.id;
            o.textContent = `${s.name} (${s.id})`;
            og.appendChild(o);
        });
        sel.appendChild(og);
    });
    sel.onchange = () => { if (sel.value) renderPreview(students.find(x => x.id === sel.value)); };
    if (filtered[0]) renderPreview(filtered[0]);
}

function renderPreview(s) {
    if (!s) return;
    const tbody = document.getElementById('previewGradesBody');
    tbody.innerHTML = '';
    SUBJECTS.forEach(sub => {
        const g = s.grades[sub.key];
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${sub.label}</td><td style="font-weight:700;color:${gpaColor(g)};">${g.toFixed(1)}</td><td>${remarkChip(g)}</td>`;
        tbody.appendChild(tr);
    });
    const avg = parseFloat(gpa(s.grades));
    const tr = document.createElement('tr');
    tr.style.background = 'var(--green-frost)';
    tr.style.fontWeight = '700';
    tr.innerHTML = `<td>GPA</td><td style="color:${gpaColor(avg)};">${avg.toFixed(2)}</td><td>${remarkChip(avg)}</td>`;
    tbody.appendChild(tr);
}

function renderInstructorTable() {
    const tbody = document.getElementById('instructorBody');
    tbody.innerHTML = '';
    const source = currentUser.role === 'teacher' ? studentsFilteredByTeacher() : students;
    const groups = studentsBySectionSorted(source);
    Object.keys(groups).sort().forEach(sec => {
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `<td colspan="14" style="padding:0;"><div class="section-group-hdr"><span>SECTION ${sec}</span><span class="sec-count">${groups[sec].length} student${groups[sec].length !== 1 ? 's' : ''}</span></div></td>`;
        tbody.appendChild(headerRow);
        groups[sec].forEach(s => {
            const avg = gpa(s.grades);
            const tr = document.createElement('tr');
            let cells = SUBJECTS.map(sub => `<td><span class="editable-grade" data-id="${s.id}" data-key="${sub.key}" style="cursor:pointer;color:${gpaColor(s.grades[sub.key])};font-weight:700;text-decoration:underline dotted;">${s.grades[sub.key].toFixed(1)}</span></td>`).join('');
            tr.innerHTML = `<td style="font-size:0.68rem;color:var(--gray-400);">${s.id}</td><td style="font-weight:600;">${s.name}</td><td><span class="badge-prog">${s.program || '—'}</span></td><td><span class="badge-yr">${s.year || '—'}</span></td><td><span class="badge-sec">${s.section || '—'}</span></td><td>${statusBadge(s.status)}</td>${cells}<td style="font-weight:700;color:${gpaColor(parseFloat(avg))};">${avg}</td><td><button class="btn-danger" onclick="deleteStudent('${s.id}')" style="background:#f5c6cb;color:#721c24;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">Del</button></td>`;
            tbody.appendChild(tr);
        });
    });

    document.querySelectorAll('.editable-grade').forEach(el => {
        el.addEventListener('click', async function () {
            const sid = this.dataset.id, key = this.dataset.key;
            const s = students.find(x => x.id === sid);
            if (!s) return;
            const val = prompt(`Edit ${key} grade for ${s.name} (1.0–5.0):`, s.grades[key]);
            if (val === null) return;
            const num = parseFloat(val);
            if (isNaN(num) || num < 1.0 || num > 5.0) { alert('Invalid grade. Must be between 1.0 and 5.0.'); return; }

            const r = await apiPost(API.students, { action: 'update_grade', id: sid, key, value: num });
            if (!r.success) { alert(r.message || 'Could not update grade.'); return; }

            await loadStudents();
            renderGrades();
        });
    });
}

// Delete student function - deletes both student record AND user account
window.deleteStudent = async function (sid) {
    if (!confirm('Are you sure you want to delete this student? This will also delete their user account and cannot be undone.')) return;

    const r = await apiPost(API.students, { action: 'delete', id: sid });
    if (!r.success) { alert(r.message || 'Could not delete student.'); return; }

    const wasSelf = currentUser && currentUser.role === 'student' && currentUser.studentId === sid;
    await loadAll();

    if (wasSelf) {
        alert('Your account has been deleted. You will be logged out.');
        logout();
    } else if (currentUser.role === 'teacher') {
        renderGrades();
    } else if (currentUser.role === 'admin') {
        renderAdmin();
    }

    alert('Student and associated user account deleted successfully!');
};

function openAddStudentModal() {
    document.getElementById('studentModalTitle').textContent = 'Add New Student';
    ['mId', 'mName'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const progEl = document.getElementById('mProgram');
    if (progEl) progEl.value = '';
    const yearEl = document.getElementById('mYear');
    if (yearEl) yearEl.value = '';
    const secEl = document.getElementById('mSection');
    if (secEl) secEl.innerHTML = '<option value="">-- Section --</option>';
    const statusEl = document.getElementById('mStatus');
    if (statusEl) statusEl.value = 'active';

    const gradeFields = ['mMath', 'mEthics', 'mPE', 'mOOP', 'mPlatform', 'mReEd'];
    gradeFields.forEach(field => {
        const el = document.getElementById(field);
        if (el) el.value = '1.5';
    });

    setMsg('studentModalMsg', '');
    openModal('studentModal');
}

async function saveStudent() {
    const id = v('mId'), name = v('mName'), prog = v('mProgram'), yr = v('mYear'), sec = v('mSection'), status = v('mStatus');
    if (!id || !name || !prog || !yr || !sec) { setMsg('studentModalMsg', 'Please fill all required fields.'); return; }

    const math = parseFloat(document.getElementById('mMath')?.value) || 1.5;
    const ethics = parseFloat(document.getElementById('mEthics')?.value) || 1.5;
    const pe = parseFloat(document.getElementById('mPE')?.value) || 1.5;
    const oop = parseFloat(document.getElementById('mOOP')?.value) || 1.5;
    const platform = parseFloat(document.getElementById('mPlatform')?.value) || 1.5;
    const reed = parseFloat(document.getElementById('mReEd')?.value) || 1.5;

    const r = await apiPost(API.students, {
        action: 'add', id, name, program: prog, year: yr, section: sec, status,
        math, ethics, pe, oop, platform, reed
    });
    if (!r.success) { setMsg('studentModalMsg', r.message); return; }

    await loadStudents();

    const teacherMsg = r.teacherCount > 0
        ? `\n\nThis student will be visible to ${r.teacherCount} teacher(s) with matching Program (${prog}), Year (${yr}), and Section (${sec} or combined sections).`
        : `\n\nNo teacher currently matches Program: ${prog}, Year: ${yr}, Section: ${sec}. Create a teacher with these assignments to see this student.`;

    if (currentUser.role === 'teacher') renderGrades();
    else renderAdmin();
    closeModal('studentModal');
    alert(`Student ${name} added successfully!${teacherMsg}`);
}

function renderAdmin() {
    const teachers = users.filter(u => u.role === 'teacher' && u.approved);
    const pending = users.filter(u => !u.approved && u.role === 'teacher');
    document.getElementById('adminStatStudents').textContent = students.length;
    document.getElementById('adminStatTeachers').textContent = teachers.length;
    document.getElementById('adminStatPending').textContent = pending.length;
    document.getElementById('adminStatHonor').textContent = students.filter(s => parseFloat(gpa(s.grades)) <= 1.8).length;
    renderUserList('teacherList', teachers, 'teacher');
    renderPendingList('pendingList', pending);
    renderAdminStudents();
}

function renderUserList(containerId, list, role) {
    const el = document.getElementById(containerId);
    el.innerHTML = '';
    if (!list.length) { el.innerHTML = `<p style="font-size:0.76rem;color:var(--gray-400);padding:0.4rem 0;">No ${role} accounts yet.</p>`; return; }
    list.forEach(u => {
        const div = document.createElement('div');
        div.className = 'user-list-item';
        const sectionDisplay = u.assignedSection === 'ALL' ? 'ALL (All Students)' : u.assignedSection || 'N/A';
        div.innerHTML = `<div><div class="name">${u.fullname || u.username}</div><div class="meta">${u.username} · ${u.email} · Assigned: ${u.assignedProgram || 'N/A'} ${u.assignedYear || ''} ${sectionDisplay}</div></div><div class="action-btns"><button class="btn-outline" onclick="editUserPass('${u.id}')">🔑</button><button class="btn-danger" onclick="removeUser('${u.id}')">Del</button></div>`;
        el.appendChild(div);
    });
}

function renderPendingList(containerId, list) {
    const el = document.getElementById(containerId);
    el.innerHTML = '';
    if (!list.length) { el.innerHTML = '<div class="alert-success">✅ No pending approvals.</div>'; return; }
    list.forEach(u => {
        const div = document.createElement('div');
        div.className = 'user-list-item';
        div.innerHTML = `<div><div class="name">${u.fullname || u.username} <span class="role-badge teacher" style="font-size:0.62rem;">teacher</span></div><div class="meta">${u.email} · Requested: ${u.assignedProgram || ''} ${u.assignedYear || ''} ${u.assignedSection || ''}</div></div><div class="action-btns"><button class="btn-sm" style="background:var(--green-light);" onclick="approveUser('${u.id}')">Approve</button><button class="btn-danger" onclick="removeUser('${u.id}')">Reject</button></div>`;
        el.appendChild(div);
    });
}

function renderAdminStudents() {
    const tbody = document.getElementById('adminStudentBody');
    tbody.innerHTML = '';
    const groups = studentsBySectionSorted(students);
    Object.keys(groups).sort().forEach(sec => {
        const hdr = document.createElement('tr');
        hdr.innerHTML = `<td colspan="8" style="padding:0;"><div class="section-group-hdr"><span>SECTION ${sec}</span><span class="sec-count">${groups[sec].length} student${groups[sec].length !== 1 ? 's' : ''}</span></div></tr>`;
        tbody.appendChild(hdr);
        groups[sec].forEach(s => {
            const avg = gpa(s.grades);
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="font-size:0.68rem;">${s.id}</td><td style="font-weight:600;">${s.name}</td><td><span class="badge-prog">${s.program || '—'}</span></td>
                            <td><span class="badge-yr">${s.year || '—'}</span></td>
                            <td><span class="badge-sec">${s.section || '—'}</span></td>
                            <td style="font-weight:700;color:${gpaColor(parseFloat(avg))};">${avg}</td>
                            <td>${statusBadge(s.status)}</td>
                            <td><button class="btn-danger" onclick="deleteStudent('${s.id}')" style="background:#f5c6cb;color:#721c24;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">Del</button></td>`;
            tbody.appendChild(tr);
        });
    });
}

async function approveUser(id) {
    const r = await apiPost(API.users, { action: 'approve', id });
    if (!r.success) { alert(r.message || 'Could not approve.'); return; }
    await loadUsers();
    renderAdmin();
}

async function removeUser(id) {
    if (!confirm('Remove this user?')) return;

    const userToRemove = users.find(x => x.id === id);
    if (!userToRemove) return;

    if (userToRemove.role === 'teacher') {
        let affectedCount = 0;
        if (userToRemove.assignedSection === 'ALL') {
            affectedCount = students.length;
        } else {
            affectedCount = students.filter(s =>
                s.program === userToRemove.assignedProgram &&
                s.year === userToRemove.assignedYear &&
                teacherIncludesStudent(userToRemove.assignedSection, s.section)
            ).length;
        }

        if (affectedCount > 0) {
            const confirmDelete = confirm(`⚠️ WARNING: This teacher is currently advising ${affectedCount} student(s).\n\nDeleting this teacher will remove their adviser assignment.\n\nDo you still want to delete this teacher?`);
            if (!confirmDelete) return;
        }
    }

    const r = await apiPost(API.users, { action: 'delete', id });
    if (!r.success) { alert(r.message || 'Could not delete user.'); return; }

    const wasSelf = currentUser && currentUser.id === id;
    await loadUsers();

    if (wasSelf) {
        alert('Your account has been deleted. You will be logged out.');
        logout();
    } else {
        renderAdmin();
    }
}

async function editUserPass(id) {
    const u = users.find(x => x.id === id);
    if (!u) return;
    const np = prompt('New password for ' + (u.fullname || u.username) + ':');
    if (!np) return;

    const r = await apiPost(API.users, { action: 'update_password', id, newpass: np });
    if (!r.success) { alert(r.message || 'Could not update password.'); return; }
    alert('Password updated!');
}

function openAddUserModal(role) {
    document.getElementById('addUserRole').value = role;
    document.getElementById('addUserModalTitle').textContent = 'Add ' + (role.charAt(0).toUpperCase() + role.slice(1));
    const extraField = document.getElementById('auExtra');
    if (extraField) extraField.placeholder = role === 'teacher' ? 'Department / Subject' : 'Role';
    ['auFullname', 'auUsername', 'auEmail', 'auExtra', 'auPass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    setMsg('addUserMsg', '');
    openModal('addUserModal');
}

async function saveNewUser() {
    const role = document.getElementById('addUserRole').value;
    const fn = v('auFullname'), un = v('auUsername'), em = v('auEmail'), ex = v('auExtra'), pw = v('auPass');
    if (!fn || !un || !em || !pw) { setMsg('addUserMsg', 'Fill all fields.'); return; }

    const r = await apiPost(API.users, { action: 'add', role, fullname: fn, username: un, email: em, extra: ex, pass: pw });
    if (!r.success) { setMsg('addUserMsg', r.message); return; }

    await loadUsers();
    renderAdmin();
    closeModal('addUserModal');
    alert(role.charAt(0).toUpperCase() + role.slice(1) + ' account created!');
}

async function createAdminAccount() {
    const username = prompt('Enter Admin Username:');
    if (!username) return;
    const password = prompt('Enter Admin Password:');
    if (!password) return;
    const fullname = prompt('Enter Full Name:');
    if (!fullname) return;

    const r = await apiPost(API.users, { action: 'create_admin', username, pass: password, fullname });
    if (!r.success) { alert(r.message); return; }

    await loadUsers();
    alert(r.message || ('Admin account created! Login with username: ' + username));
    renderAdmin();
}

async function createTeacherAccount() {
    const fullname = prompt('Enter Teacher Full Name:');
    if (!fullname) return;
    const username = prompt('Enter Teacher Username:');
    if (!username) return;
    const password = prompt('Enter Teacher Password:');
    if (!password) return;
    const program = prompt('Enter Assigned Program (BSIT, BSHRM, BSTM, TEED, BEED, BSCS, BSBA, BSA):');
    if (!program) return;
    const year = prompt('Enter Assigned Year (1st Year, 2nd Year, 3rd Year, 4th Year):');
    if (!year) return;
    const section = prompt('Enter Assigned Section (A, B, C, ABC, AB, AC, BC):');
    if (!section) return;

    const r = await apiPost(API.users, {
        action: 'create_teacher', fullname, username, pass: password,
        program, year, section
    });
    if (!r.success) { alert(r.message); return; }

    await loadUsers();
    alert(`Teacher account created! They can now login and will see ${r.studentCount} student(s) with matching Program (${program}), Year (${year}), and Section (${section}).`);
    renderAdmin();
}

function openForgot() {
    setMsg('forgotMsg', '');
    document.getElementById('resetSection').style.display = 'none';
    openModal('forgotModal');
}

async function sendResetCode() {
    const email = v('resetEmail');
    const r = await apiPost(API.auth, { action: 'forgot_send', email });
    if (!r.success) { setMsg('forgotMsg', r.message); return; }
    alert(r.message); // demo only - shows the code instead of emailing it
    document.getElementById('resetSection').style.display = 'block';
}

async function resetPassword() {
    const code = v('resetCode'), np = v('newPass'), email = v('resetEmail');
    const r = await apiPost(API.auth, { action: 'forgot_reset', email, code, newpass: np });
    if (!r.success) { setMsg('forgotMsg', r.message); return; }
    alert('Password changed!');
    closeModal('forgotModal');
}
