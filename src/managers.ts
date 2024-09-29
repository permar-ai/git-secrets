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

import { GIT_IGNORE, LOCAL_SETTINGS, SECRET_EXT } from './constants';
import { InternalFileSystem } from './io';
import { Git } from './git';
import { Response, toSuccess, toWarning, toError } from './dto';
import { BaseTableConfigs } from './db/tables.base.dto';
import { Users, Teams, TeamMembers, Files, FileUsers, FileTeams } from './db/tables';
import { TeamMembersView, FileAccess } from './db/views';
import { KeyPair } from './encryption.dto';
import { OpenPGP } from './encryption';
import { toArray, mkdirIfNotExists, writeFileIfNotExists, runSQLSequentially } from './utils';
import {
    UserAdd,
    TeamAdd,
    TeamMemberAdd,
    FileAccessAdd,
    EncryptFileInput,
    DecryptFileInput,
    UserKeyUpdate,
} from './managers.dto';

const git = new Git();

class AccessManager {
    private readonly fileAccess: FileAccess;
    private readonly fileUsers: FileUsers;
    private readonly fileTeams: FileTeams;

    constructor(configs: BaseTableConfigs) {
        this.fileAccess = new FileAccess({ db: configs.db });
        this.fileUsers = new FileUsers({ db: configs.db });
        this.fileTeams = new FileTeams({ db: configs.db });
    }

    findAllUsersIds(fileId: string): string[] {
        return this.fileAccess.findAllUsersIds({ fileId: fileId });
    }

    findAllFilesIds(userId: string): string[] {
        return this.fileAccess.findAllFileIds({ userId: userId });
    }

    add({ fileId, userId, teamId }: { fileId: string; userId?: string; teamId?: string }) {
        if (userId) this.fileUsers.add({ fileId: fileId, userId: userId });
        if (teamId) this.fileTeams.add({ fileId: fileId, teamId: teamId });
    }

    remove({ fileId, userId, teamId }: { fileId: string; userId?: string; teamId?: string }) {
        if (userId) this.fileUsers.remove({ fileId: fileId, userId: userId });
        if (teamId) this.fileTeams.remove({ fileId: fileId, teamId: teamId });
    }

    getSignature(fileId: string) {
        const usersIds = this.findAllUsersIds(fileId);
        const usersIdsText = usersIds.join(',') || '';
        return crypto.createHash('sha256').update(usersIdsText).digest('hex');
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
    readonly teamMembersView: TeamMembersView;

    // Encryption
    readonly openpgp: OpenPGP;

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
        this.users = new Users({ db: this.db });
        this.teams = new Teams({ db: this.db });
        this.files = new Files({ db: this.db });
        this.teamMembers = new TeamMembers({ db: this.db });
        this.teamMembersView = new TeamMembersView({ db: this.db });

        // Encryption
        this.openpgp = new OpenPGP({ repoDir: this.fs.dirs.repo });

        // Managers
        this.access = new AccessManager({ db: this.db });
    }

    async updateLocalSettings(email: string) {
        const user = this.users.getByEmail(email);
        this.localSettings = { ...this.localSettings, user: user };
        fs.writeFileSync(this.fs.files.localSettings, JSON.stringify(this.localSettings, null, 4), 'utf-8');
    }

    async addUser(data: UserAdd): Promise<Response<{ id: string }>> {
        const { email, name, password } = data;
        const userId = uuidv4();
        const user = this.users.getByEmail(email);

        // Existing user
        if (user) return toWarning(`User with email '${email}' already exists.`);

        // New user
        try {
            await this.openpgp.createKeyPair({ userId, email, name, password });
            this.users.create({ id: userId, email, name });
            return toSuccess({ id: userId });
        } catch (err) {
            console.error(err);
            // Delete keys files if already created
            // TODO: Try to delete keys
            return toError(err);
        }
    }

    async addTeam(data: TeamAdd): Promise<Response<{ id: string }>> {
        const { name, description } = data;
        const teamId = uuidv4();
        const team = this.teams.getByName(name);

        // Existing team
        if (team) return toWarning(`Team with name '${name}' already exists.`);

        // New team
        this.teams.create({ id: teamId, name: name, description: description });
        return toSuccess({ id: teamId });
    }

    async addTeamMembers(data: TeamMemberAdd): Promise<Response<{}>> {
        const { teams, users } = data;

        // Retrieve IDs
        const teamIds = toArray(teams).map((name) => {
            const team = this.teams.getByName(name);
            if (!team) return null;
            return team.id;
        }) as string[];
        const userIds = toArray(users).map((email) => {
            const user = this.users.getByEmail(email);
            if (!user) return null;
            return user.id;
        }) as string[];

        // Check that all teams and users exist
        for (let idx = 0; idx < teamIds.length; idx++) {
            const teamId = teamIds[idx];
            if (!teamId) return toError(`Team with name '${teams[idx]}' does not exist.`);
        }
        for (let idx = 0; idx < userIds.length; idx++) {
            const userId = userIds[idx];
            if (!userId) return toError(`User with email '${users[idx]}' does not exist.`);
        }

        // Generate combinations
        const teamUserPairs = teamIds.flatMap((t) => userIds.map((u) => [t, u]));
        teamUserPairs.map(([teamId, userId]) => this.teamMembers.add({ teamId: teamId, userId: userId }));
        return toSuccess({});
    }

