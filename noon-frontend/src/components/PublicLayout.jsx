import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import MinimalFooter from './footer/MinimalFooter';
import WhatsAppFloat from './WhatsAppFloat';
import { api } from '../api';

export default function PublicLayout() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  return (
    <>
      <Header />
      <Outlet />
      <MinimalFooter settings={settings} />
      <WhatsAppFloat whatsapp={settings?.whatsapp} />
    </>
  );
}
