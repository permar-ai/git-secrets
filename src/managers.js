/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const fs = require('fs');
const path = require('path');

const { uuid } = require('uuidv4');
const openpgp = require('openpgp');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const {
    GIT_IGNORE,
    LOCAL_SETTINGS,
    GIT_SECRETS_DIR,
    KEYS_DIR,
    LOCAL_SETTINGS_FILENAME,
    DB_FILENAME,
    SECRET_EXT,
} = require('./constants');
const { Users, Teams, TeamMembers, Files, FileUsers, FileTeams } = require('./tables');
const { FileAccess } = require('./views');
const { OpenPGP } = require('./encryption');
const { toArray, mkdirIfNotExists, readFileIfExists, writeFileIfNotExists, runAsTransaction } = require('./utils');

class AccessManager {
    constructor({ db }) {
        this.fileAccess = new FileAccess({ db });
        this.fileUsers = new FileUsers({ db });
        this.fileTeams = new FileTeams({ db });
    }

    findAllUsersIds(fileId) {
        return this.fileAccess.findAllUsersIds({ fileId: fileId });
    }

    findAllFilesIds(userId) {
        return this.fileAccess.findAllFileIds({ userId: userId });
    }

    add({ fileId, userId, teamId }) {
        if (userId) this.fileUsers.add({ fileId: fileId, userId: userId });
        if (teamId) this.fileTeams.add({ fileId: fileId, teamId: teamId });
    }

    remove({ fileId, userId, teamId }) {
        if (userId) this.fileUsers.remove({ fileId: fileId, userId: userId });
        if (teamId) this.fileTeams.remove({ fileId: fileId, teamId: teamId });
    }
}

class GitSecretsManager {
    constructor({ rootDir }) {
        // Directories and files
        this.rootDir = rootDir;
        this.storageDir = path.resolve(this.rootDir, GIT_SECRETS_DIR);
        this.keysDir = path.resolve(this.storageDir, KEYS_DIR);
        this.settingsFilename = path.resolve(this.storageDir, LOCAL_SETTINGS_FILENAME);

        // Settings
        this.settings = (fs.existsSync(this.settingsFilename)) ? JSON.parse(fs.readFileSync(this.settingsFilename, 'utf-8')) : {};

        // Database
        this.db = new Database(path.resolve(this.storageDir, DB_FILENAME));
        this.db.pragma('foreign_keys = ON');

        // Setup
        this.setup();

        // Tables
        this.users = new Users({ db: this.db });
        this.teams = new Teams({ db: this.db });
        this.files = new Files({ db: this.db });
        this.teamMembers = new TeamMembers({ db: this.db });

        // Encryption
        this.openpgp = new OpenPGP({ keysDir: this.keysDir });

        // Managers
        this.access = new AccessManager({ db: this.db });
    }

    setup() {
        // Setup of git secrets folder
        mkdirIfNotExists(this.storageDir);
        mkdirIfNotExists(this.keysDir, { recursive: true });

        // Files
        writeFileIfNotExists(path.resolve(this.storageDir, '.gitignore'), GIT_IGNORE, 'utf-8');
        writeFileIfNotExists(path.resolve(this.storageDir, LOCAL_SETTINGS_FILENAME), JSON.stringify(LOCAL_SETTINGS, null, 4));

        // Database
        const sqlFileContents = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf-8');
        runAsTransaction({ db: this.db, sql: sqlFileContents });
    }

    async updateLocalSettings({ email }) {
        const user = this.users.getByEmail(email);
        this.settings = { ...this.settings, user: user };
        fs.writeFileSync(this.settingsFilename, JSON.stringify(this.settings, null, 4), 'utf-8');
    }

    async addUser({ email, name, password }) {
        const userId = uuid();
        const { id: existingUserId } = this.users.getByEmail(email);

        // Existing user
        if (existingUserId) return existingUserId;

        // New user
        try {
            await this.openpgp.createKeyPair({ userId, email, name, password });
            this.users.create({ id: userId, email, name });
            return userId;
        } catch (err) {
            console.error(err);
            // Delete keys files if already created
            // TODO: Try to delete keys
        }
    }

    async addTeam({ name, description }) {
        const teamId = uuid();
        const { id: existingTeamId } = this.teams.getByName(name);

        // Existing team
        if (existingTeamId) return existingTeamId;

        // New team
        this.teams.create({ id: teamId, name: name, description: description });
        return teamId;
    }

    async addUsersToTeams({ teamIds, userIds }) {
        const teamIdsList = toArray(teamIds);
        const userIdsList = toArray(userIds);

        // Generate combinations
        const teamUserPairs = teamIdsList.flatMap(l1 => userIdsList.map(l2 => [l1, l2]));
        teamUserPairs.map(([teamId, userId]) => this.teamMembers.add({ teamId: teamId, userId: userId }));
    }

