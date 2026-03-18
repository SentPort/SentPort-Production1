import { Trophy, Star, Heart, TrendingUp, AlertTriangle, Info, Gift, Award, Sparkles } from 'lucide-react';
import HedditLayout from '../../components/shared/HedditLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface UserStats {
  karma: number;
  kindness: number;
  quality_score: number;
}

export default function KarmaGuide() {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [user]);

  const loadUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from('heddit_accounts')
        .select('karma, kindness, quality_score')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      if (data) {
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  return (
    <HedditLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-10 h-10 text-orange-500" />
            <h1 className="text-4xl font-bold text-gray-900">How Karma Works</h1>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            Complete transparency about how Heddit's three-metric quality system rewards high-quality engagement
            and builds trust in our community. Every point matters, and you deserve to know exactly how they're earned and lost.
          </p>
        </div>

        {user && userStats && (
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Current Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold text-gray-700">Karma</span>
                </div>
                <p className="text-3xl font-bold text-orange-600">{userStats.karma.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-pink-200">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  <span className="font-semibold text-gray-700">Kindness</span>
                </div>
                <p className="text-3xl font-bold text-pink-600">{userStats.kindness.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  <span className="font-semibold text-gray-700">Quality Score</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">{userStats.quality_score.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Your Quality Score = {userStats.karma.toLocaleString()} karma × {userStats.kindness.toLocaleString()} kindness = {userStats.quality_score.toLocaleString()}
            </p>
          </div>
        )}

        <div className="space-y-6">
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <h2 className="text-2xl font-bold text-gray-900">The Three Metrics System</h2>
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-orange-500 pl-4 py-2">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-orange-500" />
                  Karma - Activity Points
                </h3>
                <p className="text-gray-700 mt-1">
                  Earned by participating in the community. Create posts, comments, communities, and engage with others.
                  Karma measures your contribution level.
                </p>
              </div>
              <div className="border-l-4 border-pink-500 pl-4 py-2">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Kindness - Community Recognition
                </h3>
                <p className="text-gray-700 mt-1">
                  Received when other users gift you kindness. Everyone starts at 1 kindness. Others can give you +50 kindness
                  as a one-time gift to recognize quality contributions. This is the multiplier in your quality score.
                </p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4 py-2">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  Quality Score - Your Ranking
                </h3>
                <p className="text-gray-700 mt-1">
                  Calculated as <strong>Karma × Kindness</strong>. This is what determines your position on the leaderboard.
                  It rewards both active participation and community-recognized quality.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-green-50 rounded-lg border border-green-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-8 h-8 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">Earning Karma</h2>
            </div>
            <p className="text-gray-700 mb-4">
              Karma is earned immediately when you contribute to Heddit. Here's exactly how much each action is worth:
            </p>
            <div className="bg-white rounded-lg border border-green-300 overflow-hidden">
              <table className="w-full">
                <thead className="bg-green-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Karma Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-200">
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Create a comment</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">+5</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Mention a community in a post or comment (first mention in any one comment or post only)</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">+10</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Create a post</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">+15</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Give someone a kindness gift</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">+20</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Create a community</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">+50</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-4 border border-blue-200">
                <Info className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-2">About Community Mentions (@h/communityname)</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Only the <strong>first</strong> community mention in each post or comment awards +10 karma</li>
                    <li>You can mention up to 3 communities per post</li>
                    <li>When you delete content with a community mention, you lose -10 karma</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-4 border border-blue-200">
                <Info className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-2">About User Mentions (@username)</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>User mentions do <strong>not</strong> award karma points</li>
                    <li>The mentioned user receives a notification</li>
                    <li>Your comment still earns the base +5 karma</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-green-100 rounded-lg p-4">
                <Info className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">
                  <strong>Note:</strong> Your quality score updates automatically whenever your karma or kindness changes,
                  so you'll see your ranking improve in real-time.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-red-50 rounded-lg border border-red-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-900">Losing Karma - Deletions</h2>
            </div>
            <p className="text-gray-700 mb-4">
              To prevent karma gaming through delete/repost cycles, karma is deducted when content is deleted.
              This applies whether you delete it yourself or it's deleted automatically due to cascading deletions.
            </p>
            <div className="bg-white rounded-lg border border-red-300 overflow-hidden mb-4">
              <table className="w-full">
                <thead className="bg-red-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Deletion</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Karma Deducted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-200">
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Delete a comment</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">-5</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Delete a comment with community mention</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">-15 (-5 comment, -10 mention)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Delete a post</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">-15</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Delete a post with community mention</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">-25 (-15 post, -10 mention)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Delete a community (creator only)</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">-50</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-2">Critical: Cascading Deletions</h3>
                  <p className="text-sm text-yellow-800 mb-3">
                    <strong>You can lose karma even if someone else deletes content.</strong> Here's why:
                  </p>
                  <ul className="text-sm text-yellow-800 space-y-2 list-disc list-inside">
                    <li>When a post is deleted, all comments under it are automatically deleted</li>
                    <li>When a comment is deleted, all replies under it are automatically deleted</li>
                    <li>When a community is deleted, all posts and comments in it are deleted</li>
                    <li>You lose karma for your deleted content even if you didn't trigger the deletion</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-red-100 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">Example Scenario</h3>
              <p className="text-sm text-red-800 mb-2">
                You write 10 thoughtful comments (earning 50 karma) replying to someone's post.
              </p>
              <p className="text-sm text-red-800 mb-2">
                A week later, the original poster deletes their post.
              </p>
              <p className="text-sm text-red-800 font-semibold">
                Result: All your 10 comments are automatically deleted, and you lose 50 karma.
              </p>
              <p className="text-sm text-red-700 mt-3">
                This is intentional to prevent karma inflation and gaming. Always consider the stability of threads
                before investing heavily in replies.
              </p>
            </div>

            <div className="mt-4 flex items-start gap-2 bg-gray-100 rounded-lg p-4">
              <Info className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-800">
                <strong>Minimum Floor:</strong> Your karma cannot go below 0. If deletions would take you negative,
                your karma stops at 0.
              </p>
            </div>
          </section>

          <section className="bg-pink-50 rounded-lg border border-pink-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-8 h-8 text-pink-600" />
              <h2 className="text-2xl font-bold text-gray-900">The Kindness System</h2>
            </div>
            <p className="text-gray-700 mb-4">
              Kindness is Heddit's way of letting you recognize users who consistently contribute high-quality content.
              It's designed to be meaningful and permanent.
            </p>

            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-pink-300 p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  How It Works
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-pink-500 font-bold">•</span>
                    <span>Everyone starts with 1 kindness (your baseline multiplier)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-500 font-bold">•</span>
                    <span>You can give +50 kindness to any user as a one-time gift</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-500 font-bold">•</span>
                    <span>You earn +20 karma when you give kindness (rewards generosity)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-500 font-bold">•</span>
                    <span>The receiver gets +50 kindness permanently added to their score</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg border border-pink-300 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Important Rules</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">One-Time Only Per User</p>
                      <p className="text-sm text-gray-700">
                        You can only give kindness to each person once, ever. Choose wisely and reward truly exceptional contributors.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Daily Limit</p>
                      <p className="text-sm text-gray-700">
                        Maximum 10 kindness gifts per day to prevent system abuse.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Permanent and Final</p>
                      <p className="text-sm text-gray-700">
                        No takebacks. Kindness gifts are permanent, encouraging thoughtful recognition of quality.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-pink-100 rounded-lg p-4">
                <h3 className="font-semibold text-pink-900 mb-2">Why Kindness Matters</h3>
                <p className="text-sm text-pink-800">
                  Kindness is the exponential multiplier in your quality score. A user with 100 karma and 10 kindness
                  (1,000 quality) ranks higher than someone with 500 karma and 1 kindness (500 quality).
                  This rewards community-recognized contributors over pure volume.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-purple-50 rounded-lg border border-purple-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Quality Score Calculation</h2>
            </div>
            <p className="text-gray-700 mb-4">
              Your Quality Score is simple but powerful: <strong className="text-purple-600">Karma × Kindness</strong>
            </p>

            <div className="bg-white rounded-lg border border-purple-300 p-6 mb-4">
              <h3 className="font-semibold text-gray-900 mb-4">See the Power of Kindness</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-gray-400 pl-4 py-2">
                  <p className="text-sm text-gray-600 mb-1">User with no kindness gifts received</p>
                  <p className="text-lg text-gray-900">
                    100 karma × 1 kindness = <span className="font-bold text-gray-700">100 quality</span>
                  </p>
                </div>
                <div className="border-l-4 border-purple-400 pl-4 py-2">
                  <p className="text-sm text-gray-600 mb-1">Same user receives 1 kindness gift</p>
                  <p className="text-lg text-gray-900">
                    100 karma × 51 kindness = <span className="font-bold text-purple-600">5,100 quality</span>
                    <span className="ml-2 text-sm text-purple-600">(51× improvement!)</span>
                  </p>
                </div>
                <div className="border-l-4 border-purple-600 pl-4 py-2">
                  <p className="text-sm text-gray-600 mb-1">User receives 10 kindness gifts</p>
                  <p className="text-lg text-gray-900">
                    100 karma × 501 kindness = <span className="font-bold text-purple-700">50,100 quality</span>
                    <span className="ml-2 text-sm text-purple-700">(501× improvement!)</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-100 rounded-lg p-4">
              <p className="text-sm text-purple-800">
                <strong>This is why leaderboards prioritize Quality Score:</strong> It rewards both your activity level
                (karma) and the community's recognition of your contributions (kindness). A user with moderate activity
                but high community respect can outrank someone who posts constantly but isn't recognized for quality.
              </p>
            </div>
          </section>

          <section className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Award className="w-8 h-8 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Badges & Achievements</h2>
            </div>
            <p className="text-gray-700 mb-4">
              Earn badges for reaching karma and kindness milestones. You'll receive notifications when you unlock new badges.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-blue-300 p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Karma Badges
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Bronze Contributor</span>
                    <span className="font-semibold">100 karma</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Silver Contributor</span>
                    <span className="font-semibold">500 karma</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gold Contributor</span>
                    <span className="font-semibold">1,000 karma</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platinum Contributor</span>
                    <span className="font-semibold">5,000 karma</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diamond Contributor</span>
                    <span className="font-semibold">10,000 karma</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-blue-300 p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Kindness Badges
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Appreciated</span>
                    <span className="font-semibold">51 kindness (1 gift)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Beloved</span>
                    <span className="font-semibold">251 kindness (5 gifts)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cherished</span>
                    <span className="font-semibold">501 kindness (10 gifts)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Community Hero</span>
                    <span className="font-semibold">1,001 kindness (20 gifts)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Living Legend</span>
                    <span className="font-semibold">2,501 kindness (50 gifts)</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-8 h-8 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-4">
              <details className="bg-white rounded-lg border border-gray-300 p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer hover:text-orange-600">
                  Can my karma go negative?
                </summary>
                <p className="text-gray-700 mt-2 text-sm">
                  No. Karma has a minimum floor of 0. If deletions would take you below 0, your karma stops at 0.
                </p>
              </details>

              <details className="bg-white rounded-lg border border-gray-300 p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer hover:text-orange-600">
                  What if someone deletes a post I spent hours replying to?
                </summary>
                <p className="text-gray-700 mt-2 text-sm">
                  Unfortunately, you will lose karma for those deleted replies. This is intentional to prevent karma
                  inflation. Consider the stability and quality of a thread before investing heavily in replies.
                  Focus on replying to high-quality posts from established users who are less likely to delete.
                </p>
              </details>

              <details className="bg-white rounded-lg border border-gray-300 p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer hover:text-orange-600">
                  Can I remove kindness I gave to someone?
                </summary>
                <p className="text-gray-700 mt-2 text-sm">
                  No. Kindness gifts are permanent and cannot be revoked. This encourages thoughtful, meaningful
                  recognition rather than impulsive gifting.
                </p>
              </details>

              <details className="bg-white rounded-lg border border-gray-300 p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer hover:text-orange-600">
                  How does engagement score differ from karma?
                </summary>
                <p className="text-gray-700 mt-2 text-sm">
                  Engagement score tracks sharing activity specifically (+5 per share). It's separate from karma
                  and doesn't affect your quality score or leaderboard position. It's a measure of how actively
                  you help distribute content across the platform.
                </p>
              </details>

              <details className="bg-white rounded-lg border border-gray-300 p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer hover:text-orange-600">
                  Can admins manually adjust karma?
                </summary>
                <p className="text-gray-700 mt-2 text-sm">
                  Yes, but only in exceptional circumstances such as fixing bugs or addressing abuse. All manual
                  adjustments are logged and can be audited. Normal karma changes happen automatically through
                  the triggers described on this page.
                </p>
              </details>

              <details className="bg-white rounded-lg border border-gray-300 p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer hover:text-orange-600">
                  Why did my karma change overnight?
                </summary>
                <p className="text-gray-700 mt-2 text-sm">
                  Someone likely deleted content (a post, comment, or community) that contained your contributions.
                  Check your notification history for any deleted content alerts. This is working as intended to
                  prevent karma gaming.
                </p>
              </details>

              <details className="bg-white rounded-lg border border-gray-300 p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer hover:text-orange-600">
                  Do user mentions (@username) earn karma?
                </summary>
                <p className="text-gray-700 mt-2 text-sm">
                  No, mentioning users with @username does not award karma points. However, the comment itself
                  still earns the base +5 karma, and the mentioned user receives a notification. Only community
                  mentions (@h/communityname) award the additional +10 karma bonus for the first mention in each
                  post or comment.
                </p>
              </details>
            </div>
          </section>

          <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg p-6 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">Complete Transparency = Community Trust</h2>
            <p className="text-white/90 max-w-3xl mx-auto">
              We believe in radical transparency. Every point is earned and lost according to clear, documented rules.
              No hidden algorithms, no mysterious changes. High-quality engagement deserves a system you can trust.
            </p>
          </div>
        </div>
      </div>
    </HedditLayout>
  );
}
