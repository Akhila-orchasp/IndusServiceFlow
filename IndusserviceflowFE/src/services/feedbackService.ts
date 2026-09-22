import api from "./api";

export interface FeedbackFormService {
  appointment_service_id: number;
  service_name: string;
  employee_id: number | null;
  employee_name: string | null;
  already_rated: boolean;
  rating: number | null;
  comment: string | null;
}

export interface FeedbackForm {
  appointment_number: string;
  token_number: string;
  date: string;
  customer_name: string;
  organization_name: string | null;
  is_submitted: boolean;
  services: FeedbackFormService[];
}

export interface FeedbackRatingInput {
  appointment_service_id: number;
  rating: number;
  comment?: string;
}

export const getFeedbackForm = async (token: string) => {
  const response = await api.get<FeedbackForm>(`/feedback/${token}/`);
  return response.data;
};

export const submitFeedback = async (
  token: string,
  ratings: FeedbackRatingInput[]
) => {
  const response = await api.post(`/feedback/${token}/submit/`, { ratings });
  return response.data;
};
