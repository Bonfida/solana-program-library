import {
  PublicKey,
  TransactionInstruction,
  Connection,
  SystemProgram,
} from "@solana/web3.js";
import {
  getFilteredProgramAccounts,
  getHashedName,
  getNameAccountKey,
  NAME_SERVICE_PROGRAM_ID,
  Numberu32,
  Numberu64,
} from ".";
import {
  createInstruction,
  deleteInstruction,
  transferInstruction,
  updateInstruction,
} from "./instructions";
import { NameRegistryState } from "./state";

export const TWITTER_VERIFICATION_AUTHORITY = new PublicKey(
  "867BLob5b52i81SNaV9Awm5ejkZV6VGSv9SxLcwukDDJ"
);

// The address of the name registry that will be a parent to all twitter handle registries,
// it should be owned by the TWITTER_VERIFICATION_AUTHORITY and it's name is irrelevant
export const TWITTER_ROOT_PARENT_REGISTRY_KEY = new PublicKey(
  "AFrGkxNmVLBn3mKhvfJJABvm8RJkTtRhHDoaF97pQZaA"
);
// Signed by the authority and the payer
export async function createVerifiedTwitterRegistry(
  connection: Connection,
  twitterHandle: string,
  verifiedPubkey: PublicKey,
  space: number, // The space that the user will have to write data into the verified registry
  payerKey: PublicKey
): Promise<TransactionInstruction[]> {
  let hashedTwitterHandle = await getHashedName(twitterHandle);
  let twitterHandleRegistryKey = await getNameAccountKey(
    hashedTwitterHandle,
    undefined,
    TWITTER_ROOT_PARENT_REGISTRY_KEY
  );

  let hashedVerifiedPubkey = await getHashedName(
    verifiedPubkey.toString().concat(twitterHandle)
  );
  let reverseRegistryKey = await getNameAccountKey(
    hashedVerifiedPubkey,
    TWITTER_VERIFICATION_AUTHORITY,
    undefined
  );

  space += 96; // Accounting for the Registry State Header

  let instructions = [
    // Create user facing registry
    createInstruction(
      NAME_SERVICE_PROGRAM_ID,
      SystemProgram.programId,
      twitterHandleRegistryKey,
      verifiedPubkey,
      payerKey,
      hashedTwitterHandle,
      // @ts-ignore
      new Numberu64(await connection.getMinimumBalanceForRentExemption(space)),
      // @ts-ignore
      new Numberu32(space),
      undefined,
      TWITTER_ROOT_PARENT_REGISTRY_KEY,
      TWITTER_VERIFICATION_AUTHORITY // Twitter authority acts as owner of the parent for all user-facing registries
    ),
    // Create reverse lookup registry
    createInstruction(
      NAME_SERVICE_PROGRAM_ID,
      SystemProgram.programId,
      reverseRegistryKey,
      verifiedPubkey,
      payerKey,
      hashedVerifiedPubkey,
      new Numberu64(
        // @ts-ignore
        await connection.getMinimumBalanceForRentExemption(96 + 18)
      ),
      // @ts-ignore
      new Numberu32(96 + 18), // maximum length of a twitter handle
      TWITTER_VERIFICATION_AUTHORITY, // Twitter authority acts as class for all reverse-lookup registries
      undefined,
      undefined
    ),
    // Write the twitter handle into the reverse lookup registry
    updateInstruction(
      NAME_SERVICE_PROGRAM_ID,
      reverseRegistryKey,
      // @ts-ignore
      new Numberu32(0),
      Buffer.from(twitterHandle),
      TWITTER_VERIFICATION_AUTHORITY
    ),
  ];

  return instructions;
}

// Overwrite the data that is written in the user facing registry
// Signed by the verified pubkey
export async function changeTwitterRegistryData(
  twitterHandle: string,
  verifiedPubkey: PublicKey,
  offset: number, // The offset at which to write the input data into the NameRegistryData
  input_data: Buffer
): Promise<TransactionInstruction[]> {
  let hashedTwitterHandle = await getHashedName(twitterHandle);
  let twitterHandleRegistryKey = await getNameAccountKey(
    hashedTwitterHandle,
    undefined,
    TWITTER_ROOT_PARENT_REGISTRY_KEY
  );

  let instructions = [
    updateInstruction(
      NAME_SERVICE_PROGRAM_ID,
      twitterHandleRegistryKey,
      // @ts-ignore
      new Numberu32(offset),
      input_data,
      verifiedPubkey
    ),
  ];

  return instructions;
}

