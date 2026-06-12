import { StoreProvider } from './lib/store';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './lib/auth';
import Sidebar from './components/layout/Sidebar';
import './globals.css';

export const metadata = {
  title: 'Manhar Creatives — Agency CRM & Billing System',
  description: 'Complete business operations system for Manhar Creatives — CRM, Billing, Invoicing, and Analytics.',
  keywords: 'Manhar Creatives, Agency CRM, Billing, Invoice, Digital Agency Gujarat',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800&family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <StoreProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

function AppShell({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
