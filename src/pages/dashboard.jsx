import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Book, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import InviteCollaboratorsDialog from "@/components/workshop/InviteCollaboratorsDialog";

export default function Dashboard({ pieces = [], isLoading, onUpdate }) {
  const navigate = useNavigate();
  const [selectedPiece, setSelectedPiece] = useState(null);

  if (isLoading) {
    return <div className="flex justify-center py-20">Loading your library...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-serif font-bold text-stone-900">My Library</h1>
          <p className="text-stone-500 mt-2">Manage your manuscripts and workshop invitations.</p>
        </div>
        <Button onClick={() => navigate("/upload")} className="bg-black text-white gap-2">
          <Plus className="w-4 h-4" /> New Manuscript
        </Button>
      </div>

      {pieces.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-2xl">
          <Book className="w-12 h-12 mx-auto text-stone-300 mb-4" />
          <h3 className="text-lg font-medium text-stone-900">No manuscripts yet</h3>
          <p className="text-stone-500">Upload your first piece to start getting feedback.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pieces.map((piece) => (
            <Card key={piece.id} className="group hover:shadow-md transition-all border-stone-200">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant={piece.isInvited ? "secondary" : "outline"} className="capitalize">
                    {piece.isInvited ? "Reviewing" : piece.status.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {new Date(piece.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="text-xl font-serif font-bold mb-2 line-clamp-1">{piece.title}</h3>
                
                <div className="flex items-center gap-4 mt-6">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-stone-200"
                    onClick={() => navigate(`/workshop?piece=${piece.id}`)}
                  >
                    Open
                  </Button>
                  
                  {!piece.isInvited && (
                    <InviteCollaboratorsDialog 
                      piece={piece} 
                      onUpdate={onUpdate}
                      trigger={
                        <Button variant="ghost" size="icon" className="text-stone-400 hover:text-black">
                          <Users className="w-4 h-4" />
                        </Button>
                      }
                    />
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