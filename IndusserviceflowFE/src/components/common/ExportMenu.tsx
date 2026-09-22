import { Menu, MenuItem, ListItemIcon, ListItemText, Box } from "@mui/material";

const FileTypeBadge = ({
  fill,
  fold,
  label,
}: {
  fill: string;
  fold: string;
  label: string;
}) => (
  <Box component="svg" viewBox="0 0 32 40" sx={{ width: 18, height: 22, flexShrink: 0 }}>
    <path d="M4 2 H20 L28 10 V38 H4 Z" fill={fill} />
    <path d="M20 2 L28 10 H20 Z" fill={fold} />
    <text
      x="16"
      y="27"
      textAnchor="middle"
      fontSize="9"
      fontWeight="700"
      fontFamily="Arial, sans-serif"
      fill="#fff"
    >
      {label}
    </text>
  </Box>
);

const CsvFileIcon = () => <FileTypeBadge fill="#22A366" fold="#16794D" label="CSV" />;
const ExcelFileIcon = () => <FileTypeBadge fill="#21A366" fold="#158A50" label="X" />;
const PdfFileIcon = () => <FileTypeBadge fill="#E4362A" fold="#B02A20" label="PDF" />;

export type ExportFormat = "csv" | "excel" | "pdf";

interface ExportMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
}

const ExportMenu = ({ anchorEl, onClose, onExport }: ExportMenuProps) => (
  <Menu
    anchorEl={anchorEl}
    open={Boolean(anchorEl)}
    onClose={onClose}
    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    transformOrigin={{ vertical: "top", horizontal: "right" }}
    slotProps={{ paper: {
      sx: {
        borderRadius: 2,
        minWidth: 150,
        mt: 0.5,
        py: 0.5,
        boxShadow: "0 12px 32px rgba(15,23,42,0.16)",
      },
    } }}
  >
    <MenuItem onClick={() => onExport("csv")} sx={{ py: 0.75, gap: 1 }}>
      <ListItemIcon sx={{ minWidth: "auto !important", marginRight: 0 }}>
        <CsvFileIcon />
      </ListItemIcon>
      <ListItemText sx={{ my: 0 }} slotProps={{ primary: { sx: { fontWeight: 500, fontSize: "0.9rem" } } }}>
        CSV
      </ListItemText>
    </MenuItem>
    <MenuItem onClick={() => onExport("excel")} sx={{ py: 0.75, gap: 1 }}>
      <ListItemIcon sx={{ minWidth: "auto !important", marginRight: 0 }}>
        <ExcelFileIcon />
      </ListItemIcon>
      <ListItemText sx={{ my: 0 }} slotProps={{ primary: { sx: { fontWeight: 500, fontSize: "0.9rem" } } }}>
        Excel
      </ListItemText>
    </MenuItem>
    <MenuItem onClick={() => onExport("pdf")} sx={{ py: 0.75, gap: 1 }}>
      <ListItemIcon sx={{ minWidth: "auto !important", marginRight: 0 }}>
        <PdfFileIcon />
      </ListItemIcon>
      <ListItemText sx={{ my: 0 }} slotProps={{ primary: { sx: { fontWeight: 500, fontSize: "0.9rem" } } }}>
        PDF
      </ListItemText>
    </MenuItem>
  </Menu>
);

export default ExportMenu;