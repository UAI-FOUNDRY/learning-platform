import { apiClient } from './api';

export const certificateService = {
  getCertificates: () => apiClient('/certificates'),
  verifyCertificate: (certificateId) => apiClient(`/certificates/verify/${certificateId}`)
};
