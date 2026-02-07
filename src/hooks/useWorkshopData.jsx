import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useWorkshopData(user) {
  const [pieces, setPieces] = useState([]);
  const [activity, setActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // 1. Fetch pieces you OWN
      const { data: ownedPieces } = await supabase
        .from('pieces')
        .select('*')
        .eq('owner_id', user.id);

      // 2. Fetch pieces you are INVITED TO
      const { data: collaborators } = await supabase
        .from('collaborators')
        .select('piece_id')
        .eq('invitee_email', user.email);

      const invitedIds = collaborators?.map(c => c.piece_id) || [];
      
      let allPieces = [...(ownedPieces || [])];
      
      if (invitedIds.length > 0) {
        const { data: invitedPieces } = await supabase
          .from('pieces')
          .select('*')
          .in('id', invitedIds);
        
        if (invitedPieces) {
          // Mark invited pieces so we can show a badge later
          const markedInvited = invitedPieces.map(p => ({ ...p, isInvited: true }));
          allPieces = [...allPieces, ...markedInvited];
        }
      }

      // 3. Fetch Recent Activity (Fixes the 400 Error with explicit join)
      const { data: activityData } = await supabase
        .from('comments')
        .select(`
          id,
          piece_id,
          author_id,
          comment_text,
          created_at,
          pieces:piece_id(title, owner_id),
          profiles:author_id(full_name)
        `)
        .eq('pieces.owner_id', user.id)
        .neq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setPieces(allPieces);
      setActivity(activityData || []);
    } catch (error) {
      console.error("Workshop Data Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { pieces, activity, isLoading, refresh: fetchData };
}