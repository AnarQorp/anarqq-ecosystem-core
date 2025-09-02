import React from 'react';
import { RouteObject } from 'react-router-dom';

// Lazy load pages for better code splitting
const QmarketPage = React.lazy(() => import('./pages/QmarketPage'));
const QmarketItemDetailPage = React.lazy(() => import('./pages/QmarketItemDetailPage'));
const QmarketItemEditPage = React.lazy(() => import('./pages/QmarketItemEditPage'));
const MyQmarketItemsPage = React.lazy(() => import('./pages/MyQmarketItemsPage'));
const PublishPage = React.lazy(() => import('./pages/PublishPage'));

// Import the authentication guard
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export const qmarketRoutes: RouteObject[] = [
  {
    path: '/qmarket',
    element: <QmarketPage />,
  },
  {
    path: '/qmarket/item/:cid',
    element: <QmarketItemDetailPage />,
  },
  {
    path: '/qmarket/item/:cid/edit',
    element: (
      <ProtectedRoute>
        <QmarketItemEditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/qmarket/my-items',
    element: (
      <ProtectedRoute>
        <MyQmarketItemsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/qmarket/publish',
    element: (
      <ProtectedRoute>
        <PublishPage />
      </ProtectedRoute>
    ),
  },
];

export default qmarketRoutes;
