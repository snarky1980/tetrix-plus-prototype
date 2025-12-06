import { useEffect } from 'react';

/**
 * Hook pour changer le titre de la page et la description
 */
export const usePageTitle = (title: string, description?: string) => {
  useEffect(() => {
    document.title = title;
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', description);
    }
  }, [title, description]);
};
