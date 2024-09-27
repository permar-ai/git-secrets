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

import { KeyPair, KeyPairCreate } from './encryption.dto';

export class OpenPGP {
    private readonly keysDir: string;
    private readonly keysCache: Record<string, KeyPair>;

    constructor({ keysDir }: { keysDir: string }) {
        this.keysDir = keysDir;
        this.keysCache = {};
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
        fs.writeFileSync(path.resolve(this.keysDir, `${userId}.public`), armoredPublicKey, 'utf-8');
        fs.writeFileSync(path.resolve(this.keysDir, `${userId}.private`), armoredPrivateKey, 'utf-8');

        // Un-armor public key & update cache
        const publicKey = await openpgp.readKey({ armoredKey: armoredPublicKey });
        this.keysCache[userId] = { publicKey: publicKey, armoredPrivateKey: armoredPrivateKey };
    }

    async getUserKeys(userId: string): Promise<KeyPair> {
        // Cache hit
        if (userId in this.keysCache) return this.keysCache[userId];

        // Read keys
        const publicKeyFilename = path.resolve(this.keysDir, `${userId}.public`);
        const privateKeyFilename = path.resolve(this.keysDir, `${userId}.private`);
        let publicKey;
        if (fs.existsSync(publicKeyFilename)) {
            const armoredPublicKey = fs.readFileSync(publicKeyFilename, 'utf-8');
            publicKey = await openpgp.readKey({ armoredKey: armoredPublicKey });
        } else {
            console.warn(`Public key missing for user ID: ${userId}`);
        }
        let armoredPrivateKey;
        if (fs.existsSync(privateKeyFilename)) {
            armoredPrivateKey = fs.readFileSync(privateKeyFilename, 'utf-8');
        } else {
            console.warn(`Private key missing for user ID: ${userId}`);
        }

        // Cache update
        const keys: KeyPair = {
            publicKey: publicKey,
            armoredPrivateKey: armoredPrivateKey,
        };
        this.keysCache[userId] = keys;

        return keys;
    }
}
