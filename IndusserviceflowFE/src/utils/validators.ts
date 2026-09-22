export function validateLoginIdentifier(value: string, label = "Email or Username"): string {
  if (!value.trim()) return `${label} is required.`;
  if (/^[0-9]+$/.test(value)) return `Invalid username or email.`;
  if (/^[^A-Za-z0-9]+$/.test(value)) return `Only special characters are not allowed.`;
  return "";
}

export function validateEmailOrUsername(value: string, label = "Email or Username"): string {
  if (!value.trim()) return `${label} is required.`;
  if (/^[0-9]+$/.test(value)) return "Invalid username or email.";
  if (/^[^A-Za-z0-9]+$/.test(value)) return "Only special characters are not allowed.";
  if (value.includes("@")) {
    
    const emailError = validateEmail(value, "Email");
    return emailError ? "Invalid email address." : "";
  }

  if (/\s/.test(value)) return "Invalid username.";
  if (!/^[A-Za-z0-9._-]{3,}$/.test(value)) return "Invalid username.";
  return "";
}

export function validateNameField(value: string, label: string): string {
  if (!value) return `${label} is required`;
  if (/^\s/.test(value)) return `${label} cannot start with a space`;
  if (/\s{2,}/.test(value)) return `${label} cannot contain multiple spaces in a row`;
  if (!/^[A-Za-z](?:[A-Za-z'-]|\s(?!\s))*$/.test(value)) {
    return `${label} can only contain letters, spaces, hyphens, and apostrophes`;
  }
  return "";
}

export function validateBusinessNameField(value: string, label: string): string {
  if (!value) return `${label} is required`;
  if (/^\s/.test(value)) return `${label} cannot start with a space`;
  if (/\s{2,}/.test(value)) return `${label} cannot contain multiple spaces in a row`;
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9&.,'-]|\s(?!\s))*$/.test(value)) {
    return `${label} contains invalid characters`;
  }
  return "";
}

export function validateRequiredText(value: string, label: string): string {
  if (!value.trim()) return `${label} is required`;
  if (/^\s/.test(value)) return `${label} cannot start with a space`;
  return "";
}

export function validateOrgNameField(value: string, label = "Organization Name"): string {
  if (!value) return `${label} is required.`;
  if (/^\s/.test(value)) return `${label} cannot start with a space.`;
  if (/\s{2,}/.test(value)) return `${label} cannot contain consecutive spaces.`;
  if (!/^[A-Za-z\s]+$/.test(value)) {
    return `${label} can only contain letters and spaces.`;
  }
  if (value.trim().length < 3) return `${label} must be at least 3 characters.`;
  if (value.trim().length > 20) return `${label} cannot exceed 20 characters.`;
  return "";
}

export function validateMobile(value: string, label = "Mobile Number"): string {
  if (!value.trim()) return `${label} is required`;
  if (!/^[0-9]+$/.test(value)) return `${label} must contain digits only`;
  if (!/^[6-9]/.test(value)) return `${label} must start with 6-9`;
  if (value.length < 10) return `Enter a valid 10-digit mobile number`;
  if (/^(\d)\1{9}$/.test(value)) return `${label} cannot be the same digit repeated`;
  if (/(\d)\1{5,}/.test(value)) return `${label} cannot contain more than 5 repeated digits in a row`;
  return "";
}

export function validateEmail(value: string, label = "Email"): string {
  if (!value.trim()) return `${label} is required`;
  if (/\s/.test(value)) return `${label} cannot contain spaces`;
  if (/,/.test(value)) return `${label} cannot contain commas`;
  if (/\.\./.test(value)) return `${label} cannot contain consecutive dots`;
  if (/^\.|\.@|@\.|\.$/.test(value)) return `Enter a valid email address`;
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
    return `Enter a valid email address`;
  }
  return "";
}

