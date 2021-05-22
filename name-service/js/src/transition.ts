import { readFile } from 'fs/promises';
import { AccountInfo, Connection, Keypair, PublicKey } from '@solana/web3.js';
import { deserialize, serialize } from 'borsh';
import { sign } from 'tweetnacl';
import {
  createNameRegistry,
  deleteNameRegistry,
  NAME_PROGRAM_ID,
  transferNameOwnership,
  updateNameRegistryData,
} from './bindings';
import { NameRegistryState } from './state';
import {
  getFilteredProgramAccounts,
  getHashedName,
  getNameAccountKey,
  Numberu32,
  Numberu64,
  signAndSendTransactionInstructions,
} from './utils';
import {
  changeTwitterRegistryData,
  changeVerifiedPubkey,
  createVerifiedTwitterRegistry,
  deleteTwitterRegistry,
  ReverseTwitterRegistryState,
  TWITTER_ROOT_PARENT_REGISTRY_KEY,
  TWITTER_VERIFICATION_AUTHORITY,
} from './twitter';
import { fileURLToPath } from 'node:url';
// const ENDPOINT = 'https://api.devnet.solana.com/';
const ENDPOINT = 'https://solana-api.projectserum.com/';

export async function updateTwitterRegistries() {
  // Transition:]
  // TODO Set up new auth and parent in glaobl var
  //    - Set up test UI with new methods
  //    - Run script with new AUTH and PARENT OR just new reverse regs
  //    - Switch UIs

  ///////////////////////////////////////////////////

  const connection = new Connection(ENDPOINT);

  // Allocation and fee Payer
  let secretKey: Uint8Array = JSON.parse(
    (await readFile('/home/lcchy/.config/solana/id_dev5.json')).toString()
  );
  let payerAccount = Keypair.fromSecretKey(Buffer.from(secretKey));

  // New Twitter Authority
  secretKey = JSON.parse(
    (await readFile('/home/lcchy/.config/solana/id_dev5.json')).toString()
  );
  let newAuthorityAccount = Keypair.fromSecretKey(Buffer.from(secretKey));

  ///////////////////////////////////////////////////

  // Get handles from reverse registries
  const reverseFilters = [
    {
      memcmp: {
        offset: 0,
        bytes: new PublicKey(Buffer.alloc(32, 0)).toBase58(),
      },
    },
    {
      memcmp: {
        offset: 64,
        bytes: TWITTER_VERIFICATION_AUTHORITY.toBase58(),
      },
    },
  ];

  const reverseRegistries = await getFilteredProgramAccounts(
    connection,
    NAME_PROGRAM_ID,
    reverseFilters
  );
  let handles: [string, string, number][] = [];
  for (const f of reverseRegistries) {
    if (f.accountInfo.data.length >= NameRegistryState.HEADER_LEN) {
      let data = f.accountInfo.data.slice(0, NameRegistryState.HEADER_LEN);
      let state: NameRegistryState = deserialize(
        NameRegistryState.schema,
        NameRegistryState,
        data
      );
      let handle = f.accountInfo.data
        .slice(NameRegistryState.HEADER_LEN)
        .toString();
      if (handle.length > 0) {
        handles.push([
          handle.substr(0, handle.indexOf('\0')),
          state.owner.toString(),
          f.accountInfo.data.length - NameRegistryState.HEADER_LEN,
        ]);
      }
    }
  }

  let keys = handles.map((e) => e[1]);
  if (keys.length !== [...new Set(keys)].length) {
    throw new Error('There are duplicates!');
  }

  // strip @
  handles = handles.map((e) => [e[0].replace('@', ''), e[1], e[2]]);
  for (let e of handles) {
    console.log(e);
  }

  //   // Set up the new registries
  //   for (let e of handles) {
  //     let create_instruction = await createVerifiedTwitterRegistry(
  //       connection,
  //       e[0],
  //       new PublicKey([1]),
  //       e[2],
  //       payerAccount.publicKey
  //     );
  //     console.log(
  //       await signAndSendTransactionInstructions(
  //         connection,
  //         [newAuthorityAccount],
  //         payerAccount,
  //         create_instruction
  //       )
  //     );
  //   }
  console.log(
    handles.length * (await connection.getMinimumBalanceForRentExemption(32))
  );
}

updateTwitterRegistries();
