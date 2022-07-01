import { Record } from "./types/record";
import { Connection } from "@solana/web3.js";
import { getDomainKey } from "./utils";
import { NameRegistryState } from "./state";

/**
 * This function can be used to retrieve a specified record for the given domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @param record The record to search for
 * @returns
 */
export const getRecord = async (
  connection: Connection,
  domain: string,
  record: Record
) => {
  const { pubkey } = await getDomainKey(record + "." + domain);
  let { registry } = await NameRegistryState.retrieve(connection, pubkey);

  // Remove trailling 0s
  const idx = registry.data?.indexOf(0x00);
  registry.data = registry.data?.slice(0, idx);

  return registry;
};

/**
 * This function can be used to retrieve the IPFS record of a domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @returns
 */
export const getIpfsRecord = async (connection: Connection, domain: string) => {
  return await getRecord(connection, domain, Record.IPFS);
};

/**
 * This function can be used to retrieve the Arweave record of a domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @returns
 */
export const getArweaveRecord = async (
  connection: Connection,
  domain: string
) => {
  return await getRecord(connection, domain, Record.ARWV);
};

/**
 * This function can be used to retrieve the ETH record of a domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @returns
 */
export const getEthRecord = async (connection: Connection, domain: string) => {
  return await getRecord(connection, domain, Record.ETH);
};

/**
 * This function can be used to retrieve the BTC record of a domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @returns
 */
export const getBtcRecord = async (connection: Connection, domain: string) => {
  return await getRecord(connection, domain, Record.BTC);
};

/**
 * This function can be used to retrieve the LTC record of a domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @returns
 */
export const getLtcRecord = async (connection: Connection, domain: string) => {
  return await getRecord(connection, domain, Record.LTC);
};

/**
 * This function can be used to retrieve the DOGE record of a domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @returns
 */
export const getDogeRecord = async (connection: Connection, domain: string) => {
  return await getRecord(connection, domain, Record.DOGE);
};

/**
 * This function can be used to retrieve the email record of a domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @returns
 */
export const getEmailRecord = async (
  connection: Connection,
  domain: string
) => {
  return await getRecord(connection, domain, Record.Email);
};

/**
 * This function can be used to retrieve the URL record of a domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @returns
 */
export const getUrlRecord = async (connection: Connection, domain: string) => {
  return await getRecord(connection, domain, Record.Url);
};

/**
 * This function can be used to retrieve the Discord record of a domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @returns
 */
export const getDiscordRecord = async (
  connection: Connection,
  domain: string
) => {
  return await getRecord(connection, domain, Record.Discord);
};

/**
 * This function can be used to retrieve the Github record of a domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @returns
 */
export const getGithubRecord = async (
  connection: Connection,
  domain: string
) => {
  return await getRecord(connection, domain, Record.Github);
};

/**
 * This function can be used to retrieve the Reddit record of a domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @returns
 */
export const getRedditRecord = async (
  connection: Connection,
  domain: string
) => {
  return await getRecord(connection, domain, Record.Reddit);
};

/**
 * This function can be used to retrieve the Twitter record of a domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @returns
 */
export const getTwitterRecord = async (
  connection: Connection,
  domain: string
) => {
  return await getRecord(connection, domain, Record.Twitter);
};

/**
 * This function can be used to retrieve the Telegram record of a domain name
 * @param connection The Solana RPC connection object
 * @param domain The .sol domain name
 * @returns
 */
export const getTelegramRecord = async (
  connection: Connection,
  domain: string
) => {
  return await getRecord(connection, domain, Record.Telegram);
};