export function validatePincode(value: string): string {
  if (!value.trim()) return "Pincode is required";
  if (!/^[0-9]+$/.test(value)) return "Pincode must contain only numbers";
  if (value.length !== 6) return "Pincode must be exactly 6 digits";
  if (/^(\d)\1{5}$/.test(value)) return "Please enter a valid pincode";
  return "";
}
export function validatePincodeForCity(value: string, cityName?: string): string {
  const formatError = validatePincode(value);
  if (formatError) return formatError;

  if (!cityName) return "";

  const matches = CITY_OPTIONS.filter((c) => c.name === cityName);
  if (matches.length === 0) return "";

  const belongs = matches.some((c) => c.pincode === value);
  if (!belongs) {
    return `This pincode does not belong to ${cityName}.`;
  }
  return "";
}

export interface CityOption {
  name: string;
  state: string;
  pincode: string;
}

export const CITY_OPTIONS: CityOption[] = [
  { name: "Hyderabad", state: "Telangana", pincode: "500001" },
  { name: "Secunderabad", state: "Telangana", pincode: "500003" },
  { name: "Warangal", state: "Telangana", pincode: "506002" },
  { name: "Nizamabad", state: "Telangana", pincode: "503001" },
  { name: "Visakhapatnam", state: "Andhra Pradesh", pincode: "530001" },
  { name: "Vijayawada", state: "Andhra Pradesh", pincode: "520001" },
  { name: "Guntur", state: "Andhra Pradesh", pincode: "522001" },
  { name: "Tirupati", state: "Andhra Pradesh", pincode: "517501" },
  { name: "Bengaluru", state: "Karnataka", pincode: "560001" },
  { name: "Mysuru", state: "Karnataka", pincode: "570001" },
  { name: "Mangaluru", state: "Karnataka", pincode: "575001" },
  { name: "Chennai", state: "Tamil Nadu", pincode: "600001" },
  { name: "Coimbatore", state: "Tamil Nadu", pincode: "641001" },
  { name: "Madurai", state: "Tamil Nadu", pincode: "625001" },
  { name: "Kochi", state: "Kerala", pincode: "682001" },
  { name: "Thiruvananthapuram", state: "Kerala", pincode: "695001" },
  { name: "Kozhikode", state: "Kerala", pincode: "673001" },
  { name: "Itanagar", state: "Arunachal Pradesh", pincode: "791111" },
  { name: "Guwahati", state: "Assam", pincode: "781001" },
  { name: "Patna", state: "Bihar", pincode: "800001" },
  { name: "Raipur", state: "Chhattisgarh", pincode: "492001" },
  { name: "Panaji", state: "Goa", pincode: "403001" },
  { name: "Ahmedabad", state: "Gujarat", pincode: "380001" },
  { name: "Gurugram", state: "Haryana", pincode: "122001" },
  { name: "Shimla", state: "Himachal Pradesh", pincode: "171001" },
  { name: "Ranchi", state: "Jharkhand", pincode: "834001" },
  { name: "Bhopal", state: "Madhya Pradesh", pincode: "462001" },
  { name: "Mumbai", state: "Maharashtra", pincode: "400001" },
  { name: "Imphal", state: "Manipur", pincode: "795001" },
  { name: "Shillong", state: "Meghalaya", pincode: "793001" },
  { name: "Aizawl", state: "Mizoram", pincode: "796001" },
  { name: "Kohima", state: "Nagaland", pincode: "797001" },
  { name: "Bhubaneswar", state: "Odisha", pincode: "751001" },
  { name: "Ludhiana", state: "Punjab", pincode: "141001" },
  { name: "Jaipur", state: "Rajasthan", pincode: "302001" },
  { name: "Gangtok", state: "Sikkim", pincode: "737101" },
  { name: "Agartala", state: "Tripura", pincode: "799001" },
  { name: "Lucknow", state: "Uttar Pradesh", pincode: "226001" },
  { name: "Dehradun", state: "Uttarakhand", pincode: "248001" },
  { name: "Kolkata", state: "West Bengal", pincode: "700001" },
  { name: "Port Blair", state: "Andaman and Nicobar Islands", pincode: "744101" },
  { name: "Chandigarh", state: "Chandigarh", pincode: "160001" },
  { name: "Daman", state: "Dadra and Nagar Haveli and Daman and Diu", pincode: "396210" },
  { name: "New Delhi", state: "Delhi", pincode: "110001" },
  { name: "Srinagar", state: "Jammu and Kashmir", pincode: "190001" },
  { name: "Leh", state: "Ladakh", pincode: "194101" },
  { name: "Kavaratti", state: "Lakshadweep", pincode: "682555" },
  { name: "Puducherry", state: "Puducherry", pincode: "605001" },
];

