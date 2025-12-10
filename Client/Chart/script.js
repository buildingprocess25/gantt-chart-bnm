// ==================== API CONFIGURATION ====================
const API_BASE_URL = "https://gantt-chart-bnm.onrender.com/api";
const ENDPOINTS = {
    spkList: `${API_BASE_URL}/spk_data`           // List semua SPK
    // Detail akan diambil dari endpoint lain atau dari spk_data langsung
};

let projects = [];
let currentProject = null;
let projectTasks = {};

// ==================== TASK TEMPLATES ====================
const taskTemplateME = [
    { id: 1, name: 'Instalasi', start: 1, duration: 10, dependencies: [] },
    { id: 2, name: 'Fixture', start: 8, duration: 15, dependencies: [1] },
    { id: 3, name: 'Pekerjaan Tambahan', start: 20, duration: 5, dependencies: [1] },
    { id: 4, name: 'Pekerjaan SBO', start: 25, duration: 12, dependencies: [2, 3] },
];

const taskTemplateSipil = [
    { id: 1, name: 'Pekerjaan Persiapan', start: 1, duration: 7, dependencies: [] },
    { id: 2, name: 'Pekerjaan Bobokan/Bongkaran', start: 8, duration: 12, dependencies: [1] },
    { id: 3, name: 'Pekerjaan Tanah', start: 15, duration: 20, dependencies: [2] },
    { id: 4, name: 'Pekerjaan Pondasi & Beton', start: 35, duration: 8, dependencies: [3] },
    { id: 5, name: 'Pekerjaan Pasangan', start: 43, duration: 10, dependencies: [4] },
    { id: 6, name: 'Pekerjaan Besi', start: 53, duration: 20, dependencies: [5] },
    { id: 7, name: 'Pekerjaan Keramik', start: 73, duration: 8, dependencies: [6] },
    { id: 8, name: 'Pekerjaan Plumbing', start: 81, duration: 25, dependencies: [7] },
    { id: 9, name: 'Pekerjaan Sanitary & Acecories', start: 106, duration: 10, dependencies: [8] },
    { id: 10, name: 'Pekerjaan Janitor', start: 116, duration: 20, dependencies: [9] },
    { id: 11, name: 'Pekerjaan Atap', start: 136, duration: 12, dependencies: [10] },
    { id: 12, name: 'Pekerjaan Kusen, Pintu, dan Kaca', start: 148, duration: 10, dependencies: [11] },
    { id: 13, name: 'Pekerjaan Finishing', start: 136, duration: 18, dependencies: [10] },
    { id: 14, name: 'Pekerjaan Beanspot', start: 154, duration: 8, dependencies: [13] },
    { id: 15, name: 'Pekerjaan Tambahan', start: 162, duration: 12, dependencies: [13] },
    { id: 16, name: 'Pekerjaan SBO', start: 174, duration: 10, dependencies: [14, 15] },
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

        // Mapping data API ke format project
        projects = apiData.map(item => {
            const rawLabel = item.label || "";
            
            // Tentukan jenis pekerjaan
            let workType = 'Sipil';
            if (rawLabel.toUpperCase().includes('(ME)')) {
                workType = 'ME';
            }

            // Parse nama toko & project
            const parts = rawLabel.split(' - ');
            let storeName = "Tidak Diketahui";
            let projectName = "Reguler";

            if (parts.length >= 3) {
                storeName = parts[parts.length - 1]; 
                projectName = parts[1].replace(/\(ME\)|\(Sipil\)/gi, '').trim();
            } else if (parts.length === 2) {
                storeName = parts[1];
            }

            return {
                ulok: item.value,
                name: projectName,
                store: storeName,
                work: workType,
                contractor: "Belum Ditentukan", // Default
                startDate: new Date().toISOString().split('T')[0],
                durasi: null
            };
        });

        console.log("✅ Projects loaded:", projects.length);
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
        // Setup template task berdasarkan work type
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

// ==================== CHANGE ULOK (SELECT PROJECT) ====================
async function changeUlok() {
    const ulokSelect = document.getElementById('ulokSelect');
    const selectedUlok = ulokSelect.value;
    
    if (!selectedUlok) {
        showSelectProjectMessage();
        return;
    }
    
    currentProject = projects.find(p => p.ulok === selectedUlok);
    
    // Fetch detail dari backend
    await fetchProjectDetail(selectedUlok);
    
    currentTasks = projectTasks[selectedUlok];
    
    // Update task select dropdown
    const taskSelect = document.getElementById('taskSelect');
    taskSelect.innerHTML = '<option value="">-- Pilih Tahap --</option>';
    currentTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.name;
        taskSelect.appendChild(option);
    });
    
    renderProjectInfo();
    renderChart();
    updateStats();
    document.getElementById('exportButtons').style.display = 'flex';
}

