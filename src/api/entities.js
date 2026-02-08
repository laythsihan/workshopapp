import { supabase } from "../lib/supabase.js";

/**
 * ============================================================================
 * WORKSHOP APP - COMPLETE ENTITIES API
 * ============================================================================
 * Full CRUD operations for all database tables with proper error handling,
 * relationship management, and real-time support.
 * 
 * Created: 2026-02-07
 * ============================================================================
 */

// ============================================================================
// AUTHENTICATION & USER MANAGEMENT
// ============================================================================

export const User = {
  /**
   * Get the current authenticated user with profile data
   * @returns {Promise<Object>} User object with auth + profile data
   */
  me: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error("Authentication session not found");
    }

    // Fetch profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      ...user,
      ...profile,
      full_name: profile?.full_name || user.email?.split('@')[0] || 'Unknown User',
      avatar_url: profile?.avatar_url
    };
  },

  /**
   * Get a user profile by ID
   * @param {string} userId - User ID to fetch
   * @returns {Promise<Object>} User profile
   */
  get: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update the current user's profile
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated profile
   */
  updateProfile: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Sign out the current user
   */
  signOut: () => supabase.auth.signOut()
};

// ============================================================================
// PIECES (Writing Submissions)
// ============================================================================

export const Piece = {
/**
   * List pieces - returns user's own pieces + invited pieces
   * @param {string} sortField - Field to sort by
   * @param {number} limit - Max number of results
   * @returns {Promise<Array>} Array of pieces
   */
  list: async (sortField = 'created_at', limit = 100) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get pieces owned by user
    const { data: ownedPieces, error: ownedError } = await supabase
      .from('pieces')
      .select('*')
      .eq('owner_id', user.id)
      .order(sortField, { ascending: false })
      .limit(limit);
    
    if (ownedError) throw ownedError;

    // Get pieces user is invited to collaborate on
    const { data: collaborations, error: collabError } = await supabase
      .from('collaborators')
      .select('piece_id')
      .eq('invitee_email', user.email);
    
    if (collabError) throw collabError;

    const invitedPieceIds = collaborations?.map(c => c.piece_id) || [];
    
    let invitedPieces = [];
    if (invitedPieceIds.length > 0) {
      const { data, error } = await supabase
        .from('pieces')
        .select('*')
        .in('id', invitedPieceIds);
      
      if (error) throw error;
      
      // Mark invited pieces so UI can show a badge
      invitedPieces = (data || []).map(p => ({ ...p, isInvited: true }));
    }

    // Combine and return
    return [...(ownedPieces || []), ...invitedPieces];
  },

  /**
   * Create a new piece
   * @param {Object} pieceData - Piece data
   * @returns {Promise<Object>} Created piece
   */
  create: async (pieceData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Calculate word count if content provided
    let wordCount = 0;
    if (pieceData.content) {
      wordCount = pieceData.content.trim().split(/\s+/).filter(w => w.length > 0).length;
    }

    const { data, error } = await supabase
      .from('pieces')
      .insert([{
        owner_id: user.id,
        title: pieceData.title || 'Untitled Piece',
        description: pieceData.description || null,
        content: pieceData.content || '',
        genre: pieceData.genre || 'Uncategorized',
        status: pieceData.status || 'draft',
        word_count: wordCount,
        is_private: pieceData.is_private !== undefined ? pieceData.is_private : true,
        is_blind_review: pieceData.is_blind_review !== undefined ? pieceData.is_blind_review : false,
        version_chain_id: pieceData.version_chain_id || null,
        version_number: pieceData.version_number || '1.0',
        parent_version_id: pieceData.parent_version_id || null,
        version_notes: pieceData.version_notes || null,
        is_major_revision: pieceData.is_major_revision !== undefined ? pieceData.is_major_revision : false
      }])
      .select()
      .single();

    if (error) throw error;

    // If collaborators provided, insert them into collaborators table
    if (pieceData.collaborators && pieceData.collaborators.length > 0) {
      const collaboratorInserts = pieceData.collaborators.map(email => ({
        piece_id: data.id,
        invitee_email: email,
        role: 'reviewer'
      }));

      await supabase.from('collaborators').insert(collaboratorInserts);
    }

    return data;
  },

  /**
   * Update a piece
   * @param {string} pieceId - Piece ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated piece
   */
  update: async (pieceId, updates) => {
    // Recalculate word count if content changed
    if (updates.content) {
      updates.word_count = updates.content.trim().split(/\s+/).filter(w => w.length > 0).length;
    }

    const { data, error } = await supabase
      .from('pieces')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', pieceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a piece (cascades to comments, versions, collaborators)
   * @param {string} pieceId - Piece ID
   * @returns {Promise<void>}
   */
  delete: async (pieceId) => {
    const { error } = await supabase
      .from('pieces')
      .delete()
      .eq('id', pieceId);

    if (error) throw error;
  },

  /**
   * Filter pieces by criteria
   * @param {Object} filters - Filter criteria (e.g., { parent_version_id: 'xxx', status: 'completed' })
   * @param {string} sortField - Field to sort by
   * @param {number} limit - Max number of results
   * @returns {Promise<Array>} Array of filtered pieces
   */
  filter: async (filters = {}, sortField = 'created_at', limit = 100) => {
    let query = supabase.from('pieces').select('*');

    // Apply each filter
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        // Skip invalid/placeholder UUIDs
        if (typeof value === 'string' && value.startsWith('00000000-0000-0000')) {
          return; // Skip this filter
        }
        query = query.eq(key, value);
      } else if (value === null) {
        query = query.is(key, null);
      }
    });

    // Apply sorting and limit
    if (sortField) {
      query = query.order(sortField, { ascending: false });
    }
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all pieces in a version chain
   * @param {string} versionChainId - Version chain ID
   * @returns {Promise<Array>} Array of pieces in the chain
   */
  getVersionChain: async (versionChainId) => {
    const { data, error } = await supabase
      .from('pieces')
      .select('*')
      .eq('version_chain_id', versionChainId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }
};

