import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import HomePage from "@/pages/HomePage";
import ProductsPage from "@/pages/ProductsPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import CartPage from "@/pages/CartPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import BlogPage from "@/pages/BlogPage";
import CheckoutPage from "@/pages/CheckoutPage";
import SearchPage from "@/pages/SearchPage";
import ContactPage from "@/pages/ContactPage";
import SustainabilityPage from "@/pages/SustainabilityPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import ShippingReturnsPage from "@/pages/ShippingReturnsPage";
import AccountPage from "@/pages/AccountPage";
import OrdersPage from "@/pages/OrdersPage";
import WishlistPage from "@/pages/WishlistPage";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-grow pt-24">{children}</main>
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <StoreLayout><HomePage /></StoreLayout>} />
      <Route path="/products" component={() => <StoreLayout><ProductsPage /></StoreLayout>} />
      <Route path="/products/:id" component={() => <StoreLayout><div className="pt-24"><ProductDetailPage /></div></StoreLayout>} />
      <Route path="/cart" component={() => <StoreLayout><div className="pt-24"><CartPage /></div></StoreLayout>} />
      <Route path="/checkout" component={() => <StoreLayout><div className="pt-24"><CheckoutPage /></div></StoreLayout>} />
      <Route path="/blog" component={() => <StoreLayout><BlogPage /></StoreLayout>} />
      <Route path="/search" component={() => <StoreLayout><div className="pt-24"><SearchPage /></div></StoreLayout>} />
      <Route path="/contact" component={() => <StoreLayout><ContactPage /></StoreLayout>} />
      <Route path="/sustainability" component={() => <StoreLayout><SustainabilityPage /></StoreLayout>} />
      <Route path="/privacy" component={() => <StoreLayout><PrivacyPage /></StoreLayout>} />
      <Route path="/terms" component={() => <StoreLayout><TermsPage /></StoreLayout>} />
      <Route path="/shipping-returns" component={() => <StoreLayout><ShippingReturnsPage /></StoreLayout>} />
      <Route path="/account" component={() => <StoreLayout><AccountPage /></StoreLayout>} />
      <Route path="/account/orders" component={() => <StoreLayout><OrdersPage /></StoreLayout>} />
      <Route path="/account/wishlist" component={() => <StoreLayout><WishlistPage /></StoreLayout>} />
      <Route path="/admin" component={() => <StoreLayout><AdminPage /></StoreLayout>} />
      <Route path="/login" component={() => <AuthLayout><LoginPage /></AuthLayout>} />
      <Route path="/register" component={() => <AuthLayout><RegisterPage /></AuthLayout>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CurrencyProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <div className="min-h-screen flex flex-col bg-white font-sans antialiased text-slate-900 selection:bg-slate-900 selection:text-white">
                <Router />
                <CookieBanner />
              </div>
            </WouterRouter>
            <Toaster />
          </CurrencyProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
