import { BuilderComponent, BuilderBlock, BuilderSection, DeviceBreakpoint, DeviceBlockProperties, DeviceSectionConfig } from '../types/builder';

export function generateId(): string {
  return `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function cloneComponent(component: BuilderComponent): BuilderComponent {
  return {
    ...component,
    id: generateId(),
    children: component.children?.map(cloneComponent),
  };
}

export function findComponentById(
  components: BuilderComponent[],
  id: string
): BuilderComponent | null {
  for (const component of components) {
    if (component.id === id) return component;
    if (component.children) {
      const found = findComponentById(component.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function removeComponentById(
  components: BuilderComponent[],
  id: string
): BuilderComponent[] {
  return components
    .filter(c => c.id !== id)
    .map(c => ({
      ...c,
      children: c.children ? removeComponentById(c.children, id) : undefined,
    }));
}

export function updateComponentById(
  components: BuilderComponent[],
  id: string,
  updates: Partial<BuilderComponent>
): BuilderComponent[] {
  return components.map(c => {
    if (c.id === id) {
      return { ...c, ...updates };
    }
    if (c.children) {
      return {
        ...c,
        children: updateComponentById(c.children, id, updates),
      };
    }
    return c;
  });
}

export function sanitizeHTML(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

export function stylesToCSS(styles: Record<string, string>): string {
  return Object.entries(styles)
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${value};`;
    })
    .join(' ');
}

export function getDeviceProperties(block: BuilderBlock, device: DeviceBreakpoint): DeviceBlockProperties | null {
  if (device === 'desktop') return block.desktop_properties || null;
  if (device === 'tablet') return block.tablet_properties || null;
  if (device === 'mobile') return block.mobile_properties || null;
  return null;
}

export function setDeviceProperties(
  block: BuilderBlock,
  device: DeviceBreakpoint,
  properties: DeviceBlockProperties
): BuilderBlock {
  const updates: Partial<BuilderBlock> = {};

  if (device === 'desktop') {
    updates.desktop_properties = properties;
  } else if (device === 'tablet') {
    updates.tablet_properties = properties;
  } else if (device === 'mobile') {
    updates.mobile_properties = properties;
  }

  return { ...block, ...updates };
}

export function copyPropertiesBetweenDevices(
  block: BuilderBlock,
  fromDevice: DeviceBreakpoint,
  toDevice: DeviceBreakpoint
): BuilderBlock {
  const sourceProperties = getDeviceProperties(block, fromDevice);

  if (!sourceProperties) {
    return block;
  }

  const copiedProperties = JSON.parse(JSON.stringify(sourceProperties));

  return setDeviceProperties(block, toDevice, copiedProperties);
}

export function clearDeviceProperties(
  block: BuilderBlock,
  device: DeviceBreakpoint
): BuilderBlock {
  const updates: Partial<BuilderBlock> = {};

  if (device === 'desktop') {
    updates.desktop_properties = null;
  } else if (device === 'tablet') {
    updates.tablet_properties = null;
  } else if (device === 'mobile') {
    updates.mobile_properties = null;
  }

  return { ...block, ...updates };
}

export function getDeviceSectionConfig(section: BuilderSection, device: DeviceBreakpoint): DeviceSectionConfig | null {
  if (device === 'desktop') return section.desktop_config || null;
  if (device === 'tablet') return section.tablet_config || null;
  if (device === 'mobile') return section.mobile_config || null;
  return null;
}

export function setDeviceSectionConfig(
  section: BuilderSection,
  device: DeviceBreakpoint,
  config: DeviceSectionConfig
): BuilderSection {
  const updates: Partial<BuilderSection> = {};

  if (device === 'desktop') {
    updates.desktop_config = config;
  } else if (device === 'tablet') {
    updates.tablet_config = config;
  } else if (device === 'mobile') {
    updates.mobile_config = config;
  }

  return { ...section, ...updates };
}

export function copySectionConfigBetweenDevices(
  section: BuilderSection,
  fromDevice: DeviceBreakpoint,
  toDevice: DeviceBreakpoint
): BuilderSection {
  const sourceConfig = getDeviceSectionConfig(section, fromDevice);

  if (!sourceConfig) {
    return section;
  }

  const copiedConfig = JSON.parse(JSON.stringify(sourceConfig));

  return setDeviceSectionConfig(section, toDevice, copiedConfig);
}

export function clearDeviceSectionConfig(
  section: BuilderSection,
  device: DeviceBreakpoint
): BuilderSection {
  const updates: Partial<BuilderSection> = {};

  if (device === 'desktop') {
    updates.desktop_config = null;
  } else if (device === 'tablet') {
    updates.tablet_config = null;
  } else if (device === 'mobile') {
    updates.mobile_config = null;
  }

  return { ...section, ...updates };
}

