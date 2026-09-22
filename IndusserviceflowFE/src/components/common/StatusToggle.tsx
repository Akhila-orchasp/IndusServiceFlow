interface StatusOption<T extends string> {
  value: T;
  label: string;
  activeClass?: string;
}

interface StatusToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  label?: string;
  options?: StatusOption<T>[];
  full?: boolean;
}

function StatusToggle<T extends string = "Active" | "Inactive">({
  value,
  onChange,
  label = "Status",
  options,
  full = true,
}: StatusToggleProps<T>) {
  const resolved: StatusOption<T>[] =
    options ??
    ([
      { value: "Active", label: "Active", activeClass: "on" },
      { value: "Inactive", label: "Inactive", activeClass: "off" },
    ] as unknown as StatusOption<T>[]);

  return (
    <div className={`oa-field${full ? " full" : ""}`}>
      <label>{label}</label>
      <div className="oa-status-toggle">
        {resolved.map((opt, i) => {
          const fallbackClass = i === 0 ? "on" : i === resolved.length - 1 ? "off" : "hold";
          return (
            <button
              key={opt.value}
              type="button"
              className={value === opt.value ? `active ${opt.activeClass ?? fallbackClass}` : ""}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default StatusToggle;