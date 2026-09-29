package expo.modules.localreminders

import android.Manifest
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import expo.modules.interfaces.permissions.Permissions
import expo.modules.interfaces.permissions.PermissionsResponse
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.util.concurrent.TimeUnit

class ReminderRecord : Record {
  @Field val id: String = ""
  @Field val title: String = ""
  @Field val body: String = ""
  @Field val fireAtMs: Double = 0.0
}

private const val TAG = "nomad-days-reminder"

class LocalRemindersModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val needsRuntimePermission: Boolean
    get() = Build.VERSION.SDK_INT >= 33 && context.applicationInfo.targetSdkVersion >= 33

  /** "granted" | "denied" | "undetermined". System settings win: if notifications are switched off, it's "denied". */
  private fun statusFrom(responses: Map<String, PermissionsResponse>?): String {
    val response = responses?.get(Manifest.permission.POST_NOTIFICATIONS)
    return when {
      NotificationManagerCompat.from(context).areNotificationsEnabled() -> "granted"
      response?.status == PermissionsStatus.UNDETERMINED -> "undetermined"
      else -> "denied"
    }
  }

  private fun permissions(): Permissions? = appContext.permissions

  override fun definition() = ModuleDefinition {
    Name("LocalReminders")

    AsyncFunction("getPermissionAsync") { promise: Promise ->
      val perms = permissions()
      if (!needsRuntimePermission || perms == null) return@AsyncFunction promise.resolve(statusFrom(null))
      perms.getPermissions({ responses -> promise.resolve(statusFrom(responses)) }, Manifest.permission.POST_NOTIFICATIONS)
    }

    AsyncFunction("requestPermissionAsync") { promise: Promise ->
      val perms = permissions()
      if (!needsRuntimePermission || perms == null) return@AsyncFunction promise.resolve(statusFrom(null))
      perms.askForPermissions({ responses -> promise.resolve(statusFrom(responses)) }, Manifest.permission.POST_NOTIFICATIONS)
    }

    /** Replace every scheduled reminder with this list. Returns how many were scheduled. */
    AsyncFunction("replaceAllAsync") { reminders: List<ReminderRecord> ->
      val work = WorkManager.getInstance(context)
      work.cancelAllWorkByTag(TAG)
      val now = System.currentTimeMillis()
      val upcoming = reminders.filter { it.fireAtMs.toLong() > now }
      upcoming.forEach { r ->
        val request = OneTimeWorkRequestBuilder<ReminderWorker>()
          .setInitialDelay(r.fireAtMs.toLong() - now, TimeUnit.MILLISECONDS)
          .setInputData(workDataOf(ReminderWorker.KEY_ID to r.id, ReminderWorker.KEY_TITLE to r.title, ReminderWorker.KEY_BODY to r.body))
          .addTag(TAG)
          .build()
        work.enqueueUniqueWork("$TAG:${r.id}", ExistingWorkPolicy.REPLACE, request)
      }
      upcoming.size
    }

    AsyncFunction("cancelAllAsync") { promise: Promise ->
      WorkManager.getInstance(context).cancelAllWorkByTag(TAG)
      promise.resolve(null)
    }
  }
}
