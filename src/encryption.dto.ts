/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { PublicKey } from 'openpgp';

export interface KeyPairCreate {
    userId: string;
    email: string;
    name?: string;
    password: string;
}

export interface KeyPair {
    publicKey?: PublicKey;
    armoredPrivateKey?: string;
}

export interface CryptoOperationInput {
    path: string;
    password: string;
    publicKeys: PublicKey[];
    armoredPrivateKey: string;
}
