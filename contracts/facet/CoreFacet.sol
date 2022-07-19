// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {WithStorage} from "../library/LibStorage.sol";
import {LibMIMC} from "../library/LibMIMC.sol";
import {Verifier as CommiterVerifier} from "../library/CommiterVerifier.sol";
import "hardhat/console.sol";

contract CoreFacet is WithStorage {
    constructor() {}

    function action() public {}

    modifier notPaused() {
        require(!gs().paused, "Game is paused");
        _;
    }

    function commitLocation(
        uint256 blockNumLower,
        uint256 blockNumUpper,
        uint256[2] memory _a,
        uint256[2][2] memory _b,
        uint256[2] memory _c,
        uint256[4] memory _input
        ) public notPaused {
        uint256[] memory possibleBlockHashes = new uint256[](blockNumUpper - blockNumLower + 1);
        for (uint256 blockNum = blockNumLower; blockNum <= blockNumUpper; blockNum++) {
            possibleBlockHashes[blockNum - blockNumLower] = uint256(blockhash(blockNum));
        }

        uint256 possibleHashesHash = LibMIMC.getCommitment(possibleBlockHashes);

        require(_input[0] == possibleHashesHash, "Block number commitment hash mismatch");
        require(_input[1] == gs().saltUpperBound, "Salt upper bound mismatch");
        require(_input[2] == gs().gridUpperBound, "Grid upper bound mismatch");
        require(CommiterVerifier.verifyProof(_a, _b, _c, _input), "Bad proof");

        gs().playerStates[msg.sender].commitment = _input[3];
    }
}
