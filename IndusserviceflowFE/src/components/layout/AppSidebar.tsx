import type { ReactNode, ElementType } from "react";
import { NavLink } from "react-router-dom";
import { FaSignOutAlt } from "react-icons/fa";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

interface AppSidebarProps {
  navItems: NavItem[];
  onLogout: () => void;

  brandIcon: ReactNode;
  brandTitle: string;
  brandSubtitle: string;
  rootClassName: string;
  logoSectionClassName?: string;
  logoMarkClassName?: string;
  logoTextWrapClassName?: string;
  navClassName?: string;
  navLinkClassName?: (isActive: boolean) => string;
  logoutClassName?: string;
  titleTag?: "h1" | "h2";
  navTag?: "ul" | "nav";
  navItemTag?: "li" | null;
  logoutTag?: "div" | "button";
  isOpen?: boolean;
  onCloseOverlay?: () => void;
  collapsed?: boolean;
  collapseToggle?: ReactNode;
}

const AppSidebar = ({
  navItems,
  onLogout,
  brandIcon,
  brandTitle,
  brandSubtitle,
  rootClassName,
  logoSectionClassName = "logo-section",
  logoMarkClassName = "logo",
  logoTextWrapClassName,
  navClassName = "menu",
  navLinkClassName,
  logoutClassName = "logout",
  titleTag = "h2",
  navTag = "ul",
  navItemTag = "li",
  logoutTag = "div",
  isOpen,
  onCloseOverlay,
  collapsed,
  collapseToggle,
}: AppSidebarProps) => {
  const TitleTag = titleTag as ElementType;
  const NavTag = navTag as ElementType;
  const LogoutTag = logoutTag as ElementType;

  const asideClass = [
    rootClassName,
    isOpen ? `${rootClassName.split(" ")[0]}-open` : "",
    collapsed ? `${rootClassName.split(" ")[0]}--collapsed` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const resolveLinkClass = (isActive: boolean) =>
    navLinkClassName ? navLinkClassName(isActive) : isActive ? "active-link" : "";

  const links = navItems.map((item) => {
    const link = (
      <NavLink to={item.to} className={({ isActive }) => resolveLinkClass(isActive)} onClick={onCloseOverlay} title={item.label}>
        {item.icon}
        <span>{item.label}</span>
      </NavLink>
    );
    return navItemTag ? (
      <li key={item.to}>{link}</li>
    ) : (
      <span key={item.to} style={{ display: "contents" }}>
        {link}
      </span>
    );
  });

  const logoutProps =
    LogoutTag === "button"
      ? { type: "button" as const, onClick: onLogout, title: "Logout" }
      : {
          onClick: onLogout,
          role: "button" as const,
          tabIndex: 0,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") onLogout();
          },
        };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onCloseOverlay} aria-hidden="true" />}

      <aside className={asideClass}>
        <div className={logoSectionClassName}>
          <div className={logoMarkClassName}>{brandIcon}</div>
          <div className={logoTextWrapClassName}>
            <TitleTag>{brandTitle}</TitleTag>
            <p>{brandSubtitle}</p>
          </div>
          {collapseToggle}
        </div>

        <NavTag className={navClassName}>{links}</NavTag>

        <LogoutTag className={logoutClassName} {...logoutProps}>
          <FaSignOutAlt />
          <span>Logout</span>
        </LogoutTag>
      </aside>
    </>
  );
};

export default AppSidebar;