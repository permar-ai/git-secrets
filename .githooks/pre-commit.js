/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const fs = require('fs');
const path = require('path');

const REPO_DIRECTORY = path.resolve(__dirname, '..');

function updatePackageVersion() {
    const packageJsonPath = path.resolve(REPO_DIRECTORY, 'package.json');
    const versionJsonPath = path.resolve(REPO_DIRECTORY, 'version.json');

    if (fs.existsSync(packageJsonPath)) {
        const packageJsonData = fs.readFileSync(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonData);

        // Data
        const versionData = {
            readme: 'DO NOT MODIFY - GENERATED AUTOMATICALLY',
            script: '.githooks/pre-commit.js',
            name: packageJson?.name,
            version: packageJson?.version,
        };

        // Update version file
        fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 4));
    }
}

// --------------------------------------------------- EXECUTION ---------------------------------------------------- //
updatePackageVersion();
