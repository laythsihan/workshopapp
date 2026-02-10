import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Trash2, Users, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import InviteCollaboratorsDialog from "@/components/workshop/InviteCollaboratorsDialog";
import DeletePieceDialog from "@/components/workshop/DeletePieceDialog";

/**
 * Dashboard - displays user's pieces
 * @param {Array} pieces - Pieces from useWorkshopData
 * @param {boolean} isLoading - Loading state from useWorkshopData
 * @param {Function} onRefresh - Refresh function to reload data after changes
 */
export default function Dashboard({ pieces = [], isLoading = false, onRefresh }) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-stone-500">Loading your library...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="writer-heading text-4xl md:text-5xl">My Library</h1>
          <p className="mt-2 text-stone-500">
            Manage your manuscripts and workshop invitations.
          </p>
        </div>
        <Button
          onClick={() => navigate("/upload")}
          className="h-11 px-6 rounded-xl bg-stone-900 text-white hover:bg-stone-800 gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Manuscript
        </Button>
      </div>

      {pieces.length === 0 ? (
        <div className="max-w-md mx-auto mt-12 rounded-2xl border-2 border-dashed border-stone-300 bg-white p-12 text-center">
          <FileText className="w-10 h-10 mx-auto text-stone-400 mb-4" />
          <h3 className="writer-heading text-2xl">No manuscripts yet</h3>
          <p className="mt-2 text-stone-500">
            Upload your first piece to start getting feedback.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {pieces.map((piece) => (
            <Card
              key={piece.id}
              className="writer-surface rounded-2xl border-stone-200 hover:border-stone-300 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <Badge variant="outline" className="capitalize bg-stone-100 border-stone-200 text-stone-700">
                    {piece.isInvited ? "Reviewing" : piece.status?.replace(/_/g, ' ') || 'draft'}
                  </Badge>
                  <span className="text-xs text-stone-400">
                    {new Date(piece.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="font-serif text-2xl font-semibold text-stone-900 line-clamp-2 min-h-[64px]">
                  {piece.title}
                </h3>
                
                <div className="mt-6 flex items-center gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1 rounded-lg border-stone-300 bg-white hover:bg-stone-100"
                    onClick={() => navigate(`/workshop?piece=${piece.id}`)}
                  >
                    Open
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                  
                  {!piece.isInvited && (
                    <>
                      <InviteCollaboratorsDialog 
                        piece={piece} 
                        onUpdate={onRefresh}
                        trigger={
                          <Button variant="ghost" size="icon" className="text-stone-500 hover:text-stone-900">
                            <Users className="w-4 h-4" />
                          </Button>
                        }
                      />
                      
                      <DeletePieceDialog
                        piece={piece}
                        onSuccess={onRefresh}
                        trigger={
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-stone-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        }
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}