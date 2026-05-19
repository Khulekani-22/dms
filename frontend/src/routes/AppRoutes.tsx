import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import GuestRoutes from './GuestRoutes';
import ProtectedRoutes from './ProtectedRoutes';

// Auth pages
const Login = lazy(() => import('../pages/auth/Login'));
const MicrosoftCallback = lazy(() => import('../pages/auth/MicrosoftCallback'));

// Admin DMS pages
const FolderList = lazy(() => import('../pages/dms/folders/FolderList'));
const FolderDetail = lazy(() => import('../pages/dms/folders/FolderDetail'));
const DocumentUpload = lazy(() => import('../pages/dms/documents/DocumentUpload'));
const ShareManager = lazy(() => import('../pages/dms/share/ShareManager'));
const AccessLog = lazy(() => import('../pages/dms/logs/AccessLog'));

// PIN access portal (public)
const PinEntry = lazy(() => import('../pages/access/PinEntry'));
const SharedFolderView = lazy(() => import('../pages/access/SharedFolderView'));

const Loader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
  </div>
);

export const router = createBrowserRouter([
  // ── Guest routes (unauthenticated only) ─────────────────────
  {
    element: <GuestRoutes />,
    children: [
      { path: '/auth/login', element: <Suspense fallback={<Loader />}><Login /></Suspense> },
      { path: '/auth/callback', element: <Suspense fallback={<Loader />}><MicrosoftCallback /></Suspense> },
    ],
  },

  // ── Public PIN access portal ─────────────────────────────────
  {
    path: '/access',
    element: <Suspense fallback={<Loader />}><PinEntry /></Suspense>,
  },
  {
    path: '/access/:pin',
    element: <Suspense fallback={<Loader />}><PinEntry /></Suspense>,
  },
  {
    path: '/access/:pin/view',
    element: <Suspense fallback={<Loader />}><SharedFolderView /></Suspense>,
  },

  // ── Protected admin routes ───────────────────────────────────
  {
    element: <ProtectedRoutes />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <Navigate to="/folders" replace /> },
          { path: '/folders', element: <Suspense fallback={<Loader />}><FolderList /></Suspense> },
          { path: '/folders/:id', element: <Suspense fallback={<Loader />}><FolderDetail /></Suspense> },
          { path: '/folders/:id/upload', element: <Suspense fallback={<Loader />}><DocumentUpload /></Suspense> },
          { path: '/share', element: <Suspense fallback={<Loader />}><ShareManager /></Suspense> },
          { path: '/logs', element: <Suspense fallback={<Loader />}><AccessLog /></Suspense> },
        ],
      },
    ],
  },

  // ── Catch-all ────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/folders" replace /> },
]);
