const APPS_SCRIPT_POST_URL = "https://script.google.com/macros/s/AKfycbzPubDTa7E2gT5HeVLv9edAcn1xaTiT3J4BtAVYqaqiFAvFtp1qovTXpqpm-VuNOxQJ/exec";

const PYTHON_API_LOGIN_URL = "https://gantt-chart-bnm.onrender.com";

const projects = [
    {
        ulok: 'Z001-2024-0001',
        name: 'Reguler',
        store: 'Toko XYZ',
        work: 'ME',
        contractor: 'PT. Bangun Jaya',
        startDate: '2024-01-01' // Tambahkan Tanggal Mulai (Format: YYYY-MM-DD)
    },
    {
        ulok: 'Z001-2024-0002',
        name: 'Reguler',
        store: 'Toko ABC',
        work: 'ME',
        contractor: 'CV. Karya Mandiri',
        startDate: '2024-02-15'
    },
    {
        ulok: 'Z001-2024-0003',
        name: 'Reguler',
        store: 'Toko EFG',
        work: 'ME',
        contractor: 'PT. Mitra Konstruksi',
        startDate: '2024-03-01'
    },
    {
        ulok: 'Z001-2024-0004',
        name: 'Reguler',
        store: 'Toko LMN',
        work: 'Sipil',
        contractor: 'CV. Berkah Abadi',
        startDate: '2024-01-10'
    },
    {
        ulok: 'Z001-2024-0005',
        name: 'Renovasi',
        store: 'Toko OPQ',
        work: 'Sipil',
        contractor: 'PT. Prima Karya',
        startDate: '2024-04-01'
    }
];

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
const monthsCountME = 4;
const monthsCountSipil = 7;

function formatDateID(date) {
    const options = { day: 'numeric', month: 'short', year: '2-digit' };
    return date.toLocaleDateString('id-ID', options);
}

function initChart() {
    // Initialize tasks for each project based on work type
    projects.forEach(project => {
        if (project.work === 'ME') {
            projectTasks[project.ulok] = JSON.parse(JSON.stringify(taskTemplateME));
        } else if (project.work === 'Sipil') {
            projectTasks[project.ulok] = JSON.parse(JSON.stringify(taskTemplateSipil));
        }
    });
    
    // Populate Ulok dropdown
    const ulokSelect = document.getElementById('ulokSelect');
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.ulok;
        option.textContent = `${project.ulok} - ${project.name} (${project.work})`;
        ulokSelect.appendChild(option);
    });
    
    // Show message to select project
    showSelectProjectMessage();
}

