import { createRouter, createWebHistory } from 'vue-router';
import { auth } from '@/services/firebaseConfig';

// Public pages
const Home = () => import('@/pages/Home.vue');
const PlotRegistration = () => import('@/pages/PlotRegistration.vue');
const ReturningGardenerForm = () => import('@/pages/ReturningGardenerForm.vue');

// Admin pages
const AdminLogin = () => import('@/pages/AdminLogin.vue');
const AdminDashboard = () => import('@/pages/AdminDashboard.vue');
const PlotManagement = () => import('@/pages/PlotManagement.vue');
const GardenerManagement = () => import('@/pages/GardenerManagement.vue');
const CMSEditor = () => import('@/pages/CMSEditor.vue');

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/plot-registration',
    name: 'PlotRegistration',
    component: PlotRegistration
  },
  {
    path: '/returning-gardener',
    name: 'ReturningGardenerForm',
    component: ReturningGardenerForm
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: AdminLogin
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/plots',
    name: 'PlotManagement',
    component: PlotManagement,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/gardeners',
    name: 'GardenerManagement',
    component: GardenerManagement,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/cms',
    name: 'CMSEditor',
    component: CMSEditor,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard for protected routes
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  
  if (requiresAuth) {
    auth.onAuthStateChanged(user => {
      if (user) {
        next();
      } else {
        next('/admin/login');
      }
    });
  } else {
    next();
  }
});

export default router;
