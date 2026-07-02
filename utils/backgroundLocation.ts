import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import api from './axios';

export const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background Location Error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const location = locations[0];
      
      try {
        await api.post('/driver/status', {
          // Send background status (isOnline: true implicitly since we're tracking)
          isOnline: true,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      } catch (err) {
        console.error('Failed to update background location', err);
      }
    }
  }
});
