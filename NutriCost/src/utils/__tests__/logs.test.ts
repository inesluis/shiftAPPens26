import { 
  getTodayDateString, 
  getTodayLogs, 
  getWeekLogs, 
  getDailyBudget 
} from '../logs';
import { MealLog, UserProfile } from '../../types';

describe('log utilities', () => {
  const refDate = new Date('2026-05-03T10:00:00Z');
  const logs: MealLog[] = [
    { id: '1', date: '2026-05-03', recipeName: 'Today' } as MealLog,
    { id: '2', date: '2026-05-02', recipeName: 'Yesterday' } as MealLog,
    { id: '3', date: '2026-04-26', recipeName: 'Last Week' } as MealLog,
  ];

  it('gets correct today date string', () => {
    expect(getTodayDateString(refDate)).toBe('2026-05-03');
  });

  it('filters today logs correctly', () => {
    const today = getTodayLogs(logs, refDate);
    expect(today).toHaveLength(1);
    expect(today[0].recipeName).toBe('Today');
  });

  it('filters week logs correctly', () => {
    const week = getWeekLogs(logs, refDate);
    // 2026-05-03 back to 2026-04-27 (inclusive)
    // 03, 02, 01, 30, 29, 28, 27
    expect(week).toHaveLength(2);
    expect(week.map(l => l.recipeName)).toContain('Today');
    expect(week.map(l => l.recipeName)).toContain('Yesterday');
    expect(week.map(l => l.recipeName)).not.toContain('Last Week');
  });

  it('calculates daily budget from weekly budget', () => {
    const profile = { weeklyBudget: 70 } as UserProfile;
    expect(getDailyBudget(profile)).toBe(10);
  });

  it('handles decimal daily budgets', () => {
    const profile = { weeklyBudget: 50 } as UserProfile;
    // 50 / 7 = 7.1428... -> 7.14
    expect(getDailyBudget(profile)).toBe(7.14);
  });
});
