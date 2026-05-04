<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import mapSvg from '@/assets/uaf-garden-map.svg?raw';

const svgHtml = ref(mapSvg);
let mountTimer = null;
let mountedSvg = null;

const onElementClick = (plotId) => {
  // emit a custom event when a mapped plot is selected
  const ev = new CustomEvent('plot-selected', { detail: { plotId } });
  window.dispatchEvent(ev);
};

const getInteractiveElement = (event) => {
  if (!mountedSvg) {
    return null;
  }
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return null;
  }
  const candidate = target.closest('[id], [data-plot-id]');
  return candidate && mountedSvg.contains(candidate) ? candidate : null;
};

const handleMouseOver = (event) => {
  const el = getInteractiveElement(event);
  if (!el) {
    return;
  }
  el.setAttribute('opacity-before', el.getAttribute('opacity') || '1');
  el.setAttribute('opacity', '0.7');
};

const handleMouseOut = (event) => {
  const el = getInteractiveElement(event);
  if (!el) {
    return;
  }
  const prev = el.getAttribute('opacity-before') || '1';
  el.setAttribute('opacity', prev);
};

const handleClick = (event) => {
  const el = getInteractiveElement(event);
  if (!el) {
    return;
  }
  event.stopPropagation();
  const plotId = el.getAttribute('data-plot-id') || el.id || null;
  if (plotId) {
    onElementClick(plotId);
    return;
  }
  const ev = new CustomEvent('plot-unmapped-click', { detail: { element: el.tagName, id: el.id } });
  window.dispatchEvent(ev);
};

onMounted(() => {
  // Use a small timeout to ensure the raw SVG has rendered into the DOM.
  mountTimer = window.setTimeout(() => {
    const container = document.getElementById('uaf-map-container');
    if (!container) {
      return;
    }
    const svg = container.querySelector('svg');
    if (!svg) {
      return;
    }
    mountedSvg = svg;

    const clickable = svg.querySelectorAll('[id], [data-plot-id]');
    clickable.forEach((el) => {
      el.style.cursor = 'pointer';
    });

    mountedSvg.addEventListener('mouseover', handleMouseOver);
    mountedSvg.addEventListener('mouseout', handleMouseOut);
    mountedSvg.addEventListener('click', handleClick);
  }, 0);
});

onUnmounted(() => {
  if (mountTimer !== null) {
    window.clearTimeout(mountTimer);
    mountTimer = null;
  }
  if (mountedSvg) {
    mountedSvg.removeEventListener('mouseover', handleMouseOver);
    mountedSvg.removeEventListener('mouseout', handleMouseOut);
    mountedSvg.removeEventListener('click', handleClick);
    mountedSvg = null;
  }
});
</script>

<template>
  <div id="uaf-map-container" v-html="svgHtml" class="uaf-map"></div>
</template>

<style scoped>
.uaf-map svg { max-width: 100%; height: auto; display: block; }
.uaf-map svg *{ transition: opacity 0.12s ease; }
</style>
