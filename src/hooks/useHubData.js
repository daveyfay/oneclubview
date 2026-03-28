import { useContext } from 'react';
import { HubDataContext } from '../contexts/HubDataContext';

export function useHubData() {
  const ctx = useContext(HubDataContext);
  if (!ctx) throw new Error('useHubData must be used within HubDataProvider');
  return ctx;
}
