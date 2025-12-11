// ==================== API CONFIGURATION ====================
const API_BASE_URL = "https://gantt-chart-bnm.onrender.com/api";
const ENDPOINTS = {
    spkList: `${API_BASE_URL}/spk_data`,
    ganttData: `${API_BASE_URL}/get_gantt_data`,
};

let projects = [];
let currentProject = null;
let projectTasks = {};
let ganttApiData = null;
let ganttApiError = null;
let isLoadingGanttData = false;
let hasUserInput = false; // Track apakah user sudah input jadwal

// ==================== TASK TEMPLATES ====================
const taskTemplateME = [
    { id: 1, name: 'Instalasi', start: 0, duration: 0, dependencies: [] },
    { id: 2, name: 'Fixture', start: 0, duration: 0, dependencies: [1] },
    { id: 3, name: 'Pekerjaan Tambahan', start: 0, duration: 0, dependencies: [1] },
    { id: 4, name: 'Pekerjaan SBO', start: 0, duration: 0, dependencies: [2, 3] },
];

const taskTemplateSipil = [
    { id: 1, name: 'Pekerjaan Persiapan', start: 0, duration: 0, dependencies: [] },
    { id: 2, name: 'Pekerjaan Bobokan/Bongkaran', start: 0, duration: 0, dependencies: [1] },
    { id: 3, name: 'Pekerjaan Tanah', start: 0, duration: 0, dependencies: [2] },
    { id: 4, name: 'Pekerjaan Pondasi & Beton', start: 0, duration: 0, dependencies: [3] },
    { id: 5, name: 'Pekerjaan Pasangan', start: 0, duration: 0, dependencies: [4] },
    { id: 6, name: 'Pekerjaan Besi', start: 0, duration: 0, dependencies: [5] },
    { id: 7, name: 'Pekerjaan Keramik', start: 0, duration: 0, dependencies: [6] },
    { id: 8, name: 'Pekerjaan Plumbing', start: 0, duration: 0, dependencies: [7] },
    { id: 9, name: 'Pekerjaan Sanitary & Acecories', start: 0, duration: 0, dependencies: [8] },
    { id: 10, name: 'Pekerjaan Janitor', start: 0, duration: 0, dependencies: [9] },
    { id: 11, name: 'Pekerjaan Atap', start: 0, duration: 0, dependencies: [10] },
    { id: 12, name: 'Pekerjaan Kusen, Pintu, dan Kaca', start: 0, duration: 0, dependencies: [11] },
    { id: 13, name: 'Pekerjaan Finishing', start: 0, duration: 0, dependencies: [10] },
    { id: 14, name: 'Pekerjaan Beanspot', start: 0, duration: 0, dependencies: [13] },
    { id: 15, name: 'Pekerjaan Tambahan', start: 0, duration: 0, dependencies: [13] },
    { id: 16, name: 'Pekerjaan SBO', start: 0, duration: 0, dependencies: [14, 15] },
];

let currentTasks = [];
const totalDaysME = 100;
const totalDaysSipil = 205;

// ==================== INITIALIZATION ====================
document.getElementById('logout-button-form').addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'https://gantt-chart-bnm.vercel.app';
});

// ==================== HELPER FUNCTIONS ====================
function formatDateID(date) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

