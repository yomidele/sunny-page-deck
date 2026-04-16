import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Trash2, Loader } from 'lucide-react';
import { getUserDevices, removeDevice, getDeviceName } from '@/lib/deviceManagement';

interface Device {
  id: string;
  device_id: string;
  device_name: string;
  last_login: string;
  created_at: string;
}

interface DeviceManagementProps {
  userId: string;
}

export const DeviceManagement = ({ userId }: DeviceManagementProps) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, [userId]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const data = await getUserDevices(userId);
      setDevices(data as Device[]);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!confirm('Remove this device? You will be signed out.')) return;

    try {
      setRemoving(deviceId);
      const result = await removeDevice(deviceId, userId);

      if (result.success) {
        setDevices(devices.filter(d => d.id !== deviceId));
      } else {
        alert('Error removing device');
      }
    } finally {
      setRemoving(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const isCurrentDevice = (deviceId: string) => {
    const stored = localStorage.getItem('deviceId');
    return stored === deviceId;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Manage Devices
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          You can use up to 2 devices. Remove a device to add a new one.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading devices...
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No devices registered yet
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{device.device_name}</p>
                      {isCurrentDevice(device.device_id) && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last login: {formatDate(device.last_login)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={removing === device.id || isCurrentDevice(device.device_id)}
                  onClick={() => handleRemoveDevice(device.id)}
                >
                  {removing === device.id ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeviceManagement;
