const { MarketingIntegration } = require('../models');
const { decryptJson } = require('./cryptoSecret');

/** @typedef {{ pixelId:string, accessToken:string, testEventCode?:string }} MetaCreds */
/** @typedef {{ pixelId:string, accessToken:string }} SnapCreds */
/** @typedef {{ measurementId:string, apiSecret:string, adsConversionId?:string, adsConversionLabel?:string }} GoogleCreds */

/**
 * Loads decrypted credential JSON for provider.
 * Never log the returned object directly.
 */
exports.getCredentialsForProvider = async (provider) => {
  const row = await MarketingIntegration.findOne({ where: { provider } });
  if (!row?.encrypted_credentials) return { row, creds: null };
  const creds = decryptJson(row.encrypted_credentials, row.iv, row.auth_tag);
  return { row, creds };
};

/**
 * Loads a row that is configured *and enabled* plus decrypted secrets.
 */
exports.getReadyIntegration = async (provider) => {
  const row = await MarketingIntegration.findOne({ where: { provider } });
  if (!row?.enabled) return null;
  if (!row.encrypted_credentials || !row.iv || !row.auth_tag) return { row, creds: null };
  try {
    const creds = decryptJson(row.encrypted_credentials, row.iv, row.auth_tag);
    return { row, creds };
  } catch {
    return { row, creds: null };
  }
};
