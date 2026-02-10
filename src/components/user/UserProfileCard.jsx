import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Link as LinkIcon, AlertCircle } from 'lucide-react';

export default function UserProfileCard({ userId, email }) {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (userId) {
          const profile = await User.get(userId);
          if (profile) {
            setUserData(profile);
          } else {
            setError("User not found.");
          }
        } else if (email) {
          // Fallback for places where only email is available.
          setUserData({
            full_name: email.split("@")[0],
            email
          });
        } else {
          setError("No user info provided.");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to fetch user data.");
      }

      setIsLoading(false);
    };

    fetchUserData();
  }, [userId, email]);

  if (isLoading) {
    return (
      <Card className="w-80 shadow-xl">
        <CardContent className="p-6 flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-80 shadow-xl">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center h-48">
          <AlertCircle className="w-8 h-8 text-red-400 mb-2"/>
          <p className="font-semibold text-red-700">{error}</p>
          <p className="text-sm text-stone-500">{email || userId}</p>
        </CardContent>
      </Card>
    );
  }

  if (!userData) {
    return null;
  }

  const interests = userData.writing_interests?.split(',').map(s => s.trim()).filter(Boolean) || [];
  const genres = userData.preferred_genres?.split(',').map(s => s.trim()).filter(Boolean) || [];

  return (
    <Card className="w-80 shadow-xl border-stone-200/80">
      <CardHeader className="p-4 bg-stone-50/50">
        <div className="flex items-center gap-4">
          {userData.avatar_url ? (
            <img src={userData.avatar_url} alt={userData.full_name} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md" />
          ) : (
            <div className="w-16 h-16 bg-stone-200 rounded-full flex items-center justify-center border-4 border-white shadow-md">
              <span className="text-xl font-bold text-stone-600">{userData.full_name?.[0] || userData.email?.[0]}</span>
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-stone-800 truncate">{userData.full_name || 'Writer'}</h3>
            <p className="text-sm text-stone-500 truncate">{userData.email}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {userData.bio && <p className="text-sm text-stone-700 leading-relaxed">{userData.bio}</p>}
        
        <div className="space-y-3">
          {interests.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Interests</h4>
              <div className="flex flex-wrap gap-2">
                {interests.map(interest => <Badge key={interest} variant="outline" className="bg-sky-100 text-sky-800 border-sky-200">{interest}</Badge>)}
              </div>
            </div>
          )}
          {genres.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Favorite Genres</h4>
              <div className="flex flex-wrap gap-2">
                {genres.map(genre => <Badge key={genre} variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">{genre}</Badge>)}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-stone-200/80 pt-4 space-y-2">
            {userData.location && (
                <div className="flex items-center gap-2 text-sm text-stone-600">
                    <MapPin className="w-4 h-4 text-stone-400" />
                    <span>{userData.location}</span>
                </div>
            )}
            {userData.website && (
                <div className="flex items-center gap-2 text-sm text-stone-600">
                    <LinkIcon className="w-4 h-4 text-stone-400" />
                    <a href={userData.website.startsWith('http') ? userData.website : `https://${userData.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                        {userData.website}
                    </a>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}