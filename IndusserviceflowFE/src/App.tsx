import AppRoutes from "./routes/AppRoutes";
import { ConfirmProvider } from "./components/common/ConfirmDialog";
import { GlobalToastProvider } from "./components/common/GlobalToast";
import { AuthProvider } from "./context/AuthContext";
import { SimulationProvider } from "./context/SimulationContext";

function App() {
  return (
    <AuthProvider>
      <SimulationProvider>
        <GlobalToastProvider>
          <ConfirmProvider>
            <AppRoutes />
          </ConfirmProvider>
        </GlobalToastProvider>
      </SimulationProvider>
    </AuthProvider>
  );
}

export default App;