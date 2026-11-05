import { describe, expect, it, vi } from 'vitest';
import { withMaintenanceBypassPasswordUpdate } from './siteSettingsApi';

vi.mock('./axios', () => ({ api: {} }));

describe('maintenance bypass password update payload', () => {
  it('does not resend a stored secret when the admin leaves the new-password field blank', () => {
    const payload = { maintenancePasswordEnabled: true };

    expect(withMaintenanceBypassPasswordUpdate(payload, '')).toEqual(payload);
    expect(withMaintenanceBypassPasswordUpdate(payload, '   ')).toEqual(payload);
    expect(withMaintenanceBypassPasswordUpdate(payload, '')).not.toHaveProperty('maintenanceBypassPassword');
  });

  it('sends only a newly entered password after trimming surrounding whitespace', () => {
    expect(withMaintenanceBypassPasswordUpdate({ maintenancePasswordEnabled: true }, '  new-secret  ')).toEqual({
      maintenancePasswordEnabled: true,
      maintenanceBypassPassword: 'new-secret',
    });
  });

  it('keeps an API response without a password field separate from the update field', () => {
    const settingsResponse = { maintenancePasswordEnabled: true };

    expect(settingsResponse).not.toHaveProperty('maintenanceBypassPassword');
    expect(withMaintenanceBypassPasswordUpdate(settingsResponse, '')).toEqual(settingsResponse);
  });
});