// Change the verified pubkey for a given twitter handle
// Signed by the Authority, the verified pubkey and the payer
export async function changeVerifiedPubkey(
  connection: Connection,
  twitterHandle: string,
  currentVerifiedPubkey: PublicKey,
  newVerifiedPubkey: PublicKey,
  payerKey: PublicKey
): Promise<TransactionInstruction[]> {
  let hashedTwitterHandle = await getHashedName(twitterHandle);
  let twitterHandleRegistryKey = await getNameAccountKey(
    hashedTwitterHandle,
    undefined,
    TWITTER_ROOT_PARENT_REGISTRY_KEY
  );

  let currentHashedVerifiedPubkey = await getHashedName(
    currentVerifiedPubkey.toString().concat(twitterHandle)
  );
  let currentReverseRegistryKey = await getNameAccountKey(
    currentHashedVerifiedPubkey,
    TWITTER_VERIFICATION_AUTHORITY,
    undefined
  );

  let newHashedVerifiedPubkey = await getHashedName(
    newVerifiedPubkey.toString().concat(twitterHandle)
  );
  let newReverseRegistryKey = await getNameAccountKey(
    newHashedVerifiedPubkey,
    TWITTER_VERIFICATION_AUTHORITY,
    undefined
  );

  let instructions = [
    // Transfer the user-facing registry ownership
    transferInstruction(
      NAME_SERVICE_PROGRAM_ID,
      twitterHandleRegistryKey,
      newVerifiedPubkey,
      currentVerifiedPubkey,
      undefined
    ),
    // Delete the current reverse registry
    deleteInstruction(
      NAME_SERVICE_PROGRAM_ID,
      currentReverseRegistryKey,
      payerKey,
      currentVerifiedPubkey
    ),
    // Create the new reverse lookup registry
    createInstruction(
      NAME_SERVICE_PROGRAM_ID,
      SystemProgram.programId,
      newReverseRegistryKey,
      TWITTER_VERIFICATION_AUTHORITY,
      payerKey,
      newHashedVerifiedPubkey,
      // @ts-ignore
      new Numberu64(await connection.getMinimumBalanceForRentExemption(18)),
      // @ts-ignore
      new Numberu32(18), // maximum length of a twitter handle
      TWITTER_VERIFICATION_AUTHORITY, // Twitter authority acts as class for all reverse-lookup registries
      undefined,
      undefined
    ),
    // Write the twitter handle into the new reverse lookup registry
    updateInstruction(
      NAME_SERVICE_PROGRAM_ID,
      newReverseRegistryKey,
      // @ts-ignore
      new Numberu32(0),
      Buffer.from(twitterHandle),
      TWITTER_VERIFICATION_AUTHORITY
    ),
  ];

  return instructions;
}

// Delete the verified registry for a given twitter handle
// Signed by the verified pubkey
export async function deleteTwitterRegistry(
  twitterHandle: string,
  verifiedPubkey: PublicKey
): Promise<TransactionInstruction[]> {
  let hashedTwitterHandle = await getHashedName(twitterHandle);
  let twitterHandleRegistryKey = await getNameAccountKey(
    hashedTwitterHandle,
    undefined,
    TWITTER_ROOT_PARENT_REGISTRY_KEY
  );

  let hashedVerifiedPubkey = await getHashedName(
    verifiedPubkey.toString().concat(twitterHandle)
  );
  let reverseRegistryKey = await getNameAccountKey(
    hashedVerifiedPubkey,
    TWITTER_VERIFICATION_AUTHORITY,
    undefined
  );

  let instructions = [
    // Delete the user facing registry
    deleteInstruction(
      NAME_SERVICE_PROGRAM_ID,
      twitterHandleRegistryKey,
      verifiedPubkey,
      verifiedPubkey
    ),
    // Delete the reverse registry
    deleteInstruction(
      NAME_SERVICE_PROGRAM_ID,
      reverseRegistryKey,
      verifiedPubkey,
      verifiedPubkey
    ),
  ];

  return instructions;
}

export async function getTwitterHandle(
  connection: Connection,
  verifiedPubkey: PublicKey
): Promise<string> {
  const filters = [
    {
      memcmp: {
        offset: 32,
        bytes: verifiedPubkey.toBase58(),
      },
    },
    {
      memcmp: {
        offset: 64,
        bytes: TWITTER_VERIFICATION_AUTHORITY.toBase58(),
      },
    },
  ];

  let filteredAccounts = await getFilteredProgramAccounts(
    connection,
    NAME_SERVICE_PROGRAM_ID,
    filters
  );

  for (let f of filteredAccounts) {
    if (f.accountInfo.data.length == 114) {
      return f.accountInfo.data.slice(96, 114).toString();
    }
  }
  throw "Could not find the twitter handle";
}

// Returns the key of the user-facing registry
export async function getTwitterRegistryKey(
  twitter_handle: string
): Promise<PublicKey> {
  let hashedTwitterHandle = await getHashedName(twitter_handle);
  return await getNameAccountKey(
    hashedTwitterHandle,
    undefined,
    TWITTER_ROOT_PARENT_REGISTRY_KEY
  );
}

export async function getTwitterRegistry(
  connection: Connection,
  twitter_handle: string
): Promise<NameRegistryState> {
  let hashedTwitterHandle = await getHashedName(twitter_handle);
  let twitterHandleRegistryKey = await getNameAccountKey(
    hashedTwitterHandle,
    undefined,
    TWITTER_ROOT_PARENT_REGISTRY_KEY
  );
  let registry = NameRegistryState.retrieve(
    connection,
    twitterHandleRegistryKey
  );
  return registry;
}

export async function getTwitterRegistryData(
  connection: Connection,
  verifiedPubkey: PublicKey
): Promise<Buffer> {
  // Does not give you the name, but is faster than getTwitterHandle + getTwitterRegistry to get the data
  const filters = [
    {
      memcmp: {
        offset: 0,
        bytes: TWITTER_ROOT_PARENT_REGISTRY_KEY.toBytes(),
      },
    },
    {
      memcmp: {
        offset: 32,
        bytes: verifiedPubkey.toBytes(),
      },
    },
  ];

  let filteredAccounts = await getFilteredProgramAccounts(
    connection,
    NAME_SERVICE_PROGRAM_ID,
    filters
  );

  if (filteredAccounts.length > 1) {
    throw "Found more than one twitter handle";
  }

  return filteredAccounts[0].accountInfo.data;
}
