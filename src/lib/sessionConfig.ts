/**
 * Configuration de la session utilisateur
 * - Timeout d'inactivité : déconnexion automatique après X minutes sans activité
 * - sessionStorage : timestamp de dernière activité (perdu si cache vidé)
 */

/** Durée max d'inactivité avant déconnexion (en minutes) */
export const SESSION_TIMEOUT_MINUTES = 600;

/** Clé pour le timestamp de dernière activité */
export const LAST_ACTIVITY_KEY = 'extremites_last_activity';
