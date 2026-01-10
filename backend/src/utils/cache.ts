/**
 * Cache in-memory simple pour données statiques/référentielles
 * 
 * Utilisé pour réduire les requêtes DB sur les données qui changent rarement:
 * - Divisions
 * - Paires linguistiques
 * - Domaines
 * - Spécialisations
 * - Jours fériés
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL: number; // milliseconds

  constructor(defaultTTLSeconds: number = 300) {
    this.defaultTTL = defaultTTLSeconds * 1000;
  }

  /**
   * Récupérer une valeur du cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.data as T;
  }

  /**
   * Stocker une valeur dans le cache
   */
  set<T>(key: string, data: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Récupérer ou calculer une valeur (pattern cache-aside)
   */
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttlSeconds?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
    
    const data = await fetcher();
    this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Invalider une clé spécifique
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalider toutes les clés commençant par un préfixe
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Vider tout le cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Obtenir les stats du cache
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Instance singleton avec TTL de 5 minutes par défaut
export const cache = new SimpleCache(300);

// Clés de cache standardisées
export const CACHE_KEYS = {
  DIVISIONS_ALL: 'divisions:all',
  PAIRES_LINGUISTIQUES_ALL: 'paires:all',
  DOMAINES_ALL: 'domaines:all',
  SPECIALISATIONS_ALL: 'specialisations:all',
  JOURS_FERIES: (annee: number) => `jours-feries:${annee}`,
  CLIENTS_ALL: 'clients:all',
} as const;

export default cache;
