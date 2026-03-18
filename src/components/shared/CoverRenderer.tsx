import { useEffect, useRef } from 'react';

interface TextLayer {
  id: string;
  type?: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  x: number;
  y: number;
  align: 'left' | 'center' | 'right';
}

interface PhotoLayer {
  id: string;
  type: 'photo';
  url: string;
  opacity: number;
  blur: number;
  brightness: number;
  contrast: number;
  saturation: number;
  filter: string | null;
  blendMode: string;
  scale: number;
  x: number;
  y: number;
}

interface BackgroundConfig {
  type: 'solid' | 'gradient';
  color1: string;
  color2?: string;
  gradientDirection?: 'horizontal' | 'vertical' | 'diagonal';
}

interface CoverDesignData {
  version?: string;
  platform?: string;
  dimensions?: { width: number; height: number };
  background: BackgroundConfig;
  photoLayers?: PhotoLayer[];
  textLayers?: TextLayer[];
  layers?: TextLayer[];
}

interface CoverRendererProps {
  designData: CoverDesignData | null;
  aspectRatio: number;
  className?: string;
  fallbackColor?: string;
}

export default function CoverRenderer({
  designData,
  aspectRatio,
  className = '',
  fallbackColor = '#1F2937'
}: CoverRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!designData) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          paddingBottom: `${aspectRatio}%`,
          background: fallbackColor,
          position: 'relative'
        }}
      />
    );
  }

  const getBackgroundStyle = () => {
    if (designData.background.type === 'solid') {
      return { background: designData.background.color1 };
    } else {
      const directions = {
        horizontal: 'to right',
        vertical: 'to bottom',
        diagonal: 'to bottom right'
      };
      const direction = directions[designData.background.gradientDirection || 'horizontal'];
      return {
        background: `linear-gradient(${direction}, ${designData.background.color1}, ${designData.background.color2})`
      };
    }
  };

  const getPhotoLayerStyle = (layer: PhotoLayer) => {
    const filters = [];

    if (layer.blur > 0) filters.push(`blur(${layer.blur}px)`);
    if (layer.brightness !== 100) filters.push(`brightness(${layer.brightness}%)`);
    if (layer.contrast !== 100) filters.push(`contrast(${layer.contrast}%)`);
    if (layer.saturation !== 100) filters.push(`saturate(${layer.saturation}%)`);

    return {
      backgroundImage: `url(${layer.url})`,
      backgroundSize: `${layer.scale}%`,
      backgroundPosition: `${layer.x}% ${layer.y}%`,
      backgroundRepeat: 'no-repeat',
      opacity: layer.opacity / 100,
      filter: filters.length > 0 ? filters.join(' ') : undefined,
      mixBlendMode: layer.blendMode as any
    };
  };

  const getTextAlign = (align: string) => {
    const alignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
    return alignMap[align as keyof typeof alignMap] || 'center';
  };

  const textLayers = designData.textLayers || designData.layers || [];
  const photoLayers = designData.photoLayers || [];

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: '100%',
        paddingBottom: `${aspectRatio}%`,
        ...getBackgroundStyle()
      }}
    >
      {photoLayers.map(layer => (
        <div
          key={layer.id}
          className="absolute inset-0"
          style={getPhotoLayerStyle(layer)}
        />
      ))}

      {textLayers.map(layer => (
        <div
          key={layer.id}
          className="absolute"
          style={{
            left: '0',
            right: '0',
            top: `${layer.y}%`,
            display: 'flex',
            justifyContent: getTextAlign(layer.align),
            padding: '0 2rem',
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              fontFamily: layer.fontFamily,
              fontSize: `${layer.fontSize}px`,
              fontWeight: layer.fontWeight,
              color: layer.color,
              textAlign: layer.align,
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            {layer.text}
          </div>
        </div>
      ))}
    </div>
  );
}
