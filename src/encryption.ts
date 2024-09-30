/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as fs from 'fs';
import * as path from 'path';
import * as openpgp from 'openpgp';
import { PublicKey } from 'openpgp';

import { SECRET_EXT } from './constants';
import { MaybeNull, Response, toError, toSuccess } from './dto';
import { KeyPairCreate, CryptoOperationInput } from './encryption.dto';
import { InternalFileSystem } from './io';

export class OpenPGP {
    private readonly fs: InternalFileSystem;
    private readonly publicKeysCache: Record<string, MaybeNull<PublicKey>>;
    private readonly armoredPrivateKeysCache: Record<string, MaybeNull<string>>;

    constructor() {
        this.fs = new InternalFileSystem();
        this.publicKeysCache = {};
        this.armoredPrivateKeysCache = {};
    }

    async createKeyPair(input: KeyPairCreate) {
        const { userId, email, name, password } = input;

        // Create keys
        const { publicKey: armoredPublicKey, privateKey: armoredPrivateKey } = await openpgp.generateKey({
            type: 'ecc',
            curve: 'curve25519',
            userIDs: [{ email: email, name: name }],
            passphrase: password,
            format: 'armored',
        });

        // Write keys to disk
        fs.writeFileSync(this.fs.files.publicKey(userId), armoredPublicKey, 'utf-8');
        fs.writeFileSync(this.fs.files.privateKey(userId), armoredPrivateKey, 'utf-8');

        // Un-armor public key & update cache
        this.publicKeysCache[userId] = await openpgp.readKey({ armoredKey: armoredPublicKey });
        this.armoredPrivateKeysCache[userId] = armoredPrivateKey;
    }

    async getUserPublicKey(userId: string): Promise<MaybeNull<PublicKey>> {
        // Cache hit
        if (userId in this.publicKeysCache) return this.publicKeysCache[userId];

        // Read key
        const publicKeyFilename = this.fs.files.publicKey(userId);
        let publicKey = null;
        if (fs.existsSync(publicKeyFilename)) {
            const armoredPublicKey = fs.readFileSync(publicKeyFilename, 'utf-8');
            publicKey = await openpgp.readKey({ armoredKey: armoredPublicKey });
        } else {
            console.warn(`Public key missing for user ID: ${userId}`);
        }

        // Cache update
        this.publicKeysCache[userId] = publicKey;
        return publicKey;
    }

    async getUserArmoredPrivateKey(userId: string): Promise<MaybeNull<string>> {
        // Cache hit
        if (userId in this.armoredPrivateKeysCache) return this.armoredPrivateKeysCache[userId];

        // Read key
        const privateKeyFilename = this.fs.files.privateKey(userId);
        let armoredPrivateKey = null;
        if (fs.existsSync(privateKeyFilename)) {
            armoredPrivateKey = fs.readFileSync(privateKeyFilename, 'utf-8');
        } else {
            console.warn(`Private key missing for user ID: ${userId}`);
        }

        // Cache update
        this.armoredPrivateKeysCache[userId] = armoredPrivateKey;
        return armoredPrivateKey;
    }

    async removeUserKeys(userId: string) {
        const publicKeyFile = this.fs.files.publicKey(userId);
        const privateKeyFile = this.fs.files.privateKey(userId);

        if (fs.existsSync(publicKeyFile)) await fs.promises.unlink(publicKeyFile);
        if (fs.existsSync(privateKeyFile)) await fs.promises.unlink(privateKeyFile);
    }

    async encryptFile(input: CryptoOperationInput): Promise<Response<{}>> {
        const { path: filepath, publicKeys, armoredPrivateKey, password } = input;

        // File info
        const filename = path.resolve(this.fs.dirs.repo, filepath);
        if (!fs.existsSync(filename)) {
            return toError(`Cannot encrypt file with path '${filepath}' because it  doesn't exist.`);
        }

        // Encrypt file
        const fileContents = fs.readFileSync(filename).toString();
        const privateKey = await openpgp.decryptKey({
            privateKey: await openpgp.readPrivateKey({ armoredKey: armoredPrivateKey }),
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
            path.resolve(this.fs.dirs.repo, `${filepath}${SECRET_EXT}`),
            encryptedContents.toString(),
            'utf-8',
        );
        return toSuccess({});
    }

    async decryptFile(input: CryptoOperationInput): Promise<Response<{}>> {
        const { path: filepath, publicKeys, armoredPrivateKey, password } = input;

        // File check
        const encryptedFilename = path.resolve(this.fs.dirs.repo, `${filepath}${SECRET_EXT}`);
        if (!fs.existsSync(encryptedFilename)) {
            return toError(`Cannot decrypt file with path '${filepath}${SECRET_EXT}' because it doesn't exist.`);
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
            path.resolve(this.fs.dirs.repo, `${filepath}.decrypted`),
            decryptedContents.toString(),
            'utf-8',
        );
        return toSuccess({});
    }
}
