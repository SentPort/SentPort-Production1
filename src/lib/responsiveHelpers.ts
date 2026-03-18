import { DeviceBreakpoint } from '../types/builder';

const CAMEL_TO_SNAKE_MAP: Record<string, string> = {
  'textAlign': 'alignment',
  'fontFamily': 'font_family',
  'fontSize': 'font_size',
  'fontWeight': 'font_weight',
  'fontStyle': 'font_style',
  'textDecoration': 'text_decoration',
  'lineHeight': 'line_height',
  'letterSpacing': 'letter_spacing',
  'color': 'text_color',
  'backgroundColor': 'background_color',
  'padding': 'padding',
  'margin': 'margin',
  'borderRadius': 'border_radius',
  'borderWidth': 'border_width',
  'borderColor': 'border_color',
  'borderStyle': 'border_style',
  'boxShadow': 'shadow',
  'width': 'width',
  'height': 'height',
};

const SNAKE_TO_CAMEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE_MAP).map(([camel, snake]) => [snake, camel])
);

function camelToSnake(camelCase: string): string {
  return CAMEL_TO_SNAKE_MAP[camelCase] || camelCase;
}

function snakeToCamel(snakeCase: string): string {
  return SNAKE_TO_CAMEL_MAP[snakeCase] || snakeCase;
}

export function getResponsiveValue<T>(
  baseValue: T,
  responsiveValues: Record<string, T> | undefined,
  device: DeviceBreakpoint
): T {
  if (!responsiveValues) return baseValue;

  if (device === 'desktop') return baseValue;

  return responsiveValues[device] !== undefined ? responsiveValues[device] : baseValue;
}

export function setResponsiveValue<T>(
  baseValue: T,
  responsiveValues: Record<string, T> | undefined,
  device: DeviceBreakpoint,
  newValue: T
): { baseValue: T; responsiveValues: Record<string, T> } {
  if (device === 'desktop') {
    return {
      baseValue: newValue,
      responsiveValues: responsiveValues || {},
    };
  }

  const updated = { ...(responsiveValues || {}) };
  updated[device] = newValue;

  return {
    baseValue,
    responsiveValues: updated,
  };
}
