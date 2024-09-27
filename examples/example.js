/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Resources:
// - https://www.npmjs.com/package/openpgp
// - https://www.gnupg.org/gph/en/manual/x110.html

const path = require('path');

const { GitSecrets } = require('../dist/index');

// Constants
const REPO_DIR = path.resolve(__dirname, '..');

(async () => {
    const filepath = './examples/example.txt';

    const secrets = new GitSecrets({ rootDir: REPO_DIR });

    // Create users, teams and files
    const antonId = await secrets.addUser({ email: 'anton@gmail.com', password: 'anton' });
    const benId = await secrets.addUser({ email: 'ben@outlook.com', password: 'ben' });
    const chrisId = await secrets.addUser({ email: 'chris@yahoo.com', password: 'chris' });
    const teamId = await secrets.addTeam({ name: 'admin', description: 'Admin users' });
    const fileId = await secrets.addFile(filepath);

    // Relations
    await secrets.addTeamMembers({ teamIds: teamId, userIds: chrisId });
    await secrets.addFileAccess({ fileIds: fileId, userIds: [antonId, benId], teamIds: teamId });

    // Encrypt file
    await secrets.encryptFile({ userId: antonId, password: 'anton', fileId: fileId });

    // Decrypt file
    await secrets.decryptFile({ userId: chrisId, password: 'chris', fileId: fileId });
})();
