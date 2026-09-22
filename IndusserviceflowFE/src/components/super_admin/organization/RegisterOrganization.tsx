import { registerOrganizationWithPlan, getRegistrationPaymentStatus, simulateRegistrationPayment, getCategories } from "../../../services/api";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Autocomplete,
  Button,
  InputAdornment,
  ThemeProvider,
  CssBaseline,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import PlanPicker from "../../subscription/PlanPicker";
import BillingCycleStep from "../../subscription/BillingCycleStep";
import RazorpayPaymentPanel from "../../subscription/RazorpayPaymentPanel";
import StatusScreen from "../../subscription/StatusScreen";
import type { BillingCycle, PaymentStatus, PublicPlan, SubscriptionCreationResult } from "../../../types/subscription";
import {
  Business as BuildingIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Public as CountryIcon,
  Waves as BrandIcon,
  CheckBox as CheckBadgeIcon,
  Badge as PanIcon,
  ReceiptLong as GstIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import Toast from "../../common/Toast";
import type { ToastType } from "../../common/Toast";
import {
  validateOrgNameField,
  validateNameField,
  validateMobile,
  validateEmail,
  validateAddress,
  validatePincodeForCity,
  validateRequiredSelect,
  validatePAN,
  validateGSTIN,
  CITY_OPTIONS,
} from "../../../utils/validators";
import loginHero from "../../../assets/login-hero.png";
import superAdminMuiTheme from "../../../theme/superAdminMuiTheme";

const AUTH_KEYFRAMES = {
  "@keyframes cardIn": {
    from: { opacity: 0, transform: "translateY(18px) scale(0.98)" },
    to: { opacity: 1, transform: "translateY(0) scale(1)" },
  },
  "@keyframes fadeUp": {
    from: { opacity: 0, transform: "translateY(10px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
  "@keyframes fadeUpTo92": {
    from: { opacity: 0, transform: "translateY(10px)" },
    to: { opacity: 0.92, transform: "translateY(0)" },
  },
  "@keyframes fadeUpTo55": {
    from: { opacity: 0, transform: "translateY(10px)" },
    to: { opacity: 0.55, transform: "translateY(0)" },
  },
  "@keyframes shimmerBar": {
    "0%": { backgroundPosition: "0% 50%" },
    "100%": { backgroundPosition: "200% 50%" },
  },
  "@keyframes heroPan": {
    "0%": { backgroundPosition: "50% 50%" },
    "100%": { backgroundPosition: "54% 46%" },
  },
};

const fadeUpStep = (index: number, restOpacity = 1) => ({
  opacity: 0,
  animation: `fadeUp${restOpacity !== 1 ? `To${Math.round(restOpacity * 100)}` : ""} 0.5s ease-out forwards`,
  animationDelay: `${0.15 + index * 0.08}s`,
});

const heroPanAnimation = "heroPan 18s ease-in-out infinite alternate";
const shimmerBarAnimation = "shimmerBar 4s linear infinite";

// --- Left hero panel (same as Login page) ---------------------------------

function HeroPanel() {
  return (
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        color: "#fff",
        boxSizing: "border-box",
        p: { md: 5, lg: 6 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ...fadeUpStep(0) }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            flexShrink: 0,
          }}
        >
          <BrandIcon sx={{ fontSize: 21 }} />
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: 19, letterSpacing: 0.2 }}>
          Indus<Box component="span" sx={{ color: "#7c8cff" }}>ServiceFlow</Box>
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 520, mb: 10 }}>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.5,
            py: 0.5,
            mb: 2.5,
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.18)",
            backgroundColor: "rgba(255,255,255,0.06)",
            ...fadeUpStep(1),
          }}
        >
          <CheckBadgeIcon sx={{ fontSize: 13 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Get Started in Minutes</Typography>
        </Box>

        <Typography
          sx={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 800,
            fontSize: { md: 34, lg: 40 },
            lineHeight: 1.18,
            mb: 2,
            textShadow: "0 2px 12px rgba(0,0,0,0.55)",
            ...fadeUpStep(2),
          }}
        >
          Bring your organisation's queues online.
        </Typography>

        <Typography
          variant="body2"
          sx={{
            fontSize: 14.5,
            lineHeight: 1.6,
            maxWidth: 440,
            textShadow: "0 1px 8px rgba(0,0,0,0.5)",
            ...fadeUpStep(3, 0.92),
          }}
        >
          Set up services, staff, and appointment slots in one place — and start simulating
          real-time queue performance from day one.
        </Typography>
      </Box>

      <Typography sx={{ fontSize: 11.5, letterSpacing: 0.5, ...fadeUpStep(4, 0.55) }}>
        © 2026 INDUSSERVICEFLOW PLATFORM
      </Typography>
    </Box>
  );
}

