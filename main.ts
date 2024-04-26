import * as dotenv from 'dotenv';
dotenv.config({ path: '..' });
import * as transports from './lib/transports';
import { Cache } from './lib/cache';
import { Chain } from './lib/chain';
import cosmosclient  from '@cosmos-client/core';
import ICoin = cosmosclient.proto.cosmos.base.v1beta1.ICoin;

const transport = (process.env.TRANSPORT || '')
  ?.split(',')
  .map((v) => v.trim());
if (!transport?.length) {
  throw new Error('TRANSPORT is not set');
}
console.log(transport);

function parseCoin(input: string): ICoin {
  const regex = /^(\d+)([a-zA-Z\/\d]+)$/; // Regex pattern to match amount followed by letters
  const match = input.match(regex);

  if (!match) {
    // If the input doesn't match the expected pattern, return null
    throw new Error('cannot parse coins');
  }

  const amount = match[1]; // Parse the amount part of the string
  const denom = match[2]; // Get the denom part of the string

  return {amount, denom};
}

class Main {
  async init() {
    console.log('Starting...');
    const cache = new Cache();
    console.log('Cache initialized');
    const chain = new Chain();
    console.log('Chain start');
    if (!process.env.DROP_AMOUNT) {
      throw new Error('DROP_AMOUNT is not set');
    }
    const coins = process.env.DROP_AMOUNT.split(",").map(parseCoin).sort((a, b) => a.denom.localeCompare(b.denom));

    await chain.init();
    console.log('Chain stuff has been initialized');
    const timeout = parseInt(process.env.TX_TIMEOUT || '2s');
    await Promise.all(
      Object.values(transports).map((t) => {
        const x = new t();
        if (!transport.includes(x.name)) return;
        x.init(cache);
        x.onRequest(async (address) => chain.fundAccount(address, coins));
      }),
    );
  }
}

new Main().init();