    async addFile(path: string): Promise<Response<{ id: string }>> {
        let fileId = uuidv4();
        const file = this.files.getByPath(path);

        // Existing file
        if (file) return toWarning(`File with path '${path}' already exists.`);

        // New file
        try {
            this.files.create({ id: fileId, path, contentsSignature: 'SETUP', accessSignature: 'SETUP' });
            this.updateFileSignatures(fileId);
            git.addToGitIgnore(path);
            return toSuccess({ id: fileId });
        } catch (err) {
            console.error(err);
            return toError(err);
        }
    }

    async addFileAccess(input: FileAccessAdd): Promise<Response<{}>> {
        const { files, users, teams } = input;
        const filesList = toArray(files);
        const usersList = toArray(users);
        const teamsList = toArray(teams);

        // Retrieve ids
        const fileIds = filesList.map((f) => {
            const file = this.files.getByPath(git.getRelativePath(f));
            return file ? file.id : null;
        }) as string[];
        const userIds = usersList.map((u) => {
            const user = this.users.getByEmail(u);
            return user ? user.id : null;
        }) as string[];
        const teamIds = teamsList.map((t) => {
            const team = this.teams.getByName(t);
            return team ? team.id : null;
        }) as string[];

        // Check that all teams and users exist
        for (let idx = 0; idx < fileIds.length; idx++) {
            const fileId = fileIds[idx];
            if (!fileId) return toError(`File with path '${filesList[idx]}' does not exist.`);
        }
        for (let idx = 0; idx < teamIds.length; idx++) {
            const teamId = teamIds[idx];
            if (!teamId) return toError(`Team with name '${teamsList[idx]}' does not exist.`);
        }
        for (let idx = 0; idx < userIds.length; idx++) {
            const userId = userIds[idx];
            if (!userId) return toError(`User with email '${usersList[idx]}' does not exist.`);
        }

        // Create all combinations
        const filesUsers = fileIds.flatMap((f) => userIds.map((u) => [f, u]));
        const filesTeams = fileIds.flatMap((f) => teamIds.map((t) => [f, t]));

        console.log(filesUsers);
        console.log(filesTeams);

        // Add access
        filesUsers.map(([fileId, userId]) => this.access.add({ fileId: fileId, userId: userId }));
        filesTeams.map(([fileId, teamId]) => this.access.add({ fileId: fileId, teamId: teamId }));
        return toSuccess({});
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
        const message = await openpgp.createMessage({ text: fileContents });
        // @ts-ignore
        const encryptedContents = await openpgp.encrypt({
            message: message,
            encryptionKeys: publicKeys,
            signingKeys: privateKey,
        });

        // Write file
        fs.writeFileSync(
            path.resolve(this.fs.dirs.repo, `${file.path}${SECRET_EXT}`),
            encryptedContents.toString(),
            'utf-8',
        );
    }

    async decryptFile(input: DecryptFileInput) {
        const { userId, password, fileId } = input;

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
        const { armoredPrivateKey } = await this.openpgp.getUserKeys(userId);
        if (!armoredPrivateKey) {
            console.warn(`WARNING | Cannot decrypt file because user private key missing | User ID: ${userId}`);
            return;
        }

        // Decrypt file
        const privateKey = await openpgp.decryptKey({
            privateKey: await openpgp.readPrivateKey({ armoredKey: armoredPrivateKey }),
            passphrase: password,
        });
        const encryptedFileContents = fs.readFileSync(encryptedFilename).toString();
        const message = await openpgp.readMessage({ armoredMessage: encryptedFileContents });
        // @ts-ignore
        const { data: decryptedContents } = await openpgp.decrypt({
            message: message,
            decryptionKeys: privateKey,
            verificationKeys: publicKeys,
            expectSigned: true,
        });

        // Write to disk
        fs.writeFileSync(
            path.resolve(this.fs.dirs.repo, `${file.path}.decrypted`),
            decryptedContents.toString(),
            'utf-8',
        );
    }

    async getFileKeys(fileId: string): Promise<KeyPair[]> {
        const usersIds = this.access.findAllUsersIds(fileId);
        return await Promise.all(usersIds.map(async (userId) => await this.openpgp.getUserKeys(userId)));
    }

    async updateUserKeys(input: UserKeyUpdate): Promise<Response<{}>> {
        const { email, password } = input;
        const user = this.users.getByEmail(email);
        if (!user) return toError(`User with email '${email}' does not exist.`);
        // TODO:
        //  1. Decrypt all files that user has access to
        //  2. Update keys
        //  3. Encrypt all files that user has access to
        await this.openpgp.createKeyPair({ userId: user.id, email: user.email, name: user.name, password });
        return toSuccess({});
    }

    updateFileSignatures(fileId: string) {
        const file = this.files.findOne(fileId);
        if (!file) return;

        // Signatures
        const contentsSignature = this.fs.getSignature(file.path);
        const accessSignature = this.access.getSignature(file.id);

        // DB update
        this.files.update(fileId, { contentsSignature, accessSignature });
    }

    async cleanup() {
        // TODO: Check that only keys for existing users are in the keys directory
        // TODO: Remove files for which a corresponding .secret file does not exist (all users have access to the .secret version for the file
    }
}
