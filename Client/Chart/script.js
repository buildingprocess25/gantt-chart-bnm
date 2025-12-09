const APPS_SCRIPT_POST_URL = "https://script.google.com/macros/s/AKfycbzPubDTa7E2gT5HeVLv9edAcn1xaTiT3J4BtAVYqaqiFAvFtp1qovTXpqpm-VuNOxQJ/exec";
const PYTHON_API_BASE_URL = "https://gantt-chart-bnm.onrender.com/api/spk_data";

// Hapus baris "let const= [];" (ini syntax error di file asli Anda)
let projects = []; // Kita kosongkan dulu, nanti diisi via API

let currentProject = null;
let projectTasks = {};

// Template tahapan untuk pekerjaan ME (Mechanical & Electrical)
const taskTemplateME = [
    { id: 1, name: 'Instalasi', start: 1, duration: 10, dependencies: [] },
    { id: 2, name: 'Fixture', start: 8, duration: 15, dependencies: [1] },
    { id: 3, name: 'Pekerjaan Tambahan', start: 20, duration: 5, dependencies: [1] },
    { id: 4, name: 'Pekerjaan SBO', start: 25, duration: 12, dependencies: [2, 3] },
];

// Template tahapan untuk pekerjaan Sipil (Civil Construction)
const taskTemplateSipil = [
    { id: 1, name: 'Pekerjaan Persiapan', start: 1, duration: 7, dependencies: [] },
    { id: 2, name: 'Pekerjaan Bobokan/Bongkaran', start: 8, duration: 12, dependencies: [1] },
    { id: 3, name: 'Pekerjaan Tanah', start: 15, duration: 20, dependencies: [2] },
    { id: 4, name: 'Pekerjaan Pondasi & Beton', start: 35, duration: 8, dependencies: [3] },
    { id: 5, name: 'Pekerjaan Pasangan', start: 43, duration: 10, dependencies: [4] },
    { id: 6, name: 'Pekerjaan Besi', start: 53, duration: 20, dependencies: [5] },
    { id: 7, name: 'Pekerjaan Keramik', start: 73, duration: 8, dependencies: [6] },
    { id: 8, name: 'Pekerjaan Plumbing ', start: 81, duration: 25, dependencies: [7] },
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

// --- FUNGSI FORMAT TANGGAL ---
function formatDateID(date) {
    const options = { day: 'numeric', month: 'short', year: '2-digit' };
    return date.toLocaleDateString('id-ID', options);
}

// --- FUNGSI FETCH DATA DARI API ---
async function loadDataAndInit() {
    try {
        const response = await fetch(PYTHON_API_BASE_URL);
        if (!response.ok) throw new Error("Gagal mengambil data API");
        
        const apiData = await response.json();

        // Mapping Data API ke Format Project kita
        // API Format: { label: "ULOK - NAMA (TYPE) - TOKO", value: "ULOK" }
        projects = apiData.map(item => {
            const rawLabel = item.label || "";
            
            // 1. Tentukan Jenis Pekerjaan (Detect string ME atau Sipil)
            let workType = 'Sipil'; // Default
            if (rawLabel.toUpperCase().includes('(ME)')) {
                workType = 'ME';
            }

            // 2. Parsing Nama Toko & Nama Project dari Label
            // Asumsi format label: "KODE - NAMA PROYEK (JENIS) - NAMA TOKO"
            // Kita split berdasarkan " - "
            const parts = rawLabel.split(' - ');
            
            let storeName = "Tidak Diketahui";
            let projectName = "Reguler"; // Default

            if (parts.length >= 3) {
                // Ambil bagian paling belakang sebagai Toko
                storeName = parts[parts.length - 1]; 
                // Ambil bagian tengah sebagai nama project
                projectName = parts[1].replace(/\(ME\)|\(Sipil\)/gi, '').trim();
            } else if (parts.length === 2) {
                storeName = parts[1];
            }

            // 3. Tentukan Start Date
            // KARENA API TIDAK ADA START DATE, KITA PAKAI HARI INI
            // Format YYYY-MM-DD
            const today = new Date().toISOString().split('T')[0];

            return {
                ulok: item.value,
                name: projectName,
                store: storeName,
                work: workType,
                contractor: "-", // Data tidak tersedia di API
                startDate: today // Data tidak tersedia di API, default hari ini
            };
        });

        // Setelah data siap, jalankan initChart
        initChart();

    } catch (error) {
        console.error("Error loading data:", error);
        alert("Gagal memuat data proyek dari server.");
        // Fallback jika error, array projects tetap kosong atau pakai dummy
    }
}

function initChart() {
    // Populate dropdown & Setup Tasks
    const ulokSelect = document.getElementById('ulokSelect');
    ulokSelect.innerHTML = '<option value="">-- Pilih Proyek --</option>'; // Reset opsi

    projects.forEach(project => {
        // Setup template task berdasarkan work type
        if (project.work === 'ME') {
            projectTasks[project.ulok] = JSON.parse(JSON.stringify(taskTemplateME));
        } else {
            // Default ke Sipil jika bukan ME
            projectTasks[project.ulok] = JSON.parse(JSON.stringify(taskTemplateSipil));
        }

        // Tambahkan ke Dropdown
        const option = document.createElement('option');
        option.value = project.ulok;
        // Tampilkan Label yang lebih informatif di dropdown
        option.textContent = `${project.ulok} | ${project.store} (${project.work})`;
        ulokSelect.appendChild(option);
    });
    
    showSelectProjectMessage();
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

function changeUlok() {
    const ulokSelect = document.getElementById('ulokSelect');
    const selectedUlok = ulokSelect.value;
    
    if (!selectedUlok) {
        showSelectProjectMessage();
        return;
    }
    
    currentProject = projects.find(p => p.ulok === selectedUlok);
    currentTasks = projectTasks[selectedUlok];
    
    // Update task select dropdown (Untuk fitur delay)
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

function renderProjectInfo() {
    if (!currentProject) return;
    
    const info = document.getElementById('projectInfo');
    
    // Format tanggal agar enak dibaca
    const tglMulai = currentProject.startDate 
        ? formatDateID(new Date(currentProject.startDate)) 
        : '-';

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
            <div class="project-value" style="color: white;">${currentProject.work}</div>
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
    const projectStartDate = currentProject.startDate ? new Date(currentProject.startDate) : new Date();

    // --- RENDER HEADER ---
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
    
    // --- RENDER BODY (TASKS) ---
    html += '<div class="chart-body">';
    
    const originalTemplate = currentProject.work === 'ME' ? taskTemplateME : taskTemplateSipil;
    
    currentTasks.forEach(task => {
        const taskRealStart = new Date(projectStartDate);
        taskRealStart.setDate(projectStartDate.getDate() + (task.start - 1));
        
        const taskRealEnd = new Date(taskRealStart);
        taskRealEnd.setDate(taskRealStart.getDate() + task.duration);

        const leftPos = (task.start - 1) * DAY_WIDTH; 
        const widthPos = task.duration * DAY_WIDTH;
        
        // Cek originalTask dengan aman (optional chaining)
        const originalTask = originalTemplate.find(t => t.id === task.id);
        const isDelayed = originalTask ? task.start > originalTask.start : false;
        
        // Logika Status (bisa dikembangkan jika ada API progress)
        let barClass = 'on-time';
        if (isDelayed) barClass = 'delayed';
        
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
    // Set width sesuai scrollWidth agar garis bisa digambar sepanjang konten
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
                    
                    // Hitung koordinat relatif terhadap chartBody (termasuk scroll)
                    const x1 = (fromRect.right - bodyRect.left) + chartBody.scrollLeft;
                    const y1 = (fromRect.top + fromRect.height / 2 - bodyRect.top) + chartBody.scrollTop;
                    
                    const x2 = (toRect.left - bodyRect.left) + chartBody.scrollLeft;
                    const y2 = (toRect.top + toRect.height / 2 - bodyRect.top) + chartBody.scrollTop;
                    
                    const deltaX = x2 - x1;
                    const curveAmount = Math.max(Math.abs(deltaX / 2), 40);
                    
                    const d = `
                        M ${x1} ${y1} 
                        C ${x1 + curveAmount} ${y1}, 
                        ${x2 - curveAmount} ${y2}, 
                        ${x2} ${y2}
                    `;

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

window.addEventListener('resize', () => {
    if (currentProject) {
        drawDependencyLines();
    }
});

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

// --- FUNGSI EXPORT PDF & EXCEL (DISEDERHANAKAN AGAR MUAT) ---
async function exportToPDF() {
    if (!currentProject) { alert("Pilih proyek!"); return; }

    const printArea = document.createElement('div');
    printArea.id = "pdf-export-area";
    Object.assign(printArea.style, {
        position: 'absolute', top: '0', left: '0', width: '1200px',
        padding: '40px', backgroundColor: '#ffffff', zIndex: '9999', fontFamily: 'Arial'
    });

    const startDate = currentProject.startDate ? formatDateID(new Date(currentProject.startDate)) : '-';
    printArea.innerHTML = `
        <div style="margin-bottom: 30px;">
            <h2 style="text-align: center;">JADWAL PELAKSANAAN PROYEK</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="width: 150px;"><b>No. Ulok</b></td><td>: ${currentProject.ulok}</td></tr>
                <tr><td><b>Toko</b></td><td>: ${currentProject.store}</td></tr>
                <tr><td><b>Pekerjaan</b></td><td>: ${currentProject.work}</td></tr>
                <tr><td><b>Tgl Mulai</b></td><td>: ${startDate}</td></tr>
            </table>
            <hr>
        </div>
    `;

    const chartClone = document.getElementById('ganttChart').cloneNode(true);
    chartClone.style.overflow = 'visible';
    printArea.appendChild(chartClone);
    document.body.appendChild(printArea);

    try {
        const canvas = await html2canvas(printArea, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const finalHeight = imgProps.height * (pdfWidth / imgProps.width);
        
        pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, finalHeight);
        pdf.save(`Schedule_${currentProject.ulok}.pdf`);
    } catch (err) {
        console.error(err);
        alert("Gagal PDF");
    } finally {
        document.body.removeChild(printArea);
    }
}

function exportToExcel() {
    if (!currentProject) return;
    const startDate = currentProject.startDate ? new Date(currentProject.startDate) : new Date();
    
    const data = [
        ["Laporan Jadwal Proyek"],
        ["No. Ulok", currentProject.ulok],
        ["Lokasi", currentProject.store],
        ["Pekerjaan", currentProject.work],
        [],
        ["No", "Tahapan", "Mulai", "Selesai", "Durasi", "Status"]
    ];

    currentTasks.forEach((task, i) => {
        const tStart = new Date(startDate); tStart.setDate(startDate.getDate() + (task.start - 1));
        const tEnd = new Date(tStart); tEnd.setDate(tStart.getDate() + task.duration);
        data.push([ i + 1, task.name, formatDateID(tStart), formatDateID(tEnd), task.duration, "Berjalan" ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal");
    XLSX.writeFile(wb, `Jadwal_${currentProject.ulok}.xlsx`);
}

// START DISINI
// Panggil fungsi loadDataAndInit alih-alih langsung initChart
loadDataAndInit();