/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as fs from 'fs';
import * as path from 'path';

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import Database from 'better-sqlite3';
import * as openpgp from 'openpgp';

import {
    GIT_IGNORE,
    LOCAL_SETTINGS,
    GIT_SECRETS_DIR,
    DATA_DIR,
    KEYS_DIR,
    DATA_SIGNATURES_FILENAME,
    LOCAL_SETTINGS_FILENAME,
    DB_FILENAME,
    SECRET_EXT,
} from './constants';
import {BaseTableConfigs} from './db/tables.base.dto';
import {Users, Teams, TeamMembers, Files, FileUsers, FileTeams} from './db/tables';
import {FileAccess} from './db/views';
import {KeyPair} from './encryption.dto';
import {OpenPGP} from './encryption';
import {toArray, mkdirIfNotExists, writeFileIfNotExists, runSQLSequentially } from './utils';
import {
    UserAdd,
    TeamAdd,
    TeamMemberAdd,
    FileAccessAdd,
    EncryptFileInput,
    DecryptFileInput,
    UserKeyUpdate,
} from './managers.dto';

class AccessManager {
    private readonly fileAccess: FileAccess;
    private readonly fileUsers: FileUsers;
    private readonly fileTeams: FileTeams;

    constructor(configs: BaseTableConfigs) {
        this.fileAccess = new FileAccess({db: configs.db});
        this.fileUsers = new FileUsers({db: configs.db});
        this.fileTeams = new FileTeams({db: configs.db});
    }

    findAllUsersIds(fileId: string): string[] {
        return this.fileAccess.findAllUsersIds({fileId: fileId});
    }

    findAllFilesIds(userId: string): string[] {
        return this.fileAccess.findAllFileIds({userId: userId});
    }

    add({fileId, userId, teamId}: { fileId: string; userId?: string; teamId?: string }) {
        if (userId) this.fileUsers.add({fileId: fileId, userId: userId});
        if (teamId) this.fileTeams.add({fileId: fileId, teamId: teamId});
    }

    remove({fileId, userId, teamId}: { fileId: string; userId?: string; teamId?: string }) {
        if (userId) this.fileUsers.remove({fileId: fileId, userId: userId});
        if (teamId) this.fileTeams.remove({fileId: fileId, teamId: teamId});
    }
}

export class InternalFileSystem {
    readonly dirs: { repo: string, gitsecrets: string, keys: string, data: string };
    readonly files: { settings?: string; localSettings: string; db: string; dataSignatures: string; };

    constructor({ repoDir }: { repoDir: string }) {
        this.dirs = {
            repo: repoDir,
            gitsecrets: path.resolve(repoDir, GIT_SECRETS_DIR),
            keys: path.resolve(repoDir, GIT_SECRETS_DIR, KEYS_DIR),
            data: path.resolve(repoDir, GIT_SECRETS_DIR, DATA_DIR),
        }
        this.files = {
            localSettings: path.resolve(this.dirs.gitsecrets, LOCAL_SETTINGS_FILENAME),
            db: path.resolve(this.dirs.gitsecrets, DB_FILENAME),
            dataSignatures: path.resolve(this.dirs.data, DATA_SIGNATURES_FILENAME)
        }
    }

    isInitialized(): boolean {
        const initialized = false;
        if (!fs.existsSync(this.dirs.gitsecrets)) return initialized;
        if (!fs.existsSync(this.dirs.keys)) return false;
        if (!fs.existsSync(this.files.localSettings)) return false;
        if (!fs.existsSync(this.files.db)) return false;
        return true;
    }
}

export class SetupManager {
    private readonly fs: InternalFileSystem;

    constructor({ repoDir }: { repoDir: string }) {
        this.fs = new InternalFileSystem({ repoDir });
    }

    directories() {
        const dirs = this.fs.dirs;
        mkdirIfNotExists(dirs.gitsecrets);
        mkdirIfNotExists(dirs.data);
        mkdirIfNotExists(dirs.keys);
    }

    files() {
        const files = this.fs.files;
        writeFileIfNotExists(path.resolve(this.fs.dirs.gitsecrets, '.gitignore'), GIT_IGNORE, 'utf-8');
        writeFileIfNotExists(files.dataSignatures, JSON.stringify({}, null, 4), 'utf-8');
        writeFileIfNotExists(files.localSettings, JSON.stringify(LOCAL_SETTINGS, null, 4));
    }

