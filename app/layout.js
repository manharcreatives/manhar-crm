import { StoreProvider } from './lib/store';
import { ToastProvider } from './components/ui/Toast';
import Sidebar from './components/layout/Sidebar';
import './globals.css';

export const metadata = {
  title: 'Manhar Creatives — Agency CRM & Billing System',
  description: 'Complete business operations system for Manhar Creatives — CRM, Billing, Invoicing, and Analytics.',
  keywords: 'Manhar Creatives, Agency CRM, Billing, Invoice, Digital Agency Gujarat',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <StoreProvider>
          <ToastProvider>
            <div className="app-layout">
              <Sidebar />
              <main className="main-content">
                {children}
              </main>
            </div>
          </ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
