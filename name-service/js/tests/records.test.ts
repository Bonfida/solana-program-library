import { test, jest } from "@jest/globals";
import * as record from "../src/record";
import { Connection, clusterApiUrl } from "@solana/web3.js";

jest.setTimeout(20_000);

const connection = new Connection(clusterApiUrl("mainnet-beta"));
const domain = "🍍";

test("Records", async () => {
  record.getIpfsRecord(connection, domain).then((e) => {
    expect(e.data?.toString()).toBe(
      "QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR"
    );
  });

  record
    .getArweaveRecord(connection, domain)
    .then((e) => expect(e.data?.toString()).toBe("some-arweave-hash"));

  record
    .getEthRecord(connection, domain)
    .then((e) =>
      expect(e.data?.toString()).toBe(
        "0x570eDC13f9D406a2b4E6477Ddf75D5E9cCF51cd6"
      )
    );

  record
    .getBtcRecord(connection, domain)
    .then((e) =>
      expect(e.data?.toString()).toBe("3JfBcjv7TbYN9yQsyfcNeHGLcRjgoHhV3z")
    );

  record
    .getLtcRecord(connection, domain)
    .then((e) =>
      expect(e.data?.toString()).toBe("MK6deR3Mi6dUsim9M3GPDG2xfSeSAgSrpQ")
    );

  record
    .getDogeRecord(connection, domain)
    .then((e) =>
      expect(e.data?.toString()).toBe("DC79kjg58VfDZeMj9cWNqGuDfYfGJg9DjZ")
    );

  record
    .getEmailRecord(connection, domain)
    .then((e) => expect(e.data?.toString()).toBe("🍍@gmail.com"));

  record
    .getUrlRecord(connection, domain)
    .then((e) => expect(e.data?.toString()).toBe("🍍.io"));

  record
    .getDiscordRecord(connection, domain)
    .then((e) => expect(e.data?.toString()).toBe("@🍍#7493"));

  record
    .getGithubRecord(connection, domain)
    .then((e) => expect(expect(e.data?.toString()).toBe("@🍍_dev")));

  record
    .getRedditRecord(connection, domain)
    .then((e) => expect(e.data?.toString()).toBe("@reddit-🍍"));

  record
    .getTwitterRecord(connection, domain)
    .then((e) => expect(e.data?.toString()).toBe("@🍍"));

  return record
    .getTelegramRecord(connection, domain)
    .then((e) => expect(e.data?.toString()).toBe("@🍍-tg"));
});

const sub = "test.🇺🇸.sol";

test("Sub records", async () => {
  record
    .getEmailRecord(connection, sub)
    .then((e) => expect(e.data?.toString()).toBe("test@test.com"));
});
