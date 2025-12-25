import axios from "axios";
import { getApiUrl } from "./api";

export interface UserProfile {
  email: string;
  full_name?: string;
  learner_type?: string;
  age_group?: string;
  preferred_learning_style?: string;
  education_level?: string;
  learning_goals?: string[];
  interests?: string[];
  profile_complete?: boolean;
}

export async function checkProfileComplete(): Promise<boolean> {
  try {
    const token = localStorage.getItem("token");
    if (!token) return false;

    const response = await axios.get(getApiUrl("api/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.profile_complete === true;
  } catch (error) {
    console.error("Failed to check profile:", error);
    return false;
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const response = await axios.get(getApiUrl("api/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error) {
    console.error("Failed to get user profile:", error);
    return null;
  }
}

