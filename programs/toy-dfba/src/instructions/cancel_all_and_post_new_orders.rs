use crate::errors::ErrorCode;
use crate::instructions::place_order::PlaceOrderParams;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CancelAllAndPostNewOrders<'info> {
    #[account(mut)]
    pub order_placer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction_state"],
        bump
    )]
    pub auction_state: Account<'info, AuctionState>,

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

    pub system_program: Program<'info, System>,
}

pub fn cancel_all_and_post_new_orders_handler(
    ctx: Context<CancelAllAndPostNewOrders>,
    orders: Vec<PlaceOrderParams>,
) -> Result<()> {
    let owner = *ctx.accounts.order_placer.key;
    let auction_state = &ctx.accounts.auction_state;

    require!(!auction_state.is_paused, ErrorCode::AuctionPaused);

    // First, remove all existing orders for this owner from both queues
    ctx.accounts.bid_queue.orders.retain(|order| order.owner != owner);
    ctx.accounts.ask_queue.orders.retain(|order| order.owner != owner);

    // Then, place new orders
    for params in orders {
        require!(
            params.price > 0 && params.quantity > 0,
            ErrorCode::InvalidOrderParameters
        );

        let order_queue = match (&params.order_type, &params.side) {
            (OrderType::Maker, Side::Buy) | (OrderType::Taker, Side::Sell) => {
                &mut ctx.accounts.bid_queue
            }
            (OrderType::Maker, Side::Sell) | (OrderType::Taker, Side::Buy) => {
                &mut ctx.accounts.ask_queue
            }
        };

        require!(
            order_queue.orders.len() < order_queue.max_orders as usize,
            ErrorCode::OrderQueueFull
        );

        let order_id = Clock::get()?.unix_timestamp as u64 + order_queue.orders.len() as u64;

        let order = Order {
            id: order_id,
            owner: *ctx.accounts.order_placer.key,
            order_type: params.order_type.clone(),
            side: params.side.clone(),
            price: params.price,
            quantity: params.quantity,
            timestamp: Clock::get()?.unix_timestamp,
            is_active: true,
            filled_quantity: 0,
        };

        order_queue.orders.push(order.clone());

        emit!(OrderPlacedEvent {
            order_id,
            owner: order.owner,
            order_type: order.order_type,
            side: order.side,
            price: order.price,
            quantity: order.quantity
        });
    }

    Ok(())
}
