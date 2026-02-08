import { useState, useEffect, useCallback } from 'react';
import { User, Piece, Comment } from '../api/entities';

/**
 * Centralized data hook for the entire app
 * Loads user, pieces, and activity once at the router level
 * Returns refresh function for pages to trigger reload
 */
export function useWorkshopData() {
  const [user, setUser] = useState(null);
  const [pieces, setPieces] = useState([]);
  const [activity, setActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      // 1. Get current user
      const userData = await User.me();
      setUser(userData);

      if (!userData) {
        setIsLoading(false);
        return;
      }

      // 2. Get all pieces (owned + invited)
      const allPieces = await Piece.list();
      
      // 3. Get recent comments for activity feed
      const recentComments = await Comment.listRecent(10);
      
      setPieces(allPieces || []);
      setActivity(recentComments || []);
    } catch (error) {
      console.error("Workshop Data Error:", error);
      // Don't throw - let the app continue with empty data
      setUser(null);
      setPieces([]);
      setActivity([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { 
    user,
    pieces, 
    activity, 
    isLoading, 
    refresh: fetchData 
  };
}