export function validateLettersAndSpaces(value: string, label: string, min = 2): string {
  if (!value.trim()) return `${label} is required.`;
  if (/^\s/.test(value)) return `${label} cannot start with a space.`;
  if (/\s{2,}/.test(value)) return `${label} cannot contain consecutive spaces.`;
  if (!/^[A-Za-z\s]+$/.test(value)) return `${label} must contain only letters and spaces.`;
  if (value.trim().length < min) return `${label} must be at least ${min} characters.`;
  return "";
}

export function validateAddress(value: string, label = "Address"): string {
  if (!value.trim()) return `${label} cannot be empty or contain only spaces.`;
  if (/^\s/.test(value)) return `${label} cannot start with a space.`;
  if (/\s$/.test(value)) return `${label} cannot end with a space.`;
  if (/\s{2,}/.test(value)) return `${label} cannot contain consecutive spaces.`;
  if (!/^[A-Za-z0-9][A-Za-z0-9.,/#()&\- ]*$/.test(value)) {
    return `Please enter a valid ${label.toLowerCase()}.`;
  }
  if (!/[A-Za-z]/.test(value)) {
    return `${label} cannot contain only numbers.`;
  }
  if (value.trim().length < 5) return `${label} must be at least 5 characters.`;
  if (value.trim().length > 255) return `${label} cannot exceed 255 characters.`;
  return "";
}
export function validatePAN(value: string, label = "PAN Number"): string {
  if (!value.trim()) return `${label} is required.`;
  const v = value.trim().toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v)) {
    return `Enter a valid ${label} (e.g. ABCDE1234F).`;
  }
  return "";
}

export function validateGSTIN(value: string, label = "GST Number"): string {
  if (!value.trim()) return "";
  const v = value.trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v)) {
    return `Enter a valid 15-character ${label} (e.g. 22ABCDE1234F1Z5).`;
  }
  return "";
}

export function validateCategoryName(value: string, label = "Category Name"): string {
  if (!value.trim()) return `${label} is required.`;
  if (/^\s/.test(value)) return `${label} cannot start with a space.`;
  if (/\s{2,}/.test(value)) return `${label} cannot contain consecutive spaces.`;
  if (!/^[A-Za-z\s]+$/.test(value)) return `${label} can only contain letters and spaces.`;
  if (value.trim().length < 3) return `${label} must be at least 3 characters.`;
  if (value.trim().length > 20) return `${label} cannot exceed 20 characters.`;
  return "";
}

export function validateDescription(
  value: string,
  label = "Description",
  min = 10,
  max = 500,
): string {
  if (!value.trim()) return `${label} is required.`;
  if (!value.replace(/\s/g, "").length) return `${label} cannot contain only spaces.`;
  if (/<[^>]*>/.test(value)) return `Invalid characters or content in ${label.toLowerCase()}.`;
  if (/\s{2,}/.test(value)) return `${label} cannot contain consecutive spaces.`;
  if (!/^[A-Za-z0-9.,\-()/:;\s]+$/.test(value)) {
    return `${label} contains unsupported special characters.`;
  }
  if (/^[0-9\s]+$/.test(value)) return `${label} cannot contain only numbers.`;
  if (/^[^A-Za-z0-9]+$/.test(value)) return `${label} cannot contain only special characters.`;
  if (value.trim().length < min) return `${label} must be at least ${min} characters.`;
  if (value.trim().length > max) return `${label} must not exceed ${max} characters.`;
  return "";
}

export function validateRequiredSelect(value: string, label: string): string {
  return value ? "" : `Please select a ${label.toLowerCase()}`;
}

