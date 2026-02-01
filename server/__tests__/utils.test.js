const { buildTrackingUrl } = require('../utils');

describe('buildTrackingUrl', () => {
  it('should return template string unchanged when no tracking number is provided', () => {
    const template = 'https://tracking.example.com/track/{tracking}';
    
    const result = buildTrackingUrl(template, undefined);
    
    expect(result).toBe(template);
  });

  it('should return template string unchanged when tracking number is empty string', () => {
    const template = 'https://tracking.example.com/track/%s';
    
    const result = buildTrackingUrl(template, '');
    
    expect(result).toBe(template);
  });

  it('should return template string unchanged when tracking number is null', () => {
    const template = 'https://carrier.com/shipment/{tracking}';
    
    const result = buildTrackingUrl(template, null);
    
    expect(result).toBe(template);
  });

  it('should replace {tracking} placeholder with tracking number', () => {
    const template = 'https://tracking.example.com/track/{tracking}';
    const trackingNumber = 'ABC123';
    
    const result = buildTrackingUrl(template, trackingNumber);
    
    expect(result).toBe('https://tracking.example.com/track/ABC123');
  });

  it('should replace %s placeholder with tracking number', () => {
    const template = 'https://tracking.example.com/track/%s';
    const trackingNumber = 'XYZ789';
    
    const result = buildTrackingUrl(template, trackingNumber);
    
    expect(result).toBe('https://tracking.example.com/track/XYZ789');
  });

  it('should return template unchanged if no placeholder and tracking number provided', () => {
    const template = 'https://tracking.example.com/generic-track';
    const trackingNumber = 'ABC123';
    
    const result = buildTrackingUrl(template, trackingNumber);
    
    expect(result).toBe(template);
  });

  it('should return empty string when template is null', () => {
    const result = buildTrackingUrl(null, 'ABC123');
    
    expect(result).toBe('');
  });

  it('should return empty string when template is undefined', () => {
    const result = buildTrackingUrl(undefined, 'ABC123');
    
    expect(result).toBe('');
  });
});
