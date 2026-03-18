import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';
import { TagInput } from '../../components/heddit/TagInput';
import * as Icons from 'lucide-react';

interface Topic {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
}

export default function CreateSubreddit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    const { data } = await supabase
      .from('heddit_topics')
      .select('*')
      .order('name');

    if (data) setAllTopics(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data: account } = await supabase
        .from('heddit_accounts')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      const { data: newSubreddit, error: insertError } = await supabase
        .from('heddit_subreddits')
        .insert({
          name: name.toLowerCase(),
          display_name: displayName,
          description,
          creator_id: account?.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (selectedTopics.length > 0) {
        const topicMappings = selectedTopics.map(topicId => ({
          subreddit_id: newSubreddit.id,
          topic_id: topicId
        }));

        const { error: topicError } = await supabase
          .from('heddit_subreddit_topics')
          .insert(topicMappings);

        if (topicError) throw topicError;
      }

      if (customTags.length > 0) {
        for (const tagName of customTags) {
          const { data: tagId } = await supabase
            .rpc('get_or_create_tag', { input_tag: tagName });

          if (tagId) {
            await supabase
              .from('heddit_subreddit_custom_tags')
              .insert({
                subreddit_id: newSubreddit.id,
                tag_id: tagId
              });
          }
        }
      }

      navigate(`/heddit/h/${name.toLowerCase()}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create community');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Tag;
    return IconComponent;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);

    if (value && !/^[a-z0-9_]+$/.test(value)) {
      setNameError('Only lowercase letters, numbers, and underscores are allowed');
    } else {
      setNameError('');
    }
  };

  const generateNameFromDisplay = () => {
    const generated = displayName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    setName(generated);
    setNameError('');
  };

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showBackButton>
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg p-8">
            <h1 className="text-2xl font-bold mb-6">Create a Community</h1>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Cool Community"
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  The public-facing name for your community
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Community Name</label>
                  {displayName && (
                    <button
                      type="button"
                      onClick={generateNameFromDisplay}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Generate from Display Name
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={handleNameChange}
                    pattern="[a-z0-9_]+"
                    className={`w-full px-4 py-2 border rounded-lg ${
                      nameError
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : name && !nameError
                        ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                        : 'border-gray-300'
                    }`}
                    placeholder="coolcommunity"
                    required
                  />
                  {name && !nameError && (
                    <Icons.Check className="absolute right-3 top-2.5 w-5 h-5 text-green-500" />
                  )}
                  {nameError && (
                    <Icons.AlertCircle className="absolute right-3 top-2.5 w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="mt-1.5 space-y-1">
                  <p className={`text-sm ${nameError ? 'text-red-600' : 'text-gray-600'}`}>
                    {nameError || 'Only lowercase letters (a-z), numbers (0-9), and underscores (_) allowed'}
                  </p>
                  {name && !nameError && (
                    <p className="text-xs text-gray-500">
                      URL: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">/heddit/h/{name}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={4}
                  placeholder="What is this community about?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Topics (Select all that apply)
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Help people discover your SubHeddit by selecting relevant topics
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {allTopics.map(topic => {
                    const IconComponent = getIconComponent(topic.icon);
                    const isSelected = selectedTopics.includes(topic.id);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => toggleTopic(topic.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                        style={{
                          backgroundColor: isSelected ? topic.color : undefined
                        }}
                        title={topic.description}
                      >
                        <IconComponent className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{topic.name}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedTopics.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedTopics.length} topic{selectedTopics.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Add Specific Tags (Optional)
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Add specific tags like 'AI', 'baking', 'indie games' to help people discover your community
                </p>
                <TagInput
                  selectedTags={customTags}
                  onTagsChange={setCustomTags}
                  maxTags={10}
                  placeholder="Type tags like 'AI', 'baking', 'indie games'..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Community'}
              </button>
            </form>
          </div>
        </div>
      </div>
      </HedditLayout>
    </PlatformGuard>
  );
}