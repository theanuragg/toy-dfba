import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { config } from '../config';
import idl from '../../../target/idl/toy_dfba.json';

export class SolanaService {
    connection: Connection;
    provider: AnchorProvider;
    program: any;
    auctionStatePDA: PublicKey;
    bidQueuePDA: PublicKey;
    askQueuePDA: PublicKey;

    constructor() {
        this.connection = new Connection(config.rpcUrl, 'confirmed');
    }

    async initialize() {
        const wallet = new Wallet(config.makerKeypair);
        this.provider = new AnchorProvider(this.connection, wallet, {
            commitment: 'confirmed',
        });
        
        this.program = new Program(
            idl as any,
            new PublicKey(config.programId),
            this.provider
        ) as any;

        [this.auctionStatePDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('auction_state')],
            this.program.programId
        );
        
        [this.bidQueuePDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('bid_queue')],
            this.program.programId
        );
        
        [this.askQueuePDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('ask_queue')],
            this.program.programId
        );
    }

    getResultPDA(batchId: number): PublicKey {
        const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from('result'), Buffer.from(new BN(batchId).toArray('le', 8))],
            this.program.programId
        );
        return pda;
    }
}