export function hasDeviceProperties(block: BuilderBlock, device: DeviceBreakpoint): boolean {
  const props = getDeviceProperties(block, device);
  return props !== null && props !== undefined;
}

export function hasDeviceSectionConfig(section: BuilderSection, device: DeviceBreakpoint): boolean {
  const config = getDeviceSectionConfig(section, device);
  return config !== null && config !== undefined;
}

export function migrateBlockToDeviceProperties(block: BuilderBlock): BuilderBlock {
  if (block.desktop_properties) {
    return block;
  }

  const desktopProps: DeviceBlockProperties = {
    styles: block.styles || {},
    alignment: block.alignment,
    font_family: block.font_family,
    font_size: block.font_size,
    font_weight: block.font_weight,
    font_style: block.font_style,
    text_decoration: block.text_decoration,
    line_height: block.line_height,
    letter_spacing: block.letter_spacing,
    text_color: block.text_color,
    background_color: block.background_color,
    padding: block.padding,
    margin: block.margin,
    border_radius: block.border_radius,
    border_width: block.border_width,
    border_color: block.border_color,
    border_style: block.border_style,
    shadow: block.shadow,
    animation_type: block.animation_type,
    animation_duration: block.animation_duration,
    animation_delay: block.animation_delay,
    custom_css: block.custom_css,
    width: block.width,
    height: block.height,
    position_x: block.position_x,
    position_y: block.position_y,
    is_absolute: block.is_absolute,
    z_index: block.z_index,
    hover_background_color: block.hover_background_color,
    hover_text_color: block.hover_text_color,
    hover_border_color: block.hover_border_color,
    hover_transform: block.hover_transform,
    hover_shadow: block.hover_shadow,
  };

  const tabletProps: DeviceBlockProperties | null =
    block.responsive_styles?.tablet ? { ...desktopProps, ...block.responsive_styles.tablet } : null;

  const mobileProps: DeviceBlockProperties | null =
    block.responsive_styles?.mobile ? { ...desktopProps, ...block.responsive_styles.mobile } : null;

  return {
    ...block,
    desktop_properties: desktopProps,
    tablet_properties: tabletProps,
    mobile_properties: mobileProps,
  };
}

export function migrateSectionToDeviceConfig(section: BuilderSection): BuilderSection {
  if (section.desktop_config) {
    return section;
  }

  const desktopConfig: DeviceSectionConfig = {
    layout_columns: section.layout_columns,
    layout_mode: section.layout_mode,
    max_width: section.max_width,
    background_type: section.background_type,
    background_value: section.background_value,
    background_image_url: section.background_image_url,
    background_position: section.background_position,
    background_size: section.background_size,
    background_repeat: section.background_repeat,
    background_attachment: section.background_attachment,
    background_overlay_color: section.background_overlay_color,
    background_overlay_opacity: section.background_overlay_opacity,
    padding_top: section.padding_top,
    padding_bottom: section.padding_bottom,
    padding_left: section.padding_left,
    padding_right: section.padding_right,
    custom_css_classes: section.custom_css_classes,
    animation_type: section.animation_type,
  };

  const tabletConfig: DeviceSectionConfig | null =
    section.responsive_padding?.tablet || section.responsive_layout_columns?.tablet || section.responsive_max_width?.tablet
      ? {
          ...desktopConfig,
          layout_columns: section.responsive_layout_columns?.tablet ?? desktopConfig.layout_columns,
          max_width: section.responsive_max_width?.tablet ?? desktopConfig.max_width,
          padding_top: section.responsive_padding?.tablet?.top ?? desktopConfig.padding_top,
          padding_bottom: section.responsive_padding?.tablet?.bottom ?? desktopConfig.padding_bottom,
          padding_left: section.responsive_padding?.tablet?.left ?? desktopConfig.padding_left,
          padding_right: section.responsive_padding?.tablet?.right ?? desktopConfig.padding_right,
        }
      : null;

  const mobileConfig: DeviceSectionConfig | null =
    section.responsive_padding?.mobile || section.responsive_layout_columns?.mobile || section.responsive_max_width?.mobile
      ? {
          ...desktopConfig,
          layout_columns: section.responsive_layout_columns?.mobile ?? desktopConfig.layout_columns,
          max_width: section.responsive_max_width?.mobile ?? desktopConfig.max_width,
          padding_top: section.responsive_padding?.mobile?.top ?? desktopConfig.padding_top,
          padding_bottom: section.responsive_padding?.mobile?.bottom ?? desktopConfig.padding_bottom,
          padding_left: section.responsive_padding?.mobile?.left ?? desktopConfig.padding_left,
          padding_right: section.responsive_padding?.mobile?.right ?? desktopConfig.padding_right,
        }
      : null;

  return {
    ...section,
    desktop_config: desktopConfig,
    tablet_config: tabletConfig,
    mobile_config: mobileConfig,
  };
}
