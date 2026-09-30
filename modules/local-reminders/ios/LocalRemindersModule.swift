import ExpoModulesCore
import UserNotifications

struct ReminderRecord: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var body: String = ""
  @Field var fireAtMs: Double = 0
}

private let idPrefix = "nomad-days."
private let iosPendingLimit = 64 // iOS keeps at most 64 pending local notifications per app

private func statusString(_ status: UNAuthorizationStatus) -> String {
  switch status {
  case .authorized, .provisional, .ephemeral: return "granted"
  case .denied: return "denied"
  default: return "undetermined"
  }
}

public class LocalRemindersModule: Module {
  private let center = UNUserNotificationCenter.current()

  public func definition() -> ModuleDefinition {
    Name("LocalReminders")

    AsyncFunction("getPermissionAsync") { (promise: Promise) in
      self.center.getNotificationSettings { settings in
        promise.resolve(statusString(settings.authorizationStatus))
      }
    }

    AsyncFunction("requestPermissionAsync") { (promise: Promise) in
      self.center.requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in
        self.center.getNotificationSettings { settings in
          promise.resolve(statusString(settings.authorizationStatus))
        }
      }
    }

    /// Replace every scheduled reminder with this list. Returns how many were scheduled.
    AsyncFunction("replaceAllAsync") { (reminders: [ReminderRecord], promise: Promise) in
      self.removeOurs {
        let now = Date()
        let upcoming = reminders
          .map { ($0, Date(timeIntervalSince1970: $0.fireAtMs / 1000)) }
          .filter { $0.1 > now }
          .sorted { $0.1 < $1.1 }
          .prefix(iosPendingLimit)

        let group = DispatchGroup()
        for (reminder, date) in upcoming {
          let content = UNMutableNotificationContent()
          content.title = reminder.title
          content.body = reminder.body
          content.sound = .default
          let parts = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
          let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)
          group.enter()
          self.center.add(UNNotificationRequest(identifier: idPrefix + reminder.id, content: content, trigger: trigger)) { _ in
            group.leave()
          }
        }
        group.notify(queue: .main) { promise.resolve(upcoming.count) }
      }
    }

    AsyncFunction("cancelAllAsync") { (promise: Promise) in
      self.removeOurs { promise.resolve(nil) }
    }
  }

  private func removeOurs(then done: @escaping () -> Void) {
    center.getPendingNotificationRequests { pending in
      let ours = pending.map(\.identifier).filter { $0.hasPrefix(idPrefix) }
      self.center.removePendingNotificationRequests(withIdentifiers: ours)
      done()
    }
  }
}
