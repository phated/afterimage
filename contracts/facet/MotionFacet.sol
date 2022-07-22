// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {WithStorage} from "../library/LibStorage.sol";
import {LibMIMC} from "../library/LibMIMC.sol";
import {LibTrig} from "../library/LibTrig.sol";
import {Verifier as InitVerifier} from "../library/InitVerifier.sol";
import {Verifier as MoveVerifier} from "../library/MoveVerifier.sol";
import "hardhat/console.sol";

contract MotionFacet is WithStorage {
    event PlayerUpdated(address, uint256, uint256);

    constructor() {}

    modifier notPaused() {
        require(!gs().paused, "Game is paused");
        _;
    }

    function GRID_UPPER_BOUND() public view returns (uint256) {
        return gameConstants().GRID_UPPER_BOUND;
    }

    function SALT_UPPER_BOUND() public view returns (uint256) {
        return gs().saltUpperBound;
    }

    function assembleHash(uint256 blockNumLower, uint256 blockNumUpper)
        public
        view
        returns (uint256)
    {
        uint256[] memory possibleBlockHashes = new uint256[](blockNumUpper - blockNumLower + 1);
        for (uint256 blockNum = blockNumLower; blockNum <= blockNumUpper; blockNum++) {
            possibleBlockHashes[blockNum - blockNumLower] = uint256(blockhash(blockNum));
        }
        return LibMIMC.getCommitment(possibleBlockHashes);
    }

    function initPlayer(
        uint256 blockNumLower,
        uint256 blockNumUpper,
        uint256[2] memory _a,
        uint256[2][2] memory _b,
        uint256[2] memory _c,
        uint256[4] memory _input
    ) public notPaused {
        uint256[] memory addr = new uint256[](1);
        addr[0] = uint256(uint160(msg.sender));
        uint256 addressPhase = LibMIMC.mimcSponge(addr, 1, 22, 123)[0] % LibTrig.TWO_PI;
        uint256 possibleHashesHash = assembleHash(blockNumLower, blockNumUpper);
        require(_input[0] == possibleHashesHash, "Block number commitment hash mismatch");
        require(_input[1] == gs().saltUpperBound, "Salt upper bound mismatch");
        require(_input[2] == gameConstants().GRID_UPPER_BOUND, "Grid upper bound mismatch");
        require(InitVerifier.verifyProof(_a, _b, _c, _input), "Bad proof");
        require(gs().playerStates[msg.sender].commitment == 0, "Player already initialized");
        gs().playerStates[msg.sender].commitment = _input[3];
        gs().playerStates[msg.sender].phase = addressPhase;
        emit PlayerUpdated(msg.sender, gs().playerStates[msg.sender].commitment, block.number);
    }

    function movePlayer(
        uint256 blockNumLower,
        uint256 blockNumUpper,
        uint256[2] memory _a,
        uint256[2][2] memory _b,
        uint256[2] memory _c,
        uint256[5] memory _input
    ) public notPaused {
        uint256 possibleHashesHash = assembleHash(blockNumLower, blockNumUpper);
        uint256 currentLoc = gs().playerStates[msg.sender].commitment;
        console.log("possibleHashesHash: ", possibleHashesHash);
        require(_input[0] == possibleHashesHash, "Block number commitment hash mismatch");
        require(_input[1] == gs().saltUpperBound, "Salt upper bound mismatch");
        require(_input[2] == gameConstants().GRID_UPPER_BOUND, "Grid upper bound mismatch");
        require(_input[3] == currentLoc, "Old commitment mismatch");
        require(MoveVerifier.verifyProof(_a, _b, _c, _input), "Bad proof");
        gs().playerStates[msg.sender].commitment = _input[4];
        emit PlayerUpdated(msg.sender, gs().playerStates[msg.sender].commitment, block.number);
    }
}
