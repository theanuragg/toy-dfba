use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CancelAllOrders<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"bid_queue"],
        bump
    )]
    pub bid_queue: Account<'info, OrderQueue>,

    #[account(
        mut,
        seeds = [b"ask_queue"],
        bump
    )]
    pub ask_queue: Account<'info, OrderQueue>,
}

pub fn cancel_orders_handler(ctx: Context<CancelAllOrders>) -> Result<()> {
    let owner = *ctx.accounts.owner.key;

    for order in ctx.accounts.bid_queue.orders.iter_mut() {
        if order.owner == owner {
            order.is_active = false;
        }
    }

    for order in ctx.accounts.ask_queue.orders.iter_mut() {
        if order.owner == owner {
            order.is_active = false;
        }
    }

    Ok(())
}
