import type { ReactNode } from "react";
import { Box, Paper, Button, Typography, Stack } from "@mui/material";
import { ArrowBack, Save, Close } from "@mui/icons-material";
import { ThemeProvider } from "@mui/material/styles";
import superAdminMuiTheme from "../../theme/superAdminMuiTheme";

interface FormPageProps {
  title: string;
  onBack: () => void;
  closeMode?: boolean;
  saving: boolean;
  saveLabel: string;
  savingLabel: string;
  onSubmit: (e: React.FormEvent) => void;
  children: ReactNode;
}

const FormPage = ({ title, onBack, closeMode, saving, saveLabel, savingLabel, onSubmit, children }: FormPageProps) => (
  <ThemeProvider theme={superAdminMuiTheme}>
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5, maxWidth: 720, mx: "auto" }}>
      <Button
        startIcon={closeMode ? <Close fontSize="small" /> : <ArrowBack fontSize="small" />}
        onClick={onBack}
        sx={{ mb: 2, color: "text.secondary" }}
      >
        {closeMode ? "Close" : "Back"}
      </Button>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        {title}
      </Typography>

      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3 }}>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2.5}>{children}</Stack>

          <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end", mt: 4 }}>
            <Button variant="outlined" color="inherit" onClick={onBack}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" startIcon={<Save fontSize="small" />} disabled={saving}>
              {saving ? savingLabel : saveLabel}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  </ThemeProvider>
);

export default FormPage;