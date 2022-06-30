import { Connection, PublicKey, MemcmpFilter } from "@solana/web3.js";
import BN from "bn.js";
import { sha256 } from "@ethersproject/sha2";
import { HASH_PREFIX, NAME_PROGRAM_ID, ROOT_DOMAIN_ACCOUNT } from "./constants";
import { NameRegistryState } from "./state";
import { REVERSE_LOOKUP_CLASS } from "./constants";

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

export async function getHashedName(name: string): Promise<Buffer> {
  const input = HASH_PREFIX + name;
  const str = sha256(Buffer.from(input, "utf8")).slice(2);
  return Buffer.from(str, "hex");
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

export async function performReverseLookupBatch(
  connection: Connection,
  nameAccounts: PublicKey[]
): Promise<(string | undefined)[]> {
  const [centralState] = await PublicKey.findProgramAddress(
    [NAME_PROGRAM_ID.toBuffer()],
    NAME_PROGRAM_ID
  );
  let reverseLookupAccounts: PublicKey[] = [];
  for (let nameAccount of nameAccounts) {
    const hashedReverseLookup = await getHashedName(nameAccount.toBase58());
    const reverseLookupAccount = await getNameAccountKey(
      hashedReverseLookup,
      centralState
    );
    reverseLookupAccounts.push(reverseLookupAccount);
  }

  let names = await NameRegistryState.retrieveBatch(
    connection,
    reverseLookupAccounts
  );

  return names.map((name) => {
    if (name === undefined || name.data === undefined) {
      return undefined;
    }
    let nameLength = new BN(name.data.slice(0, 4), "le").toNumber();
    return name.data.slice(4, 4 + nameLength).toString();
  });
}

/**
 *
 * @param connection The Solana RPC connection object
 * @param parentKey The parent you want to find sub-domains for
 * @returns
 */
export const findSubdomains = async (
  connection: Connection,
  parentKey: PublicKey
): Promise<string[]> => {
  const filters: MemcmpFilter[] = [
    {
      memcmp: {
        offset: 0,
        bytes: parentKey.toBase58(),
      },
    },
    {
      memcmp: {
        offset: 64,
        bytes: REVERSE_LOOKUP_CLASS.toBase58(),
      },
    },
  ];

  const result = await connection.getProgramAccounts(NAME_PROGRAM_ID, {
    filters,
  });

  return result.map((e) =>
    e.account.data.slice(97).toString("utf-8")?.split("\0").join("")
  );
};

const _derive = async (
  name: string,
  parent: PublicKey = ROOT_DOMAIN_ACCOUNT
) => {
  let hashed = await getHashedName(name);
  let pubkey = await getNameAccountKey(hashed, undefined, parent);
  return { pubkey, hashed };
};

/**
 * This function can be used to compute the public key of a domain or subdomain
 * @param domain The domain to compute the public key for (e.g `bonfida.sol`, `dex.bonfida.sol`)
 * @returns
 */
export const getDomainKey = async (domain: string) => {
  if (domain.endsWith(".sol")) {
    domain = domain.slice(0, -4);
  }
  const splitted = domain.split(".");
  if (splitted.length === 2) {
    const sub = "\0".concat(splitted[0]);
    const { pubkey: parentKey } = await _derive(splitted[1]);
    const result = await _derive(sub, parentKey);
    return { ...result, isSub: true, parent: parentKey };
  } else if (splitted.length > 2) {
    throw new Error("Invalid derivation input");
  }
  const result = await _derive(domain, ROOT_DOMAIN_ACCOUNT);
  return { ...result, isSub: false, parent: undefined };
};

/**
 * This function can be used to retrieve all domain names owned by `wallet`
 * @param connection The Solana RPC connection object
 * @param wallet The wallet you want to search domain names for
 * @returns
 */
export async function getAllDomains(
  connection: Connection,
  wallet: PublicKey
): Promise<PublicKey[]> {
  const filters = [
    {
      memcmp: {
        offset: 32,
        bytes: wallet.toBase58(),
      },
    },
    {
      memcmp: {
        offset: 0,
        bytes: ROOT_DOMAIN_ACCOUNT.toBase58(),
      },
    },
  ];
  const accounts = await connection.getProgramAccounts(NAME_PROGRAM_ID, {
    filters,
  });
  return accounts.map((a) => a.pubkey);
}
