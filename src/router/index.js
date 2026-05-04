import { createRouter, createWebHistory } from 'vue-router';
import { auth, database } from '@/services/firebaseConfig';
import { get, ref as dbRef } from 'firebase/database';
import { signOut } from 'firebase/auth';

// Public pages
const Home = () => import('@/pages/Home.vue');
const PlotRegistration = () => import('@/pages/PlotRegistration.vue');
const ReturningGardenerForm = () => import('@/pages/ReturningGardenerForm.vue');

// Admin pages
const AdminLogin = () => import('@/pages/AdminLogin.vue');
const AdminDashboard = () => import('@/pages/AdminDashboard.vue');

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
    redirect: '/admin'
  },
  {
    path: '/admin/gardeners',
    redirect: '/admin'
  },
  {
    path: '/admin/cms',
    redirect: '/admin'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

let pendingAuthUserPromise = null;

const getCurrentUser = () => {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  if (!pendingAuthUserPromise) {
    pendingAuthUserPromise = new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        pendingAuthUserPromise = null;
        resolve(user || null);
      });
    });
  }

  return pendingAuthUserPromise;
};

const isAdminUser = async (user) => {
  if (!user?.uid) {
    return false;
  }

  const snapshot = await get(dbRef(database, `admins/${user.uid}`));
  return snapshot.exists();
};

// Navigation guard for protected routes
router.beforeEach(async (to) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (!requiresAuth) {
    return true;
  }

  try {
    const user = await getCurrentUser();

    if (!user) {
      return '/admin/login';
    }

    const adminUser = await isAdminUser(user);
    if (!adminUser) {
      await signOut(auth);
      return '/admin/login?not-admin=1';
    }

    return true;
  } catch (error) {
    console.error('Admin check failed:', error);
    return '/admin/login';
  }
});

export default router;
