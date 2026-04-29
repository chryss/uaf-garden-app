<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PublicFooter from '@/components/PublicFooter.vue';

const route = useRoute();
const isPublicRoute = computed(() => !route.path.startsWith('/admin'));
</script>

<template>
  <v-app>
    <router-view v-slot="{ Component, route: currentRoute }">
      <component :is="Component" :key="currentRoute.fullPath" />
    </router-view>
    <PublicFooter v-if="isPublicRoute" />
  </v-app>
</template>

<style scoped>
</style>
