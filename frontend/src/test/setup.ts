import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock document.hidden pour les tests de visibilité
Object.defineProperty(document, 'hidden', {
  configurable: true,
  get: () => false,
});

// Mock console.error pour éviter le bruit dans les tests
vi.spyOn(console, 'error').mockImplementation(() => {});