    database() {
        const db = new Database(this.fs.files.db);
        db.pragma('foreign_keys = ON');
        const sqlFileContents = fs.readFileSync(path.resolve(__dirname, 'db', 'schema.sql'), 'utf-8');
        runSQLSequentially(db, sqlFileContents);
    }
}

export class GitSecretsManager {
    // File system
    readonly fs: InternalFileSystem;

    // Settings
    private settings: any;
    private localSettings: any;

    // Database + Tables
    private readonly db: InstanceType<typeof Database>;
    readonly users: Users;
    readonly teams: Teams;
    readonly files: Files;
    readonly teamMembers: TeamMembers;

    // Encryption
    private readonly openpgp: OpenPGP;

    // Managers
    readonly access: AccessManager;

    constructor({ repoDir }: { repoDir: string }) {
        // File system
        this.fs = new InternalFileSystem({ repoDir: repoDir });

        // Settings
        this.localSettings = fs.existsSync(this.fs.files.localSettings)
            ? JSON.parse(fs.readFileSync(this.fs.files.localSettings, 'utf-8'))
            : {};

        // Database
        this.db = new Database(this.fs.files.db);
        this.db.pragma('foreign_keys = ON');

        // Tables
        this.users = new Users({db: this.db});
        this.teams = new Teams({db: this.db});
        this.files = new Files({db: this.db});
        this.teamMembers = new TeamMembers({db: this.db});

        // Encryption
        this.openpgp = new OpenPGP({ keysDir: this.fs.dirs.keys });

        // Managers
        this.access = new AccessManager({db: this.db});
    }

    async updateLocalSettings(email: string) {
        const user = this.users.getByEmail(email);
        this.localSettings = {...this.localSettings, user: user};
        fs.writeFileSync(this.fs.files.localSettings, JSON.stringify(this.localSettings, null, 4), 'utf-8');
    }

    async addUser(input: UserAdd): Promise<string | null> {
        const {email, name, password} = input;
        const userId = uuidv4();
        const user = this.users.getByEmail(email);

        // Existing user
        if (user) return user.id;

        // New user
        try {
            await this.openpgp.createKeyPair({userId, email, name, password});
            this.users.create({id: userId, email, name});
            return userId;
        } catch (err) {
            console.error(err);
            // Delete keys files if already created
            // TODO: Try to delete keys
        }
        return null;
    }

    async addTeam(input: TeamAdd): Promise<string> {
        const {name, description} = input;
        const teamId = uuidv4();
        const team = this.teams.getByName(name);

        // Existing team
        if (team) return team.id;

        // New team
        this.teams.create({id: teamId, name: name, description: description});
        return teamId;
    }

    async addTeamMembers(input: TeamMemberAdd) {
        const {teamIds, userIds} = input;
        const teamIdsList = toArray(teamIds);
        const userIdsList = toArray(userIds);

        // Generate combinations
        const teamUserPairs = teamIdsList.flatMap((l1) => userIdsList.map((l2) => [l1, l2]));
        teamUserPairs.map(([teamId, userId]) => this.teamMembers.add({teamId: teamId, userId: userId}));
    }

    async addFile(path: string): Promise<string | null> {
        let fileId = uuidv4();
        const file = this.files.getByPath(path);

        // Existing file
        if (file) {
            this.updateFileSignatures(file.id);
            return file.id;
        }

        // New file
        try {
            this.files.create({id: fileId, path, contents_signature: 'SETUP', access_signature: 'SETUP'});
            this.updateFileSignatures(fileId);
            return fileId;
        } catch (err) {
            console.error(err);
        }
        return null;
    }

    async addFileAccess(input: FileAccessAdd) {
        const {fileIds, userIds, teamIds} = input;
        const fileIdsList = toArray(fileIds);
        const userIdsList = toArray(userIds);
        const teamIdsList = toArray(teamIds);

        // Create all combinations
        const filesUsers = fileIdsList.flatMap((l1) => userIdsList.map((l2) => [l1, l2]));
        const filesTeams = fileIdsList.flatMap((l1) => teamIdsList.map((l2) => [l1, l2]));

        // Add access
        filesUsers.map(([fileId, userId]) => this.access.add({fileId: fileId, userId: userId}));
        filesTeams.map(([fileId, teamId]) => this.access.add({fileId: fileId, teamId: teamId}));
    }

