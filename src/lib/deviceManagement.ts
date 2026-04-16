import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a unique device ID based on browser/device info
 */
export const generateDeviceId = (): string => {
  const existing = localStorage.getItem("deviceId");
  if (existing) return existing;

  const deviceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem("deviceId", deviceId);
  return deviceId;
};

/**
 * Get device name from user agent
 */
export const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  
  if (ua.includes("Windows")) return "Windows PC";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android Device";
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("iPad")) return "iPad";
  
  return "Unknown Device";
};

/**
 * Check device limit and track login
 * Returns: { allowed: boolean; reason?: string; deviceCount: number }
 */
export const checkDeviceLimit = async (userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  deviceCount: number;
}> => {
  try {
    const deviceId = generateDeviceId();
    const deviceName = getDeviceName();

    // Get all devices for this user
    const { data: devices, error: fetchError } = await supabase
      .from("user_devices")
      .select("id")
      .eq("user_id", userId);

    if (fetchError) {
      console.error("Error fetching devices:", fetchError);
      // Allow login on error to not block users
      return { allowed: true, deviceCount: 0 };
    }

    const deviceCount = devices?.length || 0;

    // Check if this device already exists
    const { data: existingDevice } = await supabase
      .from("user_devices")
      .select("id")
      .eq("user_id", userId)
      .eq("device_id", deviceId)
      .single();

    if (existingDevice) {
      // Device already registered, update last_login
      await supabase
        .from("user_devices")
        .update({ last_login: new Date().toISOString() })
        .eq("id", existingDevice.id);

      return { allowed: true, deviceCount };
    }

    // New device - check limit (max 2 devices)
    if (deviceCount >= 2) {
      return {
        allowed: false,
        reason: "Device limit reached. Maximum 2 devices allowed.",
        deviceCount,
      };
    }

    // Register new device
    const { error: insertError } = await supabase
      .from("user_devices")
      .insert({
        user_id: userId,
        device_id: deviceId,
        device_name: deviceName,
        last_login: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error registering device:", insertError);
      // Allow login on error
      return { allowed: true, deviceCount: deviceCount + 1 };
    }

    return { allowed: true, deviceCount: deviceCount + 1 };
  } catch (error) {
    console.error("Device check error:", error);
    return { allowed: true, deviceCount: 0 };
  }
};

/**
 * Get all devices for current user
 */
export const getUserDevices = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("user_devices")
      .select("*")
      .eq("user_id", userId)
      .order("last_login", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching user devices:", error);
    return [];
  }
};

/**
 * Remove a device
 */
export const removeDevice = async (deviceId: string, userId: string) => {
  try {
    const { error } = await supabase
      .from("user_devices")
      .delete()
      .eq("id", deviceId)
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error removing device:", error);
    return { success: false, error };
  }
};

/**
 * Remove all devices for a user (admin function)
 */
export const removeAllUserDevices = async (userId: string) => {
  try {
    const { error } = await supabase
      .from("user_devices")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error removing all devices:", error);
    return { success: false, error };
  }
};