function extractUlokAndLingkup(value) {
    if (!value) return { ulok: '', lingkup: '' };

    const trimmed = String(value).trim();
    const parts = trimmed.split('-');

    if (parts.length < 2) {
        return { ulok: trimmed, lingkup: '' };
    }

    const lingkupRaw = parts.pop();
    const ulok = parts.join('-');
    const lingkupUpper = lingkupRaw.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const lingkup = lingkupUpper === 'ME' ? 'ME' : 'Sipil';

    return { ulok, lingkup };
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseDateValue(raw) {
    if (!raw) return null;
    const iso = new Date(raw);
    if (!Number.isNaN(iso.getTime())) return iso;

    const match = String(raw).trim().match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (match) {
        const [_, d, m, y] = match;
        const year = y.length === 2 ? `20${y}` : y;
        const parsed = new Date(`${year}-${m}-${d}`);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
}

function showLoadingMessage() {
    const chart = document.getElementById('ganttChart');
    chart.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #6c757d;">
            <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
            <h2 style="margin-bottom: 15px;">Memuat Data...</h2>
            <p>Sedang mengambil data proyek dari server.</p>
        </div>
    `;
}

function showErrorMessage(message) {
    const chart = document.getElementById('ganttChart');
    chart.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #e53e3e;">
            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
            <h2 style="margin-bottom: 15px;">Terjadi Kesalahan</h2>
            <p>${message}</p>
            <button onclick="loadDataAndInit()" style="margin-top: 20px; padding: 10px 20px; background: #3182ce; color: white; border: none; border-radius: 6px; cursor: pointer;">
                🔄 Coba Lagi
            </button>
        </div>
    `;
}

function showSelectProjectMessage() {
    const chart = document.getElementById('ganttChart');
    chart.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #6c757d;">
            <h2 style="margin-bottom: 15px;">📋 Pilih No. Ulok</h2>
            <p>Data berhasil dimuat. Silakan pilih proyek di atas.</p>
        </div>
    `;
    document.getElementById('projectInfo').innerHTML = '';
    document.getElementById('stats').innerHTML = '';
    document.getElementById('exportButtons').style.display = 'none';
    ganttApiData = null;
    ganttApiError = null;
    hasUserInput = false;
    renderApiData();
}

function showPleaseInputMessage() {
    const chart = document.getElementById('ganttChart');
    chart.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #6c757d;">
            <div style="font-size: 48px; margin-bottom: 20px;">⏱️</div>
            <h2 style="margin-bottom: 15px;">Silakan Input Jadwal Pengerjaan</h2>
            <p>Masukkan hari mulai dan selesai untuk setiap tahapan di form di atas, kemudian klik <strong>"Terapkan Jadwal"</strong>.</p>
        </div>
    `;
}

// ==================== PARSE PROJECT DATA ====================
function parseProjectFromLabel(label, value) {
    const parts = label.split(' - ');
    const { ulok: ulokClean, lingkup } = extractUlokAndLingkup(value);

    let ulokNumber = ulokClean || value.replace(/-ME|-Sipil/gi, '');
    let projectName = "Reguler";
    let storeName = "Tidak Diketahui";
    let workType = lingkup || 'Sipil';
    let projectType = "Reguler";

    if (label.toUpperCase().includes('(ME)')) {
        workType = 'ME';
    }

    if (parts.length >= 3) {
        projectName = parts[1].replace(/\(ME\)|\(Sipil\)/gi, '').trim();
        storeName = parts[2].trim();

        if (label.toUpperCase().includes('RENOVASI') || ulokNumber.includes('-R')) {
            projectType = "Renovasi";
        }
    } else if (parts.length === 2) {
        storeName = parts[1].replace(/\(ME\)|\(Sipil\)/gi, '').trim();
    }

    return {
        ulok: value,
        ulokClean: ulokClean || ulokNumber,
        ulokNumber: ulokNumber,
        name: projectName,
        store: storeName,
        work: workType,
        lingkup: workType,
        projectType: projectType,
        contractor: "Belum Ditentukan",
        startDate: new Date().toISOString().split('T')[0],
        durasi: workType === 'ME' ? 37 : 184,
        alamat: "",
        status: "Berjalan",
        regional: "",
        area: ""
    };
}

// ==================== FETCH DATA FROM API ====================
async function loadDataAndInit() {
    try {
        showLoadingMessage();

        const response = await fetch(ENDPOINTS.spkList);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const apiData = await response.json();
        console.log("✅ Data dari API:", apiData);

        projects = apiData.map(item => parseProjectFromLabel(item.label, item.value));

        console.log("✅ Projects loaded:", projects.length);
        console.log("📋 Sample project:", projects[0]);

        initChart();

    } catch (error) {
        console.error("❌ Error loading data:", error);
        showErrorMessage(`Gagal memuat data: ${error.message}`);
    }
}

function initChart() {
    const ulokSelect = document.getElementById('ulokSelect');
    ulokSelect.innerHTML = '<option value="">-- Pilih Proyek --</option>';

    projects.forEach(project => {
        if (project.work === 'ME') {
            projectTasks[project.ulok] = JSON.parse(JSON.stringify(taskTemplateME));
        } else {
            projectTasks[project.ulok] = JSON.parse(JSON.stringify(taskTemplateSipil));
        }

        const option = document.createElement('option');
        option.value = project.ulok;
        option.textContent = `${project.ulok} | ${project.store} (${project.work})`;
        ulokSelect.appendChild(option);
    });

    showSelectProjectMessage();
}

// ==================== GANTT DATA FETCH (API) ====================
async function fetchGanttDataForSelection(selectedValue) {
    if (!selectedValue) {
        ganttApiData = null;
        ganttApiError = null;
        renderApiData();
        return;
    }

    const { ulok, lingkup } = extractUlokAndLingkup(selectedValue);

    if (!ulok || !lingkup) {
        ganttApiData = null;
        ganttApiError = 'Parameter ulok atau lingkup tidak valid.';
        renderApiData();
        return;
    }

    isLoadingGanttData = true;
    ganttApiError = null;
    renderApiData();

    const url = `${ENDPOINTS.ganttData}?ulok=${encodeURIComponent(ulok)}&lingkup=${encodeURIComponent(lingkup)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || data?.status === 'error') {
            const message = data?.message || data?.error || `HTTP ${response.status}`;
            throw new Error(message);
        }

        ganttApiData = data;

        if (currentProject && data?.spk) {
            updateProjectFromSpk(data.spk);
        }

        if (currentProject && Array.isArray(data?.rab) && data.rab.length) {
            const generatedTasks = buildTasksFromRabCategories(data.rab);
            projectTasks[currentProject.ulok] = generatedTasks;
            currentTasks = generatedTasks;
        }

        renderProjectInfo();
        if (hasUserInput) {
            renderChart();
        }
        updateStats();
    } catch (error) {
        console.error('❌ Error fetching Gantt data:', error);
        ganttApiData = null;
        ganttApiError = error.message || 'Gagal mengambil data Gantt.';
    } finally {
        isLoadingGanttData = false;
        renderApiData();
    }
}

function renderApiData() {
    const container = document.getElementById('apiData');
    if (!container) return;

    if (isLoadingGanttData) {
        container.innerHTML = `
            <div class="api-card">
                <div class="api-card-title">Memuat data Gantt...</div>
                <div class="api-row">Mohon tunggu, sedang mengambil data terbaru.</div>
            </div>
        `;
        return;
    }

    if (ganttApiError) {
        container.innerHTML = `
            <div class="api-card api-error">
                <div class="api-card-title">Gagal memuat data</div>
                <div class="api-row">${escapeHtml(ganttApiError)}</div>
            </div>
        `;
        return;
    }

    if (!currentProject || !currentTasks.length) {
        container.innerHTML = `
            <div class="api-card">
                <div class="api-card-title">Input Pengerjaan Tahapan</div>
                <div class="api-row">Pilih No. Ulok untuk menginput jadwal pengerjaan.</div>
            </div>
        `;
        return;
    }

    // Render form input untuk setiap tahapan
    let html = '<div class="api-card task-input-card">';
    html += '<div class="api-card-title">Input Pengerjaan Tahapan</div>';
    html += '<div class="task-input-container">';

    currentTasks.forEach((task) => {
        // Jika sudah ada input data, gunakan itu. Jika belum, tampilkan 0
        const taskData = task.inputData || { startDay: 0, endDay: 0 };
        
        html += `
            <div class="task-input-row">
                <div class="task-input-label">${escapeHtml(task.name)}</div>
                <div class="task-input-fields">
                    <div class="input-group">
                        <label>H</label>
                        <input type="number" 
                            class="task-day-input" 
                            id="task-start-${task.id}" 
                            value="${taskData.startDay}" 
                            min="0" 
                            placeholder="0">
                    </div>
                    <span class="input-separator">sampai</span>
                    <div class="input-group">
                        <label>H</label>
                        <input type="number" 
                            class="task-day-input" 
                            id="task-end-${task.id}" 
                            value="${taskData.endDay}" 
                            min="0" 
                            placeholder="0">
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    html += `
        <div class="task-input-actions">
            <button class="btn-apply-schedule" onclick="applyTaskSchedule()">
                Terapkan Jadwal
            </button>
            <button class="btn-reset-schedule" onclick="resetTaskSchedule()">
                Reset
            </button>
        </div>
    `;
    html += '</div>';

    container.innerHTML = html;
}

// ==================== CHANGE ULOK (SELECT PROJECT) ====================
async function changeUlok() {
    const ulokSelect = document.getElementById('ulokSelect');
    const selectedUlok = ulokSelect.value;

    if (!selectedUlok) {
        showSelectProjectMessage();
        return;
    }

    currentProject = projects.find(p => p.ulok === selectedUlok);
    currentTasks = projectTasks[selectedUlok];
    hasUserInput = false;
    
    fetchGanttDataForSelection(selectedUlok);

    console.log("✅ Selected project:", currentProject);

    renderProjectInfo();
    showPleaseInputMessage();
    updateStats();
    document.getElementById('exportButtons').style.display = 'none';
}

// ==================== RENDER FUNCTIONS ====================
function renderProjectInfo() {
    if (!currentProject) return;

    const info = document.getElementById('projectInfo');
    const startDate = currentProject.startDate ? new Date(currentProject.startDate) : new Date();
    const tglMulai = formatDateID(startDate);

    let tglSelesai = '-';
    if (currentProject.durasi) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + currentProject.durasi);
        tglSelesai = formatDateID(endDate);
    }

    let html = `
        <div class="project-detail">
            <div class="project-label">No. Ulok</div>
            <div class="project-value">${currentProject.ulokClean || currentProject.ulok}</div>
        </div>
        <div class="project-detail">
            <div class="project-label">Jenis Proyek</div>
            <div class="project-value">${currentProject.projectType}</div>
        </div>
        <div class="project-detail">
            <div class="project-label">Nama Toko</div>
            <div class="project-value">${currentProject.store}</div>
        </div>
        <div class="project-detail">
            <div class="project-label">Lingkup Pekerjaan</div>
            <div class="project-value">${currentProject.work}</div>
        </div>
        <div class="project-detail">
            <div class="project-label">Kontraktor</div>
            <div class="project-value">${currentProject.contractor}</div>
        </div>
        <div class="project-detail">
            <div class="project-label">Tanggal Mulai</div>
            <div class="project-value">${tglMulai}</div>
        </div>
    `;

    if (currentProject.durasi) {
        html += `
        <div class="project-detail">
            <div class="project-label">Durasi</div>
            <div class="project-value">${currentProject.durasi} hari</div>
        </div>
        <div class="project-detail">
            <div class="project-label">Target Selesai</div>
            <div class="project-value">${tglSelesai}</div>
        </div>
        `;
    }

    if (currentProject.status) {
        html += `
        <div class="project-detail">
            <div class="project-label">Status</div>
            <div class="project-value">${currentProject.status}</div>
        </div>
        `;
    }

    if (currentProject.regional) {
        html += `
        <div class="project-detail">
            <div class="project-label">Regional</div>
            <div class="project-value">${currentProject.regional}</div>
        </div>
        `;
    }

    if (currentProject.area) {
        html += `
        <div class="project-detail">
            <div class="project-label">Area</div>
            <div class="project-value">${currentProject.area}</div>
        </div>
        `;
    }

    if (currentProject.alamat) {
        html += `
        <div class="project-detail">
            <div class="project-label">Alamat</div>
            <div class="project-value">${currentProject.alamat}</div>
        </div>
        `;
    }

    info.innerHTML = html;
}

