import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "./ProtectedRoute";
import { SidebarProvider } from "../components/layout/SidebarContext";

const Login = lazy(
  () => import("../components/super_admin/authentication/Login"),
);
const ForgotPassword = lazy(
  () => import("../components/super_admin/authentication/ForgotPassword"),
);
const ResetPassword = lazy(
  () => import("../components/super_admin/authentication/ResetPassword"),
);
const RegisterOrganization = lazy(
  () => import("../components/super_admin/organization/RegisterOrganization"),
);
const BookAppointment = lazy(
  () => import("../components/Public/Bookappointment"),
);
const Feedback = lazy(() => import("../components/Public/Feedback"));
const LandingPage = lazy(() => import("../pages/LandingPage"));

// Super Admin
const SuperAdminLayout = lazy(
  () => import("../components/layout/SuperAdminLayout"),
);
const SuperAdminDashboard = lazy(
  () => import("../components/super_admin/dashboard/SuperAdminDashboard"),
);
const OrganizationList = lazy(
  () => import("../components/super_admin/organization/OrganizationList"),
);
const CategoryList = lazy(
  () => import("../components/super_admin/category/CategoryList"),
);
const UsersList = lazy(
  () => import("../components/super_admin/users/UsersList"),
);
const AuditLogsList = lazy(
  () => import("../components/audit_logs/AuditLogsList"),
);
const SubscriptionsList = lazy(
  () => import("../components/super_admin/subscriptions/SubscriptionsList"),
);
const PlansPage = lazy(() => import("../components/super_admin/plans/Plans"));
const SuperAdminReports = lazy(
  () => import("../components/super_admin/reports/SuperAdminReports"),
);

// Common profile
const MyProfile = lazy(() => import("../components/profile/MyProfile"));
const ChangePassword = lazy(
  () => import("../components/profile/ChangePassword"),
);

// Organization Admin
const OrgAdminLayout = lazy(
  () => import("../components/layout/OrgAdminLayout"),
);
const OrgAdminDashboard = lazy(
  () => import("../components/organisation admin/dashboard/OrgAdminDashboard"),
);
const OrganizationReports = lazy(
  () => import("../components/organisation admin/reports/OrganizationReports"),
);
const AppointmentsPage = lazy(
  () =>
    import("../components/organisation admin/appointments/AppointmentsPage"),
);
const CreateAppointment = lazy(
  () =>
    import("../components/organisation admin/appointments/CreateAppointment"),
);
const CustomersPage = lazy(
  () => import("../components/organisation admin/customers/CustomersPage"),
);
const EmployeesPage = lazy(
  () => import("../components/organisation admin/employees/EmployeesPage"),
);
const AddEmployee = lazy(
  () => import("../components/organisation admin/employees/AddEmployee"),
);
const QueueDashboard = lazy(
  () => import("../components/organisation admin/queues/QueueDashboard"),
);
const ServiceList = lazy(
  () => import("../components/organisation admin/service/ServiceList"),
);
const AddService = lazy(
  () => import("../components/organisation admin/service/AddService"),
);
const ServiceTypeList = lazy(
  () => import("../components/organisation admin/servicetype/ServiceTypeList"),
);
const AddServiceType = lazy(
  () => import("../components/organisation admin/servicetype/AddServiceType"),
);
const ShiftsPage = lazy(
  () => import("../components/organisation admin/shifts/ShiftsPage"),
);
const SimulationPage = lazy(() => import("../pages/SimulationPage"));

// Employee
const EmployeeLayout = lazy(
  () => import("../components/layout/EmployeeLayout"),
);
const Dashboard = lazy(() => import("../components/employeeportal/Dashboard"));
const MyQueue = lazy(() => import("../components/employeeportal/MyQueue"));
const MySchedule = lazy(
  () => import("../components/employeeportal/MySchedule"),
);
const MyPerformance = lazy(
  () => import("../components/employeeportal/MyPerformance"),
);

