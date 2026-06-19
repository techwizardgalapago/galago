import { api } from './api';

export const getTouristSites = async (params = {}) => {
  const res = await api.get('/tourist-sites', { params });
  return res.data;
};

export const getTouristSiteById = async (siteID) => {
  const res = await api.get(`/tourist-sites/${siteID}`);
  return res.data;
};
