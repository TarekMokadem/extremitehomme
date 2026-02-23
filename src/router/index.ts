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
      path: '/fin-de-journee',
      name: 'fin-de-journee',
      component: () => import('../pages/FinDeJourneePage.vue'),
      meta: { title: 'Fin de journée' }
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('../pages/StatistiquesPage.vue'),
      meta: { title: 'Statistiques' }
    },
    {
      path: '/stats/employe',
      name: 'stats-employe',
      component: () => import('../pages/StatsEmployePage.vue'),
      meta: { title: 'Stats employé' }
    },
    {
      path: '/stats/ca',
      name: 'stats-ca',
      component: () => import('../pages/ChiffreAffairePage.vue'),
      meta: { title: 'Chiffre d\'affaires' }
    },
    {
      path: '/stats/recap',
      name: 'stats-recap',
      component: () => import('../pages/RecapMensuelPage.vue'),
      meta: { title: 'Récap mensuel' }
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
    {
      path: '/commande',
      name: 'commande',
      component: () => import('../pages/CommandePage.vue'),
      meta: { title: 'Commande' }
    },
  ],
});

router.beforeEach((to) => {
  document.title = `${to.meta.title || 'Caisse'} - Extrémités Homme`;
});

export default router;
