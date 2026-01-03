import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { traducteurService } from '../../services/traducteurService';
import { utilisateurService } from '../../services/utilisateurService';
import { tacheService } from '../../services/tacheService';

interface SearchResult {
  id: string;
  type: 'traducteur' | 'utilisateur' | 'tache';
  titre: string;
  sousTitre?: string;
  icon: string;
}

interface AdminSearchBarProps {
  onSelect?: (result: SearchResult) => void;
}

/**
 * Barre de recherche globale pour l'admin
 * Permet de chercher traducteurs, utilisateurs et tâches
 */
export const AdminSearchBar: React.FC<AdminSearchBarProps> = ({ onSelect }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recherche debounce
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults: SearchResult[] = [];
        const q = query.toLowerCase();

        // Recherche traducteurs
        try {
          const traducteurs = await traducteurService.obtenirTraducteurs();
          const matchingTraducteurs = traducteurs
            .filter(t => 
              t.nom.toLowerCase().includes(q) ||
              t.utilisateur?.email?.toLowerCase().includes(q) ||
              t.categorie?.toLowerCase().includes(q) ||
              t.divisions.some(d => d.toLowerCase().includes(q))
            )
            .slice(0, 3);
          
          searchResults.push(...matchingTraducteurs.map(t => ({
            id: t.id,
            type: 'traducteur' as const,
            titre: t.nom,
            sousTitre: `${t.categorie || 'Traducteur'} • ${t.actif ? 'Actif' : 'Inactif'}`,
            icon: '👤'
          })));
        } catch (e) {
          console.error('Erreur recherche traducteurs:', e);
        }

        // Recherche utilisateurs
        try {
          const utilisateurs = await utilisateurService.obtenirUtilisateurs();
          const matchingUtilisateurs = utilisateurs
            .filter(u => 
              u.nom?.toLowerCase().includes(q) || 
              u.prenom?.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q) ||
              u.role.toLowerCase().includes(q)
            )
            .slice(0, 3);
          
          searchResults.push(...matchingUtilisateurs.map(u => ({
            id: u.id,
            type: 'utilisateur' as const,
            titre: `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email,
            sousTitre: `${u.role} • ${u.email}`,
            icon: '🔐'
          })));
        } catch (e) {
          console.error('Erreur recherche utilisateurs:', e);
        }

        // Recherche tâches
        try {
          const taches = await tacheService.obtenirTaches();
          const matchingTaches = taches
            .filter(t => 
              t.numeroProjet?.toLowerCase().includes(q) ||
              t.description?.toLowerCase().includes(q) ||
              t.statut?.toLowerCase().includes(q)
            )
            .slice(0, 3);
          
          searchResults.push(...matchingTaches.map(t => ({
            id: t.id,
            type: 'tache' as const,
            titre: t.numeroProjet || 'Tâche sans numéro',
            sousTitre: `${t.statut} • ${t.heuresTotal}h`,
            icon: '📋'
          })));
        } catch (e) {
          console.error('Erreur recherche tâches:', e);
        }

        setResults(searchResults);
        setIsOpen(searchResults.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Erreur recherche globale:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Gestion clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Sélection d'un résultat
  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);

    if (onSelect) {
      onSelect(result);
    } else {
      // Navigation par défaut
      switch (result.type) {
        case 'traducteur':
          navigate(`/traducteurs/${result.id}`);
          break;
        case 'tache':
          navigate(`/taches/${result.id}`);
          break;
        case 'utilisateur':
          // Pas de page dédiée, on pourrait ouvrir un modal
          break;
      }
    }
  };

  // Fermer quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        resultsRef.current && !resultsRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher traducteurs, utilisateurs, tâches..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </span>
        )}
      </div>

      {/* Dropdown résultats */}
      {isOpen && results.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-auto"
        >
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors ${
                index === selectedIndex ? 'bg-primary/5 border-l-2 border-l-primary' : ''
              } ${index !== results.length - 1 ? 'border-b' : ''}`}
            >
              <span className="text-xl">{result.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">
                  {result.titre}
                </div>
                {result.sousTitre && (
                  <div className="text-xs text-gray-500 truncate">
                    {result.sousTitre}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-400 capitalize px-2 py-1 bg-gray-100 rounded">
                {result.type}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Message si aucun résultat */}
      {isOpen && query.length >= 2 && !loading && results.length === 0 && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-4 text-center"
        >
          <p className="text-sm text-gray-500">
            Aucun résultat pour « {query} »
          </p>
        </div>
      )}
    </div>
  );
};
