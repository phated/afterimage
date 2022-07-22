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

    function computeBattlePower(address player, uint256 blockNum)
        internal
        view
        notPaused
        returns (int256)
    {
        uint256 hm = (blockNum * multiplier + gs().playerStates[player].phase) % LibTrig.TWO_PI;
        return LibTrig.sin(hm) + gs().playerStates[player].shift * 3 * 10**17;
    }

    function battlePlayer(
        address player,
        uint256[2] memory _a,
        uint256[2][2] memory _b,
        uint256[2] memory _c,
        uint256[2] memory _input
    ) public notPaused {
        uint256 myCommitment = gs().playerStates[msg.sender].commitment;
        uint256 yourCommitment = gs().playerStates[player].commitment;
        int256 myPower = computeBattlePower(msg.sender, block.number);
        int256 yourPower = computeBattlePower(player, block.number);
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
            result[(blockNum - block.number) / 60] = computeBattlePower(player, blockNum);
        }
        return result;
    }

    function getWins(address) public view notPaused returns (uint256) {
        return gs().playerStates[msg.sender].wins;
    }

    function claimTreasure(
        uint256 trX,
        uint256 trY,
        uint256 bHash,
        uint256 salt
    ) public notPaused {
        require(!gs().claimedTreasure[trX][trY], "Treasure already claimed");
        uint256[] memory sponge = new uint256[](2);
        sponge[0] = trX;
        sponge[1] = trY;
        require(LibMIMC.mimcSponge(sponge, 1, 220, 123)[0] % 13 == 0, "Bad hash");

        uint256[] memory commitSponge = new uint256[](4);
        commitSponge[0] = trX;
        commitSponge[1] = trY;
        commitSponge[2] = bHash;
        commitSponge[3] = salt;
        require(
            LibMIMC.mimcSponge(commitSponge, 1, 220, 123)[0] ==
                gs().playerStates[msg.sender].commitment,
            "Commitment mismatch"
        );
        gs().claimedTreasure[trX][trY] = true;
        gs().playerStates[msg.sender].shift++;
    }
}
