# HuBlog: Non-fiction & Screenplays Feature

## Overview
Added two new interest categories to HuBlog: **Non-fiction** and **Screenplays**, with a unique screenplay attribution system that enables writers to credit HuBlog stories that inspired their screenplays.

## New Features

### 1. New Interest Categories
- **Non-fiction**: True stories, memoirs, journalism, and factual narratives
- **Screenplays**: Scripts, dialogue, and screenwriting for film, television, and theater

Both interests are now available in:
- Join HuBlog interest selection
- Explore page browsing
- Create Post category selection
- All existing filtering and discovery features

### 2. Screenplay Editor with Professional Formatting
When users select "Screenplays" as their post category, they get access to:

**Formatting Toolbar with Quick-Insert Buttons:**
- Scene Heading (INT./EXT. LOCATION - DAY)
- Character (Character names in all caps)
- Dialogue (Character speech)
- Parenthetical (Action/emotion notes)
- Action (Scene descriptions)
- Transition (CUT TO:, FADE IN:, etc.)

**Features:**
- One-click formatting for proper screenplay structure
- Built-in format guide with examples
- Word count and page estimation (~250 words/page)
- Professional monospace font
- Helpful tips for screenplay writing

### 3. Screenplay Inspiration Attribution System

**For Screenplay Authors:**
- Search for HuBlog stories that inspired their screenplay
- Select multiple inspiration sources
- Add optional attribution notes for each inspiration
- Stories are linked and credited in the published screenplay

**For Original Story Authors:**
- Receive notifications when their story inspires a screenplay
- See all screenplays inspired by their work on the story page
- Bidirectional linking creates discovery opportunities

**Features:**
- Searchable story database
- Preview cards showing title, author, and excerpt
- Custom attribution notes (e.g., "This inspired the main character")
- Automatic notifications to original authors
- Beautiful visual presentation with distinctive styling

### 4. Attribution Display

**On Screenplay Posts:**
- "Inspired By" section with amber/orange gradient styling
- Shows all credited stories with clickable links
- Displays author information and attribution notes
- Film icon for visual distinction

**On Original Story Posts:**
- "Inspired Screenplays" section with purple/pink gradient styling
- Shows all screenplays that credited this story
- Creates reverse discovery (readers find adaptations)
- Script icon for visual distinction

### 5. Notification System Integration
- New notification type: "screenplay_inspiration"
- Film icon (🎬) for screenplay notifications
- Message: "[Username] wrote a screenplay inspired by your story [Title]"
- Links directly to the screenplay
- Same notification system as comments and reactions

## Database Schema

### New Tables
- `blog_post_screenplay_inspirations` - Tracks screenplay-to-story attributions
  - Supports multiple inspirations per screenplay
  - Includes optional attribution notes
  - Cascade delete protection

### New Columns
- `blog_posts.is_screenplay` (boolean) - Flags screenplay posts
- `blog_posts.screenplay_format_data` (jsonb) - Future metadata storage

### Security
- Full RLS policies implemented
- Authors can manage their own attributions
- Public can view attributions on published posts
- Admin override capabilities

## User Workflow

### Creating a Screenplay
1. Navigate to Create Post
2. Select "Screenplays" interest
3. Screenplay editor appears with formatting toolbar
4. Write screenplay using formatting buttons
5. (Optional) Search for inspiring HuBlog stories
6. Add attributions with custom notes
7. Publish - original authors are automatically notified

### Discovering Connections
1. Read a story on HuBlog
2. See "Inspired Screenplays" section if any exist
3. Click to read the screenplay adaptation
4. See attribution back to original story
5. Discover creative community connections

## Technical Implementation

### Components Created
- `ScreenplayEditor.tsx` - Professional screenplay formatting editor
- `ScreenplayInspirationSelector.tsx` - Search and attribution interface
- `ScreenplayAttributions.tsx` - Display component for bidirectional links

### Components Updated
- `CreatePost.tsx` - Conditional screenplay mode
- `ViewPost.tsx` - Attribution display integration
- `NotificationBell.tsx` - Screenplay notification handling
- `Explore.tsx` - Automatic interest loading (no changes needed)

### Database Features
- Automatic notification trigger on attribution creation
- Prevents self-attribution (no notification if same author)
- Efficient indexing for fast lookups
- Unique constraint prevents duplicate attributions

## Benefits

### For Writers
- Professional screenplay formatting without external tools
- Credit system encourages collaboration
- Discovery of work through screenplay adaptations
- Notifications create community engagement

### For Readers
- Discover screenplays adapted from favorite stories
- Find original stories that inspired screenplays
- Transparent creative lineage
- New content discovery paths

### For the Platform
- Unique feature differentiating HuBlog from competitors
- Encourages cross-content engagement
- Potential for discovering adaptable content
- Community collaboration and networking
- Could lead to actual film/theater productions

## Future Possibilities
- Track screenplay production status
- Collaboration requests between authors
- Screenplay competitions and showcases
- Agent/producer discovery features
- PDF export in proper screenplay format
- Co-writing tools for screenplay development

## Migration Applied
Migration: `add_nonfiction_screenplays_interests_and_attribution`
- All database changes applied successfully
- Zero breaking changes to existing features
- Fully backward compatible
