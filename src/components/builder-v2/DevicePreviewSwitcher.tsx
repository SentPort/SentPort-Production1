import React from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { DeviceBreakpoint } from '../../types/builder';

interface DevicePreviewSwitcherProps {
  currentDevice: DeviceBreakpoint;
  onDeviceChange: (device: DeviceBreakpoint) => void;
}

const devices: Array<{ value: DeviceBreakpoint; label: string; icon: React.ReactNode; width?: string }> = [
  { value: 'desktop', label: 'Desktop', icon: <Monitor className="w-5 h-5" /> },
  { value: 'tablet', label: 'Tablet', icon: <Tablet className="w-5 h-5" />, width: '768px' },
  { value: 'mobile', label: 'Mobile', icon: <Smartphone className="w-5 h-5" />, width: '375px' },
];

export default function DevicePreviewSwitcher({
  currentDevice,
  onDeviceChange,
}: DevicePreviewSwitcherProps) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
      {devices.map((device) => (
        <button
          key={device.value}
          onClick={() => onDeviceChange(device.value)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            currentDevice === device.value
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          title={device.label}
        >
          {device.icon}
          <span className="hidden md:inline">{device.label}</span>
        </button>
      ))}
    </div>
  );
}
