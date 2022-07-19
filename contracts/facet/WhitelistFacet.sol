// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// Library imports
import {OwnableInternal} from "@solidstate/contracts/access/ownable/OwnableInternal.sol";
import {Verifier as WhitelistVerifier} from "../library/WhitelistVerifier.sol";

// Storage imports
import {WithStorage} from "../library/LibStorage.sol";

contract WhitelistFacet is WithStorage, OwnableInternal {
    function totalAllowed() public view returns (uint256) {
        return ws().allowedAccountsArray.length;
    }

    function isWhitelisted(address _addr) public view returns (bool) {
        if (!ws().enabled) {
            return true;
        }
        return ws().allowedAccounts[_addr];
    }

    function isKeyHashValid(uint256 hashed) public view returns (bool) {
        return ws().allowedKeyHashes[hashed];
    }

    // modify whitelist
    function addKeys(uint256[] memory hashes) public onlyOwner {
        for (uint16 i = 0; i < hashes.length; i++) {
            ws().allowedKeyHashes[hashes[i]] = true;
        }
    }

    function disableKeys(uint256[] memory keys) public onlyOwner {
        for (uint256 i = 0; i < keys.length; i++) {
            ws().allowedKeyHashes[keys[i]] = false;
        }
    }

    function useKey(
        uint256[2] memory _a,
        uint256[2][2] memory _b,
        uint256[2] memory _c,
        uint256[2] memory _input
    ) public {
        require(
            WhitelistVerifier.verifyProof(_a, _b, _c, _input),
            "Failed whitelist proof check"
        );

        uint256 hashedKey = _input[0];
        address payable recipient = payable(address(uint160(_input[1])));

        if (ws().allowedAccounts[recipient]) return;

        _useKey(hashedKey, recipient);

        if (ws().relayerRewardsEnabled && recipient != msg.sender) {
            // Payment to encourage relaying whitelist
            // transactions for new users with no funds
            payable(msg.sender).transfer(ws().relayerReward);
        }
    }

    function adminUseKey(uint256 keyHash, address payable recipient)
        public
        onlyOwner
    {
        _useKey(keyHash, recipient);
    }

    function _useKey(uint256 keyHash, address payable recipient) private {
        require(ws().allowedKeyHashes[keyHash], "invalid key");
        ws().allowedAccounts[recipient] = true;
        ws().allowedAccountsArray.push(recipient);
        ws().allowedKeyHashes[keyHash] = false;
        // xDAI ONLY
        payable(recipient).transfer(ws().drip);
    }

    function addToWhitelist(address toAdd) public onlyOwner {
        require(!ws().allowedAccounts[toAdd], "player is already allowed");

        ws().allowedAccounts[toAdd] = true;
        ws().allowedAccountsArray.push(toAdd);
    }

    function removeFromWhitelist(address toRemove) public onlyOwner {
        require(
            ws().allowedAccounts[toRemove],
            "player was not whitelisted to begin with"
        );
        ws().allowedAccounts[toRemove] = false;
        for (uint256 i = 0; i < ws().allowedAccountsArray.length; i++) {
            if (ws().allowedAccountsArray[i] == toRemove) {
                ws().allowedAccountsArray[i] = ws().allowedAccountsArray[
                    ws().allowedAccountsArray.length - 1
                ];
                ws().allowedAccountsArray.pop();
            }
        }
    }

    function changeDrip(uint256 newDrip) public onlyOwner {
        ws().drip = newDrip;
    }

    function drip() public view returns (uint256) {
        return ws().drip;
    }

    function setRelayerRewardsEnabled(bool newRewardsEnabled) public onlyOwner {
        ws().relayerRewardsEnabled = newRewardsEnabled;
    }

    function changeRelayerReward(uint256 newReward) public onlyOwner {
        ws().relayerReward = newReward;
    }

    function relayerReward() public view returns (uint256) {
        return ws().relayerReward;
    }
}
