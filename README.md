# Social Media Super Platform

A comprehensive social media ecosystem featuring multiple interconnected platforms built with React, TypeScript, Vite, and Supabase.

## Overview

This is a full-featured social media super-app that includes multiple platforms in one unified experience:

- **HuBook** - Social networking platform (Facebook-like)
- **Heddit** - Community discussion platform (Reddit-like)
- **HuTube** - Video sharing platform (YouTube-like)
- **Hinsta** - Photo sharing platform (Instagram-like)
- **Switter** - Microblogging platform (Twitter-like)
- **Blog** - Long-form content publishing
- **Website Builder** - Create custom subdomain sites with drag-and-drop

## Features

### Core Platform Features
- User authentication (email/password via Supabase Auth)
- User profiles with customizable photos and covers
- Post creation, editing, and deletion
- Comments and nested replies
- Reactions and engagement tracking
- Content sharing across platforms
- Direct messaging between users
- Real-time notifications
- Search functionality with history
- Content moderation and reporting
- Privacy settings and controls

### HuBook Specific
- Friend requests and friendships
- Photo albums with batch uploads
- Post composer with mentions
- News feed with discovery injection
- Profile and cover photo customization
- Reaction system (13+ emoji reactions)
- Share posts with privacy controls

### Heddit Specific
- SubHeddits (community creation)
- Karma system with badges
- Upvotes/downvotes
- Crossposting between communities
- Tag system and trending tags
- Moderator tools and permissions
- Pinned posts
- Community settings management
- Leaderboard system

### HuTube Specific
- Video upload and streaming
- Channel creation and customization
- Subscriptions
- Playlists and watch later
- Video analytics
- Like/dislike system
- Video recommendations
- Trending videos
- Video history tracking

### Hinsta Specific
- Photo posts with multiple images
- Stories (24-hour content)
- Hashtag system
- Explore page
- Saved posts
- Photo filters and editing

### Switter Specific
- Short-form text posts ("Sweets")
- Retweets and quotes
- Trending topics
- Timeline feed

### Website Builder
- Drag-and-drop page builder
- Component library (text, images, buttons, etc.)
- Custom subdomain support
- Multi-page websites
- Analytics tracking
- Public site publishing

