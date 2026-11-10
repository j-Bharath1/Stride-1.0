plugins {
    id("com.android.application")
}

android {
    namespace = "dev.stride.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "dev.stride.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 11
        versionName = "6.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Signed with the debug key so the release APK installs straight away.
            // Swap in your own signingConfig before publishing to the Play Store.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
