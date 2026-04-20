<script setup>
import { onMounted, ref } from 'vue';
import mapSvg from '@/assets/uaf-garden-map.svg?raw';

const svgHtml = ref(mapSvg);
const highlighted = ref(null);

const onElementClick = (plotId) => {
  // emit a custom event when a mapped plot is selected
  const ev = new CustomEvent('plot-selected', { detail: { plotId } });
  window.dispatchEvent(ev);
};

onMounted(() => {
  // Attach click listeners to SVG elements that have data-plot-id or id
  // Use a small timeout to ensure DOM has rendered
  setTimeout(() => {
    const container = document.getElementById('uaf-map-container');
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;

    // Make all shapes clickable
    const clickable = svg.querySelectorAll('[id], [data-plot-id]');
    clickable.forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('mouseenter', () => {
        el.setAttribute('opacity-before', el.getAttribute('opacity') || '1');
        el.setAttribute('opacity', '0.7');
      });
      el.addEventListener('mouseleave', () => {
        const prev = el.getAttribute('opacity-before') || '1';
        el.setAttribute('opacity', prev);
      });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const plotId = el.getAttribute('data-plot-id') || el.id || null;
        if (plotId) onElementClick(plotId);
        else {
          const ev = new CustomEvent('plot-unmapped-click', { detail: { element: el.tagName, id: el.id } });
          window.dispatchEvent(ev);
        }
      });
    });
  }, 0);
});
</script>

<template>
  <div id="uaf-map-container" v-html="svgHtml" class="uaf-map"></div>
</template>

<style scoped>
.uaf-map svg { max-width: 100%; height: auto; display: block; }
.uaf-map svg *{ transition: opacity 0.12s ease; }
</style>
