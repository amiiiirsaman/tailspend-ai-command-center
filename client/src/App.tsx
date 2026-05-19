// TailSpend AI Command Center — App.tsx
// Routes: /upload (always accessible) + all dashboard routes (require data)

import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { DataProvider, useData } from "@/contexts/DataContext";
import { FlagProvider } from "@/contexts/FlagContext";
import Layout from "@/components/Layout";
import Upload from "@/pages/Upload";
import Home from "@/pages/Home";
import Suppliers from "@/pages/Suppliers";
import Categories from "@/pages/Categories";
import Levers from "@/pages/Levers";
import Waves from "@/pages/Waves";
import FlaggedSuppliers from "@/pages/FlaggedSuppliers";
import AIChatDrawer from "@/components/AIChatDrawer";

// Guard: redirect to /upload if no data is loaded
function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { data } = useData();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!data && location !== "/upload") {
      navigate("/upload");
    }
  }, [data, location, navigate]);

  if (!data) return null;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/upload" component={Upload} />
      <Route>
        <DashboardGuard>
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/suppliers" component={Suppliers} />
              <Route path="/categories" component={Categories} />
              <Route path="/levers" component={Levers} />
              <Route path="/waves" component={Waves} />
              <Route path="/flagged" component={FlaggedSuppliers} />
              <Route component={Home} />
            </Switch>
            <AIChatDrawer />
          </Layout>
        </DashboardGuard>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <DataProvider>
      <FlagProvider>
        <AppRoutes />
      </FlagProvider>
    </DataProvider>
  );
}
