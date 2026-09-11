const fs = require('fs');
let content = fs.readFileSync('android/app/build.gradle', 'utf8');

// Update version name
content = content.replace('versionName "1.0"', 'versionName "1.0.0"');

// Add signing configs
const signingConfigs = `
    signingConfigs {
        release {
            def keystorePath = System.getenv("KEYSTORE_PATH")
            if (keystorePath == null || keystorePath.isEmpty()) {
                throw new GradleException("KEYSTORE_PATH is required for release build")
            }
            def keystorePassword = System.getenv("KEYSTORE_PASSWORD")
            if (keystorePassword == null || keystorePassword.isEmpty()) {
                throw new GradleException("KEYSTORE_PASSWORD is required for release build")
            }
            storeFile file(keystorePath)
            storePassword keystorePassword
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
`;
content = content.replace('    buildTypes {', signingConfigs);

// Apply signing to release
content = content.replace(
    'minifyEnabled false', 
    'minifyEnabled true\n            shrinkResources true\n            signingConfig signingConfigs.release'
);

fs.writeFileSync('android/app/build.gradle', content);
