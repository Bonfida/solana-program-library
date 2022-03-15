import assert from "assert";
import createHash from "create-hash";

import {
  AccountInfo,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";

import { HASH_PREFIX, NAME_PROGRAM_ID } from "./bindings";
import { NameRegistryState } from "./state";

export const REVERSE_LOOKUP_CLASS = new PublicKey(
  "33m47vH6Eav6jr5Ry86XjhRft2jRBLDnDgPSHoquXi2Z"
);

export class Numberu32 extends BN {
  /**
   * Convert to Buffer representation
   */
  toBuffer(): Buffer {
    const a = super.toArray().reverse();
    const b = Buffer.from(a);
    if (b.length === 4) {
      return b;
    }
    assert(b.length < 4, "Numberu32 too large");

    const zeroPad = Buffer.alloc(4);
    b.copy(zeroPad);
    return zeroPad;
  }

  /**
   * Construct a Numberu64 from Buffer representation
   */
  static fromBuffer(buffer): BN {
    assert(buffer.length === 4, `Invalid buffer length: ${buffer.length}`);
    return new BN(
      [...buffer]
        .reverse()
        .map((i) => `00${i.toString(16)}`.slice(-2))
        .join(""),
      16
    );
  }
}

export class Numberu64 extends BN {
  /**
   * Convert to Buffer representation
   */
  toBuffer(): Buffer {
    const a = super.toArray().reverse();
    const b = Buffer.from(a);
    if (b.length === 8) {
      return b;
    }
    assert(b.length < 8, "Numberu64 too large");

    const zeroPad = Buffer.alloc(8);
    b.copy(zeroPad);
    return zeroPad;
  }

  /**
   * Construct a Numberu64 from Buffer representation
   */
  static fromBuffer(buffer): BN {
    assert(buffer.length === 8, `Invalid buffer length: ${buffer.length}`);
    return new BN(
      [...buffer]
        .reverse()
        .map((i) => `00${i.toString(16)}`.slice(-2))
        .join(""),
      16
    );
  }
}

export const signAndSendTransactionInstructions = async (
  // sign and send transaction
  connection: Connection,
  signers: Array<Keypair>,
  feePayer: Keypair,
  txInstructions: Array<TransactionInstruction>
): Promise<string> => {
  const tx = new Transaction();
  tx.feePayer = feePayer.publicKey;
  signers.push(feePayer);
  tx.add(...txInstructions);
  return await connection.sendTransaction(tx, signers);
};

export async function getHashedName(name: string): Promise<Buffer> {
  const input = HASH_PREFIX + name;
  const buffer = createHash("sha256").update(input, "utf8").digest();
  return buffer;
}

export async function getNameAccountKey(
  hashed_name: Buffer,
  nameClass?: PublicKey,
  nameParent?: PublicKey
): Promise<PublicKey> {
  const seeds = [hashed_name];
  if (nameClass) {
    seeds.push(nameClass.toBuffer());
  } else {
    seeds.push(Buffer.alloc(32));
  }
  if (nameParent) {
    seeds.push(nameParent.toBuffer());
  } else {
    seeds.push(Buffer.alloc(32));
  }
  const [nameAccountKey] = await PublicKey.findProgramAddress(
    seeds,
    NAME_PROGRAM_ID
  );
  return nameAccountKey;
}

export async function getNameOwner(
  connection: Connection,
  nameAccountKey: PublicKey
) {
  const nameAccount = await connection.getAccountInfo(nameAccountKey);
  if (!nameAccount) {
    throw new Error("Unable to find the given account.");
  }
  return NameRegistryState.retrieve(connection, nameAccountKey);
}

//Taken from Serum
export async function getFilteredProgramAccounts(
  connection: Connection,
  programId: PublicKey,
  filters
): Promise<{ publicKey: PublicKey; accountInfo: AccountInfo<Buffer> }[]> {
  const resp = await connection.getProgramAccounts(programId, {
    commitment: connection.commitment,
    filters,
    encoding: "base64",
  });
  return resp.map(
    ({ pubkey, account: { data, executable, owner, lamports } }) => ({
      publicKey: pubkey,
      accountInfo: {
        data: data,
        executable,
        owner: owner,
        lamports,
      },
    })
  );
}

export async function performReverseLookup(
  connection: Connection,
  nameAccount: PublicKey
): Promise<string> {
  const hashedReverseLookup = await getHashedName(nameAccount.toBase58());
  const reverseLookupAccount = await getNameAccountKey(
    hashedReverseLookup,
    REVERSE_LOOKUP_CLASS
  );

  const { registry } = await NameRegistryState.retrieve(
    connection,
    reverseLookupAccount
  );
  if (!registry.data) {
    throw "Could not retrieve name data";
  }
  const nameLength = new BN(registry.data.slice(0, 4), "le").toNumber();
  return registry.data.slice(4, 4 + nameLength).toString();
}

export async function getDNSRecordAddress(
  nameAccount: PublicKey,
  type: string
) {
  const hashedName = await getHashedName("\0".concat(type));
  const recordAccount = await getNameAccountKey(
    hashedName,
    undefined,
    nameAccount
  );
  return recordAccount;
}
