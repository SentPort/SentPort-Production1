// ========== LEGACY TYPES (kept for backwards compatibility) ==========
export interface BuilderComponent {
  id: string;
  type: string;
  props: Record<string, any>;
  styles: Record<string, string>;
  children?: BuilderComponent[];
}

// ========== NEW SECTION-BASED ARCHITECTURE ==========

export type DeviceBreakpoint = 'desktop' | 'tablet' | 'mobile';

export type SectionType = 'hero' | 'features' | 'gallery' | 'contact' | 'testimonials' | 'pricing' | 'team' | 'cta' | 'custom';

export type BackgroundType = 'none' | 'color' | 'gradient' | 'image' | 'video';

export type AlignmentType = 'left' | 'center' | 'right' | 'justify';

export type LayoutMode = 'flow' | 'absolute';

export interface DeviceSectionConfig {
  layout_columns?: number;
  layout_mode?: LayoutMode;
  max_width?: 'full' | 'contained' | 'custom';
  background_type?: BackgroundType;
  background_value?: BackgroundConfig;
  background_image_url?: string;
  background_position?: string;
  background_size?: string;
  background_repeat?: string;
  background_attachment?: string;
  background_overlay_color?: string;
  background_overlay_opacity?: number;
  padding_top?: string;
  padding_bottom?: string;
  padding_left?: string;
  padding_right?: string;
  custom_css_classes?: string[];
  animation_type?: string;
}

export interface DeviceBlockProperties {
  styles?: Record<string, string>;
  alignment?: AlignmentType;
  font_family?: string;
  font_size?: string;
  font_weight?: string;
  font_style?: string;
  text_decoration?: string;
  line_height?: string;
  letter_spacing?: string;
  text_color?: string;
  background_color?: string;
  padding?: string;
  margin?: string;
  border_radius?: string;
  border_width?: string;
  border_color?: string;
  border_style?: string;
  shadow?: string;
  animation_type?: string;
  animation_duration?: string;
  animation_delay?: string;
  custom_css?: string;
  width?: string;
  height?: string;
  container_width?: string;
  position_x?: number;
  position_y?: number;
  is_absolute?: boolean;
  z_index?: number;
  hover_background_color?: string;
  hover_text_color?: string;
  hover_border_color?: string;
  hover_transform?: string;
  hover_shadow?: string;
}

export interface ResponsiveStyles {
  desktop?: Record<string, any>;
  tablet?: Record<string, any>;
  mobile?: Record<string, any>;
}