type WizardStep = "details" | "plan" | "billing" | "payment" | "status";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={superAdminMuiTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", display: "flex", ...AUTH_KEYFRAMES }}>
        <Box
          sx={{
            flex: "0 0 50%",
            display: { xs: "none", md: "block" },
            position: "sticky",
            top: 0,
            alignSelf: "flex-start",
            height: "100vh",
            overflow: "hidden",
            backgroundImage: `linear-gradient(180deg, rgba(6,10,20,0.72) 0%, rgba(6,10,20,0.6) 45%, rgba(6,10,20,0.74) 100%), url(${loginHero})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            animation: heroPanAnimation,
          }}
        >
          <HeroPanel />
        </Box>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            p: 2,
            py: 5,
            backgroundColor: "#f4f6fb",
            backgroundImage:
              "radial-gradient(circle at 85% 15%, rgba(14,165,233,0.08), transparent 45%), radial-gradient(circle at 15% 85%, rgba(79,70,229,0.08), transparent 45%)",
          }}
        >
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

const WIZARD_STEPS: { key: WizardStep; label: string }[] = [
  { key: "details", label: "Organisation" },
  { key: "plan", label: "Plan" },
  { key: "billing", label: "Billing" },
  { key: "payment", label: "Payment" },
  { key: "status", label: "Approval" },
];

const WIZARD_COPY: Record<Exclude<WizardStep, "details">, { title: string; subtitle: string }> = {
  plan: {
    title: "Select a plan",
    subtitle: "Choose the plan that fits your organisation — you can change this later from your dashboard.",
  },
  billing: {
    title: "Select billing cycle",
    subtitle: "Pick how you'd like to be billed for the plan you selected.",
  },
  payment: {
    title: "Complete payment",
    subtitle: "Scan and pay securely via Razorpay to continue your registration.",
  },
  status: {
    title: "Almost there",
    subtitle: "Your registration is one step away from going live.",
  },
};
function WizardLayout({
  step,
  onBack,
  children,
}: {
  step: Exclude<WizardStep, "details">;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  const activeIndex = WIZARD_STEPS.findIndex((s) => s.key === step);
  const copy = WIZARD_COPY[step];
  const wide = step === "plan";

  return (
    <ThemeProvider theme={superAdminMuiTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f4f6fb",
          backgroundImage:
            "radial-gradient(circle at 85% 8%, rgba(14,165,233,0.10), transparent 45%), radial-gradient(circle at 10% 92%, rgba(79,70,229,0.09), transparent 45%)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            px: { xs: 2.5, sm: 5 },
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(8px)",
            position: "sticky",
            top: 0,
            zIndex: 2,
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              backgroundImage: "linear-gradient(135deg, #0EA5E9, #4F46E5)",
            }}
          >
            IS
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, fontFamily: "'Sora', sans-serif" }}>
            IndusServiceFlow
          </Typography>
        </Box>

        <Box sx={{ maxWidth: 760, mx: "auto", width: "100%", px: { xs: 2, sm: 3 }, pt: { xs: 4, sm: 5 }, pb: 1 }}>
          <Stepper activeStep={activeIndex} alternativeLabel>
            {WIZARD_STEPS.map((s) => (
              <Step key={s.key}>
                <StepLabel>{s.label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box sx={{ flex: 1, display: "flex", justifyContent: "center", px: { xs: 2, sm: 3 }, pt: { xs: 3, sm: 4 }, pb: 8 }}>
          <Paper
            elevation={0}
            sx={{
              position: "relative",
              width: wide ? 1180 : 560,
              maxWidth: "100%",
              height: "fit-content",
              p: { xs: 3, sm: 5 },
              pt: 5.5,
              borderRadius: 4,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 24px 64px rgba(14,60,97,0.14)",
              animation: "cardIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards",
              transition: "width 200ms ease",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 5,
                backgroundImage: "linear-gradient(90deg, #0EA5E9, #2563EB, #4F46E5, #0EA5E9)",
                backgroundSize: "200% 100%",
                animation: shimmerBarAnimation,
              }}
            />

            {onBack && (
              <Button
                onClick={onBack}
                startIcon={<ArrowBackIcon fontSize="small" />}
                color="inherit"
                size="small"
                sx={{ mb: 1.5, ml: -1, textTransform: "none", fontWeight: 600, color: "text.secondary" }}
              >
                Back
              </Button>
            )}
            <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }} gutterBottom>
              {copy.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 560 }}>
              {copy.subtitle}
            </Typography>

            {children}
          </Paper>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // Union territories
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

function RegisterOrganization() {
  const [formData, setFormData] = useState({
    organizationName: "",
    category: "",
    organizationMobile: "",
    organizationEmail: "",
    contactPerson: "",
    contactMobile: "",
    contactEmail: "",
    address: "",
    city: "",
    pincode: "",
    state: "",
    country: "India",
    panNumber: "",
    gstNumber: "",
  });
  const [errors, setErrors] = useState({
    organizationName: "",
    category: "",
    organizationMobile: "",
    organizationEmail: "",
    contactPerson: "",
    contactMobile: "",
    contactEmail: "",
    address: "",
    city: "",
    pincode: "",
    state: "",
    panNumber: "",
    gstNumber: "",
  });
  const [step, setStep] = useState<WizardStep>("details");
  const [selectedPlan, setSelectedPlan] = useState<PublicPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [regResult, setRegResult] = useState<SubscriptionCreationResult | null>(null);
  const navigate = useNavigate();
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [categories, setCategories] = useState<
    { id: number; category_name: string }[]
  >([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        setCategories(response?.data ?? []);
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "organizationName":
        return validateOrgNameField(value, "Organization Name");
      case "category":
        return validateRequiredSelect(value, "category");
      case "organizationMobile":
        return validateMobile(value, "Organization Mobile");
      case "contactMobile":
        return validateMobile(value, "Mobile Number");
      case "organizationEmail":
        return validateEmail(value, "Organization Email");
      case "contactEmail":
        return validateEmail(value, "Email Address");
      case "contactPerson":
        return validateNameField(value, "Contact Person Name");
      case "address":
        return validateAddress(value, "Address");
      case "city":
        return validateRequiredSelect(value, "city");
      case "pincode":
        return validatePincodeForCity(value, formData.city);
      case "state":
        return validateRequiredSelect(value, "state");
      case "panNumber":
        return validatePAN(value, "PAN Number");
      case "gstNumber":
        return validateGSTIN(value, "GST Number");
      default:
        return "";
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } },
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: touched[name] ? validateField(name, value) : "",
    }));
  };
  const cityOptionsForState = CITY_OPTIONS.filter((c) => c.state === formData.state);
  const handleStateChange = (e: { target: { name: string; value: string } }) => {
    const { value } = e.target;

    setFormData((prev) => ({ ...prev, state: value, city: "", pincode: "" }));

    setErrors((prev) => ({
      ...prev,
      state: touched.state ? validateField("state", value) : "",
      city: "",
      pincode: "",
    }));
  };

  const handleCityChange = (e: { target: { name: string; value: string } }) => {
    const { value } = e.target;
    const match = cityOptionsForState.find((c) => c.name === value);
    const nextPincode = match ? match.pincode : formData.pincode;

    setFormData((prev) => ({ ...prev, city: value, pincode: nextPincode }));

    setErrors((prev) => ({
      ...prev,
      city: touched.city ? validateField("city", value) : "",
      pincode: touched.pincode ? validatePincodeForCity(nextPincode, value) : "",
    }));
  };
  const handleStateAutocompleteChange = (_: unknown, value: string | null) => {
    handleStateChange({ target: { name: "state", value: value ?? "" } });
  };

  const handleCityAutocompleteChange = (_: unknown, value: string | null) => {
    handleCityChange({ target: { name: "city", value: value ?? "" } });
  };

  const handleStateBlur = () => {
    setTouched((prev) => ({ ...prev, state: true }));
    setErrors((prev) => ({ ...prev, state: validateField("state", formData.state) }));
  };

  const handleCityBlur = () => {
    setTouched((prev) => ({ ...prev, city: true }));
    setErrors((prev) => ({ ...prev, city: validateField("city", formData.city) }));
  };

  const handleDigitsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    maxLength: number,
  ) => {
    const { name, value: initialValue } = e.target as HTMLInputElement;
    const value = initialValue.replace(/\D/g, "").slice(0, maxLength);

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: touched[name] ? validateField(name, value) : "",
    }));
  };
  const handleLettersChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    maxLength?: number,
  ) => {
    const { name, value: initialValue } = e.target as HTMLInputElement;
    let value = initialValue.replace(/[^A-Za-z\s]/g, "");
    if (maxLength) value = value.slice(0, maxLength);

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: touched[name] ? validateField(name, value) : "",
    }));
  };
  const handleUppercaseChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    maxLength: number,
  ) => {
    const { name, value: initialValue } = e.target as HTMLInputElement;
    const value = initialValue.toUpperCase().slice(0, maxLength);

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: touched[name] ? validateField(name, value) : "",
    }));
  };
  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateForm = () => {
    const fieldNames = [
      "organizationName",
      "category",
      "organizationMobile",
      "organizationEmail",
      "contactPerson",
      "contactMobile",
      "contactEmail",
      "address",
      "city",
      "pincode",
      "state",
      "panNumber",
      "gstNumber",
    ] as const;

    const newErrors: Record<string, string> = {};
    let isValid = true;

    fieldNames.forEach((name) => {
      const message = validateField(name, (formData as any)[name]);
      newErrors[name] = message;
      if (message) isValid = false;
    });

    setErrors(newErrors as typeof errors);
    setTouched((prev) => {
      const allTouched = { ...prev };
      fieldNames.forEach((name) => {
        allTouched[name] = true;
      });
      return allTouched;
    });

    return isValid;
  };

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null,
  );
  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setStep("plan");
  };

  const buildOrgPayload = () => ({
    organization_name: formData.organizationName,
    mobile: formData.organizationMobile,
    email: formData.organizationEmail,
    contact_person_name: formData.contactPerson,
    contact_mobile: formData.contactMobile,
    contact_email: formData.contactEmail,
    address: formData.address,
    city: formData.city,
    pincode: formData.pincode,
    state: formData.state,
    country: formData.country,
    category: Number(formData.category),
    pan_number: formData.panNumber.trim().toUpperCase(),
    gst_number: formData.gstNumber.trim() ? formData.gstNumber.trim().toUpperCase() : "",
  });

  const handleBillingConfirm = async () => {
    if (!selectedPlan || !billingCycle) return;

    const payload = {
      ...buildOrgPayload(),
      plan_id: selectedPlan.id,
      billing_cycle: billingCycle,
    };

    try {
      setSubmitting(true);

      const response = await registerOrganizationWithPlan(payload);
      const data: SubscriptionCreationResult = response?.data ?? response;

      if (!data?.subscription?.plan_name || !data?.subscription?.billing_cycle) {
        setToast({
          type: "error",
          message: "Registration could not be confirmed without a valid plan. Please try again.",
        });
        return;
      }

      setRegResult(data);
      const goingStraightToStatus =
        data.subscription.is_free_trial || data.subscription.payment_status === "paid";

      if (goingStraightToStatus) {
        setToast({
          type: "success",
          message: data?.message || "Organization registered successfully.",
        });
        setStep("status");
      } else {
        setStep("payment");
      }
    } catch (error: any) {
      console.error("Full Error:", error);

      const data = error.response?.data || {};
      const fieldErrorMap: Record<string, string> = {
        organization_name: "organizationName",
        email: "organizationEmail",
        mobile: "organizationMobile",
      };

      let duplicateMessage = "";
      Object.entries(fieldErrorMap).forEach(([backendKey, localField]) => {
        const fieldMessage = data[backendKey];
        if (fieldMessage) {
          const text = Array.isArray(fieldMessage) ? fieldMessage[0] : String(fieldMessage);
          setErrors((prev) => ({ ...prev, [localField]: text }));
          if (!duplicateMessage) duplicateMessage = text;
        }
      });

      setToast({
        type: "error",
        message: duplicateMessage || data.message || "Registration Failed",
      });
      if (duplicateMessage) setStep("details");
    } finally {
      setSubmitting(false);
    }
  };

  const pollRegistrationPayment = async (): Promise<PaymentStatus> => {
    if (!regResult) return "pending";
    const response = await getRegistrationPaymentStatus(regResult.subscription.id);
    const data = response?.data ?? response;
    return data.payment_status as PaymentStatus;
  };

  const inputProps = (icon: React.ReactNode) => ({
    startAdornment: <InputAdornment position="start">{icon}</InputAdornment>,
  });

  const wizardContent = (() => {
    switch (step) {
      case "plan":
        return (
          <PlanPicker
            selectedPlanId={selectedPlan?.id}
            onSelect={(plan) => {
              setSelectedPlan(plan);
              setBillingCycle(null);
              setStep("billing");
            }}
          />
        );
      case "billing":
        return selectedPlan ? (
          <BillingCycleStep
            plan={selectedPlan}
            billingCycle={billingCycle}
            onChange={setBillingCycle}
            onConfirm={handleBillingConfirm}
            loading={submitting}
            confirmLabel={billingCycle === "trial" ? "Start Free Trial" : "Continue to Payment"}
          />
        ) : null;
      case "payment":
        return regResult ? (
          <RazorpayPaymentPanel
            organizationName={formData.organizationName}
            planName={regResult.subscription.plan_name}
            billingCycle={regResult.subscription.billing_cycle}
            amount={regResult.subscription.amount}
            razorpay={regResult.razorpay}
            pollPaymentStatus={pollRegistrationPayment}
            onSimulatePayment={async () => {
              if (!regResult) return;
              try {
                await simulateRegistrationPayment(regResult.subscription.id);
              } catch (err: any) {
                console.error("simulate-payment backend call failed:", err);
                setToast({
                  type: "error",
                  message:
                    err?.response?.data?.message ||
                    "Could not simulate payment. Please try again.",
                });
                return;
              }

              // Don't trust the simulate-payment call alone — confirm the
              // actual payment_status from the backend before treating this
              // as paid, so the success screen only shows once the DB really
              // reflects it.
              try {
                const confirmed = await pollRegistrationPayment();
                if (confirmed !== "paid") {
                  setToast({
                    type: "error",
                    message:
                      "Payment simulation was recorded, but the payment status could not be confirmed yet. Please wait a moment and try again.",
                  });
                  return;
                }
              } catch (err: any) {
                console.error("payment-status confirmation failed:", err);
                setToast({
                  type: "error",
                  message: "Could not confirm payment status. Please try again.",
                });
                return;
              }

              setRegResult((prev) =>
                prev
                  ? {
                      ...prev,
                      subscription: {
                        ...prev.subscription,
                        payment_status: "paid",
                        status: "pending_activation",
                      },
                    }
                  : prev,
              );
              setToast({
                type: "success",
                message: "Payment received. Your organization is now registered and awaiting Super Admin approval.",
              });
              setStep("status");
            }}
            onPaid={() => {
              setRegResult((prev) =>
                prev
                  ? {
                      ...prev,
                      subscription: {
                        ...prev.subscription,
                        payment_status: "paid",
                        status: "pending_activation",
                      },
                    }
                  : prev,
              );
              setToast({
                type: "success",
                message: "Payment received. Your organization is now registered and awaiting Super Admin approval.",
              });
              setStep("status");
            }}
          />
        ) : null;
      case "status":
        return regResult && selectedPlan && billingCycle ? (
          <StatusScreen
            variant={regResult.subscription.is_free_trial ? "trial_awaiting" : "paid_awaiting"}
            organizationStatus={regResult.organization.status}
            subscriptionStatus={regResult.subscription.status}
            paymentStatus={regResult.subscription.payment_status}
            organizationName={formData.organizationName}
            planName={regResult.subscription.plan_name}
            billingCycle={regResult.subscription.billing_cycle}
            amount={regResult.subscription.amount}
            subscriptionId={regResult.subscription.id}
            onGoToLogin={() => navigate("/login")}
          />
        ) : null;
      default:
        return null;
    }
  })();

  // "status" (waiting for Super Admin approval) is a terminal step once the
  // organization/subscription has been submitted, so it intentionally gets
  // no back button — use "Back to Sign In" instead.
  const wizardOnBack: (() => void) | undefined = (() => {
    switch (step) {
      case "plan":
        return () => setStep("details");
      case "billing":
        return () => setStep("plan");
      case "payment":
        return () => setStep("billing");
      default:
        return undefined;
    }
  })();

  if (step !== "details") {
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <WizardLayout step={step} onBack={wizardOnBack}>
          {wizardContent}
        </WizardLayout>
      </>
    );
  }

  return (
    <Shell>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        <Paper
          elevation={0}
          sx={{
            position: "relative",
            width: 640,
            maxWidth: "100%",
            height: "fit-content",
            p: { xs: 3, sm: 4.5 },
            pt: 5,
            borderRadius: 3,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 16px 40px rgba(14,60,97,0.16)",
            animation: "cardIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 5,
              backgroundImage: "linear-gradient(90deg, #0EA5E9, #2563EB, #4F46E5, #0EA5E9)",
              backgroundSize: "200% 100%",
              animation: shimmerBarAnimation,
            }}
          />

          <Typography
            variant="overline"
            color="secondary.dark"
            sx={{ fontWeight: 700, letterSpacing: "0.08em", ...fadeUpStep(0) }}
          >
            Step 1 of 5 · Organisation
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif", mt: 0.5, ...fadeUpStep(0) }} gutterBottom>
            Register your organisation
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, ...fadeUpStep(1) }}>
            Set up queues, appointments, and staff in one place.
          </Typography>

          {step === "details" && (
          <>
          <Box component="form" onSubmit={handleDetailsSubmit} noValidate>
            <Typography variant="overline" color="primary.dark" sx={{ fontWeight: 700, letterSpacing: "0.08em", ...fadeUpStep(2) }}>
              Organisation
            </Typography>
            <Box sx={{ display: "grid", gap: 2, mt: 1, mb: 3, ...fadeUpStep(2) }}>
              <TextField fullWidth required
                 name="organizationName" label="Organisation Name" value={formData.organizationName} onChange={(e) => handleLettersChange(e, 20)} onBlur={handleBlur} error={Boolean(errors.organizationName)} helperText={errors.organizationName} slotProps={{ input: inputProps(<BuildingIcon fontSize="small" />) }} />

              <TextField
                select
                fullWidth
                required
                name="category"
                label={categoriesLoading ? "Loading categories..." : "Select Category"}
                value={formData.category}
                onChange={handleChange}
                onBlur={handleBlur}
                error={Boolean(errors.category)}
                helperText={errors.category}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.category_name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Typography variant="overline" color="primary.dark" sx={{ fontWeight: 700, letterSpacing: "0.08em", ...fadeUpStep(3) }}>
              Organisation Contact
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mt: 1, mb: 3, ...fadeUpStep(3) }}>
              <TextField fullWidth required
                 type="tel" name="organizationMobile" label="Organisation Mobile" value={formData.organizationMobile} onChange={(e) => handleDigitsChange(e, 10)} onBlur={handleBlur} error={Boolean(errors.organizationMobile)} helperText={errors.organizationMobile} slotProps={{ input: inputProps(<PhoneIcon fontSize="small" />) }} />
              <TextField fullWidth required
                 type="email" name="organizationEmail" label="Organisation Email" value={formData.organizationEmail} onChange={handleChange} onBlur={handleBlur} error={Boolean(errors.organizationEmail)} helperText={errors.organizationEmail} slotProps={{ input: inputProps(<EmailIcon fontSize="small" />) }} />
            </Box>

            <Typography variant="overline" color="primary.dark" sx={{ fontWeight: 700, letterSpacing: "0.08em", ...fadeUpStep(4) }}>
              Contact Person
            </Typography>
            <Box sx={{ display: "grid", gap: 2, mt: 1, mb: 3, ...fadeUpStep(4) }}>
              <TextField fullWidth required
                 name="contactPerson" label="Contact Person Name" value={formData.contactPerson} onChange={handleLettersChange} onBlur={handleBlur} error={Boolean(errors.contactPerson)} helperText={errors.contactPerson} slotProps={{ input: inputProps(<PersonIcon fontSize="small" />) }} />

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <TextField fullWidth required
                   type="tel" name="contactMobile" label="Mobile Number" value={formData.contactMobile} onChange={(e) => handleDigitsChange(e, 10)} onBlur={handleBlur} error={Boolean(errors.contactMobile)} helperText={errors.contactMobile} slotProps={{ input: inputProps(<PhoneIcon fontSize="small" />) }} />
                <TextField fullWidth required
                   type="email" name="contactEmail" label="Email Address" value={formData.contactEmail} onChange={handleChange} onBlur={handleBlur} error={Boolean(errors.contactEmail)} helperText={errors.contactEmail} slotProps={{ input: inputProps(<EmailIcon fontSize="small" />) }} />
              </Box>
            </Box>

            <Typography variant="overline" color="primary.dark" sx={{ fontWeight: 700, letterSpacing: "0.08em", ...fadeUpStep(5) }}>
              Location
            </Typography>
            <Box sx={{ display: "grid", gap: 2, mt: 1, mb: 3.5, ...fadeUpStep(5) }}>
              <TextField fullWidth required
                 multiline
                 rows={3} name="address" label="Address" value={formData.address} onChange={handleChange} onBlur={handleBlur} error={Boolean(errors.address)} helperText={errors.address} slotProps={{ input: inputProps(<LocationIcon fontSize="small" />) }} />

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <Autocomplete
                  fullWidth
                  options={STATES}
                  value={formData.state || null}
                  onChange={handleStateAutocompleteChange}
                  onBlur={handleStateBlur}
                  slotProps={{
                    popper: {
                      placement: "bottom-start",
                      modifiers: [
                        { name: "flip", enabled: false },
                        { name: "preventOverflow", enabled: false },
                      ],
                    },
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required
                      label="Select State"
                      error={Boolean(errors.state)}
                      helperText={errors.state}
                    />
                  )}
                />

                <TextField
                  fullWidth
                  name="country"
                  label="Country"
                  value={formData.country}
                  slotProps={{ input: { ...inputProps(<CountryIcon fontSize="small" />), readOnly: true } }}
                />
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <Autocomplete
                  fullWidth
                  options={cityOptionsForState.map((c) => c.name)}
                  value={formData.city || null}
                  onChange={handleCityAutocompleteChange}
                  onBlur={handleCityBlur}
                  disabled={!formData.state}
                  slotProps={{
                    popper: {
                      placement: "bottom-start",
                      modifiers: [
                        { name: "flip", enabled: false },
                        { name: "preventOverflow", enabled: false },
                      ],
                    },
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required
                      label={formData.state ? "Select City" : "Select State first"}
                      error={Boolean(errors.city)}
                      helperText={errors.city}
                    />
                  )}
                />

                <TextField fullWidth required
                   name="pincode" label="Pincode" value={formData.pincode} onChange={(e) => handleDigitsChange(e, 6)} onBlur={handleBlur} error={Boolean(errors.pincode)} helperText={errors.pincode} slotProps={{ input: inputProps(<LocationIcon fontSize="small" />) }} />
              </Box>
            </Box>

            <Typography variant="overline" color="primary.dark" sx={{ fontWeight: 700, letterSpacing: "0.08em", ...fadeUpStep(6) }}>
              Tax Details
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mt: 1, mb: 3.5, ...fadeUpStep(6) }}>
              <TextField fullWidth required
                 name="panNumber" label="PAN Number" value={formData.panNumber} onChange={(e) => handleUppercaseChange(e, 10)} onBlur={handleBlur} error={Boolean(errors.panNumber)} helperText={errors.panNumber || "e.g. ABCDE1234F"} slotProps={{ input: { ...inputProps(<PanIcon fontSize="small" />), style: { textTransform: "uppercase" } } }} />
              <TextField fullWidth
                 name="gstNumber" label="GST Number (optional)" value={formData.gstNumber} onChange={(e) => handleUppercaseChange(e, 15)} onBlur={handleBlur} error={Boolean(errors.gstNumber)} helperText={errors.gstNumber || "Leave blank if not GST-registered"} slotProps={{ input: { ...inputProps(<GstIcon fontSize="small" />), style: { textTransform: "uppercase" } } }} />
            </Box>

            <Box sx={{ ...fadeUpStep(7) }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{
                  height: 46,
                  transition: "transform 150ms ease, box-shadow 150ms ease",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 24px rgba(37,99,235,0.35)" },
                  "&:active": { transform: "translateY(0)" },
                }}
              >
                Continue to Select Plan
              </Button>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5, textAlign: "center", ...fadeUpStep(8) }}>
            Already registered?{" "}
            <Link to="/login" style={{ color: "inherit" }}>
              <Box
                component="span"
                sx={{
                  fontWeight: 600,
                  color: "secondary.dark",
                  transition: "opacity 150ms ease",
                  "&:hover": { opacity: 0.7 },
                }}
              >
                Sign In
              </Box>
            </Link>
          </Typography>
          </>
          )}
        </Paper>
    </Shell>
  );
}

export default RegisterOrganization;