// ============================================================================
// VERSIONS (Snapshot History)
// ============================================================================

export const Version = {
  /**
   * List versions for a piece
   * @param {string} pieceId - Piece ID
   * @returns {Promise<Array>} Array of versions
   */
  list: async (pieceId) => {
    const { data, error } = await supabase
      .from('versions')
      .select('*')
      .eq('piece_id', pieceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a specific version
   * @param {string} versionId - Version ID
   * @returns {Promise<Object>} Version object
   */
  get: async (versionId) => {
    const { data, error } = await supabase
      .from('versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new version snapshot
   * @param {Object} versionData - Version data
   * @returns {Promise<Object>} Created version
   */
  create: async (versionData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from('versions')
      .insert([{
        piece_id: versionData.piece_id,
        author_id: versionData.author_id || user.id,
        content: versionData.content,
        version_label: versionData.version_label || null
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get the latest version for a piece
   * @param {string} pieceId - Piece ID
   * @returns {Promise<Object|null>} Latest version or null
   */
  getLatest: async (pieceId) => {
    const { data, error } = await supabase
      .from('versions')
      .select('*')
      .eq('piece_id', pieceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
};

// ============================================================================
// COMMENTS (Feedback & Annotations)
// ============================================================================

export const Comment = {
  /**
   * List comments for a piece
   * @param {string} pieceId - Piece ID
   * @param {boolean} includeReplies - Whether to include threaded replies
   * @returns {Promise<Array>} Array of comments
   */
  list: async (pieceId, includeReplies = true) => {
    let query = supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_author_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('piece_id', pieceId);

    if (!includeReplies) {
      query = query.is('parent_comment_id', null);
    }

    query = query.order('created_at', { ascending: true });

    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Get recent comments across all pieces (for activity feed)
   * @param {number} limit - Maximum number of comments to return
   * @returns {Promise<Array>} Array of recent comments
   */
  listRecent: async (limit = 10) => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_author_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single comment
   * @param {string} commentId - Comment ID
   * @returns {Promise<Object>} Comment object
   */
  get: async (commentId) => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_author_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('id', commentId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new comment
   * @param {Object} commentData - Comment data
   * @returns {Promise<Object>} Created comment
   */
  create: async (commentData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const contentText = commentData.content || commentData.comment_text;

    const { data, error } = await supabase
      .from('comments')
      .insert([{
        piece_id: commentData.piece_id,
        version_id: commentData.version_id || null,
        author_id: user.id,
        content: contentText,
        comment_text: contentText, // Temporary: Fill both columns until DB migration
        selection_json: commentData.selection_json || null,
        parent_comment_id: commentData.parent_comment_id || null,
        is_resolved: commentData.is_resolved !== undefined ? commentData.is_resolved : false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a comment
   * @param {string} commentId - Comment ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated comment
   */
  update: async (commentId, updates) => {
    const { data, error } = await supabase
      .from('comments')
      .update(updates)
      .eq('id', commentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a comment (cascades to replies if configured)
   * @param {string} commentId - Comment ID
   * @returns {Promise<void>}
   */
  delete: async (commentId) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  },

  /**
   * Get replies to a comment
   * @param {string} parentCommentId - Parent comment ID
   * @returns {Promise<Array>} Array of reply comments
   */
  getReplies: async (parentCommentId) => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_author_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('parent_comment_id', parentCommentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Mark a comment as resolved
   * @param {string} commentId - Comment ID
   * @returns {Promise<Object>} Updated comment
   */
  resolve: async (commentId) => {
    return Comment.update(commentId, { is_resolved: true });
  },

  /**
   * Mark a comment as unresolved
   * @param {string} commentId - Comment ID
   * @returns {Promise<Object>} Updated comment
   */
  unresolve: async (commentId) => {
    return Comment.update(commentId, { is_resolved: false });
  },

  /**
   * Filter comments by criteria
   * @param {Object} filters - Filter criteria (e.g., { piece_id: 'xxx', status: 'submitted' })
   * @param {string} sortField - Field to sort by
   * @returns {Promise<Array>} Array of filtered comments
   */
  filter: async (filters = {}, sortField = 'created_at') => {
    let query = supabase.from('comments').select('*');

    // Apply each filter
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        query = query.eq(key, value);
      }
    });

    // Apply sorting
    if (sortField) {
      query = query.order(sortField, { ascending: true });
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }
};

// ============================================================================
// COLLABORATORS (Access Management)
// ============================================================================

export const Collaborator = {
  /**
   * List collaborators for a piece
   * @param {string} pieceId - Piece ID
   * @returns {Promise<Array>} Array of collaborators
   */
  list: async (pieceId) => {
    const { data, error } = await supabase
      .from('collaborators')
      .select('*')
      .eq('piece_id', pieceId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Invite a collaborator to a piece
   * @param {Object} collaboratorData - Collaborator data
   * @returns {Promise<Object>} Created collaborator record
   */
  invite: async (collaboratorData) => {
    const { data, error } = await supabase
      .from('collaborators')
      .insert([{
        piece_id: collaboratorData.piece_id,
        invitee_email: collaboratorData.invitee_email,
        role: collaboratorData.role || 'reviewer'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Invite multiple collaborators at once
   * @param {string} pieceId - Piece ID
   * @param {Array<string>} emails - Array of email addresses
   * @param {string} role - Role to assign (default: 'reviewer')
   * @returns {Promise<Array>} Array of created collaborator records
   */
  inviteMultiple: async (pieceId, emails, role = 'reviewer') => {
    const inserts = emails.map(email => ({
      piece_id: pieceId,
      invitee_email: email,
      role: role
    }));

    const { data, error } = await supabase
      .from('collaborators')
      .insert(inserts)
      .select();

    if (error) throw error;
    return data || [];
  },

  /**
   * Remove a collaborator
   * @param {string} collaboratorId - Collaborator ID
   * @returns {Promise<void>}
   */
  remove: async (collaboratorId) => {
    const { error } = await supabase
      .from('collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) throw error;
  },

  /**
   * Update collaborator role
   * @param {string} collaboratorId - Collaborator ID
   * @param {string} newRole - New role
   * @returns {Promise<Object>} Updated collaborator
   */
  updateRole: async (collaboratorId, newRole) => {
    const { data, error } = await supabase
      .from('collaborators')
      .update({ role: newRole })
      .eq('id', collaboratorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// ============================================================================
// VERSION CHAINS (Multi-Version Management)
// ============================================================================

export const VersionChain = {
  /**
   * List version chains for current user
   * @returns {Promise<Array>} Array of version chains
   */
  list: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Note: This assumes you'll create the version_chains table
    // If you haven't, this will fail gracefully
    const { data, error } = await supabase
      .from('version_chains')
      .select('*')
      .eq('author_email', user.email)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("VersionChain.list failed - table may not exist:", error.message);
      return [];
    }
    return data || [];
  },

  /**
   * Get a version chain by ID
   * @param {string} chainId - Chain ID
   * @returns {Promise<Object>} Version chain object
   */
  get: async (chainId) => {
    const { data, error } = await supabase
      .from('version_chains')
      .select('*')
      .eq('id', chainId)
      .single();

    if (error) {
      console.warn("VersionChain.get failed - table may not exist:", error.message);
      return null;
    }
    return data;
  },

  /**
   * Create a new version chain
   * @param {Object} chainData - Chain data
   * @returns {Promise<Object>} Created chain
   */
  create: async (chainData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from('version_chains')
      .insert([{
        title: chainData.title,
        description: chainData.description || null,
        genre: chainData.genre || 'Uncategorized',
        author_email: chainData.author_email || user.email,
        original_piece_id: chainData.original_piece_id || null,
        current_version: chainData.current_version || null,
        status: chainData.status || 'active',
        version_count: chainData.version_count || 1,
        trusted_reviewers: chainData.trusted_reviewers || []
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a version chain
   * @param {string} chainId - Chain ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated chain
   */
  update: async (chainId, updates) => {
    const { data, error } = await supabase
      .from('version_chains')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', chainId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a version chain
   * @param {string} chainId - Chain ID
   * @returns {Promise<void>}
   */
  delete: async (chainId) => {
    const { error } = await supabase
      .from('version_chains')
      .delete()
      .eq('id', chainId);

    if (error) throw error;
  }
};

// ============================================================================
// PROJECTS (Optional - if you use the projects table)
// ============================================================================

export const Project = {
  /**
   * List projects for current user
   * @returns {Promise<Array>} Array of projects
   */
  list: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a project by ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project object
   */
  get: async (projectId) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new project
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Created project
   */
  create: async (projectData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        user_id: user.id,
        title: projectData.title,
        content: projectData.content || '',
        description: projectData.description || null,
        genre: projectData.genre || 'Uncategorized',
        status: projectData.status || 'draft',
        word_count: projectData.word_count || 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a project
   * @param {string} projectId - Project ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated project
   */
  update: async (projectId, updates) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a project
   * @param {string} projectId - Project ID
   * @returns {Promise<void>}
   */
  delete: async (projectId) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  }
};

// ============================================================================
// ANALYTICS (Placeholder for future implementation)
// ============================================================================

export const PieceAnalytics = {
  /**
   * Get analytics for a piece
   * @param {string} pieceId - Piece ID
   * @returns {Promise<Object>} Analytics data
   */
  get: async (pieceId) => {
    // This is a placeholder - implement when you add analytics tracking
    return {
      views: 0,
      unique_readers: 0,
      avg_read_time: 0,
      comment_count: 0,
      collaborator_count: 0
    };
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Subscribe to real-time changes for a table
 * @param {string} table - Table name
 * @param {string} event - Event type (INSERT, UPDATE, DELETE, *)
 * @param {Function} callback - Function to call on change
 * @param {Object} filter - Optional filter (e.g., { column: 'piece_id', value: '123' })
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToChanges = (table, event, callback, filter = null) => {
  let channelName = `${table}_changes_${Date.now()}`;
  let channel = supabase.channel(channelName);

  let config = {
    event: event,
    schema: 'public',
    table: table
  };

  if (filter) {
    config.filter = `${filter.column}=eq.${filter.value}`;
  }

  channel.on('postgres_changes', config, callback).subscribe();

  return {
    unsubscribe: () => supabase.removeChannel(channel)
  };
};

/**
 * Batch fetch related data for multiple pieces
 * @param {Array<string>} pieceIds - Array of piece IDs
 * @returns {Promise<Object>} Object with pieces, comments, versions indexed by piece_id
 */
export const batchFetchPieceData = async (pieceIds) => {
  const [piecesRes, commentsRes, versionsRes] = await Promise.all([
    supabase.from('pieces').select('*').in('id', pieceIds),
    supabase.from('comments').select('*').in('piece_id', pieceIds),
    supabase.from('versions').select('*').in('piece_id', pieceIds)
  ]);

  return {
    pieces: piecesRes.data || [],
    comments: commentsRes.data || [],
    versions: versionsRes.data || []
  };
};