// ==================== API DATA HELPERS ====================
function updateProjectFromSpk(spkData) {
    if (!spkData || !currentProject) return;

    const getFirstNonEmpty = (keys) => {
        for (const key of keys) {
            const val = spkData[key];
            if (val !== undefined && val !== null && String(val).trim() !== '') return val;
        }
        return undefined;
    };

    const contractor = getFirstNonEmpty(['Kontraktor', 'contractor', 'kontraktor', 'Nama Kontraktor']);
    if (contractor) currentProject.contractor = contractor;

    const startRaw = getFirstNonEmpty(['Tanggal Mulai', 'tanggal_mulai', 'Start Date']);
    const parsedStart = parseDateValue(startRaw);
    if (parsedStart) currentProject.startDate = parsedStart.toISOString().split('T')[0];

    const durasiRaw = getFirstNonEmpty(['Durasi', 'durasi']);
    const durasiNum = durasiRaw ? parseInt(durasiRaw, 10) : null;
    if (!Number.isNaN(durasiNum) && durasiNum > 0) currentProject.durasi = durasiNum;

    const statusVal = getFirstNonEmpty(['Status', 'status']);
    if (statusVal) currentProject.status = statusVal;

    const proyekVal = getFirstNonEmpty(['Proyek', 'Jenis Proyek']);
    if (proyekVal) currentProject.projectType = proyekVal;

    const storeVal = getFirstNonEmpty(['Nama Toko', 'Store', 'Nama_Toko']);
    if (storeVal) currentProject.store = storeVal;
}

