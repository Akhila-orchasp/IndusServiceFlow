import type * as React from "react";

type ResponsiveStyleProp<T = string | number> = T | null | Array<T | null> | Record<string, T | null>;

declare module "@mui/material/Stack" {
  interface StackOwnProps {
    alignItems?: ResponsiveStyleProp;
    justifyContent?: ResponsiveStyleProp;
    textAlign?: ResponsiveStyleProp;
    mb?: ResponsiveStyleProp;
    mt?: ResponsiveStyleProp;
    ml?: ResponsiveStyleProp;
  }
}

declare module "@mui/material/Grid" {
  interface GridBaseProps {
    alignItems?: ResponsiveStyleProp;
    justifyContent?: ResponsiveStyleProp;
    textAlign?: ResponsiveStyleProp;
    mb?: ResponsiveStyleProp;
    mt?: ResponsiveStyleProp;
    ml?: ResponsiveStyleProp;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyOwnProps {
    fontSize?: ResponsiveStyleProp;
    fontWeight?: ResponsiveStyleProp;
    color?: ResponsiveStyleProp;
    mb?: ResponsiveStyleProp;
    mt?: ResponsiveStyleProp;
  }
}

declare module "@mui/material/Menu" {
  interface MenuProps {
    PaperProps?: Record<string, unknown>;
  }
}
