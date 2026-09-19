package com.ensiyabco.alloush

data class IncomingMessage(
    val sender: String,
    val text: String,
    val receivedAt: Long = System.currentTimeMillis()
)
