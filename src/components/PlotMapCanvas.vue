<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { database } from '@/services/firebaseConfig';
import { ref as dbRef, get, onValue } from 'firebase/database';
import {
  manualPlotsById,
  dividerLines,
  manualLandmarks,
  normalizePlotId,
  mapWidth,
  mapHeight
} from '@/utils/manualPlotLayout';

const props = defineProps({
  selectedPlotIds: {
    type: Array,
    default: () => []
  },
  registrationOpen: {
    type: Boolean,
    default: true
  }
});

const canvasRef = ref(null);
const plots = ref({});
const landmarks = ref({});
const gardenersByPlot = ref({});
const hoveredPlot = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });
const selectedColor = '#0d47a1';
const statusColors = {
  available: '#4caf50',     // green
  reserved: '#ffc107',      // yellow (clicked but not paid)
  unavailable: '#f44336',   // red (no longer available)
  verified: '#f44336'        // red (payment confirmed, same public color)
};

const getDefaultPlots = () =>
  Object.fromEntries(
    Object.entries(manualPlotsById).map(([plotId, plot]) => [
      plotId,
      {
        ...plot,
        id: plotId,
        status: plot.type === 'special project' ? 'unavailable' : 'available',
        registeredGardenerId: null,
        paymentVerified: false
      }
    ])
  );

const buildGardenersByPlot = (gardeners = {}) => {
  const byPlot = {};

  Object.values(gardeners).forEach((gardener) => {
    const firstName = gardener?.firstName?.trim();
    if (!firstName) {
      return;
    }

    const plotIds = [
      gardener.plotId,
      ...(Array.isArray(gardener.plots) ? gardener.plots : [])
    ]
      .filter(Boolean)
      .map(normalizePlotId);

    plotIds.forEach((plotId) => {
      if (!byPlot[plotId]) {
        byPlot[plotId] = firstName;
      }
    });
  });

  return byPlot;
};

const selectedPlotIdSet = computed(() => new Set((props.selectedPlotIds || []).map(normalizePlotId)));

const getDefaultLandmarks = () =>
  Object.fromEntries(
    manualLandmarks.map((landmark) => [
      landmark.id,
      {
        ...landmark
      }
    ])
  );

const mergePlotsWithManualLayout = (firebasePlots = {}) => {
  const merged = getDefaultPlots();

  Object.entries(firebasePlots).forEach(([plotId, plotData]) => {
    const normalizedPlotId = normalizePlotId(plotId);
    const manualPlot = manualPlotsById[normalizedPlotId] || {};
    const defaultStatus = manualPlot.type === 'special project' ? 'unavailable' : 'available';

    merged[normalizedPlotId] = {
      ...manualPlot,
      ...plotData,
      id: normalizedPlotId,
      name: plotData?.name ?? manualPlot.name ?? String(Number((normalizedPlotId.match(/^plot-(\d+)$/i) || [])[1] || 0)),
      type: plotData?.type ?? manualPlot.type ?? 'regular',
      status: plotData?.status ?? defaultStatus,
      registeredGardenerId: plotData?.registeredGardenerId ?? null,
      paymentVerified: plotData?.paymentVerified === true
    };
  });

  return merged;
};

const mergeLandmarksWithManualLayout = (firebaseLandmarks = {}) => {
  const merged = getDefaultLandmarks();

  Object.entries(firebaseLandmarks).forEach(([landmarkId, landmarkData]) => {
    merged[landmarkId] = {
      ...merged[landmarkId],
      ...landmarkData
    };
  });

  return merged;
};

// Load plots from Firebase
const loadPlots = async () => {
  try {
    const plotsRef = dbRef(database, 'plots');
    const landmarksRef = dbRef(database, 'landmarks');
    const [plotsSnapshot, landmarksSnapshot] = await Promise.all([get(plotsRef), get(landmarksRef)]);

    plots.value = plotsSnapshot.exists()
      ? mergePlotsWithManualLayout(plotsSnapshot.val())
      : getDefaultPlots();
    landmarks.value = landmarksSnapshot.exists()
      ? mergeLandmarksWithManualLayout(landmarksSnapshot.val())
      : getDefaultLandmarks();
    gardenersByPlot.value = {};

    try {
      const gardenersSnapshot = await get(dbRef(database, 'gardeners'));
      gardenersByPlot.value = gardenersSnapshot.exists()
        ? buildGardenersByPlot(gardenersSnapshot.val())
        : {};
    } catch {
      gardenersByPlot.value = {};
    }

    if (!plotsSnapshot.exists()) {
      throw new Error('No plot data in Firebase');
    }

    console.log('Loaded plots from Firebase:', Object.keys(plots.value).length);
  } catch (error) {
    console.log('Firebase read failed, using manual layout:', error.message);
    plots.value = getDefaultPlots();
    landmarks.value = getDefaultLandmarks();
    console.log('Loaded plots from manual layout:', Object.keys(plots.value).length);
  }
};

