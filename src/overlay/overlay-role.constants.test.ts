import { describe, expect, it } from 'vitest';
import { OVERLAY_ROLE_STYLES, OVERLAY_ROLES } from './overlay-role.constants';

describe('the annotation styles', () => {
  it.each(OVERLAY_ROLES)('styles %s', (role) => {
    expect(OVERLAY_ROLE_STYLES[role].strokeWidthPx).toBeGreaterThan(0);
  });

  it('gives every stroke a halo to sit on', () => {
    // The halo is what makes a line visible over a photograph. A role without
    // one is a role that disappears on somebody's wall.
    for (const role of OVERLAY_ROLES) {
      expect(OVERLAY_ROLE_STYLES[role].haloWidthPx, role).toBeGreaterThan(0);
    }
  });

  it('never leaves two marks distinguishable by colour alone', () => {
    // Roughly one man in twelve cannot separate these hues, and a report may
    // be photocopied to grey. Dashed means "where it may be" and solid means
    // "where it is" — so no two roles may share both.
    const signatures = OVERLAY_ROLES.map((role) => {
      const style = OVERLAY_ROLE_STYLES[role];
      return `${style.colour}|${style.dashPx.join(',')}`;
    });

    expect(new Set(signatures).size).toBe(OVERLAY_ROLES.length);
  });

  it('shades only the roles that describe a permitted range', () => {
    // A shade is a region a measurement may fall in. Shading a measured line
    // would say there is latitude where there is none.
    for (const role of OVERLAY_ROLES) {
      const shades = OVERLAY_ROLE_STYLES[role].shadeAlpha > 0;
      expect(shades, role).toBe(role.endsWith('-band'));
    }
  });

  it('keeps every shade faint enough to see the photograph through', () => {
    for (const role of OVERLAY_ROLES) {
      expect(OVERLAY_ROLE_STYLES[role].shadeAlpha, role).toBeLessThan(0.5);
    }
  });
});
