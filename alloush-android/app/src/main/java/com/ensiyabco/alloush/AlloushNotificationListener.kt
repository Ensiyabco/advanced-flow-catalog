package com.ensiyabco.alloush

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class AlloushNotificationListener : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName != "com.whatsapp") return

        val extras = sbn.notification.extras
        val sender = extras.getCharSequence("android.title")?.toString().orEmpty()
        val message = extras.getCharSequence("android.text")?.toString().orEmpty()
        if (sender.isBlank() || message.isBlank()) return

        // القائمة الحمراء تُستبعد قبل الحفظ أو المعالجة.
        AlloushStore.saveIncoming(this, IncomingMessage(sender, message))
        // V1 لا يرسل أي رد إلى WhatsApp.
    }
}
