const LOCATIONS = ['dows-lake', 'fifth-avenue', 'nac'];
const REFRESH_INTERVAL = 30000; // 30 seconds

let iceChart, tempChart;

// Initialize Chart.js charts
function initCharts() {
    const chartConfig = (label, color) => ({
        type: 'line',
        data: {
            labels: [],
            datasets: LOCATIONS.map((loc, i) => ({
                label: loc,
                data: [],
                borderColor: ['#1e90ff', '#ff9800', '#4caf50'][i],
                backgroundColor: ['#1e90ff22', '#ff980022', '#4caf5022'][i],
                tension: 0.4,
                fill: true
            }))
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#e0e0e0' } } },
            scales: {
                x: { ticks: { color: '#90caf9' }, grid: { color: '#2a3f55' } },
                y: { ticks: { color: '#90caf9' }, grid: { color: '#2a3f55' } }
            }
        }
    });

    iceChart = new Chart(document.getElementById('iceChart'), chartConfig('Ice Thickness'));
    tempChart = new Chart(document.getElementById('tempChart'), chartConfig('Surface Temp'));
}

// Fetch and display latest sensor data
async function fetchSensorData() {
    try {
        const response = await fetch('/api/sensors');
        const result = await response.json();

        if (!result.success || result.data.length === 0) {
            console.log('No data yet — waiting for Stream Analytics window to complete');
            return;
        }

        const statuses = [];

        result.data.forEach(sensor => {
            const loc = sensor.location;
            const status = sensor.safetyStatus;
            statuses.push(status);

            // Update card
            const card = document.getElementById(`card-${loc}`);
            if (card) card.classList.remove('loading');

            setBadge(`badge-${loc}`, status);
            setText(`ice-${loc}`, `${sensor.avgIceThickness?.toFixed(1)} cm`);
            setText(`temp-${loc}`, `${sensor.avgSurfaceTemperature?.toFixed(1)} °C`);
            setText(`snow-${loc}`, `${sensor.maxSnowAccumulation?.toFixed(1)} cm`);
            setText(`ext-${loc}`, `${sensor.avgExternalTemperature?.toFixed(1)} °C`);
            setText(`count-${loc}`, sensor.readingCount);
        });

        // Overall system status — worst case wins
        const overallStatus = statuses.includes('Unsafe') ? 'Unsafe'
            : statuses.includes('Caution') ? 'Caution' : 'Safe';
        setBadge('overall-status', overallStatus);

        document.getElementById('last-updated').textContent =
            `Last updated: ${new Date().toLocaleTimeString()}`;

    } catch (err) {
        console.error('Failed to fetch sensor data:', err);
    }
}

// Fetch history and update charts
async function fetchHistory() {
    try {
        const allData = await Promise.all(
            LOCATIONS.map(loc =>
                fetch(`/api/history/${loc}`).then(r => r.json())
            )
        );

        // Build time labels from first location with data
        const firstWithData = allData.find(d => d.success && d.data.length > 0);
        if (!firstWithData) return;

        const labels = firstWithData.data.map(d =>
            new Date(d.windowEndTime).toLocaleTimeString()
        );

        // Update ice chart
        iceChart.data.labels = labels;
        allData.forEach((locData, i) => {
            iceChart.data.datasets[i].data = locData.success
                ? locData.data.map(d => d.avgIceThickness)
                : [];
        });
        iceChart.update();

        // Update temp chart
        tempChart.data.labels = labels;
        allData.forEach((locData, i) => {
            tempChart.data.datasets[i].data = locData.success
                ? locData.data.map(d => d.avgSurfaceTemperature)
                : [];
        });
        tempChart.update();

    } catch (err) {
        console.error('Failed to fetch history:', err);
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setBadge(id, status) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = status;
    el.className = el.className.replace(/Safe|Caution|Unsafe/g, '').trim();
    el.classList.add(status);
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    fetchSensorData();
    fetchHistory();
    // Auto-refresh every 30 seconds
    setInterval(() => {
        fetchSensorData();
        fetchHistory();
    }, REFRESH_INTERVAL);
});