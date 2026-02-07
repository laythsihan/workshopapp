
import React, { useState, useMemo, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  User,
  Calendar,
  Users,
  BookOpen
} from "lucide-react";
import { format, differenceInCalendarDays, isPast } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

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

const DeadlineDisplay = ({ deadline }) => {
  if (!deadline) {
    return <span className="text-sm text-stone-400">No deadline</span>;
  }

  const now = new Date();
  // Ensure the deadline is parsed correctly, accounting for timezone issues
  // Appending 'T00:00:00' assumes the deadline string is 'YYYY-MM-DD'
  // and treats it as the start of that day in local time.
  const deadlineDate = new Date(deadline + 'T00:00:00');
  const daysRemaining = differenceInCalendarDays(deadlineDate, now);
  
  let text = format(deadlineDate, "MMM d, yyyy");
  let textColor = "text-stone-600";
  let iconColor = "text-stone-400";
  
  if (isPast(deadlineDate) && daysRemaining < 0) {
      text = `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} ago`;
      textColor = "text-red-600 font-semibold";
      iconColor = "text-red-500";
  } else if (daysRemaining === 0) {
      text = "Due today";
      textColor = "text-amber-600 font-semibold";
      iconColor = "text-amber-500";
  } else if (daysRemaining > 0 && daysRemaining <= 3) {
      text = `in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
      textColor = "text-amber-600";
      iconColor = "text-amber-500";
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className={`w-4 h-4 ${iconColor}`} />
      <span className={`text-sm whitespace-nowrap ${textColor}`}>{text}</span>
    </div>
  );
};


export default function InvitedPiecesTable({ pieces }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [sortField, setSortField] = useState("workshop_deadline");
  const [sortDirection, setSortDirection] = useState("asc");

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
  
  const getAuthorName = (email) => {
      if (!email) return 'Unknown';
      return email.split('@')[0];
  }

  const processedPieces = useMemo(() => {
    let filtered = pieces.filter(piece => {
      const authorName = getAuthorName(piece.created_by).toLowerCase();
      const matchesSearch = piece.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            authorName.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || piece.status === statusFilter;
      const matchesGenre = genreFilter === "all" || piece.genre === genreFilter;
      return matchesSearch && matchesStatus && matchesGenre;
    });

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'created_by') {
        aVal = getAuthorName(a.created_by);
        bVal = getAuthorName(b.created_by);
      } else if (sortField === 'created_date' || sortField === 'workshop_deadline') {
        if (!aVal) aVal = sortDirection === 'asc' ? '9999-12-31' : '0000-01-01';
        if (!bVal) bVal = sortDirection === 'asc' ? '9999-12-31' : '0000-01-01';
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (sortField === 'word_count') {
          aVal = a.word_count || 0;
          bVal = b.word_count || 0;
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [pieces, searchTerm, statusFilter, genreFilter, sortField, sortDirection]);

  return (
    <div className="space-y-4">
      {/* Filters for Invited to Review */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-4 h-4" />
          <Input
            placeholder="Search by title or author..."
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

      {/* Table Content */}
      {processedPieces.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-stone-700 mb-2">
            {pieces.length === 0 ? "No review invitations" : "No pieces match your filters"}
          </h3>
          <p className="text-stone-500">
            {pieces.length === 0
              ? "You haven't been invited to review any pieces yet."
              : "Try adjusting your search or filter criteria."
            }
          </p>
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
                  <Button variant="ghost" onClick={() => handleSort("created_by")} className="h-auto p-0 font-semibold hover:text-black">
                    Author {getSortIcon("created_by")}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[170px] hidden lg:table-cell">
                  <Button variant="ghost" onClick={() => handleSort("workshop_deadline")} className="h-auto p-0 font-semibold hover:text-black">
                    Feedback Deadline {getSortIcon("workshop_deadline")}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[140px] hidden lg:table-cell">
                  <Button variant="ghost" onClick={() => handleSort("word_count")} className="h-auto p-0 font-semibold hover:text-black">
                    Word Count {getSortIcon("word_count")}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedPieces.map((piece) => (
                <TableRow key={piece.id} className="border-stone-200/50 hover:bg-stone-100/80 data-[state=selected]:bg-stone-100">
                  <TableCell className="w-full">
                    <Link to={createPageUrl(`workshop?piece=${piece.id}`)} className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="font-semibold text-stone-800 hover:text-black transition-colors">
                          {piece.title}
                        </span>
                        <Badge variant="outline" className={`${statusColors[piece.status]} shrink-0 text-xs`}>
                          {statusLabels[piece.status]}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                          {piece.genre}
                        </Badge>
                      </div>
                      {piece.description && (
                        <p className="text-sm text-stone-500 line-clamp-1">
                          {piece.description}
                        </p>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="min-w-[140px] hidden md:table-cell">
                    <Link to={createPageUrl(`workshop?piece=${piece.id}`)} className="h-full w-full block">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-stone-400" />
                        <span className="text-sm text-stone-600">{getAuthorName(piece.created_by)}</span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="min-w-[170px] hidden lg:table-cell">
                    <Link to={createPageUrl(`workshop?piece=${piece.id}`)} className="h-full w-full block">
                      <DeadlineDisplay deadline={piece.workshop_deadline} />
                    </Link>
                  </TableCell>
                  <TableCell className="min-w-[140px] hidden lg:table-cell">
                    <Link to={createPageUrl(`workshop?piece=${piece.id}`)} className="h-full w-full block">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-stone-400" />
                        <span className="text-sm text-stone-600">{piece.word_count?.toLocaleString() || 0}</span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="min-w-[120px] text-right">
                    <Link to={createPageUrl(`workshop?piece=${piece.id}`)}>
                      <Button variant="outline" className="h-auto w-full p-2 text-sm font-semibold border-stone-300 hover:bg-stone-100">
                        <Eye className="w-4 h-4 mr-2" />
                        Review
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
}
