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

// Navigation guard for protected routes
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth) {
    auth.onAuthStateChanged(user => {
      if (user) {
        get(dbRef(database, `admins/${user.uid}`))
          .then((snapshot) => {
            if (snapshot.exists()) {
              next();
            } else {
              signOut(auth).finally(() => next('/admin/login?not-admin=1'));
            }
          })
          .catch((error) => {
            console.error('Admin check failed:', error);
            next('/admin/login');
          });
      } else {
        next('/admin/login');
      }
    });
  } else {
    next();
  }
});

export default router;
