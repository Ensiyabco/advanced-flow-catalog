package com.ensiyabco.alloush

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val title = TextView(this).apply {
            text = "علوش\nمساعد علي الشخصي والتجاري"
            textSize = 24f
            setPadding(32, 48, 32, 32)
        }
        val status = TextView(this).apply {
            text = "V1: يقرأ إشعارات واتساب بعد إذنك، ولا يرسل أي رد تلقائيًا."
            textSize = 17f
            setPadding(32, 16, 32, 32)
        }
        val permission = Button(this).apply {
            text = "تفعيل الوصول إلى الإشعارات"
            setOnClickListener {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            }
        }
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(title)
            addView(status)
            addView(permission)
        }
        setContentView(layout)
    }
}
