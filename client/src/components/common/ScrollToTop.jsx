import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Tự động cuộn lên đầu trang mỗi khi chuyển route */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
