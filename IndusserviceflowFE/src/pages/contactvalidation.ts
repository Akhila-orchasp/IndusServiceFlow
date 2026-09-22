export const validateContactName = (value: string): string => {
  const name = value.trim();

  if (!name) {
    return "Full name is required.";
  }

  if (name.length < 2) {
    return "Full name must be at least 2 characters.";
  }

  if (name.length > 100) {
    return "Full name must not exceed 100 characters.";
  }

  if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(name)) {
    return "Full name can contain only letters, spaces, hyphens and apostrophes.";
  }

  return "";
};

export const validateContactEmail = (value: string): string => {
  const email = value.trim();

  if (!email) {
    return "Email address is required.";
  }

  if (email.length > 254) {
    return "Email address must not exceed 254 characters.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Please enter a valid email address.";
  }

  return "";
};

export const validateContactSubject = (value: string): string => {
  const subject = value.trim();

  if (!subject) {
    return "Subject is required.";
  }

  if (subject.length < 3) {
    return "Subject must be at least 3 characters.";
  }

  if (subject.length > 150) {
    return "Subject must not exceed 150 characters.";
  }

  return "";
};

export const validateContactMessage = (value: string): string => {
  const message = value.trim();

  if (!message) {
    return "Message is required.";
  }

  if (message.length < 10) {
    return "Message must be at least 10 characters.";
  }

  if (message.length > 2000) {
    return "Message must not exceed 2000 characters.";
  }

  return "";
};

export const validateContactForm = (data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) => {
  return {
    name: validateContactName(data.name),
    email: validateContactEmail(data.email),
    subject: validateContactSubject(data.subject),
    message: validateContactMessage(data.message),
  };
};