import AppRoutes from './routes/AppRoutes.jsx';
import ScrollToTop from './components/common/ScrollToTop.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <AppRoutes />
    </ErrorBoundary>
  );
}

