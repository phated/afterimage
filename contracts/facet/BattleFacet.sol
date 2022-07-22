// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {WithStorage} from "../library/LibStorage.sol";
import {LibMIMC} from "../library/LibMIMC.sol";
import {LibTrig} from "../library/LibTrig.sol";
import {Verifier as BattleVerifier} from "../library/BattleVerifier.sol";
import "hardhat/console.sol";

contract BattleFacet is WithStorage {
    event BattleUpdated(address, address);

    constructor() {}

    modifier notPaused() {
        require(!gs().paused, "Game is paused");
        _;
    }

    uint256 constant multiplier = 107374182410735500;

    function battlePlayer(
        address player,
        uint256[2] memory _a,
        uint256[2][2] memory _b,
        uint256[2] memory _c,
        uint256[2] memory _input
    ) public notPaused {
        uint256 myCommitment = gs().playerStates[msg.sender].commitment;
        uint256 yourCommitment = gs().playerStates[player].commitment;
        int256 myPower = LibTrig.sin(
            (block.number * multiplier + gs().playerStates[msg.sender].phase) % LibTrig.TWO_PI
        );
        int256 yourPower = LibTrig.sin(
            (block.number * multiplier + gs().playerStates[player].phase) % LibTrig.TWO_PI
        );
        require(_input[0] == myCommitment, "My commitment hash mismatch");
        require(_input[1] == yourCommitment, "Your commitment hash mismatch");
        require(BattleVerifier.verifyProof(_a, _b, _c, _input), "Bad proof");
        require(myPower > yourPower, "My power is not greater than your power");

        gs().playerStates[msg.sender].wins++;
        emit BattleUpdated(msg.sender, player);
    }

    function getBattlePower(address player) public view notPaused returns (int256[] memory) {
        int256[] memory result = new int256[](64);
        for (uint256 blockNum = block.number; blockNum < block.number + 60 * 64; blockNum += 60) {
            uint256 hm = (blockNum * multiplier + gs().playerStates[player].phase) % LibTrig.TWO_PI;
            result[(blockNum - block.number) / 60] = LibTrig.sin(hm);
        }
        return result;
    }

    function getWins(address) public view notPaused returns (uint256) {
        return gs().playerStates[msg.sender].wins;
    }
}
