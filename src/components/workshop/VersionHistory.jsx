import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Piece } from "@/api/entities";
import { VersionChain } from "@/api/entities";
import { Comment } from "@/api/entities";
import { 
  History, 
  GitBranch, 
  MessageSquare, 
  Eye, 
  Plus,
  Clock,
  Users,
  FileText,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  draft: "bg-gray-100 text-gray-800 border-gray-300",
  ready_for_workshop: "bg-blue-100 text-blue-800 border-blue-300", 
  in_workshop: "bg-teal-100 text-teal-800 border-teal-300",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300"
};

export default function VersionHistory({ currentPiece, onCreateVersion }) {
  const [versionChain, setVersionChain] = useState(null);
  const [allVersions, setAllVersions] = useState([]);
  const [versionComments, setVersionComments] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVersionHistory();
  }, [currentPiece]);

  const loadVersionHistory = async () => {
    if (!currentPiece?.version_chain_id) {
      setIsLoading(false);
      return;
    }

    try {
      // Load the version chain
      const chain = await VersionChain.get(currentPiece.version_chain_id);
      setVersionChain(chain);

      // Load all pieces in this version chain
      const versions = await Piece.filter(
        { version_chain_id: currentPiece.version_chain_id },
        "-created_date"
      );
      setAllVersions(versions);

      // Load comments for each version
      const commentPromises = versions.map(async (version) => {
        const comments = await Comment.filter({ piece_id: version.id });
        return { versionId: version.id, comments };
      });
      
      const commentResults = await Promise.all(commentPromises);
      const commentMap = commentResults.reduce((acc, { versionId, comments }) => {
        acc[versionId] = comments;
        return acc;
      }, {});
      
      setVersionComments(commentMap);
    } catch (error) {
      console.error("Error loading version history:", error);
    }
    setIsLoading(false);
  };

  const getVersionStats = (version) => {
    const comments = versionComments[version.id] || [];
    const uniqueCommenters = new Set(comments.map(c => c.commenter_email)).size;
    return {
      commentCount: comments.length,
      reviewerCount: uniqueCommenters,
      wordCountChange: getWordCountChange(version),
    };
  };

  const getWordCountChange = (version) => {
    if (!version.parent_version_id) return 0;
    const parentVersion = allVersions.find(v => v.id === version.parent_version_id);
    if (!parentVersion) return 0;
    return version.word_count - parentVersion.word_count;
  };

  const canCreateNewVersion = currentPiece?.status === 'completed';

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-stone-200">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-stone-200 rounded w-3/4 mx-auto"></div>
            <div className="h-3 bg-stone-200 rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-stone-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-stone-800">
            <History className="w-5 h-5 text-stone-600" />
            Version History
          </CardTitle>
          {canCreateNewVersion && (
            <Button
              onClick={onCreateVersion}
              size="sm" 
              className="bg-black hover:bg-stone-800 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Version
            </Button>
          )}
        </div>
        
        {versionChain && (
          <div className="text-sm text-stone-600">
            <div className="flex items-center gap-4 flex-wrap">
              <span>{allVersions.length} versions</span>
              <span>•</span>
              <span>{versionChain.trusted_reviewers?.length || 0} trusted reviewers</span>
              <span>•</span>
              <span>Started {format(new Date(versionChain.created_date), 'MMM yyyy')}</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {!versionChain ? (
          <div className="text-center py-8 text-stone-500">
            <GitBranch className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-sm">This piece doesn't have version history yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allVersions.map((version, index) => {
              const stats = getVersionStats(version);
              const isCurrentVersion = version.id === currentPiece.id;
              const wordCountChange = stats.wordCountChange;
              
              return (
                <div key={version.id} className="relative">
                  {/* Timeline connector */}
                  {index < allVersions.length - 1 && (
                    <div className="absolute left-4 top-12 w-0.5 h-16 bg-stone-200"></div>
                  )}
                  
                  <div className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 ${
                    isCurrentVersion 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}>
                    {/* Version indicator */}
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCurrentVersion 
                        ? 'border-blue-500 bg-blue-500 text-white' 
                        : 'border-stone-300 bg-white text-stone-600'
                    }`}>
                      {version.version_number}
                    </div>

                    {/* Version details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-stone-800 truncate">
                              {version.title}
                            </h4>
                            {isCurrentVersion && (
                              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                                Current
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-xs ${statusColors[version.status]}`}>
                              {version.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          
                          {version.version_notes && (
                            <p className="text-sm text-stone-600 mb-2 line-clamp-2">
                              {version.version_notes}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-stone-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(version.created_date), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {version.word_count?.toLocaleString()} words
                              {wordCountChange !== 0 && (
                                <span className={`ml-1 ${wordCountChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ({wordCountChange > 0 ? '+' : ''}{wordCountChange})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {stats.commentCount} comments
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {stats.reviewerCount} reviewers
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Link to={createPageUrl(`workshop?piece=${version.id}`)}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Progress indicator */}
            <div className="mt-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-stone-600" />
                  <span className="font-medium text-stone-700">Writing Journey</span>
                </div>
                <div className="text-stone-600">
                  {allVersions.length} versions • {Object.values(versionComments).flat().length} total comments
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}