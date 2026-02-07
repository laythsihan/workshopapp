import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.js"; 
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PiecesTable from "../components/dashboard/PiecesTable";

export default function Dashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pieces, setPieces] = useState([]);
  const [invitedPieces, setInvitedPieces] = useState([]);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  const loadData = useCallback(async () => {
    setStatus("loading");
    try {
      // 1. Get current session
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) {
        navigate("/login");
        return;
      }
      setUser(authUser);

      // 2. Fetch from 'pieces' (Corrected table name)
      const { data: allPieces, error: pieceError } = await supabase
        .from('pieces')
        .select('*')
        .order('created_at', { ascending: false });

      if (pieceError) throw pieceError;

      // 3. Map the data for PiecesTable
      // We map 'created_at' to 'created_date' to prevent the "Invalid Time" crash.
      const formattedPieces = allPieces.map(piece => ({
        ...piece,
        created_date: piece.created_at || new Date().toISOString(), 
        author_email: authUser.email // Placeholder if you don't store email on piece
      }));

      // 4. Separate your pieces from ones you might be invited to
      const myPieces = formattedPieces.filter(p => p.owner_id === authUser.id);
      
      // Note: If you have a collaborators system later, you'd filter sharedWithMe here.
      const sharedWithMe = []; 

      setPieces(myPieces);
      setInvitedPieces(sharedWithMe);
      setStatus("success");
    } catch (error) {
      console.error("Dashboard Load Error:", error);
      setStatus("error");
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeletePiece = useCallback(async (pieceId, pieceTitle) => {
    try {
      // Corrected to 'pieces' table
      const { error } = await supabase
        .from('pieces')
        .delete()
        .eq('id', pieceId);

      if (error) throw error;

      setPieces(prev => prev.filter(p => p.id !== pieceId));
      toast({
        title: "Piece deleted",
        description: `"${pieceTitle}" has been removed.`,
      });
    } catch (err) {
      toast({
        title: "Error deleting piece",
        variant: "destructive",
      });
    }
  }, [toast]);

  if (status === "loading") {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-stone-50/30">
        <div className="text-center text-stone-500">
            <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4 text-stone-400" />
            <p className="text-lg font-serif italic text-stone-600">Gathering your manuscripts...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
      return (
        <div className="min-h-screen p-6 flex items-center justify-center">
            <div className="text-center text-red-600 bg-red-50 p-8 rounded-2xl border border-red-200">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <p className="text-lg font-semibold">Connection Error</p>
                <p className="text-sm mb-6">Could not load your pieces. Check your internet or Supabase connection.</p>
                <Button onClick={loadData} variant="outline" className="border-red-200 text-red-600 hover:bg-red-100">Try Again</Button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
          <div className="w-full">
            <h1 className="text-3xl sm:text-4xl font-bold text-stone-800 mb-2 font-serif">My Library</h1>
            <p className="text-stone-600 text-lg">Manage your writing and workshop sessions.</p>
          </div>
          <Link to="/upload" className="w-full md:w-auto">
            <Button className="bg-stone-900 hover:bg-stone-800 text-white px-8 py-6 rounded-xl w-full md:w-auto text-md shadow-lg transition-all active:scale-95">
              <Plus className="w-5 h-5 mr-2" />
              New Piece
            </Button>
          </Link>
        </div>

        <div className="space-y-8">
          {pieces.length === 0 && invitedPieces.length === 0 ? (
            <div className="text-center py-32 bg-white/50 border-2 border-dashed border-stone-200 rounded-3xl">
              <div className="max-w-xs mx-auto space-y-4">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto">
                   <Plus className="w-8 h-8 text-stone-400" />
                </div>
                <p className="text-stone-500 font-serif italic text-lg">Your library is currently empty.</p>
                <Link to="/upload">
                  <Button variant="link" className="text-stone-800 font-semibold underline decoration-stone-300">
                    Upload your first story
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
               <PiecesTable 
                pieces={pieces} 
                invitedPieces={invitedPieces} 
                onDelete={handleDeletePiece} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}