/**
 * MOCK BASE44 CLIENT
 * We have migrated to Supabase, but some legacy files still import this 'base44' object.
 * This mock ensures the app doesn't crash or try to contact the old servers.
 */
export const base44 = {
  entities: {}, // Prevents errors when entities.js tries to access base44.entities
  auth: {
    me: () => Promise.resolve(null), // Returns a blank user instead of a network error
  }
};