function buildTasksFromRabCategories(categories) {
    const tasks = [];
    let cursor = 0;
    const defaultDuration = 0;

    categories.forEach((cat, idx) => {
        tasks.push({
            id: idx + 1,
            name: cat,
            start: cursor,
            duration: defaultDuration,
            dependencies: idx === 0 ? [] : [idx],
        });
    });

    return tasks.length ? tasks : currentTasks;
}

function renderChart() {
    if (!currentProject) return;
    
    // Jangan render chart kalau belum ada input dari user
    if (!hasUserInput) {
        showPleaseInputMessage();
        return;
    }

    const chart = document.getElementById('ganttChart');
    const DAY_WIDTH = 40;

    let maxTaskEndDay = 0;
    currentTasks.forEach(task => {
        const end = task.start + task.duration;
        if (end > maxTaskEndDay) maxTaskEndDay = end;
    });

    const totalDaysToRender = Math.max(
        (currentProject.work === 'ME' ? totalDaysME : totalDaysSipil),
        maxTaskEndDay + 10
    );

    const totalChartWidth = totalDaysToRender * DAY_WIDTH;
    const projectStartDate = new Date(currentProject.startDate);

    // RENDER HEADER
    let html = '<div class="chart-header">';
    html += '<div class="task-column">Tahapan</div>';
    html += `<div class="timeline-column" style="width: ${totalChartWidth}px;">`;

    for (let i = 0; i < totalDaysToRender; i++) {
        const currentDate = new Date(projectStartDate);
        currentDate.setDate(projectStartDate.getDate() + i);

        const dateNum = currentDate.getDate();
        const monthName = currentDate.toLocaleDateString('id-ID', { month: 'short' });

        const isSunday = currentDate.getDay() === 0;
        const bgStyle = isSunday ? 'background-color: #ffe3e3;' : '';

        html += `
            <div class="day-header" style="width: ${DAY_WIDTH}px; ${bgStyle}">
                <span class="d-date">${dateNum}</span>
                <span class="d-month">${monthName}</span>
            </div>
        `;
    }
    html += '</div></div>';

    // RENDER BODY (TASKS)
    html += '<div class="chart-body">';

    currentTasks.forEach(task => {
        // Skip jika duration masih 0
        if (task.duration === 0) return;

        const taskRealStart = new Date(projectStartDate);
        taskRealStart.setDate(projectStartDate.getDate() + (task.start - 1));

        const taskRealEnd = new Date(taskRealStart);
        taskRealEnd.setDate(taskRealStart.getDate() + task.duration);

        const leftPos = (task.start - 1) * DAY_WIDTH;
        const widthPos = task.duration * DAY_WIDTH;

        const barClass = 'on-time';

        const tooltipText = `${task.name}\n${formatDateID(taskRealStart)} s/d ${formatDateID(taskRealEnd)}\n(${task.duration} hari)`;

        html += '<div class="task-row">';
        html += `<div class="task-name">
            <span>${task.name}</span>
            <span class="task-duration">Durasi: ${task.duration} hari</span>
        </div>`;
        html += `<div class="timeline" style="width: ${totalChartWidth}px;">`;
        html += `<div class="bar ${barClass}" data-task-id="${task.id}" 
                style="left: ${leftPos}px; width: ${widthPos}px;" 
                title="${tooltipText}">
            ${task.duration}h
        </div>`;
        html += '</div></div>';
    });

    html += '</div>';

    chart.innerHTML = html;

    setTimeout(() => {
        drawDependencyLines();
    }, 50);
}

