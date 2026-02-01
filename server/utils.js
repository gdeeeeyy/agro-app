/**
 * Build a tracking URL from a template and tracking number.
 * @param {string|null|undefined} template - URL template (may contain {tracking} or %s placeholder)
 * @param {string} [trackingNumber] - The tracking number to substitute
 * @returns {string} The built URL or empty string
 */
function buildTrackingUrl(template, trackingNumber) {
  if (!template) return '';
  if (!trackingNumber) return template;
  if (template.includes('{tracking}')) return template.replace('{tracking}', trackingNumber);
  if (template.includes('%s')) return template.replace('%s', trackingNumber);
  return template;
}

module.exports = { buildTrackingUrl };
