import { MealLog, UserProfile } from '../types';

export function getTodayDateString(referenceDate: Date = new Date()): string {
  return referenceDate.toISOString().split('T')[0];
}

export function getTodayLogs(logs: MealLog[], referenceDate: Date = new Date()): MealLog[] {
  const ds = getTodayDateString(referenceDate);
  return logs.filter(l => l.date === ds);
}

export function getWeekLogs(logs: MealLog[], referenceDate: Date = new Date()): MealLog[] {
  const result: MealLog[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    result.push(...logs.filter(l => l.date === ds));
  }
  return result;
}

export function getDailyBudget(profile: UserProfile): number {
  return parseFloat((profile.weeklyBudget / 7).toFixed(2));
}