function drawDependencyLines() {
    const existingSvg = document.querySelector('.dependency-svg');
    if (existingSvg) existingSvg.remove();

    const chartBody = document.querySelector('.chart-body');
    if (!chartBody) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('dependency-svg');
    svg.style.width = `${chartBody.scrollWidth}px`;
    svg.style.height = `${chartBody.scrollHeight}px`;

    chartBody.appendChild(svg);

    const bodyRect = chartBody.getBoundingClientRect();

    currentTasks.forEach(task => {
        if (task.dependencies && task.dependencies.length > 0) {
            task.dependencies.forEach(depId => {
                const fromBar = document.querySelector(`.bar[data-task-id="${depId}"]`);
                const toBar = document.querySelector(`.bar[data-task-id="${task.id}"]`);

                if (fromBar && toBar) {
                    const fromRect = fromBar.getBoundingClientRect();
                    const toRect = toBar.getBoundingClientRect();

                    const x1 = (fromRect.right - bodyRect.left) + chartBody.scrollLeft;
                    const y1 = (fromRect.top + fromRect.height / 2 - bodyRect.top) + chartBody.scrollTop;

                    const x2 = (toRect.left - bodyRect.left) + chartBody.scrollLeft;
                    const y2 = (toRect.top + toRect.height / 2 - bodyRect.top) + chartBody.scrollTop;

                    const deltaX = x2 - x1;
                    const curveAmount = Math.max(Math.abs(deltaX / 2), 40);

                    const d = `M ${x1} ${y1} C ${x1 + curveAmount} ${y1}, ${x2 - curveAmount} ${y2}, ${x2} ${y2}`;

                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', d);
                    path.classList.add('dependency-line');
                    path.setAttribute('stroke', '#adb5bd');
                    path.setAttribute('stroke-width', '2');
                    path.setAttribute('fill', 'none');
                    svg.appendChild(path);
                }
            });
        }
    });
}

