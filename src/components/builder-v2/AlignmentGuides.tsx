import React from 'react';

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
}

export interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  distance?: number;
  label?: string;
}

export default function AlignmentGuides({ guides }: AlignmentGuidesProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {guides.map((guide, index) => (
        <div key={index}>
          {guide.type === 'vertical' ? (
            <>
              <div
                className="absolute top-0 bottom-0 w-px bg-blue-500"
                style={{ left: `${guide.position}px` }}
              />
              {guide.distance !== undefined && guide.label && (
                <div
                  className="absolute bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg"
                  style={{
                    left: `${guide.position}px`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {guide.label}
                </div>
              )}
            </>
          ) : (
            <>
              <div
                className="absolute left-0 right-0 h-px bg-red-500"
                style={{ top: `${guide.position}px` }}
              />
              {guide.distance !== undefined && guide.label && (
                <div
                  className="absolute bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg"
                  style={{
                    top: `${guide.position}px`,
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {guide.label}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
