import axios from 'axios';

// Backend URL (Django usually runs on port 8000)
// This points to the Django API endpoint
const API_URL = 'http://localhost:8000/api';

// Create an axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add the JWT token to every request
// This allows the backend to know who is logged in
api.interceptors.request.use(
  (config) => {
    // Get the token from local storage
    const token = localStorage.getItem('access_token');
    
    // If token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

// ---- Group Insurance helpers ----

export interface GroupInsuranceRecord {
  id: number;
  document_no: string;
  item_name: string;
  main_class: string;
  fund_type: string;
  sum_insured: string;
  premium_amount: string;
  sex: string;
  employee_number: string;
  commence_date: string;
  link_id: string;
}

export interface GroupRiderRecord {
  id: number;
  document_no: string;
  type: string;
  category: string;
  sum_insured: string;
  annual_premium_amount: string;
  commence_date: string;
  link_id: string;
}

/** Search group insurance records by document_no / link_id / employee_number */
export const searchGroupInsurance = (query: string) =>
  api.get<GroupInsuranceRecord[]>('/group/search/', { params: { query } });

/** Get all riders for a given document number */
export const getGroupRiders = (documentNo: string) =>
  api.get<GroupRiderRecord[]>(`/group/${documentNo}/riders/`);
