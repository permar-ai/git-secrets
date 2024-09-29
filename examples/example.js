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
    const filepath = './example.txt';
    console.log(process.cwd());

    const secrets = new GitSecrets();
    console.log('repo', secrets.fs.dirs.repo);

    // Create users, teams and files
    await secrets.addUser({ email: 'anton@gmail.com', password: 'anton' });
    await secrets.addUser({ email: 'ben@outlook.com', password: 'ben' });
    await secrets.addUser({ email: 'chris@yahoo.com', password: 'chris' });
    await secrets.addUser({ email: 'david@web.de', password: 'david' });

    await secrets.addTeam({ name: 'admin', description: 'Admin users' });
    await secrets.addTeam({ name: 'dev', description: 'Developer users' });
    await secrets.addCollection({ name: 'test', description: 'Development environment' });
    await secrets.addCollection({ name: 'stage', description: 'Production environment' });

    await secrets.addFile({ path: filepath });

    // Relations
    await secrets.addTeamUsers({ teams: 'beta', users: 'ben@outlook.com' });
    await secrets.addTeamUsers({ teams: 'dev', users: 'david@web.de' });
    await secrets.addCollectionFiles({ files: filepath, collections: 'test' });

    await secrets.addAccess({ files: filepath, users: 'anton@gmail.com', teams: 'beta' });
    await secrets.addAccess({ collections: 'test', users: 'chris@yahoo.com', teams: 'dev' });

    // Encrypt file
    await secrets.encryptFile({ path: filepath, email: 'anton@gmail.com', password: 'anton' });

    // Decrypt file
    await secrets.decryptFile({ path: filepath, email: 'david@web.de', password: 'david' });
})();
