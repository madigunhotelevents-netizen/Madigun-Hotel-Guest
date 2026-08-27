/**
 * Housekeeping & Concierge Service Schedule
 * Operating Hours: 6:00 AM to 10:00 PM
 * Off-Duty Hours: 10:00 PM to 6:00 AM
 */

import { useState, useEffect } from 'react';

export interface ServiceScheduleInfo {
  isOnDuty: boolean;
  isOffDuty: boolean;
  currentHour: number;
  currentMinute: number;
  formattedCurrentTime: string;
  nextTransitionTime: string;
  hoursLeft: number;
  minutesLeft: number;
  secondsLeft: number;
  formattedCountdown: string;
  dutyStatusMessage: string;
}

export function getServiceScheduleInfo(customDate?: Date): ServiceScheduleInfo {
  const now = customDate || new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // On Duty from 6:00 AM (06:00) until 10:00 PM (22:00)
  const isOnDuty = currentHour >= 6 && currentHour < 22;
  const isOffDuty = !isOnDuty;

  let targetTime = new Date(now);

  if (isOffDuty) {
    // Off duty: services resume at 6:00 AM
    if (currentHour >= 22) {
      // It is 10 PM or later -> 6:00 AM tomorrow
      targetTime.setDate(targetTime.getDate() + 1);
      targetTime.setHours(6, 0, 0, 0);
    } else {
      // It is between 12:00 AM and 5:59 AM -> 6:00 AM today
      targetTime.setHours(6, 0, 0, 0);
    }
  } else {
    // On duty: shift ends at 10:00 PM today
    targetTime.setHours(22, 0, 0, 0);
  }

  const diffMs = Math.max(0, targetTime.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hoursLeft = Math.floor(totalSeconds / 3600);
  const minutesLeft = Math.floor((totalSeconds % 3600) / 60);
  const secondsLeft = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedCountdown = `${pad(hoursLeft)}:${pad(minutesLeft)}:${pad(secondsLeft)}`;

  const formattedCurrentTime = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    isOnDuty,
    isOffDuty,
    currentHour,
    currentMinute,
    formattedCurrentTime,
    nextTransitionTime: isOffDuty ? '6:00 AM' : '10:00 PM',
    hoursLeft,
    minutesLeft,
    secondsLeft,
    formattedCountdown,
    dutyStatusMessage: isOffDuty
      ? 'Housekeeping & Concierge are off duty. Services resume at 6:00 AM.'
      : 'Housekeeping & Concierge on duty (6:00 AM – 10:00 PM).',
  };
}

export function useServiceSchedule(): ServiceScheduleInfo {
  const [schedule, setSchedule] = useState<ServiceScheduleInfo>(() => getServiceScheduleInfo());

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      setSchedule(getServiceScheduleInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return schedule;
}