    async encryptFile(input: EncryptFileInput) {
        const { userId, password, fileId } = input;

        // File info
        const file = this.files.findOne(fileId);
        const filename = path.resolve(this.fs.dirs.repo, file.path);
        if (!fs.existsSync(filename)) {
            console.warn(`WARNING | File requested to be encrypted missing | Filename: ${filename}`);
            return;
        }

        // Public keys of all users with access to the file
        const keys = await this.getFileKeys(fileId);
        const publicKeys = keys.map((keys) => keys.publicKey).filter((key) => key !== undefined);

        // Keys of user performing the encryption
        const userKeys = await this.openpgp.getUserKeys(userId);
        if (!userKeys.armoredPrivateKey) {
            console.warn(`WARNING | Cannot encrypt file because user private key missing | User ID: ${userId}`);
            return;
        }

        // Encrypt file
        const fileContents = fs.readFileSync(filename).toString();
        const privateKey = await openpgp.decryptKey({
            privateKey: await openpgp.readPrivateKey({ armoredKey: userKeys.armoredPrivateKey }),
            passphrase: password,
        });
        const message = await openpgp.createMessage({text: fileContents});
        // @ts-ignore
        const encryptedContents = await openpgp.encrypt({
            message: message,
            encryptionKeys: publicKeys,
            signingKeys: privateKey,
        });

        // Write file
        fs.writeFileSync(path.resolve(this.fs.dirs.repo, `${file.path}${SECRET_EXT}`), encryptedContents.toString(), 'utf-8');
    }

    async decryptFile(input: DecryptFileInput) {
        const {userId, password, fileId} = input;

        // File info + check
        const file = this.files.findOne(fileId);
        const encryptedFilename = path.resolve(this.fs.dirs.repo, `${file.path}${SECRET_EXT}`);
        if (!fs.existsSync(encryptedFilename)) {
            console.warn(`WARNING | File requested to be decrypted missing | Filename: ${encryptedFilename}`);
            return;
        }

        // Public keys of all users with access to the file
        const keys = await this.getFileKeys(fileId);
        const publicKeys = keys.map((keys) => keys.publicKey).filter((key) => key !== undefined);

        // Get user keys
        const {armoredPrivateKey} = await this.openpgp.getUserKeys(userId);
        if (!armoredPrivateKey) {
            console.warn(`WARNING | Cannot decrypt file because user private key missing | User ID: ${userId}`);
            return;
        }

        // Decrypt file
        const privateKey = await openpgp.decryptKey({
            privateKey: await openpgp.readPrivateKey({armoredKey: armoredPrivateKey}),
            passphrase: password,
        });
        const encryptedFileContents = fs.readFileSync(encryptedFilename).toString();
        const message = await openpgp.readMessage({armoredMessage: encryptedFileContents});
        // @ts-ignore
        const {data: decryptedContents} = await openpgp.decrypt({
            message: message,
            decryptionKeys: privateKey,
            verificationKeys: publicKeys,
            expectSigned: true,
        });

        // Write to disk
        fs.writeFileSync(path.resolve(this.fs.dirs.repo, `${file.path}.decrypted`), decryptedContents.toString(), 'utf-8');
    }

    async getFileKeys(fileId: string): Promise<KeyPair[]> {
        const usersIds = this.access.findAllUsersIds(fileId);
        return await Promise.all(usersIds.map(async (userId) => await this.openpgp.getUserKeys(userId)));
    }

    async updateUserKeys(input: UserKeyUpdate) {
        const {userId, password} = input;
        const user = this.users.findOne(userId);
        // TODO:
        //  1. Decrypt all files that user has access to
        //  2. Update keys
        //  3. Encrypt all files that user has access to
        await this.openpgp.createKeyPair({userId, email: user.email, name: user.name, password});
    }

    updateFileSignatures(fileId: string) {
        const file = this.files.findOne(fileId);

        // Contents signature
        const fileContents = fs.readFileSync(path.resolve(this.fs.dirs.repo, file.path), 'utf-8');
        const contents_signature = crypto.createHash('sha256').update(fileContents).digest('hex');

        // Access signature
        const usersIds = this.access.findAllUsersIds(fileId);
        const usersIdsText = usersIds.join(',') || '';
        const access_signature = crypto.createHash('sha256').update(usersIdsText).digest('hex');

        // DB update
        this.files.update({id: fileId, contents_signature: contents_signature, access_signature: access_signature});
    }

    async cleanup() {
        // TODO: Check that only keys for existing users are in the keys directory
        // TODO: Remove files for which a corresponding .secret file does not exist (all users have access to the .secret version for the file
    }
}