// Listen for real-time updates
const setupRealtimeListener = () => {
  const plotsRef = dbRef(database, 'plots');
  onValue(plotsRef, (snapshot) => {
    if (snapshot.exists()) {
      plots.value = mergePlotsWithManualLayout(snapshot.val());
    }
  });

  const landmarksRef = dbRef(database, 'landmarks');
  onValue(landmarksRef, (snapshot) => {
    if (snapshot.exists()) {
      landmarks.value = mergeLandmarksWithManualLayout(snapshot.val());
    }
  });

  const gardenersRef = dbRef(database, 'gardeners');
  onValue(
    gardenersRef,
    (snapshot) => {
      gardenersByPlot.value = snapshot.exists() ? buildGardenersByPlot(snapshot.val()) : {};
    },
    () => {
      gardenersByPlot.value = {};
    }
  );

  // Listen for local plot registration events
  window.addEventListener('plot-registered', (e) => {
    const plotId = e.detail?.plotId;
    if (plotId && plots.value[plotId]) {
      plots.value[plotId].status = 'reserved';
      console.log('Plot marked as reserved locally:', plotId);
    }
  });
};

// Draw the canvas map
const drawMap = () => {
  const canvas = canvasRef.value;
  if (!canvas) {
    console.log('No canvas ref');
    return;
  }

  const ctx = canvas.getContext('2d');
  const scale = canvas.width / mapWidth;
  
  console.log('Drawing map with', Object.keys(plots.value).length, 'plots, scale:', scale);
  
  // Clear canvas
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#777';
  ctx.lineWidth = 2;
  dividerLines.forEach((line) => {
    ctx.beginPath();
    ctx.moveTo(24 * scale, line.y * scale);
    ctx.lineTo(line.gateStart * scale, line.y * scale);
    ctx.moveTo(line.gateEnd * scale, line.y * scale);
    ctx.lineTo((mapWidth - 24) * scale, line.y * scale);
    ctx.stroke();
  });

  Object.values(landmarks.value).forEach((landmark) => {
    const x = landmark.x * scale;
    const y = landmark.y * scale;
    const w = landmark.width * scale;
    const h = landmark.height * scale;

    ctx.fillStyle = '#b3a596';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#7b6d60';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#594d43';
    ctx.font = `${Math.min(16, w / 5)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const label = landmark.name || landmark.label || '';
    if (label.includes(' ')) {
      const parts = label.split(' ');
      ctx.fillText(parts[0], x + w / 2, y + h / 2 - 10);
      ctx.fillText(parts.slice(1).join(' '), x + w / 2, y + h / 2 + 10);
    } else {
      ctx.fillText(label, x + w / 2, y + h / 2);
    }
  });

  // Draw all plots
  Object.entries(plots.value).forEach(([plotId, plot]) => {
    if (!hasPlotGeometry(plot)) return;

    const x = plot.x * scale;
    const y = plot.y * scale;
    const w = plot.width * scale;
    const h = plot.height * scale;

    const fillColor = getPlotFillColor(plotId, plot);

    // Draw rectangle
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, w, h);

    // Draw border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Draw plot label (if space allows)
    if (w > 30 && h > 20) {
      const plotNum = String(Number((plotId.split('-')[1] || '').trim()));
      ctx.fillStyle = '#000';
      ctx.font = `${Math.min(12, w / 3)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(plotNum, x + w / 2, y + h / 2);
    }
  });

};

const isSpecialProject = (plot) => plot?.type === 'special project';
const hasPlotGeometry = (plot) =>
  plot
  && Number.isFinite(Number(plot.x))
  && Number.isFinite(Number(plot.y))
  && Number.isFinite(Number(plot.width))
  && Number.isFinite(Number(plot.height));

const getPlotFillColor = (plotId, plot) => {
  if (!plot) {
    return statusColors.available;
  }

  if (props.registrationOpen && selectedPlotIdSet.value.has(plotId) && plot.status === 'available' && !isSpecialProject(plot)) {
    return selectedColor;
  }

  if (isSpecialProject(plot) || plot.status === 'unavailable' || plot.status === 'verified') {
    return statusColors.unavailable;
  }

  if (plot.status === 'reserved') {
    return statusColors.reserved;
  }

  if (plot.type === 'needs work' && plot.status === 'available') {
    return '#a5d6a7';
  }

  return statusColors.available;
};

