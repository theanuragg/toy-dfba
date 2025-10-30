use crate::state::*;
use anchor_lang::prelude::*;

pub fn initialize_handler(ctx: Context<Initialize>, batch_interval: u64) -> Result<()> {
    let auction_state = &mut ctx.accounts.auction_state;
    auction_state.authority = *ctx.accounts.authority.key;
    auction_state.batch_interval = batch_interval;
    auction_state.last_batch_slot = 0;
    auction_state.batch_counter = 0;
    auction_state.is_paused = false;

    let bid_queue = &mut ctx.accounts.bid_queue;
    bid_queue.auction_type = AuctionType::Bid;
    bid_queue.orders = Vec::new();
    bid_queue.max_orders = 85;

    let ask_queue = &mut ctx.accounts.ask_queue;
    ask_queue.auction_type = AuctionType::Ask;
    ask_queue.orders = Vec::new();
    ask_queue.max_orders = 85;

    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 8 + 1,
        seeds = [b"auction_state"],
        bump
    )]
    pub auction_state: Account<'info, AuctionState>,

    #[account(
        init,
        payer = authority,
        space = 8 + 1 + 4 + 4 + (85 * 120),
        seeds = [b"bid_queue"],
        bump
    )]
    pub bid_queue: Account<'info, OrderQueue>,

    #[account(
        init,
        payer = authority,
        space = 8 + 1 + 4 + 4 + (85 * 120),
        seeds = [b"ask_queue"],
        bump
    )]
    pub ask_queue: Account<'info, OrderQueue>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
