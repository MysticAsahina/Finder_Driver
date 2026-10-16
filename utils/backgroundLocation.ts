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
      const location = locations[locations.length - 1];
      
      try {
        await api.post('/driver/location-ping', {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }, { headers: { 'X-Is-Background': 'true' } });
      } catch (err) {
        console.error('Failed to update background location', err);
      }
    }
  }
});
