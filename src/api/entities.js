import { supabase } from "../lib/supabase.js";
/**
 * AUTHENTICATION WRAPPER
 * Replaces base44.auth. Handles session retrieval and joins 
 * private auth data with public profile data (name, avatar, etc).
 */
export const User = {
  me: async () => {
    // Retrieve the current session user from Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // If no user is found or session is expired, trigger the app's error handling
    if (error || !user) throw new Error("Authentication session not found");

    // Fetch supplementary profile data (e.g., bio, full name) from our custom table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Merge Auth data with Profile data to maintain compatibility with existing UI
    return {
      ...user,
      ...profile,
      full_name: profile?.full_name || user.email.split('@')[0], // Fallback to email prefix
      avatar_url: profile?.avatar_url
    };
  },
  
  // Placeholder for logout functionality
  signOut: () => supabase.auth.signOut()
};

/**
 * PIECE ENTITY
 * Handles fetching of writing submissions. 
 * Maps directly to the 'pieces' table created in Step 1.
 */
export const Piece = {
  /**
   * Fetches a list of writing pieces.
   * @param {string} _sortField - Reserved for future sorting logic (currently defaults to created_at)
   * @param {number} limit - Number of records to return
   */
  list: async (_sortField, limit = 100) => {
    const { data, error } = await supabase
      .from('pieces')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error("Error fetching pieces:", error.message);
      throw error;
    }
    return data;
  }
};

/**
 * COMMENT ENTITY
 * Handles retrieval of feedback/comments.
 * Note: RLS policies in Supabase will automatically filter these based on 'Blind Mode'.
 */
export const Comment = {
  list: async (_sortField, limit = 3) => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error("Error fetching comments:", error.message);
      throw error;
    }
    return data;
  }
};

/**
 * FEATURE PLACEHOLDERS (SHIMS)
 * These entities existed in the Base44 SDK but haven't been implemented in Supabase yet.
 * We export "empty" versions to prevent the application from crashing on import.
 */

// VersionChain: Used for grouping multiple drafts/versions of a single piece.
export const VersionChain = {
  list: async () => [],
  get: async () => ({})
};

// PieceAnalytics: Used for tracking views and engagement metrics.
export const PieceAnalytics = {
  get: async () => ({ views: 0, unique_readers: 0, avg_read_time: 0 })
};