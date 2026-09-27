import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import MinimalFooter from './footer/MinimalFooter';
import WhatsAppFloat from './WhatsAppFloat';
import { api } from '../api';

export default function PublicLayout() {
  const [settings, setSettings] = useState(null);
  const location = useLocation();
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    setPageReady(false);
    const frame = requestAnimationFrame(() => setPageReady(true));
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  return (
    <>
      <Header />
      <div className={`page-shell ${pageReady ? 'page-shell-ready' : ''}`}>
        <Outlet />
      </div>
      <MinimalFooter settings={settings} />
      <WhatsAppFloat whatsapp={settings?.whatsapp} />
    </>
  );
}