// ==================== FETCH PROJECT DETAIL ====================
async function fetchProjectDetail(ulok) {
    try {
        console.log("🔍 Attempting to fetch detail for:", ulok);
        
        // SOLUSI: Karena endpoint detail tidak ada (404), 
        // kita coba beberapa alternatif endpoint yang mungkin ada
        
        const possibleEndpoints = [
            `${API_BASE_URL}/spk/${ulok}`,
            `${API_BASE_URL}/spk_detail?ulok=${ulok}`,
            `${API_BASE_URL}/gantt/${ulok}`,
        ];
        
        let detailFound = false;
        
        for (const endpoint of possibleEndpoints) {
            try {
                console.log("🔍 Trying endpoint:", endpoint);
                const response = await fetch(endpoint);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log("✅ Success with endpoint:", endpoint);
                    console.log("📦 Data received:", data);
                    
                    // Process data jika format sesuai
                    if (data && (data.spk || data.data || data.Nama_Kontraktor)) {
                        const spk = data.spk || data.data || data;
                        
                        currentProject.name = spk.Proyek || spk.nama_proyek || currentProject.name;
                        currentProject.store = spk.Nama_Toko || spk.nama_toko || currentProject.store;
                        currentProject.contractor = spk['Nama Kontraktor'] || spk.nama_kontraktor || spk.kontraktor || "Belum Ditentukan";
                        currentProject.startDate = spk['Waktu Mulai'] || spk.waktu_mulai || spk.start_date || currentProject.startDate;
                        currentProject.durasi = spk.Durasi || spk.durasi || null;
                        currentProject.alamat = spk.Alamat || spk.alamat || "";
                        currentProject.status = spk.Status || spk.status || "";
                        
                        console.log("✅ Project updated:", currentProject);
                        detailFound = true;
                        break;
                    }
                }
            } catch (err) {
                console.log("❌ Endpoint failed:", endpoint, err.message);
            }
        }
        
        if (!detailFound) {
            console.warn("⚠️ No detail endpoint available, using default data");
            console.log("💡 Tip: Pastikan backend memiliki endpoint untuk detail SPK");
        }
        
    } catch (error) {
        console.error("❌ Error in fetchProjectDetail:", error);
    }
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

    info.innerHTML = `
        <div class="project-detail">
            <div class="project-label">No. Ulok</div>
            <div class="project-value">${currentProject.ulok}</div>
        </div>
        <div class="project-detail">
            <div class="project-label">Nama Proyek</div>
            <div class="project-value">${currentProject.name}</div>
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
        ${currentProject.durasi ? `
        <div class="project-detail">
            <div class="project-label">Durasi</div>
            <div class="project-value">${currentProject.durasi} hari</div>
        </div>
        <div class="project-detail">
            <div class="project-label">Target Selesai</div>
            <div class="project-value">${tglSelesai}</div>
        </div>
        ` : ''}
    `;
}

