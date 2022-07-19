// SPDX-License-Identifier: GPL-3.0 AND MIT
/**
 * Customized version of DiamondInit.sol
 *
 * Vendored on July 18, 2022 from:
 * https://github.com/mudgen/diamond-3-hardhat/blob/7feb995/contracts/upgradeInitializers/DiamondInit.sol
 */
pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import {WithStorage} from "./library/LibStorage.sol";

struct InitArgs {
    bool START_PAUSED;
    uint256 GRID_UPPER_BOUND;
    uint256 SALT_UPPER_BOUND;
}

// It is expected that this contract is customized in order to deploy a diamond with data
// from a deployment script. The init function is used to initialize state variables
// of the diamond. Add parameters to the init function if you need to.
contract Initializer is WithStorage {
    // You can add parameters to this function in order to pass in
    // data to set initialize state variables
    function init(InitArgs memory initArgs) external {
        gs().diamondAddress = address(this);
        gs().paused = initArgs.START_PAUSED;
        gs().saltUpperBound = initArgs.SALT_UPPER_BOUND;

        gameConstants().START_PAUSED = initArgs.START_PAUSED;
        gameConstants().GRID_UPPER_BOUND = initArgs.GRID_UPPER_BOUND;
    }
}
