import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'caisse',
      component: () => import('../pages/CaissePage.vue'),
      meta: { title: 'Caisse' }
    },
    {
      path: '/historique',
      name: 'historique',
      component: () => import('../pages/HistoriquePage.vue'),
      meta: { title: 'Historique des ventes' }
    },
    {
      path: '/clients',
      name: 'clients',
      component: () => import('../pages/ClientsPage.vue'),
      meta: { title: 'Clients' }
    },
    {
      path: '/tiroir',
      name: 'tiroir',
      component: () => import('../pages/TiroirCaissePage.vue'),
      meta: { title: 'Tiroir de caisse' }
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('../pages/StatistiquesPage.vue'),
      meta: { title: 'Statistiques' }
    },
    {
      path: '/parametres',
      name: 'parametres',
      component: () => import('../pages/ParametresPage.vue'),
      meta: { title: 'Paramètres' }
    },
    {
      path: '/stock',
      name: 'stock',
      component: () => import('../pages/StockPage.vue'),
      meta: { title: 'Stock' }
    },
  ],
});

// Mettre à jour le titre de la page
router.beforeEach((to) => {
  document.title = `${to.meta.title || 'Caisse'} - Extrémités Homme`;
});

export default router;