// ==================== TASK MANIPULATION ====================
function applyTaskSchedule() {
    if (!currentProject || !currentTasks.length) {
        alert('Pilih No. Ulok terlebih dahulu!');
        return;
    }

    let hasError = false;
    const updatedTasks = [];

    currentTasks.forEach(task => {
        const startInput = document.getElementById(`task-start-${task.id}`);
        const endInput = document.getElementById(`task-end-${task.id}`);

        if (!startInput || !endInput) return;

        const startDay = parseInt(startInput.value);
        const endDay = parseInt(endInput.value);

        // Validasi
        if (isNaN(startDay) || isNaN(endDay)) {
            alert(`Error pada ${task.name}: Hari mulai dan selesai harus diisi!`);
            hasError = true;
            return;
        }

        if (startDay < 1 || endDay < 1) {
            alert(`Error pada ${task.name}: Hari mulai dan selesai harus minimal 1!`);
            hasError = true;
            return;
        }

        if (endDay < startDay) {
            alert(`Error pada ${task.name}: Hari selesai tidak boleh lebih kecil dari hari mulai!`);
            hasError = true;
            return;
        }

        const duration = endDay - startDay + 1;

        // Update task
        updatedTasks.push({
            ...task,
            start: startDay,
            duration: duration,
            inputData: { startDay, endDay }
        });
    });

    if (hasError) return;

    // Apply updated tasks
    currentTasks = updatedTasks;
    projectTasks[currentProject.ulok] = updatedTasks;
    hasUserInput = true;

    // Render chart dan update stats
    renderChart();
    updateStats();
    document.getElementById('exportButtons').style.display = 'flex';

    alert('✅ Jadwal berhasil diterapkan!');
}

