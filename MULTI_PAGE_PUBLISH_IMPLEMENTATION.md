# Multi-Page Publish System Implementation

## Overview
Implemented a complete multi-page publish system for the website builder that enforces homepage-dependent publishing constraints and provides comprehensive page management.

## Features Implemented

### 1. Database Constraints and Triggers
- **Migration**: `create_homepage_dependent_publish_constraints`
- **Trigger**: `validate_secondary_page_publish()` - Prevents secondary pages from being published unless homepage is published first
- **Trigger**: `cascade_homepage_unpublish()` - Automatically unpublishes all secondary pages when homepage is unpublished
- **Indexes**: Added performance indexes for subdomain_id, is_homepage, and is_published columns

### 2. Publish Helper Functions (`src/lib/publishHelpers.ts`)
- `getHomepageForSubdomain()` - Fetches homepage for a subdomain
- `canPublishSecondaryPage()` - Validates if secondary page can be published
- `publishHomepage()` - Publishes homepage only
- `publishAllPages()` - Batch publishes all pages (homepage + secondary pages)
- `publishSecondaryPage()` - Publishes individual secondary page with validation
- `unpublishHomepage()` - Unpublishes homepage and cascades to all pages
- `unpublishSecondaryPage()` - Unpublishes individual secondary page
- `publishPageEdits()` - Publishes edits to a live page without changing publish status

### 3. Page Navigation UI
- **Page Manager Button**: Added "Pages" button in builder header showing page count
- **Integrated PageManagerModal**: Shows all pages with status indicators
- **Create New Page**: Users can create unlimited secondary pages with custom URL paths
- **Delete Page**: Remove secondary pages with content cleanup
- **Page Switching**: Navigate between pages directly from the builder

### 4. Smart Publish Buttons
The publish button adapts based on current page context:

**For Homepage (unpublished):**
- Shows "Publish All Pages" button (green)
- Publishes homepage and all secondary pages together

**For Homepage (published):**
- Shows "Unpublish All" button (orange)
- Unpublishes entire site (homepage + all secondary pages)

**For Secondary Page (unpublished):**
- Shows "Publish Page" button (blue)
- Only enabled if homepage is already published
- Publishes just that page

**For Secondary Page (published):**
- Shows "Unpublish Page" button (orange)
- Unpublishes just that page

**For Any Published Page with Changes:**
- Shows "Publish Edits" button (orange)
- Updates live page without changing publish status

### 5. Visual Indicators
- **Page Status Badges**: "Homepage", "Live", "Draft", "Changes Pending"
- **Live Page Banner**: Orange banner shown when editing a published page with unpublished changes
- **Page Manager Status**: Color-coded status indicators for all pages
- **Icon Indicators**: Globe icon for live pages, GlobeLock for drafts

### 6. Confirmation Modals (`PublishConfirmModal`)
- **Publish All Pages**: Lists all pages to be published
- **Unpublish All**: Warning about site going offline
- **Publish Page**: Confirm individual page publish
- **Unpublish Page**: Confirm individual page unpublish
- **Publish Edits**: Confirm updating live page

### 7. URL Structure
- **Homepage**: `subdomain.sentport.com` (page_path = "/")
- **Secondary Pages**: `subdomain.sentport.com/page-path` (page_path = "/about", "/contact", etc.)
- Each page has a unique URL path that users define

## User Flow

### Creating Pages
1. Click "Pages" button in builder header
2. Click "Create New Page"
3. Enter page title, URL path (e.g., "/about"), and page type
4. Page is created as unpublished draft
5. Navigate to new page to start editing

### Publishing Workflow
1. **First-time publish**: Edit homepage → Click "Publish All Pages" → All pages go live
2. **Add secondary page**: Create page → Edit content → Click "Publish Page" (only works if homepage is published)
3. **Update live page**: Edit published page → See orange banner → Click "Publish Edits" to make changes live
4. **Unpublish site**: On homepage → Click "Unpublish All" → Entire site goes offline

### Constraints Enforced
- Secondary pages CANNOT be published unless homepage is published first
- Unpublishing homepage automatically unpublishes ALL secondary pages
- Users cannot delete the homepage
- Users cannot delete the last remaining page
- URL paths must be unique per subdomain

## Technical Details

### Database Triggers
```sql
-- Before update: Validates secondary page publish
CREATE TRIGGER validate_secondary_page_publish_trigger
  BEFORE UPDATE ON subdomain_pages
  FOR EACH ROW EXECUTE FUNCTION validate_secondary_page_publish();

-- After update: Cascades homepage unpublish
CREATE TRIGGER cascade_homepage_unpublish_trigger
  AFTER UPDATE ON subdomain_pages
  FOR EACH ROW EXECUTE FUNCTION cascade_homepage_unpublish();
```

### State Management
- `allPages`: Array of all pages for current subdomain
- `currentPageData`: Current page being edited
- `showPageManager`: Page manager modal visibility
- `showPublishModal`: Publish confirmation modal visibility
- `publishModalVariant`: Type of publish action being confirmed

### Event Logging
All publish operations are logged to `subdomain_publish_events` table:
- `homepage_published`
- `page_published`
- `homepage_unpublished`
- `page_unpublished`
- `page_edit_published`

## Files Created/Modified

### New Files
- `src/lib/publishHelpers.ts` - Publish operation helper functions
- `src/components/builder-v2/PublishConfirmModal.tsx` - Publish confirmation modals
- `src/components/builder-v2/LivePageBanner.tsx` - Banner for editing live pages
- `supabase/migrations/[timestamp]_create_homepage_dependent_publish_constraints.sql` - Database migration

### Modified Files
- `src/pages/builder/WebsiteBuilderV2.tsx` - Integrated all publish features and page management

## Testing Checklist
- [ ] Create homepage and publish it
- [ ] Create secondary page and verify it can be published (homepage is published)
- [ ] Try to publish secondary page when homepage is unpublished (should fail)
- [ ] Unpublish homepage and verify all pages are unpublished
- [ ] Edit published page and use "Publish Edits" feature
- [ ] Delete secondary pages
- [ ] Try to delete homepage (should fail)
- [ ] Create multiple pages with different URL paths
- [ ] Verify page navigation works correctly
- [ ] Test all confirmation modals

## Notes
- No limit on number of secondary pages per subdomain
- "Publish All Pages" publishes ALL pages regardless of readiness (user's choice)
- Page paths must start with "/" and be unique
- Homepage always has page_path = "/"
- All publish operations save all device views before publishing
