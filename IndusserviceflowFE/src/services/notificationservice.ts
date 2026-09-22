import api from "./api";
const API = api;

export type NotificationScope =
  | { level: "employee"; employeeId: string | number }
  | { level: "org"; orgId: string | number }
  | { level: "super" };

const scopeParams = (scope: NotificationScope): Record<string, any> => {
  switch (scope.level) {
    case "employee":
      return { recipient_type: "Employee", employee_id: scope.employeeId };
    case "org":
      return { recipient_type: "OrganizationAdmin" };
    case "super":
      return { recipient_type: "Organization" };
  }
};

export const getNotifications = (scope: NotificationScope, extraParams?: Record<string, any>) => {
  return API.get("notifications/", { params: { ...scopeParams(scope), page_size: 15, ...extraParams } });
};

export const getUnreadNotificationCount = (scope: NotificationScope) => {
  return API.get("notifications/unread-count/", { params: scopeParams(scope) });
};

export const markNotificationRead = (notificationId: string | number) => {
  return API.post(`notifications/${notificationId}/mark-read/`);
};

export const markAllNotificationsRead = (scope: NotificationScope) => {
  return API.post("notifications/mark-all-read/", null, { params: scopeParams(scope) });
};

export default API;