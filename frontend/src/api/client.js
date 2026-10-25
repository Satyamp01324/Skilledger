import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export const getChain = () => client.get('/chain').then(r => r.data.data);
export const getValidators = () => client.get('/validators').then(r => r.data.data);
export const getPending = () => client.get('/pending').then(r => r.data.data);
export const getInstitutions = () => client.get('/institutions').then(r => r.data.data);
export const getAudit = () => client.get('/audit').then(r => r.data.data);

export const issueCredential = (payload) => client.post('/issue', payload).then(r => r.data);
export const sealBlock = () => client.post('/seal-block').then(r => r.data);
export const verifyCredential = (certId) => client.get(`/verify/${encodeURIComponent(certId)}`).then(r => r.data.data);
export const revokeCredential = (certId, payload) => client.post(`/credentials/${encodeURIComponent(certId)}/revoke`, payload).then(r => r.data);
export const verifyGitHubSkills = (payload) => client.post('/skills/github-verify', payload).then(r => r.data.data);

export const tamperDemo = () => client.post('/tamper-demo').then(r => r.data);
export const demoTamperEvidence = (certId, alteredContent) => client.post('/demo/tamper-evidence', { certificate_id: certId, altered_content: alteredContent }).then(r => r.data);
export const demoMakeUnavailable = (certId) => client.post('/demo/make-unavailable', { certificate_id: certId }).then(r => r.data);
export const demoResetEvidence = (certId) => client.post('/demo/reset-evidence', { certificate_id: certId }).then(r => r.data);

export const registerInstitution = (payload) => client.post('/institutions/register', payload).then(r => r.data);
export const demoUnauthorizedIssuer = (rogueName, category) => client.post('/demo/unauthorized-issuer', { rogue_name: rogueName, category }).then(r => r.data);

export const toggleValidator = (nodeId) => client.post(`/validators/${nodeId}/toggle`).then(r => r.data.data);
export const resetChain = () => client.post('/reset').then(r => r.data);

export default client;