function resetTaskSchedule() {
    if (!currentProject) {
        alert('Pilih No. Ulok terlebih dahulu!');
        return;
    }

    // Reset ke template default (semua durasi 0)
    if (currentProject.work === 'ME') {
        projectTasks[currentProject.ulok] = JSON.parse(JSON.stringify(taskTemplateME));
    } else {
        projectTasks[currentProject.ulok] = JSON.parse(JSON.stringify(taskTemplateSipil));
    }

    currentTasks = projectTasks[currentProject.ulok];
    hasUserInput = false;

    // Re-render form dan hide chart
    renderApiData();
    showPleaseInputMessage();
    updateStats();
    document.getElementById('exportButtons').style.display = 'none';

    alert('🔄 Jadwal telah direset ke 0.');
}

function updateStats() {
    if (!currentProject) return;

    // Hitung total tahapan yang sudah diinput (duration > 0)
    const inputedTasks = currentTasks.filter(t => t.duration > 0);
    const totalInputed = inputedTasks.length;
    
    // Hitung max end day
    let maxEnd = 0;
    if (inputedTasks.length > 0) {
        maxEnd = Math.max(...inputedTasks.map(t => t.start + t.duration - 1));
    }

    const stats = document.getElementById('stats');
    stats.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${currentTasks.length}</div>
            <div class="stat-label">Total Tahapan</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalInputed}</div>
            <div class="stat-label">Tahapan Terinput</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${currentTasks.length - totalInputed}</div>
            <div class="stat-label">Belum Diinput</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${maxEnd}</div>
            <div class="stat-label">Estimasi Selesai (hari)</div>
        </div>
    `;
}

// ==================== EXPORT FUNCTIONS ====================
function exportToExcel() {
    if (!currentProject || !hasUserInput) {
        alert('Silakan input jadwal terlebih dahulu!');
        return;
    }
    
    const startDate = new Date(currentProject.startDate);

    const data = [
        ["Laporan Jadwal Proyek"],
        ["No. Ulok", currentProject.ulok],
        ["Jenis Proyek", currentProject.projectType],
        ["Nama Toko", currentProject.store],
        ["Pekerjaan", currentProject.work],
        ["Kontraktor", currentProject.contractor],
        ["Tanggal Mulai", formatDateID(startDate)],
        [],
        ["No", "Tahapan", "Mulai", "Selesai", "Durasi", "Status"]
    ];

    currentTasks.forEach((task, i) => {
        if (task.duration === 0) return; // Skip yang belum diinput
        
        const tStart = new Date(startDate);
        tStart.setDate(startDate.getDate() + (task.start - 1));
        const tEnd = new Date(tStart);
        tEnd.setDate(tStart.getDate() + task.duration - 1);
        data.push([
            i + 1,
            task.name,
            formatDateID(tStart),
            formatDateID(tEnd),
            task.duration,
            "Berjalan"
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal");
    XLSX.writeFile(wb, `Jadwal_${currentProject.ulok}.xlsx`);
}

// ==================== EVENT LISTENERS ====================
window.addEventListener('resize', () => {
    if (currentProject && hasUserInput) {
        drawDependencyLines();
    }
});

// ==================== START APPLICATION ====================
loadDataAndInit();