function AddEmployeeRoute() {
  const navigate = useNavigate();

  return (
    <AddEmployee
      onClose={() => navigate("/org-admin/employees")}
      onCreated={() => navigate("/org-admin/employees")}
    />
  );
}

function AddServiceTypeRoute() {
  const navigate = useNavigate();

  return (
    <AddServiceType
      onClose={() => navigate("/org-admin/service-categories")}
      onCreated={() => navigate("/org-admin/service-categories")}
    />
  );
}

function AddServiceRoute() {
  const navigate = useNavigate();

  return (
    <AddService
      onClose={() => navigate("/org-admin/services")}
      onCreated={() => navigate("/org-admin/services")}
    />
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <SidebarProvider>
        <Suspense
          fallback={
            <div
              style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                fontFamily: "Arial, sans-serif",
                color: "#667085",
              }}
            >
              Loading...
            </div>
          }
        >
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />

            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/forgot-password/reset-password"
              element={<ResetPassword />}
            />
            <Route path="/register" element={<RegisterOrganization />} />
            <Route path="/book" element={<BookAppointment />} />
            <Route path="/feedback/:token" element={<Feedback />} />

            <Route
              path="/first-login/change-password"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <ChangePassword standalone />
                </ProtectedRoute>
              }
            />

            {/* SUPER ADMIN */}
            <Route
              path="/super-admin"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <SuperAdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />

              <Route path="dashboard" element={<SuperAdminDashboard />} />

              <Route path="categories" element={<CategoryList />} />

              <Route path="categories/add" element={<CategoryList />} />

              <Route path="categories/update/:id" element={<CategoryList />} />

              <Route path="organizations" element={<OrganizationList />} />

              <Route path="users" element={<UsersList />} />

              <Route path="audit-logs" element={<AuditLogsList />} />

              <Route path="subscriptions" element={<SubscriptionsList />} />

              <Route path="plans" element={<PlansPage />} />

              <Route path="plans/add" element={<PlansPage />} />

              <Route path="plans/edit/:id" element={<PlansPage />} />

              <Route path="profile" element={<MyProfile />} />

              <Route path="change-password" element={<ChangePassword />} />

              <Route path="reports" element={<SuperAdminReports />} />
            </Route>

            {/* ORGANIZATION ADMIN */}
            <Route
              path="/org-admin"
              element={
                <ProtectedRoute allowedRoles={["org_admin"]}>
                  <OrgAdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />

              <Route path="dashboard" element={<OrgAdminDashboard />} />

              <Route path="appointments" element={<AppointmentsPage />} />

              <Route path="appointments/new" element={<CreateAppointment />} />

              <Route path="customers" element={<CustomersPage />} />

              <Route path="employees" element={<EmployeesPage />} />

              <Route path="employees/add" element={<AddEmployeeRoute />} />

              <Route path="shifts" element={<ShiftsPage />} />

              <Route path="queues" element={<QueueDashboard />} />

              <Route path="services" element={<ServiceList />} />

              <Route path="services/add" element={<AddServiceRoute />} />

              <Route path="service-categories" element={<ServiceTypeList />} />

              <Route
                path="service-categories/add"
                element={<AddServiceTypeRoute />}
              />

              <Route path="simulations" element={<SimulationPage />} />

              <Route path="audit-logs" element={<AuditLogsList />} />

              <Route path="reports" element={<OrganizationReports />} />

              <Route path="profile" element={<MyProfile />} />

              <Route path="change-password" element={<ChangePassword />} />
            </Route>

            {/* EMPLOYEE */}
            <Route
              path="/employee"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <EmployeeLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />

              <Route path="dashboard" element={<Dashboard />} />

              <Route path="my-queue" element={<MyQueue />} />

              <Route path="my-schedule" element={<MySchedule />} />

              <Route path="performance" element={<MyPerformance />} />

              <Route path="profile" element={<MyProfile />} />

              <Route path="change-password" element={<ChangePassword />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </SidebarProvider>
    </BrowserRouter>
  );
}

export default AppRoutes;
