import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { SidebarProvider } from "../components/layout/SidebarContext";
import RegisterOrganization from "../components/super_admin/organization/RegisterOrganization";

// Super Admin
import Login from "../components/super_admin/authentication/Login";
import ForgotPassword from "../components/super_admin/authentication/ForgotPassword";
import ResetPassword from "../components/super_admin/authentication/ResetPassword";
import SuperAdminLayout from "../components/layout/SuperAdminLayout";
import SuperAdminDashboard from "../components/super_admin/dashboard/SuperAdminDashboard";
import OrganizationList from "../components/super_admin/organization/OrganizationList";
import CategoryList from "../components/super_admin/category/CategoryList";
import UsersList from "../components/super_admin/users/UsersList";
import AuditLogsList from "../components/audit_logs/AuditLogsList";
import SubscriptionsList from "../components/super_admin/subscriptions/SubscriptionsList";

import PlansPage from "../components/super_admin/plans/Plans";
import SuperAdminReports from "../components/super_admin/reports/SuperAdminReports";
import MyProfile from "../components/profile/MyProfile";
import ChangePassword from "../components/profile/ChangePassword";

// Org Admin
import OrgAdminLayout from "../components/layout/OrgAdminLayout";
import OrgAdminDashboard from "../components/organisation admin/dashboard/OrgAdminDashboard";
import OrganizationReports from "../components/organisation admin/reports/OrganizationReports";
import AppointmentsPage from "../components/organisation admin/appointments/AppointmentsPage";
import CreateAppointment from "../components/organisation admin/appointments/CreateAppointment";
import CustomersPage from "../components/organisation admin/customers/CustomersPage";
import EmployeesPage from "../components/organisation admin/employees/EmployeesPage";
import AddEmployee from "../components/organisation admin/employees/AddEmployee";
import QueueDashboard from "../components/organisation admin/queues/QueueDashboard";
import ServiceList from "../components/organisation admin/service/ServiceList";
import AddService from "../components/organisation admin/service/AddService";
import ServiceTypeList from "../components/organisation admin/servicetype/ServiceTypeList";
import AddServiceType from "../components/organisation admin/servicetype/AddServiceType";
import ShiftsPage from "../components/organisation admin/shifts/ShiftsPage";

import EmployeeLayout from "../components/layout/EmployeeLayout";
import Dashboard from "../components/employeeportal/Dashboard";
import MyQueue from "../components/employeeportal/MyQueue";
import MySchedule from "../components/employeeportal/MySchedule";
import MyPerformance from "../components/employeeportal/MyPerformance";

import BookAppointment from "../components/Public/Bookappointment";
import Feedback from "../components/Public/Feedback";
import LandingPage from "../pages/LandingPage";
import SimulationPage from "../pages/SimulationPage";

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
        <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgot-password/reset-password" element={<ResetPassword />} />
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

        {/* ---------------- SUPER ADMIN ---------------- */}
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

        {/* ---------------- ORG ADMIN ---------------- */}
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
          <Route path="service-categories/add" element={<AddServiceTypeRoute />} />
          <Route path="simulations" element={<SimulationPage />} />
          <Route path="audit-logs" element={<AuditLogsList />} />
          <Route path="reports" element={<OrganizationReports />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>

        {/* ---------------- EMPLOYEE ---------------- */}
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
      </SidebarProvider>
    </BrowserRouter>
  );
}

export default AppRoutes;