<script setup>
import { computed, ref } from 'vue';
import { auth } from '@/services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import PlotManagement from '@/pages/PlotManagement.vue';
import GardenerManagement from '@/pages/GardenerManagement.vue';
import PlotsLandmarksManagement from '@/pages/PlotsLandmarksManagement.vue';
import CMSEditor from '@/pages/CMSEditor.vue';

const router = useRouter();
const { width } = useDisplay();
const activePage = ref('plot-reservations');
const mobileDrawerOpen = ref(false);

const showDesktopNav = computed(() => width.value >= 1120);

const navItems = [
  { value: 'plot-reservations', label: 'Plot reservations', icon: 'mdi-view-list-outline' },
  { value: 'returning-gardeners', label: 'Returning gardeners', icon: 'mdi-account-group-outline' },
  { value: 'plots-landmarks', label: 'Plots & landmarks', icon: 'mdi-map-marker-radius-outline' },
  { value: 'settings', label: 'Settings', icon: 'mdi-cog-outline' }
];

const selectedComponent = computed(() => {
  if (activePage.value === 'plot-reservations') return PlotManagement;
  if (activePage.value === 'returning-gardeners') return GardenerManagement;
  if (activePage.value === 'plots-landmarks') return PlotsLandmarksManagement;
  return CMSEditor;
});

const selectPage = (pageValue) => {
  activePage.value = pageValue;
  if (!showDesktopNav.value) {
    mobileDrawerOpen.value = false;
  }
};

const goHome = async () => {
  await router.push('/');
};

const logout = async () => {
  try {
    await signOut(auth);
    router.push('/admin/login');
  } catch (error) {
    console.error('Logout error:', error);
  }
};
</script>

<template>
  <v-app>
    <v-app-bar color="primary">
      <v-app-bar-nav-icon
        v-if="!showDesktopNav"
        aria-label="Open admin navigation"
        @click="mobileDrawerOpen = !mobileDrawerOpen"
      />
      <v-app-bar-title class="admin-app-bar-title">Admin Dashboard</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="goHome" aria-label="Back to home">
        <v-icon>mdi-home</v-icon>
      </v-btn>
      <v-btn icon @click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer
      v-if="!showDesktopNav"
      v-model="mobileDrawerOpen"
      temporary
      location="start"
      width="260"
      class="admin-mobile-drawer"
    >
      <div class="admin-nav-title">Admin pages</div>
      <v-list nav density="comfortable">
        <v-list-item
          v-for="item in navItems"
          :key="item.value"
          :active="activePage === item.value"
          :title="item.label"
          :prepend-icon="item.icon"
          @click="selectPage(item.value)"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <div class="admin-shell">
        <div class="admin-shell__inner">
          <aside v-if="showDesktopNav" class="admin-nav">
            <div class="pa-3 admin-nav-card">
              <div class="admin-nav-title">Admin pages</div>
              <v-list nav density="comfortable">
                <v-list-item
                  v-for="item in navItems"
                  :key="item.value"
                  :active="activePage === item.value"
                  :title="item.label"
                  :prepend-icon="item.icon"
                  @click="selectPage(item.value)"
                />
              </v-list>
            </div>
          </aside>

          <section class="admin-content">
            <component :is="selectedComponent" />
          </section>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.admin-shell {
  font-size: 0.92rem;
  width: 100%;
  padding: 12px 14px 18px;
  min-height: calc(100dvh - 64px);
  overflow-x: auto;
}

.admin-shell__inner {
  width: 100%;
  display: grid;
  grid-template-columns: 260px minmax(760px, 1fr);
  gap: 18px;
  align-items: stretch;
  min-height: calc(100dvh - 64px - 30px);
}

.admin-nav {
  min-width: 0;
}

.admin-content {
  min-width: 760px;
  padding-left: 18px;
  border-left: 1px solid rgba(0, 0, 0, 0.16);
  min-height: 100%;
}

.admin-nav-card {
  position: sticky;
  top: 0;
  border-radius: 0;
  background: transparent;
}

.admin-nav-title {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(0, 0, 0, 0.58);
  font-weight: 700;
  margin: 4px 10px 8px;
}

.admin-app-bar-title {
  text-align: left;
}

.admin-mobile-drawer {
  padding-top: 8px;
}

.admin-content :deep(.v-card) {
  border: 0 !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  background: transparent !important;
}

/* Remove root app container constraints while on admin routes */
:global(#app) {
  width: 100%;
  max-width: none;
  margin: 0;
  border-inline: 0;
  text-align: left;
}

@media (max-width: 1119px) {
  .admin-shell {
    padding: 12px;
  }

  .admin-shell__inner {
    display: block;
    min-height: calc(100dvh - 64px - 24px);
  }

  .admin-content {
    min-width: 760px;
    padding-left: 0;
    border-left: 0;
    min-height: auto;
  }
}
</style>