function renderChart() {
    if (!currentProject) return;
    
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
    
    const originalTemplate = currentProject.work === 'ME' ? taskTemplateME : taskTemplateSipil;
    
    currentTasks.forEach(task => {
        const taskRealStart = new Date(projectStartDate);
        taskRealStart.setDate(projectStartDate.getDate() + (task.start - 1));
        
        const taskRealEnd = new Date(taskRealStart);
        taskRealEnd.setDate(taskRealStart.getDate() + task.duration);

        const leftPos = (task.start - 1) * DAY_WIDTH;
        const widthPos = task.duration * DAY_WIDTH;
        
        const originalTask = originalTemplate.find(t => t.id === task.id);
        const isDelayed = originalTask ? task.start > originalTask.start : false;
        
        let barClass = isDelayed ? 'delayed' : 'on-time';
        
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
function applyDelay() {
    if (!currentProject) {
        alert('Pilih No. Ulok terlebih dahulu!');
        return;
    }
    
    const taskId = document.getElementById('taskSelect').value;
    const delayDays = parseInt(document.getElementById('delayInput').value) || 0;
    
    if (!taskId) {
        alert('Pilih tahap terlebih dahulu!');
        return;
    }
    
    const taskIndex = currentTasks.findIndex(t => t.id == taskId);
    if (taskIndex === -1) return;
    
    currentTasks[taskIndex].start += delayDays;
    
    function updateDependentTasks(taskId, delay) {
        currentTasks.forEach(task => {
            if (task.dependencies.includes(parseInt(taskId))) {
                task.start += delay;
                updateDependentTasks(task.id, delay);
            }
        });
    }
    
    updateDependentTasks(taskId, delayDays);
    renderChart();
    updateStats();
}

function resetChart() {
    if (!currentProject) return;
    
    if (currentProject.work === 'ME') {
        projectTasks[currentProject.ulok] = JSON.parse(JSON.stringify(taskTemplateME));
    } else {
        projectTasks[currentProject.ulok] = JSON.parse(JSON.stringify(taskTemplateSipil));
    }
    
    currentTasks = projectTasks[currentProject.ulok];
    document.getElementById('delayInput').value = 0;
    document.getElementById('taskSelect').value = '';
    renderChart();
    updateStats();
}

function updateStats() {
    if (!currentProject) return;
    
    const originalTemplate = currentProject.work === 'ME' ? taskTemplateME : taskTemplateSipil;
    
    let totalDelay = 0;
    let delayedTasks = 0;
    
    currentTasks.forEach((task) => {
        const originalTask = originalTemplate.find(t => t.id === task.id);
        if (originalTask) {
            const delay = task.start - originalTask.start;
            if (delay > 0) {
                totalDelay += delay;
                delayedTasks++;
            }
        }
    });
    
    const maxEnd = Math.max(...currentTasks.map(t => t.start + t.duration));
    
    const stats = document.getElementById('stats');
    stats.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${currentTasks.length}</div>
            <div class="stat-label">Total Tahapan</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${delayedTasks}</div>
            <div class="stat-label">Tahap Terlambat</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${totalDelay}</div>
            <div class="stat-label">Total Keterlambatan (hari)</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${maxEnd}</div>
            <div class="stat-label">Estimasi Selesai (hari)</div>
        </div>
    `;
}

// ==================== EXPORT FUNCTIONS ====================
function exportToExcel() {
    if (!currentProject) return;
    const startDate = new Date(currentProject.startDate);
    
    const data = [
        ["Laporan Jadwal Proyek"],
        ["No. Ulok", currentProject.ulok],
        ["Nama Proyek", currentProject.name],
        ["Lokasi", currentProject.store],
        ["Pekerjaan", currentProject.work],
        ["Kontraktor", currentProject.contractor],
        ["Tanggal Mulai", formatDateID(startDate)],
        [],
        ["No", "Tahapan", "Mulai", "Selesai", "Durasi", "Status"]
    ];

    currentTasks.forEach((task, i) => {
        const tStart = new Date(startDate);
        tStart.setDate(startDate.getDate() + (task.start - 1));
        const tEnd = new Date(tStart);
        tEnd.setDate(tStart.getDate() + task.duration);
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
    if (currentProject) {
        drawDependencyLines();
    }
});

// ==================== START APPLICATION ====================
loadDataAndInit();