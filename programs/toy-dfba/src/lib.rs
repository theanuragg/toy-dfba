use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("HjNP38ofCxokbhd1bEJcXtB2Z7397B5JDLNWB9UESRvz");

#[program]
pub mod toy_dfba {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, batch_interval: u64) -> Result<()> {
        instructions::initialize::initialize_handler(ctx, batch_interval)
    }

    pub fn place_order(ctx: Context<PlaceOrder>, params: PlaceOrderParams) -> Result<()> {
        instructions::place_order::place_order_handler(ctx, params)
    }
}