    async addFile({ path }) {
        let fileId = uuid();
        const { id: existingFileId } = this.files.getByPath(path);

        // Existing file
        if (existingFileId) {
            this.updateFileSignatures(existingFileId);
            return existingFileId;
        }

        // New file
        else {
            try {
                this.files.create({ id: fileId, path, contents_signature: 'SETUP', access_signature: 'SETUP' });
                this.updateFileSignatures(fileId);
                return fileId;
            } catch (err) {
                console.error(err);
            }
        }
    }

    async addAccessToFiles({ filesIds, usersIds, teamsIds }) {
        const filesIdsList = toArray(filesIds);
        const usersIdsList = toArray(usersIds);
        const teamsIdsList = toArray(teamsIds);

        // Create all combinations
        const filesUsers = filesIdsList.flatMap(l1 => usersIdsList.map(l2 => [l1, l2]));
        const filesTeams = filesIdsList.flatMap(l1 => teamsIdsList.map(l2 => [l1, l2]));

        // Add access
        filesUsers.map(([fileId, userId]) => this.access.add({ fileId: fileId, userId: userId }));
        filesTeams.map(([fileId, teamId]) => this.access.add({ fileId: fileId, teamId: teamId }));
    }

    async encryptFile({ userId, password, fileId }) {
        // File info
        const file = this.files.findOne(fileId);

        // Public keys of all users with access to a file
        const keys = await this.getFileKeys(fileId);
        const publicKeys = keys.map((x) => x.publicKey);

        // Keys of user performing the encryption
        const userKeys = await this.openpgp.getUserKeys(userId);
        const privateKey = await openpgp.decryptKey({
            privateKey: await openpgp.readKey({ armoredKey: userKeys.armoredPrivateKey }),
            passphrase: password,
        });

        // Encrypt file
        const fileContents = fs.readFileSync(path.resolve(this.rootDir, file.path)).toString();
        const message = await openpgp.createMessage({ text: fileContents });
        const encryptedContents = await openpgp.encrypt({
            message: message,
            encryptionKeys: publicKeys,
            signingKeys: privateKey,
        });

        // Write file
        fs.writeFileSync(path.resolve(this.rootDir, `${file.path}${SECRET_EXT}`), encryptedContents, 'utf-8');
    }

    async decryptFile({ userId, password, fileId }) {
        // File info
        const file = this.files.findOne(fileId);

        // Public keys of all users with access to the file
        const keys = await this.getFileKeys(fileId);
        const publicKeys = keys.map((x) => x.publicKey);

        // Get user keys
        const { armoredPrivateKey } = await this.openpgp.getUserKeys(userId);
        const privateKey = await openpgp.decryptKey({
            privateKey: await openpgp.readKey({ armoredKey: armoredPrivateKey }),
            passphrase: password,
        });

        // Check if file exists
        const encryptedFilename = path.resolve(this.rootDir, `${file.path}${SECRET_EXT}`);
        if (!fs.existsSync(encryptedFilename)) {
            console.warn(`WARNING | File requested to be decrypted missing | Filename: ${encryptedFilename}`);
            return;
        }

        // Decrypt file
        const encryptedFileContents = fs.readFileSync(encryptedFilename).toString();
        const message = await openpgp.readMessage({ armoredMessage: encryptedFileContents });
        const { data: decryptedContents } = await openpgp.decrypt({
            message,
            decryptionKeys: privateKey,
            verificationKeys: publicKeys,
            expectSigned: true,
        });

        // Write to disk
        fs.writeFileSync(path.resolve(this.rootDir, `${file.path}.decrypted`), decryptedContents, 'utf-8');
    }

    async getFileKeys(fileId) {
        const usersIds = this.access.findAllUsersIds(fileId);
        return await Promise.all(usersIds.map(async (userId) => await this.openpgp.getUserKeys(userId)));
    }

    async updateUserKeys({ userId, password }) {
        const user = this.users.findOne(userId);
        // TODO:
        //  1. Decrypt all files that user has access to
        //  2. Update keys
        //  3. Encrypt all files that user has access to
        await this.openpgp.createKeyPair({ userId, email: user.email, name: user.name, password });
    }

    updateFileSignatures(fileId) {
        const file = this.files.findOne(fileId);
        const fileContents = fs.readFileSync(path.resolve(this.rootDir, file.path), 'utf-8');
        const contents_signature = crypto.createHash('sha256').update(fileContents).digest('hex');
        const usersIds = this.access.findAllUsersIds(fileId);
        const usersIdsText = usersIds.join(',') || '';
        const access_signature = crypto.createHash('sha256').update(usersIdsText).digest('hex');
        this.files.update({ id: fileId, contents_signature, access_signature });
    }

    async cleanup() {
        // TODO: Check that only keys for existing users are in the keys directory
        // TODO: Remove files for which a corresponding .secret file does not exist (all users have access to the .secret version for the file
    }
}

module.exports = {
    GitSecretsManager,
};
