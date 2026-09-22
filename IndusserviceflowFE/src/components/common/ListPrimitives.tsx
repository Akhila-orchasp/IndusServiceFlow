import type { IconType } from "react-icons";
import { FaSearch, FaPen, FaTrash } from "react-icons/fa";

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBox = ({ value, onChange, placeholder = "Search..." }: SearchBoxProps) => (
  <div className="oa-search">
    <FaSearch />
    <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

interface StatCardData {
  icon: IconType;
  value: number | string;
  label: string;
  tone?: "teal" | "green" | "red" | "blue";
}

export const StatRow = ({ stats }: { stats: StatCardData[] }) => (
  <div className="oa-stat-row">
    {stats.map((s, i) => (
      <div className="oa-stat-card" key={i}>
        <div className={`oa-stat-icon ${s.tone ?? "teal"}`}>
          <s.icon />
        </div>
        <div>
          <div className="oa-stat-value">{s.value}</div>
          <div className="oa-stat-label">{s.label}</div>
        </div>
      </div>
    ))}
  </div>
);

/* ---------- StatusBadge ----------
   Replaces <span className={`oa-badge ${status === "Active" ? "green" : "red"}`}> */
export const StatusBadge = ({ status }: { status: "Active" | "Inactive" }) => (
  <span className={`oa-badge ${status === "Active" ? "green" : "red"}`}>{status}</span>
);

/* ---------- EmptyState ----------
   Replaces <div className="oa-empty-state">...</div> loading/empty text blocks. */
export const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <div className="oa-empty-state">{children}</div>
);

/* ---------- RowActions ----------
   Replaces the repeated edit/delete icon-button pair on every card/row. */
interface RowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
}

export const RowActions = ({ onEdit, onDelete, deleteDisabled }: RowActionsProps) => {
  return (
    <div className="oa-category-card-actions">
      {onEdit && (
        <button
          type="button"
          className="oa-row-icon-btn blue"
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <FaPen />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="oa-row-icon-btn red"
          title="Delete"
          disabled={deleteDisabled}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <FaTrash />
        </button>
      )}
    </div>
  );
};