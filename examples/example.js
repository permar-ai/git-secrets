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

const { GitSecrets } = require('../dist/index');

(async () => {
    const gs = new GitSecrets();

    // File
    const filepath = './example.txt';
    await gs.addFile({ path: filepath });

    // Create users, teams and files
    await gs.addUser({ email: 'anton@gmail.com', password: 'anton' });
    await gs.addUser({ email: 'ben@gmail.com', password: 'ben' });
    await gs.addUser({ email: 'chris@gmail.com', password: 'chris' });
    await gs.addUser({ email: 'david@gmail.com', password: 'david' });

    // Grouping
    await gs.addTeam({ name: 'admin', description: 'Admin users' });
    await gs.addTeam({ name: 'dev', description: 'Developer users' });
    await gs.addCollection({ name: 'dev', description: 'Development environment' });
    await gs.addCollection({ name: 'prod', description: 'Production environment' });

    // Relations
    await gs.addTeamUsers({ teams: 'admin', users: 'ben@gmail.com' });
    await gs.addTeamUsers({ teams: 'dev', users: 'david@gmail.com' });
    await gs.addCollectionFiles({ files: filepath, collections: 'dev' });

    await gs.addAccess({ files: filepath, users: 'anton@gmail.com', teams: 'admin' });
    await gs.addAccess({ collections: 'dev', users: 'chris@gmail.com', teams: 'dev' });

    // Encrypt file
    await gs.encryptFile({ path: filepath, email: 'anton@gmail.com', password: 'anton' });

    // Decrypt file
    await gs.decryptFile({ path: filepath, email: 'david@gmail.com', password: 'david' });
})();