function showSelectProjectMessage() {
    const chart = document.getElementById('ganttChart');
    chart.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #6c757d;">
            <h2 style="margin-bottom: 15px;">📋 Pilih No. Ulok untuk Melihat Gantt Chart</h2>
            <p>Silakan pilih nomor ulok dari dropdown di atas untuk melihat detail proyek pembangunan</p>
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
    
    // Update task select dropdown
    const taskSelect = document.getElementById('taskSelect');
    taskSelect.innerHTML = '<option value="">--/--</option>';
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
            <div class="project-value">${currentProject.startDate || '-'}</div>
        </div>
    `;
}

function renderChart() {
    if (!currentProject) return;
    
    const chart = document.getElementById('ganttChart');
    const DAY_WIDTH = 40; // Lebar satu kolom hari dalam Pixel (bisa diubah)
    
    // 1. CARI HARI TERAKHIR
    let maxTaskEndDay = 0;
    currentTasks.forEach(task => {
        const end = task.start + task.duration;
        if (end > maxTaskEndDay) maxTaskEndDay = end;
    });

    // Tambahkan buffer hari agar chart tidak terlalu pas di kanan
    const totalDaysToRender = Math.max(
        (currentProject.work === 'ME' ? totalDaysME : totalDaysSipil), 
        maxTaskEndDay + 10
    );

    // Hitung total lebar chart dalam pixel
    const totalChartWidth = totalDaysToRender * DAY_WIDTH;

    // Ambil start date proyek
    const projectStartDate = currentProject.startDate ? new Date(currentProject.startDate) : new Date();

    // --- RENDER HEADER ---
    let html = '<div class="chart-header">';
    
    // Kolom Kiri (Nama Tahapan) - Fixed Width
    html += '<div class="task-column">Tahapan</div>';
    
    // Kolom Kanan (Timeline Header)
    html += `<div class="timeline-column" style="width: ${totalChartWidth}px;">`;
    
    // Loop untuk membuat Header per Tanggal
    for (let i = 0; i < totalDaysToRender; i++) {
        const currentDate = new Date(projectStartDate);
        currentDate.setDate(projectStartDate.getDate() + i);

        const dateNum = currentDate.getDate();
        const monthName = currentDate.toLocaleDateString('id-ID', { month: 'short' });
        
        // Warna background beda untuk hari Minggu (opsional, index 0 = Minggu)
        const isSunday = currentDate.getDay() === 0;
        const bgStyle = isSunday ? 'background-color: #ffe3e3;' : '';

        html += `
            <div class="day-header" style="width: ${DAY_WIDTH}px; ${bgStyle}">
                <span class="d-date">${dateNum}</span>
                <span class="d-month">${monthName}</span>
            </div>
        `;
    }
    html += '</div></div>'; // Tutup timeline-column & chart-header
    
    // --- RENDER BODY (TASKS) ---
    html += '<div class="chart-body">';
    
    const originalTemplate = currentProject.work === 'ME' ? taskTemplateME : taskTemplateSipil;
    
    currentTasks.forEach(task => {
        // Hitung Tanggal Real
        const taskRealStart = new Date(projectStartDate);
        taskRealStart.setDate(projectStartDate.getDate() + (task.start - 1));
        
        const taskRealEnd = new Date(taskRealStart);
        taskRealEnd.setDate(taskRealStart.getDate() + task.duration);

        // --- LOGIKA BARU (PIXEL BASE) ---
        // start - 1 karena hari ke-1 dimulai di pixel 0
        const leftPos = (task.start - 1) * DAY_WIDTH; 
        const widthPos = task.duration * DAY_WIDTH;
        
        const originalTask = originalTemplate.find(t => t.id === task.id);
        const isDelayed = task.start > originalTask.start;
        const isCompleted = task.progress === 100; // Asumsi ada field progress
        
        let barClass = 'on-time';
        if (isCompleted) barClass = 'completed';
        else if (isDelayed) barClass = 'delayed';
        
        const tooltipText = `${task.name}\n${formatDateID(taskRealStart)} s/d ${formatDateID(taskRealEnd)}\n(${task.duration} hari)`;

        html += '<div class="task-row">';
        
        // Kolom Nama Task
        html += `<div class="task-name">
            <span>${task.name}</span>
            <span class="task-duration">Durasi: ${task.duration} hari</span>
        </div>`;
        
        // Kolom Timeline Bar
        html += `<div class="timeline" style="width: ${totalChartWidth}px;">`;
    
        // Render Bar
        html += `<div class="bar ${barClass}" data-task-id="${task.id}" 
                style="left: ${leftPos}px; width: ${widthPos}px;" 
                title="${tooltipText}">
            ${task.duration}h
        </div>`;
        
        html += '</div></div>'; // Tutup timeline & task-row
    });
    
    html += '</div>'; // Tutup chart-body
    
    chart.innerHTML = html;
    
    // // Sinkronisasi Scroll Header dan Body
    // // Saat body discroll ke samping, header harus ikut geser
    // const chartBody = chart.querySelector('.chart-body');
    // const timelineColumn = chart.querySelector('.timeline-column');
    
    // chartBody.addEventListener('scroll', function() {
    //     timelineColumn.style.transform = `translateX(-${this.scrollLeft}px)`;
    // });
    
    setTimeout(() => drawDependencyLines(), 100);
}

function drawDependencyLines() {
    const existingSvg = document.querySelector('.dependency-svg');
    if (existingSvg) existingSvg.remove();
    
    const scrollContainer = document.querySelector('.chart-wrapper');
    const chartBody = document.querySelector('.chart-body');
    if (!chartBody) return;

    // Gunakan scrollWidth dan scrollHeight untuk mencakup area yang tersembunyi scroll
    const fullWidth = chartBody.scrollWidth; 
    const fullHeight = chartBody.scrollHeight;
    
    // Container untuk koordinat referensi
    // Kita perlu offset scroll karena getBoundingClientRect terpengaruh scroll viewport
    const chartRect = chartBody.getBoundingClientRect();
    const scrollLeft = scrollContainer.scrollLeft;
    const scrollTop = scrollContainer.scrollTop;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('dependency-svg');
    
    // Style SVG agar menutupi seluruh area SCROLLABLE
    Object.assign(svg.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: `${fullWidth}px`,
        height: `${fullHeight}px`,
        pointerEvents: 'none',
        zIndex: '5'
    });
    
    chartBody.appendChild(svg);
    
    currentTasks.forEach(task => {
        if (task.dependencies && task.dependencies.length > 0) {
            task.dependencies.forEach(depId => {
                const fromBar = document.querySelector(`.bar[data-task-id="${depId}"]`);
                const toBar = document.querySelector(`.bar[data-task-id="${task.id}"]`);
                
                if (!fromBar || !toBar) return;
                
                // Hitung posisi relatif terhadap chartBody (termasuk kompensasi scroll)
                const fromRect = fromBar.getBoundingClientRect();
                const toRect = toBar.getBoundingClientRect();
                
                // Koordinat X: (Posisi di layar - Posisi Container di layar) + Jumlah Scroll Container
                const x1 = (fromRect.right - chartRect.left) + scrollLeft;
                const y1 = (fromRect.top + fromRect.height / 2 - chartRect.top) + scrollTop;
                
                const x2 = (toRect.left - chartRect.left) + scrollLeft;
                const y2 = (toRect.top + toRect.height / 2 - chartRect.top) + scrollTop;
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                
                // Kurva Bezier
                const dx = x2 - x1;
                const controlPointOffset = Math.max(Math.abs(dx) * 0.5, 40);
                
                const d = `M ${x1} ${y1} C ${x1 + controlPointOffset} ${y1}, ${x2 - controlPointOffset} ${y2}, ${x2} ${y2}`;
                
                path.setAttribute('d', d);
                path.setAttribute('stroke', '#667eea');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                path.setAttribute('opacity', '0.6');
                svg.appendChild(path);
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
    } else if (currentProject.work === 'Sipil') {
        projectTasks[currentProject.ulok] = JSON.parse(JSON.stringify(taskTemplateSipil));
    }
    
    currentTasks = projectTasks[currentProject.ulok];
    document.getElementById('delayInput').value = 0;
    document.getElementById('taskSelect').value = '';
    renderChart();
    updateStats();
}

// Re-draw lines on window resize
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
        const delay = task.start - originalTask.start;
        if (delay > 0) {
            totalDelay += delay;
            delayedTasks++;
        }
    });
    
    const maxEnd = Math.max(...currentTasks.map(t => t.start + t.duration));
    const originalEnd = Math.max(...originalTemplate.map(t => t.start + t.duration));
    
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

async function exportToPDF() {
    if (!currentProject) {
        alert("Pilih proyek terlebih dahulu!");
        return;
    }

    // 1. Buat Container Sementara (Canvas Area)
    // Area ini akan kita susun rapi khusus untuk diprint/pdf
    const printArea = document.createElement('div');
    printArea.id = "pdf-export-area";
    
    // Style agar area ini memiliki latar putih bersih dan lebar yang cukup untuk chart
    Object.assign(printArea.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '1200px', // Lebar fix agar chart tidak terpotong
        padding: '40px',
        backgroundColor: '#ffffff',
        zIndex: '9999', // Pastikan di paling atas
        fontFamily: 'Arial, sans-serif'
    });

    // 2. Siapkan Data Header (Sesuai Request: "Label : Value")
    const startDate = currentProject.startDate ? formatDateID(new Date(currentProject.startDate)) : '-';
    
    const headerHTML = `
        <div style="margin-bottom: 30px;">
            <h2 style="text-align: center; margin-bottom: 20px; color: #333;">JADWAL PELAKSANAAN PROYEK</h2>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                    <td style="width: 180px; font-weight: bold; padding: 5px;">No. Ulok</td>
                    <td style="padding: 5px;">: ${currentProject.ulok}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 5px;">Nama Proyek</td>
                    <td style="padding: 5px;">: ${currentProject.name}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 5px;">Nama Toko</td>
                    <td style="padding: 5px;">: ${currentProject.store}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 5px;">Pekerjaan</td>
                    <td style="padding: 5px;">: ${currentProject.work}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 5px;">Kontraktor</td>
                    <td style="padding: 5px;">: ${currentProject.contractor}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 5px;">Tanggal Mulai</td>
                    <td style="padding: 5px;">: ${startDate}</td>
                </tr>
            </table>
            <hr style="margin-top: 20px; border: 0; border-top: 2px solid #333;">
        </div>
    `;

    // Masukkan Header ke area print
    printArea.innerHTML = headerHTML;

    // 3. Ambil Chart Asli dan Clone (Duplikat) ke area print
    const originalChart = document.getElementById('ganttChart');
    const chartClone = originalChart.cloneNode(true);
    
    // Pastikan clone chart terlihat rapi (reset overflow jika ada scroll di web asli)
    chartClone.style.overflow = 'visible';
    chartClone.style.maxHeight = 'none';
    
    printArea.appendChild(chartClone);
    document.body.appendChild(printArea);

    try {
        // 4. Proses html2canvas pada area khusus tersebut
        const canvas = await html2canvas(printArea, {
            scale: 2, // Kualitas tinggi
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        
        // 5. Setup jsPDF (Landscape)
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Hitung rasio agar muat di A4 Landscape
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = pdfWidth / imgProps.width;
        const finalHeight = imgProps.height * ratio;

        // Jika chart sangat panjang ke bawah, potong jadi beberapa halaman (opsional)
        // Untuk sekarang kita fit to width saja:
        pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, finalHeight);
        
        pdf.save(`Schedule_${currentProject.ulok}.pdf`);

    } catch (err) {
        console.error("Error PDF:", err);
        alert("Gagal membuat PDF.");
    } finally {
        // 6. Hapus area sementara agar tampilan web kembali normal
        document.body.removeChild(printArea);
    }
}

function exportToExcel() {
    if (!currentProject || !currentTasks) {
        alert("Tidak ada data proyek untuk diexport.");
        return;
    }

    // 1. Siapkan Header Excel
    const data = [
        ["Laporan Jadwal Proyek"],
        ["No. Ulok", currentProject.ulok],
        ["Nama Proyek", currentProject.name],
        ["Lokasi", currentProject.store],
        ["Kontraktor", currentProject.contractor],
        ["Tanggal Mulai Proyek", formatDateID(new Date(currentProject.startDate || new Date()))],
        [], // Baris kosong
        ["No", "Tahapan Pekerjaan", "Tanggal Mulai", "Tanggal Selesai", "Durasi (Hari)", "Status"] // Header Tabel
    ];

    // 2. Tentukan Tanggal Dasar
    const projectStartDate = currentProject.startDate ? new Date(currentProject.startDate) : new Date();

    // 3. Loop data task untuk mengisi baris
    currentTasks.forEach((task, index) => {
        // Hitung Tanggal Mulai Task
        const taskStart = new Date(projectStartDate);
        taskStart.setDate(projectStartDate.getDate() + (task.start - 1));

        // Hitung Tanggal Selesai Task
        const taskEnd = new Date(taskStart);
        taskEnd.setDate(taskStart.getDate() + task.duration);

        // Cek Status
        const isCompleted = task.progress === 100;
        let status = "Berjalan";
        if (isCompleted) status = "Selesai";
        // Logika delay sederhana (bisa disesuaikan dengan logika chart Anda)
        // Disini kita ambil status simple saja
        
        data.push([
            index + 1,
            task.name,
            formatDateID(taskStart),
            formatDateID(taskEnd),
            task.duration,
            status
        ]);
    });

    // 4. Buat Worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Styling Lebar Kolom (Optional, agar rapi)
    ws['!cols'] = [
        { wch: 5 },  // No
        { wch: 30 }, // Tahapan
        { wch: 15 }, // Tgl Mulai
        { wch: 15 }, // Tgl Selesai
        { wch: 12 }, // Durasi
        { wch: 15 }  // Status
    ];

    // 5. Buat Workbook dan Download
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal Proyek");
    XLSX.writeFile(wb, `Jadwal_${currentProject.ulok}.xlsx`);
}

        initChart();