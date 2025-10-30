import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

describe("dfba", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.ToyDfba as Program<any>;

    let auctionStatePDA: anchor.web3.PublicKey;
    let bidQueuePDA: anchor.web3.PublicKey;
    let askQueuePDA: anchor.web3.PublicKey;

    before(async () => {
        [auctionStatePDA] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("auction_state")],
            program.programId
        );

        [bidQueuePDA] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("bid_queue")],
            program.programId
        );

        [askQueuePDA] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("ask_queue")],
            program.programId
        );
    });

    it("Initializes auction", async () => {
        const batchInterval = new anchor.BN(1);

        await program.methods
            .initialize(batchInterval)
            .accounts({
                auctionState: auctionStatePDA,
                bidQueue: bidQueuePDA,
                askQueue: askQueuePDA,
                authority: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        const auctionState = await program.account.auctionState.fetch(auctionStatePDA);
        //@ts-ignore
        expect(auctionState.batchInterval.toNumber()).to.equal(1);
        //@ts-ignore
        expect(auctionState.batchCounter.toNumber()).to.equal(0);
        //@ts-ignore
        expect(auctionState.isPaused).to.equal(false);
    });

    it("Places orders", async () => {
        await program.methods
            .placeOrder({
                orderType: { maker: {} },
                side: { buy: {} },
                price: new anchor.BN(99000000),
                quantity: new anchor.BN(100),
            })
            .accounts({
                orderPlacer: provider.wallet.publicKey,
                auctionState: auctionStatePDA,
                bidQueue: bidQueuePDA,
                askQueue: askQueuePDA,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        await program.methods
            .placeOrder({
                orderType: { taker: {} },
                side: { sell: {} },
                price: new anchor.BN(98000000),
                quantity: new anchor.BN(50),
            })
            .accounts({
                orderPlacer: provider.wallet.publicKey,
                auctionState: auctionStatePDA,
                bidQueue: bidQueuePDA,
                askQueue: askQueuePDA,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        const bidQueue = await program.account.orderQueue.fetch(bidQueuePDA);
        //@ts-ignore
        expect(bidQueue.orders.length).to.equal(2);
    });

    it("Executes batch auction", async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const auctionState = await program.account.auctionState.fetch(auctionStatePDA);
        //@ts-ignore
        const batchId = auctionState.batchCounter.toNumber() + 1;

        await program.methods
            .executeBatch(new anchor.BN(batchId))
            .accounts({
                auctionState: auctionStatePDA,
                bidQueue: bidQueuePDA,
                askQueue: askQueuePDA,
                result: anchor.web3.PublicKey.findProgramAddressSync(
                    [Buffer.from("result"), Buffer.from(new anchor.BN(batchId).toArray("le", 8))],
                    program.programId
                )[0],
                authority: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        const updatedState = await program.account.auctionState.fetch(auctionStatePDA);
        //@ts-ignore
        expect(updatedState.batchCounter.toNumber()).to.equal(batchId);
    });
});