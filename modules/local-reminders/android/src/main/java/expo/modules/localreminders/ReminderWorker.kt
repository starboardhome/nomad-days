package expo.modules.localreminders

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Worker
import androidx.work.WorkerParameters

/** Runs at the scheduled time (WorkManager survives reboots) and posts one notification. */
class ReminderWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  companion object {
    const val KEY_ID = "id"
    const val KEY_TITLE = "title"
    const val KEY_BODY = "body"
    const val CHANNEL_ID = "stay-reminders"
  }

  @SuppressLint("MissingPermission") // checked via areNotificationsEnabled()
  override fun doWork(): Result {
    val manager = NotificationManagerCompat.from(applicationContext)
    if (!manager.areNotificationsEnabled()) return Result.success()

    ensureChannel()
    val id = inputData.getString(KEY_ID) ?: return Result.success()
    val openApp = applicationContext.packageManager.getLaunchIntentForPackage(applicationContext.packageName)
    val tap = openApp?.let {
      PendingIntent.getActivity(applicationContext, id.hashCode(), it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_reminder)
      .setContentTitle(inputData.getString(KEY_TITLE))
      .setContentText(inputData.getString(KEY_BODY))
      .setStyle(NotificationCompat.BigTextStyle().bigText(inputData.getString(KEY_BODY)))
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setContentIntent(tap)
      .setAutoCancel(true)
      .build()

    manager.notify(id.hashCode(), notification)
    return Result.success()
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(CHANNEL_ID, "Stay reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
      description = "Heads-ups before you reach a stay or tax-day limit"
    }
    applicationContext.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
  }
}
