import React, { useRef, useState, useCallback, memo } from 'react';

interface VirtualListProps<T> {
  /** Les éléments à afficher */
  items: T[];
  /** Hauteur de chaque élément en pixels */
  itemHeight: number;
  /** Hauteur du conteneur visible en pixels */
  containerHeight: number;
  /** Fonction de rendu pour chaque élément */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Nombre d'éléments à pré-charger au-dessus/en-dessous de la vue */
  overscan?: number;
  /** Classe CSS pour le conteneur */
  className?: string;
  /** Clé unique pour chaque élément */
  getItemKey?: (item: T, index: number) => string | number;
}

/**
 * Composant de liste virtualisée pour de grandes listes
 * Ne rend que les éléments visibles + overscan pour de meilleures performances
 */
function VirtualListInner<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
  getItemKey,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculer les indices visibles
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const item = items[i];
    const key = getItemKey ? getItemKey(item, i) : i;
    visibleItems.push(
      <div
        key={key}
        style={{
          position: 'absolute',
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        }}
      >
        {renderItem(item, i)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

export const VirtualList = memo(VirtualListInner) as typeof VirtualListInner;

/**
 * Hook pour gérer la virtualisation avec des éléments de hauteur variable
 */
export function useVirtualization<T>(
  items: T[],
  containerHeight: number,
  estimatedItemHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleCount = Math.ceil(containerHeight / estimatedItemHeight) + 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - 1);
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * estimatedItemHeight;
  const totalHeight = items.length * estimatedItemHeight;
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return {
    visibleItems,
    startIndex,
    endIndex,
    offsetY,
    totalHeight,
    handleScroll,
  };
}

/**
 * Seuil pour activer la virtualisation automatiquement
 */
export const VIRTUALIZATION_THRESHOLD = 50;

/**
 * Détermine si la virtualisation devrait être utilisée
 */
export function shouldVirtualize(itemCount: number): boolean {
  return itemCount > VIRTUALIZATION_THRESHOLD;
}
