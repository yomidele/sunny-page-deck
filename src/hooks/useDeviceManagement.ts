import { useCallback } from 'react';
import { checkDeviceLimit, getUserDevices, removeDevice } from '@/lib/deviceManagement';

export const useDeviceManagement = () => {
  const checkDevice = useCallback(async (userId: string) => {
    return await checkDeviceLimit(userId);
  }, []);

  const getDevices = useCallback(async (userId: string) => {
    return await getUserDevices(userId);
  }, []);

  const removeCurrentDevice = useCallback(async (deviceId: string, userId: string) => {
    return await removeDevice(deviceId, userId);
  }, []);

  return {
    checkDevice,
    getDevices,
    removeCurrentDevice,
  };
};