// Handle canvas click
const handleCanvasClick = (event) => {
  if (!props.registrationOpen) {
    return;
  }

  const canvas = canvasRef.value;
  const scale = canvas.width / mapWidth;
  const rect = canvas.getBoundingClientRect();
  const clickX = (event.clientX - rect.left) / scale;
  const clickY = (event.clientY - rect.top) / scale;

  // Find clicked plot
  for (const [plotId, plot] of Object.entries(plots.value)) {
    if (!hasPlotGeometry(plot)) continue;
    if (isSpecialProject(plot) || plot.status !== 'available') continue;
    if (
      clickX >= plot.x &&
      clickX <= plot.x + plot.width &&
      clickY >= plot.y &&
      clickY <= plot.y + plot.height
    ) {
      // Emit plot-selected event
      const event = new CustomEvent('plot-selected', { detail: { plotId } });
      window.dispatchEvent(event);
      return;
    }
  }
};

// Handle canvas hover
const handleCanvasMouseMove = (event) => {
  const canvas = canvasRef.value;
  const scale = canvas.width / mapWidth;
  const rect = canvas.getBoundingClientRect();
  const mouseX = (event.clientX - rect.left) / scale;
  const mouseY = (event.clientY - rect.top) / scale;

  hoveredPlot.value = null;

  // Find hovered plot
  for (const [plotId, plot] of Object.entries(plots.value)) {
    if (!hasPlotGeometry(plot)) continue;
    if (
      mouseX >= plot.x &&
      mouseX <= plot.x + plot.width &&
      mouseY >= plot.y &&
      mouseY <= plot.y + plot.height
    ) {
      hoveredPlot.value = { plotId, ...plot };
      tooltipPos.value = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      return;
    }
  }
};

const handleCanvasMouseLeave = () => {
  hoveredPlot.value = null;
};

// Get tooltip text based on plot status
const getTooltipText = (plot) => {
  if (isSpecialProject(plot) || plot.status === 'unavailable' || plot.status === 'verified') {
    return 'Plot unavailable';
  } else if (plot.status === 'available') {
    return 'Plot available';
  } else if (plot.status === 'reserved') {
    return 'Plot unavailable';
  } else {
    return 'Plot unavailable';
  }
};

const getTooltipGardener = (plot) => {
  if (!plot?.plotId) {
    return '';
  }

  if (plot.status === 'available' && !isSpecialProject(plot)) {
    return '';
  }

  const gardenerFirstName = plot.gardenerFirstName || gardenersByPlot.value[normalizePlotId(plot.plotId)];
  return gardenerFirstName ? `Gardener: ${gardenerFirstName}` : '';
};

// Watch for plot changes and redraw
watch(plots, drawMap, { deep: true });
watch(() => props.selectedPlotIds, drawMap, { deep: true });
watch(() => props.registrationOpen, drawMap);

onMounted(async () => {
  // Set canvas size
  if (canvasRef.value) {
    const container = canvasRef.value.parentElement;
    canvasRef.value.width = Math.min(container.offsetWidth, 800);
    canvasRef.value.height = (canvasRef.value.width / mapWidth) * mapHeight;
  }

  // Load data and set up listeners
  await loadPlots();
  // After loading, the watch will trigger drawMap automatically
  // But we need to ensure it's called at least once
  drawMap();
  setupRealtimeListener();
});
</script>

<template>
  <div class="plot-map-container">
    <canvas
      ref="canvasRef"
      class="plot-canvas"
      @click="handleCanvasClick"
      @mousemove="handleCanvasMouseMove"
      @mouseleave="handleCanvasMouseLeave"
    ></canvas>
    
    <!-- Tooltip -->
    <div
      v-if="hoveredPlot"
      class="tooltip"
      :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
    >
      <strong>Plot {{ hoveredPlot.name }}</strong><br>
      {{ getTooltipText(hoveredPlot) }}
      <template v-if="getTooltipGardener(hoveredPlot)">
        <br>
        {{ getTooltipGardener(hoveredPlot) }}
      </template>
    </div>
    
    <div class="legend">
      <div class="legend-item">
        <div class="color-box" style="background: #4caf50;"></div>
        <span>Available</span>
      </div>
      <div class="legend-item">
        <div class="color-box" style="background: #a5d6a7;"></div>
        <span>Needs work</span>
      </div>
      <div class="legend-item">
        <div class="color-box" style="background: #ffc107;"></div>
        <span>Reserved</span>
      </div>
      <div class="legend-item">
        <div class="color-box" style="background: #f44336;"></div>
        <span>Unavailable</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plot-map-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
  position: relative;
}

.plot-canvas {
  max-width: 100%;
  border: 1px solid #ddd;
  cursor: pointer;
  display: block;
  margin: 0 auto;
  background: #f5f5f5;
}

.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
  transform: translate(-50%, -120%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.tooltip::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid rgba(0, 0, 0, 0.9);
}

.legend {
  display: flex;
  gap: 24px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.color-box {
  width: 20px;
  height: 20px;
  border: 1px solid #333;
  border-radius: 2px;
}
</style>
