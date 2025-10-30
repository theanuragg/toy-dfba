import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Dfba as Program<any>;

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

    console.log("Initializing auction...");

    try {
        const auctionState = await program.account.auctionState.fetchNullable(auctionStatePDA);
        if (auctionState) {
            console.log("Auction already initialized");
            return;
        }

        const tx = await program.methods
            .initialize(new anchor.BN(1))
            .accounts({
                auctionState: auctionStatePDA,
                bidQueue: bidQueuePDA,
                askQueue: askQueuePDA,
                authority: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log("Auction initialized successfully!");
        console.log("Transaction signature:", tx);
        console.log("Auction State PDA:", auctionStatePDA.toString());
        console.log("Bid Queue PDA:", bidQueuePDA.toString());
        console.log("Ask Queue PDA:", askQueuePDA.toString());
    } catch (error) {
        console.error("Error initializing auction:", error);
    }
}

main().then(
    () => process.exit(0),
    (err) => {
        console.error(err);
        process.exit(1);
    }
);