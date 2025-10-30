use anchor_lang::prelude::*;

#[account]
pub struct AuctionState {
    pub authority: Pubkey,
    pub batch_interval: u64,
    pub last_batch_slot: u64,
    pub batch_counter: u64,
    pub is_paused: bool,
}

#[account]
pub struct OrderQueue {
    pub auction_type: AuctionType,
    pub orders: Vec<Order>,
    pub max_orders: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Order {
    pub id: u64,
    pub owner: Pubkey,
    pub order_type: OrderType,
    pub side: Side,
    pub price: u64,
    pub quantity: u64,
    pub timestamp: i64,
    pub is_active: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum AuctionType {
    Bid, // Maker buys + Taker sells
    Ask, // Maker sells + Taker buys
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum OrderType {
    Maker,
    Taker,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Side {
    Buy,
    Sell,
}

#[account]
pub struct AuctionResult {
    pub batch_id: u64,
    pub bid_clearing_price: u64,
    pub bid_volume: u64,
    pub ask_clearing_price: u64,
    pub ask_volume: u64,
    pub timestamp: i64,
}

#[event]
pub struct OrderPlacedEvent {
    pub order_id: u64,
    pub owner: Pubkey,
    pub order_type: OrderType,
    pub side: Side,
    pub price: u64,
    pub quantity: u64,
}

#[event]
pub struct BatchExecutedEvent {
    pub batch_id: u64,
    pub bid_clearing_price: u64,
    pub bid_volume: u64,
    pub ask_clearing_price: u64,
    pub ask_volume: u64,
}
