import { SolanaService } from "./solana.service";
import { config } from "../config";
import { SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export class CrankService {
    private intervalId: NodeJS.Timeout | null = null;

    constructor(private solanaService: SolanaService) {}

    async start() {
        console.log('Starting crank service...');

        this.intervalId = setInterval(async() => {
            try {
                await this.executeBatch();
            }
            catch(err) {
                console.error('Crank service error: ', err);
            }
        }, config.batchInterval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private async executeBatch() {
        try {
            const auctionState = await this.solanaService.program.account.auctionState.fetch(
                this.solanaService.auctionStatePDA
            );

            const nextBatchId = auctionState.batchCounter.toNumber() + 1;

            try {
                const initAndDelegateTx = await this.solanaService.program.methods
                    .initializeResult(new BN(nextBatchId))
                    .accounts({
                        result: this.solanaService.getResultPDA(nextBatchId),
                        payer: config.crankKeypair.publicKey,
                        systemProgram: SystemProgram.programId
                    })
                    .postInstructions([
                        await this.solanaService.program.methods
                            .delegateResult(new BN(nextBatchId))
                            .accounts({
                                payer: config.crankKeypair.publicKey,
                                pda: this.solanaService.getResultPDA(nextBatchId)
                            })
                            .instruction()
                    ])
                    .signers([config.crankKeypair])
                    .rpc();

                console.log(`Result PDA initialized and delegated for batch ${nextBatchId}: `, initAndDelegateTx);

                const tx = await this.solanaService.program.methods
                    .executeBatch(new BN(nextBatchId))
                    .accounts({
                        auctionState: this.solanaService.auctionStatePDA,
                        bidQueue: this.solanaService.bidQueuePDA,
                        askQueue: this.solanaService.askQueuePDA,
                        result: this.solanaService.getResultPDA(nextBatchId),
                        authority: config.crankKeypair.publicKey
                    })
                    .signers([config.crankKeypair])
                    .rpc();

                console.log(`Batch ${nextBatchId} executed: `, tx);

                const result = await this.solanaService.program.account.auctionResult.fetch(
                    this.solanaService.getResultPDA(nextBatchId)
                );

                console.log('Clearing prices: ', {
                    bid: result.bidClearingPrice.toNumber() / 1e6,
                    ask: result.askClearingPrice.toNumber() / 1e6,
                    bidVolume: result.bidVolume.toNumber(),
                    askVolume: result.askVolume.toNumber()
                });
            } catch (err: any) {
                // TooEarlyToExecute error (6000) is expected when batch interval hasn't elapsed
                if (err?.error?.errorCode?.code === 'TooEarlyToExecute') {
                    // Silently ignore - this is normal when checking too frequently
                    console.log('Got TooEarlyToExecute');
                    return;
                }
                throw err;
            }
        }
        catch(err) {
            console.error('Failed to execute batch: ', err);
        }
    }
}