export interface ResponsivePadding {
  tablet?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  mobile?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

export interface ResponsiveLayoutColumns {
  tablet?: number;
  mobile?: number;
}

export interface ResponsiveMaxWidth {
  tablet?: 'full' | 'contained' | 'custom';
  mobile?: 'full' | 'contained' | 'custom';
}

export interface BackgroundConfig {
  type: BackgroundType;
  color?: string;
  gradient?: {
    type: 'linear' | 'radial';
    angle?: number;
    stops: Array<{ color: string; position: number }>;
  };
  image?: {
    url: string;
    position: string;
    size: string;
    repeat: string;
    attachment: string;
  };
  video?: {
    url: string;
    poster?: string;
  };
  overlay?: {
    color: string;
    opacity: number;
  };
}

export interface BuilderSection {
  id: string;
  page_content_id: string;
  section_order: number;
  section_type: SectionType;
  layout_columns: number;
  layout_mode?: LayoutMode;
  max_width: 'full' | 'contained' | 'custom';
  background_type: BackgroundType;
  background_value: BackgroundConfig;
  background_image_url?: string;
  background_position: string;
  background_size: string;
  background_repeat: string;
  background_attachment: string;
  background_overlay_color?: string;
  background_overlay_opacity: number;
  padding_top: string;
  padding_bottom: string;
  padding_left: string;
  padding_right: string;
  responsive_padding?: ResponsivePadding;
  responsive_layout_columns?: ResponsiveLayoutColumns;
  responsive_max_width?: ResponsiveMaxWidth;
  custom_css_classes?: string[];
  animation_type?: string;
  visibility_desktop: boolean;
  visibility_tablet: boolean;
  visibility_mobile: boolean;
  desktop_config?: DeviceSectionConfig | null;
  tablet_config?: DeviceSectionConfig | null;
  mobile_config?: DeviceSectionConfig | null;
  created_at: string;
  updated_at: string;
  blocks?: BuilderBlock[];
}

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'video'
  | 'button'
  | 'spacer'
  | 'divider'
  | 'icon'
  | 'gallery'
  | 'code'
  | 'form'
  | 'map'
  | 'social_links';

export interface BuilderBlock {
  id: string;
  section_id: string;
  block_order: number;
  block_type: BlockType;
  content: Record<string, any>;
  styles: Record<string, string>;
  responsive_styles: ResponsiveStyles;
  link_url?: string;
  link_target: string;
  alignment: AlignmentType;
  font_family?: string;
  font_size?: string;
  font_weight?: string;
  font_style?: string;
  text_decoration?: string;
  line_height?: string;
  letter_spacing?: string;
  text_color?: string;
  background_color?: string;
  padding?: string;
  margin?: string;
  border_radius?: string;
  border_width?: string;
  border_color?: string;
  border_style?: string;
  shadow?: string;
  animation_type?: string;
  animation_duration: string;
  animation_delay: string;
  custom_css?: string;
  visibility_desktop: boolean;
  visibility_tablet: boolean;
  visibility_mobile: boolean;
  device: DeviceBreakpoint;
  width?: string;
  height?: string;
  container_width?: string;
  position_x?: number;
  position_y?: number;
  is_absolute?: boolean;
  z_index?: number;
  hover_background_color?: string;
  hover_text_color?: string;
  hover_border_color?: string;
  hover_transform?: string;
  hover_shadow?: string;
  desktop_properties?: DeviceBlockProperties | null;
  tablet_properties?: DeviceBlockProperties | null;
  mobile_properties?: DeviceBlockProperties | null;
  created_at: string;
  updated_at: string;
}

export interface SectionTemplate {
  id: string;
  template_name: string;
  template_category: string;
  preview_image_url?: string;
  description?: string;
  is_system: boolean;
  template_data: Omit<BuilderSection, 'id' | 'page_content_id' | 'created_at' | 'updated_at'>;
  tags?: string[];
  created_by?: string;
  created_at: string;
}

export interface TypographyPreset {
  id: string;
  subdomain_id: string;
  preset_name: string;
  font_family: string;
  font_size: string;
  font_weight: string;
  line_height: string;
  letter_spacing: string;
  text_transform: string;
  text_color?: string;
  created_at: string;
}

export interface ColorPalette {
  id: string;
  subdomain_id: string;
  palette_name: string;
  colors: Array<{ name: string; value: string }>;
  is_active: boolean;
  created_at: string;
}

export interface PageVersion {
  id: string;
  page_id: string;
  version_number: number;
  version_name?: string;
  sections_data: BuilderSection[];
  created_by?: string;
  created_at: string;
}

export interface MediaLibraryItem {
  id: string;
  subdomain_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  public_url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  alt_text?: string;
  focal_point_x: number;
  focal_point_y: number;
  tags?: string[];
  uploaded_by?: string;
  created_at: string;
}

// ========== EXISTING INTERFACES ==========

export interface PageContent {
  id: string;
  page_id: string;
  version: 'draft' | 'published';
  components: BuilderComponent[];
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  custom_head_code?: string;
  created_at: string;
  updated_at: string;
}

export interface PageBackgroundSettings {
  position: string;
  size: string;
  repeat: string;
  attachment: string;
  opacity: number;
  overlay_color?: string;
  overlay_opacity: number;
}

export interface SubdomainPage {
  id: string;
  subdomain_id: string;
  page_path: string;
  page_title: string;
  page_type: 'homepage' | 'content_page' | 'blog_post' | 'custom';
  is_published: boolean;
  published_at?: string;
  has_unpublished_changes: boolean;
  is_homepage: boolean;
  background_image_url?: string;
  background_image_settings?: PageBackgroundSettings;
  created_at: string;
  updated_at: string;
}

export interface BuilderTheme {
  id: string;
  subdomain_id: string;
  theme_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family_heading: string;
  font_family_body: string;
  custom_css: string;
  created_at: string;
  updated_at: string;
}

export interface ComponentTemplate {
  id: string;
  component_type: string;
  component_name: string;
  category: 'layout' | 'content' | 'navigation' | 'forms' | 'custom';
  is_system: boolean;
  owner_id?: string;
  template_data: BuilderComponent;
  preview_image_url?: string;
  created_at: string;
}

export interface BuilderAsset {
  id: string;
  subdomain_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  public_url: string;
  thumbnail_url?: string;
  uploaded_by: string;
  created_at: string;
}

export interface Subdomain {
  id: string;
  subdomain: string;
  owner_id: string;
  owner_email: string;
  owner_name?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

// ========== BUILDER STATE TYPES ==========

export interface DeviceViewState {
  sections: BuilderSection[];
  history: BuilderSection[][];
  historyIndex: number;
  lastSaved: Date | null;
}

export interface BuilderState {
  currentDevice: DeviceBreakpoint;
  desktopView: DeviceViewState;
  tabletView: DeviceViewState;
  mobileView: DeviceViewState;
  selectedSectionId?: string;
  selectedBlockId?: string;
  isDragging: boolean;
  showGrid: boolean;
  zoom: number;
}

export interface DragItem {
  type: 'section' | 'block' | 'template';
  data: BuilderSection | BuilderBlock | SectionTemplate;
}

export interface SaveState {
  device: DeviceBreakpoint;
  lastSavedAt: Date;
  saveType: 'auto' | 'manual';
}
