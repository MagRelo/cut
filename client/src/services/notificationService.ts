import { NotificationSignupFormData } from '../validations/notificationSignup';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const notificationService = {
  async requestVerification(
    contact: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/notifications/request-verification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contact }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to request verification');
    }

    return response.json();
  },

  async verifyCode(
    data: NotificationSignupFormData
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/notifications/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to verify code');
    }

    return response.json();
  },
};