### Admin Features
- Moderation queue and controls
- Content review system
- User management
- Tag management (rename, merge, ban)
- Analytics dashboard
- Web crawler for external content
- Pin management for all platforms
- Flagged content notifications

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Edge Functions**: Supabase Edge Functions (Deno)

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- A Supabase account and project

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd <project-directory>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   You can find these values in your [Supabase Dashboard](https://app.supabase.com) under Project Settings > API.

4. **Database Setup**

   The database schema is managed through migrations in the `supabase/migrations/` directory. These migrations include:
   - User profiles and authentication
   - All platform schemas (HuBook, Heddit, HuTube, Hinsta, Switter, Blog)
   - Engagement tracking and analytics
   - Notification systems
   - Content moderation
   - Row Level Security (RLS) policies
   - Storage buckets for media

   If you have the Supabase CLI installed, you can apply migrations with:
   ```bash
   supabase db push
   ```

   Or use the Supabase Dashboard to run the migration SQL files manually.

5. **Storage Buckets**

   The following storage buckets need to be created in Supabase:
   - `hubook-media` - HuBook post media
   - `hubook-albums` - Album photos
   - `hubook-profile-media` - Profile and cover photos
   - `hutube-videos` - Video files
   - `hutube-thumbnails` - Video thumbnails
   - `hutube-channels` - Channel avatars and banners
   - `hinsta-media` - Instagram-style posts
   - `hinsta-stories` - Story media

## Running the Application

### Development Mode
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

## Project Structure

```
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── admin/       # Admin-specific components
│   │   ├── blog/        # Blog components
│   │   ├── builder/     # Website builder components
│   │   ├── heddit/      # Heddit platform components
│   │   ├── hinsta/      # Hinsta platform components
│   │   ├── hubook/      # HuBook platform components
│   │   ├── hutube/      # HuTube platform components
│   │   └── shared/      # Shared cross-platform components
│   ├── contexts/        # React Context providers
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and helpers
│   ├── pages/           # Route components
│   │   ├── admin/       # Admin pages
│   │   ├── blog/        # Blog pages
│   │   ├── builder/     # Website builder pages
│   │   ├── heddit/      # Heddit pages
│   │   ├── hinsta/      # Hinsta pages
│   │   ├── hubook/      # HuBook pages
│   │   └── hutube/      # HuTube pages
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main application component
│   └── main.tsx         # Application entry point
├── supabase/
│   ├── functions/       # Edge Functions
│   └── migrations/      # Database migrations
├── .env                 # Environment variables (not in version control)
├── package.json         # Dependencies and scripts
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Key Features Implementation

### Authentication
- Uses Supabase Auth with email/password
- Session management via AuthContext
- Protected routes with route guards
- Password reset functionality

### Content Moderation
- Automatic content flagging system
- Admin review queue
- User reporting
- Content approval/rejection workflow
- Ban and suspension capabilities

### Analytics
- Page view tracking
- User engagement metrics
- Subdomain analytics
- Platform-specific metrics (video views, post engagement, etc.)

### Notifications
- Real-time notification system
- Platform-specific notifications
- Notification preferences
- Dismissible notifications
- Badge counts

### Privacy & Security
- Row Level Security (RLS) on all tables
- User privacy settings
- Content visibility controls
- Secure media upload with virus scanning
- Rate limiting on API calls

## Database Schema Highlights

The database includes comprehensive schemas for:
- User profiles and verification
- Platform memberships (HuBook, Heddit, HuTube, etc.)
- Posts, comments, and reactions
- Friendships and follows
- Subscriptions and channels
- Albums and media
- Playlists and watch history
- Communities and moderators
- Karma and badge systems
- Messaging and notifications
- Analytics and tracking
- Content moderation
- Search indexing

## Edge Functions

Three Supabase Edge Functions are included:

1. **aggregate-analytics-daily** - Aggregates daily analytics data
2. **cleanup-expired-subdomains** - Removes expired subdomain data
3. **process-crawler-queue** - Processes web crawler queue for external content

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Troubleshooting

### Common Issues

**Build fails with type errors**
- Run `npm run typecheck` to identify type issues
- Ensure all dependencies are installed: `npm install`

**Authentication not working**
- Verify your `.env` file has correct Supabase credentials
- Check that Supabase Auth is enabled in your project
- Ensure email confirmation is disabled (or handle confirmation emails)

**Images/videos not uploading**
- Check that storage buckets are created in Supabase
- Verify bucket policies allow authenticated uploads
- Check file size limits

**Database errors**
- Ensure all migrations have been applied
- Check RLS policies are correctly configured
- Verify your database connection in Supabase Dashboard

**404 on routes**
- Ensure React Router is properly configured
- Check that routes match exactly (case-sensitive)

### Getting Help

If you encounter issues:
1. Check the browser console for errors
2. Review Supabase logs in the Dashboard
3. Verify all environment variables are set correctly
4. Ensure the database schema is up to date with migrations

## Contributing

When working on this project:
1. Follow the existing code structure
2. Use TypeScript for type safety
3. Follow React best practices (hooks, functional components)
4. Test authentication flows
5. Verify RLS policies don't break functionality
6. Update this README if you add new features

## License

All rights reserved.

## Notes for New Developers

- The project uses a modular structure with separate routers for each platform
- All platforms share common components in `src/components/shared/`
- Database operations use Supabase client configured in `src/lib/supabase.ts`
- Authentication state is managed globally via `AuthContext`
- Most list views use infinite scroll or pagination
- Media uploads go through compression before storage
- All user-generated content goes through moderation queues
- The admin system is role-based (check `user_profiles.admin` column)

## Admin Access

To grant admin access:
1. Sign up for an account normally
2. In Supabase Dashboard, go to Table Editor > `user_profiles`
3. Find your user record and set `admin = true`
4. Refresh the application to see admin features
