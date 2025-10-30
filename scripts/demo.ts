import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.ToyDfba as Program<any>;

    const [auctionStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("auction_state")],
        program.programId
    );

    const [bidQueuePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bid_queue")],
        program.programId
    );

    const [askQueuePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("ask_queue")],
        program.programId
    );

    console.log("Running demo...");

    const orders = [
        { orderType: { maker: {} }, side: { buy: {} }, price: 99000000, quantity: 200 },
        { orderType: { maker: {} }, side: { sell: {} }, price: 101000000, quantity: 200 },
        { orderType: { taker: {} }, side: { buy: {} }, price: 102000000, quantity: 150 },
        { orderType: { taker: {} }, side: { sell: {} }, price: 98000000, quantity: 150 },
    ];

    for (const order of orders) {
        try {
            const tx = await program.methods
                .placeOrder({
                    orderType: order.orderType,
                    side: order.side,
                    price: new anchor.BN(order.price),
                    quantity: new anchor.BN(order.quantity),
                })
                .accounts({
                    orderPlacer: provider.wallet.publicKey,
                    auctionState: auctionStatePDA,
                    bidQueue: bidQueuePDA,
                    askQueue: askQueuePDA,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log(`Placed ${JSON.stringify(order.orderType)} ${JSON.stringify(order.side)} order @ ${order.price / 1e6}`);
        } catch (error) {
            console.error("Error placing order:", error);
        }
    }

    console.log("\nExecuting batch auction...");
    
    const auctionState = await program.account.auctionState.fetch(auctionStatePDA);
    //@ts-ignore
    const batchId = auctionState.batchCounter.toNumber() + 1;

    try {
        const tx = await program.methods
            .executeBatch(new anchor.BN(batchId))
            .accounts({
                auctionState: auctionStatePDA,
                bidQueue: bidQueuePDA,
                askQueue: askQueuePDA,
                result: PublicKey.findProgramAddressSync(
                    [Buffer.from("result"), Buffer.from(new anchor.BN(batchId).toArray("le", 8))],
                    program.programId
                )[0],
                authority: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log("Batch executed:", tx);

        const result = await program.account.auctionResult.fetch(
            PublicKey.findProgramAddressSync(
                [Buffer.from("result"), Buffer.from(new anchor.BN(batchId).toArray("le", 8))],
                program.programId
            )[0]
        );

        console.log("\nAuction Results:");
        //@ts-ignore
        console.log(`Bid Clearing Price: ${result.bidClearingPrice.toNumber() / 1e6}`);
        //@ts-ignore
        console.log(`Bid Volume: ${result.bidVolume.toNumber()}`);
        //@ts-ignore
        console.log(`Ask Clearing Price: ${result.askClearingPrice.toNumber() / 1e6}`);
        //@ts-ignore
        console.log(`Ask Volume: ${result.askVolume.toNumber()}`);
    } catch (error) {
        console.error("Error executing batch:", error);
    }
}

main().then(
    () => process.exit(0),
    (err) => {
        console.error(err);
        process.exit(1);
    }
);