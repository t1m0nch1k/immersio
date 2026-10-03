package ru.pogruzhenie.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews

class StreakWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val streak = prefs.getInt(KEY_STREAK, 0)
        val doneToday = prefs.getBoolean(KEY_DONE_TODAY, false)

        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId, streak, doneToday)
        }
    }

    companion object {
        private const val PREFS_NAME = "pogruzhenie_widget_prefs"
        private const val KEY_STREAK = "streak_count"
        private const val KEY_DONE_TODAY = "streak_done_today"

        fun updateAllWidgets(context: Context, streak: Int, doneToday: Boolean) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putInt(KEY_STREAK, streak)
                .putBoolean(KEY_DONE_TODAY, doneToday)
                .apply()

            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisWidget = ComponentName(context, StreakWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)

            for (appWidgetId in appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId, streak, doneToday)
            }
        }

        private fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            streak: Int,
            doneToday: Boolean
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_streak)

            val streakText = when {
                streak == 1 -> "1 день"
                streak in 2..4 -> "$streak дня"
                else -> "$streak дней"
            }
            views.setTextViewText(R.id.widget_streak_count, streakText)

            val statusText = if (doneToday) {
                "Огонёк зажжён!"
            } else {
                "Пора учиться!"
            }
            views.setTextViewText(R.id.widget_streak_status, statusText)

            // Tapping widget launches MainActivity
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = PendingIntent.getActivity(context, 0, intent, flags)
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
