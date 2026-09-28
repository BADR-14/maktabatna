/**
 * The daily reading reminder: a local notification at the time the person chose (profile),
 * for the next 7 days, skipping today once they have read. Rescheduled whenever progress is
 * saved or the settings change, so it never nags on a day they already read.
 */
import * as Notifications from 'expo-notifications';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { localDay } from '@/db/reading';
import { readingLogs, userSettings } from '@/db/schema';
import { count } from '@/lib/plural';

const KIND = 'reading-reminder';

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function rescheduleReminders(userId: string) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled.filter((n) => n.content.data?.kind === KIND).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    const s = db.select().from(userSettings).where(eq(userSettings.id, userId)).get();
    const time = s?.reminderTime;
    if (!time || !(await Notifications.getPermissionsAsync()).granted) return;
    await Notifications.setNotificationChannelAsync('reading', { name: 'تذكير القراءة', importance: Notifications.AndroidImportance.DEFAULT });
    const [hh, mm] = time.split(':').map(Number);
    const today = localDay();
    const readToday = !!db
      .select({ n: sql<number>`count(*)` })
      .from(readingLogs)
      .where(and(eq(readingLogs.userId, userId), eq(readingLogs.day, today)))
      .get()?.n;
    const goal = s?.dailyPagesGoal;
    for (let d = 0; d < 7; d++) {
      const at = new Date();
      at.setDate(at.getDate() + d);
      at.setHours(hh, mm, 0, 0);
      if (at.getTime() <= Date.now() || (d === 0 && readToday)) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'وقت القراءة',
          body: goal ? `هدفك اليوم ${count(goal, 'page')}. افتح كتابك وابدأ.` : 'خصّص بضع دقائق لكتابك اليوم.',
          data: { kind: KIND },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: 'reading' },
      });
    }
  } catch {
    // Reminders are a nicety; never let them break saving progress.
  }
}
