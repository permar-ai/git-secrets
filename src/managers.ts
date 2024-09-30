/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as fs from 'fs';

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import Database from 'better-sqlite3';
import { PublicKey } from 'openpgp';

import { InternalFileSystem } from './io';
import { Git } from './git';
import { Response, MaybeNull, toSuccess, toWarning, toError } from './dto';
import { BaseTableConfigs } from './db/tables.base.dto';
import { Users, Teams, Files, Collections } from './db/tables';
import { TeamUsers, CollectionFiles, FileUsers, FileTeams, CollectionUsers, CollectionTeams } from './db/relations';
import { TeamUsersView, CollectionFilesView, FileAccessView } from './db/views';
import { KeyPair } from './encryption.dto';
import { OpenPGP } from './encryption';
import { toArray } from './utils';
import {
    UserAdd,
    TeamAdd,
    FileAdd,
    CollectionAdd,
    TeamUserAdd,
    CollectionFileAdd,
    FileAccessAdd,
    CryptoSingleInput,
    CryptoAllInput,
    UserKeyUpdate,
    FileSignaturesDto,
} from './managers.dto';
import { printResponse } from './commands/utils';

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

    findAllUsersIds(path: string): string[] {
        return this.fileAccess.findAllUsersIds({ path: path });
    }

    findAllFilesIds(email: string): string[] {
        return this.fileAccess.findAllFileIds({ email: email });
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

    getSignature({ path }: { path: string }) {
        const usersIds = this.findAllUsersIds(path);
        const usersIdsText = usersIds.join(',') || '';
        return crypto.createHash('sha256').update(usersIdsText).digest('hex');
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
    readonly collectionFilesView: CollectionFilesView;

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
        this.collectionFilesView = new CollectionFilesView({ db });

        // Encryption
        this.openpgp = new OpenPGP();

        // Managers
        this.access = new AccessManager({ db: this.db });
    }

    getLocalSettings() {
        if (!fs.existsSync(this.fs.files.localSettings)) return null;
        return JSON.parse(fs.readFileSync(this.fs.files.localSettings, 'utf-8'));
    }

    updateLocalSettings({ email, password }: { email: string; password?: string }) {
        const user = this.users.getByEmail(email);
        if (!user) return;
        const localSettings = this.getLocalSettings() || {};
        const localSettingsUpdated = { ...localSettings, user: { ...user, password: password } };
        fs.writeFileSync(this.fs.files.localSettings, JSON.stringify(localSettingsUpdated, null, 4), 'utf-8');
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
        return this.modifyTeamUsers('add', data);
    }

    async removeTeamUsers(data: TeamUserAdd): Promise<Response<{}>> {
        return this.modifyTeamUsers('remove', data);
    }

    private modifyTeamUsers(operation: string, data: TeamUserAdd): Response<{}> {
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

        // Add / remove combinations
        const teamUserPairs = teamIds.flatMap((t) => userIds.map((u) => [t, u]));
        if (operation === 'add') {
            teamUserPairs.map(([teamId, userId]) => this.teamUsers.add({ teamId: teamId, userId: userId }));
        } else if (operation === 'remove') {
            teamUserPairs.map(([teamId, userId]) => this.teamUsers.remove({ teamId: teamId, userId: userId }));
        }
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
        return this.modifyCollectionFiles('add', data);
    }

    async removeCollectionFiles(data: CollectionFileAdd): Promise<Response<{}>> {
        return this.modifyCollectionFiles('remove', data);
    }

    private modifyCollectionFiles(operation: string, data: CollectionFileAdd): Response<{}> {
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

        // Add / remove combinations
        const collectionFilePairs = collectionIds.flatMap((c) => fileIds.map((f) => [c, f]));
        if (operation === 'add') {
            collectionFilePairs.map(([cId, fId]) => this.collectionFiles.add({ collectionId: cId, fileId: fId }));
        } else if (operation === 'remove') {
            collectionFilePairs.map(([cId, fId]) => this.collectionFiles.remove({ collectionId: cId, fileId: fId }));
        }
        return toSuccess({});
    }

    async addAccess(input: FileAccessAdd): Promise<Response<{}>> {
        return this.modifyAccess('add', input);
    }

    async removeAccess(input: FileAccessAdd): Promise<Response<{}>> {
        return this.modifyAccess('remove', input);
    }

    private modifyAccess(operation: string, input: FileAccessAdd): Response<{}> {
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

        // Modify access
        if (operation === 'add') {
            filesUsers.map(([fid, uid]) => this.access.add({ fileId: fid, userId: uid }));
            filesTeams.map(([fid, tid]) => this.access.add({ fileId: fid, teamId: tid }));
            collectionUsers.map(([cid, uid]) => this.access.add({ collectionId: cid, userId: uid }));
            collectionTeams.map(([cid, tid]) => this.access.add({ collectionId: cid, teamId: tid }));
        } else if (operation === 'remove') {
            filesUsers.map(([fid, uid]) => this.access.remove({ fileId: fid, userId: uid }));
            filesTeams.map(([fid, tid]) => this.access.remove({ fileId: fid, teamId: tid }));
            collectionUsers.map(([cid, uid]) => this.access.remove({ collectionId: cid, userId: uid }));
            collectionTeams.map(([cid, tid]) => this.access.remove({ collectionId: cid, teamId: tid }));
        }

        return toSuccess({});
    }

    async encryptFile(input: CryptoSingleInput): Promise<Response<{}>> {
        const response = await this.cryptoOperationOnFile('encrypt', input);

        // Update signature in database
        if (response.success) {
            const file = this.files.getByPath(input.path);
            if (file) this.updateFileSignatures(file.id);
        }
        return response;
    }

    async decryptFile(input: CryptoSingleInput): Promise<Response<{}>> {
        return await this.cryptoOperationOnFile('decrypt', input);
    }

    private async cryptoOperationOnFile(operation: string, input: CryptoSingleInput): Promise<Response<{}>> {
        const { path, email, password, modified = false } = input;
        const op = operation.toLowerCase();

        // File and user
        const relativePath = git.getRelativePath(path);
        const file = this.files.getByPath(relativePath);
        const user = this.users.getByEmail(email);
        if (!file) return toError(`File with path '${relativePath}' does not exist.`);
        if (!user) return toError(`User with email '${email}' does not exist.`);

        // Modified flag
        if (modified) {
            const signatures = this.getFileSignatures(file.id);
            if (
                !signatures ||
                file.contents_signature !== signatures.contents ||
                file.access_signature !== signatures.access
            ) {
                return toWarning(
                    `File with path '${relativePath}' has not been modified and flag 'modified' is active.`,
                );
            }
        }

        // Public keys of all users with access to the file
        const publicKeys = await this.getFilePublicKeys(relativePath);
        const validPublicKeys = publicKeys.filter((key) => key !== null) as PublicKey[];

        // Private key of user performing the en-/decryption
        const armoredPrivateKey = await this.openpgp.getUserArmoredPrivateKey(user.id);
        if (!armoredPrivateKey) {
            return toError(`Cannot ${op} file because private key for user with email '${user.email}' is missing.`);
        }

        // Execute crypto operation
        const payload = {
            path: file.path,
            password: password,
            publicKeys: validPublicKeys,
            armoredPrivateKey: armoredPrivateKey,
        };
        switch (op) {
            case 'encrypt':
                return await this.openpgp.encryptFile(payload);
            case 'decrypt':
                return await this.openpgp.decryptFile(payload);
        }
        return toSuccess({});
    }

    async encryptAll(input: CryptoAllInput) {
        const { modified, email, password } = input;
        let fileIds = this.access.findAllFilesIds(email);

        // Retrieve file objects
        let files = fileIds.map((fid) => this.files.findOne(fid)).filter((x) => x !== null);

        // Filter list to only include files that have been modified
        if (modified) {
            files = files.filter((f) => {
                const signatures = this.getFileSignatures(f.id);
                if (!signatures) return false;
                return signatures.contents !== f.contents_signature || signatures.access !== f.access_signature;
            });
        }

        // Encrypt one by one
        await Promise.all(
            files.map(async (f) => {
                const response = await this.encryptFile({ path: f.path, email: email, password: password });
                printResponse({ response, success: `Encrypted file: '${f.path}'` });
            }),
        );
    }

    async decryptAll(input: CryptoAllInput) {
        const { email, password } = input;
        const fileIds = this.access.findAllFilesIds(email);
        let files = fileIds.map((fid) => this.files.findOne(fid)).filter((x) => x !== null);

        // Decrypt one by one
        await Promise.all(
            files.map(async (f) => {
                const response = await this.decryptFile({ path: f.path, email: email, password: password });
                printResponse({ response, success: `Decrypted file: '${f.path}'` });
            }),
        );
    }

    private async getFilePublicKeys(path: string): Promise<MaybeNull<PublicKey>[]> {
        const usersIds = this.access.findAllUsersIds(path);
        return await Promise.all(usersIds.map(async (userId) => await this.openpgp.getUserPublicKey(userId)));
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

    private getFileSignatures(fileId: string): MaybeNull<FileSignaturesDto> {
        const file = this.files.findOne(fileId);
        if (!file) return null;
        const contentsSignature = this.fs.getSignature(file.path);
        const accessSignature = this.access.getSignature(file.id);
        return { contents: contentsSignature, access: accessSignature };
    }

    private updateFileSignatures(fileId: string) {
        const file = this.files.findOne(fileId);
        if (!file) return;
        const signatures = this.getFileSignatures(file.id);
        if (!signatures) return null;

        this.files.update(fileId, { contentsSignature: signatures.contents, accessSignature: signatures.access });
    }

    async cleanup() {
        // TODO: Check that only keys for existing users are in the keys directory
        // TODO: Remove files for which a corresponding .secret file does not exist (all users have access to the .secret version for the file
    }
}
