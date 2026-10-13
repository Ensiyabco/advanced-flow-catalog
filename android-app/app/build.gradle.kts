plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.ensiyabco.catalog"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.ensiyabco.catalog"
        minSdk = 24
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.1"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin { jvmToolchain(17) }
