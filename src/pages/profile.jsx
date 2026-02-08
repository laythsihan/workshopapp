import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  AlertCircle, 
  Edit3, 
  PenTool, 
  BookOpen, 
  LogOut,
  Calendar,
  Mail,
  Camera,
  Trash2,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DeletePieceDialog from "@/components/workshop/DeletePieceDialog";

/**
 * Profile Page
 * @param {Object} user - User data from useWorkshopData
 * @param {Array} pieces - Pieces from useWorkshopData  
 * @param {Function} onRefresh - Refresh function to reload data
 */
export default function ProfilePage({ user: propUser, pieces = [], onRefresh }) {
  const [user, setUser] = useState(propUser);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    writing_interests: "",
    preferred_genres: "",
    location: "",
    website: "",
    avatar_url: ""
  });
  const [originalFormData, setOriginalFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [message, setMessage] = useState({ type: "", content: "" });
  const navigate = useNavigate();

  // Check if there are any changes
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);

  // Initialize form data when user prop changes
  useEffect(() => {
    if (propUser) {
      const profileData = {
        full_name: propUser.full_name || "",
        bio: propUser.bio || "",
        writing_interests: propUser.writing_interests || "",
        preferred_genres: propUser.preferred_genres || "",
        location: propUser.location || "",
        website: propUser.website || "",
        avatar_url: propUser.avatar_url || ""
      };
      setFormData(profileData);
      setOriginalFormData(profileData);
      setUser(propUser);
    }
  }, [propUser]);

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: "error", content: "Please select an image file" });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", content: "Image must be less than 5MB" });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, avatar_url: file_url }));
      setMessage({ type: "success", content: "Avatar uploaded successfully!" });
      setTimeout(() => setMessage({ type: "", content: "" }), 3000);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      setMessage({ type: "error", content: "Failed to upload avatar" });
    }
    setIsUploadingAvatar(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await User.updateProfile(formData);
      setUser(prev => ({ ...prev, ...formData }));
      setOriginalFormData(formData);
      setMessage({ type: "success", content: "Profile updated successfully!" });
      // Refresh app data to sync
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: "error", content: "Failed to update profile" });
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await User.signOut();
      window.location.reload();
    } catch (error) {
      console.error("Error logging out:", error);
      setMessage({ type: "error", content: "Failed to log out. Please try again." });
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-transparent p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-stone-800 mb-2">
            Profile Settings
          </h1>
          <p className="text-stone-600 text-lg">
            Manage your account and writing preferences
          </p>
        </div>

        {/* Success/Error Messages */}
        {message.content && (
          <Alert className={message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {message.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
              {message.content}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm border-stone-200/50">
              <CardHeader>
                <CardTitle className="text-xl text-stone-800">
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Avatar Upload Section */}
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        {formData.avatar_url ? (
                          <img 
                            src={formData.avatar_url} 
                            alt="Profile" 
                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                            <span className="text-gray-700 font-bold text-2xl">
                              {user?.full_name?.[0] || user?.email?.[0] || 'U'}
                            </span>
                          </div>
                        )}
                        <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 bg-black text-white rounded-full p-2 cursor-pointer hover:bg-stone-800 transition-colors">
                          <Camera className="w-4 h-4" />
                        </label>
                        <input 
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          disabled={isUploadingAvatar}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-stone-600">Profile Picture</p>
                        {isUploadingAvatar && (
                          <p className="text-xs text-stone-500">Uploading...</p>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Full Name
                      </label>
                      <Input
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        placeholder="Your full name"
                        className="border-stone-200 focus:border-stone-400 focus:ring-black"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Bio
                    </label>
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      placeholder="Tell us about your writing journey..."
                      rows={4}
                      className="border-stone-200 focus:border-stone-400 focus:ring-black"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Writing Interests
                      </label>
                      <Input
                        value={formData.writing_interests}
                        onChange={(e) => setFormData({...formData, writing_interests: e.target.value})}
                        placeholder="Fiction, Poetry, Screenwriting..."
                        className="border-stone-200 focus:border-stone-400 focus:ring-black"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Preferred Genres
                      </label>
                      <Input
                        value={formData.preferred_genres}
                        onChange={(e) => setFormData({...formData, preferred_genres: e.target.value})}
                        placeholder="Mystery, Romance, Sci-Fi..."
                        className="border-stone-200 focus:border-stone-400 focus:ring-black"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Location
                      </label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        placeholder="City, Country"
                        className="border-stone-200 focus:border-stone-400 focus:ring-black"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Website
                      </label>
                      <Input
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        placeholder="https://yourwebsite.com"
                        className="border-stone-200 focus:border-stone-400 focus:ring-black"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSaving || !hasChanges}
                    className="bg-black hover:bg-stone-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Summary */}
            <Card className="bg-white/80 backdrop-blur-sm border-stone-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-stone-800">
                  Account Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-stone-100/50 rounded-lg">
                  <Mail className="w-5 h-5 text-stone-600" />
                  <div>
                    <p className="text-sm font-medium text-stone-800">{user?.email}</p>
                    <p className="text-xs text-stone-500">Email Address</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-stone-100/50 rounded-lg">
                  <Calendar className="w-4 h-4 text-stone-600" />
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      {user?.created_date ? format(new Date(user.created_date), 'MMM d, yyyy') : 'Unknown'}
                    </p>
                    <p className="text-xs text-stone-500">Member Since</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                    {user?.role === 'admin' ? 'Administrator' : 'Writer'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/80 backdrop-blur-sm border-stone-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-stone-800">
                  <Edit3 className="w-5 h-5 text-stone-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-stone-200 hover:bg-stone-100"
                  onClick={() => navigate(createPageUrl("upload"))}
                >
                  <PenTool className="w-4 h-4 mr-2" />
                  Upload New Piece
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-stone-200 hover:bg-stone-100"
                  onClick={() => navigate(createPageUrl("dashboard"))}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  View My Library
                </Button>

                <Separator />

                <Button 
                  variant="outline"
                  className="w-full justify-start border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isLoggingOut ? "Logging out..." : "Log Out"}
                </Button>
              </CardContent>
            </Card>

            {/* My Manuscripts */}
            <Card className="bg-white/80 backdrop-blur-sm border-stone-200/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg text-stone-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-stone-600" />
                    My Manuscripts
                  </div>
                  <Badge variant="outline">{pieces.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pieces.length === 0 ? (
                  <p className="text-sm text-stone-500 text-center py-4">
                    No manuscripts yet
                  </p>
                ) : (
                  pieces.map((piece) => (
                    <div 
                      key={piece.id}
                      className="flex items-center justify-between p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-medium text-stone-800 truncate">
                          {piece.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className="text-xs capitalize"
                          >
                            {piece.status?.replace(/_/g, ' ') || 'draft'}
                          </Badge>
                          <span className="text-xs text-stone-500">
                            {piece.word_count || 0} words
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-stone-400 hover:text-stone-600"
                          onClick={() => navigate(`/workshop?piece=${piece.id}`)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <DeletePieceDialog
                          piece={piece}
                          onSuccess={onRefresh}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-stone-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}