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
import { PublicKey } from 'openpgp';

import { GIT_IGNORE, LOCAL_SETTINGS, SECRET_EXT } from './constants';
import { InternalFileSystem } from './io';
import { Git } from './git';
import { Response, toSuccess, toWarning, toError } from './dto';
import { BaseTableConfigs } from './db/tables.base.dto';
import { Users, Teams, Files, Collections } from './db/tables';
import { TeamUsers, CollectionFiles, FileUsers, FileTeams, CollectionUsers, CollectionTeams } from './db/relations';
import { TeamUsersView, FileAccessView } from './db/views';
import { KeyPair } from './encryption.dto';
import { OpenPGP } from './encryption';
import { toArray, mkdirIfNotExists, writeFileIfNotExists, runSQLSequentially } from './utils';
import {
    UserAdd,
    TeamAdd,
    FileAdd,
    CollectionAdd,
    TeamUserAdd,
    CollectionFileAdd,
    FileAccessAdd,
    CryptoOpInput,
    CryptoOpPrivateInput,
    UserKeyUpdate,
} from './managers.dto';

const git = new Git();

class AccessManager {
    readonly fileAccess: FileAccessView;
    private readonly fileUsers: FileUsers;
    private readonly fileTeams: FileTeams;
    private readonly collectionUsers: CollectionUsers;
    private readonly collectionTeams: CollectionTeams;

    constructor(configs: BaseTableConfigs) {
        const { db } = configs;
        this.fileAccess = new FileAccessView({ db });
        this.fileUsers = new FileUsers({ db });
        this.fileTeams = new FileTeams({ db });
        this.collectionUsers = new CollectionUsers({ db });
        this.collectionTeams = new CollectionTeams({ db });
    }

    findAllUsersIds(fileId: string): string[] {
        return this.fileAccess.findAllUsersIds({ fileId: fileId });
    }

    findAllFilesIds(userId: string): string[] {
        return this.fileAccess.findAllFileIds({ userId: userId });
    }

    add({
        fileId,
        collectionId,
        userId,
        teamId,
    }: {
        fileId?: string;
        collectionId?: string;
        userId?: string;
        teamId?: string;
    }) {
        if (fileId && userId) this.fileUsers.add({ fileId: fileId, userId: userId });
        if (fileId && teamId) this.fileTeams.add({ fileId: fileId, teamId: teamId });
        if (collectionId && userId) this.collectionUsers.add({ collectionId: collectionId, userId: userId });
        if (collectionId && teamId) this.collectionTeams.add({ collectionId: collectionId, teamId: teamId });
    }

    remove({
        fileId,
        collectionId,
        userId,
        teamId,
    }: {
        fileId?: string;
        collectionId?: string;
        userId?: string;
        teamId?: string;
    }) {
        if (fileId && userId) this.fileUsers.remove({ fileId: fileId, userId: userId });
        if (fileId && teamId) this.fileTeams.remove({ fileId: fileId, teamId: teamId });
        if (collectionId && userId) this.collectionUsers.remove({ collectionId: collectionId, userId: userId });
        if (collectionId && teamId) this.collectionTeams.remove({ collectionId: collectionId, teamId: teamId });
    }

    getSignature(fileId: string) {
        const usersIds = this.findAllUsersIds(fileId);
        const usersIdsText = usersIds.join(',') || '';
        return crypto.createHash('sha256').update(usersIdsText).digest('hex');
    }
}

export class SetupManager {
    private readonly fs: InternalFileSystem;

