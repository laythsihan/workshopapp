
import React, { useState, useMemo, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Trash2,
  MoreHorizontal,
  Calendar,
  Users,
  BookOpen,
  ChevronDown,
  ChevronRight,
  GitBranch
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DeletePieceDialog from "./DeletePieceDialog";

const statusColors = {
  draft: "bg-slate-100 text-slate-800 border-slate-300",
  ready_for_feedback: "bg-blue-100 text-blue-800 border-blue-300",
  in_review: "bg-teal-100 text-teal-800 border-teal-300",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300"
};

const genreLabels = {
  short_story: "Short Story",
  novel: "Novel",
  flash_fiction: "Flash Fiction",
  novella: "Novella",
  poetry: "Poetry",
  screenplay: "Screenplay",
  other: "Other"
};

const statusLabels = {
  draft: "Draft",
  ready_for_feedback: "Ready for Feedback",
  in_review: "In Review",
  completed: "Completed"
};

// Minimal InvitedPiecesTable component for compilation purposes
const InvitedPiecesTable = ({ pieces }) => {
  return (
    <div className="text-center py-12">
      <Users className="w-16 h-16 text-stone-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-stone-700 mb-2">
        {pieces && pieces.length === 0 ? "No invitations yet" : "Pieces you are invited to review"}
      </h3>
      {pieces && pieces.length > 0 && (
        <div className="overflow-x-auto mt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200/50">
                <TableHead>Title</TableHead>
                <TableHead>Invited By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pieces.map((piece) => (
                <TableRow key={piece.id}>
                  <TableCell className="font-medium">{piece.title}</TableCell>
                  {/* Assuming piece has an 'invited_by' field for invited pieces */}
                  <TableCell>{piece.invited_by || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusColors[piece.status]} text-xs`}>
                      {statusLabels[piece.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link to={createPageUrl(`workshop?piece=${piece.id}`)}>
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default function PiecesTable({ pieces, invitedPieces, onDelete }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [sortField, setSortField] = useState("created_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [deleteDialogPiece, setDeleteDialogPiece] = useState(null);
  const [expandedRows, setExpandedRows] = useState([]);
  const [activeTab, setActiveTab] = useState("my_pieces");

  // Helper function to parse version numbers for sorting
  const parseVersionNumber = (versionStr) => {
    if (!versionStr) return 0;
    const parts = versionStr.split('.').map(Number);
    return (parts[0] || 0) * 10000 + (parts[1] || 0);
  };

  const toggleRow = (chainId) => {
    setExpandedRows(prev =>
      prev.includes(chainId)
        ? prev.filter(id => id !== chainId)
        : [...prev, chainId]
    );
  };

  const availableGenres = useMemo(() => {
    const genres = pieces.map(piece => piece.genre).filter(Boolean);
    return [...new Set(genres)].sort();
  }, [pieces]);

  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField]);

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === "asc"
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const processedPieces = useMemo(() => {
    // 1. Group all pieces that have a version_chain_id
    const groupedByChain = pieces
      .filter(p => p.version_chain_id)
      .reduce((acc, piece) => {
        const chainId = piece.version_chain_id;
        if (!acc[chainId]) acc[chainId] = [];
        acc[chainId].push(piece);
        return acc;
      }, {});

    // 2. Process the versioned groups
    const versionedItems = Object.values(groupedByChain).map(versions => {
      const sortedVersions = [...versions].sort((a, b) => {
        const aVersion = parseVersionNumber(a.version_number);
        const bVersion = parseVersionNumber(b.version_number);
        if (bVersion !== aVersion) return bVersion - aVersion;
        return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
      });

      const latestVersion = sortedVersions[0];

      return {
        ...latestVersion,
        versions: sortedVersions,
        version_count: sortedVersions.length,
        has_versions: sortedVersions.length > 1, // Only show arrow if there's more than one version
        chain_id: latestVersion.version_chain_id
      };
    });

    // 3. Get all standalone pieces (those without a version_chain_id)
    const standaloneItems = pieces
      .filter(p => !p.version_chain_id)
      .map(piece => ({
        ...piece,
        versions: [piece],
        version_count: 1,
        has_versions: false, // Standalone pieces never have versions to show
        chain_id: `legacy-${piece.id}`
      }));

    // 4. Combine all items
    let displayItems = [...versionedItems, ...standaloneItems];

    // 5. Filter the display items
    let filtered = displayItems.filter(piece => {
      const matchesSearch = piece.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (piece.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || piece.status === statusFilter;
      const matchesGenre = genreFilter === "all" || piece.genre === genreFilter;
      return matchesSearch && matchesStatus && matchesGenre;
    });

    // 6. Sort the filtered items
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'collaborator_count') {
        aVal = a.collaborators?.length || 0;
        bVal = b.collaborators?.length || 0;
      } else if (sortField === 'created_date' || sortField === 'workshop_deadline') {
        aVal = a[sortField] ? new Date(a[sortField]) : 0;
        bVal = b[sortField] ? new Date(b[sortField]) : 0;
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [pieces, searchTerm, statusFilter, genreFilter, sortField, sortDirection]);

  const handleDeletePiece = useCallback((pieceId, pieceTitle) => {
    onDelete(pieceId, pieceTitle);
  }, [onDelete]);

  return (
    <>
      <Card className="bg-white/80 backdrop-blur-sm border-stone-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-stone-800">
            <BookOpen className="w-5 h-5 text-stone-600" />
            My Writing
          </CardTitle>

          {/* Tabs inside the card */}
          <div className="flex space-x-2 sm:space-x-4 border-b border-stone-200">
            <button
              onClick={() => setActiveTab("my_pieces")}
              className={`px-2 sm:px-4 py-3 font-medium transition-all duration-300 shrink-0 ${
                activeTab === "my_pieces"
                  ? "border-b-2 border-black text-black"
                  : "text-stone-500 hover:text-black"
              }`}
            >
              My Pieces ({pieces.length})
            </button>
            <button
              onClick={() => setActiveTab("invited")}
              className={`px-2 sm:px-4 py-3 font-medium transition-all duration-300 shrink-0 ${
                activeTab === "invited"
                  ? "border-b-2 border-black text-black"
                  : "text-stone-500 hover:text-black"
              }`}
            >
              Invited to Review ({invitedPieces.length})
            </button>
          </div>

          {/* Filters - only show when my_pieces tab is active */}
          {activeTab === "my_pieces" && (
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-4 h-4" />
                <Input
                  placeholder="Search pieces..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-stone-200 focus:border-stone-400 focus:ring-black"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 border-stone-200 focus:ring-black">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="ready_for_feedback">Ready for Feedback</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={genreFilter} onValueChange={setGenreFilter}>
                  <SelectTrigger className="w-full sm:w-48 border-stone-200 focus:ring-black">
                    <SelectValue placeholder="Filter by genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genres</SelectItem>
                    {availableGenres.map((genre) => (
                      <SelectItem key={genre} value={genre}>
                        {genreLabels[genre] || genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {activeTab === "my_pieces" ? (
            processedPieces.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-stone-700 mb-2">
                  {pieces.length === 0 ? "No pieces yet" : "No pieces match your filters"}
                </h3>
                <p className="text-stone-500 mb-6">
                  {pieces.length === 0
                    ? "Start your writing journey by uploading your first piece"
                    : "Try adjusting your search or filter criteria"
                  }
                </p>
                {pieces.length === 0 && (
                  <Link to={createPageUrl("upload")}>
                    <Button className="bg-black hover:bg-stone-800 text-white">
                      Upload Your First Piece
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-stone-200/50">
                      <TableHead className="w-full">
                        <Button variant="ghost" onClick={() => handleSort("title")} className="h-auto p-0 font-semibold hover:text-black">
                          Title {getSortIcon("title")}
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[140px] hidden md:table-cell">
                        <Button variant="ghost" onClick={() => handleSort("genre")} className="h-auto p-0 font-semibold hover:text-black">
                          Genre {getSortIcon("genre")}
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[140px] hidden lg:table-cell">
                        <Button variant="ghost" onClick={() => handleSort("collaborator_count")} className="h-auto p-0 font-semibold hover:text-black">
                          Collaborators {getSortIcon("collaborator_count")}
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[140px] hidden lg:table-cell">
                        <Button variant="ghost" onClick={() => handleSort("created_date")} className="h-auto p-0 font-semibold hover:text-black">
                          Last Updated {getSortIcon("created_date")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedPieces.map((piece) => {
                      const isExpanded = expandedRows.includes(piece.chain_id);
                      const olderVersions = piece.versions.slice(1);
                      const showExpandButton = piece.has_versions;

                      return (
                        <React.Fragment key={piece.id}>
                          <TableRow className="border-stone-200/50 hover:bg-stone-100/80 data-[state=selected]:bg-stone-100">
                            <TableCell className="w-full">
                              <div className="flex items-start gap-2 sm:gap-3">
                                {showExpandButton ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleRow(piece.chain_id)}
                                    className={`h-8 w-8 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                  >
                                    <ChevronRight className="w-4 h-4"/>
                                  </Button>
                                ) : (
                                  <div className="h-8 w-8 shrink-0"></div>
                                )}
                                <Link to={createPageUrl(`workshop?piece=${piece.id}`)} className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 flex-wrap mb-1">
                                    <span className="font-semibold text-stone-800 hover:text-black transition-colors">
                                      {piece.title}
                                    </span>
                                    <Badge variant="outline" className={`${statusColors[piece.status]} shrink-0 text-xs`}>
                                      {statusLabels[piece.status]}
                                    </Badge>
                                    {piece.version_number && (
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        v{piece.version_number}
                                      </Badge>
                                    )}
                                    {showExpandButton && (
                                      <Badge variant="outline" className="text-xs bg-stone-100 text-stone-600 border-stone-300">
                                        {piece.version_count} versions
                                      </Badge>
                                    )}
                                  </div>
                                  {piece.description && (
                                    <p className="text-sm text-stone-500 line-clamp-2">
                                      {piece.description}
                                    </p>
                                  )}
                                  {piece.version_notes && (
                                    <p className="text-xs text-stone-400 italic mt-1">
                                      Latest: {piece.version_notes}
                                    </p>
                                  )}
                                </Link>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[140px] hidden md:table-cell">
                              <Link to={createPageUrl(`workshop?piece=${piece.id}`)} className="h-full w-full block">
                                <span className="text-sm text-stone-600">
                                  {genreLabels[piece.genre] || piece.genre}
                                </span>
                              </Link>
                            </TableCell>
                            <TableCell className="min-w-[140px] hidden lg:table-cell">
                              <Link to={createPageUrl(`workshop?piece=${piece.id}`)} className="h-full w-full block">
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4 text-stone-400" />
                                  <span className="text-sm">{piece.collaborators?.length || 0}</span>
                                </div>
                              </Link>
                            </TableCell>
                            <TableCell className="min-w-[140px] hidden lg:table-cell">
                              <Link to={createPageUrl(`workshop?piece=${piece.id}`)} className="h-full w-full block">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-stone-400" />
                                  <span className="text-sm text-stone-600 whitespace-nowrap">
                                    {format(new Date(piece.created_date), "MMM d, yyyy")}
                                  </span>
                                </div>
                              </Link>
                            </TableCell>
                            <TableCell className="w-[60px]" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link to={createPageUrl(`workshop?piece=${piece.id}`)}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Latest
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteDialogPiece(piece)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>

                          {isExpanded && olderVersions.map((version) => (
                            <TableRow key={version.id} className="bg-stone-50 hover:bg-stone-100/80">
                              <TableCell className="pl-8 sm:pl-14">
                                <Link to={createPageUrl(`workshop?piece=${version.id}`)} className="flex items-center gap-3">
                                  <GitBranch className="w-4 h-4 text-stone-400 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-stone-700">
                                        Version {version.version_number || '1.0'}
                                      </span>
                                      <Badge variant="outline" className={`${statusColors[version.status]} shrink-0 text-xs`}>
                                        {statusLabels[version.status]}
                                      </Badge>
                                    </div>
                                    {version.version_notes && (
                                      <p className="text-xs text-stone-500 truncate mt-1">
                                        Notes: {version.version_notes}
                                      </p>
                                    )}
                                  </div>
                                </Link>
                              </TableCell>
                              <TableCell className="hidden md:table-cell"></TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <Link to={createPageUrl(`workshop?piece=${version.id}`)} className="h-full w-full block">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4 text-stone-400" />
                                    <span className="text-sm">{version.collaborators?.length || 0}</span>
                                  </div>
                                </Link>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <Link to={createPageUrl(`workshop?piece=${version.id}`)} className="h-full w-full block">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-stone-400" />
                                    <span className="text-sm text-stone-600 whitespace-nowrap">
                                      {format(new Date(version.created_date), "MMM d, yyyy")}
                                    </span>
                                  </div>
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Link to={createPageUrl(`workshop?piece=${version.id}`)}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            <InvitedPiecesTable pieces={invitedPieces} />
          )}
        </CardContent>
      </Card>

      {deleteDialogPiece && (
        <DeletePieceDialog
          piece={deleteDialogPiece}
          open={!!deleteDialogPiece}
          onOpenChange={(open) => !open && setDeleteDialogPiece(null)}
          onConfirm={() => {
            handleDeletePiece(deleteDialogPiece.id, deleteDialogPiece.title);
            setDeleteDialogPiece(null);
          }}
        />
      )}
    </>
  );
}
