import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import SportTrading from "./pages/SportTrading";
import Backtesting from "./pages/Backtesting";
import BacktestSession from "./pages/BacktestSession";
import FutureTrading from "./pages/FutureTrading";
import FutureTradingSession from "./pages/FutureTradingSession";
import Analytics from "./pages/Analytics";
import Strategies from "./pages/Strategies";
import RiskManagement from "./pages/RiskManagement";
import Community from "./pages/Community";
import Notes from "./pages/Notes";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Landing />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sport-trading"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <SportTrading />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/backtesting"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Backtesting />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/backtesting/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <BacktestSession />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/future-trading"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <FutureTrading />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/future-trading/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <FutureTradingSession />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Analytics />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/strategies"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Strategies />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/risk-management"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <RiskManagement />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/community"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Community />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notes"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Notes />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Settings />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
