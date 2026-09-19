package com.ensiyabco.alloush

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class AlloushNotificationListener : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName != "com.whatsapp") return

        val extras = sbn.notification.extras
        val sender = extras.getCharSequence("android.title")?.toString().orEmpty()
        val message = extras.getCharSequence("android.text")?.toString().orEmpty()

        if (message.isBlank()) return

        // V1: قراءة محلية فقط. لا إرسال إلى WhatsApp ولا تنفيذ تلقائي.
        // المرحلة التالية ستضيف القائمة الحمراء ومحرك علوش وموافقة علي.
        Log.d("Alloush", "WhatsApp notification received from: $sender")
    }
}
