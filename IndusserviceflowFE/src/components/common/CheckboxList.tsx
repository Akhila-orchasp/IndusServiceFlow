interface CheckboxOption {
  id: number;
  label: string;
}

interface CheckboxListProps {
  label: string;
  options: CheckboxOption[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  emptyHint?: string;
  full?: boolean;
}

const CheckboxList = ({ label, options, selectedIds, onToggle, emptyHint, full = true }: CheckboxListProps) => (
  <div className={`oa-field${full ? " full" : ""}`}>
    <label>{label}</label>
    {options.length === 0 ? (
      <p className="oa-modal-hint">{emptyHint}</p>
    ) : (
      <div className="oa-checkbox-list">
        {options.map((opt) => (
          <label key={opt.id} className="oa-checkbox-item">
            <input type="checkbox" checked={selectedIds.has(opt.id)} onChange={() => onToggle(opt.id)} />
            {opt.label}
          </label>
        ))}
      </div>
    )}
  </div>
);

export default CheckboxList;