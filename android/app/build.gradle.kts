plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ru.pogruzhenie.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "ru.pogruzhenie.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.activity:activity:1.12.3")
    implementation("androidx.webkit:webkit:1.15.0")
    // Custom Tabs for the Google sign-in flow. Google refuses to render its
    // OAuth page inside an embedded WebView (`disallowed_useragent`), so the
    // consent screen has to run in a real browser surface that can send a deep
    // link back to us.
    implementation("androidx.browser:browser:1.8.0")
}

tasks.register<Exec>("bundleWeb") {
    workingDir = rootProject.projectDir.parentFile
    if (System.getProperty("os.name").startsWith("Windows")) {
        commandLine("cmd", "/c", "npm", "run", "build:android-web")
    } else {
        commandLine("npm", "run", "build:android-web")
    }
}

tasks.named("preBuild") { dependsOn("bundleWeb") }
