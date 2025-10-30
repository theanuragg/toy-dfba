use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Too early to execute batch")]
    TooEarlyToExecute,
    #[msg("Order queue is full")]
    OrderQueueFull,
    #[msg("Invalid order parameters")]
    InvalidOrderParameters,
    #[msg("Auction is paused")]
    AuctionPaused,
}