    constructor() {
        this.fs = new InternalFileSystem();
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
    readonly collections: Collections;
    readonly teamUsers: TeamUsers;
    readonly collectionFiles: CollectionFiles;
    readonly teamUsersView: TeamUsersView;

    // Encryption
    readonly openpgp: OpenPGP;

    // Managers
    readonly access: AccessManager;

    constructor() {
        // File system
        this.fs = new InternalFileSystem();

        // Settings
        this.localSettings = fs.existsSync(this.fs.files.localSettings)
            ? JSON.parse(fs.readFileSync(this.fs.files.localSettings, 'utf-8'))
            : {};

        // Database
        const db = new Database(this.fs.files.db);
        this.db = db;
        this.db.pragma('foreign_keys = ON');

        // Tables
        this.users = new Users({ db });
        this.teams = new Teams({ db });
        this.files = new Files({ db });
        this.collections = new Collections({ db });
        this.teamUsers = new TeamUsers({ db });
        this.collectionFiles = new CollectionFiles({ db });
        this.teamUsersView = new TeamUsersView({ db });

        // Encryption
        this.openpgp = new OpenPGP();

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

    async addTeamUsers(data: TeamUserAdd): Promise<Response<{}>> {
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
        teamUserPairs.map(([teamId, userId]) => this.teamUsers.add({ teamId: teamId, userId: userId }));
        return toSuccess({});
    }

    async addFile(data: FileAdd): Promise<Response<{ id: string; path: string }>> {
        const { path } = data;
        let fileId = uuidv4();
        const relativePath = git.getRelativePath(path);
        const file = this.files.getByPath(relativePath);

        // Existing file
        if (file) return toWarning(`File with path '${relativePath}' already exists.`);

        // New file
        try {
            this.files.create({ id: fileId, path: relativePath, contentsSignature: 'SETUP', accessSignature: 'SETUP' });
            this.updateFileSignatures(fileId);
            git.ignore.addEntry(relativePath);
            return toSuccess({ id: fileId, path: relativePath });
        } catch (err) {
            console.error(err);
            return toError(err);
        }
    }

    async addCollection(data: CollectionAdd): Promise<Response<{ id: string }>> {
        const { name, description } = data;
        let collectionId = uuidv4();
        const collection = this.collections.getByName(name);

        // Existing collection
        if (collection) return toWarning(`Collection with name '${name}' already exists.`);

        // New collection
        try {
            this.collections.create({ id: collectionId, name, description });
            return toSuccess({ id: collectionId });
        } catch (err) {
            console.error(err);
            return toError(err);
        }
    }

    async addCollectionFiles(data: CollectionFileAdd): Promise<Response<{}>> {
        const { collections, files } = data;

        // Retrieve IDs
        const collectionIds = toArray(collections).map((name) => {
            const collection = this.collections.getByName(name);
            if (!collection) return null;
            return collection.id;
        }) as string[];
        const fileIds = toArray(files).map((path) => {
            const relativePath = git.getRelativePath(path);
            const file = this.files.getByPath(relativePath);
            if (!file) return null;
            return file.id;
        }) as string[];

        // Check that all collections and files exist
        for (let idx = 0; idx < collectionIds.length; idx++) {
            const collectionId = collectionIds[idx];
            if (!collectionId) return toError(`Collection with name '${collections[idx]}' does not exist.`);
        }
        for (let idx = 0; idx < fileIds.length; idx++) {
            const fileId = fileIds[idx];
            if (!fileId) return toError(`File with path '${git.getRelativePath(files[idx])}' does not exist.`);
        }

        // Generate combinations
        const collectionFilePairs = collectionIds.flatMap((c) => fileIds.map((f) => [c, f]));
        collectionFilePairs.map(([cId, fId]) => this.collectionFiles.add({ collectionId: cId, fileId: fId }));
        return toSuccess({});
    }

    async addAccess(input: FileAccessAdd): Promise<Response<{}>> {
        const { files, collections, users, teams } = input;
        const filesList = toArray(files);
        const collectionsList = toArray(collections);
        const usersList = toArray(users);
        const teamsList = toArray(teams);

        // Retrieve ids
        const fileIds = filesList.map((f) => {
            const file = this.files.getByPath(git.getRelativePath(f));
            return file ? file.id : null;
        }) as string[];
        const collectionIds = collectionsList.map((c) => {
            const collection = this.collections.getByName(c);
            return collection ? collection.id : null;
        }) as string[];
        const userIds = usersList.map((u) => {
            const user = this.users.getByEmail(u);
            return user ? user.id : null;
        }) as string[];
        const teamIds = teamsList.map((t) => {
            const team = this.teams.getByName(t);
            return team ? team.id : null;
        }) as string[];

        // Check that all ids exist
        for (let idx = 0; idx < fileIds.length; idx++) {
            const fileId = fileIds[idx];
            if (!fileId) return toError(`File with path '${filesList[idx]}' does not exist.`);
        }
        for (let idx = 0; idx < collectionIds.length; idx++) {
            const collectionId = collectionIds[idx];
            if (!collectionId) return toError(`Collection with name '${collectionsList[idx]}' does not exist.`);
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
        const collectionUsers = collectionIds.flatMap((c) => userIds.map((u) => [c, u]));
        const collectionTeams = collectionIds.flatMap((c) => teamIds.map((t) => [c, t]));

        // Add access
        filesUsers.map(([fid, uid]) => this.access.add({ fileId: fid, userId: uid }));
        filesTeams.map(([fid, tid]) => this.access.add({ fileId: fid, teamId: tid }));
        collectionUsers.map(([cid, uid]) => this.access.add({ collectionId: cid, userId: uid }));
        collectionTeams.map(([cid, tid]) => this.access.add({ collectionId: cid, teamId: tid }));
        return toSuccess({});
    }

    async encryptFile(input: CryptoOpInput): Promise<Response<{}>> {
        return await this.cryptoOperationOnFile('encrypt', input);
    }

    async decryptFile(input: CryptoOpInput): Promise<Response<{}>> {
        return await this.cryptoOperationOnFile('decrypt', input);
    }

    private async cryptoOperationOnFile(operation: string, input: CryptoOpInput): Promise<Response<{}>> {
        const { path, email, password } = input;
        const op = operation.toLowerCase();

        // File and user
        const relativePath = git.getRelativePath(path);
        const file = this.files.getByPath(relativePath);
        const user = this.users.getByEmail(email);
        if (!file) return toError(`File with path '${relativePath}' does not exist.`);
        if (!user) return toError(`User with email '${email}' does not exist.`);

        // Public keys of all users with access to the file
        const keys = await this.getFileKeys(file.id);
        const publicKeys = keys.map((keys) => keys.publicKey).filter((key) => key !== undefined) as PublicKey[];

        // Keys of user performing the en-/decryption
        const userKeys = await this.openpgp.getUserKeys(user.id);
        if (!userKeys.armoredPrivateKey) {
            return toError(`Cannot ${op} file because private key for user with email '${user.email}' is missing.`);
        }

        // Execute crypto operation
        const payload = {
            file: file,
            user: user,
            password: password,
            publicKeys: publicKeys,
            userKeys: userKeys,
        };
        switch (op) {
            case 'encrypt':
                return await this.encryptFilePrivate(payload);
            case 'decrypt':
                return await this.decryptFilePrivate(payload);
        }
        return toSuccess({});
    }

    private async getFileKeys(fileId: string): Promise<KeyPair[]> {
        const usersIds = this.access.findAllUsersIds(fileId);
        return await Promise.all(usersIds.map(async (userId) => await this.openpgp.getUserKeys(userId)));
    }

    private async encryptFilePrivate(input: CryptoOpPrivateInput): Promise<Response<{}>> {
        const { file, publicKeys, userKeys, password } = input;

        // File info
        const filename = path.resolve(this.fs.dirs.repo, file.path);
        if (!fs.existsSync(filename)) {
            return toError(`Cannot encrypt file with path '${file.path}' because it  doesn't exist.`);
        }

        // Encrypt file
        const fileContents = fs.readFileSync(filename).toString();
        const privateKey = await openpgp.decryptKey({
            privateKey: await openpgp.readPrivateKey({ armoredKey: userKeys.armoredPrivateKey as string }),
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
        return toSuccess({});
    }

    private async decryptFilePrivate(input: CryptoOpPrivateInput): Promise<Response<{}>> {
        const { file, publicKeys, userKeys, password } = input;

        // File check
        const encryptedFilename = path.resolve(this.fs.dirs.repo, `${file.path}${SECRET_EXT}`);
        if (!fs.existsSync(encryptedFilename)) {
            return toError(`Cannot decrypt file with path '${file.path}' because it  doesn't exist.`);
        }

        // Decrypt file
        const privateKey = await openpgp.decryptKey({
            privateKey: await openpgp.readPrivateKey({ armoredKey: userKeys.armoredPrivateKey as string }),
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
        return toSuccess({});
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