export function validatePassword(value: string, label = "Password"): string {
  if (!value) return `${label} is required`;
  if (value.length < 8) return `${label} must be at least 8 characters`;
  if (!/[A-Z]/.test(value)) return `${label} must contain at least one uppercase letter`;
  if (!/[a-z]/.test(value)) return `${label} must contain at least one lowercase letter`;
  if (!/[0-9]/.test(value)) return `${label} must contain at least one number`;
  return "";
}
export function validateLoginPassword(value: string, label = "Password"): string {
  if (!value) return `${label} is required`;
  return "";
}

export function validateConfirmPassword(value: string, original: string): string {
  if (!value) return "Please confirm your password";
  if (value !== original) return "Passwords do not match";
  return "";
}

export function validateNewPasswordDiffersFromOld(newPassword: string, oldPassword: string): string {
  if (oldPassword && newPassword && newPassword === oldPassword) {
    return "New password cannot be the same as your current password";
  }
  return "";
}

export function validateNonNegativeNumber(value: string, label: string): string {
  if (value.trim() === "") return `${label} is required`;
  const num = Number(value);
  if (Number.isNaN(num)) return `${label} must be a number`;
  if (num < 0) return `${label} cannot be negative`;
  return "";
}

export function validateOptionalNonNegativeNumber(value: string, label: string): string {
  if (value.trim() === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return `${label} must be a number`;
  if (num <= 0) return `${label} must be greater than 0`;
  return "";
}

export function validatePositiveInteger(value: string, label: string): string {
  if (value.trim() === "") return `${label} is required`;
  const num = Number(value);
  if (!Number.isInteger(num)) return `${label} must be a whole number`;
  if (num < 0) return `${label} cannot be negative`;
  return "";
}

export function getNameError(value: string, label = "Name"): string {
  return validateNameField(value, label);
}

export function getMobileError(value: string, label = "Mobile Number"): string {
  return validateMobile(value, label);
}

export function getEmailError(value: string, label = "Email"): string {
  return validateEmail(value, label);
}

export function getDesignationError(value: string, label = "Designation"): string {
  return validateNameField(value, label);
}

export function sanitizeNameInput(value: string): string {
  return value.replace(/[^A-Za-z'\-\s]/g, "").replace(/\s{2,}/g, " ");
}

export function sanitizeMobileInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function validateShiftName(value: string, label = "Shift Name"): string {
  if (!value.trim()) return `${label} is required.`;
  if (/^\s/.test(value)) return `${label} cannot start with a space.`;
  if (/\s{2,}/.test(value)) return `${label} cannot contain consecutive spaces.`;
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9'-]|\s(?!\s))*$/.test(value)) {
    return `${label} can only contain letters, numbers, spaces, and hyphens.`;
  }
  return "";
}
export function timeToMinutes(value: string): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function isOvernightWindow(startMin: number | null, endMin: number | null): boolean {
  return startMin !== null && endMin !== null && endMin <= startMin;
}

export function effectiveEndMinutes(startMin: number | null, endMin: number | null): number | null {
  if (startMin === null || endMin === null) return null;
  return isOvernightWindow(startMin, endMin) ? endMin + 24 * 60 : endMin;
}

export function validateShiftTimes(startTime: string, endTime: string): string {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  if (startMin === null || endMin === null) return "Start and end time are required.";
  if (startMin === endMin) return "Start and end time can't be the same.";
  return "";
}

export function validateShiftBreak(
  hasBreak: boolean,
  breakStart: string,
  breakEnd: string,
  startTime: string,
  endTime: string,
): string {
  if (!hasBreak) return "";

  const breakStartMin = timeToMinutes(breakStart);
  const breakEndMin = timeToMinutes(breakEnd);
  if (breakStartMin === null || breakEndMin === null) {
    return "Break start and end time are required.";
  }

  const effectiveBreakEndMin = effectiveEndMinutes(breakStartMin, breakEndMin);
  if (effectiveBreakEndMin === null || effectiveBreakEndMin <= breakStartMin) {
    return "Break end must be after break start.";
  }

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const shiftEndMin = effectiveEndMinutes(startMin, endMin);
  if (startMin === null || shiftEndMin === null) {
    return "Set the shift's start and end time first.";
  }

  if (breakStartMin < startMin || effectiveBreakEndMin > shiftEndMin) {
    return "Break must fall within the shift and end after it starts.";
  }
  return "";
}